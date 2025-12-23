// Admin Backend Types

export interface Agent {
  id: string
  name: string
  module: string
  defaultModel: string
  nluProvider: string
  asrProvider?: string
  ttsProvider?: string
  capabilities: {
    search?: boolean
    voice?: boolean
    payments?: boolean
    location?: boolean
    multilingual?: string[]
  }
  intents: Intent[]
  flows?: string[]
  fallbackAgent?: string
  createdAt?: string
  updatedAt?: string
}

export interface Intent {
  id: string
  confidence_threshold: number
}

export interface NLUClassification {
  intent: string
  confidence: number
  entities?: Record<string, unknown>
  raw?: unknown
}

export interface Dataset {
  id: string
  name: string
  type: 'nlu' | 'asr' | 'tts'
  module?: string
  exampleCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface TrainingExample {
  text: string
  intent: string
  entities?: Record<string, unknown>
}

export interface TrainingJob {
  id: string
  type: 'nlu-train' | 'asr-train' | 'tts-train'
  dataset_id: string
  status: 'queued' | 'training' | 'completed' | 'failed'
  progress?: number
  epoch?: number
  loss?: number
  accuracy?: number
  error?: string
  createdAt?: string
  completedAt?: string
}

export interface Model {
  id: string
  name: string
  type: 'llm' | 'nlu' | 'asr' | 'tts'
  provider: string
  endpoint?: string
  enabled: boolean
  createdAt?: string
}

export interface Flow {
  id: string
  name: string
  description?: string
  steps: FlowStep[]
  enabled: boolean
  createdAt?: string
}

export interface FlowStep {
  id: string
  type: string
  config: Record<string, unknown>
  next?: string
}

export interface AuditLog {
  id: string
  action: string
  userId?: string
  resource: string
  resourceId?: string
  changes?: Record<string, unknown>
  timestamp: string
}

export interface Metrics {
  cpu: number
  memory: number
  requests: number
  errors: number
  latency: {
    p50: number
    p95: number
    p99: number
  }
}
