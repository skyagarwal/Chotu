import { NextRequest, NextResponse } from 'next/server';

// Backend URL - internal Docker network or localhost
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

// Map browser language codes to backend supported codes
const mapLanguage = (lang: string): string => {
  const langMap: Record<string, string> = {
    'hi-IN': 'hi',
    'hi': 'hi',
    'en-IN': 'en',
    'en-US': 'en',
    'en': 'en',
    'mr-IN': 'mr',
    'mr': 'mr',
  };
  return langMap[lang] || 'hi';
};

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

    // Map language to backend format
    const mappedLanguage = mapLanguage(language);
    console.log(`TTS Request: "${text.substring(0, 50)}..." lang=${language} -> ${mappedLanguage}`);

    const payload: Record<string, unknown> = {
      text,
      language: mappedLanguage,
    };
    if (voice) payload.voice = voice;

    // Forward to backend TTS service
    const response = await fetch(`${BACKEND_URL}/api/tts/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS Backend error:', errorText);
      return NextResponse.json(
        { success: false, error: errorText || 'Text-to-speech service unavailable' },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Handle audioData which comes as { type: 'Buffer', data: [...] } from backend
    let audioBase64 = '';
    if (result.audioData) {
      // Backend returns audioData as { type: 'Buffer', data: number[] }
      if (result.audioData.type === 'Buffer' && Array.isArray(result.audioData.data)) {
        audioBase64 = Buffer.from(result.audioData.data).toString('base64');
      } else if (typeof result.audioData === 'string') {
        audioBase64 = result.audioData;
      } else {
        audioBase64 = Buffer.from(result.audioData).toString('base64');
      }
    } else if (result.audio) {
      audioBase64 = result.audio;
    }

    if (!audioBase64) {
      return NextResponse.json(
        { success: false, error: 'No audio data received from TTS service' },
        { status: 500 }
      );
    }

    // Return audio as base64
    return NextResponse.json({
      success: true,
      audio: audioBase64,
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
