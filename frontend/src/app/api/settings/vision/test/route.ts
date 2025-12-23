import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/vision/health`, {
      signal: AbortSignal.timeout(5000),
    });
    
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        latency,
        provider: data.provider || 'Ultralytics',
        model: data.model || 'yolov8',
        capabilities: data.capabilities || ['object-detection', 'face-detection'],
        status: 'ok',
      });
    }
    
    return NextResponse.json({
      success: false,
      latency,
      provider: 'Ultralytics',
      model: 'yolov8',
      error: 'Service degraded',
    });
  } catch (error) {
    console.error('Vision health check failed:', error);
    return NextResponse.json({
      success: false,
      latency: Date.now() - startTime,
      provider: 'Ultralytics',
      model: 'yolov8',
      error: 'Service unavailable',
    });
  }
}
