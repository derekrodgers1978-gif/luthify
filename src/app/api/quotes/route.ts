import { NextRequest, NextResponse } from 'next/server'
import type { QuoteRequest } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: QuoteRequest = await req.json()

    // Validate
    if (!body.email || !body.name || !body.config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // TODO Phase 2: Save to Supabase, notify builders via Resend
    // For Phase 1: log and return success
    console.log('[Quote Request]', {
      name: body.name,
      email: body.email,
      budget: body.budget,
      builderIds: body.builderIds?.length ? body.builderIds : 'broadcast',
      config: body.config,
      livePrice: body.config.livePrice,
    })

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 400))

    return NextResponse.json({
      success: true,
      message: `Quote request received. Builders will respond to ${body.email} within 48 hours.`,
      quoteId: `qr_${Date.now()}`,
    })

  } catch (err) {
    console.error('[Quote API Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
