import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function GET() {
  try {
    // Get all settings and find the one we need
    const response = await fetch(`${BACKEND_URL}/api/settings`);
    
    if (!response.ok) {
      return NextResponse.json({ key: 'active-chatbot-persona', value: 'chotu' });
    }

    const settings = await response.json();
    const personaSetting = settings.find((s: any) => s.key === 'active-chatbot-persona');
    
    return NextResponse.json({ 
      key: 'active-chatbot-persona', 
      value: personaSetting?.value || 'chotu' 
    });
  } catch (error) {
    console.error('Persona setting GET error:', error);
    return NextResponse.json({ key: 'active-chatbot-persona', value: 'chotu' });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Use the bulk update endpoint
    const response = await fetch(`${BACKEND_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: [{ key: 'active-chatbot-persona', value: body.value }]
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to update persona' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Persona setting PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Settings service unavailable' },
      { status: 500 }
    );
  }
}
