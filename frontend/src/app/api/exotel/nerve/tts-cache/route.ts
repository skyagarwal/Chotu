import { NextResponse } from 'next/server';

const NERVE_URL = process.env.NERVE_URL || 'http://192.168.0.151:7100';

export async function GET() {
  try {
    const response = await fetch(`${NERVE_URL}/api/nerve/tts-cache`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ cache_size: 0, cached_phrases: [] });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching TTS cache:', error);
    return NextResponse.json({ cache_size: 0, cached_phrases: [] });
  }
}

export async function POST() {
  try {
    const response = await fetch(`${NERVE_URL}/api/nerve/preload-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error preloading TTS cache:', error);
    return NextResponse.json(
      { error: 'Failed to preload TTS cache' },
      { status: 500 }
    );
  }
}
