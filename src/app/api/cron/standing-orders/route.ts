import { NextResponse } from 'next/server'

/** Wholesale standing orders — NOT WIRED. PROMPT-13 builds this. */
export async function GET() {
  return NextResponse.json(
    { error: 'Standing-orders cron not wired yet — see PROMPT-13' },
    { status: 501 },
  )
}
