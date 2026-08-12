import { store } from '@/lib/data/demo/store'
import { IS_DEMO } from '@/lib/data'

/**
 * PROMPT-00 Part E, reason 2: the safety net.
 *
 * If something gets fat-fingered in front of the client, one click puts
 * the whole demo back to pristine state — orders, stock, 86 flags,
 * ingredient costs, captured messages, all of it. Under a second,
 * because it is a rebuild of an in-memory object and nothing else.
 */
export function resetDemo(): { ok: true; resetAt: string } {
  if (!IS_DEMO) {
    throw new Error('resetDemo() is demo-only and must never run in a real build')
  }
  store.reset()
  return { ok: true, resetAt: new Date().toISOString() }
}
