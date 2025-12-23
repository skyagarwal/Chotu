import { useEffect, useRef, useState, useCallback } from 'react'

export interface TrainingJobUpdate {
  type: 'training_update'
  jobId: string
  status: string
  progress: number
  message?: string
  timestamp: number
}

export interface JobCreatedEvent {
  type: 'job_created'
  job: {
    id: string
    kind: string
    datasetId: string | null
    agentId: string | null
    status: string
    progress: number
    createdAt: Date | number
    updatedAt: Date | number
  }
  timestamp: number
}

export interface DatasetUpdateEvent {
  type: 'dataset_update'
  datasetId: string
  action: 'created' | 'updated' | 'deleted'
  timestamp: number
}

type WebSocketEvent = TrainingJobUpdate | JobCreatedEvent | DatasetUpdateEvent | { type: 'connected' | 'pong'; timestamp: number }

export interface UseTrainingWebSocketOptions {
  onJobUpdate?: (update: TrainingJobUpdate) => void
  onJobCreated?: (event: JobCreatedEvent) => void
  onDatasetUpdate?: (event: DatasetUpdateEvent) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Event) => void
}

export function useTrainingWebSocket(options: UseTrainingWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectRef = useRef<(() => void) | null>(null)
  const optionsRef = useRef(options)

  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const connect = useCallback(() => {
    // Get WebSocket URL from environment or default
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL

    if (!wsUrl) {
      const backendUrl = process.env.NEXT_PUBLIC_ADMIN_BACKEND_URL || 'http://localhost:8080'
      if (backendUrl.startsWith('http')) {
        wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws/training'
      } else {
        // Handle relative path or other formats
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host
        // Remove leading slash from backendUrl if present to avoid double slash
        const path = backendUrl.startsWith('/') ? backendUrl : `/${backendUrl}`
        // If backendUrl is just /api, we might want /ws/training or /api/ws/training
        // Assuming /ws/training is at the root of the backend service
        // If we are proxying /api -> backend, then we need to know where WS is.
        // Usually WS is at /ws/training on the backend.
        // If we use /api/ws/training, nginx might proxy it.
        // Let's assume we want to hit the same host/port as the window, but upgrade to WS.
        // If backendUrl is /api, it means we are using the same origin.
        wsUrl = `${protocol}//${host}/ws/training`
      }
    } else {
       // Ensure it ends with /ws/training if not already (or maybe the env var is just the base)
       // The env var NEXT_PUBLIC_WS_URL usually implies the full base URL for WS.
       // But the code appends /ws/training.
       // Let's check if the env var already has /ws/training or not.
       // If the env var is wss://admin.mangwale.ai/ws, then we might need to append /training?
       // The original code was: wsUrl = backendUrl.replace(...) + '/ws/training'
       // So it expects to append /ws/training.
       // If NEXT_PUBLIC_WS_URL is provided, we should probably assume it's the base.
       if (!wsUrl.endsWith('/ws/training')) {
          wsUrl = wsUrl.replace(/\/$/, '') + '/ws/training'
       }
    }

    console.log('[WebSocket] Connecting to:', wsUrl)

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[WebSocket] Connected')
        setIsConnected(true)
        setReconnectAttempts(0)
        optionsRef.current.onConnected?.()

        // Start ping interval to keep connection alive
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000) // Ping every 30 seconds
      }

      ws.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data)
          
          console.log('[WebSocket] Received:', data.type)

          switch (data.type) {
            case 'connected':
              console.log('[WebSocket] Server confirmed connection')
              break
            case 'training_update':
              optionsRef.current.onJobUpdate?.(data as TrainingJobUpdate)
              break
            case 'job_created':
              optionsRef.current.onJobCreated?.(data as JobCreatedEvent)
              break
            case 'dataset_update':
              optionsRef.current.onDatasetUpdate?.(data as DatasetUpdateEvent)
              break
            case 'pong':
              // Keepalive response
              break
            default:
              console.log('[WebSocket] Unknown message type:', data)
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
        optionsRef.current.onError?.(error)
      }

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected')
        setIsConnected(false)
        optionsRef.current.onDisconnected?.()

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        // Attempt to reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
        console.log(`[WebSocket] Reconnecting in ${delay}ms...`)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1)
          if (connectRef.current) {
            connectRef.current()
          }
        }, delay)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('[WebSocket] Connection error:', error)
    }
  }, [reconnectAttempts])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    connect()

    return () => {
      console.log('[WebSocket] Cleanup')
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }

      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return {
    isConnected,
    reconnectAttempts,
  }
}
