import { NextRequest, NextResponse } from 'next/server';

// Backend URL - internal Docker network or localhost
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/settings`);
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch settings' },
        { status: response.status }
      );
    }

    const settings = await response.json();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { success: false, error: 'Settings service unavailable' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to update settings' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { success: false, error: 'Settings service unavailable' },
      { status: 500 }
    );
  }
}
