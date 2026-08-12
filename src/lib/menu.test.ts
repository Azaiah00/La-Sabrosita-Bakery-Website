/**
 * The 86 path, end to end through the real data layer.
 *
 * RUN-ORDER's checkpoint for Message 9 is: 86 the flan in the portal,
 * refresh /menu, and it is GONE. This exercises the same two functions
 * the portal action and the menu page call — `db.setEightySixed` and
 * `getMenu` — so a regression breaks the build rather than the demo.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { demoAdapter as db } from '@/lib/data/demo'
import { store } from '@/lib/data/demo/store'
import { getMenu, fold, matches, searchIndexFor } from './menu'

const FLAN = 'c0000000-0000-0000-0000-000000000011'
const CONCHA = 'c0000000-0000-0000-0000-000000000001'

const names = async (locale: 'es' | 'en' = 'en') =>
  (await getMenu(locale)).flatMap((c) => c.products).map((p) => p.nameEs)

beforeEach(() => {
  store.reset()
})

describe('86 removes an item from the public menu', () => {
  it('is present before, gone after, and back on reset', async () => {
    expect(await names()).toContain('Flan')

    await db.setEightySixed(FLAN, true)
    expect(await names()).not.toContain('Flan')

    // Un-86 puts it straight back — used every morning.
    await db.setEightySixed(FLAN, false)
    expect(await names()).toContain('Flan')

    await db.setEightySixed(FLAN, true)
    store.reset()
    expect(await names()).toContain('Flan')
  })

  it('removes it in both locales', async () => {
    await db.setEightySixed(FLAN, true)
    expect(await names('es')).not.toContain('Flan')
    expect(await names('en')).not.toContain('Flan')
  })

  it('leaves everything else alone', async () => {
    const before = await names()
    await db.setEightySixed(FLAN, true)
    const after = await names()
    expect(after).toEqual(before.filter((n) => n !== 'Flan'))
  })

  it('still reports the truth to the portal', async () => {
    // The adapter reports is86ed; only the public menu helper filters.
    await db.setEightySixed(FLAN, true)
    const raw = await db.getMenu('es')
    const flan = raw.flatMap((c) => c.products).find((p) => p.id === FLAN)!
    expect(flan.is86ed).toBe(true)
  })

  it('drops a category that empties out entirely', async () => {
    // Quesadilla Salvadoreña is its own counter with one product.
    const quesadilla = 'c0000000-0000-0000-0000-000000000020'
    expect((await getMenu('es')).some((c) => c.slug === 'quesadilla')).toBe(true)
    await db.setEightySixed(quesadilla, true)
    expect((await getMenu('es')).some((c) => c.slug === 'quesadilla')).toBe(false)
  })

  it('refuses to sell an 86ed item even by direct link', async () => {
    await db.setEightySixed(CONCHA, true)
    await expect(
      db.placeOrder({
        orderType: 'pickup',
        contactName: 'Prueba',
        contactPhone: '(804) 555-0000',
        locale: 'es',
        pickupAt: new Date().toISOString(),
        items: [{ variantId: 'd0000000-0000-0000-0000-000000000001', qty: 1 }],
      }),
    ).rejects.toThrow(/86ed/)
  })
})

describe('menu search', () => {
  it('folds diacritics both ways', () => {
    expect(fold('Quesadilla Salvadoreña')).toBe('quesadilla salvadorena')
    expect(matches(fold('Quesadilla Salvadoreña'), fold('salvadorena'))).toBe(true)
    expect(matches(fold('Quesadilla Salvadorena'), fold('salvadoreña'))).toBe(true)
  })

  it('tolerates a one-letter typo', async () => {
    const menu = await getMenu('es')
    const quesadilla = menu
      .flatMap((c) => c.products)
      .find((p) => p.slug === 'quesadilla-salvadorena')!
    const hay = searchIndexFor(quesadilla)
    for (const needle of ['quesadilla', 'quesadila', 'salvadorena', 'cheese bread']) {
      expect(matches(hay, fold(needle)), needle).toBe(true)
    }
  })

  it('does not match something unrelated', async () => {
    const menu = await getMenu('es')
    const concha = menu.flatMap((c) => c.products).find((p) => p.slug === 'concha')!
    expect(matches(searchIndexFor(concha), fold('wedding cake'))).toBe(false)
  })
})
