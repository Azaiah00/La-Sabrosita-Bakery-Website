import { z } from 'zod'

/**
 * Never trust a client-supplied price, total, quantity or role.
 *
 * These schemas carry only what a browser is allowed to choose: what,
 * how many, when, and who to call. Every price, every line total, every
 * tax figure is looked up server-side at order time.
 */
export const orderLineSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().positive().max(999),
  note: z.string().max(200).nullish(),
})

export const placeOrderSchema = z.object({
  orderType: z.enum(['pickup', 'cake', 'catering', 'wholesale']),
  contactName: z.string().trim().min(1).max(120),
  contactPhone: z.string().trim().min(7).max(32),
  contactEmail: z.string().trim().email().max(254).nullish(),
  locale: z.enum(['es', 'en']),
  /** A UTC instant produced by `localToUtc`, never a wall-clock string. */
  pickupAt: z.string().datetime(),
  items: z.array(orderLineSchema).min(1).max(60),
  customerNote: z.string().max(500).nullish(),
  allergyNote: z.string().max(500).nullish(),
  occasion: z.string().max(80).nullish(),
})

export type PlaceOrderPayload = z.infer<typeof placeOrderSchema>
