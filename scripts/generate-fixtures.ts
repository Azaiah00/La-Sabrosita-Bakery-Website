/* =====================================================================
   generate-fixtures.ts — PROMPT-00 Part B
   ---------------------------------------------------------------------
   supabase/seed.sql  ->  src/lib/data/demo/fixtures.ts

   The seed is verified. Every product name, Spanish spelling, price,
   recipe quantity and vendor in it is correct, and retyping any of it by
   hand is how errors get introduced. So we parse it instead.

   Two kinds of statement live in the seed:

   1. `insert into T (cols) values (...), (...);`
      Parsed generically. Row types are inferred from the parsed values,
      so a column added to the seed shows up in the emitted types.

   2. `insert into T (cols) select ...` and `do $$ ... $$;`
      These GENERATE rows (14 days of stock, 90 days of sales, a week of
      orders through place_order). A SQL parser cannot evaluate them, so
      their derivation is ported below — explicitly, in one place, marked
      as a port. The literal data they consume still comes from (1).

   Relative dates (`current_date + 1`, `now() - interval '2 years'`) are
   NOT frozen into the output. The emitted module exports
   `buildFixtures(today)`, so "today" and "tomorrow" are correct whenever
   the demo runs — a laptop opened three weeks from now still shows a
   full order queue.

   Run: npm run fixtures
   ===================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SEED = join(ROOT, 'supabase', 'seed.sql')
const OUT = join(ROOT, 'src', 'lib', 'data', 'demo', 'fixtures.ts')

/* ------------------------------------------------------------------ */
/* 1. SQL value parsing                                                */
/* ------------------------------------------------------------------ */

type Rel = { rel: 'date' | 'ts'; days: number; time?: string }
type Val = string | number | boolean | null | Rel

const isRel = (v: Val): v is Rel => typeof v === 'object' && v !== null && 'rel' in v

/**
 * Strip `-- line comments` that are not inside a string literal.
 *
 * The seed annotates rows inline (`'La Sabrosita Bakery',  -- CONFIRM: ...`)
 * and those annotations contain quotes and commas of their own. Removing
 * them first is what lets the value parser stay simple. Newlines are kept
 * so error messages still point at the right line.
 */
function stripComments(sql: string): string {
  let out = ''
  let inStr = false
  let inDollar = false

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]

    if (inStr) {
      out += c
      if (c === "'") {
        if (sql[i + 1] === "'") { out += "'"; i++ }
        else inStr = false
      }
      continue
    }
    if (inDollar) {
      out += c
      if (c === '$' && sql[i + 1] === '$') { out += '$'; i++; inDollar = false }
      continue
    }
    if (c === '$' && sql[i + 1] === '$') { out += '$$'; i++; inDollar = true; continue }
    if (c === "'") { inStr = true; out += c; continue }
    if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      out += '\n'
      continue
    }
    out += c
  }

  return out
}

/**
 * Blank out `$$ ... $$` bodies.
 *
 * The seed's `do $$` blocks place orders through the real `place_order()`
 * RPC and insert cake details with plpgsql variables (`v_order`). Those
 * are generators, not data — their derivation is ported by hand further
 * down. Blanking them keeps the generic scanner from trying to read a
 * variable name as a literal.
 */
function stripDollarBlocks(sql: string): string {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, (block) => block.replace(/[^\n]/g, ' '))
}

/** Split a `values` blob into its top-level `( ... )` tuples. */
function splitTuples(blob: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = -1
  let inStr = false

  for (let i = 0; i < blob.length; i++) {
    const c = blob[i]
    if (inStr) {
      if (c === "'") {
        if (blob[i + 1] === "'") i++
        else inStr = false
      }
      continue
    }
    if (c === "'") { inStr = true; continue }
    if (c === '(') { if (depth === 0) start = i + 1; depth++; continue }
    if (c === ')') {
      depth--
      if (depth === 0 && start >= 0) { out.push(blob.slice(start, i)); start = -1 }
      continue
    }
  }
  return out
}

