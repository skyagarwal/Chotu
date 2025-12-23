import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/embeddings/health`, {
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        latency,
        provider: data.provider || 'BGE',
        model: data.model || 'bge-m3',
        dimensions: data.dimensions || 1024,
        status: 'ok',
      });
    }
    
    return NextResponse.json({
      success: false,
      latency,
      provider: 'BGE',
      model: 'bge-m3',
      error: 'Service degraded',
    });
  } catch (error) {
    console.error('Embeddings health check failed:', error);
    return NextResponse.json({
      success: false,
      latency: Date.now() - startTime,
      provider: 'BGE',
      model: 'bge-m3',
      error: 'Service unavailable',
    });
  }
}
