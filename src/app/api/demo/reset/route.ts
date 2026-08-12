import { NextResponse } from 'next/server'
import { IS_DEMO } from '@/lib/data'
import { resetDemo } from '@/lib/demo/reset'

/** Demo-only. In a non-demo build this route does not exist. */
export async function POST() {
  if (!IS_DEMO) return new NextResponse(null, { status: 404 })
  return NextResponse.json(resetDemo())
}