/** Split one tuple into its comma-separated fields, respecting quotes. */
function splitFields(tuple: string): string[] {
  const out: string[] = []
  let depth = 0
  let inStr = false
  let cur = ''

  for (let i = 0; i < tuple.length; i++) {
    const c = tuple[i]
    if (inStr) {
      cur += c
      if (c === "'") {
        if (tuple[i + 1] === "'") { cur += "'"; i++ }
        else inStr = false
      }
      continue
    }
    if (c === "'") { inStr = true; cur += c; continue }
    if (c === '(' || c === '[') { depth++; cur += c; continue }
    if (c === ')' || c === ']') { depth--; cur += c; continue }
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const INTERVAL_DAYS: Record<string, number> = {
  day: 1, days: 1,
  week: 7, weeks: 7,
  month: 30, months: 30,
  year: 365, years: 365,
  hour: 1 / 24, hours: 1 / 24,
}

function parseValue(raw: string): Val {
  let s = raw.trim()

  // Strip a trailing ::cast (but not one inside a string literal).
  if (!s.startsWith("'")) {
    s = s.replace(/::[a-z_ ]+(\[\])?$/i, '').trim()
  }

  if (/^null$/i.test(s)) return null
  if (/^true$/i.test(s)) return true
  if (/^false$/i.test(s)) return false

  // 'text'  or  'text'::cast
  if (s.startsWith("'")) {
    let out = ''
    let i = 1
    for (; i < s.length; i++) {
      if (s[i] === "'") {
        if (s[i + 1] === "'") { out += "'"; i++; continue }
        break
      }
      out += s[i]
    }
    return out
  }

  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)

  // current_date - 62 / current_date + 9 / current_date
  let m = s.match(/^current_date\s*([+-])\s*(\d+)$/i)
  if (m) return { rel: 'date', days: (m[1] === '-' ? -1 : 1) * Number(m[2]) }
  if (/^current_date$/i.test(s)) return { rel: 'date', days: 0 }

  // now() - interval '400 days'   |   current_date + interval '13 days'
  m = s.match(/^(now\(\)|current_date)\s*([+-])\s*interval\s*'(\d+)\s*(\w+)'$/i)
  if (m) {
    const sign = m[2] === '-' ? -1 : 1
    const unit = INTERVAL_DAYS[m[4].toLowerCase()]
    if (unit === undefined) throw new Error(`Unknown interval unit in: ${raw}`)
    return { rel: m[1].toLowerCase() === 'now()' ? 'ts' : 'date', days: sign * Number(m[3]) * unit }
  }
  if (/^now\(\)$/i.test(s)) return { rel: 'ts', days: 0 }

  throw new Error(`generate-fixtures: cannot parse SQL value \`${raw}\``)
}

/* ------------------------------------------------------------------ */
/* 2. Statement scanning                                               */
/* ------------------------------------------------------------------ */

interface ParsedTable {
  columns: string[]
  rows: Val[][]
}

function parseInserts(sql: string): Map<string, ParsedTable> {
  const tables = new Map<string, ParsedTable>()
  const re = /insert\s+into\s+(\w+)\s*\(/gi
  let m: RegExpExecArray | null

  while ((m = re.exec(sql))) {
    const table = m[1]
    const openParen = re.lastIndex - 1

    const closeParen = sql.indexOf(')', openParen)
    const columns = sql
      .slice(openParen + 1, closeParen)
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    // What follows the column list: `values` (literal) or `select` (generated).
    const after = sql.slice(closeParen + 1)
    const kw = after.match(/^\s*(values|select)/i)
    if (!kw || kw[1].toLowerCase() !== 'values') continue

    // Scan to the terminating semicolon, respecting string literals.
    const from = closeParen + 1 + kw[0].length
    let end = from
    let inStr = false
    for (; end < sql.length; end++) {
      const c = sql[end]
      if (inStr) {
        if (c === "'") { if (sql[end + 1] === "'") end++; else inStr = false }
        continue
      }
      if (c === "'") { inStr = true; continue }
      if (c === ';') break
    }

    const rows = splitTuples(sql.slice(from, end)).map((t) =>
      splitFields(t).map(parseValue),
    )

    const existing = tables.get(table)
    if (existing) {
      if (existing.columns.join() !== columns.join()) {
        throw new Error(`generate-fixtures: two different column lists for ${table}`)
      }
      existing.rows.push(...rows)
    } else {
      tables.set(table, { columns, rows })
    }
    re.lastIndex = end
  }

  return tables
}

/* ------------------------------------------------------------------ */
/* 3. Emitting                                                         */
/* ------------------------------------------------------------------ */

const pascal = (s: string) =>
  s.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')

function tsTypeOf(values: Val[]): string {
  const kinds = new Set<string>()
  let nullable = false
  for (const v of values) {
    if (v === null) { nullable = true; continue }
    if (isRel(v)) { kinds.add('string'); continue }
    kinds.add(typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string')
  }
  if (kinds.size === 0) return 'null'
  if (kinds.size > 1) kinds.delete('number')  // a mixed column is text in practice
  const base = [...kinds].join(' | ')
  return nullable ? `${base} | null` : base
}

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** A parsed value as an expression inside the generated `buildFixtures`. */
function emitValue(v: Val): string {
  if (v === null) return 'null'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return String(v)
  if (isRel(v)) {
    const date = v.days === 0 ? 'today' : `addDays(today, ${Math.round(v.days)})`
    return v.rel === 'date' ? date : `atLocal(${date}, '12:00')`
  }
  return q(v)
}

function emitRowType(name: string, t: ParsedTable): string {
  const lines = t.columns.map((col, i) => {
    const type = tsTypeOf(t.rows.map((r) => r[i]))
    return `  ${col}: ${type}`
  })
  return `export interface ${name} {\n${lines.join('\n')}\n}`
}

function emitRows(t: ParsedTable): string {
  return t.rows
    .map((row) => {
      const fields = t.columns.map((col, i) => `${col}: ${emitValue(row[i])}`)
      return `  { ${fields.join(', ')} },`
    })
    .join('\n')
}

/* ------------------------------------------------------------------ */
/* 4. Go                                                               */
/* ------------------------------------------------------------------ */

const sql = stripDollarBlocks(stripComments(readFileSync(SEED, 'utf8')))
const tables = parseInserts(sql)

// Tables whose rows are literal in the seed and can be emitted as-is.
const LITERAL_TABLES = [
  'businesses',
  'locations',
  'opening_hours',
  'units',
  'unit_conversions',
  'menu_categories',
  'products',
  'product_variants',
  'ingredients',
  'recipes',
  'recipe_items',
  'vendors',
  'vendor_ingredients',
  'cake_sizes',
  'cake_options',
  'lead_time_rules',
  'expense_categories',
  'price_lists',
  'price_list_items',
  'wholesale_accounts',
  'standing_orders',
  'standing_order_items',
  'customers',
  'invoices',
  'invoice_items',
  'invoice_payments',
  'announcements',
  'settings',
] as const

for (const t of LITERAL_TABLES) {
  if (!tables.has(t)) throw new Error(`generate-fixtures: no literal rows found for ${t}`)
}

// `inventory_transactions` has both forms in the seed. Only the three
// literal production draws are parsed here; the opening receipts are
// generated from `ingredients.par_level` in the port below.
const drawRows = tables.get('inventory_transactions')
if (!drawRows) throw new Error('generate-fixtures: no literal inventory_transactions rows')

const typeBlocks: string[] = []
const constBlocks: string[] = []
const fixtureFields: string[] = []
/** table -> the expression that yields its rows inside `buildFixtures`. */
const fixtureExpr = new Map<string, string>()

for (const table of LITERAL_TABLES) {
  const t = tables.get(table)!
  const typeName = `Raw${pascal(table)}Row`
  const CONST = table.toUpperCase()
  typeBlocks.push(emitRowType(typeName, t))

  // A table holding a relative date (`current_date - 62`, `now() - interval`)
  // cannot be a module const — its rows depend on the demo date. Those are
  // emitted as builders instead, so the same fixture set is correct whether
  // the laptop is opened today or in three weeks.
  const isDated = t.rows.some((r) => r.some(isRel))
  if (isDated) {
    constBlocks.push(
      `function build${pascal(table)}(today: string): ${typeName}[] {\n  return [\n${emitRows(t)
        .split('\n')
        .map((l) => '  ' + l)
        .join('\n')}\n  ]\n}`,
    )
    fixtureExpr.set(table, `build${pascal(table)}(today)`)
  } else {
    constBlocks.push(`const ${CONST}: ${typeName}[] = [\n${emitRows(t)}\n]`)
    fixtureExpr.set(table, CONST)
  }

  fixtureFields.push(`  ${table}: ${typeName}[]`)
}

typeBlocks.push(emitRowType('RawInventoryTransactionsRow', drawRows))
constBlocks.push(
  `const INVENTORY_DRAWS: RawInventoryTransactionsRow[] = [\n${emitRows(drawRows)}\n]`,
)

const counts = LITERAL_TABLES.map((t) => `${t}=${tables.get(t)!.rows.length}`).join(' ')

/* ------------------------------------------------------------------ */

const header = `/* =====================================================================
   GENERATED FILE — DO NOT EDIT BY HAND
   Produced by scripts/generate-fixtures.ts from supabase/seed.sql.
   Re-run with: npm run fixtures

   ⚠️  EVERY PRICE AND COST BELOW IS A PLACEHOLDER PENDING CLIENT
       CONFIRMATION. Product names and Spanish spellings are taken from
       the client's own published menu (typos corrected). Ingredient
       costs, recipe quantities, vendor prices, sales figures and
       expenses are ILLUSTRATIVE DEMO DATA and are not claims about this
       business. See §7 of 00-INTEL-AUDIT-PLAN.md.

   Shapes mirror the SQL exactly: snake_case columns, dollars as
   numeric(12,2) decimals, quantities as numeric(14,4). The demo adapter
   converts money to integer cents at its boundary — nothing downstream
   of the adapter ever sees a decimal dollar.

   Parsed from the seed: ${counts}
   ===================================================================== */

import { localToUtc, addBusinessDays } from '@/lib/datetime'

const addDays = addBusinessDays

/** A wall-clock time on a Richmond business date, as a UTC ISO instant. */
function atLocal(date: string, time: string): string {
  return localToUtc(date, time).toISOString()
}

/** Postgres \`round(numeric, 2)\` — half away from zero, on exact cents. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Day of year, 1-based, for a \`yyyy-MM-dd\` business date. */
function doy(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1
}

/** Day of week, 0 = Sunday, for a \`yyyy-MM-dd\` business date. */
function dow(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Postgres \`date_trunc('week', d)\` — weeks start Monday. */
function weekStart(date: string): string {
  const wd = dow(date)
  return addDays(date, -((wd + 6) % 7))
}

/** Postgres \`date_trunc('month', d)\`. */
function monthStart(date: string): string {
  return date.slice(0, 8) + '01'
}

function addMonths(date: string, n: number): string {
  const [y, m] = date.split('-').map(Number)
  const total = (y * 12 + (m - 1)) + n
  const yy = Math.floor(total / 12)
  const mm = (total % 12) + 1
  return \`\${yy}-\${String(mm).padStart(2, '0')}-01\`
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}
`

const generatedTypes = `
/* --------------------------------------------------------------------
   Row types for the tables the seed GENERATES rather than lists.
   -------------------------------------------------------------------- */

export interface RawPickupCapacityRulesRow {
  applies_to: string
  dow: number
  window_start: string
  window_end: string
  slot_minutes: number
  max_per_slot: number
}

export interface RawDailyStockRow {
  variant_id: string
  for_date: string
  qty_available: number
  qty_reserved: number
}

export interface RawOrderItemRow {
  order_id: string
  variant_id: string
  name_snapshot: string
  qty: number
  unit_price: number
  line_total: number
  note: string | null
}

export interface RawOrderRow {
  id: string
  /**
   * Stamped SMS consent for this order. Null means never text.
   * Mirrors \`customers.sms_opt_in_at\`; the seed's orders predate the
   * checkbox, so they carry null and correctly receive no SMS.
   */
  sms_opt_in_at: string | null
  order_number: string
  order_type: string
  status: string
  source: string
  customer_id: string | null
  contact_name: string
  contact_phone: string
  contact_email: string | null
  locale: string
  pickup_at: string
  subtotal: number
  discount: number
  tax: number
  total: number
  deposit_due: number
  amount_paid: number
  occasion: string | null
  customer_note: string | null
  allergy_note: string | null
  created_at: string
  confirmed_at: string | null
  ready_at: string | null
  completed_at: string | null
}

export interface RawCakeOrderDetailRow {
  order_id: string
  size_id: string
  tiers: number
  inscription: string | null
  inscription_lang: string | null
  color_notes: string | null
  serves_estimate: number | null
}

export interface RawSalesDayRow {
  business_date: string
  gross_sales: number
  tax_collected: number
  cash_expected: number
  cash_counted: number
  card_total: number
  online_total: number
  wholesale_total: number
  marketplace_total: number
  marketplace_fees: number
  transaction_count: number
  closed_at: string
}

export interface RawExpenseRow {
  category_slug: string
  spent_on: string
  amount: number
  method: string
  description: string
}

export interface RawLaborCostRow {
  period_start: string
  period_end: string
  total_hours: number
  gross_wages: number
  payroll_taxes: number
  headcount: number
}

export interface RawWasteRow {
  id: string
  variant_id: string
  ingredient_id: string | null
  qty: number
  unit_id: string
  reason: string
  est_value: number
  occurred_at: string
}
`

const buildFn = `
export interface RawFixtures {
${fixtureFields.join('\n')}
  inventory_transactions: RawInventoryTransactionsRow[]
  pickup_capacity_rules: RawPickupCapacityRulesRow[]
  daily_stock: RawDailyStockRow[]
  orders: RawOrderRow[]
  order_items: RawOrderItemRow[]
  cake_order_details: RawCakeOrderDetailRow[]
  sales_days: RawSalesDayRow[]
  expenses: RawExpenseRow[]
  labor_costs: RawLaborCostRow[]
  waste_log: RawWasteRow[]
}

/* =====================================================================
   PORTED GENERATORS
   The seed builds these with \`insert ... select\` and \`do $$\` blocks.
   Each function below is a line-by-line port of the SQL that produced
   it. The literal data they read (variants, prices, ingredients) is
   still parsed from the seed above — only the derivation is ported.
   ===================================================================== */

/** Opening count: one receipt per ingredient at its par level. */
function openingInventory(): RawInventoryTransactionsRow[] {
  return INGREDIENTS.map((ing) => ({
    business_id: BUSINESSES[0].id,
    location_id: LOCATIONS[0].id,
    ingredient_id: ing.id,
    txn_type: 'receipt',
    qty_delta: ing.par_level,
    unit_cost: ing.last_unit_cost,
    reference_type: 'seed',
    note: 'Opening count — demo seed',
  }))
}

/** \`insert into pickup_capacity_rules ... from generate_series(0,6)\`, twice. */
function capacityRules(): RawPickupCapacityRulesRow[] {
  const out: RawPickupCapacityRulesRow[] = []
  for (let d = 0; d <= 6; d++) {
    out.push({ applies_to: 'pickup', dow: d, window_start: '07:00', window_end: '19:00', slot_minutes: 30, max_per_slot: 12 })
  }
  for (let d = 0; d <= 6; d++) {
    out.push({ applies_to: 'cake', dow: d, window_start: '09:00', window_end: '18:00', slot_minutes: 60, max_per_slot: 4 })
  }
  return out
}

/** Fourteen days of bake quantities for every track_stock variant. */
const STOCK_BY_SKU: Record<string, number> = {
  'PAN-CONCHA': 180,
  'PAN-CONCHA-DOZ': 15,
  'PST-3LECHE-SLICE': 48,
  'PST-3LECHE-OREO': 24,
  'PST-3LECHE-BANANA': 24,
  'PST-FLAN': 30,
  'QSD-MEDIA': 20,
  'QSD-ENTERA': 18,
  'DON-SENCILLA': 120,
  'DON-DOZ': 10,
}

function dailyStock(today: string): RawDailyStockRow[] {
  const out: RawDailyStockRow[] = []
  for (const pv of PRODUCT_VARIANTS) {
    if (!pv.track_stock) continue
    for (const d of eachDay(today, addDays(today, 13))) {
      out.push({
        variant_id: pv.id,
        for_date: d,
        qty_available: STOCK_BY_SKU[pv.sku] ?? 40,
        qty_reserved: 0,
      })
    }
  }
  return out
}

/* ---------------------------------------------------------------------
   place_order(), ported. Same price lookup, same tax, same reservation
   against daily_stock — so the seeded week of orders leaves the ledger
   in exactly the state the SQL would have left it in.
   --------------------------------------------------------------------- */

interface OrderDraft {
  orderType: string
  contactName: string
  contactPhone: string
  contactEmail: string
  locale: string
  pickupAt: string
  items: { variant_id: string; qty: number }[]
  customerNote?: string | null
  allergyNote?: string | null
  source?: string
}

function placeOrder(
  draft: OrderDraft,
  seq: { n: number },
  stock: RawDailyStockRow[],
  items: RawOrderItemRow[],
  today: string,
): RawOrderRow {
  const taxRate = BUSINESSES[0].tax_rate
  const orderId = \`o0000000-0000-0000-0000-\${String(seq.n).padStart(12, '0')}\`
  const orderNumber = 'LS-' + String(seq.n).padStart(6, '0')
  seq.n += 1

  // The date the pickup instant falls on, in Richmond.
  const forDate = new Date(draft.pickupAt).toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  })

  let subtotal = 0

  // Deterministic lock order in the SQL is variant_id ascending; the same
  // ordering here keeps line numbering identical.
  const sorted = [...draft.items].sort((a, b) => a.variant_id.localeCompare(b.variant_id))

  for (const line of sorted) {
    const pv = PRODUCT_VARIANTS.find((v) => v.id === line.variant_id)
    if (!pv) throw new Error(\`seed order references unknown variant \${line.variant_id}\`)
    const p = PRODUCTS.find((x) => x.id === pv.product_id)!
    const name =
      draft.locale === 'en'
        ? \`\${p.name_en} — \${pv.label_en}\`
        : \`\${p.name_es} — \${pv.label_es}\`

    if (pv.track_stock) {
      const row = stock.find((s) => s.variant_id === pv.id && s.for_date === forDate)
      if (!row) throw new Error(\`No bake scheduled for \${name} on \${forDate}\`)
      if (row.qty_available - row.qty_reserved < line.qty) {
        throw new Error(\`Only \${row.qty_available - row.qty_reserved} left of \${name}\`)
      }
      row.qty_reserved += line.qty
    }

    const lineTotal = round2(line.qty * pv.price)
    items.push({
      order_id: orderId,
      variant_id: pv.id,
      name_snapshot: name,
      qty: line.qty,
      unit_price: pv.price,
      line_total: lineTotal,
      note: null,
    })
    subtotal = round2(subtotal + lineTotal)
  }

  const tax = round2(subtotal * taxRate)

  return {
    id: orderId,
    sms_opt_in_at: null,
    order_number: orderNumber,
    order_type: draft.orderType,
    status: 'pending_payment',
    source: draft.source ?? 'web',
    customer_id: null,
    contact_name: draft.contactName,
    contact_phone: draft.contactPhone,
    contact_email: draft.contactEmail,
    locale: draft.locale,
    pickup_at: draft.pickupAt,
    subtotal,
    discount: 0,
    tax,
    total: round2(subtotal + tax),
    deposit_due: 0,
    amount_paid: 0,
    occasion: null,
    customer_note: draft.customerNote ?? null,
    allergy_note: draft.allergyNote ?? null,
    created_at: atLocal(today, '08:00'),
    confirmed_at: null,
    ready_at: null,
    completed_at: null,
  }
}

/** The seed's \`do $$\` blocks: a week of pickups, then one cake order. */
function seededOrders(today: string, stock: RawDailyStockRow[]) {
  const orders: RawOrderRow[] = []
  const items: RawOrderItemRow[] = []
  const cakes: RawCakeOrderDetailRow[] = []
  const seq = { n: 1000 }   // order_number_seq starts at 1000

  for (let i = 0; i <= 6; i++) {
    const date = addDays(today, i)
    const pickup = atLocal(date, '10:00')

    const a = placeOrder({
      orderType: 'pickup',
      contactName: 'María Hernández',
      contactPhone: '(804) 555-0301',
      contactEmail: 'maria@example.com',
      locale: 'es',
      pickupAt: pickup,
      items: [
        { variant_id: 'd0000000-0000-0000-0000-000000000001', qty: 6 + i },
        { variant_id: 'd0000000-0000-0000-0000-000000000010', qty: 2 },
      ],
      customerNote: 'Sin nuez por favor',
      allergyNote: 'Alergia a la nuez',
    }, seq, stock, items, today)
    a.status = 'confirmed'
    a.customer_id = '06000000-0000-0000-0000-000000000001'
    a.confirmed_at = a.created_at
    a.amount_paid = a.total
    orders.push(a)

    const b = placeOrder({
      orderType: 'pickup',
      contactName: 'James Whitfield',
      contactPhone: '(804) 555-0302',
      contactEmail: 'james@example.com',
      locale: 'en',
      pickupAt: atLocal(date, '13:00'),
      items: [
        { variant_id: 'd0000000-0000-0000-0000-000000000023', qty: 1 },
        { variant_id: 'd0000000-0000-0000-0000-000000000050', qty: 4 },
      ],
    }, seq, stock, items, today)
    b.status = 'confirmed'
    b.customer_id = '06000000-0000-0000-0000-000000000002'
    b.confirmed_at = b.created_at
    b.amount_paid = b.total
    orders.push(b)
  }

  const cake = placeOrder({
    orderType: 'cake',
    contactName: 'Rosa Martínez',
    contactPhone: '(804) 555-0303',
    contactEmail: 'rosa@example.com',
    locale: 'es',
    pickupAt: atLocal(addDays(today, 9), '14:00'),
    items: [{ variant_id: 'd0000000-0000-0000-0000-000000000010', qty: 1 }],
    customerNote: 'Quinceañera de Sofía — listones color vino',
    source: 'web',
  }, seq, stock, items, today)

  // The seed overwrites the cake's money with the configurator's result.
  cake.status = 'confirmed'
  cake.customer_id = '06000000-0000-0000-0000-000000000003'
  cake.subtotal = 195.00
  cake.tax = 11.70
  cake.total = 206.70
  cake.deposit_due = 62.01
  cake.amount_paid = 62.01
  cake.occasion = 'quinceañera'
  cake.confirmed_at = cake.created_at
  orders.push(cake)

  cakes.push({
    order_id: cake.id,
    size_id: '02000000-0000-0000-0000-000000000004',
    tiers: 2,
    inscription: 'Felices 15, Sofía',
    inscription_lang: 'es',
    color_notes: 'Vino y oro',
    serves_estimate: 60,
  })

  return { orders, items, cakes }
}

/** Ninety days of sales, shaped so weekends and the doy wobble show up. */
function salesDays(today: string): RawSalesDayRow[] {
  return eachDay(addDays(today, -89), addDays(today, -1)).map((d) => {
    const wd = dow(d)
    const weekend = wd === 0 ? 620 : wd === 6 ? 840 : wd === 5 ? 410 : 0
    const base = round2(1850 + weekend + ((doy(d) * 37) % 260))
    const dayOfMonth = Number(d.slice(8))
    const short = dayOfMonth % 11 === 0 ? 4.25 : 0
    return {
      business_date: d,
      gross_sales: base,
      tax_collected: round2(base * 0.06),
      cash_expected: round2(base * 0.30),
      cash_counted: round2(round2(base * 0.30) - short),
      card_total: round2(base * 0.46),
      online_total: round2(base * 0.09),
      wholesale_total: round2(base * 0.12),
      marketplace_total: round2(base * 0.03),
      marketplace_fees: round2(base * 0.03 * 0.25),
      transaction_count: Math.round(base / 14),
      closed_at: atLocal(d, '21:00'),
    }
  })
}

/**
 * Ingredients and packaging land WEEKLY and scale with sales, so food-cost %
 * lands in the 26-32% band a real bakery actually runs at. Overheads land
 * monthly at a fixed amount.
 */
function expenses(today: string, sales: RawSalesDayRow[]): RawExpenseRow[] {
  const out: RawExpenseRow[] = []

  const byWeek = new Map<string, number>()
  for (const s of sales) {
    const w = weekStart(s.business_date)
    byWeek.set(w, round2((byWeek.get(w) ?? 0) + s.gross_sales))
  }

  const weeklyRates: Record<string, number> = { ingredientes: 0.265, empaque: 0.021 }
  for (const [week, weekSales] of byWeek) {
    for (const [slug, rate] of Object.entries(weeklyRates)) {
      const cat = EXPENSE_CATEGORIES.find((c) => c.slug === slug)!
      out.push({
        category_slug: slug,
        spent_on: week,
        amount: round2(weekSales * rate),
        method: 'card',
        description: \`\${cat.name_en} — weekly purchase (demo)\`,
      })
    }
  }

  const monthly: Record<string, number> = {
    nomina: 17800.00,
    renta: 5200.00,
    servicios: 2150.00,
    equipo: 640.00,
    marketing: 450.00,
    seguro: 780.00,
    combustible: 1250.00,
  }
  const methodFor = (slug: string) => (slug === 'nomina' ? 'ach' : slug === 'renta' ? 'check' : 'card')

  const first = monthStart(addDays(today, -89))
  const last = monthStart(today)
  for (let m = first; m <= last; m = addMonths(m, 1)) {
    for (const [slug, amount] of Object.entries(monthly)) {
      const cat = EXPENSE_CATEGORIES.find((c) => c.slug === slug)!
      out.push({
        category_slug: slug,
        spent_on: m,
        amount,
        method: methodFor(slug),
        description: \`\${cat.name_en} — monthly (demo)\`,
      })
    }
  }

  return out
}

function laborCosts(today: string): RawLaborCostRow[] {
  const out: RawLaborCostRow[] = []
  const first = weekStart(addDays(today, -89))
  const last = weekStart(addDays(today, -7))
  for (let d = first; d <= last; d = addDays(d, 7)) {
    out.push({
      period_start: d,
      period_end: addDays(d, 6),
      total_hours: 462,
      gross_wages: 4100.00,
      payroll_taxes: 380.00,
      headcount: 11,
    })
  }
  return out
}

/** A week of end-of-day shrink, so the waste report is never empty. */
function wasteLog(today: string): RawWasteRow[] {
  return eachDay(addDays(today, -6), addDays(today, -1)).map((d, i) => {
    const qty = 6 + (doy(d) % 9)
    return {
      id: \`w0000000-0000-0000-0000-\${String(i + 1).padStart(12, '0')}\`,
      variant_id: 'd0000000-0000-0000-0000-000000000001',
      ingredient_id: null,
      qty,
      unit_id: 'a0000000-0000-0000-0000-000000000009',
      reason: 'end_of_day',
      est_value: round2(qty * 1.75),
      occurred_at: atLocal(d, '20:00'),
    }
  })
}

/**
 * Build the complete fixture set for a given business date.
 *
 * \`today\` is a \`yyyy-MM-dd\` business date in America/New_York. Passing it
 * in rather than reading the clock keeps the whole set deterministic and
 * keeps "today" and "tomorrow" correct whenever the demo is opened.
 */
export function buildFixtures(today: string): RawFixtures {
  const daily_stock = dailyStock(today)
  const { orders, items, cakes } = seededOrders(today, daily_stock)
  const sales_days = salesDays(today)

  return {
${LITERAL_TABLES.map((t) => `    ${t}: ${fixtureExpr.get(t)},`).join('\n')}
    inventory_transactions: [...openingInventory(), ...INVENTORY_DRAWS],
    pickup_capacity_rules: capacityRules(),
    daily_stock,
    orders,
    order_items: items,
    cake_order_details: cakes,
    sales_days,
    expenses: expenses(today, sales_days),
    labor_costs: laborCosts(today),
    waste_log: wasteLog(today),
  }
}
`

const out = [
  header,
  '/* ---- Row types, inferred from the seed ---- */\n',
  typeBlocks.join('\n\n'),
  generatedTypes,
  '\n/* ---- Literal rows, parsed from the seed ---- */\n',
  constBlocks.join('\n\n'),
  buildFn,
].join('\n')

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, out, 'utf8')

console.log(`generate-fixtures: wrote ${OUT}`)
console.log(`  ${counts}`)
console.log(`  inventory_transactions(literal)=${drawRows.rows.length}`)
