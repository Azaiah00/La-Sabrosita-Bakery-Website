-- =====================================================================
-- 0002 — pickup slot capacity
--
-- NOT APPLIED IN DEMO MODE. There is no database yet; the demo adapter
-- enforces the same guarantee by doing the count and the insert inside
-- one synchronous mutation (see placeOrder in src/lib/data/demo/index.ts
-- and the 10-way race test in slot-race.test.ts). This file goes live
-- with the rest of the schema after the sale.
-- =====================================================================

-- The counting query runs on every availability request and on every
-- submit. Partial, because cancelled orders must not hold capacity.
create index if not exists orders_pickup_slot_idx
  on orders (location_id, order_type, pickup_at)
  where status not in ('cancelled','no_show','refunded');

-- Advisory-lock helper so two concurrent bookings of the same slot
-- serialize instead of both reading "one seat left".
--
-- The lock is TRANSACTION-scoped, so it releases on commit or rollback
-- with nothing to clean up. Call this inside the same transaction as the
-- order insert — checking first and inserting afterwards is exactly the
-- bug it exists to prevent.
create or replace function claim_pickup_slot(
  p_location_id uuid,
  p_order_type  order_type,
  p_slot_start  timestamptz,
  p_slot_minutes integer,
  p_max_per_slot integer
) returns boolean
language plpgsql as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_location_id::text || p_order_type::text || p_slot_start::text, 0)
  );

  select count(*) into v_count
    from orders
   where location_id = p_location_id
     and order_type  = p_order_type
     and pickup_at  >= p_slot_start
     and pickup_at   < p_slot_start + make_interval(mins => p_slot_minutes)
     and status not in ('cancelled','no_show','refunded');

  return v_count < p_max_per_slot;
end;
$$;
