// API Client for Mangwale AI (Port 3200)

import type {
  ChatMessage,
  Session,
  ConversationContext,
  Platform,
} from '@/types/chat'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: always use relative path to go through proxy
    return '/api';
  }
  // Server-side: use env var or localhost
  return process.env.NEXT_PUBLIC_MANGWALE_AI_URL || 'http://localhost:3200';
}

interface SendMessageOptions {
  message: string
  sessionId?: string
  phoneNumber?: string
  platform?: Platform
  module?: string
  location?: { lat: number; lng: number }
}

interface CreateSessionOptions {
  phoneNumber: string
  platform?: Platform
  module?: string
  location?: { lat: number; lng: number }
}

interface UpdateSessionOptions {
  module?: string
  location?: { lat: number; lng: number }
  data?: Record<string, unknown>
}

interface ConversationResponse {
  messages: ChatMessage[]
  session: Session
  context?: ConversationContext
}

class MangwaleAIClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Mangwale AI API Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Generic HTTP methods for Admin Dashboard
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T = any>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T = any>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async patch<T = any>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Send message to AI
  async sendMessage(options: SendMessageOptions): Promise<ConversationResponse> {
    const { message, sessionId, phoneNumber } = options
    
    // Use consistent recipientId - CRITICAL: Same ID for both API calls
    const recipientId = sessionId || phoneNumber || `web-${Date.now()}`
    
    console.log('🔌 API Client - Sending to:', recipientId)
    
    // Send message to backend
    const sendResponse = await this.request<{ ok: boolean }>('/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        recipientId,
        text: message,
      }),
    })
    console.log('📤 Send result:', sendResponse)

    // Wait a bit for backend to process (backend needs time to generate response)
    console.log('⏳ Waiting 500ms for backend processing...')
    await new Promise(resolve => setTimeout(resolve, 500))

    // Get response messages using SAME recipientId
    console.log('📥 Fetching messages from:', recipientId)
    const result = await this.request<{ ok: boolean; messages: Array<{ message: string; timestamp: number }> }>(
      `/chat/messages/${recipientId}`
    )
    console.log('📨 Received:', result.messages?.length || 0, 'messages')

    // Convert to ChatMessage format
    const messages: ChatMessage[] = result.messages.map((msg, idx) => ({
      id: `${msg.timestamp}-${idx}`,
      role: 'assistant' as const,
      content: msg.message,
      timestamp: msg.timestamp,
    }))

    return {
      messages,
      session: {
        id: recipientId,
        phoneNumber: phoneNumber || recipientId,
        platform: 'web',
        currentStep: '',
        authenticated: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }
  }

  // Session Management
  async createSession(options: CreateSessionOptions): Promise<Session> {
    return this.request<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(options),
    })
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.request<Session>(`/sessions/${sessionId}`)
  }

  async updateSession(sessionId: string, updates: UpdateSessionOptions): Promise<Session> {
    return this.request<Session>(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.request<void>(`/sessions/${sessionId}`, {
      method: 'DELETE',
    })
  }

  // Get conversation history
  async getHistory(sessionId: string, limit = 50): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/sessions/${sessionId}/history?limit=${limit}`)
  }

  // Handle user authentication via conversation
  async authenticateUser(sessionId: string, phoneNumber: string, otp: string): Promise<Session> {
    return this.request<Session>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, phoneNumber, otp }),
    })
  }

  // Quick actions (module-specific)
  async selectModule(sessionId: string, module: string): Promise<ConversationResponse> {
    return this.request<ConversationResponse>(`/sessions/${sessionId}/module`, {
      method: 'POST',
      body: JSON.stringify({ module }),
    })
  }

  async updateLocation(sessionId: string, lat: number, lng: number): Promise<Session> {
    return this.request<Session>(`/sessions/${sessionId}/location`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    })
  }

  // Handle option clicks (from chat chips/buttons)
  async handleOption(sessionId: string, optionId: string, payload?: unknown): Promise<ConversationResponse> {
    return this.request<ConversationResponse>(`/sessions/${sessionId}/option`, {
      method: 'POST',
      body: JSON.stringify({ optionId, payload }),
    })
  }

  // Feedback
  async sendFeedback(sessionId: string, messageId: string, rating: number, comment?: string): Promise<void> {
    await this.request<void>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ sessionId, messageId, rating, comment }),
    })
  }

  // Flow Management
  async getFlows(module?: string, enabled?: boolean): Promise<{
    flows: Array<{
      id: string
      name: string
      description: string
      module: string
      enabled: boolean
      stepsCount: number
      executionCount: number
      successRate: number
      avgCompletionTime: number
      createdAt: string
      updatedAt: string
    }>
    total: number
  }> {
    let url = '/flows'
    const params = new URLSearchParams()
    if (module) params.append('module', module)
    if (enabled !== undefined) params.append('enabled', String(enabled))
    if (params.toString()) url += `?${params}`
    
    return this.request(url)
  }

  async getFlow(id: string) {
    return this.request(`/flows/${id}`)
  }

  async createFlow(data: unknown) {
    return this.request('/flows', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateFlow(id: string, data: unknown) {
    return this.request(`/flows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteFlow(id: string) {
    return this.request(`/flows/${id}`, {
      method: 'DELETE',
    })
  }

  async toggleFlow(id: string) {
    return this.request(`/flows/${id}/toggle`, {
      method: 'PATCH',
    })
  }

  async getFlowStats(id: string) {
    return this.request(`/flows/${id}/stats`)
  }

  async getFlowTemplates(): Promise<Array<{
    id: string
    name: string
    description: string
    module: string
    steps: number
    states: Record<string, any>
  }>> {
    return this.request('/flows/templates')
  }

  // Dashboard Statistics
  async getDashboardStats(): Promise<{
    totalAgents: number
    activeModels: number
    todayMessages: number
    todaySearches: number
    avgResponseTime: number
    successRate: number
    conversationsToday: number
    activeFlows: number
    totalFlows: number
    recentActivity: Array<{
      id: string
      type: string
      message: string
      time: string
      status: string
    }>
  }> {
    return this.request<any>('/stats/dashboard')
  }

  async getServiceHealth(): Promise<{
    asr: { status: string; providers: string[] }
    tts: { status: string }
    nlu: { status: string }
  }> {
    const [asr, tts, nlu] = await Promise.all([
      this.request<any>('/asr/health').catch(() => ({ status: 'down', providers: [] })),
      this.request<any>('/tts/health').catch(() => ({ status: 'down' })),
      this.request<any>('/nlu/health').catch(() => ({ status: 'down' })),
    ]);
    return { asr, tts, nlu };
  }

  async getAgentStats(): Promise<{
    agents: Array<{
      id: string
      name: string
      module: string
      status: string
      messagesHandled: number
      accuracy: number
    }>
    totalAgents: number
    activeAgents: number
  }> {
    return this.request<any>('/stats/agents')
  }

  async getAllFlowStats(): Promise<Array<{
    id: string
    name: string
    module: string
    enabled: boolean
    status: string
    totalRuns: number
    createdAt: Date
    updatedAt: Date
  }>> {
    return this.request<any>('/stats/flows')
  }

  // Agent Management
  async getAgents(): Promise<Array<{
    id: string
    name: string
    module: string
    icon: string
    color: string
    status: string
    model: string
    nluProvider: string
    accuracy: number
    messagesHandled: number
  }>> {
    return this.request<any>('/agents')
  }

  async getAgent(id: string): Promise<{
    id: string
    name: string
    module: string
    icon: string
    color: string
    status: string
    model: string
    nluProvider: string
    nluModel: string
    accuracy: number
    messagesHandled: number
    createdAt: string
    updatedAt: string
  }> {
    return this.request<any>(`/agents/${id}`)
  }

  async updateAgent(id: string, data: any) {
    return this.request(`/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async getAgentMetrics(id: string): Promise<{
    successRate: number
    avgResponseTime: number
    conversationsToday: number
    conversationsThisWeek: number
    topIntents: Array<{ intent: string; count: number }>
    recentActivity: Array<{ timestamp: string; message: string; success: boolean }>
  }> {
    return this.request<any>(`/agents/${id}/metrics`)
  }

  async getAgentConversations(id: string, limit = 50): Promise<Array<{
    id: string
    userId: string
    userMessage: string
    agentResponse: string
    intent: string
    confidence: number
    success: boolean
    timestamp: string
    duration: number
  }>> {
    return this.request<any>(`/agents/${id}/conversations?limit=${limit}`)
  }

  async getAgentFlows(id: string): Promise<Array<{
    id: string
    name: string
    description: string
    enabled: boolean
    steps: number
    usageCount: number
  }>> {
    return this.request<any>(`/agents/${id}/flows`)
  }

  async testAgent(id: string, message: string): Promise<{
    message: string
    intent: string
    confidence: number
  }> {
    return this.request<any>(`/agents/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  // Module Stats
  async getModuleStats(module: string): Promise<{
    module: string
    totalConversations: number
    conversationsToday: number
    completedOrders: number
    successRate: number
    averageSatisfaction: number
    activeFlows: number
    totalFlows: number
    supportedIntents: string[]
  }> {
    return this.request<any>(`/stats/modules/${module}`)
  }

  // Gamification - Settings
  async getGamificationSettings(): Promise<{
    success: boolean
    data: {
      all: Array<{
        key: string
        value: string
        type: string
        description: string
        category: string
        updated_at: string
        updated_by: string
      }>
      byCategory: Record<string, any[]>
    }
    meta: {
      total: number
      categories: string[]
      timestamp: string
    }
  }> {
    return this.request<any>('/gamification/settings')
  }

  async updateGamificationSettings(settings: Array<{ key: string; value: string }>): Promise<{
    success: boolean
    data: {
      updated: number
      failed: number
      results: Array<{ key: string; success: boolean; error?: string }>
    }
  }> {
    return this.request<any>('/gamification/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    })
  }

  // Gamification - Training Samples
  async getTrainingSamples(filters?: {
    status?: 'all' | 'pending' | 'approved' | 'rejected'
    search?: string
    limit?: number
    offset?: number
  }): Promise<{
    success: boolean
    data: Array<{
      id: number
      userId: number
      text: string
      intent: string
      entities: any[]
      confidence: number
      language: string
      tone: string
      source: string
      approved: boolean
      reviewStatus: string
      approvedBy: string | null
      approvedAt: string | null
      createdAt: string
    }>
    meta: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
      timestamp: string
    }
  }> {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<any>(`/gamification/training-samples${query}`)
  }

  async approveTrainingSample(id: number, approvedBy: string): Promise<{
    success: boolean
    message: string
  }> {
    return this.request<any>(`/gamification/training-samples/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: approvedBy }),
    })
  }

  async rejectTrainingSample(id: number, rejectedBy: string, reason?: string): Promise<{
    success: boolean
    message: string
  }> {
    return this.request<any>(`/gamification/training-samples/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: rejectedBy, reason }),
    })
  }

  async getTrainingSampleStats(): Promise<{
    success: boolean
    data: {
      total: number
      pending: number
      approved: number
      rejected: number
      autoApproved: number
    }
  }> {
    return this.request<any>('/gamification/training-samples/stats')
  }

  async exportTrainingSamples(format: 'json' | 'jsonl' | 'csv' = 'jsonl'): Promise<{
    success: boolean
    data: string
    meta: {
      format: string
      count: number
      timestamp: string
    }
  }> {
    return this.request<any>(`/gamification/training-samples/export?format=${format}`)
  }

  // Gamification - Stats
  async getGamificationStats(): Promise<{
    success: boolean
    data: {
      gamesPlayed: number
      rewardsCredited: number
      activeUsers: number
      trainingSamples: {
        total: number
        pending: number
        approved: number
        rejected: number
        autoApproved: number
      }
      systemStatus: {
        enabled: boolean
        autoApprovalRate: number
        avgConfidenceScore: number
        minConfidenceThreshold: number
      }
      summary: {
        totalGames: number
        totalRewards: number
        activeUsers: number
        pendingReviews: number
      }
    }
    meta: {
      timestamp: string
      cacheStatus: string
    }
  }> {
    return this.request<any>('/gamification/stats')
  }

  // Intent Management
  async getIntents(): Promise<Array<{
    id: string
    name: string
    description: string
    examples: string[]
    parameters: Record<string, unknown>
    enabled: boolean
    createdAt: string
    updatedAt: string
  }>> {
    return this.request('/intents')
  }

  async getIntent(id: string) {
    return this.request(`/intents/${id}`)
  }

  async createIntent(data: unknown) {
    return this.request('/intents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateIntent(id: string, data: unknown) {
    return this.request(`/intents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteIntent(id: string) {
    return this.request(`/intents/${id}`, {
      method: 'DELETE',
    })
  }
}

export const mangwaleAIClient = new MangwaleAIClient()
