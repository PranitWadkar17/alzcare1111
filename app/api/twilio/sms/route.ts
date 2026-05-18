import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: NextRequest) {
  try {
    const { patientId, type, lat, lng } = await req.json();
    
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

    // Format current time
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    const dateStr = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    // Build location string
    let locationStr = '';
    if (lat && lng) {
      locationStr = `\n\nLocation:\nLat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}\nGoogle Maps: https://maps.google.com/?q=${lat},${lng}`;
    }

    // Build SMS message based on type
    let message = '';
    
    if (type === 'sos') {
      message = `SOS ALERT

Patient: ${patient.name}
Status: SOS ACTIVATED
Time: ${timeStr}, ${dateStr}

Location: https://maps.google.com/?q=${lat},${lng}`;
    } else {
      // Default message for other types
      message = `AlzCare Alert

Patient: ${patient.name}
Time: ${timeStr}
${type || 'Notification'}${locationStr}`;
    }

    // Send SMS
    console.log('📱 Sending SMS to:', process.env.CAREGIVER_PHONE_NUMBER);
    console.log('📱 From:', process.env.TWILIO_PHONE_NUMBER);
    console.log('📱 Message:', message);
    
    const sms = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: process.env.CAREGIVER_PHONE_NUMBER!,
      body: message,
    });

    console.log('✅ SMS sent successfully!');
    console.log('📱 Message SID:', sms.sid);
    console.log('📱 Status:', sms.status);
    console.log('📱 Error Code:', sms.errorCode);
    console.log('📱 Error Message:', sms.errorMessage);

    return NextResponse.json({
      success: true,
      messageSid: sms.sid,
      status: sms.status,
      errorCode: sms.errorCode,
      errorMessage: sms.errorMessage,
    });

  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
