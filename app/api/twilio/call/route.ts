import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: NextRequest) {
  try {
    const { patientId, caregiverId } = await req.json();
    
    const supabase = await createServerSupabaseClient();
    
    // Get patient name
    const { data: patient } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', patientId)
      .single();

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Create TwiML response directly (no webhook needed)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-IN">Your patient needs you. Please call them back. Patient name: ${patient.name}.</Say>
  <Pause length="2"/>
  <Say voice="alice" language="en-IN">Again, patient ${patient.name} needs your assistance.</Say>
</Response>`;

    // Initiate call to caregiver with inline TwiML
    const call = await client.calls.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: process.env.CAREGIVER_PHONE_NUMBER!,
      twiml: twiml,
      // Note: statusCallback still won't work with localhost, but call will go through
    });

    // Save call to database
    const { data: callRecord } = await supabase
      .from('calls')
      .insert({
        patient_id: patientId,
        caregiver_id: caregiverId,
        status: 'ringing',
        call_method: 'twilio_callback',
        twilio_call_sid: call.sid,
        callback_number: process.env.CAREGIVER_PHONE_NUMBER,
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      callId: callRecord?.id,
      callSid: call.sid,
      status: 'ringing',
    });

  } catch (error: any) {
    console.error('Twilio call error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
}
