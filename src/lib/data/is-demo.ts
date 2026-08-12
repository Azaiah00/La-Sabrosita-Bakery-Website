/**
 * The demo-mode flag, in its own module.
 *
 * `data/index.ts` imports the adapters, so an adapter cannot import the
 * flag back from there without a cycle. Both sides read it from here
 * instead, and there is still exactly one definition of what demo mode
 * means.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
