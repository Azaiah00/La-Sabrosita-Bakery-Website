/** Money is integer cents in memory and numeric(12,2) in Postgres. Never a float. */
export const toCents = (dollars: number) => Math.round(dollars * 100)
export const fromCents = (cents: number) => cents / 100

export function formatMoney(cents: number, locale: 'es' | 'en') {
  return new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
    style: 'currency', currency: 'USD',
  }).format(cents / 100)
}
