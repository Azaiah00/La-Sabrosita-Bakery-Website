# PROMPT 02 — Database schema, RLS and demo seed

> Run this second. Everything downstream depends on it.

---

You are provisioning the Postgres database for **La Sabrosita Bakery** on Supabase.

## Goal

Create the full Bakery OS schema, row-level security, business-logic functions, reporting views, and a demo seed that makes the whole system demonstrable before the client provides a single credential.

## Verification status of the SQL below

This SQL was executed end-to-end against **PostgreSQL 16.13** before it was written into this prompt. Verified results:

- 55 tables, 7 views, 73 RLS policies created with zero errors
- Every table has RLS **enabled and forced**
- `recipe_cost()` returns `$18.9277` for a 48-concha batch, matching a hand calculation to the cent, with the sugar-shell sub-recipe correctly divided by its own yield
- `variant_food_cost()` returns `$0.3943` per concha; doubling the butter cost moves it to `$0.5765`, proving the BOM rollup ripples
- **Concurrency:** 8 simultaneous transactions each buying 2 units against 5 units of stock → exactly 2 succeeded, 6 were rejected with `Only 1.0000 left of …`, final ledger `available 5 / reserved 4`. **Zero overselling.**
- **DST:** a 10:00 local pickup on 2026-10-31 stores as `14:00+00`; the same wall time on 2026-11-02 stores as `15:00+00`, and both render back as 10:00 local. Business dates land correctly on both sides.
- `convert_qty()` raises SQLSTATE `22023` on an impossible mass→volume conversion rather than silently returning a wrong number

Do not "improve" this SQL. If you believe something is wrong, run it and prove it before changing it.

## Step 1 — Apply the schema

Create `supabase/migrations/0001_schema.sql` with exactly the following content, then run `supabase db push` (or paste it into the Supabase SQL editor).

Two notes for Supabase specifically:

1. `staff_members.user_id` should carry a real foreign key to `auth.users`. After applying the migration, run:
   ```sql
   alter table staff_members
     add constraint staff_members_user_fk
     foreign key (user_id) references auth.users(id) on delete cascade;
   ```
   It is left out of the main file so the schema can be tested on a plain Postgres instance.
2. `pgcrypto` provides `digest()` for the magic-link token hashing. On Supabase it lives in the `extensions` schema; if `digest()` is not found, qualify it as `extensions.digest(...)` inside `get_order_by_token`.

