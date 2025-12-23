import { NextRequest, NextResponse } from 'next/server';

// Backend URL
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3200';

// Default models registry
const DEFAULT_MODELS = [
  {
    id: 'nlu-indicbert-v3',
    name: 'IndicBERT NLU v3',
    modelType: 'nlu',
    provider: 'Custom',
    providerModelId: 'indicbert_v3',
    status: 'active',
    endpoint: 'http://localhost:7010',
    isLocal: true,
    capabilities: ['intent-classification', 'entity-extraction', 'multilingual'],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'asr-whisper-large',
    name: 'Whisper Large v3',
    modelType: 'asr',
    provider: 'OpenAI Whisper',
    providerModelId: 'whisper-large-v3',
    status: 'active',
    endpoint: 'http://localhost:7000',
    isLocal: true,
    capabilities: ['speech-to-text', 'multilingual', 'timestamps'],
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tts-xtts-v2',
    name: 'XTTS v2',
    modelType: 'tts',
    provider: 'Coqui TTS',
    providerModelId: 'xtts_v2',
    status: 'active',
    endpoint: 'http://localhost:8010',
    isLocal: true,
    capabilities: ['text-to-speech', 'voice-cloning', 'multilingual'],
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'llm-llama-3-8b',
    name: 'Llama 3.1 8B',
    modelType: 'llm',
    provider: 'vLLM',
    providerModelId: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    status: 'active',
    endpoint: 'http://localhost:8000',
    isLocal: true,
    maxTokens: 8192,
    capabilities: ['chat', 'completion', 'function-calling'],
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'embedding-bge-m3',
    name: 'BGE-M3 Embeddings',
    modelType: 'embedding',
    provider: 'BAAI',
    providerModelId: 'bge-m3',
    status: 'active',
    endpoint: 'http://localhost:8080',
    isLocal: true,
    capabilities: ['text-embedding', 'multilingual', 'dense-sparse'],
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vision-yolov8',
    name: 'YOLOv8 Object Detection',
    modelType: 'vision',
    provider: 'Ultralytics',
    providerModelId: 'yolov8n',
    status: 'active',
    endpoint: 'http://localhost:8200',
    isLocal: true,
    capabilities: ['object-detection', 'face-detection', 'pose-estimation'],
    createdAt: '2024-01-25T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    // Try to fetch from backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/models`, {
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return NextResponse.json(data);
        }
      }
    } catch {
      // Backend not available
    }

    // Return default models
    return NextResponse.json(DEFAULT_MODELS);
  } catch (error) {
    console.error('Failed to get models:', error);
    return NextResponse.json(DEFAULT_MODELS);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Try to save to backend
    try {
      const response = await fetch(`${BACKEND_URL}/api/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend not available
    }

    // Return success with generated ID
    return NextResponse.json({
      ...body,
      id: `model-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to create model:', error);
    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    );
  }
}
