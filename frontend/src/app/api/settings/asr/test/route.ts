import { NextResponse } from 'next/server';

// Backend URL - internal Docker network or localhost
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // First try the backend ASR health endpoint
    const response = await fetch(`${BACKEND_URL}/api/asr/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const result = await response.json();
      return NextResponse.json({
        success: result.status === 'ok',
        latency,
        provider: 'whisper',
        model: 'large-v3',
        languages: ['en', 'hi', 'mr', 'auto'],
        ...result,
      });
    }
    
    return NextResponse.json({
      success: false,
      latency,
      error: 'ASR service test failed',
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('ASR test error:', error);
    return NextResponse.json({
      success: false,
      latency,
      error: 'ASR service unavailable',
    });
  }
}