```sql
-- =====================================================================
-- LA SABROSITA BAKERY — BAKERY OS
-- Full schema: tables, constraints, indexes, functions, views, RLS.
-- Target: Supabase (PostgreSQL 15+). Verified against PostgreSQL 16.
-- Money is numeric(12,2). Quantities are numeric(14,4). Never float.
-- All timestamps are timestamptz, stored UTC, rendered America/New_York.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =====================================================================
-- 1. ENUMS
-- =====================================================================

create type staff_role          as enum ('owner','manager','baker','decorator','counter');
create type order_type          as enum ('pickup','cake','catering','wholesale');
create type order_status        as enum ('draft','pending_payment','confirmed','in_production','decorating','ready','completed','cancelled','no_show','refunded');
create type order_source        as enum ('web','phone','walk_in','wholesale_portal','staff');
create type inv_txn_type        as enum ('receipt','production_draw','waste','adjustment','count','return_to_vendor');
create type po_status           as enum ('draft','sent','partial','received','cancelled');
create type invoice_status      as enum ('draft','sent','partial','paid','void','overdue');
create type uom_dimension       as enum ('mass','volume','count','length');
create type waste_reason        as enum ('end_of_day','damaged','expired','mistake','sample','staff_meal','other');
create type expense_method      as enum ('cash','card','ach','check','other');
create type message_channel     as enum ('email','sms');
create type message_status      as enum ('queued','sent','delivered','failed','bounced');
create type wholesale_status    as enum ('pending','approved','suspended','closed');
create type token_purpose       as enum ('order_manage','wholesale_invite','password_setup');

-- =====================================================================
-- 2. CORE TENANCY
-- =====================================================================

create table businesses (
  id                uuid primary key default gen_random_uuid(),
  legal_name        text        not null,
  dba_name          text        not null,
  slug              text        not null unique,
  timezone          text        not null default 'America/New_York',
  default_locale    text        not null default 'es',
  supported_locales text[]      not null default array['es','en'],
  currency          char(3)     not null default 'USD',
  tax_rate          numeric(6,4) not null default 0.0000,   -- e.g. 0.0600 = 6.00%
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint businesses_tax_rate_ck check (tax_rate >= 0 and tax_rate < 1)
);

create table locations (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  name            text not null,
  street1         text not null,
  street2         text,
  city            text not null,
  region          text not null,
  postal_code     text not null,
  country         char(2) not null default 'US',
  phone_primary   text,
  phone_secondary text,
  email           citext,
  latitude        numeric(9,6),
  longitude       numeric(9,6),
  google_place_id text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on locations (business_id) where is_active;

-- Regular opening hours. dow: 0=Sunday .. 6=Saturday
create table opening_hours (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references locations(id) on delete cascade,
  dow          smallint not null,
  opens_at     time not null,
  closes_at    time not null,
  constraint opening_hours_dow_ck   check (dow between 0 and 6),
  constraint opening_hours_span_ck  check (closes_at > opens_at),
  unique (location_id, dow, opens_at)
);

-- Holiday / special hours. closed=true means shut regardless of times.
create table special_hours (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references locations(id) on delete cascade,
  on_date      date not null,
  closed       boolean not null default false,
  opens_at     time,
  closes_at    time,
  label_en     text,
  label_es     text,
  constraint special_hours_times_ck check (
    (closed and opens_at is null and closes_at is null)
    or (not closed and opens_at is not null and closes_at is not null and closes_at > opens_at)
  ),
  unique (location_id, on_date)
);

create table staff_members (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id     uuid not null unique,     -- FK to auth.users(id) — see supabase-auth-fk.sql
  full_name   text not null,
  email       citext not null,
  phone       text,
  role        staff_role not null default 'counter',
  locale      text not null default 'es',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on staff_members (business_id, role) where is_active;

create table settings (
  business_id uuid not null references businesses(id) on delete cascade,
  key         text not null,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (business_id, key)
);

create table audit_log (
  id          bigserial primary key,
  business_id uuid references businesses(id) on delete set null,
  actor_id    uuid,
  actor_label text,
  action      text not null,
  entity      text not null,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  ip          inet,
  created_at  timestamptz not null default now()
);
create index on audit_log (business_id, entity, created_at desc);

-- =====================================================================
-- 3. MENU / CATALOG  (bilingual by design — es and en are columns)
-- =====================================================================

create table menu_categories (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  slug           text not null,
  name_es        text not null,
  name_en        text not null,
  description_es text,
  description_en text,
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, slug)
);

create table products (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  category_id    uuid not null references menu_categories(id) on delete restrict,
  slug           text not null,
  name_es        text not null,
  name_en        text not null,
  description_es text,
  description_en text,
  hero_image_url text,
  dietary_tags   text[] not null default '{}',  -- CLIENT-CONFIRMED VALUES ONLY
  is_active      boolean not null default true,
  is_86ed        boolean not null default false,
  eighty_sixed_at timestamptz,
  available_from time,                          -- e.g. conchas out at 07:00
  available_to   time,
  season_start   date,
  season_end     date,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, slug),
  constraint products_season_ck check (season_start is null or season_end is null or season_end >= season_start),
  constraint products_window_ck check (available_from is null or available_to is null or available_to > available_from)
);
create index on products (business_id, category_id) where is_active;
create index on products (business_id) where is_active and not is_86ed;

-- Sizes / portions. Quesadilla Salvadoreña: Pequeña, 1/4, 1/2, Entera.
create table product_variants (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  sku           text not null,
  label_es      text not null,
  label_en      text not null,
  price         numeric(12,2) not null,
  is_default    boolean not null default false,
  is_active     boolean not null default true,
  track_stock   boolean not null default false,  -- true for limited daily-bake items
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, sku),
  constraint product_variants_price_ck check (price >= 0)
);
create unique index product_variants_one_default_idx
  on product_variants (product_id) where is_default;
create index on product_variants (product_id) where is_active;

create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  url         text not null,
  alt_es      text not null,
  alt_en      text not null,
  width       integer,
  height      integer,
  sort_order  integer not null default 0
);

-- Daily bake quantities for variants where track_stock = true.
create table daily_stock (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  location_id   uuid not null references locations(id) on delete cascade,
  variant_id    uuid not null references product_variants(id) on delete cascade,
  for_date      date not null,
  qty_available numeric(14,4) not null default 0,
  qty_reserved  numeric(14,4) not null default 0,
  updated_at    timestamptz not null default now(),
  unique (location_id, variant_id, for_date),
  constraint daily_stock_nonneg_ck check (qty_available >= 0 and qty_reserved >= 0),
  constraint daily_stock_reserve_ck check (qty_reserved <= qty_available)
);

-- =====================================================================
-- 4. UNITS OF MEASURE + CONVERSIONS
--    Purchase unit (50 lb sack) vs recipe unit (grams) is explicit data,
--    never hard-coded in application logic.
-- =====================================================================

create table units (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,          -- 'g','kg','lb','oz','ml','l','ea','doz','sack_50lb'
  name_es    text not null,
  name_en    text not null,
  dimension  uom_dimension not null,
  is_base    boolean not null default false -- one base unit per dimension
);
create unique index units_one_base_per_dimension_idx on units (dimension) where is_base;

-- factor: 1 unit of from_unit == factor units of to_unit
create table unit_conversions (
  id           uuid primary key default gen_random_uuid(),
  from_unit_id uuid not null references units(id) on delete cascade,
  to_unit_id   uuid not null references units(id) on delete cascade,
  factor       numeric(20,10) not null,
  unique (from_unit_id, to_unit_id),
  constraint unit_conversions_factor_ck check (factor > 0),
  constraint unit_conversions_distinct_ck check (from_unit_id <> to_unit_id)
);

-- =====================================================================
-- 5. INGREDIENTS + INVENTORY LEDGER
-- =====================================================================

create table ingredients (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  sku               text not null,
  name_es           text not null,
  name_en           text not null,
  stock_unit_id     uuid not null references units(id) on delete restrict,   -- how we hold it
  purchase_unit_id  uuid not null references units(id) on delete restrict,   -- how we buy it
  purchase_pack_qty numeric(14,4) not null default 1,   -- stock units per purchase unit
  last_unit_cost    numeric(12,4) not null default 0,   -- cost per STOCK unit
  reorder_point     numeric(14,4) not null default 0,
  par_level         numeric(14,4) not null default 0,
  is_perishable     boolean not null default false,
  shelf_life_days   integer,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (business_id, sku),
  constraint ingredients_pack_ck   check (purchase_pack_qty > 0),
  constraint ingredients_cost_ck   check (last_unit_cost >= 0),
  constraint ingredients_par_ck    check (par_level >= 0 and reorder_point >= 0),
  constraint ingredients_shelf_ck  check (shelf_life_days is null or shelf_life_days > 0)
);
create index on ingredients (business_id) where is_active;

-- Append-only ledger. On-hand is derived, never stored as a mutable scalar.
create table inventory_transactions (
  id             bigserial primary key,
  business_id    uuid not null references businesses(id) on delete cascade,
  location_id    uuid not null references locations(id) on delete cascade,
  ingredient_id  uuid not null references ingredients(id) on delete restrict,
  txn_type       inv_txn_type not null,
  qty_delta      numeric(14,4) not null,          -- in the ingredient's STOCK unit; sign carries direction
  unit_cost      numeric(12,4) not null default 0,
  reference_type text,                            -- 'purchase_order','production_batch','waste_log','count'
  reference_id   text,
  note           text,
  created_by     uuid,
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  constraint inventory_transactions_delta_ck check (qty_delta <> 0)
);
create index on inventory_transactions (ingredient_id, location_id, occurred_at desc);
create index on inventory_transactions (business_id, occurred_at desc);

-- =====================================================================
-- 6. RECIPES / BILL OF MATERIALS
--    Change the price of butter once; every food cost re-computes.
-- =====================================================================

create table recipes (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  variant_id   uuid unique references product_variants(id) on delete set null, -- null = sub-recipe
  name_es      text not null,
  name_en      text not null,
  yield_qty    numeric(14,4) not null,
  yield_unit_id uuid not null references units(id) on delete restrict,
  labor_minutes numeric(10,2) not null default 0,
  method_notes text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint recipes_yield_ck check (yield_qty > 0)
);
create index on recipes (business_id) where is_active;

create table recipe_items (
  id             uuid primary key default gen_random_uuid(),
  recipe_id      uuid not null references recipes(id) on delete cascade,
  ingredient_id  uuid references ingredients(id) on delete restrict,
  sub_recipe_id  uuid references recipes(id) on delete restrict,
  qty            numeric(14,4) not null,
  unit_id        uuid not null references units(id) on delete restrict,
  sort_order     integer not null default 0,
  constraint recipe_items_qty_ck check (qty > 0),
  constraint recipe_items_one_source_ck check (
    (ingredient_id is not null and sub_recipe_id is null)
    or (ingredient_id is null and sub_recipe_id is not null)
  ),
  constraint recipe_items_no_self_ck check (sub_recipe_id is null or sub_recipe_id <> recipe_id)
);
create index on recipe_items (recipe_id);

-- =====================================================================
-- 7. VENDORS + PURCHASE ORDERS
-- =====================================================================

create table vendors (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  name           text not null,
  contact_name   text,
  email          citext,
  phone          text,
  account_number text,
  lead_time_days integer not null default 2,
  min_order      numeric(12,2) not null default 0,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint vendors_lead_ck check (lead_time_days >= 0)
);

create table vendor_ingredients (
  id                uuid primary key default gen_random_uuid(),
  vendor_id         uuid not null references vendors(id) on delete cascade,
  ingredient_id     uuid not null references ingredients(id) on delete cascade,
  vendor_sku        text,
  purchase_unit_id  uuid not null references units(id) on delete restrict,
  purchase_pack_qty numeric(14,4) not null default 1,
  pack_price        numeric(12,2) not null,
  is_preferred      boolean not null default false,
  updated_at        timestamptz not null default now(),
  unique (vendor_id, ingredient_id),
  constraint vendor_ingredients_price_ck check (pack_price >= 0),
  constraint vendor_ingredients_pack_ck  check (purchase_pack_qty > 0)
);
create unique index vendor_ingredients_one_preferred_idx
  on vendor_ingredients (ingredient_id) where is_preferred;

create table purchase_orders (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  location_id    uuid not null references locations(id) on delete restrict,
  vendor_id      uuid not null references vendors(id) on delete restrict,
  po_number      text not null,
  status         po_status not null default 'draft',
  expected_date  date,
  subtotal       numeric(12,2) not null default 0,
  tax            numeric(12,2) not null default 0,
  shipping       numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  invoice_number text,
  note           text,
  created_by     uuid,
  sent_at        timestamptz,
  received_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, po_number)
);
create index on purchase_orders (business_id, status, expected_date);

create table purchase_order_items (
  id                uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  ingredient_id     uuid not null references ingredients(id) on delete restrict,
  purchase_unit_id  uuid not null references units(id) on delete restrict,
  purchase_pack_qty numeric(14,4) not null default 1,
  qty_ordered       numeric(14,4) not null,
  qty_received      numeric(14,4) not null default 0,
  pack_price        numeric(12,2) not null,
  line_total        numeric(12,2) not null default 0,
  constraint po_items_qty_ck      check (qty_ordered > 0),
  constraint po_items_received_ck check (qty_received >= 0 and qty_received <= qty_ordered * 1.25)
);
create index on purchase_order_items (purchase_order_id);

-- =====================================================================
-- 8. PRODUCTION + WASTE
-- =====================================================================

create table production_plans (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  for_date    date not null,
  note        text,
  locked_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (location_id, for_date)
);

create table production_items (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references production_plans(id) on delete cascade,
  variant_id    uuid not null references product_variants(id) on delete restrict,
  station       text,
  qty_from_orders numeric(14,4) not null default 0,
  qty_par         numeric(14,4) not null default 0,
  qty_planned     numeric(14,4) not null default 0,
  qty_produced    numeric(14,4) not null default 0,
  produced_at     timestamptz,
  constraint production_items_qty_ck check (
    qty_from_orders >= 0 and qty_par >= 0 and qty_planned >= 0 and qty_produced >= 0
  ),
  unique (plan_id, variant_id)
);

create table waste_log (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  location_id   uuid not null references locations(id) on delete cascade,
  variant_id    uuid references product_variants(id) on delete set null,
  ingredient_id uuid references ingredients(id) on delete set null,
  qty           numeric(14,4) not null,
  unit_id       uuid references units(id) on delete restrict,
  reason        waste_reason not null default 'end_of_day',
  est_value     numeric(12,2) not null default 0,
  note          text,
  logged_by     uuid,
  occurred_at   timestamptz not null default now(),
  constraint waste_log_qty_ck check (qty > 0),
  constraint waste_log_target_ck check (
    (variant_id is not null and ingredient_id is null)
    or (variant_id is null and ingredient_id is not null)
  )
);
create index on waste_log (business_id, occurred_at desc);

-- =====================================================================
-- 9. CUSTOMERS + ORDERS
-- =====================================================================

create table customers (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  email            citext,
  phone            text,
  full_name        text not null,
  locale           text not null default 'es',
  email_opt_in     boolean not null default false,
  sms_opt_in       boolean not null default false,
  sms_opt_in_at    timestamptz,
  birthday         date,
  notes            text,
  is_vip           boolean not null default false,
  allergy_notes    text,
  first_order_at   timestamptz,
  last_order_at    timestamptz,
  lifetime_orders  integer not null default 0,
  lifetime_value   numeric(12,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint customers_contact_ck check (email is not null or phone is not null),
  constraint customers_sms_ck     check (not sms_opt_in or sms_opt_in_at is not null)
);
create unique index customers_email_idx on customers (business_id, email) where email is not null;
create index on customers (business_id, phone);

create sequence order_number_seq start 1000;

create table orders (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references businesses(id) on delete cascade,
  location_id        uuid not null references locations(id) on delete restrict,
  order_number       text not null,
  order_type         order_type not null,
  status             order_status not null default 'draft',
  source             order_source not null default 'web',
  customer_id        uuid references customers(id) on delete set null,
  wholesale_account_id uuid,                      -- FK added after wholesale_accounts exists
  contact_name       text not null,
  contact_phone      text not null,
  contact_email      citext,
  locale             text not null default 'es',
  pickup_at          timestamptz,
  pickup_window_min  integer not null default 30,
  subtotal           numeric(12,2) not null default 0,
  discount           numeric(12,2) not null default 0,
  tax                numeric(12,2) not null default 0,
  total              numeric(12,2) not null default 0,
  deposit_due        numeric(12,2) not null default 0,
  amount_paid        numeric(12,2) not null default 0,
  promo_code         text,
  occasion           text,
  customer_note      text,
  allergy_note       text,
  internal_note      text,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  cancelled_reason   text,
  confirmed_at       timestamptz,
  ready_at           timestamptz,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (business_id, order_number),
  constraint orders_money_ck check (
    subtotal >= 0 and discount >= 0 and tax >= 0 and total >= 0
    and deposit_due >= 0 and amount_paid >= 0
  ),
  constraint orders_pickup_ck check (order_type = 'wholesale' or pickup_at is not null)
);
create index on orders (business_id, status, pickup_at);
create index on orders (business_id, order_type, created_at desc);
create index on orders (customer_id, created_at desc);

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  variant_id   uuid references product_variants(id) on delete restrict,
  name_snapshot text not null,               -- frozen at order time; menu edits never rewrite history
  qty          numeric(14,4) not null,
  unit_price   numeric(12,2) not null,
  line_total   numeric(12,2) not null,
  note         text,
  sort_order   integer not null default 0,
  constraint order_items_qty_ck   check (qty > 0),
  constraint order_items_price_ck check (unit_price >= 0 and line_total >= 0)
);
create index on order_items (order_id);

create table order_status_history (
  id          bigserial primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  actor_id    uuid,
  actor_label text,
  note        text,
  created_at  timestamptz not null default now()
);
create index on order_status_history (order_id, created_at);

-- Magic links: single-purpose, hashed, expiring, rate-limited.
create table order_access_tokens (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  token_hash  text not null unique,          -- sha256 of the emailed token; raw token never stored
  purpose     token_purpose not null default 'order_manage',
  expires_at  timestamptz not null,
  used_at     timestamptz,
  use_count   integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint order_access_tokens_uses_ck check (use_count >= 0)
);
create index on order_access_tokens (order_id);

-- =====================================================================
-- 10. CAKE CONFIGURATOR
-- =====================================================================

create table cake_sizes (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  label_es        text not null,
  label_en        text not null,
  servings_min    integer not null,
  servings_max    integer not null,
  base_price      numeric(12,2) not null,
  min_lead_hours  integer not null default 48,
  max_tiers       integer not null default 1,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  constraint cake_sizes_servings_ck check (servings_max >= servings_min and servings_min > 0),
  constraint cake_sizes_price_ck    check (base_price >= 0),
  constraint cake_sizes_lead_ck     check (min_lead_hours >= 0),
  constraint cake_sizes_tiers_ck    check (max_tiers >= 1)
);

create table cake_options (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  option_group   text not null,                 -- 'flavor' | 'filling' | 'frosting' | 'finish'
  slug           text not null,
  label_es       text not null,
  label_en       text not null,
  price_delta    numeric(12,2) not null default 0,
  extra_lead_hours integer not null default 0,
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  unique (business_id, option_group, slug),
  constraint cake_options_lead_ck check (extra_lead_hours >= 0)
);

create table cake_order_details (
  order_id           uuid primary key references orders(id) on delete cascade,
  size_id            uuid not null references cake_sizes(id) on delete restrict,
  tiers              integer not null default 1,
  flavor_id          uuid references cake_options(id) on delete restrict,
  filling_id         uuid references cake_options(id) on delete restrict,
  frosting_id        uuid references cake_options(id) on delete restrict,
  finish_id          uuid references cake_options(id) on delete restrict,
  inscription        text,
  inscription_lang   text,
  color_notes        text,
  reference_image_url text,
  is_photo_cake      boolean not null default false,
  serves_estimate    integer,
  constraint cake_order_details_tiers_ck check (tiers between 1 and 6),
  constraint cake_order_details_inscription_ck check (inscription is null or char_length(inscription) <= 120)
);

create table cake_blackout_dates (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  on_date     date not null,
  reason_es   text,
  reason_en   text,
  blocks_all  boolean not null default true,
  unique (business_id, on_date)
);

-- Rules resolved most-specific-first by the availability engine.
create table lead_time_rules (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  applies_to      order_type not null,
  min_tiers       integer,
  min_servings    integer,
  requires_finish_slug text,
  min_lead_hours  integer not null,
  max_advance_days integer not null default 180,
  priority        integer not null default 0,
  is_active       boolean not null default true,
  constraint lead_time_rules_lead_ck    check (min_lead_hours >= 0),
  constraint lead_time_rules_advance_ck check (max_advance_days > 0)
);

-- Pickup capacity: how many orders can be promised per slot.
create table pickup_capacity_rules (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  location_id    uuid not null references locations(id) on delete cascade,
  applies_to     order_type not null,
  dow            smallint not null,
  window_start   time not null,
  window_end     time not null,
  slot_minutes   integer not null default 30,
  max_per_slot   integer not null default 10,
  is_active      boolean not null default true,
  constraint pickup_capacity_dow_ck   check (dow between 0 and 6),
  constraint pickup_capacity_span_ck  check (window_end > window_start),
  constraint pickup_capacity_slot_ck  check (slot_minutes > 0 and slot_minutes <= 240),
  constraint pickup_capacity_max_ck   check (max_per_slot > 0)
);

-- =====================================================================
-- 11. WHOLESALE
-- =====================================================================

create table price_lists (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name        text not null,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index price_lists_one_default_idx on price_lists (business_id) where is_default;

create table price_list_items (
  id            uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references price_lists(id) on delete cascade,
  variant_id    uuid not null references product_variants(id) on delete cascade,
  unit_price    numeric(12,2) not null,
  case_qty      numeric(14,4) not null default 1,
  min_qty       numeric(14,4) not null default 1,
  unique (price_list_id, variant_id),
  constraint price_list_items_price_ck check (unit_price >= 0),
  constraint price_list_items_qty_ck   check (case_qty > 0 and min_qty > 0)
);

create table wholesale_accounts (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references businesses(id) on delete cascade,
  store_name         text not null,
  dba_name           text,
  contact_name       text not null,
  email              citext not null,
  phone              text not null,
  street1            text not null,
  street2            text,
  city               text not null,
  region             text not null,
  postal_code        text not null,
  resale_cert_url    text,
  resale_cert_expires date,
  price_list_id      uuid references price_lists(id) on delete set null,
  delivery_dow       smallint,
  delivery_route     text,
  credit_terms_days  integer not null default 0,
  status             wholesale_status not null default 'pending',
  notes              text,
  approved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint wholesale_accounts_dow_ck    check (delivery_dow is null or delivery_dow between 0 and 6),
  constraint wholesale_accounts_terms_ck  check (credit_terms_days >= 0)
);
create index on wholesale_accounts (business_id, status);
create index on wholesale_accounts (business_id, delivery_dow) where status = 'approved';

alter table orders
  add constraint orders_wholesale_account_fk
  foreign key (wholesale_account_id) references wholesale_accounts(id) on delete set null;

alter table orders
  add constraint orders_wholesale_ck
  check (order_type <> 'wholesale' or wholesale_account_id is not null);

create table standing_orders (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references businesses(id) on delete cascade,
  wholesale_account_id uuid not null references wholesale_accounts(id) on delete cascade,
  dow                  smallint not null,
  is_active            boolean not null default true,
  note                 text,
  created_at           timestamptz not null default now(),
  constraint standing_orders_dow_ck check (dow between 0 and 6),
  unique (wholesale_account_id, dow)
);

create table standing_order_items (
  id                uuid primary key default gen_random_uuid(),
  standing_order_id uuid not null references standing_orders(id) on delete cascade,
  variant_id        uuid not null references product_variants(id) on delete restrict,
  qty               numeric(14,4) not null,
  unique (standing_order_id, variant_id),
  constraint standing_order_items_qty_ck check (qty > 0)
);

create sequence invoice_number_seq start 5000;

create table invoices (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references businesses(id) on delete cascade,
  wholesale_account_id uuid not null references wholesale_accounts(id) on delete restrict,
  invoice_number       text not null,
  status               invoice_status not null default 'draft',
  issue_date           date not null default current_date,
  due_date             date not null,
  subtotal             numeric(12,2) not null default 0,
  tax                  numeric(12,2) not null default 0,
  total                numeric(12,2) not null default 0,
  amount_paid          numeric(12,2) not null default 0,
  note                 text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (business_id, invoice_number),
  constraint invoices_due_ck   check (due_date >= issue_date),
  constraint invoices_money_ck check (subtotal >= 0 and tax >= 0 and total >= 0 and amount_paid >= 0)
);
create index on invoices (business_id, status, due_date);

create table invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  order_id    uuid references orders(id) on delete set null,
  description text not null,
  qty         numeric(14,4) not null,
  unit_price  numeric(12,2) not null,
  line_total  numeric(12,2) not null,
  constraint invoice_items_qty_ck check (qty > 0)
);

create table invoice_payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  amount      numeric(12,2) not null,
  method      expense_method not null default 'check',
  reference   text,
  received_at timestamptz not null default now(),
  constraint invoice_payments_amount_ck check (amount > 0)
);

-- =====================================================================
-- 12. FINANCE
-- =====================================================================

create table sales_days (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  location_id       uuid not null references locations(id) on delete cascade,
  business_date     date not null,
  gross_sales       numeric(12,2) not null default 0,
  tax_collected     numeric(12,2) not null default 0,
  cash_expected     numeric(12,2) not null default 0,
  cash_counted      numeric(12,2) not null default 0,
  card_total        numeric(12,2) not null default 0,
  online_total      numeric(12,2) not null default 0,
  wholesale_total   numeric(12,2) not null default 0,
  marketplace_total numeric(12,2) not null default 0,
  marketplace_fees  numeric(12,2) not null default 0,
  transaction_count integer not null default 0,
  note              text,
  closed_by         uuid,
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (location_id, business_date),
  constraint sales_days_nonneg_ck check (
    gross_sales >= 0 and tax_collected >= 0 and cash_expected >= 0 and cash_counted >= 0
    and card_total >= 0 and online_total >= 0 and wholesale_total >= 0
    and marketplace_total >= 0 and marketplace_fees >= 0 and transaction_count >= 0
  )
);

create table expense_categories (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  slug          text not null,
  name_es       text not null,
  name_en       text not null,
  is_cogs       boolean not null default false,
  is_labor      boolean not null default false,
  sort_order    integer not null default 0,
  unique (business_id, slug)
);

create table expenses (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  location_id    uuid references locations(id) on delete set null,
  category_id    uuid not null references expense_categories(id) on delete restrict,
  vendor_id      uuid references vendors(id) on delete set null,
  purchase_order_id uuid references purchase_orders(id) on delete set null,
  spent_on       date not null,
  amount         numeric(12,2) not null,
  method         expense_method not null default 'card',
  description    text not null,
  receipt_url    text,
  is_recurring   boolean not null default false,
  recorded_by    uuid,
  created_at     timestamptz not null default now(),
  constraint expenses_amount_ck check (amount >= 0)
);
create index on expenses (business_id, spent_on desc);
create index on expenses (category_id, spent_on desc);

create table labor_costs (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  location_id    uuid references locations(id) on delete set null,
  period_start   date not null,
  period_end     date not null,
  total_hours    numeric(10,2) not null default 0,
  gross_wages    numeric(12,2) not null default 0,
  payroll_taxes  numeric(12,2) not null default 0,
  headcount      integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint labor_costs_period_ck check (period_end >= period_start),
  constraint labor_costs_nonneg_ck check (total_hours >= 0 and gross_wages >= 0 and payroll_taxes >= 0 and headcount >= 0),
  unique (business_id, location_id, period_start, period_end)
);

-- =====================================================================
-- 13. MARKETING / GIFT CARDS / LOYALTY / MESSAGING
-- =====================================================================

create table promo_codes (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  code           citext not null,
  description    text,
  percent_off    numeric(5,2),
  amount_off     numeric(12,2),
  min_subtotal   numeric(12,2) not null default 0,
  applies_to     order_type,
  starts_at      timestamptz,
  ends_at        timestamptz,
  max_uses       integer,
  use_count      integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (business_id, code),
  constraint promo_codes_one_kind_ck check (
    (percent_off is not null and amount_off is null)
    or (percent_off is null and amount_off is not null)
  ),
  constraint promo_codes_percent_ck check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  constraint promo_codes_amount_ck  check (amount_off is null or amount_off > 0),
  constraint promo_codes_window_ck  check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint promo_codes_uses_ck    check (max_uses is null or use_count <= max_uses)
);

create table gift_cards (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  code_hash      text not null unique,
  last4          char(4) not null,
  initial_amount numeric(12,2) not null,
  balance        numeric(12,2) not null,
  purchaser_email citext,
  recipient_email citext,
  message        text,
  expires_on     date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint gift_cards_amount_ck  check (initial_amount > 0),
  constraint gift_cards_balance_ck check (balance >= 0 and balance <= initial_amount)
);

create table gift_card_transactions (
  id           bigserial primary key,
  gift_card_id uuid not null references gift_cards(id) on delete cascade,
  order_id     uuid references orders(id) on delete set null,
  amount       numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  note         text,
  created_at   timestamptz not null default now(),
  constraint gift_card_transactions_amount_ck check (amount <> 0)
);

create table loyalty_accounts (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  customer_id   uuid not null references customers(id) on delete cascade,
  points        integer not null default 0,
  tier          text not null default 'base',
  created_at    timestamptz not null default now(),
  unique (business_id, customer_id),
  constraint loyalty_accounts_points_ck check (points >= 0)
);

create table loyalty_transactions (
  id         bigserial primary key,
  account_id uuid not null references loyalty_accounts(id) on delete cascade,
  order_id   uuid references orders(id) on delete set null,
  points     integer not null,
  reason     text not null,
  created_at timestamptz not null default now(),
  constraint loyalty_transactions_points_ck check (points <> 0)
);

create table messages_log (
  id            bigserial primary key,
  business_id   uuid not null references businesses(id) on delete cascade,
  order_id      uuid references orders(id) on delete set null,
  customer_id   uuid references customers(id) on delete set null,
  channel       message_channel not null,
  template_key  text not null,
  locale        text not null default 'es',
  to_address    text not null,
  subject       text,
  body_preview  text,
  status        message_status not null default 'queued',
  provider_id   text,
  error         text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index on messages_log (business_id, created_at desc);
create index on messages_log (order_id);

create table announcements (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  body_es     text not null,
  body_en     text not null,
  link_url    text,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  is_active   boolean not null default true,
  constraint announcements_window_ck check (ends_at is null or ends_at > starts_at)
);

-- =====================================================================
-- 14. TRIGGERS
-- =====================================================================

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'businesses','locations','staff_members','menu_categories','products','product_variants',
    'ingredients','recipes','vendors','purchase_orders','customers','orders',
    'wholesale_accounts','invoices','sales_days'
  ] loop
    execute format(
      'create trigger %I_touch before update on %I for each row execute function touch_updated_at()',
      t || '_updated', t
    );
  end loop;
end;
$$;

create or replace function log_order_status_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into order_status_history (order_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, new.created_by);
  elsif tg_op = 'INSERT' then
    insert into order_status_history (order_id, from_status, to_status, actor_id)
    values (new.id, null, new.status, new.created_by);
  end if;
  return new;
end;
$$;

create trigger orders_status_history
  after insert or update of status on orders
  for each row execute function log_order_status_change();

-- =====================================================================
-- 15. FUNCTIONS — unit conversion, food cost, race-safe ordering
-- =====================================================================

-- Convert a quantity between units. Direct, inverse, or same-unit.
-- Raises if no conversion path exists — silence here would corrupt food cost.
create or replace function convert_qty(p_qty numeric, p_from uuid, p_to uuid)
returns numeric
language plpgsql stable as $$
declare
  v_factor numeric;
begin
  if p_from = p_to then
    return p_qty;
  end if;

  select factor into v_factor
    from unit_conversions
   where from_unit_id = p_from and to_unit_id = p_to;
  if found then
    return p_qty * v_factor;
  end if;

  select factor into v_factor
    from unit_conversions
   where from_unit_id = p_to and to_unit_id = p_from;
  if found then
    return p_qty / v_factor;
  end if;

  raise exception 'No unit conversion between % and %', p_from, p_to
    using errcode = '22023';
end;
$$;

-- Recursive food cost for a recipe, including sub-recipes.
-- p_depth guards against a cycle slipping past the no-self-reference check.
create or replace function recipe_cost(p_recipe_id uuid, p_depth integer default 0)
returns numeric
language plpgsql stable as $$
declare
  v_total numeric(14,6) := 0;
  r       record;
  v_sub_yield numeric;
begin
  if p_depth > 10 then
    raise exception 'Recipe nesting deeper than 10 levels — probable cycle at %', p_recipe_id
      using errcode = '22023';
  end if;

  for r in
    select ri.qty, ri.unit_id, ri.ingredient_id, ri.sub_recipe_id,
           i.stock_unit_id, i.last_unit_cost
      from recipe_items ri
      left join ingredients i on i.id = ri.ingredient_id
     where ri.recipe_id = p_recipe_id
  loop
    if r.ingredient_id is not null then
      v_total := v_total
        + convert_qty(r.qty, r.unit_id, r.stock_unit_id) * r.last_unit_cost;
    else
      select yield_qty into v_sub_yield from recipes where id = r.sub_recipe_id;
      if v_sub_yield is null or v_sub_yield = 0 then
        raise exception 'Sub-recipe % has no usable yield', r.sub_recipe_id
          using errcode = '22023';
      end if;
      v_total := v_total
        + (recipe_cost(r.sub_recipe_id, p_depth + 1) / v_sub_yield) * r.qty;
    end if;
  end loop;

  return round(v_total, 4);
end;
$$;

-- Cost of one unit of the product a recipe yields.
create or replace function variant_food_cost(p_variant_id uuid)
returns numeric
language plpgsql stable as $$
declare
  v_recipe_id uuid;
  v_yield     numeric;
begin
  select id, yield_qty into v_recipe_id, v_yield
    from recipes where variant_id = p_variant_id and is_active;
  if v_recipe_id is null or v_yield is null or v_yield = 0 then
    return null;
  end if;
  return round(recipe_cost(v_recipe_id) / v_yield, 4);
end;
$$;

-- Derived on-hand. Never a mutable scalar — always the sum of the ledger.
create or replace function ingredient_on_hand(p_ingredient_id uuid, p_location_id uuid)
returns numeric
language sql stable as $$
  select coalesce(sum(qty_delta), 0)
    from inventory_transactions
   where ingredient_id = p_ingredient_id
     and location_id   = p_location_id;
$$;

-- ---------------------------------------------------------------------
-- RACE-SAFE ORDER PLACEMENT
-- Two customers hitting "Pay" in the same millisecond for the last six
-- tres leches must not both succeed. Everything below runs in one
-- transaction; rows are locked with FOR UPDATE in a deterministic order
-- (variant_id ascending) so concurrent callers queue instead of deadlock.
-- ---------------------------------------------------------------------
create or replace function place_order(
  p_business_id  uuid,
  p_location_id  uuid,
  p_order_type   order_type,
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text,
  p_locale       text,
  p_pickup_at    timestamptz,
  p_items        jsonb,          -- [{"variant_id":"...","qty":2,"note":null}, ...]
  p_customer_note text default null,
  p_allergy_note  text default null,
  p_source       order_source default 'web'
) returns uuid
language plpgsql as $$
declare
  v_order_id   uuid;
  v_number     text;
  v_item       jsonb;
  v_variant_id uuid;
  v_qty        numeric(14,4);
  v_price      numeric(12,2);
  v_name       text;
  v_track      boolean;
  v_86         boolean;
  v_subtotal   numeric(12,2) := 0;
  v_tax_rate   numeric(6,4);
  v_tax        numeric(12,2);
  v_date       date;
  v_avail      numeric(14,4);
  v_reserved   numeric(14,4);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item' using errcode = '22023';
  end if;

  select tax_rate into v_tax_rate from businesses where id = p_business_id;
  if v_tax_rate is null then
    raise exception 'Unknown business %', p_business_id using errcode = '22023';
  end if;

  v_date := (p_pickup_at at time zone 'America/New_York')::date;

  v_number := 'LS-' || to_char(nextval('order_number_seq'), 'FM000000');

  insert into orders (
    business_id, location_id, order_number, order_type, status, source,
    contact_name, contact_phone, contact_email, locale, pickup_at,
    customer_note, allergy_note
  ) values (
    p_business_id, p_location_id, v_number, p_order_type, 'draft', p_source,
    p_contact_name, p_contact_phone, nullif(p_contact_email,'')::citext, p_locale, p_pickup_at,
    p_customer_note, p_allergy_note
  )
  returning id into v_order_id;

  -- Deterministic lock order prevents deadlock between concurrent callers.
  for v_item in
    select value
      from jsonb_array_elements(p_items) as value
     order by (value->>'variant_id')::uuid
  loop
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_qty        := (v_item->>'qty')::numeric;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for variant %', v_variant_id using errcode = '22023';
    end if;

    select pv.price, pv.track_stock, p.is_86ed,
           case when p_locale = 'en' then p.name_en || ' — ' || pv.label_en
                else p.name_es || ' — ' || pv.label_es end
      into v_price, v_track, v_86, v_name
      from product_variants pv
      join products p on p.id = pv.product_id
     where pv.id = v_variant_id
       and pv.business_id = p_business_id
       and pv.is_active
       and p.is_active
     for update of pv;

    if not found then
      raise exception 'Variant % is not available for sale', v_variant_id using errcode = '22023';
    end if;
    if v_86 then
      raise exception 'Item is 86ed: %', v_name using errcode = '22023';
    end if;

    if v_track then
      select qty_available, qty_reserved
        into v_avail, v_reserved
        from daily_stock
       where location_id = p_location_id
         and variant_id  = v_variant_id
         and for_date    = v_date
       for update;

      if not found then
        raise exception 'No bake scheduled for % on %', v_name, v_date using errcode = '22023';
      end if;
      if v_avail - v_reserved < v_qty then
        raise exception 'Only % left of %', (v_avail - v_reserved), v_name using errcode = '22023';
      end if;

      update daily_stock
         set qty_reserved = qty_reserved + v_qty,
             updated_at   = now()
       where location_id = p_location_id
         and variant_id  = v_variant_id
         and for_date    = v_date;
    end if;

    insert into order_items (order_id, variant_id, name_snapshot, qty, unit_price, line_total, note)
    values (v_order_id, v_variant_id, v_name, v_qty, v_price,
            round(v_qty * v_price, 2), nullif(v_item->>'note',''));

    v_subtotal := v_subtotal + round(v_qty * v_price, 2);
  end loop;

  v_tax := round(v_subtotal * v_tax_rate, 2);

  update orders
     set subtotal = v_subtotal,
         tax      = v_tax,
         total    = v_subtotal + v_tax,
         status   = 'pending_payment'
   where id = v_order_id;

  return v_order_id;
end;
$$;

-- Releasing a reservation when an order is cancelled or expires.
create or replace function release_order_stock(p_order_id uuid)
returns void
language plpgsql as $$
declare
  r      record;
  v_date date;
  v_loc  uuid;
begin
  select location_id, (pickup_at at time zone 'America/New_York')::date
    into v_loc, v_date
    from orders where id = p_order_id;

  for r in
    select oi.variant_id, oi.qty
      from order_items oi
      join product_variants pv on pv.id = oi.variant_id
     where oi.order_id = p_order_id
       and pv.track_stock
     order by oi.variant_id
  loop
    update daily_stock
       set qty_reserved = greatest(qty_reserved - r.qty, 0),
           updated_at   = now()
     where location_id = v_loc
       and variant_id  = r.variant_id
       and for_date    = v_date;
  end loop;
end;
$$;

-- =====================================================================
-- 16. VIEWS — the screens that sell the retainer
-- =====================================================================

create or replace view v_ingredient_on_hand as
select
  i.business_id,
  it.location_id,
  i.id             as ingredient_id,
  i.sku,
  i.name_es,
  i.name_en,
  i.stock_unit_id,
  sum(it.qty_delta)                              as on_hand,
  i.reorder_point,
  i.par_level,
  i.last_unit_cost,
  round(sum(it.qty_delta) * i.last_unit_cost, 2)  as on_hand_value,
  (sum(it.qty_delta) <= i.reorder_point)          as needs_reorder
from ingredients i
join inventory_transactions it on it.ingredient_id = i.id
where i.is_active
group by i.business_id, it.location_id, i.id, i.sku, i.name_es, i.name_en,
         i.stock_unit_id, i.reorder_point, i.par_level, i.last_unit_cost;

create or replace view v_variant_margin as
select
  pv.business_id,
  p.id                 as product_id,
  pv.id                as variant_id,
  p.name_es || ' — ' || pv.label_es as name_es,
  p.name_en || ' — ' || pv.label_en as name_en,
  pv.price,
  variant_food_cost(pv.id) as food_cost,
  case
    when variant_food_cost(pv.id) is null then null
    else round(pv.price - variant_food_cost(pv.id), 4)
  end as contribution_margin,
  case
    when variant_food_cost(pv.id) is null or pv.price = 0 then null
    else round((pv.price - variant_food_cost(pv.id)) / pv.price * 100, 2)
  end as margin_pct,
  case
    when variant_food_cost(pv.id) is null then 'no_recipe'
    when variant_food_cost(pv.id) > pv.price then 'sold_at_loss'
    when pv.price = 0 then 'no_price'
    when (pv.price - variant_food_cost(pv.id)) / pv.price < 0.60 then 'thin_margin'
    else 'ok'
  end as margin_flag
from product_variants pv
join products p on p.id = pv.product_id
where pv.is_active and p.is_active;

create or replace view v_sales_monthly as
select
  business_id,
  date_trunc('month', business_date)::date as month,
  sum(gross_sales)       as gross_sales,
  sum(card_total)        as card_total,
  sum(online_total)      as online_total,
  sum(wholesale_total)   as wholesale_total,
  sum(marketplace_total) as marketplace_total,
  sum(marketplace_fees)  as marketplace_fees,
  sum(cash_counted - cash_expected) as cash_variance,
  sum(transaction_count) as transaction_count,
  case when sum(transaction_count) = 0 then null
       else round(sum(gross_sales) / sum(transaction_count), 2) end as avg_ticket
from sales_days
group by business_id, date_trunc('month', business_date);

create or replace view v_expenses_monthly as
select
  e.business_id,
  date_trunc('month', e.spent_on)::date as month,
  ec.slug      as category_slug,
  ec.name_en   as category_name,
  ec.is_cogs,
  ec.is_labor,
  sum(e.amount) as amount
from expenses e
join expense_categories ec on ec.id = e.category_id
group by e.business_id, date_trunc('month', e.spent_on), ec.slug, ec.name_en, ec.is_cogs, ec.is_labor;

create or replace view v_pnl_monthly as
with rev as (
  select business_id, month, gross_sales, marketplace_fees
    from v_sales_monthly
),
exp as (
  select business_id, month,
         sum(amount) filter (where is_cogs)  as cogs,
         sum(amount) filter (where is_labor) as labor,
         sum(amount) filter (where not is_cogs and not is_labor) as opex,
         sum(amount) as total_expenses
    from v_expenses_monthly
   group by business_id, month
)
select
  coalesce(rev.business_id, exp.business_id) as business_id,
  coalesce(rev.month, exp.month)             as month,
  coalesce(rev.gross_sales, 0)               as revenue,
  coalesce(exp.cogs, 0)                      as cogs,
  coalesce(exp.labor, 0)                     as labor,
  coalesce(exp.opex, 0)                      as opex,
  coalesce(rev.marketplace_fees, 0)          as marketplace_fees,
  coalesce(rev.gross_sales, 0) - coalesce(exp.cogs, 0) as gross_profit,
  coalesce(rev.gross_sales, 0)
    - coalesce(exp.total_expenses, 0)
    - coalesce(rev.marketplace_fees, 0)      as net_profit,
  case when coalesce(rev.gross_sales, 0) = 0 then null
       else round(coalesce(exp.cogs, 0) / rev.gross_sales * 100, 2) end as food_cost_pct,
  case when coalesce(rev.gross_sales, 0) = 0 then null
       else round(coalesce(exp.labor, 0) / rev.gross_sales * 100, 2) end as labor_pct,
  case when coalesce(rev.gross_sales, 0) = 0 then null
       else round((coalesce(exp.cogs, 0) + coalesce(exp.labor, 0)) / rev.gross_sales * 100, 2) end as prime_cost_pct
from rev
full outer join exp
  on rev.business_id = exp.business_id and rev.month = exp.month;

-- The number that renews the retainer every year.
create or replace view v_commission_saved as
select
  business_id,
  date_trunc('month', business_date)::date as month,
  sum(online_total)                                       as direct_online_sales,
  round(sum(online_total) * 0.25, 2)                      as would_have_paid_marketplace,
  round(sum(online_total) * 0.029 + count(*) * 0.30, 2)   as stripe_cost_estimate,
  round(sum(online_total) * 0.25
        - (sum(online_total) * 0.029 + count(*) * 0.30), 2) as estimated_saved
from sales_days
group by business_id, date_trunc('month', business_date);

create or replace view v_wholesale_aging as
select
  i.business_id,
  wa.id            as wholesale_account_id,
  wa.store_name,
  i.id             as invoice_id,
  i.invoice_number,
  i.due_date,
  i.total - i.amount_paid as balance,
  (current_date - i.due_date) as days_past_due,
  case
    when i.total - i.amount_paid <= 0 then 'paid'
    when current_date <= i.due_date   then 'current'
    when current_date - i.due_date <= 30 then '1_30'
    when current_date - i.due_date <= 60 then '31_60'
    when current_date - i.due_date <= 90 then '61_90'
    else 'over_90'
  end as aging_bucket
from invoices i
join wholesale_accounts wa on wa.id = i.wholesale_account_id
where i.status not in ('void','draft');

-- =====================================================================
-- 17. ROW LEVEL SECURITY
--     Staff read only their own business. Guests never read another
--     guest's order — public order access goes exclusively through a
--     security-definer RPC gated on a hashed magic-link token.
-- =====================================================================

create or replace function current_business_id() returns uuid
language sql stable security definer set search_path = public as $$
  select business_id from staff_members
   where user_id = auth.uid() and is_active
   limit 1;
$$;

create or replace function current_staff_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from staff_members
   where user_id = auth.uid() and is_active
   limit 1;
$$;

create or replace function is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_staff_role() in ('owner','manager'), false);
$$;

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_staff_role() = 'owner', false);
$$;

-- Enable RLS on every business-scoped table.
do $$
declare t text;
begin
  foreach t in array array[
    'businesses','locations','opening_hours','special_hours','staff_members','settings','audit_log',
    'menu_categories','products','product_variants','product_images','daily_stock',
    'ingredients','inventory_transactions','recipes','recipe_items',
    'vendors','vendor_ingredients','purchase_orders','purchase_order_items',
    'production_plans','production_items','waste_log',
    'customers','orders','order_items','order_status_history','order_access_tokens',
    'cake_sizes','cake_options','cake_order_details','cake_blackout_dates',
    'lead_time_rules','pickup_capacity_rules',
    'price_lists','price_list_items','wholesale_accounts','standing_orders','standing_order_items',
    'invoices','invoice_items','invoice_payments',
    'sales_days','expense_categories','expenses','labor_costs',
    'promo_codes','gift_cards','gift_card_transactions',
    'loyalty_accounts','loyalty_transactions','messages_log','announcements'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end;
$$;

-- Units are global reference data: readable by all, writable by managers only.
alter table units enable row level security;
alter table units force row level security;
alter table unit_conversions enable row level security;
alter table unit_conversions force row level security;

create policy pub_read_units on units for select to anon, authenticated using (true);
create policy mgr_write_units on units for all to authenticated
  using (is_manager()) with check (is_manager());
create policy pub_read_unit_conversions on unit_conversions for select to anon, authenticated using (true);
create policy mgr_write_unit_conversions on unit_conversions for all to authenticated
  using (is_manager()) with check (is_manager());

-- --- Public read: the menu, hours and announcements are the website. ---
create policy pub_read_businesses     on businesses      for select to anon, authenticated using (true);
create policy pub_read_locations      on locations       for select to anon, authenticated using (is_active);
create policy pub_read_opening_hours  on opening_hours   for select to anon, authenticated using (true);
create policy pub_read_special_hours  on special_hours   for select to anon, authenticated using (true);
create policy pub_read_categories     on menu_categories for select to anon, authenticated using (is_active);
create policy pub_read_products       on products        for select to anon, authenticated using (is_active);
create policy pub_read_variants       on product_variants for select to anon, authenticated using (is_active);
create policy pub_read_images         on product_images  for select to anon, authenticated using (true);
create policy pub_read_cake_sizes     on cake_sizes      for select to anon, authenticated using (is_active);
create policy pub_read_cake_options   on cake_options    for select to anon, authenticated using (is_active);
create policy pub_read_blackouts      on cake_blackout_dates for select to anon, authenticated using (true);
create policy pub_read_lead_rules     on lead_time_rules for select to anon, authenticated using (is_active);
create policy pub_read_capacity       on pickup_capacity_rules for select to anon, authenticated using (is_active);
create policy pub_read_announcements  on announcements   for select to anon, authenticated
  using (is_active and starts_at <= now() and (ends_at is null or ends_at > now()));

-- --- Staff: tenant-scoped full access on operational tables. ---
do $$
declare t text;
begin
  foreach t in array array[
    'menu_categories','products','product_variants','daily_stock',
    'ingredients','inventory_transactions','recipes','vendors','purchase_orders',
    'production_plans','waste_log','customers','orders',
    'cake_sizes','cake_options','cake_blackout_dates','lead_time_rules','pickup_capacity_rules',
    'price_lists','wholesale_accounts','standing_orders','invoices',
    'sales_days','expense_categories','expenses','labor_costs',
    'promo_codes','gift_cards','loyalty_accounts','messages_log','announcements','settings'
  ] loop
    execute format($f$
      create policy staff_all_%1$s on %1$I for all to authenticated
      using (business_id = current_business_id())
      with check (business_id = current_business_id())
    $f$, t);
  end loop;
end;
$$;

-- Child tables scope through their parent.
create policy staff_all_order_items on order_items for all to authenticated
  using (exists (select 1 from orders o where o.id = order_id and o.business_id = current_business_id()))
  with check (exists (select 1 from orders o where o.id = order_id and o.business_id = current_business_id()));

create policy staff_all_recipe_items on recipe_items for all to authenticated
  using (exists (select 1 from recipes r where r.id = recipe_id and r.business_id = current_business_id()))
  with check (exists (select 1 from recipes r where r.id = recipe_id and r.business_id = current_business_id()));

create policy staff_all_po_items on purchase_order_items for all to authenticated
  using (exists (select 1 from purchase_orders po where po.id = purchase_order_id and po.business_id = current_business_id()))
  with check (exists (select 1 from purchase_orders po where po.id = purchase_order_id and po.business_id = current_business_id()));

create policy staff_all_production_items on production_items for all to authenticated
  using (exists (select 1 from production_plans pp where pp.id = plan_id and pp.business_id = current_business_id()))
  with check (exists (select 1 from production_plans pp where pp.id = plan_id and pp.business_id = current_business_id()));

create policy staff_all_price_list_items on price_list_items for all to authenticated
  using (exists (select 1 from price_lists pl where pl.id = price_list_id and pl.business_id = current_business_id()))
  with check (exists (select 1 from price_lists pl where pl.id = price_list_id and pl.business_id = current_business_id()));

create policy staff_all_standing_order_items on standing_order_items for all to authenticated
  using (exists (select 1 from standing_orders so where so.id = standing_order_id and so.business_id = current_business_id()))
  with check (exists (select 1 from standing_orders so where so.id = standing_order_id and so.business_id = current_business_id()));

create policy staff_all_invoice_items on invoice_items for all to authenticated
  using (exists (select 1 from invoices iv where iv.id = invoice_id and iv.business_id = current_business_id()))
  with check (exists (select 1 from invoices iv where iv.id = invoice_id and iv.business_id = current_business_id()));

create policy staff_all_invoice_payments on invoice_payments for all to authenticated
  using (exists (select 1 from invoices iv where iv.id = invoice_id and iv.business_id = current_business_id()))
  with check (exists (select 1 from invoices iv where iv.id = invoice_id and iv.business_id = current_business_id()));

create policy staff_all_cake_details on cake_order_details for all to authenticated
  using (exists (select 1 from orders o where o.id = order_id and o.business_id = current_business_id()))
  with check (exists (select 1 from orders o where o.id = order_id and o.business_id = current_business_id()));

create policy staff_read_status_history on order_status_history for select to authenticated
  using (exists (select 1 from orders o where o.id = order_id and o.business_id = current_business_id()));

create policy staff_read_gc_txns on gift_card_transactions for select to authenticated
  using (exists (select 1 from gift_cards gc where gc.id = gift_card_id and gc.business_id = current_business_id()));

create policy staff_read_loyalty_txns on loyalty_transactions for select to authenticated
  using (exists (select 1 from loyalty_accounts la where la.id = account_id and la.business_id = current_business_id()));

create policy staff_read_images on product_images for select to authenticated
  using (exists (select 1 from products p where p.id = product_id and p.business_id = current_business_id()));

create policy staff_write_images on product_images for all to authenticated
  using (exists (select 1 from products p where p.id = product_id and p.business_id = current_business_id()))
  with check (exists (select 1 from products p where p.id = product_id and p.business_id = current_business_id()));

create policy staff_read_vendor_ingredients on vendor_ingredients for all to authenticated
  using (exists (select 1 from vendors v where v.id = vendor_id and v.business_id = current_business_id()))
  with check (exists (select 1 from vendors v where v.id = vendor_id and v.business_id = current_business_id()));

-- Locations / hours: staff write, everyone reads (policy above).
create policy staff_write_locations on locations for all to authenticated
  using (business_id = current_business_id()) with check (business_id = current_business_id());
create policy staff_write_opening_hours on opening_hours for all to authenticated
  using (exists (select 1 from locations l where l.id = location_id and l.business_id = current_business_id()))
  with check (exists (select 1 from locations l where l.id = location_id and l.business_id = current_business_id()));
create policy staff_write_special_hours on special_hours for all to authenticated
  using (exists (select 1 from locations l where l.id = location_id and l.business_id = current_business_id()))
  with check (exists (select 1 from locations l where l.id = location_id and l.business_id = current_business_id()));

-- Staff roster: readable by the business, writable by managers only.
create policy staff_read_roster on staff_members for select to authenticated
  using (business_id = current_business_id());
create policy staff_manage_roster on staff_members for all to authenticated
  using (business_id = current_business_id() and is_manager())
  with check (business_id = current_business_id() and is_manager());

-- Owner-only surfaces.
create policy owner_read_audit on audit_log for select to authenticated
  using (business_id = current_business_id() and is_manager());

-- Magic-link tokens are never readable by a client, in any role.
create policy no_client_token_read on order_access_tokens for select to authenticated using (false);

-- Businesses table: staff of that business may update it; nobody may delete it.
create policy staff_update_business on businesses for update to authenticated
  using (id = current_business_id() and is_owner())
  with check (id = current_business_id() and is_owner());

-- =====================================================================
-- 18. GUEST ORDER LOOKUP — the only public path to a single order.
--     SECURITY DEFINER so it bypasses RLS, but it will only ever return
--     the one order whose hashed, unexpired token was presented.
-- =====================================================================

create or replace function get_order_by_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_result   jsonb;
begin
  select oat.order_id into v_order_id
    from order_access_tokens oat
   where oat.token_hash = encode(digest(p_token, 'sha256'), 'hex')
     and oat.purpose = 'order_manage'
     and oat.expires_at > now()
     and oat.use_count < 50;

  if v_order_id is null then
    return null;
  end if;

  update order_access_tokens
     set use_count = use_count + 1,
         used_at   = coalesce(used_at, now())
   where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  select jsonb_build_object(
    'order_number', o.order_number,
    'status',       o.status,
    'order_type',   o.order_type,
    'pickup_at',    o.pickup_at,
    'contact_name', o.contact_name,
    'locale',       o.locale,
    'subtotal',     o.subtotal,
    'tax',          o.tax,
    'total',        o.total,
    'amount_paid',  o.amount_paid,
    'customer_note', o.customer_note,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', oi.name_snapshot, 'qty', oi.qty,
        'unit_price', oi.unit_price, 'line_total', oi.line_total, 'note', oi.note
      ) order by oi.sort_order)
      from order_items oi where oi.order_id = o.id
    ), '[]'::jsonb)
  ) into v_result
  from orders o where o.id = v_order_id;

  return v_result;
end;
$$;

revoke all on function get_order_by_token(text) from public;
grant execute on function get_order_by_token(text) to anon, authenticated;

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
```

