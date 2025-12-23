import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/nlu/health`, {
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        latency,
        provider: data.provider || 'IndicBERT',
        model: data.model || 'indicbert_v3',
        languages: data.languages || ['en', 'hi', 'mr'],
        status: 'ok',
      });
    }
    
    return NextResponse.json({
      success: false,
      latency,
      provider: 'IndicBERT',
      model: 'indicbert_v3',
      error: 'Service degraded',
    });
  } catch (error) {
    console.error('NLU health check failed:', error);
    return NextResponse.json({
      success: false,
      latency: Date.now() - startTime,
      provider: 'IndicBERT',
      model: 'indicbert_v3',
      error: 'Service unavailable',
    });
  }
}
