'use server'

import { db } from '@/lib/data'
import { SlotFullError } from '@/lib/data/demo'
import { cakeOrderSchema } from '@/lib/schema/cake-order'
import { computeCakePrice } from '@/lib/availability'
import { getDepositPolicy } from '@/lib/cakes'
import { businessDate, formatLocal } from '@/lib/datetime'
import type { CakeSize, CakeOption } from '@/lib/data/types'

export type SubmitResult =
  | { ok: true; orderNumber: string; orderId: string; payHref: string; isQuote: boolean }
  | { ok: false; error: 'invalid'; issues: string[] }
  | { ok: false; error: 'slot_taken'; alternatives: { startsAtUtc: string; label: string }[] }
  | { ok: false; error: 'lead_time'; requiredHours: number }

/**
 * submitCakeOrder — one path in, everything re-checked.
 *
 * 1. Re-validate the whole payload with Zod, server-side.
 * 2. RECOMPUTE the price from cake_sizes + cake_options. The client never
 *    sends a total, and if it did it would be discarded.
 * 3. Re-run availability for the chosen slot. A slot that was free when
 *    the page loaded may not be free now.
 * 4. Claim the slot and insert in ONE transaction — `placeOrder` does the
 *    capacity check and the write together, never check-then-insert.
 * 5. A wedding creates a draft quote and charges nothing.
 *
 * No confirmation email or SMS is composed here. An order is not
 * confirmed until the deposit clears, and in demo mode that is the pay
 * page — see `pedido/pagar/actions.ts`.
 */
export async function submitCakeOrder(raw: unknown): Promise<SubmitResult> {
  const parsed = cakeOrderSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid',
      issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    }
  }
  const input = parsed.data

  const [sizes, options, business, policy] = await Promise.all([
    db.getCakeSizes(),
    db.getCakeOptions(),
    db.getBusiness(),
    getDepositPolicy(),
  ])

  const size = sizes.find((s: CakeSize) => s.id === input.sizeId)
  if (!size) return { ok: false, error: 'invalid', issues: ['sizeId: unknown size'] }

  // Unknown option slugs are dropped rather than trusted.
  const knownSlugs = new Set(options.map((o: CakeOption) => o.slug))
  const optionSlugs = input.optionSlugs.filter((s) => knownSlugs.has(s))

  // 2 — the server's number is the only number.
  const price = computeCakePrice({
    sizes,
    options,
    sizeId: input.sizeId,
    optionSlugs,
    taxRate: business.taxRate,
    depositPct: policy.cakeDepositPct,
  })

  // 3 — re-check availability for the exact chosen instant.
  const now = new Date()
  const pickupDate = businessDate(new Date(input.pickupAt))
  const availability = await db.getAvailability({
    orderType: 'cake',
    now,
    fromDate: pickupDate,
    days: 1,
    sizeId: input.sizeId,
    tiers: input.tiers,
    servings: size.servingsMax,
    optionSlugs,
  })

  const day = availability.dates[0]
  const slot = day?.slots.find((s) => s.startsAtUtc === input.pickupAt)

  if (!slot || !slot.isAvailable) {
    if (new Date(input.pickupAt).getTime() < new Date(availability.earliestLegal).getTime()) {
      return { ok: false, error: 'lead_time', requiredHours: availability.requiredLeadHours }
    }
    return { ok: false, error: 'slot_taken', alternatives: await nearestAlternatives(input, size) }
  }

  // 4 — claim and insert together.
  try {
    const order = await db.placeOrder({
      orderType: 'cake',
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail ?? null,
      locale: input.locale,
      pickupAt: input.pickupAt,
      // The cake itself is the line; the configurator's price is authoritative.
      items: [{ variantId: cakeVariantId(), qty: 1 }],
      customerNote: buildSpecNote(input, options),
      allergyNote: input.allergyNote ?? null,
      occasion: input.occasion,
      source: 'web',
      // Stamped at the moment of consent, never inferred from a boolean.
      smsOptInAt: input.smsOptIn ? now.toISOString() : null,
    })

    // Overwrite the money with the server-computed cake price.
    await db.setCakeOrderPricing(order.id, {
      subtotalCents: price.subtotalCents,
      taxCents: price.taxCents,
      totalCents: price.totalCents,
      depositDueCents: input.occasion === 'boda' ? 0 : price.depositCents,
      sizeId: input.sizeId,
      tiers: input.tiers,
      inscription: input.inscription ?? null,
      inscriptionLang: input.inscriptionLang,
      colorNotes: input.colorNotes ?? null,
      servesEstimate: size.servingsMax,
    })

    // A wedding is a quote conversation, not an immediate charge.
    const isQuote = input.occasion === 'boda'
    if (isQuote) {
      await db.setOrderStatus(order.id, 'draft')
    }

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      isQuote,
      payHref: `/${input.locale}/pedido/pagar?pedido=${order.id}`,
    }
  } catch (e) {
    if (e instanceof SlotFullError) {
      return { ok: false, error: 'slot_taken', alternatives: await nearestAlternatives(input, size) }
    }
    throw e
  }

  /** The three nearest bookable slots, so a conflict is not a dead end. */
  async function nearestAlternatives(
    payload: typeof input,
    chosen: CakeSize,
  ): Promise<{ startsAtUtc: string; label: string }[]> {
    const forward = await db.getAvailability({
      orderType: 'cake',
      now,
      fromDate: businessDate(new Date(payload.pickupAt)),
      days: 14,
      sizeId: payload.sizeId,
      tiers: payload.tiers,
      servings: chosen.servingsMax,
      optionSlugs,
    })

    return forward.dates
      .flatMap((d) => d.slots.filter((s) => s.isAvailable))
      .filter((s) => s.startsAtUtc !== payload.pickupAt)
      .slice(0, 3)
      .map((s) => ({
        startsAtUtc: s.startsAtUtc,
        label: formatLocal(new Date(s.startsAtUtc), "EEEE d 'de' MMMM · HH:mm"),
      }))
  }
}

/**
 * The cake line item. Cakes are configured rather than picked off the
 * menu, so the order carries the tres-leches variant as its stock line
 * and the real specification travels in `cake_order_details`.
 */
function cakeVariantId() {
  return 'd0000000-0000-0000-0000-000000000010'
}

/** A human-readable spec for the production ticket. */
function buildSpecNote(
  input: { optionSlugs: string[]; inscription?: string | null; colorNotes?: string | null; tiers: number },
  options: CakeOption[],
): string {
  const labels = input.optionSlugs
    .map((slug) => options.find((o) => o.slug === slug)?.label)
    .filter(Boolean)

  return [
    `${input.tiers} tier(s)`,
    labels.join(', '),
    input.inscription ? `"${input.inscription}"` : '',
    input.colorNotes ?? '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Re-exported so the client can compute the same preview the server will. */
export async function previewCakePrice(sizeId: string, optionSlugs: string[]) {
  const [sizes, options, business, policy] = await Promise.all([
    db.getCakeSizes(),
    db.getCakeOptions(),
    db.getBusiness(),
    getDepositPolicy(),
  ])
  return computeCakePrice({
    sizes,
    options,
    sizeId,
    optionSlugs,
    taxRate: business.taxRate,
    depositPct: policy.cakeDepositPct,
  })
}
