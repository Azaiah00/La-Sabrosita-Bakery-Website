/* =====================================================================
   THE CONTRACT — PROMPT-00 Part A
   ---------------------------------------------------------------------
   Every page, component and server action reads through `BakeryData`.
   Two implementations exist: the in-memory demo adapter, and (after the
   sale) the Supabase adapter. Neither the caller nor this file knows
   which one is live.

   Shapes mirror supabase/migrations/0001_schema.sql exactly — same field
   names, same nullability — so swapping the adapter is a one-line change
   and not a refactor.

   TWO CONVENTIONS THAT ARE NOT NEGOTIABLE
   ---------------------------------------------------------------------
   1. MONEY IS INTEGER CENTS. Anything named `*Cents` is an integer.
      Postgres holds numeric(12,2); the adapter converts at the boundary.
      Never a float, never a formatted string.

   2. UNIT COSTS ARE NOT MONEY. `last_unit_cost` is numeric(12,4) — the
      cost of one gram of flour is $0.0011, which does not survive a
      conversion to cents. Those stay as decimal dollars at 4 dp, exactly
      as Postgres stores them, and are only rounded when they become a
      price. Fields carrying them are named `*Cost` (no Cents suffix).
   ===================================================================== */

export type Locale = 'es' | 'en'

export type StaffRole = 'owner' | 'manager' | 'baker' | 'decorator' | 'counter'

export type OrderType = 'pickup' | 'cake' | 'catering' | 'wholesale'

export type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'confirmed'
  | 'in_production'
  | 'decorating'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'refunded'

export type OrderSource = 'web' | 'phone' | 'walk_in' | 'wholesale_portal' | 'staff'

export type InvTxnType =
  | 'receipt'
  | 'production_draw'
  | 'waste'
  | 'adjustment'
  | 'count'
  | 'return_to_vendor'

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'void' | 'overdue'

export type UomDimension = 'mass' | 'volume' | 'count' | 'length'

export type WasteReason =
  | 'end_of_day'
  | 'damaged'
  | 'expired'
  | 'mistake'
  | 'sample'
  | 'staff_meal'
  | 'other'

export type ExpenseMethod = 'cash' | 'card' | 'ach' | 'check' | 'other'

export type MessageChannel = 'email' | 'sms'

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'

export type WholesaleStatus = 'pending' | 'approved' | 'suspended' | 'closed'

/** `yyyy-MM-dd`, always a business date in America/New_York. */
export type BusinessDate = string

/** `HH:mm`, wall-clock in America/New_York. */
export type WallTime = string

/* ------------------------------------------------------------------ */
/* Business, location, hours                                           */
/* ------------------------------------------------------------------ */

export interface Business {
  id: string
  legalName: string
  dbaName: string
  slug: string
  timezone: string
  defaultLocale: Locale
  supportedLocales: Locale[]
  currency: string
  /** numeric(6,4), e.g. 0.06 = 6%. Applied to cents, then rounded. */
  taxRate: number
}

export interface Location {
  id: string
  businessId: string
  name: string
  street1: string
  street2: string | null
  city: string
  region: string
  postalCode: string
  country: string
  phonePrimary: string | null
  phoneSecondary: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  googlePlaceId: string | null
}

export interface WeekRow {
  /** 0 = Sunday .. 6 = Saturday */
  dow: number
  opensAt: WallTime
  closesAt: WallTime
  /** Placeholder flag: four published sources disagree on the real hours. */
  isProvisional: boolean
}

export interface OpenStatus {
  isOpen: boolean
  /** Set while open — the wall-clock time the door locks today. */
  closesAt: WallTime | null
  /** Set while closed — the next business date and time the door opens. */
  opensAt: WallTime | null
  opensOn: BusinessDate | null
  isProvisional: boolean
}

export interface Announcement {
  id: string
  body: string
  linkUrl: string | null
}

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

export interface ProductImage {
  url: string
  alt: string
  width: number | null
  height: number | null
}

