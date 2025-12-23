// WebSocket Client for Real-time Chat

import { io, Socket } from 'socket.io-client'
import type { ChatMessage, Session } from '@/types/chat'

// Auto-detect WebSocket URL based on current origin
// IMPORTANT: WebSocket connects via same domain to avoid CORS issues
// Traefik routes /socket.io to the AI backend
const getWsUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side: use localhost
    return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3200'
  }
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  
  console.log('🔍 WebSocket URL detection - hostname:', hostname, 'protocol:', protocol);
  
  // Production domains - use same domain to avoid CORS
  // Traefik has /socket.io routes configured for each domain
  if (hostname === 'chat.mangwale.ai' || hostname === 'www.chat.mangwale.ai') {
    return 'https://chat.mangwale.ai'; // WebSocket via Traefik on same domain
  }
  
  if (hostname === 'admin.mangwale.ai') {
    return 'https://admin.mangwale.ai'; // WebSocket via Traefik on same domain
  }

  // If we are on localhost, use localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('✅ Using localhost');
    return 'http://localhost:3200';
  }

  // If accessing via LAN IP (e.g., 100.x.x.x, 192.168.x.x), use same IP with port 3200
  if (hostname.match(/^(100|192\.168|10\.)/)) {
    const wsUrl = `${protocol}//${hostname}:3200`;
    console.log('✅ Using LAN IP:', wsUrl);
    return wsUrl;
  }

  // Fallback to env var, but filter out host.docker.internal
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl && !envUrl.includes('host.docker.internal')) {
    console.log('✅ Using env var:', envUrl);
    return envUrl;
  }

  console.log('⚠️ Using fallback localhost');
  return 'http://localhost:3200'
}

interface ChatEventHandlers {
  onMessage?: (message: ChatMessage) => void
  onSessionUpdate?: (session: Session) => void
  onTyping?: (isTyping: boolean) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
  // Location Events
  onRequestLocation?: (data: { sessionId: string; message?: string }) => void
  // Centralized Auth Event Handlers
  onAuthSynced?: (data: { userId: number; userName: string; token: string; platform: string }) => void
  onAuthLoggedOut?: () => void
  onAuthStatus?: (data: { authenticated: boolean; userId?: number; userName?: string }) => void
  onAuthSuccess?: (data: { userId: number; userName: string }) => void
  onAuthFailed?: (data: { message: string; reason?: string }) => void
}

interface SendMessagePayload {
  message: string
  sessionId: string
  platform?: string
  module?: string
  type?: 'text' | 'button_click' | 'quick_reply'
  action?: string
  metadata?: Record<string, unknown>
}

interface OptionClickPayload {
  sessionId: string
  optionId: string
  payload?: unknown
}

class ChatWebSocketClient {
  private socket: Socket | null = null
  private handlers: ChatEventHandlers = {}
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor() {
    this.connect()
  }

