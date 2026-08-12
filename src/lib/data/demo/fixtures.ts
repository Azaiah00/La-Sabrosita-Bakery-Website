/* =====================================================================
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

   Parsed from the seed: businesses=1 locations=1 opening_hours=7 units=11 unit_conversions=8 menu_categories=6 products=17 product_variants=25 ingredients=12 recipes=4 recipe_items=23 vendors=3 vendor_ingredients=6 cake_sizes=5 cake_options=14 lead_time_rules=6 expense_categories=9 price_lists=1 price_list_items=6 wholesale_accounts=4 standing_orders=2 standing_order_items=5 customers=4 invoices=5 invoice_items=6 invoice_payments=2 announcements=1 settings=3
   ===================================================================== */

import { localToUtc, addBusinessDays } from '@/lib/datetime'

const addDays = addBusinessDays

/** A wall-clock time on a Richmond business date, as a UTC ISO instant. */
function atLocal(date: string, time: string): string {
  return localToUtc(date, time).toISOString()
}

/** Postgres `round(numeric, 2)` — half away from zero, on exact cents. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Day of year, 1-based, for a `yyyy-MM-dd` business date. */
function doy(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1
}

/** Day of week, 0 = Sunday, for a `yyyy-MM-dd` business date. */
function dow(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Postgres `date_trunc('week', d)` — weeks start Monday. */
function weekStart(date: string): string {
  const wd = dow(date)
  return addDays(date, -((wd + 6) % 7))
}

/** Postgres `date_trunc('month', d)`. */
function monthStart(date: string): string {
  return date.slice(0, 8) + '01'
}

function addMonths(date: string, n: number): string {
  const [y, m] = date.split('-').map(Number)
  const total = (y * 12 + (m - 1)) + n
  const yy = Math.floor(total / 12)
  const mm = (total % 12) + 1
  return `${yy}-${String(mm).padStart(2, '0')}-01`
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/* ---- Row types, inferred from the seed ---- */

export interface RawBusinessesRow {
  id: string
  legal_name: string
  dba_name: string
  slug: string
  timezone: string
  default_locale: string
  tax_rate: number
}

export interface RawLocationsRow {
  id: string
  business_id: string
  name: string
  street1: string
  street2: string
  city: string
  region: string
  postal_code: string
  phone_primary: string
  phone_secondary: string
  email: string
  latitude: number
  longitude: number
}

export interface RawOpeningHoursRow {
  location_id: string
  dow: number
  opens_at: string
  closes_at: string
}

export interface RawUnitsRow {
  id: string
  code: string
  name_es: string
  name_en: string
  dimension: string
  is_base: boolean
}

export interface RawUnitConversionsRow {
  from_unit_id: string
  to_unit_id: string
  factor: number
}

export interface RawMenuCategoriesRow {
  id: string
  business_id: string
  slug: string
  name_es: string
  name_en: string
  sort_order: number
}

export interface RawProductsRow {
  id: string
  business_id: string
  category_id: string
  slug: string
  name_es: string
  name_en: string
  description_es: string
  description_en: string
  available_from: string | null
  sort_order: number
}

export interface RawProductVariantsRow {
  id: string
  business_id: string
  product_id: string
  sku: string
  label_es: string
  label_en: string
  price: number
  is_default: boolean
  track_stock: boolean
  sort_order: number
}

export interface RawIngredientsRow {
  id: string
  business_id: string
  sku: string
  name_es: string
  name_en: string
  stock_unit_id: string
  purchase_unit_id: string
  purchase_pack_qty: number
  last_unit_cost: number
  reorder_point: number
  par_level: number
  is_perishable: boolean
  shelf_life_days: number | null
}

export interface RawRecipesRow {
  id: string
  business_id: string
  variant_id: string | null
  name_es: string
  name_en: string
  yield_qty: number
  yield_unit_id: string
  labor_minutes: number
}

export interface RawRecipeItemsRow {
  recipe_id: string
  ingredient_id: string | null
  sub_recipe_id: string | null
  qty: number
  unit_id: string
  sort_order: number
}

export interface RawVendorsRow {
  id: string
  business_id: string
  name: string
  contact_name: string
  phone: string
  lead_time_days: number
  min_order: number
}

export interface RawVendorIngredientsRow {
  vendor_id: string
  ingredient_id: string
  purchase_unit_id: string
  purchase_pack_qty: number
  pack_price: number
  is_preferred: boolean
}

export interface RawCakeSizesRow {
  id: string
  business_id: string
  label_es: string
  label_en: string
  servings_min: number
  servings_max: number
  base_price: number
  min_lead_hours: number
  max_tiers: number
  sort_order: number
}

export interface RawCakeOptionsRow {
  business_id: string
  option_group: string
  slug: string
  label_es: string
  label_en: string
  price_delta: number
  extra_lead_hours: number
  sort_order: number
}

export interface RawLeadTimeRulesRow {
  business_id: string
  applies_to: string
  min_tiers: number | null
  min_servings: number | null
  requires_finish_slug: string | null
  min_lead_hours: number
  max_advance_days: number
  priority: number
}

export interface RawExpenseCategoriesRow {
  business_id: string
  slug: string
  name_es: string
  name_en: string
  is_cogs: boolean
  is_labor: boolean
  sort_order: number
}

export interface RawPriceListsRow {
  id: string
  business_id: string
  name: string
  is_default: boolean
}

export interface RawPriceListItemsRow {
  price_list_id: string
  variant_id: string
  unit_price: number
  case_qty: number
  min_qty: number
}

export interface RawWholesaleAccountsRow {
  id: string
  business_id: string
  store_name: string
  contact_name: string
  email: string
  phone: string
  street1: string
  city: string
  region: string
  postal_code: string
  price_list_id: string | null
  delivery_dow: number | null
  delivery_route: string | null
  credit_terms_days: number
  status: string
  approved_at: string | null
}

export interface RawStandingOrdersRow {
  id: string
  business_id: string
  wholesale_account_id: string
  dow: number
}

export interface RawStandingOrderItemsRow {
  standing_order_id: string
  variant_id: string
  qty: number
}

export interface RawCustomersRow {
  id: string
  business_id: string
  email: string
  phone: string
  full_name: string
  locale: string
  email_opt_in: boolean
  sms_opt_in: boolean
  sms_opt_in_at: string | null
  is_vip: boolean
  lifetime_orders: number
  lifetime_value: number
}

export interface RawInvoicesRow {
  id: string
  business_id: string
  wholesale_account_id: string
  invoice_number: string
  status: string
  issue_date: string
  due_date: string
  subtotal: number
  tax: number
  total: number
  amount_paid: number
}

export interface RawInvoiceItemsRow {
  invoice_id: string
  description: string
  qty: number
  unit_price: number
  line_total: number
}

export interface RawInvoicePaymentsRow {
  invoice_id: string
  amount: number
  method: string
  reference: string
  received_at: string
}

export interface RawAnnouncementsRow {
  business_id: string
  body_es: string
  body_en: string
  link_url: string
}

export interface RawSettingsRow {
  business_id: string
  key: string
  value: string
}

export interface RawInventoryTransactionsRow {
  business_id: string
  location_id: string
  ingredient_id: string
  txn_type: string
  qty_delta: number
  unit_cost: number
  reference_type: string
  note: string
}

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
   * Mirrors `customers.sms_opt_in_at`; the seed's orders predate the
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


/* ---- Literal rows, parsed from the seed ---- */

const BUSINESSES: RawBusinessesRow[] = [
  { id: '11111111-1111-1111-1111-111111111111', legal_name: 'La Sabrosita Bakery', dba_name: 'La Sabrosita Bakery', slug: 'la-sabrosita', timezone: 'America/New_York', default_locale: 'es', tax_rate: 0.06 },
]

const LOCATIONS: RawLocationsRow[] = [
  { id: '22222222-2222-2222-2222-222222222222', business_id: '11111111-1111-1111-1111-111111111111', name: 'Midlothian Turnpike', street1: '7730 Midlothian Turnpike', street2: 'Ste A', city: 'Richmond', region: 'VA', postal_code: '23235', phone_primary: '(804) 986-9695', phone_secondary: '(804) 562-8937', email: 'LaSabrositaBakery@gmail.com', latitude: 37.4989876, longitude: -77.5400652 },
]

const OPENING_HOURS: RawOpeningHoursRow[] = [
  { location_id: '22222222-2222-2222-2222-222222222222', dow: 0, opens_at: '07:00', closes_at: '19:00' },
  { location_id: '22222222-2222-2222-2222-222222222222', dow: 1, opens_at: '07:00', closes_at: '20:00' },
  { location_id: '22222222-2222-2222-2222-222222222222', dow: 2, opens_at: '07:00', closes_at: '20:00' },
  { location_id: '22222222-2222-2222-2222-222222222222', dow: 3, opens_at: '07:00', closes_at: '20:00' },
  { location_id: '22222222-2222-2222-2222-222222222222', dow: 4, opens_at: '07:00', closes_at: '20:00' },
  { location_id: '22222222-2222-2222-2222-222222222222', dow: 5, opens_at: '07:00', closes_at: '20:00' },
  { location_id: '22222222-2222-2222-2222-222222222222', dow: 6, opens_at: '07:00', closes_at: '20:00' },
]

const UNITS: RawUnitsRow[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', code: 'g', name_es: 'gramo', name_en: 'gram', dimension: 'mass', is_base: true },
  { id: 'a0000000-0000-0000-0000-000000000002', code: 'kg', name_es: 'kilogramo', name_en: 'kilogram', dimension: 'mass', is_base: false },
  { id: 'a0000000-0000-0000-0000-000000000003', code: 'lb', name_es: 'libra', name_en: 'pound', dimension: 'mass', is_base: false },
  { id: 'a0000000-0000-0000-0000-000000000004', code: 'oz', name_es: 'onza', name_en: 'ounce', dimension: 'mass', is_base: false },
  { id: 'a0000000-0000-0000-0000-000000000005', code: 'sack_50lb', name_es: 'saco 50 lb', name_en: '50 lb sack', dimension: 'mass', is_base: false },
  { id: 'a0000000-0000-0000-0000-000000000006', code: 'ml', name_es: 'mililitro', name_en: 'milliliter', dimension: 'volume', is_base: true },
  { id: 'a0000000-0000-0000-0000-000000000007', code: 'l', name_es: 'litro', name_en: 'liter', dimension: 'volume', is_base: false },
  { id: 'a0000000-0000-0000-0000-000000000008', code: 'gal', name_es: 'galón', name_en: 'gallon', dimension: 'volume', is_base: false },
  { id: 'a0000000-0000-0000-0000-000000000009', code: 'ea', name_es: 'unidad', name_en: 'each', dimension: 'count', is_base: true },
  { id: 'a0000000-0000-0000-0000-00000000000a', code: 'doz', name_es: 'docena', name_en: 'dozen', dimension: 'count', is_base: false },
  { id: 'a0000000-0000-0000-0000-00000000000b', code: 'case_30ct', name_es: 'caja 30', name_en: 'case of 30', dimension: 'count', is_base: false },
]

const UNIT_CONVERSIONS: RawUnitConversionsRow[] = [
  { from_unit_id: 'a0000000-0000-0000-0000-000000000002', to_unit_id: 'a0000000-0000-0000-0000-000000000001', factor: 1000 },
  { from_unit_id: 'a0000000-0000-0000-0000-000000000003', to_unit_id: 'a0000000-0000-0000-0000-000000000001', factor: 453.59237 },
  { from_unit_id: 'a0000000-0000-0000-0000-000000000004', to_unit_id: 'a0000000-0000-0000-0000-000000000001', factor: 28.349523125 },
  { from_unit_id: 'a0000000-0000-0000-0000-000000000005', to_unit_id: 'a0000000-0000-0000-0000-000000000001', factor: 22679.6185 },
  { from_unit_id: 'a0000000-0000-0000-0000-000000000007', to_unit_id: 'a0000000-0000-0000-0000-000000000006', factor: 1000 },
  { from_unit_id: 'a0000000-0000-0000-0000-000000000008', to_unit_id: 'a0000000-0000-0000-0000-000000000006', factor: 3785.411784 },
  { from_unit_id: 'a0000000-0000-0000-0000-00000000000a', to_unit_id: 'a0000000-0000-0000-0000-000000000009', factor: 12 },
  { from_unit_id: 'a0000000-0000-0000-0000-00000000000b', to_unit_id: 'a0000000-0000-0000-0000-000000000009', factor: 30 },
]

const MENU_CATEGORIES: RawMenuCategoriesRow[] = [
  { id: 'b0000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', slug: 'pan-dulce', name_es: 'Pan Dulce', name_en: 'Sweet Bread', sort_order: 1 },
  { id: 'b0000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', slug: 'pasteles', name_es: 'Pasteles y Postres', name_en: 'Cakes & Desserts', sort_order: 2 },
  { id: 'b0000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', slug: 'quesadilla', name_es: 'Quesadilla Salvadoreña', name_en: 'Salvadoran Cheese Bread', sort_order: 3 },
  { id: 'b0000000-0000-0000-0000-000000000004', business_id: '11111111-1111-1111-1111-111111111111', slug: 'pan-salado', name_es: 'Pan Salado', name_en: 'Savory Breads', sort_order: 4 },
  { id: 'b0000000-0000-0000-0000-000000000005', business_id: '11111111-1111-1111-1111-111111111111', slug: 'hojaldres', name_es: 'Hojaldres', name_en: 'Puff Pastries', sort_order: 5 },
  { id: 'b0000000-0000-0000-0000-000000000006', business_id: '11111111-1111-1111-1111-111111111111', slug: 'donas-galletas', name_es: 'Donas y Galletas', name_en: 'Donuts & Cookies', sort_order: 6 },
]

const PRODUCTS: RawProductsRow[] = [
  { id: 'c0000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000001', slug: 'concha', name_es: 'Concha', name_en: 'Concha', description_es: 'Pan de levadura suave con costra de azúcar rayada a mano. Sale del horno a las 7 de la mañana.', description_en: 'Soft yeast bread under a hand-scored sugar shell. Out of the oven at 7 AM.', available_from: '07:00', sort_order: 1 },
  { id: 'c0000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000001', slug: 'pan-dulce-guayaba', name_es: 'Pan Dulce con Guayaba', name_en: 'Guava Sweet Bread', description_es: 'Relleno de guayaba, horneado cada mañana.', description_en: 'Filled with guava, baked every morning.', available_from: '07:00', sort_order: 2 },
  { id: 'c0000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000001', slug: 'semita', name_es: 'Semita de Levadura', name_en: 'Sweet Yeast Bread', description_es: 'Semita tradicional de levadura.', description_en: 'Traditional sweet yeast bread.', available_from: '07:00', sort_order: 3 },
  { id: 'c0000000-0000-0000-0000-000000000004', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000001', slug: 'marranito', name_es: 'Marranito', name_en: 'Gingerbread Pig Cookie', description_es: 'Galleta de jengibre en forma de cerdito.', description_en: 'Gingerbread cookie shaped like a little pig.', available_from: null, sort_order: 4 },
  { id: 'c0000000-0000-0000-0000-000000000005', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000001', slug: 'oreja', name_es: 'Oreja', name_en: 'Elephant Ear', description_es: 'Hojaldre caramelizado, crujiente por fuera.', description_en: 'Caramelized puff pastry, crisp at the edges.', available_from: null, sort_order: 5 },
  { id: 'c0000000-0000-0000-0000-000000000010', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000002', slug: 'tres-leches', name_es: 'Tres Leches', name_en: 'Tres Leches', description_es: 'Bizcocho remojado en leche evaporada, leche condensada y leche entera.', description_en: 'Sponge cake soaked in evaporated milk, condensed milk and whole milk.', available_from: null, sort_order: 1 },
  { id: 'c0000000-0000-0000-0000-000000000011', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000002', slug: 'flan', name_es: 'Flan', name_en: 'Flan', description_es: 'Flan de la casa, hecho cada mañana.', description_en: 'House flan, made fresh each morning.', available_from: null, sort_order: 2 },
  { id: 'c0000000-0000-0000-0000-000000000012', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000002', slug: 'budin-de-pan', name_es: 'Budín de Pan', name_en: 'Bread Pudding', description_es: 'Budín de pan tradicional.', description_en: 'Traditional bread pudding.', available_from: null, sort_order: 3 },
  { id: 'c0000000-0000-0000-0000-000000000013', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000002', slug: 'torta-alemana', name_es: 'Torta Alemana', name_en: 'Pound Cake', description_es: 'Torta alemana, por porción o entera.', description_en: 'Pound cake, by the slice or whole.', available_from: null, sort_order: 4 },
  { id: 'c0000000-0000-0000-0000-000000000020', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000003', slug: 'quesadilla-salvadorena', name_es: 'Quesadilla Salvadoreña', name_en: 'Salvadoran Cheese Bread', description_es: 'Pan de queso salvadoreño. El más pedido de la casa.', description_en: 'Salvadoran cheese bread. The one people drive across town for.', available_from: null, sort_order: 1 },
  { id: 'c0000000-0000-0000-0000-000000000030', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000004', slug: 'pan-queso', name_es: 'Pan Queso', name_en: 'Cheese Bread', description_es: 'Pan de queso, pequeño o grande.', description_en: 'Cheese bread, small or large.', available_from: null, sort_order: 1 },
  { id: 'c0000000-0000-0000-0000-000000000031', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000004', slug: 'pan-jalapeno', name_es: 'Pan con Queso y Jalapeño', name_en: 'Jalapeño & Cream Cheese Bread', description_es: 'Pan francés con queso crema y jalapeño.', description_en: 'French bread with cream cheese and jalapeño.', available_from: null, sort_order: 2 },
  { id: 'c0000000-0000-0000-0000-000000000040', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000005', slug: 'chicharron-guayaba', name_es: 'Chicharrón de Guayaba', name_en: 'Guava Puff Pastry', description_es: 'Hojaldre relleno de guayaba.', description_en: 'Puff pastry filled with guava.', available_from: null, sort_order: 1 },
  { id: 'c0000000-0000-0000-0000-000000000041', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000005', slug: 'quesito', name_es: 'Quesito Puertorriqueño', name_en: 'Puerto Rican Cheese Puff', description_es: 'Hojaldre relleno de queso crema dulce.', description_en: 'Puff pastry filled with sweet cream cheese.', available_from: null, sort_order: 2 },
  { id: 'c0000000-0000-0000-0000-000000000050', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000006', slug: 'dona', name_es: 'Dona', name_en: 'Donut', description_es: 'Azúcar, chocolate o glaseada.', description_en: 'Sugar, chocolate or glazed.', available_from: '07:00', sort_order: 1 },
  { id: 'c0000000-0000-0000-0000-000000000051', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000006', slug: 'churro', name_es: 'Churro', name_en: 'Churro', description_es: 'Sencillo, relleno de cajeta o de crema bávara.', description_en: 'Plain, caramel filled, or Bavarian cream.', available_from: null, sort_order: 2 },
  { id: 'c0000000-0000-0000-0000-000000000052', business_id: '11111111-1111-1111-1111-111111111111', category_id: 'b0000000-0000-0000-0000-000000000006', slug: 'polvoron', name_es: 'Polvorón', name_en: 'Mexican Shortbread Cookie', description_es: 'Galleta mexicana de mantequilla.', description_en: 'Mexican butter shortbread cookie.', available_from: null, sort_order: 3 },
]

const PRODUCT_VARIANTS: RawProductVariantsRow[] = [
  { id: 'd0000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000001', sku: 'PAN-CONCHA', label_es: 'c/u', label_en: 'each', price: 1.75, is_default: true, track_stock: true, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000001', sku: 'PAN-CONCHA-DOZ', label_es: 'docena', label_en: 'dozen', price: 18, is_default: false, track_stock: true, sort_order: 2 },
  { id: 'd0000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000002', sku: 'PAN-GUAYABA', label_es: 'c/u', label_en: 'each', price: 2.25, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000004', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000003', sku: 'PAN-SEMITA', label_es: 'c/u', label_en: 'each', price: 1.75, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000005', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000004', sku: 'PAN-MARRANITO', label_es: 'c/u', label_en: 'each', price: 1.75, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000006', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000005', sku: 'PAN-OREJA', label_es: 'c/u', label_en: 'each', price: 1.95, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000010', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000010', sku: 'PST-3LECHE-SLICE', label_es: 'porción', label_en: 'slice', price: 5.99, is_default: true, track_stock: true, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000011', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000010', sku: 'PST-3LECHE-OREO', label_es: 'porción Oreo', label_en: 'Oreo slice', price: 6.5, is_default: false, track_stock: true, sort_order: 2 },
  { id: 'd0000000-0000-0000-0000-000000000012', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000010', sku: 'PST-3LECHE-BANANA', label_es: 'porción plátano', label_en: 'banana pudding slice', price: 7.5, is_default: false, track_stock: true, sort_order: 3 },
  { id: 'd0000000-0000-0000-0000-000000000013', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000011', sku: 'PST-FLAN', label_es: 'porción', label_en: 'portion', price: 6.99, is_default: true, track_stock: true, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000014', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000012', sku: 'PST-BUDIN', label_es: 'porción', label_en: 'portion', price: 3.25, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000015', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000013', sku: 'PST-ALEMANA', label_es: 'porción', label_en: 'slice', price: 3.99, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000020', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000020', sku: 'QSD-PEQ', label_es: 'pequeña', label_en: 'small', price: 2.5, is_default: false, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000021', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000020', sku: 'QSD-CUARTO', label_es: '1/4', label_en: 'quarter', price: 4.25, is_default: false, track_stock: false, sort_order: 2 },
  { id: 'd0000000-0000-0000-0000-000000000022', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000020', sku: 'QSD-MEDIA', label_es: '1/2', label_en: 'half', price: 7.99, is_default: false, track_stock: true, sort_order: 3 },
  { id: 'd0000000-0000-0000-0000-000000000023', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000020', sku: 'QSD-ENTERA', label_es: 'entera', label_en: 'full', price: 13.99, is_default: true, track_stock: true, sort_order: 4 },
  { id: 'd0000000-0000-0000-0000-000000000030', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000030', sku: 'SAL-PANQUESO-P', label_es: 'pequeño', label_en: 'small', price: 2.5, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000031', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000030', sku: 'SAL-PANQUESO-G', label_es: 'grande', label_en: 'large', price: 4.5, is_default: false, track_stock: false, sort_order: 2 },
  { id: 'd0000000-0000-0000-0000-000000000032', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000031', sku: 'SAL-JALAPENO', label_es: 'c/u', label_en: 'each', price: 2.75, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000040', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000040', sku: 'HOJ-GUAYABA', label_es: 'c/u', label_en: 'each', price: 2.5, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000041', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000041', sku: 'HOJ-QUESITO', label_es: 'c/u', label_en: 'each', price: 2.5, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000050', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000050', sku: 'DON-SENCILLA', label_es: 'c/u', label_en: 'each', price: 1.5, is_default: true, track_stock: true, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000051', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000050', sku: 'DON-DOZ', label_es: 'docena', label_en: 'dozen', price: 15, is_default: false, track_stock: true, sort_order: 2 },
  { id: 'd0000000-0000-0000-0000-000000000052', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000051', sku: 'DON-CHURRO', label_es: 'c/u', label_en: 'each', price: 2.25, is_default: true, track_stock: false, sort_order: 1 },
  { id: 'd0000000-0000-0000-0000-000000000053', business_id: '11111111-1111-1111-1111-111111111111', product_id: 'c0000000-0000-0000-0000-000000000052', sku: 'DON-POLVORON', label_es: 'c/u', label_en: 'each', price: 1.5, is_default: true, track_stock: false, sort_order: 1 },
]

const INGREDIENTS: RawIngredientsRow[] = [
  { id: 'e0000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-HARINA', name_es: 'Harina de trigo', name_en: 'Bread flour', stock_unit_id: 'a0000000-0000-0000-0000-000000000001', purchase_unit_id: 'a0000000-0000-0000-0000-000000000005', purchase_pack_qty: 22679.6185, last_unit_cost: 0.0011, reorder_point: 45000, par_level: 180000, is_perishable: false, shelf_life_days: null },
  { id: 'e0000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-AZUCAR', name_es: 'Azúcar', name_en: 'Granulated sugar', stock_unit_id: 'a0000000-0000-0000-0000-000000000001', purchase_unit_id: 'a0000000-0000-0000-0000-000000000005', purchase_pack_qty: 22679.6185, last_unit_cost: 0.0013, reorder_point: 22000, par_level: 90000, is_perishable: false, shelf_life_days: null },
  { id: 'e0000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-MANTEQUILLA', name_es: 'Mantequilla', name_en: 'Butter', stock_unit_id: 'a0000000-0000-0000-0000-000000000001', purchase_unit_id: 'a0000000-0000-0000-0000-000000000003', purchase_pack_qty: 453.59237, last_unit_cost: 0.0095, reorder_point: 9000, par_level: 27000, is_perishable: true, shelf_life_days: 60 },
  { id: 'e0000000-0000-0000-0000-000000000004', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-HUEVO', name_es: 'Huevos', name_en: 'Eggs', stock_unit_id: 'a0000000-0000-0000-0000-000000000009', purchase_unit_id: 'a0000000-0000-0000-0000-00000000000b', purchase_pack_qty: 30, last_unit_cost: 0.24, reorder_point: 180, par_level: 900, is_perishable: true, shelf_life_days: 28 },
  { id: 'e0000000-0000-0000-0000-000000000005', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-LECHE', name_es: 'Leche entera', name_en: 'Whole milk', stock_unit_id: 'a0000000-0000-0000-0000-000000000006', purchase_unit_id: 'a0000000-0000-0000-0000-000000000008', purchase_pack_qty: 3785.411784, last_unit_cost: 0.0013, reorder_point: 7500, par_level: 30000, is_perishable: true, shelf_life_days: 10 },
  { id: 'e0000000-0000-0000-0000-000000000006', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-LECHE-COND', name_es: 'Leche condensada', name_en: 'Condensed milk', stock_unit_id: 'a0000000-0000-0000-0000-000000000006', purchase_unit_id: 'a0000000-0000-0000-0000-000000000007', purchase_pack_qty: 1000, last_unit_cost: 0.0042, reorder_point: 4000, par_level: 16000, is_perishable: false, shelf_life_days: null },
  { id: 'e0000000-0000-0000-0000-000000000007', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-LECHE-EVAP', name_es: 'Leche evaporada', name_en: 'Evaporated milk', stock_unit_id: 'a0000000-0000-0000-0000-000000000006', purchase_unit_id: 'a0000000-0000-0000-0000-000000000007', purchase_pack_qty: 1000, last_unit_cost: 0.0034, reorder_point: 4000, par_level: 16000, is_perishable: false, shelf_life_days: null },
  { id: 'e0000000-0000-0000-0000-000000000008', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-QUESO', name_es: 'Queso duro', name_en: 'Hard cheese', stock_unit_id: 'a0000000-0000-0000-0000-000000000001', purchase_unit_id: 'a0000000-0000-0000-0000-000000000003', purchase_pack_qty: 453.59237, last_unit_cost: 0.0132, reorder_point: 7000, par_level: 23000, is_perishable: true, shelf_life_days: 45 },
  { id: 'e0000000-0000-0000-0000-000000000009', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-GUAYABA', name_es: 'Pasta de guayaba', name_en: 'Guava paste', stock_unit_id: 'a0000000-0000-0000-0000-000000000001', purchase_unit_id: 'a0000000-0000-0000-0000-000000000003', purchase_pack_qty: 453.59237, last_unit_cost: 0.0068, reorder_point: 3000, par_level: 11000, is_perishable: false, shelf_life_days: null },
  { id: 'e0000000-0000-0000-0000-00000000000a', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-LEVADURA', name_es: 'Levadura', name_en: 'Yeast', stock_unit_id: 'a0000000-0000-0000-0000-000000000001', purchase_unit_id: 'a0000000-0000-0000-0000-000000000003', purchase_pack_qty: 453.59237, last_unit_cost: 0.0088, reorder_point: 900, par_level: 3600, is_perishable: false, shelf_life_days: null },
  { id: 'e0000000-0000-0000-0000-00000000000b', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-CANELA', name_es: 'Canela molida', name_en: 'Ground cinnamon', stock_unit_id: 'a0000000-0000-0000-0000-000000000001', purchase_unit_id: 'a0000000-0000-0000-0000-000000000003', purchase_pack_qty: 453.59237, last_unit_cost: 0.021, reorder_point: 450, par_level: 1800, is_perishable: false, shelf_life_days: null },
  { id: 'e0000000-0000-0000-0000-00000000000c', business_id: '11111111-1111-1111-1111-111111111111', sku: 'ING-CAJA-PAST', name_es: 'Caja de pastel 10"', name_en: '10" cake box', stock_unit_id: 'a0000000-0000-0000-0000-000000000009', purchase_unit_id: 'a0000000-0000-0000-0000-00000000000b', purchase_pack_qty: 30, last_unit_cost: 0.65, reorder_point: 60, par_level: 300, is_perishable: false, shelf_life_days: null },
]

const RECIPES: RawRecipesRow[] = [
  { id: 'f0000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', variant_id: 'd0000000-0000-0000-0000-000000000001', name_es: 'Masa de concha — tanda', name_en: 'Concha dough — batch', yield_qty: 48, yield_unit_id: 'a0000000-0000-0000-0000-000000000009', labor_minutes: 95 },
  { id: 'f0000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', variant_id: 'd0000000-0000-0000-0000-000000000010', name_es: 'Tres leches — molde', name_en: 'Tres leches — sheet', yield_qty: 24, yield_unit_id: 'a0000000-0000-0000-0000-000000000009', labor_minutes: 75 },
  { id: 'f0000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', variant_id: 'd0000000-0000-0000-0000-000000000023', name_es: 'Quesadilla Salvadoreña entera', name_en: 'Full Salvadoran cheese bread', yield_qty: 6, yield_unit_id: 'a0000000-0000-0000-0000-000000000009', labor_minutes: 60 },
  { id: 'f0000000-0000-0000-0000-000000000004', business_id: '11111111-1111-1111-1111-111111111111', variant_id: null, name_es: 'Costra de azúcar', name_en: 'Sugar shell topping', yield_qty: 1200, yield_unit_id: 'a0000000-0000-0000-0000-000000000001', labor_minutes: 20 },
]

const RECIPE_ITEMS: RawRecipeItemsRow[] = [
  { recipe_id: 'f0000000-0000-0000-0000-000000000001', ingredient_id: 'e0000000-0000-0000-0000-000000000001', sub_recipe_id: null, qty: 3000, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 1 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000001', ingredient_id: 'e0000000-0000-0000-0000-000000000002', sub_recipe_id: null, qty: 600, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 2 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000001', ingredient_id: 'e0000000-0000-0000-0000-000000000003', sub_recipe_id: null, qty: 1.5, unit_id: 'a0000000-0000-0000-0000-000000000003', sort_order: 3 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000001', ingredient_id: 'e0000000-0000-0000-0000-000000000004', sub_recipe_id: null, qty: 12, unit_id: 'a0000000-0000-0000-0000-000000000009', sort_order: 4 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000001', ingredient_id: 'e0000000-0000-0000-0000-000000000005', sub_recipe_id: null, qty: 1.2, unit_id: 'a0000000-0000-0000-0000-000000000007', sort_order: 5 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000001', ingredient_id: 'e0000000-0000-0000-0000-00000000000a', sub_recipe_id: null, qty: 90, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 6 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000001', ingredient_id: null, sub_recipe_id: 'f0000000-0000-0000-0000-000000000004', qty: 960, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 7 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000004', ingredient_id: 'e0000000-0000-0000-0000-000000000002', sub_recipe_id: null, qty: 500, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 1 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000004', ingredient_id: 'e0000000-0000-0000-0000-000000000003', sub_recipe_id: null, qty: 300, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 2 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000004', ingredient_id: 'e0000000-0000-0000-0000-000000000001', sub_recipe_id: null, qty: 400, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 3 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-000000000001', sub_recipe_id: null, qty: 900, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 1 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-000000000002', sub_recipe_id: null, qty: 750, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 2 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-000000000004', sub_recipe_id: null, qty: 18, unit_id: 'a0000000-0000-0000-0000-000000000009', sort_order: 3 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-000000000006', sub_recipe_id: null, qty: 1.2, unit_id: 'a0000000-0000-0000-0000-000000000007', sort_order: 4 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-000000000007', sub_recipe_id: null, qty: 1.2, unit_id: 'a0000000-0000-0000-0000-000000000007', sort_order: 5 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-000000000005', sub_recipe_id: null, qty: 600, unit_id: 'a0000000-0000-0000-0000-000000000006', sort_order: 6 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-00000000000c', sub_recipe_id: null, qty: 1, unit_id: 'a0000000-0000-0000-0000-000000000009', sort_order: 7 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000003', ingredient_id: 'e0000000-0000-0000-0000-000000000001', sub_recipe_id: null, qty: 1400, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 1 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000003', ingredient_id: 'e0000000-0000-0000-0000-000000000008', sub_recipe_id: null, qty: 2.2, unit_id: 'a0000000-0000-0000-0000-000000000003', sort_order: 2 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000003', ingredient_id: 'e0000000-0000-0000-0000-000000000002', sub_recipe_id: null, qty: 900, unit_id: 'a0000000-0000-0000-0000-000000000001', sort_order: 3 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000003', ingredient_id: 'e0000000-0000-0000-0000-000000000003', sub_recipe_id: null, qty: 1.1, unit_id: 'a0000000-0000-0000-0000-000000000003', sort_order: 4 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000003', ingredient_id: 'e0000000-0000-0000-0000-000000000004', sub_recipe_id: null, qty: 14, unit_id: 'a0000000-0000-0000-0000-000000000009', sort_order: 5 },
  { recipe_id: 'f0000000-0000-0000-0000-000000000003', ingredient_id: 'e0000000-0000-0000-0000-000000000005', sub_recipe_id: null, qty: 500, unit_id: 'a0000000-0000-0000-0000-000000000006', sort_order: 6 },
]

const VENDORS: RawVendorsRow[] = [
  { id: '01000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', name: 'Restaurant Depot', contact_name: 'Counter', phone: '(804) 555-0111', lead_time_days: 1, min_order: 250 },
  { id: '01000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', name: 'Dairy distributor', contact_name: 'Route driver', phone: '(804) 555-0122', lead_time_days: 2, min_order: 150 },
  { id: '01000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', name: 'Packaging supplier', contact_name: 'Sales rep', phone: '(804) 555-0133', lead_time_days: 5, min_order: 300 },
]

const VENDOR_INGREDIENTS: RawVendorIngredientsRow[] = [
  { vendor_id: '01000000-0000-0000-0000-000000000001', ingredient_id: 'e0000000-0000-0000-0000-000000000001', purchase_unit_id: 'a0000000-0000-0000-0000-000000000005', purchase_pack_qty: 22679.6185, pack_price: 24.95, is_preferred: true },
  { vendor_id: '01000000-0000-0000-0000-000000000001', ingredient_id: 'e0000000-0000-0000-0000-000000000002', purchase_unit_id: 'a0000000-0000-0000-0000-000000000005', purchase_pack_qty: 22679.6185, pack_price: 29.5, is_preferred: true },
  { vendor_id: '01000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-000000000003', purchase_unit_id: 'a0000000-0000-0000-0000-000000000003', purchase_pack_qty: 453.59237, pack_price: 4.31, is_preferred: true },
  { vendor_id: '01000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-000000000004', purchase_unit_id: 'a0000000-0000-0000-0000-00000000000b', purchase_pack_qty: 30, pack_price: 7.2, is_preferred: true },
  { vendor_id: '01000000-0000-0000-0000-000000000002', ingredient_id: 'e0000000-0000-0000-0000-000000000005', purchase_unit_id: 'a0000000-0000-0000-0000-000000000008', purchase_pack_qty: 3785.411784, pack_price: 4.92, is_preferred: true },
  { vendor_id: '01000000-0000-0000-0000-000000000003', ingredient_id: 'e0000000-0000-0000-0000-00000000000c', purchase_unit_id: 'a0000000-0000-0000-0000-00000000000b', purchase_pack_qty: 30, pack_price: 19.5, is_preferred: true },
]

const CAKE_SIZES: RawCakeSizesRow[] = [
  { id: '02000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', label_es: '1/4 de plancha', label_en: 'Quarter sheet', servings_min: 15, servings_max: 20, base_price: 45, min_lead_hours: 48, max_tiers: 1, sort_order: 1 },
  { id: '02000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', label_es: '1/2 plancha', label_en: 'Half sheet', servings_min: 30, servings_max: 40, base_price: 75, min_lead_hours: 48, max_tiers: 1, sort_order: 2 },
  { id: '02000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', label_es: 'Plancha entera', label_en: 'Full sheet', servings_min: 60, servings_max: 80, base_price: 135, min_lead_hours: 72, max_tiers: 1, sort_order: 3 },
  { id: '02000000-0000-0000-0000-000000000004', business_id: '11111111-1111-1111-1111-111111111111', label_es: '2 pisos', label_en: 'Two tier', servings_min: 50, servings_max: 70, base_price: 195, min_lead_hours: 168, max_tiers: 2, sort_order: 4 },
  { id: '02000000-0000-0000-0000-000000000005', business_id: '11111111-1111-1111-1111-111111111111', label_es: '3 pisos', label_en: 'Three tier', servings_min: 90, servings_max: 120, base_price: 325, min_lead_hours: 168, max_tiers: 3, sort_order: 5 },
]

const CAKE_OPTIONS: RawCakeOptionsRow[] = [
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'flavor', slug: 'tres-leches', label_es: 'Tres leches', label_en: 'Tres leches', price_delta: 0, extra_lead_hours: 0, sort_order: 1 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'flavor', slug: 'vainilla', label_es: 'Vainilla', label_en: 'Vanilla', price_delta: 0, extra_lead_hours: 0, sort_order: 2 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'flavor', slug: 'chocolate', label_es: 'Chocolate', label_en: 'Chocolate', price_delta: 0, extra_lead_hours: 0, sort_order: 3 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'flavor', slug: 'marmol', label_es: 'Mármol', label_en: 'Marble', price_delta: 5, extra_lead_hours: 0, sort_order: 4 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'filling', slug: 'fresa', label_es: 'Fresa', label_en: 'Strawberry', price_delta: 0, extra_lead_hours: 0, sort_order: 1 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'filling', slug: 'durazno', label_es: 'Durazno', label_en: 'Peach', price_delta: 0, extra_lead_hours: 0, sort_order: 2 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'filling', slug: 'cajeta', label_es: 'Cajeta', label_en: 'Dulce de leche', price_delta: 5, extra_lead_hours: 0, sort_order: 3 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'filling', slug: 'guayaba', label_es: 'Guayaba', label_en: 'Guava', price_delta: 5, extra_lead_hours: 0, sort_order: 4 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'frosting', slug: 'crema', label_es: 'Crema batida', label_en: 'Whipped cream', price_delta: 0, extra_lead_hours: 0, sort_order: 1 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'frosting', slug: 'buttercream', label_es: 'Buttercream', label_en: 'Buttercream', price_delta: 0, extra_lead_hours: 0, sort_order: 2 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'frosting', slug: 'fondant', label_es: 'Fondant', label_en: 'Fondant', price_delta: 35, extra_lead_hours: 72, sort_order: 3 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'finish', slug: 'sencillo', label_es: 'Sencillo', label_en: 'Simple', price_delta: 0, extra_lead_hours: 0, sort_order: 1 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'finish', slug: 'flores', label_es: 'Flores de crema', label_en: 'Piped flowers', price_delta: 15, extra_lead_hours: 0, sort_order: 2 },
  { business_id: '11111111-1111-1111-1111-111111111111', option_group: 'finish', slug: 'foto', label_es: 'Foto comestible', label_en: 'Edible photo', price_delta: 20, extra_lead_hours: 24, sort_order: 3 },
]

const LEAD_TIME_RULES: RawLeadTimeRulesRow[] = [
  { business_id: '11111111-1111-1111-1111-111111111111', applies_to: 'cake', min_tiers: null, min_servings: null, requires_finish_slug: null, min_lead_hours: 48, max_advance_days: 180, priority: 0 },
  { business_id: '11111111-1111-1111-1111-111111111111', applies_to: 'cake', min_tiers: null, min_servings: 60, requires_finish_slug: null, min_lead_hours: 72, max_advance_days: 180, priority: 10 },
  { business_id: '11111111-1111-1111-1111-111111111111', applies_to: 'cake', min_tiers: 2, min_servings: null, requires_finish_slug: null, min_lead_hours: 168, max_advance_days: 365, priority: 20 },
  { business_id: '11111111-1111-1111-1111-111111111111', applies_to: 'cake', min_tiers: null, min_servings: null, requires_finish_slug: 'foto', min_lead_hours: 72, max_advance_days: 180, priority: 15 },
  { business_id: '11111111-1111-1111-1111-111111111111', applies_to: 'pickup', min_tiers: null, min_servings: null, requires_finish_slug: null, min_lead_hours: 12, max_advance_days: 30, priority: 0 },
  { business_id: '11111111-1111-1111-1111-111111111111', applies_to: 'catering', min_tiers: null, min_servings: null, requires_finish_slug: null, min_lead_hours: 72, max_advance_days: 180, priority: 0 },
]

const EXPENSE_CATEGORIES: RawExpenseCategoriesRow[] = [
  { business_id: '11111111-1111-1111-1111-111111111111', slug: 'ingredientes', name_es: 'Ingredientes', name_en: 'Ingredients', is_cogs: true, is_labor: false, sort_order: 1 },
  { business_id: '11111111-1111-1111-1111-111111111111', slug: 'empaque', name_es: 'Empaque', name_en: 'Packaging', is_cogs: true, is_labor: false, sort_order: 2 },
  { business_id: '11111111-1111-1111-1111-111111111111', slug: 'nomina', name_es: 'Nómina', name_en: 'Payroll', is_cogs: false, is_labor: true, sort_order: 3 },
  { business_id: '11111111-1111-1111-1111-111111111111', slug: 'renta', name_es: 'Renta', name_en: 'Rent', is_cogs: false, is_labor: false, sort_order: 4 },
  { business_id: '11111111-1111-1111-1111-111111111111', slug: 'servicios', name_es: 'Servicios', name_en: 'Utilities', is_cogs: false, is_labor: false, sort_order: 5 },
  { business_id: '11111111-1111-1111-1111-111111111111', slug: 'equipo', name_es: 'Equipo y reparación', name_en: 'Equipment & repair', is_cogs: false, is_labor: false, sort_order: 6 },
  { business_id: '11111111-1111-1111-1111-111111111111', slug: 'marketing', name_es: 'Publicidad', name_en: 'Marketing', is_cogs: false, is_labor: false, sort_order: 7 },
  { business_id: '11111111-1111-1111-1111-111111111111', slug: 'seguro', name_es: 'Seguro', name_en: 'Insurance', is_cogs: false, is_labor: false, sort_order: 8 },
  { business_id: '11111111-1111-1111-1111-111111111111', slug: 'combustible', name_es: 'Combustible y reparto', name_en: 'Fuel & delivery', is_cogs: false, is_labor: false, sort_order: 9 },
]

const PRICE_LISTS: RawPriceListsRow[] = [
  { id: '03000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', name: 'Mayoreo estándar', is_default: true },
]

const PRICE_LIST_ITEMS: RawPriceListItemsRow[] = [
  { price_list_id: '03000000-0000-0000-0000-000000000001', variant_id: 'd0000000-0000-0000-0000-000000000001', unit_price: 0.95, case_qty: 24, min_qty: 24 },
  { price_list_id: '03000000-0000-0000-0000-000000000001', variant_id: 'd0000000-0000-0000-0000-000000000003', unit_price: 1.2, case_qty: 24, min_qty: 24 },
  { price_list_id: '03000000-0000-0000-0000-000000000001', variant_id: 'd0000000-0000-0000-0000-000000000004', unit_price: 0.95, case_qty: 24, min_qty: 24 },
  { price_list_id: '03000000-0000-0000-0000-000000000001', variant_id: 'd0000000-0000-0000-0000-000000000023', unit_price: 8.5, case_qty: 6, min_qty: 6 },
  { price_list_id: '03000000-0000-0000-0000-000000000001', variant_id: 'd0000000-0000-0000-0000-000000000040', unit_price: 1.35, case_qty: 24, min_qty: 24 },
  { price_list_id: '03000000-0000-0000-0000-000000000001', variant_id: 'd0000000-0000-0000-0000-000000000050', unit_price: 0.8, case_qty: 36, min_qty: 36 },
]

function buildWholesaleAccounts(today: string): RawWholesaleAccountsRow[] {
  return [
    { id: '04000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', store_name: 'Tienda La Esperanza', contact_name: 'Gerente', email: 'esperanza@example.com', phone: '(804) 555-0201', street1: '1200 Hull Street', city: 'Richmond', region: 'VA', postal_code: '23224', price_list_id: '03000000-0000-0000-0000-000000000001', delivery_dow: 2, delivery_route: 'Richmond South', credit_terms_days: 14, status: 'approved', approved_at: atLocal(addDays(today, -730), '12:00') },
    { id: '04000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', store_name: 'Supermercado El Progreso', contact_name: 'Gerente', email: 'progreso@example.com', phone: '(804) 555-0202', street1: '450 Main Street', city: 'Petersburg', region: 'VA', postal_code: '23803', price_list_id: '03000000-0000-0000-0000-000000000001', delivery_dow: 4, delivery_route: 'Tri-Cities', credit_terms_days: 14, status: 'approved', approved_at: atLocal(addDays(today, -1095), '12:00') },
    { id: '04000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', store_name: 'Mercado Del Valle', contact_name: 'Gerente', email: 'delvalle@example.com', phone: '(757) 555-0203', street1: '88 Ocean Highway', city: 'Onley', region: 'VA', postal_code: '23418', price_list_id: '03000000-0000-0000-0000-000000000001', delivery_dow: 5, delivery_route: 'Eastern Shore', credit_terms_days: 21, status: 'approved', approved_at: atLocal(addDays(today, -365), '12:00') },
    { id: '04000000-0000-0000-0000-000000000004', business_id: '11111111-1111-1111-1111-111111111111', store_name: 'Carniceria Los Primos', contact_name: 'Gerente', email: 'primos@example.com', phone: '(252) 555-0204', street1: '15 Elizabeth Street', city: 'Elizabeth City', region: 'NC', postal_code: '27909', price_list_id: null, delivery_dow: null, delivery_route: null, credit_terms_days: 0, status: 'pending', approved_at: null },
  ]
}

const STANDING_ORDERS: RawStandingOrdersRow[] = [
  { id: '05000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', wholesale_account_id: '04000000-0000-0000-0000-000000000001', dow: 2 },
  { id: '05000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', wholesale_account_id: '04000000-0000-0000-0000-000000000002', dow: 4 },
]

const STANDING_ORDER_ITEMS: RawStandingOrderItemsRow[] = [
  { standing_order_id: '05000000-0000-0000-0000-000000000001', variant_id: 'd0000000-0000-0000-0000-000000000001', qty: 96 },
  { standing_order_id: '05000000-0000-0000-0000-000000000001', variant_id: 'd0000000-0000-0000-0000-000000000040', qty: 48 },
  { standing_order_id: '05000000-0000-0000-0000-000000000001', variant_id: 'd0000000-0000-0000-0000-000000000023', qty: 12 },
  { standing_order_id: '05000000-0000-0000-0000-000000000002', variant_id: 'd0000000-0000-0000-0000-000000000001', qty: 72 },
  { standing_order_id: '05000000-0000-0000-0000-000000000002', variant_id: 'd0000000-0000-0000-0000-000000000050', qty: 72 },
]

function buildCustomers(today: string): RawCustomersRow[] {
  return [
    { id: '06000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', email: 'maria@example.com', phone: '(804) 555-0301', full_name: 'María Hernández', locale: 'es', email_opt_in: true, sms_opt_in: true, sms_opt_in_at: atLocal(addDays(today, -400), '12:00'), is_vip: true, lifetime_orders: 23, lifetime_value: 1240.55 },
    { id: '06000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', email: 'james@example.com', phone: '(804) 555-0302', full_name: 'James Whitfield', locale: 'en', email_opt_in: true, sms_opt_in: false, sms_opt_in_at: null, is_vip: false, lifetime_orders: 4, lifetime_value: 89.4 },
    { id: '06000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', email: 'rosa@example.com', phone: '(804) 555-0303', full_name: 'Rosa Martínez', locale: 'es', email_opt_in: true, sms_opt_in: true, sms_opt_in_at: atLocal(addDays(today, -90), '12:00'), is_vip: false, lifetime_orders: 9, lifetime_value: 415.2 },
    { id: '06000000-0000-0000-0000-000000000004', business_id: '11111111-1111-1111-1111-111111111111', email: 'dan@example.com', phone: '(804) 555-0304', full_name: 'Danielle Cole', locale: 'en', email_opt_in: false, sms_opt_in: false, sms_opt_in_at: null, is_vip: false, lifetime_orders: 1, lifetime_value: 13.99 },
  ]
}

function buildInvoices(today: string): RawInvoicesRow[] {
  return [
    { id: '07000000-0000-0000-0000-000000000001', business_id: '11111111-1111-1111-1111-111111111111', wholesale_account_id: '04000000-0000-0000-0000-000000000001', invoice_number: 'INV-005001', status: 'paid', issue_date: addDays(today, -62), due_date: addDays(today, -48), subtotal: 486.4, tax: 0, total: 486.4, amount_paid: 486.4 },
    { id: '07000000-0000-0000-0000-000000000002', business_id: '11111111-1111-1111-1111-111111111111', wholesale_account_id: '04000000-0000-0000-0000-000000000001', invoice_number: 'INV-005002', status: 'sent', issue_date: addDays(today, -20), due_date: addDays(today, -6), subtotal: 512.75, tax: 0, total: 512.75, amount_paid: 0 },
    { id: '07000000-0000-0000-0000-000000000003', business_id: '11111111-1111-1111-1111-111111111111', wholesale_account_id: '04000000-0000-0000-0000-000000000002', invoice_number: 'INV-005003', status: 'partial', issue_date: addDays(today, -55), due_date: addDays(today, -41), subtotal: 738.2, tax: 0, total: 738.2, amount_paid: 300 },
    { id: '07000000-0000-0000-0000-000000000004', business_id: '11111111-1111-1111-1111-111111111111', wholesale_account_id: '04000000-0000-0000-0000-000000000003', invoice_number: 'INV-005004', status: 'overdue', issue_date: addDays(today, -118), due_date: addDays(today, -97), subtotal: 1042.6, tax: 0, total: 1042.6, amount_paid: 0 },
    { id: '07000000-0000-0000-0000-000000000005', business_id: '11111111-1111-1111-1111-111111111111', wholesale_account_id: '04000000-0000-0000-0000-000000000002', invoice_number: 'INV-005005', status: 'sent', issue_date: addDays(today, -5), due_date: addDays(today, 9), subtotal: 655, tax: 0, total: 655, amount_paid: 0 },
  ]
}

const INVOICE_ITEMS: RawInvoiceItemsRow[] = [
  { invoice_id: '07000000-0000-0000-0000-000000000001', description: 'Conchas — caso 24', qty: 96, unit_price: 0.95, line_total: 91.2 },
  { invoice_id: '07000000-0000-0000-0000-000000000001', description: 'Quesadilla entera', qty: 12, unit_price: 8.5, line_total: 102 },
  { invoice_id: '07000000-0000-0000-0000-000000000002', description: 'Conchas — caso 24', qty: 96, unit_price: 0.95, line_total: 91.2 },
  { invoice_id: '07000000-0000-0000-0000-000000000003', description: 'Donas — caso 36', qty: 144, unit_price: 0.8, line_total: 115.2 },
  { invoice_id: '07000000-0000-0000-0000-000000000004', description: 'Chicharrón de guayaba', qty: 96, unit_price: 1.35, line_total: 129.6 },
  { invoice_id: '07000000-0000-0000-0000-000000000005', description: 'Conchas — caso 24', qty: 72, unit_price: 0.95, line_total: 68.4 },
]

function buildInvoicePayments(today: string): RawInvoicePaymentsRow[] {
  return [
    { invoice_id: '07000000-0000-0000-0000-000000000001', amount: 486.4, method: 'check', reference: 'CK 4412', received_at: atLocal(addDays(today, -46), '12:00') },
    { invoice_id: '07000000-0000-0000-0000-000000000003', amount: 300, method: 'check', reference: 'CK 8890', received_at: atLocal(addDays(today, -30), '12:00') },
  ]
}

const ANNOUNCEMENTS: RawAnnouncementsRow[] = [
  { business_id: '11111111-1111-1111-1111-111111111111', body_es: 'Pedidos de pasteles de quinceañera: 7 días de anticipación.', body_en: 'Quinceañera cake orders: 7 days\' notice.', link_url: '/es/pasteles/quinceanera' },
]

const SETTINGS: RawSettingsRow[] = [
  { business_id: '11111111-1111-1111-1111-111111111111', key: 'deposit_policy', value: '{"cake_deposit_pct":30,"cancel_full_refund_hours":72,"cancel_partial_refund_hours":48,"partial_refund_pct":50}' },
  { business_id: '11111111-1111-1111-1111-111111111111', key: 'notifications', value: '{"reminder_email_hours":24,"reminder_sms_hours":3,"quiet_hours_start":"21:00","quiet_hours_end":"08:00"}' },
  { business_id: '11111111-1111-1111-1111-111111111111', key: 'marketplace_rates', value: '{"doordash_delivery_pct":25,"doordash_pickup_pct":15,"grubhub_pct":25,"stripe_pct":2.9,"stripe_fixed":0.30,"note":"CONFIRM against the client merchant statements"}' },
]

const INVENTORY_DRAWS: RawInventoryTransactionsRow[] = [
  { business_id: '11111111-1111-1111-1111-111111111111', location_id: '22222222-2222-2222-2222-222222222222', ingredient_id: 'e0000000-0000-0000-0000-000000000003', txn_type: 'production_draw', qty_delta: -19000, unit_cost: 0.0095, reference_type: 'seed', note: 'Week of production' },
  { business_id: '11111111-1111-1111-1111-111111111111', location_id: '22222222-2222-2222-2222-222222222222', ingredient_id: 'e0000000-0000-0000-0000-00000000000b', txn_type: 'production_draw', qty_delta: -1400, unit_cost: 0.021, reference_type: 'seed', note: 'Week of production' },
  { business_id: '11111111-1111-1111-1111-111111111111', location_id: '22222222-2222-2222-2222-222222222222', ingredient_id: 'e0000000-0000-0000-0000-000000000004', txn_type: 'production_draw', qty_delta: -740, unit_cost: 0.24, reference_type: 'seed', note: 'Week of production' },
]

export interface RawFixtures {
  businesses: RawBusinessesRow[]
  locations: RawLocationsRow[]
  opening_hours: RawOpeningHoursRow[]
  units: RawUnitsRow[]
  unit_conversions: RawUnitConversionsRow[]
  menu_categories: RawMenuCategoriesRow[]
  products: RawProductsRow[]
  product_variants: RawProductVariantsRow[]
  ingredients: RawIngredientsRow[]
  recipes: RawRecipesRow[]
  recipe_items: RawRecipeItemsRow[]
  vendors: RawVendorsRow[]
  vendor_ingredients: RawVendorIngredientsRow[]
  cake_sizes: RawCakeSizesRow[]
  cake_options: RawCakeOptionsRow[]
  lead_time_rules: RawLeadTimeRulesRow[]
  expense_categories: RawExpenseCategoriesRow[]
  price_lists: RawPriceListsRow[]
  price_list_items: RawPriceListItemsRow[]
  wholesale_accounts: RawWholesaleAccountsRow[]
  standing_orders: RawStandingOrdersRow[]
  standing_order_items: RawStandingOrderItemsRow[]
  customers: RawCustomersRow[]
  invoices: RawInvoicesRow[]
  invoice_items: RawInvoiceItemsRow[]
  invoice_payments: RawInvoicePaymentsRow[]
  announcements: RawAnnouncementsRow[]
  settings: RawSettingsRow[]
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
   The seed builds these with `insert ... select` and `do $$` blocks.
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

/** `insert into pickup_capacity_rules ... from generate_series(0,6)`, twice. */
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
  const orderId = `o0000000-0000-0000-0000-${String(seq.n).padStart(12, '0')}`
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
    if (!pv) throw new Error(`seed order references unknown variant ${line.variant_id}`)
    const p = PRODUCTS.find((x) => x.id === pv.product_id)!
    const name =
      draft.locale === 'en'
        ? `${p.name_en} — ${pv.label_en}`
        : `${p.name_es} — ${pv.label_es}`

    if (pv.track_stock) {
      const row = stock.find((s) => s.variant_id === pv.id && s.for_date === forDate)
      if (!row) throw new Error(`No bake scheduled for ${name} on ${forDate}`)
      if (row.qty_available - row.qty_reserved < line.qty) {
        throw new Error(`Only ${row.qty_available - row.qty_reserved} left of ${name}`)
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

/** The seed's `do $$` blocks: a week of pickups, then one cake order. */
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
        description: `${cat.name_en} — weekly purchase (demo)`,
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
        description: `${cat.name_en} — monthly (demo)`,
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
      id: `w0000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
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
 * `today` is a `yyyy-MM-dd` business date in America/New_York. Passing it
 * in rather than reading the clock keeps the whole set deterministic and
 * keeps "today" and "tomorrow" correct whenever the demo is opened.
 */
export function buildFixtures(today: string): RawFixtures {
  const daily_stock = dailyStock(today)
  const { orders, items, cakes } = seededOrders(today, daily_stock)
  const sales_days = salesDays(today)

  return {
    businesses: BUSINESSES,
    locations: LOCATIONS,
    opening_hours: OPENING_HOURS,
    units: UNITS,
    unit_conversions: UNIT_CONVERSIONS,
    menu_categories: MENU_CATEGORIES,
    products: PRODUCTS,
    product_variants: PRODUCT_VARIANTS,
    ingredients: INGREDIENTS,
    recipes: RECIPES,
    recipe_items: RECIPE_ITEMS,
    vendors: VENDORS,
    vendor_ingredients: VENDOR_INGREDIENTS,
    cake_sizes: CAKE_SIZES,
    cake_options: CAKE_OPTIONS,
    lead_time_rules: LEAD_TIME_RULES,
    expense_categories: EXPENSE_CATEGORIES,
    price_lists: PRICE_LISTS,
    price_list_items: PRICE_LIST_ITEMS,
    wholesale_accounts: buildWholesaleAccounts(today),
    standing_orders: STANDING_ORDERS,
    standing_order_items: STANDING_ORDER_ITEMS,
    customers: buildCustomers(today),
    invoices: buildInvoices(today),
    invoice_items: INVOICE_ITEMS,
    invoice_payments: buildInvoicePayments(today),
    announcements: ANNOUNCEMENTS,
    settings: SETTINGS,
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