export interface Variant {
  id: string
  productId: string
  sku: string
  /** Resolved for the requested locale. */
  label: string
  /** Integer cents. Placeholder until re-quoted — see `isPriceProvisional`. */
  priceCents: number
  isDefault: boolean
  trackStock: boolean
  sortOrder: number
}

export interface Product {
  id: string
  categoryId: string
  categorySlug: string
  slug: string
  /** Spanish name is the primary label in both locales. */
  nameEs: string
  nameEn: string
  /** Resolved for the requested locale. */
  name: string
  description: string | null
  heroImage: ProductImage | null
  /** Client-confirmed values only. Empty until they send them in writing. */
  dietaryTags: string[]
  is86ed: boolean
  availableFrom: WallTime | null
  availableTo: WallTime | null
  sortOrder: number
  variants: Variant[]
}

export interface MenuCategory {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  products: Product[]
}

/* ------------------------------------------------------------------ */
/* Cakes and availability                                              */
/* ------------------------------------------------------------------ */

export interface CakeSize {
  id: string
  label: string
  servingsMin: number
  servingsMax: number
  basePriceCents: number
  minLeadHours: number
  maxTiers: number
  sortOrder: number
}

export type CakeOptionGroup = 'flavor' | 'filling' | 'frosting' | 'finish'

export interface CakeOption {
  id: string
  optionGroup: CakeOptionGroup
  slug: string
  label: string
  priceDeltaCents: number
  extraLeadHours: number
  sortOrder: number
}

export interface LeadTimeRule {
  id: string
  appliesTo: OrderType
  minTiers: number | null
  minServings: number | null
  requiresFinishSlug: string | null
  minLeadHours: number
  maxAdvanceDays: number
  priority: number
}

export interface CapacityRule {
  appliesTo: OrderType
  dow: number
  windowStart: WallTime
  windowEnd: WallTime
  slotMinutes: number
  maxPerSlot: number
}

export interface SlotQuery {
  orderType: OrderType
  /** The instant the shopper is asking from — never `new Date()` inside the adapter. */
  now: Date
  fromDate: BusinessDate
  /** How many days forward to compute. */
  days: number
  sizeId?: string
  tiers?: number
  servings?: number
  /** Slugs of the chosen flavor / filling / frosting / finish options. */
  optionSlugs?: string[]
}

/** Re-exported from the engine so callers have one import. */
import type {
  AvailabilityResponse,
  DateResult,
  SlotResult,
  UnavailableReason,
  LeadBreakdown,
} from '@/lib/availability'

