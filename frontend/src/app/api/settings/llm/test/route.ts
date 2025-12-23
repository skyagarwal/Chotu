import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/vllm/health`, {
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        latency,
        provider: data.provider || 'vLLM',
        model: data.model || 'llama-3.1-8b',
        maxTokens: data.maxTokens || 8192,
        status: 'ok',
      });
    }
    
    return NextResponse.json({
      success: false,
      latency,
      provider: 'vLLM',
      model: 'llama-3.1-8b',
      error: 'Service degraded',
    });
  } catch (error) {
    console.error('LLM health check failed:', error);
    return NextResponse.json({
      success: false,
      latency: Date.now() - startTime,
      provider: 'vLLM',
      model: 'llama-3.1-8b',
      error: 'Service unavailable',
    });
  }
}
