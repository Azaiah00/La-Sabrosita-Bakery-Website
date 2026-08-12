/* =====================================================================
   PROMPT-00 Part C — mutable in-memory state
   ---------------------------------------------------------------------
   This is what makes the demo feel alive rather than like a set of
   screenshots. 86 a product in the portal and it is gone from the public
   menu on the next request — a real write, through a real read path.

   Module-level mutable state. Survives navigation, resets on server
   restart or via the reset button. Deliberately not persisted: the demo
   should come up pristine every time the laptop is opened.
   ===================================================================== */

import { buildFixtures, type RawFixtures } from './fixtures'
import { buildCostingBook, type CostingBook } from './costing'
import { businessDate } from '@/lib/datetime'
import type { LoggedMessage } from '../types'

export interface DemoState extends RawFixtures {
  /** The business date the fixture set was built around. */
  today: string
  /**
   * Product ids taken off the menu today. Kept beside the fixtures rather
   * than as a column on the row so a reset cannot miss one — and so the
   * portal toggle and the public menu read the exact same value.
   */
  eightySixed: Set<string>
  /** Everything sendMessage() captured instead of sending. */
  messages: LoggedMessage[]
  /** Rebuilt whenever an ingredient cost changes. */
  costing: CostingBook
  /** Bumped on every write; used as a cheap cache key. */
  revision: number
}

function pristine(): DemoState {
  const today = businessDate(new Date())

  /*
   * DEEP CLONE, and it matters.
   *
   * `buildFixtures` hands back the generated module-level arrays by
   * reference for the tables it does not have to rebuild. Without this
   * clone, an in-place edit — changing an ingredient cost in the
   * simulator, say — writes straight through to the module constants,
   * and `reset()` hands the mutated arrays back as if they were
   * pristine. The demo's safety net would silently stop working after
   * the first ingredient-cost change, which is exactly the moment you
   * most want it.
   */
  const fixtures = structuredClone(buildFixtures(today))

  return {
    ...fixtures,
    today,
    eightySixed: new Set<string>(),
    messages: [],
    costing: buildCostingBook(fixtures),
    revision: 0,
  }
}

/**
 * Next's dev server re-evaluates modules on edit, and route handlers can
 * land in a different module instance than the page that wrote the state.
 * Hanging the store off globalThis is what keeps "86 it, then refresh the
 * menu" working across a real page load.
 */
const GLOBAL_KEY = Symbol.for('la-sabrosita.demo-store')

interface Holder {
  state: DemoState
}

const holder: Holder = ((globalThis as Record<symbol, unknown>)[GLOBAL_KEY] as Holder) ?? {
  state: pristine(),
}
;(globalThis as Record<symbol, unknown>)[GLOBAL_KEY] = holder

export const store = {
  get: (): DemoState => holder.state,

  mutate: (fn: (s: DemoState) => void): void => {
    fn(holder.state)
    holder.state.revision += 1
  },

  /** One click, under a second, back to a clean pitch. */
  reset: (): void => {
    holder.state = pristine()
  },

  /** Re-index the costing book after an ingredient cost changes. */
  recost: (): void => {
    holder.state.costing = buildCostingBook(holder.state)
    holder.state.revision += 1
  },
}