## Step 2 — Apply the demo seed

Create `supabase/seed.sql` with exactly the following content and run `supabase db reset` (or paste it into the SQL editor after the schema).

**Every price, cost, recipe quantity, vendor price, sales figure and expense in this seed is illustrative placeholder data.** Product names and Spanish spellings come from the client's own published menu with typos corrected. Nothing here is a claim about this business. See §7 of `00-INTEL-AUDIT-PLAN.md` for the confirmation list.

```sql
-- =====================================================================
-- LA SABROSITA BAKERY — DEMO SEED
-- One command produces a fully working Bakery OS you can demo to the
-- client before they hand over a single credential.
--
-- ⚠️  EVERY PRICE AND COST BELOW IS A PLACEHOLDER PENDING CLIENT
--     CONFIRMATION. Product names and Spanish spellings are taken from
--     the client's own published menu (typos corrected). Ingredient
--     costs, recipe quantities, vendor prices, sales figures and
--     expenses are ILLUSTRATIVE DEMO DATA and are not claims about this
--     business. See §7 of 00-INTEL-AUDIT-PLAN.md.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Business + location
-- ---------------------------------------------------------------------
insert into businesses (id, legal_name, dba_name, slug, timezone, default_locale, tax_rate)
values (
  '11111111-1111-1111-1111-111111111111',
  'La Sabrosita Bakery',            -- CONFIRM: legal entity name
  'La Sabrosita Bakery',
  'la-sabrosita',
  'America/New_York',
  'es',
  0.0600                            -- CONFIRM: Chesterfield County VA prepared-food rate
);

insert into locations (
  id, business_id, name, street1, street2, city, region, postal_code,
  phone_primary, phone_secondary, email, latitude, longitude
) values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Midlothian Turnpike',
  '7730 Midlothian Turnpike', 'Ste A', 'Richmond', 'VA', '23235',
  '(804) 986-9695',                 -- CONFIRM: which number is primary
  '(804) 562-8937',
  'LaSabrositaBakery@gmail.com',
  37.4989876, -77.5400652
);

-- CONFIRM: four sources disagree. Google's set is seeded as the least-wrong default.
insert into opening_hours (location_id, dow, opens_at, closes_at) values
  ('22222222-2222-2222-2222-222222222222', 0, '07:00', '19:00'),  -- Sunday
  ('22222222-2222-2222-2222-222222222222', 1, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 2, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 3, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 4, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 5, '07:00', '20:00'),
  ('22222222-2222-2222-2222-222222222222', 6, '07:00', '20:00');

-- ---------------------------------------------------------------------
-- Units + conversions
-- ---------------------------------------------------------------------
insert into units (id, code, name_es, name_en, dimension, is_base) values
  ('a0000000-0000-0000-0000-000000000001','g','gramo','gram','mass',true),
  ('a0000000-0000-0000-0000-000000000002','kg','kilogramo','kilogram','mass',false),
  ('a0000000-0000-0000-0000-000000000003','lb','libra','pound','mass',false),
  ('a0000000-0000-0000-0000-000000000004','oz','onza','ounce','mass',false),
  ('a0000000-0000-0000-0000-000000000005','sack_50lb','saco 50 lb','50 lb sack','mass',false),
  ('a0000000-0000-0000-0000-000000000006','ml','mililitro','milliliter','volume',true),
  ('a0000000-0000-0000-0000-000000000007','l','litro','liter','volume',false),
  ('a0000000-0000-0000-0000-000000000008','gal','galón','gallon','volume',false),
  ('a0000000-0000-0000-0000-000000000009','ea','unidad','each','count',true),
  ('a0000000-0000-0000-0000-00000000000a','doz','docena','dozen','count',false),
  ('a0000000-0000-0000-0000-00000000000b','case_30ct','caja 30','case of 30','count',false);

insert into unit_conversions (from_unit_id, to_unit_id, factor) values
  ('a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',1000),        -- kg -> g
  ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001',453.59237),   -- lb -> g
  ('a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001',28.349523125),-- oz -> g
  ('a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001',22679.6185),  -- 50 lb sack -> g
  ('a0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000006',1000),        -- l -> ml
  ('a0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000006',3785.411784), -- gal -> ml
  ('a0000000-0000-0000-0000-00000000000a','a0000000-0000-0000-0000-000000000009',12),          -- doz -> ea
  ('a0000000-0000-0000-0000-00000000000b','a0000000-0000-0000-0000-000000000009',30);          -- case -> ea

-- ---------------------------------------------------------------------
-- Menu categories
-- ---------------------------------------------------------------------
insert into menu_categories (id, business_id, slug, name_es, name_en, sort_order) values
  ('b0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','pan-dulce','Pan Dulce','Sweet Bread',1),
  ('b0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','pasteles','Pasteles y Postres','Cakes & Desserts',2),
  ('b0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','quesadilla','Quesadilla Salvadoreña','Salvadoran Cheese Bread',3),
  ('b0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','pan-salado','Pan Salado','Savory Breads',4),
  ('b0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','hojaldres','Hojaldres','Puff Pastries',5),
  ('b0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','donas-galletas','Donas y Galletas','Donuts & Cookies',6);

-- ---------------------------------------------------------------------
-- Products + variants
-- Names from the client's own PRODUCTS page. PRICES ARE PLACEHOLDERS.
-- ---------------------------------------------------------------------
insert into products (id, business_id, category_id, slug, name_es, name_en, description_es, description_en, available_from, sort_order) values
  ('c0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','concha','Concha','Concha',
   'Pan de levadura suave con costra de azúcar rayada a mano. Sale del horno a las 7 de la mañana.',
   'Soft yeast bread under a hand-scored sugar shell. Out of the oven at 7 AM.','07:00',1),
  ('c0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','pan-dulce-guayaba','Pan Dulce con Guayaba','Guava Sweet Bread',
   'Relleno de guayaba, horneado cada mañana.','Filled with guava, baked every morning.','07:00',2),
  ('c0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','semita','Semita de Levadura','Sweet Yeast Bread',
   'Semita tradicional de levadura.','Traditional sweet yeast bread.','07:00',3),
  ('c0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','marranito','Marranito','Gingerbread Pig Cookie',
   'Galleta de jengibre en forma de cerdito.','Gingerbread cookie shaped like a little pig.',null,4),
  ('c0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000001','oreja','Oreja','Elephant Ear',
   'Hojaldre caramelizado, crujiente por fuera.','Caramelized puff pastry, crisp at the edges.',null,5),

  ('c0000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','tres-leches','Tres Leches','Tres Leches',
   'Bizcocho remojado en leche evaporada, leche condensada y leche entera.',
   'Sponge cake soaked in evaporated milk, condensed milk and whole milk.',null,1),
  ('c0000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','flan','Flan','Flan',
   'Flan de la casa, hecho cada mañana.','House flan, made fresh each morning.',null,2),
  ('c0000000-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','budin-de-pan','Budín de Pan','Bread Pudding',
   'Budín de pan tradicional.','Traditional bread pudding.',null,3),
  ('c0000000-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000002','torta-alemana','Torta Alemana','Pound Cake',
   'Torta alemana, por porción o entera.','Pound cake, by the slice or whole.',null,4),

  ('c0000000-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000003','quesadilla-salvadorena','Quesadilla Salvadoreña','Salvadoran Cheese Bread',
   'Pan de queso salvadoreño. El más pedido de la casa.','Salvadoran cheese bread. The one people drive across town for.',null,1),

  ('c0000000-0000-0000-0000-000000000030','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000004','pan-queso','Pan Queso','Cheese Bread',
   'Pan de queso, pequeño o grande.','Cheese bread, small or large.',null,1),
  ('c0000000-0000-0000-0000-000000000031','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000004','pan-jalapeno','Pan con Queso y Jalapeño','Jalapeño & Cream Cheese Bread',
   'Pan francés con queso crema y jalapeño.','French bread with cream cheese and jalapeño.',null,2),

  ('c0000000-0000-0000-0000-000000000040','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000005','chicharron-guayaba','Chicharrón de Guayaba','Guava Puff Pastry',
   'Hojaldre relleno de guayaba.','Puff pastry filled with guava.',null,1),
  ('c0000000-0000-0000-0000-000000000041','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000005','quesito','Quesito Puertorriqueño','Puerto Rican Cheese Puff',
   'Hojaldre relleno de queso crema dulce.','Puff pastry filled with sweet cream cheese.',null,2),

  ('c0000000-0000-0000-0000-000000000050','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000006','dona','Dona','Donut',
   'Azúcar, chocolate o glaseada.','Sugar, chocolate or glazed.','07:00',1),
  ('c0000000-0000-0000-0000-000000000051','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000006','churro','Churro','Churro',
   'Sencillo, relleno de cajeta o de crema bávara.','Plain, caramel filled, or Bavarian cream.',null,2),
  ('c0000000-0000-0000-0000-000000000052','11111111-1111-1111-1111-111111111111','b0000000-0000-0000-0000-000000000006','polvoron','Polvorón','Mexican Shortbread Cookie',
   'Galleta mexicana de mantequilla.','Mexican butter shortbread cookie.',null,3);

insert into product_variants (id, business_id, product_id, sku, label_es, label_en, price, is_default, track_stock, sort_order) values
  ('d0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','PAN-CONCHA','c/u','each',1.75,true,true,1),
  ('d0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000001','PAN-CONCHA-DOZ','docena','dozen',18.00,false,true,2),
  ('d0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000002','PAN-GUAYABA','c/u','each',2.25,true,false,1),
  ('d0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000003','PAN-SEMITA','c/u','each',1.75,true,false,1),
  ('d0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000004','PAN-MARRANITO','c/u','each',1.75,true,false,1),
  ('d0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000005','PAN-OREJA','c/u','each',1.95,true,false,1),

  ('d0000000-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000010','PST-3LECHE-SLICE','porción','slice',5.99,true,true,1),
  ('d0000000-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000010','PST-3LECHE-OREO','porción Oreo','Oreo slice',6.50,false,true,2),
  ('d0000000-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000010','PST-3LECHE-BANANA','porción plátano','banana pudding slice',7.50,false,true,3),
  ('d0000000-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000011','PST-FLAN','porción','portion',6.99,true,true,1),
  ('d0000000-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000012','PST-BUDIN','porción','portion',3.25,true,false,1),
  ('d0000000-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000013','PST-ALEMANA','porción','slice',3.99,true,false,1),

  ('d0000000-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000020','QSD-PEQ','pequeña','small',2.50,false,false,1),
  ('d0000000-0000-0000-0000-000000000021','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000020','QSD-CUARTO','1/4','quarter',4.25,false,false,2),
  ('d0000000-0000-0000-0000-000000000022','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000020','QSD-MEDIA','1/2','half',7.99,false,true,3),
  ('d0000000-0000-0000-0000-000000000023','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000020','QSD-ENTERA','entera','full',13.99,true,true,4),

  ('d0000000-0000-0000-0000-000000000030','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000030','SAL-PANQUESO-P','pequeño','small',2.50,true,false,1),
  ('d0000000-0000-0000-0000-000000000031','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000030','SAL-PANQUESO-G','grande','large',4.50,false,false,2),
  ('d0000000-0000-0000-0000-000000000032','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000031','SAL-JALAPENO','c/u','each',2.75,true,false,1),

  ('d0000000-0000-0000-0000-000000000040','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000040','HOJ-GUAYABA','c/u','each',2.50,true,false,1),
  ('d0000000-0000-0000-0000-000000000041','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000041','HOJ-QUESITO','c/u','each',2.50,true,false,1),

  ('d0000000-0000-0000-0000-000000000050','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000050','DON-SENCILLA','c/u','each',1.50,true,true,1),
  ('d0000000-0000-0000-0000-000000000051','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000050','DON-DOZ','docena','dozen',15.00,false,true,2),
  ('d0000000-0000-0000-0000-000000000052','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000051','DON-CHURRO','c/u','each',2.25,true,false,1),
  ('d0000000-0000-0000-0000-000000000053','11111111-1111-1111-1111-111111111111','c0000000-0000-0000-0000-000000000052','DON-POLVORON','c/u','each',1.50,true,false,1);

-- ---------------------------------------------------------------------
-- Ingredients (DEMO COSTS)
-- ---------------------------------------------------------------------
insert into ingredients (id, business_id, sku, name_es, name_en, stock_unit_id, purchase_unit_id, purchase_pack_qty, last_unit_cost, reorder_point, par_level, is_perishable, shelf_life_days) values
  ('e0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','ING-HARINA','Harina de trigo','Bread flour',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005',22679.6185,0.0011,45000,180000,false,null),
  ('e0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','ING-AZUCAR','Azúcar','Granulated sugar',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005',22679.6185,0.0013,22000,90000,false,null),
  ('e0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','ING-MANTEQUILLA','Mantequilla','Butter',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0095,9000,27000,true,60),
  ('e0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','ING-HUEVO','Huevos','Eggs',
   'a0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-00000000000b',30,0.2400,180,900,true,28),
  ('e0000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','ING-LECHE','Leche entera','Whole milk',
   'a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000008',3785.411784,0.0013,7500,30000,true,10),
  ('e0000000-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','ING-LECHE-COND','Leche condensada','Condensed milk',
   'a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000007',1000,0.0042,4000,16000,false,null),
  ('e0000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','ING-LECHE-EVAP','Leche evaporada','Evaporated milk',
   'a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000007',1000,0.0034,4000,16000,false,null),
  ('e0000000-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','ING-QUESO','Queso duro','Hard cheese',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0132,7000,23000,true,45),
  ('e0000000-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','ING-GUAYABA','Pasta de guayaba','Guava paste',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0068,3000,11000,false,null),
  ('e0000000-0000-0000-0000-00000000000a','11111111-1111-1111-1111-111111111111','ING-LEVADURA','Levadura','Yeast',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0088,900,3600,false,null),
  ('e0000000-0000-0000-0000-00000000000b','11111111-1111-1111-1111-111111111111','ING-CANELA','Canela molida','Ground cinnamon',
   'a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003',453.59237,0.0210,450,1800,false,null),
  ('e0000000-0000-0000-0000-00000000000c','11111111-1111-1111-1111-111111111111','ING-CAJA-PAST','Caja de pastel 10"','10" cake box',
   'a0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-00000000000b',30,0.6500,60,300,false,null);

-- ---------------------------------------------------------------------
-- Recipes / BOM (DEMO QUANTITIES)
-- ---------------------------------------------------------------------
insert into recipes (id, business_id, variant_id, name_es, name_en, yield_qty, yield_unit_id, labor_minutes) values
  ('f0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000001',
   'Masa de concha — tanda','Concha dough — batch',48,'a0000000-0000-0000-0000-000000000009',95),
  ('f0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000010',
   'Tres leches — molde','Tres leches — sheet',24,'a0000000-0000-0000-0000-000000000009',75),
  ('f0000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','d0000000-0000-0000-0000-000000000023',
   'Quesadilla Salvadoreña entera','Full Salvadoran cheese bread',6,'a0000000-0000-0000-0000-000000000009',60),
  -- Sub-recipe: no variant_id, consumed by others.
  ('f0000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111',null,
   'Costra de azúcar','Sugar shell topping',1200,'a0000000-0000-0000-0000-000000000001',20);

insert into recipe_items (recipe_id, ingredient_id, sub_recipe_id, qty, unit_id, sort_order) values
  -- Concha dough (48 conchas)
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001',null,3000,'a0000000-0000-0000-0000-000000000001',1),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002',null,600,'a0000000-0000-0000-0000-000000000001',2),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000003',null,1.5,'a0000000-0000-0000-0000-000000000003',3),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000004',null,12,'a0000000-0000-0000-0000-000000000009',4),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000005',null,1.2,'a0000000-0000-0000-0000-000000000007',5),
  ('f0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-00000000000a',null,90,'a0000000-0000-0000-0000-000000000001',6),
  ('f0000000-0000-0000-0000-000000000001',null,'f0000000-0000-0000-0000-000000000004',960,'a0000000-0000-0000-0000-000000000001',7),

  -- Sugar shell sub-recipe (yields 1200 g)
  ('f0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000002',null,500,'a0000000-0000-0000-0000-000000000001',1),
  ('f0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000003',null,300,'a0000000-0000-0000-0000-000000000001',2),
  ('f0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000001',null,400,'a0000000-0000-0000-0000-000000000001',3),

  -- Tres leches (24 slices)
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001',null,900,'a0000000-0000-0000-0000-000000000001',1),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000002',null,750,'a0000000-0000-0000-0000-000000000001',2),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000004',null,18,'a0000000-0000-0000-0000-000000000009',3),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000006',null,1.2,'a0000000-0000-0000-0000-000000000007',4),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000007',null,1.2,'a0000000-0000-0000-0000-000000000007',5),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000005',null,600,'a0000000-0000-0000-0000-000000000006',6),
  ('f0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-00000000000c',null,1,'a0000000-0000-0000-0000-000000000009',7),

  -- Quesadilla Salvadoreña (6 full)
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000001',null,1400,'a0000000-0000-0000-0000-000000000001',1),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000008',null,2.2,'a0000000-0000-0000-0000-000000000003',2),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000002',null,900,'a0000000-0000-0000-0000-000000000001',3),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000003',null,1.1,'a0000000-0000-0000-0000-000000000003',4),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000004',null,14,'a0000000-0000-0000-0000-000000000009',5),
  ('f0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000005',null,500,'a0000000-0000-0000-0000-000000000006',6);

-- ---------------------------------------------------------------------
-- Vendors
-- ---------------------------------------------------------------------
insert into vendors (id, business_id, name, contact_name, phone, lead_time_days, min_order) values
  ('01000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Restaurant Depot','Counter','(804) 555-0111',1,250.00),
  ('01000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Dairy distributor','Route driver','(804) 555-0122',2,150.00),
  ('01000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Packaging supplier','Sales rep','(804) 555-0133',5,300.00);

insert into vendor_ingredients (vendor_id, ingredient_id, purchase_unit_id, purchase_pack_qty, pack_price, is_preferred) values
  ('01000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005',22679.6185,24.95,true),
  ('01000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000005',22679.6185,29.50,true),
  ('01000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',453.59237,4.31,true),
  ('01000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-00000000000b',30,7.20,true),
  ('01000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000008',3785.411784,4.92,true),
  ('01000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-00000000000c','a0000000-0000-0000-0000-00000000000b',30,19.50,true);

-- ---------------------------------------------------------------------
-- Opening inventory (a receipt for each ingredient)
-- ---------------------------------------------------------------------
insert into inventory_transactions (business_id, location_id, ingredient_id, txn_type, qty_delta, unit_cost, reference_type, note)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  id, 'receipt', par_level, last_unit_cost, 'seed', 'Opening count — demo seed'
from ingredients
where business_id = '11111111-1111-1111-1111-111111111111';

-- Draw some down so the low-stock queue has something in it.
insert into inventory_transactions (business_id, location_id, ingredient_id, txn_type, qty_delta, unit_cost, reference_type, note) values
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','e0000000-0000-0000-0000-000000000003','production_draw',-19000,0.0095,'seed','Week of production'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','e0000000-0000-0000-0000-00000000000b','production_draw',-1400,0.0210,'seed','Week of production'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','e0000000-0000-0000-0000-000000000004','production_draw',-740,0.2400,'seed','Week of production');

-- ---------------------------------------------------------------------
-- Cake configurator options
-- ---------------------------------------------------------------------
insert into cake_sizes (id, business_id, label_es, label_en, servings_min, servings_max, base_price, min_lead_hours, max_tiers, sort_order) values
  ('02000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','1/4 de plancha','Quarter sheet',15,20,45.00,48,1,1),
  ('02000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','1/2 plancha','Half sheet',30,40,75.00,48,1,2),
  ('02000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Plancha entera','Full sheet',60,80,135.00,72,1,3),
  ('02000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','2 pisos','Two tier',50,70,195.00,168,2,4),
  ('02000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','3 pisos','Three tier',90,120,325.00,168,3,5);

insert into cake_options (business_id, option_group, slug, label_es, label_en, price_delta, extra_lead_hours, sort_order) values
  ('11111111-1111-1111-1111-111111111111','flavor','tres-leches','Tres leches','Tres leches',0,0,1),
  ('11111111-1111-1111-1111-111111111111','flavor','vainilla','Vainilla','Vanilla',0,0,2),
  ('11111111-1111-1111-1111-111111111111','flavor','chocolate','Chocolate','Chocolate',0,0,3),
  ('11111111-1111-1111-1111-111111111111','flavor','marmol','Mármol','Marble',5.00,0,4),
  ('11111111-1111-1111-1111-111111111111','filling','fresa','Fresa','Strawberry',0,0,1),
  ('11111111-1111-1111-1111-111111111111','filling','durazno','Durazno','Peach',0,0,2),
  ('11111111-1111-1111-1111-111111111111','filling','cajeta','Cajeta','Dulce de leche',5.00,0,3),
  ('11111111-1111-1111-1111-111111111111','filling','guayaba','Guayaba','Guava',5.00,0,4),
  ('11111111-1111-1111-1111-111111111111','frosting','crema','Crema batida','Whipped cream',0,0,1),
  ('11111111-1111-1111-1111-111111111111','frosting','buttercream','Buttercream','Buttercream',0,0,2),
  ('11111111-1111-1111-1111-111111111111','frosting','fondant','Fondant','Fondant',35.00,72,3),
  ('11111111-1111-1111-1111-111111111111','finish','sencillo','Sencillo','Simple',0,0,1),
  ('11111111-1111-1111-1111-111111111111','finish','flores','Flores de crema','Piped flowers',15.00,0,2),
  ('11111111-1111-1111-1111-111111111111','finish','foto','Foto comestible','Edible photo',20.00,24,3);

insert into lead_time_rules (business_id, applies_to, min_tiers, min_servings, requires_finish_slug, min_lead_hours, max_advance_days, priority) values
  ('11111111-1111-1111-1111-111111111111','cake',null,null,null,48,180,0),
  ('11111111-1111-1111-1111-111111111111','cake',null,60,null,72,180,10),
  ('11111111-1111-1111-1111-111111111111','cake',2,null,null,168,365,20),
  ('11111111-1111-1111-1111-111111111111','cake',null,null,'foto',72,180,15),
  ('11111111-1111-1111-1111-111111111111','pickup',null,null,null,12,30,0),
  ('11111111-1111-1111-1111-111111111111','catering',null,null,null,72,180,0);

insert into pickup_capacity_rules (business_id, location_id, applies_to, dow, window_start, window_end, slot_minutes, max_per_slot)
select '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','pickup', d, '07:00','19:00',30,12
from generate_series(0,6) as d;

insert into pickup_capacity_rules (business_id, location_id, applies_to, dow, window_start, window_end, slot_minutes, max_per_slot)
select '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','cake', d, '09:00','18:00',60,4
from generate_series(0,6) as d;

-- ---------------------------------------------------------------------
-- Expense categories
-- ---------------------------------------------------------------------
insert into expense_categories (business_id, slug, name_es, name_en, is_cogs, is_labor, sort_order) values
  ('11111111-1111-1111-1111-111111111111','ingredientes','Ingredientes','Ingredients',true,false,1),
  ('11111111-1111-1111-1111-111111111111','empaque','Empaque','Packaging',true,false,2),
  ('11111111-1111-1111-1111-111111111111','nomina','Nómina','Payroll',false,true,3),
  ('11111111-1111-1111-1111-111111111111','renta','Renta','Rent',false,false,4),
  ('11111111-1111-1111-1111-111111111111','servicios','Servicios','Utilities',false,false,5),
  ('11111111-1111-1111-1111-111111111111','equipo','Equipo y reparación','Equipment & repair',false,false,6),
  ('11111111-1111-1111-1111-111111111111','marketing','Publicidad','Marketing',false,false,7),
  ('11111111-1111-1111-1111-111111111111','seguro','Seguro','Insurance',false,false,8),
  ('11111111-1111-1111-1111-111111111111','combustible','Combustible y reparto','Fuel & delivery',false,false,9);

-- ---------------------------------------------------------------------
-- Wholesale
-- ---------------------------------------------------------------------
insert into price_lists (id, business_id, name, is_default) values
  ('03000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Mayoreo estándar',true);

insert into price_list_items (price_list_id, variant_id, unit_price, case_qty, min_qty) values
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',0.95,24,24),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000003',1.20,24,24),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000004',0.95,24,24),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000023',8.50,6,6),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000040',1.35,24,24),
  ('03000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000050',0.80,36,36);

insert into wholesale_accounts (id, business_id, store_name, contact_name, email, phone, street1, city, region, postal_code, price_list_id, delivery_dow, delivery_route, credit_terms_days, status, approved_at) values
  ('04000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Tienda La Esperanza','Gerente','esperanza@example.com','(804) 555-0201','1200 Hull Street','Richmond','VA','23224','03000000-0000-0000-0000-000000000001',2,'Richmond South',14,'approved',now() - interval '2 years'),
  ('04000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Supermercado El Progreso','Gerente','progreso@example.com','(804) 555-0202','450 Main Street','Petersburg','VA','23803','03000000-0000-0000-0000-000000000001',4,'Tri-Cities',14,'approved',now() - interval '3 years'),
  ('04000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Mercado Del Valle','Gerente','delvalle@example.com','(757) 555-0203','88 Ocean Highway','Onley','VA','23418','03000000-0000-0000-0000-000000000001',5,'Eastern Shore',21,'approved',now() - interval '1 year'),
  ('04000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Carniceria Los Primos','Gerente','primos@example.com','(252) 555-0204','15 Elizabeth Street','Elizabeth City','NC','27909',null,null,null,0,'pending',null);

insert into standing_orders (id, business_id, wholesale_account_id, dow) values
  ('05000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000001',2),
  ('05000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000002',4);

insert into standing_order_items (standing_order_id, variant_id, qty) values
  ('05000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',96),
  ('05000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000040',48),
  ('05000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000023',12),
  ('05000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001',72),
  ('05000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000050',72);

-- ---------------------------------------------------------------------
-- Daily stock for the next 14 days (tracked variants only)
-- ---------------------------------------------------------------------
insert into daily_stock (business_id, location_id, variant_id, for_date, qty_available)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  pv.id,
  d::date,
  case pv.sku
    when 'PAN-CONCHA'         then 180
    when 'PAN-CONCHA-DOZ'     then 15
    when 'PST-3LECHE-SLICE'   then 48
    when 'PST-3LECHE-OREO'    then 24
    when 'PST-3LECHE-BANANA'  then 24
    when 'PST-FLAN'           then 30
    when 'QSD-MEDIA'          then 20
    when 'QSD-ENTERA'         then 18
    when 'DON-SENCILLA'       then 120
    when 'DON-DOZ'            then 10
    else 40
  end
from product_variants pv
cross join generate_series(current_date, current_date + interval '13 days', interval '1 day') as d
where pv.track_stock and pv.business_id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
insert into customers (id, business_id, email, phone, full_name, locale, email_opt_in, sms_opt_in, sms_opt_in_at, is_vip, lifetime_orders, lifetime_value) values
  ('06000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','maria@example.com','(804) 555-0301','María Hernández','es',true,true,now() - interval '400 days',true,23,1240.55),
  ('06000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','james@example.com','(804) 555-0302','James Whitfield','en',true,false,null,false,4,89.40),
  ('06000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','rosa@example.com','(804) 555-0303','Rosa Martínez','es',true,true,now() - interval '90 days',false,9,415.20),
  ('06000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','dan@example.com','(804) 555-0304','Danielle Cole','en',false,false,null,false,1,13.99);

-- ---------------------------------------------------------------------
-- A week of demo orders via the race-safe RPC (so reservations are real)
-- ---------------------------------------------------------------------
do $$
declare
  v_order uuid;
  v_pickup timestamptz;
  i integer;
begin
  for i in 0..6 loop
    v_pickup := (((current_date + i)::timestamp + time '10:00') at time zone 'America/New_York');

    v_order := place_order(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'pickup', 'María Hernández', '(804) 555-0301', 'maria@example.com', 'es',
      v_pickup,
      jsonb_build_array(
        jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000001','qty', 6 + i),
        jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000010','qty', 2)
      ),
      'Sin nuez por favor', 'Alergia a la nuez'
    );
    update orders set status = 'confirmed', customer_id = '06000000-0000-0000-0000-000000000001',
                      confirmed_at = now(), amount_paid = total
     where id = v_order;

    v_order := place_order(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'pickup', 'James Whitfield', '(804) 555-0302', 'james@example.com', 'en',
      v_pickup + interval '3 hours',
      jsonb_build_array(
        jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000023','qty', 1),
        jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000050','qty', 4)
      ),
      null, null
    );
    update orders set status = 'confirmed', customer_id = '06000000-0000-0000-0000-000000000002',
                      confirmed_at = now(), amount_paid = total
     where id = v_order;
  end loop;
end;
$$;

-- One cake order with a deposit, so the cake pipeline demos too.
do $$
declare v_order uuid;
begin
  v_order := place_order(
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'cake', 'Rosa Martínez', '(804) 555-0303', 'rosa@example.com', 'es',
    (((current_date + 9)::timestamp + time '14:00') at time zone 'America/New_York'),
    jsonb_build_array(jsonb_build_object('variant_id','d0000000-0000-0000-0000-000000000010','qty',1)),
    'Quinceañera de Sofía — listones color vino', null, 'web'
  );

  update orders
     set status = 'confirmed', customer_id = '06000000-0000-0000-0000-000000000003',
         subtotal = 195.00, tax = 11.70, total = 206.70,
         deposit_due = 62.01, amount_paid = 62.01,
         occasion = 'quinceañera', confirmed_at = now()
   where id = v_order;

  insert into cake_order_details (order_id, size_id, tiers, inscription, inscription_lang, color_notes, serves_estimate)
  values (v_order, '02000000-0000-0000-0000-000000000004', 2,
          'Felices 15, Sofía', 'es', 'Vino y oro', 60);
end;
$$;

-- ---------------------------------------------------------------------
-- 90 days of sales + expenses so the P&L and dashboards have shape
-- ---------------------------------------------------------------------
insert into sales_days (
  business_id, location_id, business_date, gross_sales, tax_collected,
  cash_expected, cash_counted, card_total, online_total, wholesale_total,
  marketplace_total, marketplace_fees, transaction_count, closed_at
)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  d::date,
  base, round(base * 0.06, 2),
  round(base * 0.30, 2), round(base * 0.30, 2) - (case when extract(day from d)::int % 11 = 0 then 4.25 else 0 end),
  round(base * 0.46, 2), round(base * 0.09, 2), round(base * 0.12, 2),
  round(base * 0.03, 2), round(base * 0.03 * 0.25, 2),
  (base / 14)::int,
  d + interval '21 hours'
from (
  select d,
         round((1850
           + case extract(dow from d)::int when 0 then 620 when 6 then 840 when 5 then 410 else 0 end
           + ((extract(doy from d)::int * 37) % 260))::numeric, 2) as base
  from generate_series(current_date - interval '89 days', current_date - interval '1 day', interval '1 day') as d
) s;

-- Ingredients + packaging land WEEKLY and scale with sales, so food-cost %
-- lands in the 26-32% band a real bakery actually runs at.
insert into expenses (business_id, location_id, category_id, spent_on, amount, method, description)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  ec.id,
  w.week_start,
  case ec.slug
    when 'ingredientes' then round(w.week_sales * 0.265, 2)
    when 'empaque'      then round(w.week_sales * 0.021, 2)
  end,
  'card'::expense_method,
  ec.name_en || ' — weekly purchase (demo)'
from (
  select date_trunc('week', business_date)::date as week_start,
         sum(gross_sales) as week_sales
    from sales_days
   group by 1
) w
cross join expense_categories ec
where ec.business_id = '11111111-1111-1111-1111-111111111111'
  and ec.slug in ('ingredientes','empaque');

-- Fixed and periodic overheads land monthly.
insert into expenses (business_id, location_id, category_id, spent_on, amount, method, description)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  ec.id,
  m::date,
  case ec.slug
    when 'nomina'      then 17800.00
    when 'renta'       then 5200.00
    when 'servicios'   then 2150.00
    when 'equipo'      then 640.00
    when 'marketing'   then 450.00
    when 'seguro'      then 780.00
    when 'combustible' then 1250.00
  end,
  (case ec.slug when 'nomina' then 'ach' when 'renta' then 'check' else 'card' end)::expense_method,
  ec.name_en || ' — monthly (demo)'
from expense_categories ec
cross join generate_series(
  date_trunc('month', current_date - interval '89 days'),
  date_trunc('month', current_date),
  interval '1 month'
) as m
where ec.business_id = '11111111-1111-1111-1111-111111111111'
  and ec.slug in ('nomina','renta','servicios','equipo','marketing','seguro','combustible');

insert into labor_costs (business_id, location_id, period_start, period_end, total_hours, gross_wages, payroll_taxes, headcount)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  d::date,
  (d + interval '6 days')::date,
  462, 4100.00, 380.00, 11
from generate_series(
  date_trunc('week', current_date - interval '89 days'),
  date_trunc('week', current_date - interval '7 days'),
  interval '1 week'
) as d;

-- ---------------------------------------------------------------------
-- Waste log (a week), so the shrink report is not empty
-- ---------------------------------------------------------------------
insert into waste_log (business_id, location_id, variant_id, qty, unit_id, reason, est_value, occurred_at)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'd0000000-0000-0000-0000-000000000001',
  (6 + (extract(doy from d)::int % 9)),
  'a0000000-0000-0000-0000-000000000009',
  'end_of_day',
  round((6 + (extract(doy from d)::int % 9)) * 1.75, 2),
  d + interval '20 hours'
from generate_series(current_date - interval '6 days', current_date - interval '1 day', interval '1 day') as d;

-- ---------------------------------------------------------------------
-- Wholesale invoices — so the aging report has real buckets
-- ---------------------------------------------------------------------
insert into invoices (id, business_id, wholesale_account_id, invoice_number, status, issue_date, due_date, subtotal, tax, total, amount_paid)
values
  ('07000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000001',
   'INV-005001','paid',    current_date - 62, current_date - 48, 486.40, 0, 486.40, 486.40),
  ('07000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000001',
   'INV-005002','sent',    current_date - 20, current_date - 6,  512.75, 0, 512.75, 0),
  ('07000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000002',
   'INV-005003','partial', current_date - 55, current_date - 41, 738.20, 0, 738.20, 300.00),
  ('07000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000003',
   'INV-005004','overdue', current_date - 118, current_date - 97, 1042.60, 0, 1042.60, 0),
  ('07000000-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','04000000-0000-0000-0000-000000000002',
   'INV-005005','sent',    current_date - 5,  current_date + 9,  655.00, 0, 655.00, 0);

insert into invoice_items (invoice_id, description, qty, unit_price, line_total) values
  ('07000000-0000-0000-0000-000000000001','Conchas — caso 24', 96, 0.95, 91.20),
  ('07000000-0000-0000-0000-000000000001','Quesadilla entera', 12, 8.50, 102.00),
  ('07000000-0000-0000-0000-000000000002','Conchas — caso 24', 96, 0.95, 91.20),
  ('07000000-0000-0000-0000-000000000003','Donas — caso 36', 144, 0.80, 115.20),
  ('07000000-0000-0000-0000-000000000004','Chicharrón de guayaba', 96, 1.35, 129.60),
  ('07000000-0000-0000-0000-000000000005','Conchas — caso 24', 72, 0.95, 68.40);

insert into invoice_payments (invoice_id, amount, method, reference, received_at) values
  ('07000000-0000-0000-0000-000000000001', 486.40, 'check','CK 4412', now() - interval '46 days'),
  ('07000000-0000-0000-0000-000000000003', 300.00, 'check','CK 8890', now() - interval '30 days');

-- ---------------------------------------------------------------------
-- Announcement
-- ---------------------------------------------------------------------
insert into announcements (business_id, body_es, body_en, link_url) values
  ('11111111-1111-1111-1111-111111111111',
   'Pedidos de pasteles de quinceañera: 7 días de anticipación.',
   'Quinceañera cake orders: 7 days'' notice.',
   '/es/pasteles/quinceanera');

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
insert into settings (business_id, key, value) values
  ('11111111-1111-1111-1111-111111111111','deposit_policy',
   '{"cake_deposit_pct":30,"cancel_full_refund_hours":72,"cancel_partial_refund_hours":48,"partial_refund_pct":50}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','notifications',
   '{"reminder_email_hours":24,"reminder_sms_hours":3,"quiet_hours_start":"21:00","quiet_hours_end":"08:00"}'::jsonb),
  ('11111111-1111-1111-1111-111111111111','marketplace_rates',
   '{"doordash_delivery_pct":25,"doordash_pickup_pct":15,"grubhub_pct":25,"stripe_pct":2.9,"stripe_fixed":0.30,"note":"CONFIRM against the client merchant statements"}'::jsonb);

commit;
```

