/* =====================================================================
   demoAdapter — the in-memory implementation of BakeryData.
   ---------------------------------------------------------------------
   Reads and writes the mutable store. No network, no database, no
   credentials. Every number it returns is derived the same way the SQL
   derives it: on-hand is the sum of the ledger, food cost comes from the
   ported recipe_cost(), margins are computed, never stored.

   Money crosses this boundary exactly once: the fixtures hold decimal
   dollars (numeric(12,2), as Postgres does) and everything this adapter
   returns is integer cents.
   ===================================================================== */

import { IS_DEMO } from '../is-demo'
import { store, type DemoState } from './store'
import { computeAvailability, type EngineData } from '@/lib/availability'
import {
  recipeCost,
  variantFoodCost,
  marginPct,
  roundTo,
  buildCostingBook,
  convertQty,
} from './costing'
import { toCents } from '@/lib/money'
import { businessDate, formatLocal, addBusinessDays, TZ } from '@/lib/datetime'
import { CONFIRM_WITH_CLIENT } from '@/lib/constants'
import type {
  AgingRow,
  Announcement,
  AvailabilityResult,
  BakeryData,
  Business,
  CakeOption,
  CakeOptionGroup,
  CakeSize,
  CommissionSavedRow,
  DailyStockRow,
  Expense,
  IngredientOnHand,
  Invoice,
  Kpis,
  LeadTimeRule,
  Locale,
  Location,
  LoggedMessage,
  MarginRow,
  MenuCategory,
  OpenStatus,
  Order,
  OrderFilter,
  OrderStatus,
  OrderType,
  OutboundMessage,
  Period,
  PlaceOrderInput,
  PnlRow,
  PriceListItem,
  Product,
  ProductImage,
  ProductionRow,
  PurchaseOrder,
  Recipe,
  RouteRow,
  SalesDay,
  SlotQuery,
  Variant,
  Vendor,
  WasteReason,
  WasteRow,
  WeekRow,
  WholesaleAccount,
  WholesaleStatus,
} from '../types'

/* ------------------------------------------------------------------ */
/* Guards and helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Thrown when a slot filled up between page load and submit. Carries the
 * instant so the caller can offer the nearest alternatives rather than a
 * dead end.
 */
export class SlotFullError extends Error {
  readonly code = 'SLOT_FULL'
  constructor(readonly pickupAt: string) {
    super(`Pickup slot ${pickupAt} is full`)
    this.name = 'SlotFullError'
  }
}

/**
 * One guard for the whole price book rather than 45 separate ones: the
 * client's published prices run roughly 50% of current reality and every
 * price in this build is a placeholder until re-quoted. This is what
 * blocks a production build — see CONFIRM_WITH_CLIENT.
 */
let priceBookChecked = false
function assertPriceBookIsProvisional() {
  if (priceBookChecked) return
  priceBookChecked = true
  CONFIRM_WITH_CLIENT(
    'All 45 menu prices — the client\'s published prices are roughly 50% of current reality',
    'placeholder',
  )
}

let hoursChecked = false
function assertHoursAreProvisional() {
  if (hoursChecked) return
  hoursChecked = true
  CONFIRM_WITH_CLIENT(
    'Opening hours — four published sources disagree; Google\'s set is the least-wrong default',
    'placeholder',
  )
}

const pick = <T,>(locale: Locale, es: T, en: T): T => (locale === 'en' ? en : es)

const s = (): DemoState => store.get()

/** The store, shaped for the availability engine. */
function engineDataFrom(st: DemoState): EngineData {
  return {
    sizes: st.cake_sizes.map((c) => ({
      id: c.id,
      label: c.label_es,
      servingsMin: c.servings_min,
      servingsMax: c.servings_max,
      basePriceCents: toCents(c.base_price),
      minLeadHours: c.min_lead_hours,
      maxTiers: c.max_tiers,
      sortOrder: c.sort_order,
    })),
    options: st.cake_options.map((o) => ({
      id: `${o.option_group}:${o.slug}`,
      optionGroup: o.option_group as CakeOptionGroup,
      slug: o.slug,
      label: o.label_es,
      priceDeltaCents: toCents(o.price_delta),
      extraLeadHours: o.extra_lead_hours,
      sortOrder: o.sort_order,
    })),
    rules: st.lead_time_rules.map((r, i) => ({
      id: `lead:${i}`,
      appliesTo: r.applies_to as OrderType,
      minTiers: r.min_tiers,
      minServings: r.min_servings,
      requiresFinishSlug: r.requires_finish_slug,
      minLeadHours: r.min_lead_hours,
      maxAdvanceDays: r.max_advance_days,
      priority: r.priority,
    })),
    blackoutDates: [],
    openingHours: st.opening_hours.map((h) => ({
      dow: h.dow,
      opensAt: h.opens_at,
      closesAt: h.closes_at,
    })),
    capacityRules: st.pickup_capacity_rules.map((c) => ({
      appliesTo: c.applies_to as OrderType,
      dow: c.dow,
      windowStart: c.window_start,
      windowEnd: c.window_end,
      slotMinutes: c.slot_minutes,
      maxPerSlot: c.max_per_slot,
    })),
    booked: st.orders
      .filter(
        (o) =>
          o.pickup_at &&
          !['cancelled', 'no_show', 'refunded'].includes(o.status),
      )
      .map((o) => ({ orderType: o.order_type as OrderType, pickupAt: o.pickup_at })),
  }
}

/** `HH:mm` -> minutes since midnight. */
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

/** The business date a stored UTC instant falls on, in Richmond. */
const dateOf = (iso: string) => businessDate(new Date(iso))

const dowOf = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0)

/* ------------------------------------------------------------------ */
/* Mapping raw rows -> domain types                                     */
/* ------------------------------------------------------------------ */

function toVariant(
  pv: DemoState['product_variants'][number],
  locale: Locale,
): Variant {
  return {
    id: pv.id,
    productId: pv.product_id,
    sku: pv.sku,
    label: pick(locale, pv.label_es, pv.label_en),
    priceCents: toCents(pv.price),
    isDefault: pv.is_default,
    trackStock: pv.track_stock,
    sortOrder: pv.sort_order,
  }
}

