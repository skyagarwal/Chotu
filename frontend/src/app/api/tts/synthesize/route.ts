import { NextRequest, NextResponse } from 'next/server';

// Backend URL - internal Docker network or localhost
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, language = 'hi-IN', voice } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    // Forward to backend TTS service
    const response = await fetch(`${BACKEND_URL}/api/tts/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language,
        voice,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS Backend error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Text-to-speech service unavailable' },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Return audio as base64
    return NextResponse.json({
      success: true,
      audio: result.audioData ? Buffer.from(result.audioData).toString('base64') : result.audio,
      contentType: result.contentType || `audio/${result.format || 'wav'}`,
      format: result.format || 'wav',
    });
  } catch (error) {
    console.error('TTS API route error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}