export type {
  AvailabilityResponse as AvailabilityResult,
  DateResult,
  SlotResult as Slot,
  UnavailableReason,
  LeadBreakdown,
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export interface OrderItem {
  id: string
  variantId: string | null
  /** Frozen at order time. A later menu edit never rewrites history. */
  nameSnapshot: string
  qty: number
  unitPriceCents: number
  lineTotalCents: number
  note: string | null
}

export interface Order {
  id: string
  orderNumber: string
  orderType: OrderType
  status: OrderStatus
  source: OrderSource
  contactName: string
  contactPhone: string
  contactEmail: string | null
  locale: Locale
  /** ISO UTC instant. Render through src/lib/datetime.ts, never directly. */
  pickupAt: string | null
  subtotalCents: number
  discountCents: number
  taxCents: number
  totalCents: number
  depositDueCents: number
  amountPaidCents: number
  occasion: string | null
  customerNote: string | null
  allergyNote: string | null
  createdAt: string
  /** Stamped consent for SMS about this order. Null means never text. */
  smsOptInAt: string | null
  confirmedAt: string | null
  readyAt: string | null
  completedAt: string | null
  items: OrderItem[]
}

export interface PlaceOrderLine {
  variantId: string
  qty: number
  note?: string | null
}

export interface PlaceOrderInput {
  orderType: OrderType
  contactName: string
  contactPhone: string
  contactEmail?: string | null
  locale: Locale
  /** ISO UTC instant produced by `localToUtc`. */
  pickupAt: string
  items: PlaceOrderLine[]
  customerNote?: string | null
  allergyNote?: string | null
  source?: OrderSource
  occasion?: string | null
  /**
   * The instant the customer ticked the SMS box, ISO UTC.
   *
   * Consent is a STAMP, not a boolean — the schema's
   * `customers_sms_ck` constraint makes opt-in without a timestamp
   * impossible, and this carries it from the point of collection.
   * Absent means no SMS, ever.
   */
  smsOptInAt?: string | null
}

export interface OrderFilter {
  status?: OrderStatus[]
  orderType?: OrderType[]
  /** Business date in Richmond, matched against `pickup_at`. */
  date?: BusinessDate
  from?: BusinessDate
  to?: BusinessDate
  limit?: number
}

export interface DailyStockRow {
  variantId: string
  sku: string
  /** Spanish product name — the label staff actually use. */
  name: string
  forDate: BusinessDate
  qtyAvailable: number
  qtyReserved: number
  qtyRemaining: number
}

/* ------------------------------------------------------------------ */
/* Bakery OS — inventory, recipes, costing                             */
/* ------------------------------------------------------------------ */

export interface Unit {
  id: string
  code: string
  name: string
  dimension: UomDimension
  isBase: boolean
}

export interface IngredientOnHand {
  id: string
  sku: string
  name: string
  stockUnitCode: string
  /** Decimal dollars per stock unit, 4 dp. Not cents — see the header. */
  lastUnitCost: number
  onHand: number
  reorderPoint: number
  parLevel: number
  isBelowReorder: boolean
  isPerishable: boolean
}

export interface RecipeItem {
  ingredientId: string | null
  subRecipeId: string | null
  /** Resolved for the requested locale. */
  name: string
  qty: number
  unitId: string
  unitCode: string
  sortOrder: number
}

export interface Recipe {
  id: string
  variantId: string | null
  name: string
  yieldQty: number
  yieldUnitId: string
  yieldUnitCode: string
  laborMinutes: number
  items: RecipeItem[]
}

export interface MarginRow {
  variantId: string
  sku: string
  name: string
  priceCents: number
  /** Decimal dollars, 4 dp — the SQL `variant_food_cost()` result. */
  foodCost: number | null
  /** (price - cost) / price * 100, 2 dp. Null when there is no recipe. */
  marginPct: number | null
  isPriceProvisional: boolean
}

export interface ProductionRow {
  variantId: string
  sku: string
  name: string
  /** Ordered + standing-order demand for the date. */
  qtyNeeded: number
  qtyPlanned: number
  qtyProduced: number
  recipeId: string | null
}

export interface Vendor {
  id: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  leadTimeDays: number
  minOrderCents: number
}

export interface PurchaseOrderLine {
  ingredientId: string
  name: string
  qty: number
  unitCode: string
  unitCostCents: number
  lineTotalCents: number
}

export interface PurchaseOrder {
  id: string
  vendorId: string
  vendorName: string
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'
  orderedOn: BusinessDate
  expectedOn: BusinessDate | null
  totalCents: number
  lines: PurchaseOrderLine[]
}

export interface WasteRow {
  id: string
  variantId: string | null
  ingredientId: string | null
  name: string
  qty: number
  unitCode: string | null
  reason: WasteReason
  estValueCents: number
  occurredAt: string
}

/* ------------------------------------------------------------------ */
/* Finance                                                             */
/* ------------------------------------------------------------------ */

export interface SalesDay {
  businessDate: BusinessDate
  grossSalesCents: number
  taxCollectedCents: number
  cashExpectedCents: number
  cashCountedCents: number
  cardTotalCents: number
  onlineTotalCents: number
  wholesaleTotalCents: number
  marketplaceTotalCents: number
  marketplaceFeesCents: number
  transactionCount: number
}

export interface Expense {
  id: string
  categorySlug: string
  categoryName: string
  isCogs: boolean
  isLabor: boolean
  spentOn: BusinessDate
  amountCents: number
  method: ExpenseMethod
  description: string
}

export interface PnlRow {
  /** `yyyy-MM` */
  month: string
  revenueCents: number
  cogsCents: number
  laborCents: number
  overheadCents: number
  grossProfitCents: number
  netProfitCents: number
  foodCostPct: number
  laborPct: number
  netMarginPct: number
}

export interface CommissionSavedRow {
  month: string
  marketplaceSalesCents: number
  marketplaceFeesCents: number
  /** What the same volume would have cost through our own checkout. */
  ownChannelFeesCents: number
  savedCents: number
}

export type Period = 'today' | 'week' | 'month' | 'quarter' | 'year'

export interface Kpis {
  period: Period
  from: BusinessDate
  to: BusinessDate
  revenueCents: number
  orderCount: number
  averageTicketCents: number
  foodCostPct: number
  laborPct: number
  wasteCents: number
  wholesaleSharePct: number
}

/* ------------------------------------------------------------------ */
/* Wholesale                                                           */
/* ------------------------------------------------------------------ */

export interface WholesaleAccount {
  id: string
  storeName: string
  contactName: string
  email: string
  phone: string
  city: string
  region: string
  deliveryDow: number | null
  deliveryRoute: string | null
  creditTermsDays: number
  status: WholesaleStatus
  priceListId: string | null
  approvedAt: string | null
}

export interface PriceListItem {
  variantId: string
  sku: string
  name: string
  unitPriceCents: number
  caseQty: number
  minQty: number
  /** The retail price, for the "you save" column on the line sheet. */
  retailPriceCents: number
}

export interface Invoice {
  id: string
  wholesaleAccountId: string
  storeName: string
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: BusinessDate
  dueDate: BusinessDate
  subtotalCents: number
  taxCents: number
  totalCents: number
  amountPaidCents: number
  balanceCents: number
}

export interface AgingRow {
  wholesaleAccountId: string
  storeName: string
  currentCents: number
  d1to30Cents: number
  d31to60Cents: number
  d61to90Cents: number
  over90Cents: number
  totalCents: number
}

export interface RouteStop {
  wholesaleAccountId: string
  storeName: string
  city: string
  lines: { variantId: string; sku: string; name: string; qty: number }[]
}

export interface RouteRow {
  dow: number
  route: string
  stops: RouteStop[]
}

/* ------------------------------------------------------------------ */
/* Messaging — captured in demo, sent for real after the sale          */
/* ------------------------------------------------------------------ */

export interface OutboundMessage {
  channel: MessageChannel
  templateKey: string
  locale: Locale
  toAddress: string
  subject?: string | null
  /** Fully rendered HTML for email; the literal SMS text for sms. */
  body: string
  orderId?: string | null
}

export interface LoggedMessage extends OutboundMessage {
  id: string
  status: MessageStatus
  /** ISO UTC. In demo mode this is when it was captured, not sent. */
  loggedAt: string
  /** Always true in demo mode. Nothing leaves the machine. */
  wasSuppressed: boolean
}

/* ===================================================================== */
/* The interface                                                         */
/* ===================================================================== */

export interface BakeryData {
  // Menu
  getMenu(locale: Locale): Promise<MenuCategory[]>
  getCategory(slug: string, locale: Locale): Promise<MenuCategory | null>
  getProduct(slug: string, locale: Locale): Promise<Product | null>
  setEightySixed(productId: string, value: boolean): Promise<void>

  // Hours & business
  /** A row from `settings`, parsed. Null when the key is not set. */
  getSettings(key: string): Promise<Record<string, unknown> | null>
  getBusiness(): Promise<Business>
  getLocation(): Promise<Location>
  getWeekHours(): Promise<WeekRow[]>
  getTodayStatus(now: Date): Promise<OpenStatus>
  getAnnouncement(locale: Locale): Promise<Announcement | null>

  // Cakes
  getCakeSizes(): Promise<CakeSize[]>
  getCakeOptions(): Promise<CakeOption[]>
  getLeadTimeRules(): Promise<LeadTimeRule[]>
  getBlackoutDates(): Promise<string[]>
  getAvailability(q: SlotQuery): Promise<AvailabilityResponse>

  // Orders
  placeOrder(input: PlaceOrderInput): Promise<Order>
  getOrder(id: string): Promise<Order | null>
  getOrderByToken(token: string): Promise<Order | null>
  listOrders(filter: OrderFilter): Promise<Order[]>
  setOrderStatus(id: string, status: OrderStatus): Promise<Order>
  /**
   * Apply the server-computed cake price and specification to an order.
   *
   * Separate from `placeOrder` because a configured cake is not priced
   * off the menu — the money comes from `cake_sizes` + `cake_options`
   * recomputed server-side, and it must never be a client-supplied
   * figure.
   */
  setCakeOrderPricing(
    id: string,
    detail: {
      subtotalCents: number
      taxCents: number
      totalCents: number
      depositDueCents: number
      sizeId: string
      tiers: number
      inscription: string | null
      inscriptionLang: string
      colorNotes: string | null
      servesEstimate: number
    },
  ): Promise<Order>
  getDailyStock(date: string): Promise<DailyStockRow[]>

  // Bakery OS
  getIngredients(): Promise<IngredientOnHand[]>
  getRecipes(): Promise<Recipe[]>
  getRecipeCost(recipeId: string): Promise<number>
  /**
   * Per-line cost for a recipe, using the SAME conversion and costing
   * path as `recipe_cost()`. Exposed so the breakdown screen never
   * re-derives a line cost of its own and drifts from the batch total.
   */
  getRecipeLineCosts(recipeId: string): Promise<
    {
      name: string
      qty: number
      unitCode: string
      costDollars: number
      isSubRecipe: boolean
    }[]
  >
  getVariantFoodCost(variantId: string): Promise<number | null>
  getMarginTable(): Promise<MarginRow[]>
  /** Units sold per variant in a window, from order_items. */
  getVariantVolume(from: string, to: string): Promise<Record<string, number>>
  /**
   * Re-cost the catalogue under hypothetical inputs and return the
   * result WITHOUT persisting anything.
   *
   * In production this runs inside a transaction that applies the
   * hypotheticals, reads, and rolls back. Either way the rule is the
   * same: a simulation never writes.
   */
  simulate(input: {
    /** ingredient id -> percentage change, e.g. +15 for a 15% rise. */
    ingredientDeltaPct?: Record<string, number>
    /** variant id -> new price in integer cents. */
    priceCents?: Record<string, number>
  }): Promise<MarginRow[]>
  getProductionPlan(date: string): Promise<ProductionRow[]>
  getVendors(): Promise<Vendor[]>
  getPurchaseOrders(): Promise<PurchaseOrder[]>
  getWasteLog(from: string, to: string): Promise<WasteRow[]>
  getSalesDays(from: string, to: string): Promise<SalesDay[]>
  getExpenses(from: string, to: string): Promise<Expense[]>
  getPnl(months: number): Promise<PnlRow[]>
  getCommissionSaved(): Promise<CommissionSavedRow[]>
  getKpis(period: Period): Promise<Kpis>

  // Wholesale
  getWholesaleAccounts(): Promise<WholesaleAccount[]>
  getPriceList(accountId: string): Promise<PriceListItem[]>
  getInvoices(): Promise<Invoice[]>
  getAging(): Promise<AgingRow[]>
  getRouteSheet(dow: number): Promise<RouteRow[]>

  // Messaging (demo: captured, not sent)
  sendMessage(msg: OutboundMessage): Promise<void>
  listMessages(): Promise<LoggedMessage[]>

  /* ---------------------------------------------------------------- */
  /* Writes the live demo has to perform — PROMPT-00 Part C.           */
  /* The Supabase adapter implements these against the real tables;    */
  /* they are part of the contract, not demo scaffolding.              */
  /* ---------------------------------------------------------------- */

  /** Re-cost the book. Every margin that touches this ingredient moves. */
  setIngredientCost(ingredientId: string, lastUnitCost: number): Promise<void>
  logWaste(input: {
    variantId?: string | null
    ingredientId?: string | null
    qty: number
    reason: WasteReason
    note?: string | null
    occurredAt?: string
  }): Promise<WasteRow>
  setWholesaleAccountStatus(id: string, status: WholesaleStatus): Promise<WholesaleAccount>
}