function getHeroImage(slug: string): ProductImage | null {
  const images: Record<string, ProductImage> = {
    'concha': { url: '/images/products/concha.png', alt: 'A beautiful concha sweet bread', width: 800, height: 600 },
    'pan-dulce-guayaba': { url: '/images/products/concha.png', alt: 'Guava sweet bread', width: 800, height: 600 },
    'semita': { url: '/images/products/concha.png', alt: 'Sweet yeast bread', width: 800, height: 600 },
    'marranito': { url: '/images/products/marranito.png', alt: 'Gingerbread pig cookie', width: 800, height: 600 },
    'oreja': { url: '/images/products/oreja.png', alt: 'Elephant ear pastry', width: 800, height: 600 },
    'tres-leches': { url: '/images/products/tres-leches.png', alt: 'A slice of tres leches cake', width: 800, height: 600 },
    'flan': { url: '/images/products/flan.png', alt: 'House flan', width: 800, height: 600 },
    'budin-de-pan': { url: '/images/products/flan.png', alt: 'Bread pudding', width: 800, height: 600 },
    'torta-alemana': { url: '/images/products/tres-leches.png', alt: 'Pound cake', width: 800, height: 600 },
    'quesadilla-salvadorena': { url: '/images/products/quesadilla.png', alt: 'Salvadoran cheese bread', width: 800, height: 600 },
    'pan-queso': { url: '/images/products/pan-queso.png', alt: 'Cheese bread', width: 800, height: 600 },
    'pan-jalapeno': { url: '/images/products/pan-jalapeno.png', alt: 'Jalapeno cheese bread', width: 800, height: 600 },
    'chicharron-guayaba': { url: '/images/products/chicharron-guayaba.png', alt: 'Guava puff pastry', width: 800, height: 600 },
    'quesito': { url: '/images/products/chicharron-guayaba.png', alt: 'Puerto Rican cheese puff', width: 800, height: 600 },
    'dona': { url: '/images/products/dona.png', alt: 'Donut', width: 800, height: 600 },
    'churro': { url: '/images/products/churros.png', alt: 'Churros standing upright', width: 800, height: 600 },
    'polvoron': { url: '/images/products/polvoron.png', alt: 'Mexican shortbread cookie', width: 800, height: 600 },
  }
  return images[slug] || { url: '/images/products/concha.png', alt: 'Fresh bakery item', width: 800, height: 600 }
}