  private connect() {
    if (this.socket) {
      if (!this.socket.connected) {
        console.log('🔌 Socket exists but disconnected, reconnecting...')
        this.socket.connect()
      }
      return
    }

    const wsUrl = getWsUrl()
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}/ai-agent`)

    this.socket = io(`${wsUrl}/ai-agent`, {
      transports: ['websocket'], // Force websocket to avoid polling issues with proxies
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000, // Increased timeout
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected')
      this.reconnectAttempts = 0
      this.handlers.onConnect?.()
    })

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected')
      this.handlers.onDisconnect?.()
    })

    this.socket.on('message', (message: ChatMessage) => {
      this.handlers.onMessage?.(message)
    })

    this.socket.on('session:update', (session: Session) => {
      this.handlers.onSessionUpdate?.(session)
    })

    this.socket.on('session:joined', (data: { sessionId: string; history: ChatMessage[] }) => {
      console.log('📥 Session joined:', data.sessionId, 'History:', data.history.length)
      // Emit history messages to handler
      data.history.forEach(msg => this.handlers.onMessage?.(msg))
    })

    this.socket.on('typing', (isTyping: boolean) => {
      this.handlers.onTyping?.(isTyping)
    })

    this.socket.on('error', (error: Error) => {
      console.error('❌ WebSocket error:', error)
      this.handlers.onError?.(error)
    })

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ WebSocket connection error:', error)
      this.handlers.onError?.(error)
    })

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      this.reconnectAttempts = attemptNumber
      console.log(`🔄 Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed')
      this.handlers.onError?.(new Error('Failed to reconnect to WebSocket'))
    })

    // Centralized Auth Event Listeners
    this.socket.on('auth:synced', (data: { userId: number; userName: string; token: string; platform: string }) => {
      console.log('🔐 Auth synced from another channel:', data.platform)
      this.handlers.onAuthSynced?.(data)
    })

    this.socket.on('auth:logged_out', () => {
      console.log('🚪 Logged out from another channel')
      this.handlers.onAuthLoggedOut?.()
    })

    this.socket.on('auth:status', (data: { authenticated: boolean; userId?: number; userName?: string }) => {
      console.log('🔍 Auth status:', data)
      this.handlers.onAuthStatus?.(data)
    })

    this.socket.on('auth:success', (data: { userId: number; userName: string }) => {
      console.log('✅ Auth success:', data)
      this.handlers.onAuthSuccess?.(data)
    })

    this.socket.on('auth:failed', (data: { message: string; reason?: string }) => {
      console.error('❌ Auth failed:', data)
      this.handlers.onAuthFailed?.(data)
    })

    // Location request event - backend wants the client to share location
    this.socket.on('request:location', (data: { sessionId: string; message?: string }) => {
      console.log('📍 Location requested by server:', data)
      this.handlers.onRequestLocation?.(data)
    })
  }

  // Register event handlers
  on(handlers: ChatEventHandlers) {
    this.handlers = { ...this.handlers, ...handlers }
  }

  // Join a session room
  joinSession(sessionId: string, authData?: {
    userId?: number
    phone?: string
    email?: string
    token?: string
    name?: string
    zoneId?: number
  }) {
    if (!this.socket) {
      console.warn('⚠️ Socket not initialized, initializing...')
      this.connect()
    } else if (!this.socket.connected) {
      console.warn('⚠️ Socket not connected, attempting to connect...')
      this.socket.connect()
    }
    
    console.log('📱 Joining session:', sessionId, authData ? '(authenticated)' : '(guest)')
    this.socket?.emit('session:join', { 
      sessionId,
      ...authData 
    })
  }

  // Leave a session room
  leaveSession(sessionId: string) {
    console.log('👋 Leaving session:', sessionId)
    this.socket?.emit('session:leave', { sessionId })
  }

  // Send a message
  sendMessage(payload: SendMessagePayload) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected')
    }
    console.log('📤 Sending message:', payload)
    this.socket.emit('message:send', payload)
  }

  // Send typing indicator
  sendTyping(sessionId: string, isTyping: boolean) {
    this.socket?.emit('typing', { sessionId, isTyping })
  }

  // Handle option click
  handleOptionClick(payload: OptionClickPayload) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected')
    }
    console.log('🖱️ Handling option click:', payload)
    this.socket.emit('option:click', payload)
  }

  // Update location
  updateLocation(sessionId: string, lat: number, lng: number, zoneId?: number) {
    console.log('📍 Updating location:', { sessionId, lat, lng, zoneId })
    this.socket?.emit('location:update', { sessionId, lat, lng, zoneId })
  }

  // ===== CENTRALIZED AUTH METHODS =====

  /**
   * Broadcast auth login to sync across all channels
   */
  syncAuthLogin(data: {
    phone: string
    token: string
    userId: number
    userName?: string
    platform?: string
    sessionId: string
  }) {
    if (!this.socket?.connected) {
      console.error('❌ Cannot sync auth: WebSocket not connected')
      return
    }
    console.log('🔐 Syncing auth login across channels')
    this.socket.emit('auth:login', data)
  }

  /**
   * Broadcast auth logout to sync across all channels
   */
  syncAuthLogout(phone: string, sessionId: string) {
    if (!this.socket?.connected) {
      console.error('❌ Cannot sync logout: WebSocket not connected')
      return
    }
    console.log('🚪 Syncing logout across channels')
    this.socket.emit('auth:logout', { phone, sessionId })
  }

  /**
   * Check auth status from centralized store
   */
  checkAuthStatus(phone: string, sessionId: string) {
    if (!this.socket?.connected) {
      console.error('❌ Cannot check auth: WebSocket not connected')
      return
    }
    console.log('🔍 Checking centralized auth status')
    this.socket.emit('auth:check', { phone, sessionId })
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Disconnect
  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  // Reconnect manually
  reconnect() {
    this.disconnect()
    this.connect()
  }
}

// Singleton instance
let chatWSClient: ChatWebSocketClient | null = null

export const getChatWSClient = (): ChatWebSocketClient => {
  if (!chatWSClient) {
    chatWSClient = new ChatWebSocketClient()
  }
  return chatWSClient
}

export const disconnectChatWS = () => {
  chatWSClient?.disconnect()
  chatWSClient = null
}
