import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/data'
import { businessDate } from '@/lib/datetime'
import type { OrderType } from '@/lib/data/types'

/**
 * The availability API behind the configurator's calendar.
 *
 * Cached 60s and rate-limited to 30 requests/minute/IP. The limiter is
 * an in-process map, which is correct for demo mode (one machine, one
 * process); a real deploy swaps it for a shared store without changing
 * the handler.
 */
const WINDOW_MS = 60_000
const MAX_REQUESTS = 30
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(ip: string, now: number): boolean {
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_REQUESTS
}

export async function GET(request: NextRequest) {
  const now = Date.now()
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'

  if (rateLimited(ip, now)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  const params = request.nextUrl.searchParams
  const orderType = (params.get('orderType') ?? 'cake') as OrderType
  const fromDate = params.get('fromDate') ?? businessDate(new Date())
  const days = Math.min(Math.max(Number(params.get('days') ?? 21), 1), 90)
  const sizeId = params.get('sizeId') ?? undefined
  const tiers = params.get('tiers') ? Number(params.get('tiers')) : undefined
  const servings = params.get('servings') ? Number(params.get('servings')) : undefined
  const optionSlugs = params.get('options')?.split(',').filter(Boolean) ?? []

  const result = await db.getAvailability({
    orderType,
    now: new Date(now),
    fromDate,
    days,
    sizeId,
    tiers,
    servings,
    optionSlugs,
  })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
  })
}