function toProduct(
  st: DemoState,
  p: DemoState['products'][number],
  locale: Locale,
): Product {
  const category = st.menu_categories.find((c) => c.id === p.category_id)
  const variants = st.product_variants
    .filter((v) => v.product_id === p.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((v) => toVariant(v, locale))

  return {
    id: p.id,
    categoryId: p.category_id,
    categorySlug: category?.slug ?? '',
    slug: p.slug,
    nameEs: p.name_es,
    nameEn: p.name_en,
    name: pick(locale, p.name_es, p.name_en),
    description: pick(locale, p.description_es, p.description_en),
    heroImage: getHeroImage(p.slug),
    // Empty until the client provides them in writing. Never inferred.
    dietaryTags: [],
    is86ed: st.eightySixed.has(p.id),
    availableFrom: p.available_from,
    availableTo: null,
    sortOrder: p.sort_order,
    variants,
  }
}

function toCategory(
  st: DemoState,
  c: DemoState['menu_categories'][number],
  locale: Locale,
): MenuCategory {
  return {
    id: c.id,
    slug: c.slug,
    name: pick(locale, c.name_es, c.name_en),
    description: null,
    sortOrder: c.sort_order,
    products: st.products
      .filter((p) => p.category_id === c.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => toProduct(st, p, locale)),
  }
}

function toOrder(st: DemoState, o: DemoState['orders'][number]): Order {
  return {
    id: o.id,
    orderNumber: o.order_number,
    orderType: o.order_type as Order['orderType'],
    status: o.status as OrderStatus,
    source: o.source as Order['source'],
    contactName: o.contact_name,
    contactPhone: o.contact_phone,
    contactEmail: o.contact_email,
    locale: (o.locale === 'en' ? 'en' : 'es') as Locale,
    pickupAt: o.pickup_at,
    subtotalCents: toCents(o.subtotal),
    discountCents: toCents(o.discount),
    taxCents: toCents(o.tax),
    totalCents: toCents(o.total),
    depositDueCents: toCents(o.deposit_due),
    amountPaidCents: toCents(o.amount_paid),
    occasion: o.occasion,
    customerNote: o.customer_note,
    allergyNote: o.allergy_note,
    createdAt: o.created_at,
    // Consent travels with the order. Absent means never text.
    smsOptInAt: (o as { sms_opt_in_at?: string | null }).sms_opt_in_at ?? null,
    confirmedAt: o.confirmed_at,
    readyAt: o.ready_at,
    completedAt: o.completed_at,
    items: st.order_items
      .filter((i) => i.order_id === o.id)
      .map((i, idx) => ({
        id: `${o.id}:${idx}`,
        variantId: i.variant_id,
        nameSnapshot: i.name_snapshot,
        qty: i.qty,
        unitPriceCents: toCents(i.unit_price),
        lineTotalCents: toCents(i.line_total),
        note: i.note,
      })),
  }
}

/* ------------------------------------------------------------------ */
/* The adapter                                                          */
/* ------------------------------------------------------------------ */

export const demoAdapter: BakeryData = {
  /* ---------------- Menu ---------------- */

  async getMenu(locale) {
    assertPriceBookIsProvisional()
    const st = s()
    return st.menu_categories
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => toCategory(st, c, locale))
  },

  async getCategory(slug, locale) {
    assertPriceBookIsProvisional()
    const st = s()
    const c = st.menu_categories.find((x) => x.slug === slug)
    return c ? toCategory(st, c, locale) : null
  },

  async getProduct(slug, locale) {
    assertPriceBookIsProvisional()
    const st = s()
    const p = st.products.find((x) => x.slug === slug)
    return p ? toProduct(st, p, locale) : null
  },

  async setEightySixed(productId, value) {
    store.mutate((st) => {
      if (value) st.eightySixed.add(productId)
      else st.eightySixed.delete(productId)
    })
  },

  /* ---------------- Business, hours ---------------- */

  async getSettings(key) {
    const row = s().settings.find((x) => x.key === key)
    return row ? (JSON.parse(row.value) as Record<string, unknown>) : null
  },

  async getBusiness(): Promise<Business> {
    const b = s().businesses[0]
    return {
      id: b.id,
      legalName: b.legal_name,
      dbaName: b.dba_name,
      slug: b.slug,
      timezone: b.timezone,
      defaultLocale: b.default_locale as Locale,
      supportedLocales: ['es', 'en'],
      currency: 'USD',
      taxRate: b.tax_rate,
    }
  },

  async getLocation(): Promise<Location> {
    const l = s().locations[0]
    return {
      id: l.id,
      businessId: l.business_id,
      name: l.name,
      street1: l.street1,
      street2: l.street2,
      city: l.city,
      region: l.region,
      postalCode: l.postal_code,
      country: 'US',
      phonePrimary: l.phone_primary,
      phoneSecondary: l.phone_secondary,
      email: l.email,
      latitude: l.latitude,
      longitude: l.longitude,
      googlePlaceId: null,
    }
  },

  async getWeekHours(): Promise<WeekRow[]> {
    assertHoursAreProvisional()
    return s()
      .opening_hours.map((h) => ({
        dow: h.dow,
        opensAt: h.opens_at.slice(0, 5),
        closesAt: h.closes_at.slice(0, 5),
        // Four sources disagree. Nothing here ships without confirmation.
        isProvisional: true,
      }))
      .sort((a, b) => a.dow - b.dow)
  },

  async getTodayStatus(now): Promise<OpenStatus> {
    assertHoursAreProvisional()
    const st = s()
    const date = businessDate(now)
    const nowMins = mins(formatLocal(now, 'HH:mm'))
    const todayRow = st.opening_hours.find((h) => h.dow === dowOf(date))

    if (todayRow && nowMins >= mins(todayRow.opens_at) && nowMins < mins(todayRow.closes_at)) {
      return {
        isOpen: true,
        closesAt: todayRow.closes_at.slice(0, 5),
        opensAt: null,
        opensOn: null,
        isProvisional: true,
      }
    }

    // Not open now — find the next opening, today or on a later day.
    if (todayRow && nowMins < mins(todayRow.opens_at)) {
      return {
        isOpen: false,
        closesAt: null,
        opensAt: todayRow.opens_at.slice(0, 5),
        opensOn: date,
        isProvisional: true,
      }
    }
    for (let i = 1; i <= 7; i++) {
      const d = addBusinessDays(date, i)
      const row = st.opening_hours.find((h) => h.dow === dowOf(d))
      if (row) {
        return {
          isOpen: false,
          closesAt: null,
          opensAt: row.opens_at.slice(0, 5),
          opensOn: d,
          isProvisional: true,
        }
      }
    }
    return { isOpen: false, closesAt: null, opensAt: null, opensOn: null, isProvisional: true }
  },

  async getAnnouncement(locale): Promise<Announcement | null> {
    const a = s().announcements[0]
    if (!a) return null
    return {
      id: `${a.business_id}:announcement`,
      body: pick(locale, a.body_es, a.body_en),
      linkUrl: a.link_url,
    }
  },

  /* ---------------- Cakes ---------------- */

  async getCakeSizes(): Promise<CakeSize[]> {
    assertPriceBookIsProvisional()
    return s()
      .cake_sizes.map((c) => ({
        id: c.id,
        label: c.label_es,
        servingsMin: c.servings_min,
        servingsMax: c.servings_max,
        basePriceCents: toCents(c.base_price),
        minLeadHours: c.min_lead_hours,
        maxTiers: c.max_tiers,
        sortOrder: c.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },

  async getCakeOptions(): Promise<CakeOption[]> {
    assertPriceBookIsProvisional()
    return s()
      .cake_options.map((o) => ({
        id: `${o.option_group}:${o.slug}`,
        optionGroup: o.option_group as CakeOptionGroup,
        slug: o.slug,
        label: o.label_es,
        priceDeltaCents: toCents(o.price_delta),
        extraLeadHours: o.extra_lead_hours,
        sortOrder: o.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },

  async getLeadTimeRules(): Promise<LeadTimeRule[]> {
    return s()
      .lead_time_rules.map((r, i) => ({
        id: `lead:${i}`,
        appliesTo: r.applies_to as LeadTimeRule['appliesTo'],
        minTiers: r.min_tiers,
        minServings: r.min_servings,
        requiresFinishSlug: r.requires_finish_slug,
        minLeadHours: r.min_lead_hours,
        maxAdvanceDays: r.max_advance_days,
        priority: r.priority,
      }))
      .sort((a, b) => b.priority - a.priority)
  },

  async getBlackoutDates() {
    // The seed carries none. The table exists and the engine honours it.
    return []
  },

  /**
   * Delegates to the shared engine in `src/lib/availability.ts`.
   *
   * The engine is a pure function over data, so the Supabase adapter will
   * call it with exactly the same shapes and produce exactly the same
   * answers — including across both DST Sundays.
   */
  async getAvailability(q: SlotQuery): Promise<AvailabilityResult> {
    return computeAvailability(engineDataFrom(s()), q)
  },

  /* ---------------- Orders ---------------- */

  /**
   * The demo-mode stand-in for the place_order() RPC. Same guarantees, in
   * one synchronous mutation: stock is checked and reserved together, never
   * checked-then-inserted. Variants are handled in ascending id order for
   * the same reason the SQL does it.
   */
  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    assertPriceBookIsProvisional()
    let placed: Order | null = null

    store.mutate((st) => {
      if (!input.items.length) throw new Error('Order must contain at least one item')

      /*
       * claim_pickup_slot(), demo edition.
       *
       * The SQL takes a transaction-scoped advisory lock, counts, and
       * inserts — all in one transaction, because checking first and
       * inserting later is exactly the bug that oversells a slot. Here
       * the equivalent guarantee comes from doing it inside a single
       * synchronous `store.mutate`: nothing else can interleave, so the
       * count and the insert cannot be split by another caller.
       */
      const capacity = st.pickup_capacity_rules.find(
        (c) => c.applies_to === input.orderType && c.dow === dowOf(dateOf(input.pickupAt)),
      )
      if (capacity) {
        const slotStart = new Date(input.pickupAt).getTime()
        const slotEnd = slotStart + capacity.slot_minutes * 60_000
        const taken = st.orders.filter(
          (o) =>
            o.order_type === input.orderType &&
            o.pickup_at &&
            !['cancelled', 'no_show', 'refunded'].includes(o.status) &&
            new Date(o.pickup_at).getTime() >= slotStart &&
            new Date(o.pickup_at).getTime() < slotEnd,
        ).length

        if (taken >= capacity.max_per_slot) {
          throw new SlotFullError(input.pickupAt)
        }
      }

      const forDate = dateOf(input.pickupAt)
      const seq = 1000 + st.orders.length + 1
      const orderId = `n0000000-0000-0000-0000-${String(seq).padStart(12, '0')}`
      const orderNumber = 'LS-' + String(seq).padStart(6, '0')

      const lines = [...input.items].sort((a, b) => a.variantId.localeCompare(b.variantId))
      let subtotal = 0

      for (const line of lines) {
        const pv = st.product_variants.find((v) => v.id === line.variantId)
        if (!pv) throw new Error(`Variant ${line.variantId} is not available for sale`)
        const p = st.products.find((x) => x.id === pv.product_id)!
        const name =
          input.locale === 'en'
            ? `${p.name_en} — ${pv.label_en}`
            : `${p.name_es} — ${pv.label_es}`

        if (st.eightySixed.has(p.id)) throw new Error(`Item is 86ed: ${name}`)
        if (line.qty <= 0) throw new Error(`Invalid quantity for variant ${line.variantId}`)

        if (pv.track_stock) {
          const row = st.daily_stock.find(
            (x) => x.variant_id === pv.id && x.for_date === forDate,
          )
          if (!row) throw new Error(`No bake scheduled for ${name} on ${forDate}`)
          if (row.qty_available - row.qty_reserved < line.qty) {
            throw new Error(`Only ${row.qty_available - row.qty_reserved} left of ${name}`)
          }
          row.qty_reserved += line.qty
        }

        const lineTotal = roundTo(line.qty * pv.price, 2)
        st.order_items.push({
          order_id: orderId,
          variant_id: pv.id,
          name_snapshot: name,
          qty: line.qty,
          unit_price: pv.price,
          line_total: lineTotal,
          note: line.note ?? null,
        })
        subtotal = roundTo(subtotal + lineTotal, 2)
      }

      const tax = roundTo(subtotal * st.businesses[0].tax_rate, 2)
      const row: DemoState['orders'][number] = {
        id: orderId,
        order_number: orderNumber,
        order_type: input.orderType,
        // Nothing is confirmed before payment clears. The demo pay page
        // is what advances this to `confirmed`.
        status: 'pending_payment',
        source: input.source ?? 'web',
        customer_id: null,
        contact_name: input.contactName,
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail ?? null,
        locale: input.locale,
        pickup_at: input.pickupAt,
        subtotal,
        discount: 0,
        tax,
        total: roundTo(subtotal + tax, 2),
        deposit_due: 0,
        amount_paid: 0,
        occasion: input.occasion ?? null,
        customer_note: input.customerNote ?? null,
        allergy_note: input.allergyNote ?? null,
        created_at: new Date().toISOString(),
        sms_opt_in_at: input.smsOptInAt ?? null,
        confirmed_at: null,
        ready_at: null,
        completed_at: null,
      }
      st.orders.push(row)
      placed = toOrder(st, row)
    })

    if (!placed) throw new Error('Order was not placed')
    return placed
  },

  async getOrder(id) {
    const st = s()
    const o = st.orders.find((x) => x.id === id)
    return o ? toOrder(st, o) : null
  },

  /**
   * Guest lookup. In production this is `get_order_by_token()` against a
   * SHA-256 hash and nothing else. In demo mode there is no token table,
   * so the order number stands in.
   *
   * That substitution is an ENUMERABLE IDENTIFIER: order numbers run
   * LS-001000, LS-001001, LS-001002. Anyone could walk the sequence and
   * read every customer's name, phone, address and allergy notes. It is
   * acceptable only because this adapter holds fixtures and runs on one
   * laptop with no network.
   *
   * The guard below is what stops it from ever meaning anything else. If
   * a build somehow reaches this adapter without demo mode set, it throws
   * rather than serving a guessable lookup against real customer data.
   */
  async getOrderByToken(token) {
    if (!IS_DEMO) {
      throw new Error(
        'getOrderByToken: the demo adapter matches on order number, which is ' +
          'enumerable. It must never run outside demo mode — use the Supabase ' +
          'adapter, which resolves a SHA-256 hashed token through ' +
          'get_order_by_token(). See PROMPT-02.',
      )
    }
    const st = s()
    const needle = token.trim().toUpperCase()
    const o = st.orders.find(
      (x) => x.order_number.toUpperCase() === needle || x.id === token,
    )
    return o ? toOrder(st, o) : null
  },

  async listOrders(filter: OrderFilter) {
    const st = s()
    let rows = st.orders.slice()

    if (filter.status?.length) rows = rows.filter((o) => filter.status!.includes(o.status as OrderStatus))
    if (filter.orderType?.length) rows = rows.filter((o) => filter.orderType!.includes(o.order_type as Order['orderType']))
    if (filter.date) rows = rows.filter((o) => o.pickup_at && dateOf(o.pickup_at) === filter.date)
    if (filter.from) rows = rows.filter((o) => o.pickup_at && dateOf(o.pickup_at) >= filter.from!)
    if (filter.to) rows = rows.filter((o) => o.pickup_at && dateOf(o.pickup_at) <= filter.to!)

    rows.sort((a, b) => (a.pickup_at ?? '').localeCompare(b.pickup_at ?? ''))
    if (filter.limit) rows = rows.slice(0, filter.limit)

    return rows.map((o) => toOrder(st, o))
  },

  async setOrderStatus(id, status) {
    let updated: Order | null = null
    store.mutate((st) => {
      const o = st.orders.find((x) => x.id === id)
      if (!o) throw new Error(`Unknown order ${id}`)
      const now = new Date().toISOString()
      o.status = status
      if (status === 'confirmed' && !o.confirmed_at) o.confirmed_at = now
      if (status === 'ready') o.ready_at = now
      if (status === 'completed') o.completed_at = now
      if (status === 'cancelled') {
        // release_order_stock(): a cancelled order gives its reservation back.
        const forDate = o.pickup_at ? dateOf(o.pickup_at) : null
        if (forDate) {
          for (const item of st.order_items.filter((i) => i.order_id === o.id)) {
            const row = st.daily_stock.find(
              (x) => x.variant_id === item.variant_id && x.for_date === forDate,
            )
            if (row) row.qty_reserved = Math.max(row.qty_reserved - item.qty, 0)
          }
        }
      }
      updated = toOrder(st, o)
    })
    if (!updated) throw new Error(`Unknown order ${id}`)
    return updated
  },

  async setCakeOrderPricing(id, detail) {
    let updated: Order | null = null
    store.mutate((st) => {
      const o = st.orders.find((x) => x.id === id)
      if (!o) throw new Error(`Unknown order ${id}`)

      // Money comes back in cents and lands as decimal dollars, matching
      // numeric(12,2). The configurator's own number never gets here.
      o.subtotal = detail.subtotalCents / 100
      o.tax = detail.taxCents / 100
      o.total = detail.totalCents / 100
      o.deposit_due = detail.depositDueCents / 100

      st.cake_order_details.push({
        order_id: id,
        size_id: detail.sizeId,
        tiers: detail.tiers,
        inscription: detail.inscription,
        inscription_lang: detail.inscriptionLang,
        color_notes: detail.colorNotes,
        serves_estimate: detail.servesEstimate,
      })

      updated = toOrder(st, o)
    })
    if (!updated) throw new Error(`Unknown order ${id}`)
    return updated
  },

  async getDailyStock(date): Promise<DailyStockRow[]> {
    const st = s()
    return st.daily_stock
      .filter((x) => x.for_date === date)
      .map((x) => {
        const pv = st.product_variants.find((v) => v.id === x.variant_id)!
        const p = st.products.find((y) => y.id === pv.product_id)!
        return {
          variantId: x.variant_id,
          sku: pv.sku,
          name: `${p.name_es} — ${pv.label_es}`,
          forDate: x.for_date,
          qtyAvailable: x.qty_available,
          qtyReserved: x.qty_reserved,
          qtyRemaining: x.qty_available - x.qty_reserved,
        }
      })
      .sort((a, b) => a.sku.localeCompare(b.sku))
  },

  /* ---------------- Bakery OS ---------------- */

  async getIngredients(): Promise<IngredientOnHand[]> {
    const st = s()
    return st.ingredients.map((i) => {
      // On-hand is never a stored column — always the sum of the ledger.
      const onHand = sum(
        st.inventory_transactions.filter((t) => t.ingredient_id === i.id).map((t) => t.qty_delta),
      )
      const unit = st.units.find((u) => u.id === i.stock_unit_id)!
      return {
        id: i.id,
        sku: i.sku,
        name: i.name_es,
        stockUnitCode: unit.code,
        lastUnitCost: i.last_unit_cost,
        onHand: roundTo(onHand, 4),
        reorderPoint: i.reorder_point,
        parLevel: i.par_level,
        isBelowReorder: onHand <= i.reorder_point,
        isPerishable: i.is_perishable,
      }
    })
  },

  async getRecipes(): Promise<Recipe[]> {
    const st = s()
    return st.recipes.map((r) => {
      const yieldUnit = st.units.find((u) => u.id === r.yield_unit_id)!
      return {
        id: r.id,
        variantId: r.variant_id,
        name: r.name_es,
        yieldQty: r.yield_qty,
        yieldUnitId: r.yield_unit_id,
        yieldUnitCode: yieldUnit.code,
        laborMinutes: r.labor_minutes,
        items: st.recipe_items
          .filter((ri) => ri.recipe_id === r.id)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((ri) => {
            const unit = st.units.find((u) => u.id === ri.unit_id)!
            const name = ri.ingredient_id
              ? (st.ingredients.find((i) => i.id === ri.ingredient_id)?.name_es ?? '')
              : (st.recipes.find((x) => x.id === ri.sub_recipe_id)?.name_es ?? '')
            return {
              ingredientId: ri.ingredient_id,
              subRecipeId: ri.sub_recipe_id,
              name,
              qty: ri.qty,
              unitId: ri.unit_id,
              unitCode: unit.code,
              sortOrder: ri.sort_order,
            }
          }),
      }
    })
  },

  async getRecipeCost(recipeId) {
    return recipeCost(s().costing, recipeId)
  },

  async getRecipeLineCosts(recipeId) {
    const st = s()
    const book = st.costing
    const recipe = st.recipes.find((r) => r.id === recipeId)
    if (!recipe) return []

    return st.recipe_items
      .filter((ri) => ri.recipe_id === recipeId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((ri) => {
        const unit = st.units.find((u) => u.id === ri.unit_id)!

        if (ri.sub_recipe_id) {
          // (sub batch cost / sub yield) x qty — the division by the
          // sub's own yield is what makes the sugar shell contribute
          // 3.152 rather than its whole 3.94 batch.
          const sub = st.recipes.find((r) => r.id === ri.sub_recipe_id)!
          const subBatch = recipeCost(book, ri.sub_recipe_id)
          return {
            name: sub.name_es,
            qty: ri.qty,
            unitCode: unit.code,
            costDollars: (subBatch / sub.yield_qty) * ri.qty,
            isSubRecipe: true,
          }
        }

        const ing = st.ingredients.find((i) => i.id === ri.ingredient_id)!
        return {
          name: ing.name_es,
          qty: ri.qty,
          unitCode: unit.code,
          // The engine's own conversion — never a factor hard-coded here.
          costDollars:
            convertQty(book, ri.qty, ri.unit_id, ing.stock_unit_id) * ing.last_unit_cost,
          isSubRecipe: false,
        }
      })
  },

  async getVariantFoodCost(variantId) {
    return variantFoodCost(s().costing, variantId)
  },

  async getMarginTable(): Promise<MarginRow[]> {
    assertPriceBookIsProvisional()
    const st = s()
    return st.product_variants
      .map((pv) => {
        const p = st.products.find((x) => x.id === pv.product_id)!
        const priceCents = toCents(pv.price)
        const foodCost = variantFoodCost(st.costing, pv.id)
        return {
          variantId: pv.id,
          sku: pv.sku,
          name: `${p.name_es} — ${pv.label_es}`,
          priceCents,
          foodCost,
          marginPct: marginPct(priceCents, foodCost),
          // Every price in this build is a placeholder until re-quoted.
          isPriceProvisional: true,
        }
      })
      .sort((a, b) => a.sku.localeCompare(b.sku))
  },

  async getVariantVolume(from, to) {
    const st = s()
    const volume: Record<string, number> = {}
    for (const o of st.orders) {
      if (!o.pickup_at) continue
      const d = dateOf(o.pickup_at)
      if (d < from || d > to) continue
      if (['cancelled', 'no_show', 'refunded', 'draft'].includes(o.status)) continue
      for (const item of st.order_items.filter((i) => i.order_id === o.id)) {
        volume[item.variant_id] = (volume[item.variant_id] ?? 0) + item.qty
      }
    }
    return volume
  },

  /**
   * A simulation NEVER writes.
   *
   * The costing book is rebuilt from a structuredClone of the fixtures,
   * the hypothetical ingredient costs are applied to that copy, and the
   * copy is thrown away when this returns. `store` is not touched — the
   * production equivalent is a transaction that reads and rolls back.
   */
  async simulate(input) {
    const st = s()

    const hypothetical = structuredClone({
      unit_conversions: st.unit_conversions,
      ingredients: st.ingredients,
      recipes: st.recipes,
      recipe_items: st.recipe_items,
    }) as Pick<DemoState, 'unit_conversions' | 'ingredients' | 'recipes' | 'recipe_items'>

    for (const [ingredientId, pct] of Object.entries(input.ingredientDeltaPct ?? {})) {
      const ing = hypothetical.ingredients.find((i) => i.id === ingredientId)
      if (ing) ing.last_unit_cost = roundTo(ing.last_unit_cost * (1 + pct / 100), 4)
    }

    const book = buildCostingBook(hypothetical as unknown as Parameters<typeof buildCostingBook>[0])

    return st.product_variants
      .map((pv) => {
        const p = st.products.find((x) => x.id === pv.product_id)!
        const priceCents = input.priceCents?.[pv.id] ?? toCents(pv.price)
        const foodCost = variantFoodCost(book, pv.id)
        return {
          variantId: pv.id,
          sku: pv.sku,
          name: `${p.name_es} — ${pv.label_es}`,
          priceCents,
          foodCost,
          marginPct: marginPct(priceCents, foodCost),
          isPriceProvisional: true,
        }
      })
      .sort((a, b) => a.sku.localeCompare(b.sku))
  },

  async getProductionPlan(date): Promise<ProductionRow[]> {
    const st = s()
    const need = new Map<string, number>()

    for (const o of st.orders) {
      if (!o.pickup_at || dateOf(o.pickup_at) !== date) continue
      if (o.status === 'cancelled' || o.status === 'draft') continue
      for (const item of st.order_items.filter((i) => i.order_id === o.id)) {
        need.set(item.variant_id, (need.get(item.variant_id) ?? 0) + item.qty)
      }
    }

    // Standing wholesale orders for that weekday are demand too.
    const dow = dowOf(date)
    for (const so of st.standing_orders.filter((x) => x.dow === dow)) {
      for (const item of st.standing_order_items.filter((x) => x.standing_order_id === so.id)) {
        need.set(item.variant_id, (need.get(item.variant_id) ?? 0) + item.qty)
      }
    }

    return [...need.entries()]
      .map(([variantId, qtyNeeded]) => {
        const pv = st.product_variants.find((v) => v.id === variantId)!
        const p = st.products.find((x) => x.id === pv.product_id)!
        const stock = st.daily_stock.find(
          (x) => x.variant_id === variantId && x.for_date === date,
        )
        return {
          variantId,
          sku: pv.sku,
          name: `${p.name_es} — ${pv.label_es}`,
          qtyNeeded,
          qtyPlanned: stock?.qty_available ?? 0,
          qtyProduced: 0,
          recipeId: st.recipes.find((r) => r.variant_id === variantId)?.id ?? null,
        }
      })
      .sort((a, b) => b.qtyNeeded - a.qtyNeeded)
  },

  async getVendors(): Promise<Vendor[]> {
    return s().vendors.map((v) => ({
      id: v.id,
      name: v.name,
      contactName: v.contact_name,
      phone: v.phone,
      email: null,
      leadTimeDays: v.lead_time_days,
      minOrderCents: toCents(v.min_order),
    }))
  },

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    // The seed carries none; PROMPT-10 raises the first one from par levels.
    return []
  },

  async getWasteLog(from, to): Promise<WasteRow[]> {
    const st = s()
    return st.waste_log
      .filter((w) => {
        const d = dateOf(w.occurred_at)
        return d >= from && d <= to
      })
      .map((w) => {
        const pv = st.product_variants.find((v) => v.id === w.variant_id)
        const p = pv ? st.products.find((x) => x.id === pv.product_id) : undefined
        const unit = st.units.find((u) => u.id === w.unit_id)
        return {
          id: w.id,
          variantId: w.variant_id,
          ingredientId: w.ingredient_id,
          name: p && pv ? `${p.name_es} — ${pv.label_es}` : '—',
          qty: w.qty,
          unitCode: unit?.code ?? null,
          reason: w.reason as WasteReason,
          estValueCents: toCents(w.est_value),
          occurredAt: w.occurred_at,
        }
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  },

  async getSalesDays(from, to): Promise<SalesDay[]> {
    return s()
      .sales_days.filter((d) => d.business_date >= from && d.business_date <= to)
      .map((d) => ({
        businessDate: d.business_date,
        grossSalesCents: toCents(d.gross_sales),
        taxCollectedCents: toCents(d.tax_collected),
        cashExpectedCents: toCents(d.cash_expected),
        cashCountedCents: toCents(d.cash_counted),
        cardTotalCents: toCents(d.card_total),
        onlineTotalCents: toCents(d.online_total),
        wholesaleTotalCents: toCents(d.wholesale_total),
        marketplaceTotalCents: toCents(d.marketplace_total),
        marketplaceFeesCents: toCents(d.marketplace_fees),
        transactionCount: d.transaction_count,
      }))
      .sort((a, b) => a.businessDate.localeCompare(b.businessDate))
  },

  async getExpenses(from, to): Promise<Expense[]> {
    const st = s()
    return st.expenses
      .filter((e) => e.spent_on >= from && e.spent_on <= to)
      .map((e, i) => {
        const cat = st.expense_categories.find((c) => c.slug === e.category_slug)!
        return {
          id: `exp:${i}`,
          categorySlug: e.category_slug,
          categoryName: cat.name_es,
          isCogs: cat.is_cogs,
          isLabor: cat.is_labor,
          spentOn: e.spent_on,
          amountCents: toCents(e.amount),
          method: e.method as Expense['method'],
          description: e.description,
        }
      })
      .sort((a, b) => a.spentOn.localeCompare(b.spentOn))
  },

  async getPnl(months): Promise<PnlRow[]> {
    const st = s()
    const from = `${addBusinessDays(st.today, -months * 31).slice(0, 7)}-01`

    const acc = new Map<string, PnlRow>()
    const row = (month: string) => {
      let r = acc.get(month)
      if (!r) {
        r = {
          month,
          revenueCents: 0,
          cogsCents: 0,
          laborCents: 0,
          overheadCents: 0,
          grossProfitCents: 0,
          netProfitCents: 0,
          foodCostPct: 0,
          laborPct: 0,
          netMarginPct: 0,
        }
        acc.set(month, r)
      }
      return r
    }

    for (const d of st.sales_days) {
      if (d.business_date < from) continue
      row(d.business_date.slice(0, 7)).revenueCents += toCents(d.gross_sales)
    }
    for (const e of st.expenses) {
      if (e.spent_on < from) continue
      const cat = st.expense_categories.find((c) => c.slug === e.category_slug)!
      const r = row(e.spent_on.slice(0, 7))
      const cents = toCents(e.amount)
      if (cat.is_cogs) r.cogsCents += cents
      else if (cat.is_labor) r.laborCents += cents
      else r.overheadCents += cents
    }

    return [...acc.values()]
      .map((r) => {
        r.grossProfitCents = r.revenueCents - r.cogsCents
        r.netProfitCents = r.revenueCents - r.cogsCents - r.laborCents - r.overheadCents
        const rev = r.revenueCents || 1
        r.foodCostPct = roundTo((r.cogsCents / rev) * 100, 2)
        r.laborPct = roundTo((r.laborCents / rev) * 100, 2)
        r.netMarginPct = roundTo((r.netProfitCents / rev) * 100, 2)
        return r
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-months)
  },

  async getCommissionSaved(): Promise<CommissionSavedRow[]> {
    const st = s()
    const rates = JSON.parse(
      st.settings.find((x) => x.key === 'marketplace_rates')!.value,
    ) as { stripe_pct: number; stripe_fixed: number }

    const acc = new Map<string, { sales: number; fees: number; txns: number }>()
    for (const d of st.sales_days) {
      const m = d.business_date.slice(0, 7)
      const cur = acc.get(m) ?? { sales: 0, fees: 0, txns: 0 }
      cur.sales += toCents(d.marketplace_total)
      cur.fees += toCents(d.marketplace_fees)
      cur.txns += d.transaction_count
      acc.set(m, cur)
    }

    return [...acc.entries()]
      .map(([month, v]) => {
        // Same volume, taken through our own checkout instead.
        const ownChannelFeesCents = Math.round(
          v.sales * (rates.stripe_pct / 100) + v.txns * toCents(rates.stripe_fixed),
        )
        return {
          month,
          marketplaceSalesCents: v.sales,
          marketplaceFeesCents: v.fees,
          ownChannelFeesCents,
          savedCents: v.fees - ownChannelFeesCents,
        }
      })
      .sort((a, b) => a.month.localeCompare(b.month))
  },

  async getKpis(period: Period): Promise<Kpis> {
    const st = s()
    const to = addBusinessDays(st.today, -1)
    const spanDays: Record<Period, number> = {
      today: 1,
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    }
    const from = addBusinessDays(to, -(spanDays[period] - 1))

    const sales = st.sales_days.filter((d) => d.business_date >= from && d.business_date <= to)
    const revenueCents = sum(sales.map((d) => toCents(d.gross_sales)))
    const orderCount = sum(sales.map((d) => d.transaction_count))

    const expenses = st.expenses.filter((e) => e.spent_on >= from && e.spent_on <= to)
    const cogs = sum(
      expenses
        .filter((e) => st.expense_categories.find((c) => c.slug === e.category_slug)!.is_cogs)
        .map((e) => toCents(e.amount)),
    )
    const labor = sum(
      expenses
        .filter((e) => st.expense_categories.find((c) => c.slug === e.category_slug)!.is_labor)
        .map((e) => toCents(e.amount)),
    )
    const waste = sum(
      st.waste_log
        .filter((w) => {
          const d = dateOf(w.occurred_at)
          return d >= from && d <= to
        })
        .map((w) => toCents(w.est_value)),
    )
    const wholesale = sum(sales.map((d) => toCents(d.wholesale_total)))
    const rev = revenueCents || 1

    return {
      period,
      from,
      to,
      revenueCents,
      orderCount,
      averageTicketCents: orderCount ? Math.round(revenueCents / orderCount) : 0,
      foodCostPct: roundTo((cogs / rev) * 100, 2),
      laborPct: roundTo((labor / rev) * 100, 2),
      wasteCents: waste,
      wholesaleSharePct: roundTo((wholesale / rev) * 100, 2),
    }
  },

  /* ---------------- Wholesale ---------------- */

  async getWholesaleAccounts(): Promise<WholesaleAccount[]> {
    return s().wholesale_accounts.map((a) => ({
      id: a.id,
      storeName: a.store_name,
      contactName: a.contact_name,
      email: a.email,
      phone: a.phone,
      city: a.city,
      region: a.region,
      deliveryDow: a.delivery_dow,
      deliveryRoute: a.delivery_route,
      creditTermsDays: a.credit_terms_days,
      status: a.status as WholesaleStatus,
      priceListId: a.price_list_id,
      approvedAt: a.approved_at,
    }))
  },

  async getPriceList(accountId): Promise<PriceListItem[]> {
    assertPriceBookIsProvisional()
    const st = s()
    const account = st.wholesale_accounts.find((a) => a.id === accountId)
    const listId =
      account?.price_list_id ?? st.price_lists.find((l) => l.is_default)?.id ?? null
    if (!listId) return []

    return st.price_list_items
      .filter((i) => i.price_list_id === listId)
      .map((i) => {
        const pv = st.product_variants.find((v) => v.id === i.variant_id)!
        const p = st.products.find((x) => x.id === pv.product_id)!
        return {
          variantId: i.variant_id,
          sku: pv.sku,
          name: `${p.name_es} — ${pv.label_es}`,
          unitPriceCents: toCents(i.unit_price),
          caseQty: i.case_qty,
          minQty: i.min_qty,
          retailPriceCents: toCents(pv.price),
        }
      })
      .sort((a, b) => a.sku.localeCompare(b.sku))
  },

  async getInvoices(): Promise<Invoice[]> {
    const st = s()
    return st.invoices
      .map((i) => {
        const account = st.wholesale_accounts.find((a) => a.id === i.wholesale_account_id)!
        return {
          id: i.id,
          wholesaleAccountId: i.wholesale_account_id,
          storeName: account.store_name,
          invoiceNumber: i.invoice_number,
          status: i.status as Invoice['status'],
          issueDate: i.issue_date,
          dueDate: i.due_date,
          subtotalCents: toCents(i.subtotal),
          taxCents: toCents(i.tax),
          totalCents: toCents(i.total),
          amountPaidCents: toCents(i.amount_paid),
          balanceCents: toCents(i.total) - toCents(i.amount_paid),
        }
      })
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  },

  async getAging(): Promise<AgingRow[]> {
    const st = s()
    const invoices = await demoAdapter.getInvoices()
    const acc = new Map<string, AgingRow>()

    for (const inv of invoices) {
      if (inv.balanceCents <= 0 || inv.status === 'void') continue
      let row = acc.get(inv.wholesaleAccountId)
      if (!row) {
        row = {
          wholesaleAccountId: inv.wholesaleAccountId,
          storeName: inv.storeName,
          currentCents: 0,
          d1to30Cents: 0,
          d31to60Cents: 0,
          d61to90Cents: 0,
          over90Cents: 0,
          totalCents: 0,
        }
        acc.set(inv.wholesaleAccountId, row)
      }

      const daysLate = Math.round(
        (Date.parse(`${st.today}T00:00:00Z`) - Date.parse(`${inv.dueDate}T00:00:00Z`)) / 86_400_000,
      )
      if (daysLate <= 0) row.currentCents += inv.balanceCents
      else if (daysLate <= 30) row.d1to30Cents += inv.balanceCents
      else if (daysLate <= 60) row.d31to60Cents += inv.balanceCents
      else if (daysLate <= 90) row.d61to90Cents += inv.balanceCents
      else row.over90Cents += inv.balanceCents
      row.totalCents += inv.balanceCents
    }

    return [...acc.values()].sort((a, b) => b.totalCents - a.totalCents)
  },

  async getRouteSheet(dow): Promise<RouteRow[]> {
    const st = s()
    const byRoute = new Map<string, RouteRow>()

    for (const account of st.wholesale_accounts) {
      if (account.status !== 'approved' || account.delivery_dow !== dow) continue
      const standing = st.standing_orders.find(
        (x) => x.wholesale_account_id === account.id && x.dow === dow,
      )
      if (!standing) continue

      const route = account.delivery_route ?? '—'
      let row = byRoute.get(route)
      if (!row) {
        row = { dow, route, stops: [] }
        byRoute.set(route, row)
      }

      row.stops.push({
        wholesaleAccountId: account.id,
        storeName: account.store_name,
        city: account.city,
        lines: st.standing_order_items
          .filter((i) => i.standing_order_id === standing.id)
          .map((i) => {
            const pv = st.product_variants.find((v) => v.id === i.variant_id)!
            const p = st.products.find((x) => x.id === pv.product_id)!
            return {
              variantId: i.variant_id,
              sku: pv.sku,
              name: `${p.name_es} — ${pv.label_es}`,
              qty: i.qty,
            }
          }),
      })
    }

    return [...byRoute.values()].sort((a, b) => a.route.localeCompare(b.route))
  },

  /* ---------------- Messaging ---------------- */

  async sendMessage(msg: OutboundMessage) {
    // Nothing leaves the machine. It lands in the Mensajes drawer instead,
    // fully rendered, in the customer's language — see PROMPT-00 Part D.
    store.mutate((st) => {
      st.messages.unshift({
        ...msg,
        id: `msg:${st.messages.length + 1}`,
        status: 'queued',
        loggedAt: new Date().toISOString(),
        wasSuppressed: true,
      })
    })
  },

  async listMessages(): Promise<LoggedMessage[]> {
    return s().messages.slice()
  },

  /* ---------------- Part C writes ---------------- */

  async setIngredientCost(ingredientId, lastUnitCost) {
    if (!Number.isFinite(lastUnitCost) || lastUnitCost < 0) {
      throw new Error('Ingredient cost must be a non-negative number')
    }
    store.mutate((st) => {
      const ing = st.ingredients.find((i) => i.id === ingredientId)
      if (!ing) throw new Error(`Unknown ingredient ${ingredientId}`)
      ing.last_unit_cost = roundTo(lastUnitCost, 4)
    })
    // Re-index so every affected food cost and margin recomputes.
    store.recost()
  },

  async logWaste(input): Promise<WasteRow> {
    let created: WasteRow | null = null
    store.mutate((st) => {
      if (input.qty <= 0) throw new Error('Waste quantity must be positive')

      const pv = input.variantId
        ? st.product_variants.find((v) => v.id === input.variantId)
        : undefined
      const p = pv ? st.products.find((x) => x.id === pv.product_id) : undefined
      const estValue = pv ? roundTo(input.qty * pv.price, 2) : 0
      const occurredAt = input.occurredAt ?? new Date().toISOString()

      const row = {
        id: `w${String(st.waste_log.length + 1).padStart(7, '0')}-0000-0000-0000-000000000000`,
        variant_id: input.variantId ?? '',
        ingredient_id: input.ingredientId ?? null,
        qty: input.qty,
        unit_id: 'a0000000-0000-0000-0000-000000000009',
        reason: input.reason,
        est_value: estValue,
        occurred_at: occurredAt,
      }
      st.waste_log.push(row)

      created = {
        id: row.id,
        variantId: input.variantId ?? null,
        ingredientId: input.ingredientId ?? null,
        name: p && pv ? `${p.name_es} — ${pv.label_es}` : '—',
        qty: row.qty,
        unitCode: 'ea',
        reason: row.reason as WasteReason,
        estValueCents: toCents(row.est_value),
        occurredAt: row.occurred_at,
      }
    })
    if (!created) throw new Error('Waste was not logged')
    return created
  },

  async setWholesaleAccountStatus(id, status): Promise<WholesaleAccount> {
    store.mutate((st) => {
      const a = st.wholesale_accounts.find((x) => x.id === id)
      if (!a) throw new Error(`Unknown wholesale account ${id}`)
      a.status = status
      if (status === 'approved' && !a.approved_at) {
        a.approved_at = new Date().toISOString()
        // A newly approved account needs a price list and a route before it
        // can appear on a route sheet.
        a.price_list_id ??= st.price_lists.find((l) => l.is_default)?.id ?? null
      }
    })
    const account = (await demoAdapter.getWholesaleAccounts()).find((a) => a.id === id)
    if (!account) throw new Error(`Unknown wholesale account ${id}`)
    return account
  },
}

export { TZ }
