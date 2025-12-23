// API Client for Admin Backend (Port 8080)

import type {
  Agent,
  NLUClassification,
  Dataset,
  TrainingExample,
  TrainingJob,
  Model,
  Flow,
  Metrics,
  AuditLog,
} from '@/types/admin'

const ADMIN_BACKEND_URL = process.env.NEXT_PUBLIC_ADMIN_BACKEND_URL || '/api'

interface CreateAgentData {
  name: string
  module: string
  description?: string
  systemPrompt?: string
  capabilities?: string[]
}

type UpdateAgentData = Partial<CreateAgentData>;

interface CreateDatasetData {
  name: string
  module: string
  description?: string
}

interface TrainingConfig {
  datasetId: string
  modelType?: string
  epochs?: number
  batchSize?: number
  learningRate?: number
}

interface CreateFlowData {
  name: string
  module: string
  trigger: string
  steps: unknown[]
}

interface AuditLogFilters {
  action?: string
  module?: string
  userId?: string
  startDate?: string
  endDate?: string
}

interface AgentExecuteContext {
  sessionId?: string
  userId?: string
  module?: string
  [key: string]: unknown
}

class AdminBackendClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = ADMIN_BACKEND_URL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // NLU Classification
  async classifyIntent(text: string, context?: Record<string, unknown>): Promise<NLUClassification> {
    return this.request<NLUClassification>('/nlu/classify', {
      method: 'POST',
      body: JSON.stringify({ text, context }),
    })
  }

  // Agent Management
  async getAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('/agents')
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request<Agent>(`/agents/${id}`)
  }

  async createAgent(data: CreateAgentData): Promise<Agent> {
    return this.request<Agent>('/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAgent(id: string, data: UpdateAgentData): Promise<Agent> {
    return this.request<Agent>(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async executeAgent(agentId: string, message: string, context: AgentExecuteContext): Promise<unknown> {
    return this.request<unknown>('/agent-execute', {
      method: 'POST',
      body: JSON.stringify({ agentId, message, context }),
    })
  }

  // Training
  async getDatasets(): Promise<Dataset[]> {
    return this.request<Dataset[]>('/training/datasets')
  }

  async createDataset(data: CreateDatasetData): Promise<Dataset> {
    return this.request<Dataset>('/training/datasets', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async addExamples(datasetId: string, examples: TrainingExample[]): Promise<void> {
    await this.request<void>(`/training/datasets/${datasetId}/examples/bulk`, {
      method: 'POST',
      body: JSON.stringify({ examples }),
    })
  }

  async startTrainingJob(data: TrainingConfig): Promise<TrainingJob> {
    return this.request<TrainingJob>('/training/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getTrainingJob(jobId: string): Promise<TrainingJob> {
    return this.request<TrainingJob>(`/training/jobs/${jobId}`)
  }

  async getTrainingJobs(): Promise<TrainingJob[]> {
    return this.request<TrainingJob[]>('/training/jobs')
  }

  async pauseTrainingJob(jobId: string): Promise<TrainingJob> {
    return this.request<TrainingJob>(`/training/jobs/${jobId}/pause`, {
      method: 'POST',
    })
  }

  async stopTrainingJob(jobId: string): Promise<TrainingJob> {
    return this.request<TrainingJob>(`/training/jobs/${jobId}/stop`, {
      method: 'POST',
    })
  }

  async getDataset(datasetId: string): Promise<Dataset> {
    return this.request<Dataset>(`/training/datasets/${datasetId}`)
  }

  async getDatasetExamples(datasetId: string): Promise<TrainingExample[]> {
    return this.request<TrainingExample[]>(`/training/datasets/${datasetId}/examples`)
  }

  async deleteDataset(datasetId: string): Promise<void> {
    await this.request<void>(`/training/datasets/${datasetId}`, {
      method: 'DELETE',
    })
  }

  // Label Studio Integration
  async pushToLabelStudio(datasetId: string): Promise<{ projectId: number; pushed: number }> {
    return this.request<{ projectId: number; pushed: number }>(`/training/datasets/${datasetId}/push-labelstudio`, {
      method: 'POST',
    })
  }

  async pullFromLabelStudio(datasetId: string): Promise<{ imported: number }> {
    return this.request<{ imported: number }>(`/training/datasets/${datasetId}/pull-labelstudio`, {
      method: 'POST',
    })
  }

  async syncLabelStudio(projectId?: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/training/labelstudio/sync', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    })
  }

  async testLabelStudioConnection(): Promise<{ ok: boolean; projectsCount?: number }> {
    return this.request<{ ok: boolean; projectsCount?: number }>('/settings/labelstudio/test')
  }

  async testAsrConnection(): Promise<{ ok: boolean; message?: string }> {
    return this.request<{ ok: boolean; message?: string }>('/settings/asr/test')
  }

  async testTtsConnection(): Promise<{ ok: boolean; message?: string }> {
    return this.request<{ ok: boolean; message?: string }>('/settings/tts/test')
  }

  async testMinioConnection(): Promise<{ ok: boolean; message?: string }> {
    return this.request<{ ok: boolean; message?: string }>('/settings/minio/test')
  }

  // System Settings
  async getSettings(): Promise<Array<{ key: string; value: string; isSecret: boolean; source: string }>> {
    return this.request<Array<{ key: string; value: string; isSecret: boolean; source: string }>>('/settings')
  }

  async updateSettings(settings: Array<{ key: string; value: string }>): Promise<Array<{ key: string; success: boolean; error?: string }>> {
    return this.request<Array<{ key: string; success: boolean; error?: string }>>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    })
  }

  async uploadDataset(file: File, metadata: { name: string; type: string; module: string }): Promise<Dataset> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', metadata.name)
    formData.append('type', metadata.type)
    formData.append('module', metadata.module)

    const url = `${this.baseUrl}/training/datasets/upload`
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    return response.json()
  }

  // Models
  async getModels(): Promise<Model[]> {
    return this.request<Model[]>('/models')
  }

  async createModel(data: Partial<Model>): Promise<Model> {
    return this.request<Model>('/models', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Flows
  async getFlows(): Promise<Flow[]> {
    return this.request<Flow[]>('/flows')
  }

  async createFlow(data: CreateFlowData): Promise<Flow> {
    return this.request<Flow>('/flows', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Metrics
  async getMetrics(): Promise<Metrics> {
    return this.request<Metrics>('/metrics')
  }

  // Audit Logs
  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    const params = new URLSearchParams(filters as Record<string, string>)
    return this.request<AuditLog[]>(`/audits?${params}`)
  }
}

export const adminBackendClient = new AdminBackendClient()
