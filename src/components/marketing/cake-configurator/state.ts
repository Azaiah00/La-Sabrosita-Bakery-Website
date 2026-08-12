'use client'

import type { Occasion } from '@/lib/cakes'

export const STEPS = [
  'occasion',
  'size',
  'flavor',
  'decoration',
  'pickup',
  'contact',
  'review',
] as const

export type StepId = (typeof STEPS)[number]

export interface ConfiguratorState {
  step: number
  /** Which way the last move went, so the slide is direction-aware. */
  direction: 1 | -1
  occasion: Occasion | 'otro' | null
  sizeId: string | null
  tiers: number
  flavor: string | null
  filling: string | null
  frosting: string | null
  finish: string | null
  inscription: string
  inscriptionLang: 'es' | 'en'
  colorNotes: string
  referenceImageName: string | null
  pickupAt: string | null
  contactName: string
  contactPhone: string
  contactEmail: string
  allergyNote: string
  smsOptIn: boolean
}

export type Action =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: number }
  | { type: 'set'; patch: Partial<ConfiguratorState> }
  | { type: 'restore'; state: ConfiguratorState }

export const initialState: ConfiguratorState = {
  step: 0,
  direction: 1,
  occasion: null,
  sizeId: null,
  tiers: 1,
  flavor: null,
  filling: null,
  frosting: null,
  finish: null,
  inscription: '',
  inscriptionLang: 'es',
  colorNotes: '',
  referenceImageName: null,
  pickupAt: null,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  allergyNote: '',
  smsOptIn: false,
}

export function reducer(state: ConfiguratorState, action: Action): ConfiguratorState {
  switch (action.type) {
    case 'next':
      return { ...state, step: Math.min(state.step + 1, STEPS.length - 1), direction: 1 }
    case 'back':
      return { ...state, step: Math.max(state.step - 1, 0), direction: -1 }
    case 'goto':
      return { ...state, step: action.step, direction: action.step > state.step ? 1 : -1 }
    case 'set': {
      const next = { ...state, ...action.patch }
      // Changing anything that moves the lead time invalidates the slot —
      // silently keeping it would promise a date we can no longer make.
      const leadKeys: (keyof ConfiguratorState)[] = ['sizeId', 'tiers', 'frosting', 'finish']
      if (leadKeys.some((k) => k in action.patch && action.patch[k] !== state[k])) {
        next.pickupAt = null
      }
      return next
    }
    case 'restore':
      return action.state
    default:
      return state
  }
}

/** The chosen option slugs, in one place. */
export function selectedSlugs(state: ConfiguratorState): string[] {
  return [state.flavor, state.filling, state.frosting, state.finish].filter(
    (s): s is string => Boolean(s),
  )
}

/** Can we leave this step yet? */
export function canAdvance(state: ConfiguratorState): boolean {
  switch (STEPS[state.step]) {
    case 'occasion':
      return state.occasion !== null
    case 'size':
      return state.sizeId !== null
    case 'flavor':
      return state.flavor !== null && state.filling !== null
    case 'decoration':
      return state.frosting !== null && state.finish !== null
    case 'pickup':
      return state.pickupAt !== null
    case 'contact':
      return (
        state.contactName.trim().length > 0 && state.contactPhone.trim().length >= 7
      )
    default:
      return true
  }
}

const KEY = 'ls-cake-configurator'

/**
 * A phone call mid-order must not lose the work. State is written to
 * sessionStorage on every change and restored on mount.
 */
export function persist(state: ConfiguratorState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // A full or disabled sessionStorage is not worth breaking the order over.
  }
}

export function restore(): ConfiguratorState | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConfiguratorState
    return { ...initialState, ...parsed }
  } catch {
    return null
  }
}

export function clearPersisted() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing to clean up */
  }
}
