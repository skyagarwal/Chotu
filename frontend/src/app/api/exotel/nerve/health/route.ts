import { NextResponse } from 'next/server';

const NERVE_URL = process.env.NERVE_URL || 'http://192.168.0.151:7100';

export async function GET() {
  try {
    const response = await fetch(`${NERVE_URL}/health`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Nerve service unavailable' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Nerve health:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Nerve service' },
      { status: 503 }
    );
  }
}
