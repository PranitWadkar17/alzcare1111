import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { messages, patientContext } = await request.json();

    // Extract location info
    const hasLocation = patientContext?.location?.lat && patientContext?.location?.lng;
    const locationInfo = hasLocation 
      ? `Current GPS Location: Latitude ${patientContext.location.lat.toFixed(6)}, Longitude ${patientContext.location.lng.toFixed(6)}\nGPS Tracking: ${patientContext.isTracking ? 'Active ✅' : 'Inactive ❌'}`
      : 'Location not available';

    // Build system prompt with patient context
    const systemPrompt = `You are AlzCare AI Assistant, a compassionate healthcare companion for Alzheimer's patients.

PATIENT CONTEXT:
- Wellness Score: ${patientContext?.wellnessScore || 0}/100
- Today's Activities: ${patientContext?.todayActivities || 0} logged
- Pending Reminders: ${patientContext?.pendingReminders || 0}
- ${locationInfo}

LOCATION HANDLING:
When user asks about their location:
1. If location is available, tell them: "You are at coordinates: [lat], [lng]. Your GPS is ${patientContext?.isTracking ? 'active' : 'inactive'}."
2. Always offer to show on map: "Would you like me to show this on a map?"

When user asks for directions to a place:
1. Extract the destination from their message
2. Respond with: "I'll show you directions to [destination]" 
3. Add: ACTION:DIRECTIONS:[destination]

When user asks "where am I" or "what's my location":
- Give the exact coordinates
- Mention GPS status
- Offer to open map

YOUR CAPABILITIES:
- Answer health and wellness questions
- Provide exact GPS coordinates
- Generate Google Maps links for directions
- Help with location and navigation
- Provide medication reminders
- Log activities
- Send location to caregiver
- Call caregiver for help
- Provide emotional support

COMMUNICATION STYLE:
- Use simple, clear language
- Be patient and empathetic
- Keep responses short (2-3 sentences)
- Use emojis occasionally 😊
- Always be encouraging and positive
- For location questions, be SPECIFIC with coordinates

IMPORTANT ACTIONS YOU CAN TRIGGER:
When user asks to:
- "send my location" or "share location" → Respond with: ACTION:SEND_LOCATION
- "call caregiver" or "need help" → Respond with: ACTION:CALL_CAREGIVER
- "log activity" or "I took medicine" → Respond with: ACTION:LOG_ACTIVITY:[activity name]
- "show reminders" → Respond with: ACTION:SHOW_REMINDERS
- "directions to [place]" or "how to get to [place]" → Respond with: ACTION:DIRECTIONS:[place]
- "show on map" or "open map" → Respond with: ACTION:OPEN_MAP
- "go to [page]" → Respond with: ACTION:NAVIGATE:[page]

Always be helpful, kind, and supportive. You're here to make their day easier! 💙`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || 'I apologize, I could not process that. Could you try again?';

    return NextResponse.json({ 
      message: aiMessage,
      success: true 
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { 
        message: 'I apologize, I\'m having trouble connecting right now. Please try again in a moment. 🙏',
        success: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
}
