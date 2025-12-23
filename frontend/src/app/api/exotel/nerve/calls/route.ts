import { NextRequest, NextResponse } from 'next/server';

const NERVE_URL = process.env.NERVE_URL || 'http://192.168.0.151:7100';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${NERVE_URL}/api/nerve/active-calls`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Return empty calls if endpoint doesn't exist
      return NextResponse.json({ calls: [] });
    }

    const data = await response.json();
    return NextResponse.json({ calls: data.active_calls || [] });
  } catch (error) {
    console.error('Error fetching Nerve calls:', error);
    // Return empty calls on error
    return NextResponse.json({ calls: [] });
  }
}