## Step 3 — Generate types

```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

Every query in the app is typed against this file. No `any` on a Supabase result, anywhere.

## Step 4 — Prove it works

Run these and confirm the stated outputs before moving to PROMPT 03.

```sql
-- 1. Unit conversion, both directions and the failure case
select convert_qty(1,
  (select id from units where code='lb'),
  (select id from units where code='g'));            -- expect 453.59237

do $$ begin
  perform convert_qty(1,
    (select id from units where code='g'),
    (select id from units where code='ml'));
  raise exception 'FAIL: impossible conversion was allowed';
exception when sqlstate '22023' then
  raise notice 'PASS: impossible conversion refused';
end $$;

-- 2. Food cost incl. sub-recipe rollup
select round(variant_food_cost(
  (select id from product_variants where sku='PAN-CONCHA')), 4);   -- expect 0.3943

-- 3. Margin view flags anything sold at a loss
select name_en, price, food_cost, margin_pct, margin_flag
from v_variant_margin where food_cost is not null order by margin_pct;

-- 4. P&L
select month, revenue, cogs, labor, net_profit, food_cost_pct, prime_cost_pct
from v_pnl_monthly order by month;

-- 5. Low-stock queue
select name_en, on_hand, reorder_point from v_ingredient_on_hand where needs_reorder;

