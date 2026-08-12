import { NextResponse } from 'next/server'
import { db, IS_DEMO } from '@/lib/data'

/**
 * Backs the Mensajes drawer. Demo-only: in a real build messages go over
 * the wire through Resend and Twilio and there is nothing to read here.
 */
export async function GET() {
  if (!IS_DEMO) return new NextResponse(null, { status: 404 })
  return NextResponse.json({ messages: await db.listMessages() })
}
