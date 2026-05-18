import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;

    const supabase = await createServerSupabaseClient();

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      'queued': 'pending',
      'initiated': 'ringing',
      'ringing': 'ringing',
      'in-progress': 'active',
      'answered': 'active',
      'completed': 'completed',
      'busy': 'missed',
      'no-answer': 'missed',
      'failed': 'failed',
      'canceled': 'cancelled',
    };

    const updates: any = {
      status: statusMap[callStatus] || callStatus,
    };

    if (callStatus === 'completed' && callDuration) {
      updates.duration = parseInt(callDuration);
      updates.ended_at = new Date().toISOString();
    }

    if (callStatus === 'answered' || callStatus === 'in-progress') {
      updates.answered_at = new Date().toISOString();
    }

    await supabase
      .from('calls')
      .update(updates)
      .eq('twilio_call_sid', callSid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status webhook error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
