import { NextRequest, NextResponse } from 'next/server';

// Backend URL - internal Docker network or localhost
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Handle multipart/form-data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      // Forward to backend ASR service
      const response = await fetch(`${BACKEND_URL}/api/asr/transcribe/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ASR Backend error:', errorText);
        return NextResponse.json(
          { success: false, error: 'Transcription service unavailable' },
          { status: response.status }
        );
      }

      const result = await response.json();
      
      return NextResponse.json({
        success: true,
        text: result.text || result.transcription || '',
        language: result.language || 'en',
        confidence: result.confidence || 0,
        provider: result.provider || 'whisper',
      });
    }
    
    // Handle JSON body with audio URL or base64
    const body = await request.json();
    const { audioUrl, audioBase64, language = 'auto' } = body;

    if (!audioUrl && !audioBase64) {
      return NextResponse.json(
        { success: false, error: 'Audio URL or base64 data is required' },
        { status: 400 }
      );
    }

    // Forward to backend ASR service
    const response = await fetch(`${BACKEND_URL}/api/asr/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioUrl,
        audioBase64,
        language,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ASR Backend error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Transcription service unavailable' },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      text: result.text || result.transcription || '',
      language: result.language || 'en',
      confidence: result.confidence || 0,
      provider: result.provider || 'whisper',
    });
  } catch (error) {
    console.error('ASR API route error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}