-- 6. Wholesale aging — expect buckets: paid, current, 1_30, 31_60, over_90
select store_name, invoice_number, balance, aging_bucket from v_wholesale_aging;
```

### The concurrency test — you must run this

This is the one that matters. Set stock to 5, then fire 8 concurrent buyers of 2 each from separate connections:

```bash
psql "$DATABASE_URL" -c "
  update daily_stock set qty_available=5, qty_reserved=0
   where variant_id=(select id from product_variants where sku='PAN-CONCHA')
     and for_date = current_date + 1;"

for i in $(seq 1 8); do
  psql "$DATABASE_URL" -tAc "
    select place_order(
      (select id from businesses limit 1),
      (select id from locations limit 1),
      'pickup','Buyer $i','(804) 555-90$i','b$i@example.com','es',
      (((current_date + 1)::timestamp + time '10:00') at time zone 'America/New_York'),
      jsonb_build_array(jsonb_build_object(
        'variant_id',(select id from product_variants where sku='PAN-CONCHA'),'qty',2)));
  " > /tmp/buyer.$i 2>&1 &
done
wait

psql "$DATABASE_URL" -c "
  select qty_available, qty_reserved, qty_available - qty_reserved as remaining
    from daily_stock
   where variant_id=(select id from product_variants where sku='PAN-CONCHA')
     and for_date=current_date+1;"
