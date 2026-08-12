import { z } from 'zod'

/**
 * What the browser is allowed to choose.
 *
 * Note what is NOT here: price, subtotal, tax, total, deposit. Every one
 * of those is recomputed server-side from `cake_sizes.base_price` and
 * `cake_options.price_delta`. A client-supplied total is discarded, not
 * validated.
 */
export const cakeOrderSchema = z.object({
  occasion: z.enum(['quinceanera', 'cumpleanos', 'boda', 'otro']),
  sizeId: z.string().uuid(),
  tiers: z.number().int().min(1).max(6),
  optionSlugs: z.array(z.string().max(40)).max(8),
  inscription: z.string().max(120).nullish(),
  inscriptionLang: z.enum(['es', 'en']).default('es'),
  colorNotes: z.string().max(300).nullish(),
  referenceImageName: z.string().max(200).nullish(),

  /** A UTC instant produced by the availability engine, never typed in. */
  pickupAt: z.string().datetime(),

  contactName: z.string().trim().min(1).max(120),
  contactPhone: z.string().trim().min(7).max(32),
  contactEmail: z.string().trim().email().max(254).nullish(),
  allergyNote: z.string().max(500).nullish(),
  /** Unchecked by default. Consent is never assumed. */
  smsOptIn: z.boolean().default(false),

  locale: z.enum(['es', 'en']),
})

export type CakeOrderPayload = z.infer<typeof cakeOrderSchema>

/** Upload rules from PROMPT-07 step 4. Enforced again server-side. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const
