import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientName = searchParams.get('patientName') || 'Your patient';

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  // Voice message for caregiver
  response.say(
    {
      voice: 'alice',
      language: 'en-IN',
    },
    `Your patient needs you. Please call them back. Patient name: ${patientName}.`
  );

  // Pause and repeat
  response.pause({ length: 1 });
  response.say(
    {
      voice: 'alice',
      language: 'en-IN',
    },
    `Again, patient ${patientName} needs your assistance.`
  );

  return new NextResponse(response.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