```

**Required result:** exactly 2 orders created, 6 rejected, `available 5 / reserved 4 / remaining 1`. If more than 2 orders were created, the transaction is not safe and you must stop and fix it before continuing. Do not proceed with a partial pass.

### The RLS test — you must run this

Create a second business and a staff member attached to it, then confirm that staff member sees **zero** rows from the first business:

```sql
insert into businesses (legal_name, dba_name, slug) values ('Other Bakery','Other','other-bakery');
-- create an auth user for the other business, attach a staff_members row,
-- then authenticate as that user and run:
select count(*) from orders;        -- must be 0
select count(*) from ingredients;   -- must be 0
select count(*) from sales_days;    -- must be 0
select count(*) from order_access_tokens;  -- must be 0 for every role
```

## Acceptance criteria

- [ ] Schema and seed both apply with zero errors.
- [ ] `select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;` returns **0**.
- [ ] All six verification queries return the stated shapes.
- [ ] The concurrency test creates exactly 2 orders.
- [ ] The cross-tenant RLS test returns 0 rows on every table.
- [ ] `database.types.ts` is generated and the app compiles against it.

## What NOT to do

- Do **not** store on-hand inventory as a mutable column. It is always the sum of `inventory_transactions`.
- Do **not** use `float`, `real`, or `double precision` for money or quantity. Money is `numeric(12,2)`; quantity is `numeric(14,4)`.
- Do **not** hard-code a unit conversion in TypeScript. Conversions are rows in `unit_conversions`.
- Do **not** check stock in application code and then write. The check and the write happen inside `place_order`, in one transaction, under `FOR UPDATE`.
- Do **not** expose `order_access_tokens` to any client role. Guest order lookup goes exclusively through `get_order_by_token`.
- Do **not** store a raw magic-link token. Only the SHA-256 hash.
- Do **not** loosen an RLS policy to make a query work. If a query needs broader access, it belongs in a `security definer` function with an explicit guard.
