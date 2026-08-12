import type { BakeryData } from './types'
import { demoAdapter } from './demo'
import { supabaseAdapter } from './supabase'
import { IS_DEMO } from './is-demo'

/**
 * The one switch. Every page, component and server action imports `db`
 * from here and none of them know which adapter is behind it — that is
 * what makes the demo work permanent instead of throwaway.
 */
export const db: BakeryData = IS_DEMO ? demoAdapter : supabaseAdapter

export { IS_DEMO }

export * from './types'
