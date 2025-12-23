'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { Send, MapPin, User, RotateCcw, Menu, X, Plus, MessageSquare, ChevronDown, LogOut, Mic, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { getChatWSClient } from '@/lib/websocket/chat-client'
import { parseButtonsFromText } from '@/lib/utils/helpers'
import { ProductCard } from '@/components/chat/ProductCard'
import { InlineLogin } from '@/components/chat/InlineLogin'
import { VoiceInput } from '@/components/chat/VoiceInput'
import { EnhancedVoiceInput } from '@/components/chat/EnhancedVoiceInput'
import { TTSButton } from '@/components/chat/TTSButton'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import type { ChatMessage } from '@/types/chat'
import { useAuthStore } from '@/store/authStore'

// Use Google Maps based location picker for better UX
// Backend still uses OSRM for distance calculations (cost-effective)
const LocationPicker = dynamic(
  () => import('@/components/map/LocationPicker'),
  { ssr: false }
)

const modules = [
  { id: 'profile', name: 'Complete Profile & Earn', emoji: '👤' },
  // { id: 'game', name: 'Play & Earn', emoji: '🎮' },
  // { id: 'food', name: 'Food', emoji: '🍔' },
  // { id: 'ecom', name: 'Shopping', emoji: '🛒' },
  // { id: 'rooms', name: 'Hotels', emoji: '🏨' },
  // { id: 'movies', name: 'Movies', emoji: '🎬' },
  // { id: 'services', name: 'Services', emoji: '🔧' },
  // { id: 'parcel', name: 'Parcel', emoji: '📦' },
  // { id: 'ride', name: 'Ride', emoji: '🚗' },
  // { id: 'health', name: 'Health', emoji: '❤️' },
]

// Quick action suggestions for users
const quickActions = [
  { id: 'food', label: '🍔 Order Food', action: 'I want to order food' },
  { id: 'parcel', label: '📦 Send Parcel', action: 'I want to send a parcel' },
  { id: 'track', label: '🔍 Track Order', action: 'Track my order' },
  { id: 'help', label: '❓ Help', action: 'I need help' },
]

function ChatContent() {
  const searchParams = useSearchParams()
  const moduleParam = searchParams.get('module')
  const { isAuthenticated, user, token, _hasHydrated } = useAuthStore()

  // State definitions
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sessionIdState, setSessionIdState] = useState('')
  const [selectedModule, setSelectedModule] = useState<string | null>(moduleParam)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [useEnhancedVoice, setUseEnhancedVoice] = useState(true) // Enhanced voice mode with streaming
  const [interimTranscript, setInterimTranscript] = useState('') // For showing interim results
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({}) // Track which card groups are expanded

  const wsClientRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const cardScrollRefs = useRef<Record<string, HTMLDivElement | null>>({}) // For horizontal scrolling

  // Logout handler - syncs across all channels
  const handleLogout = () => {
    const { clearAuth, user } = useAuthStore.getState()
    
    // Sync logout across channels
    if (user?.phone && wsClientRef.current) {
      wsClientRef.current.syncAuthLogout(user.phone, sessionIdState)
    }
    
    clearAuth()
    localStorage.removeItem('mangwale-user-profile')
    setUserProfile(null)
    setShowProfile(false)
    window.location.reload()
  }

  // New Chat handler - properly resets session and WebSocket
  const handleNewChat = () => {
    // Leave current session
    if (wsClientRef.current && sessionIdState) {
      wsClientRef.current.leaveSession(sessionIdState)
    }
    
    // Clear session ID to force new one on reload
    localStorage.removeItem('mangwale-chat-session-id')
    
    // Clear messages state
    setMessages([])
    setSelectedModule(null)
    
    // Disconnect and reconnect WebSocket
    if (wsClientRef.current) {
      wsClientRef.current.disconnect()
    }
    
    // Reload to get fresh session
    window.location.reload()
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Initialize session ID and profile
  useEffect(() => {
    let sessionId = localStorage.getItem('mangwale-chat-session-id')
    if (!sessionId) {
      sessionId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('mangwale-chat-session-id', sessionId)
    }
    setSessionIdState(sessionId)
    
    const savedProfile = localStorage.getItem('mangwale-user-profile')
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile))
      } catch (e) {
        console.error('Failed to parse user profile', e)
      }
    }

    // Check if location is already captured
    // Auto-location prompt disabled to allow for initial small talk
    // Location will be requested when needed via conversation flow
  }, [])

  // Sync auth store user to local state
  useEffect(() => {
    if (user) {
      const profile = {
        name: `${user.f_name} ${user.l_name || ''}`.trim(),
        phone: user.phone
      }
      setUserProfile(profile)
      localStorage.setItem('mangwale-user-profile', JSON.stringify(profile))
    }
  }, [user])

  const authData = useMemo(() => {
    if (isAuthenticated && user) {
      return {
        userId: user.id,
        phone: user.phone,
        email: user.email,
        token: token || undefined,
        name: `${user.f_name} ${user.l_name || ''}`.trim()
      }
    }
    return undefined
  }, [isAuthenticated, user, token])

  // WebSocket connection setup
  useEffect(() => {
    if (!_hasHydrated) return

    const wsClient = getChatWSClient()
    wsClientRef.current = wsClient

    const getJoinData = () => {
      const zoneIdStr = localStorage.getItem('mangwale-user-zone-id')
      const zoneId = zoneIdStr ? parseInt(zoneIdStr) : undefined
      return authData ? { ...authData, zoneId } : { zoneId }
    }

    wsClient.on({
      onConnect: () => {
        console.log('✅ WebSocket connected')
        setIsConnected(true)
        // Pass authData to joinSession if available, otherwise just session ID
        wsClient.joinSession(sessionIdState, getJoinData())
        
        // Send initial greeting with user context if authenticated
        // This makes the chatbot aware of the user before they start talking
        if (authData && authData.name) {
          console.log(`👤 User identified: ${authData.name}`)
          // Add a brief delay to allow session to be established
          setTimeout(() => {
            wsClient.sendMessage({
              message: '__init__', // Special message to trigger user-aware greeting
              sessionId: sessionIdState,
              platform: 'web',
              type: 'text',
              metadata: {
                isInit: true,
                userName: authData.name,
                userId: authData.userId,
                phone: authData.phone,
              }
            })
          }, 500)
        }
      },
      onDisconnect: () => {
        console.log('❌ WebSocket disconnected')
        setIsConnected(false)
      },
      onMessage: (message) => {
        console.log('📥 Received message:', message)
        
        // DEBUG: Check for cards
        if (message.cards && message.cards.length > 0) {
            console.log('🃏 Found cards in message root:', message.cards.length);
        }
        if (message.metadata && message.metadata.cards && message.metadata.cards.length > 0) {
            console.log('🃏 Found cards in metadata:', message.metadata.cards.length);
        }

        // Check for auth data in metadata (NEW)
        if (message.metadata && message.metadata.auth_data) {
           const { token, user } = message.metadata.auth_data;
           console.log('🔐 Received auth data from chat:', user);
           
           // Update auth store
           const { setAuth } = useAuthStore.getState();
           
           // Map backend user profile to frontend user structure
           const mappedUser = {
             ...user,
             f_name: user.firstName,
             l_name: user.lastName
           };
           
           setAuth(mappedUser, token);
           
           // Also update local profile state immediately
           const profile = {
             name: `${mappedUser.f_name} ${mappedUser.l_name || ''}`.trim(),
             phone: mappedUser.phone
           }
           setUserProfile(profile)
           localStorage.setItem('mangwale-user-profile', JSON.stringify(profile))
        }

        // Handle both content (new) and text (legacy) fields
        const textContent = message.content || (message as { text?: string }).text || ''
        const { cleanText, buttons: parsedButtons } = parseButtonsFromText(textContent)
        
        // Deduplicate messages by ID to prevent duplicates on reconnection
        setMessages(prev => {
          const messageId = message.id || `bot-${prev.length}-${Date.now()}`
          
          // Check if message with same ID already exists
          if (prev.some(m => m.id === messageId || m.id === message.id)) {
            console.log('⚠️ Skipping duplicate message:', messageId)
            return prev
          }
          
          return [...prev, {
            id: messageId,
            // Handle both role (new) and sender (legacy) fields
            role: (message.role === 'user' || (message as { sender?: string }).sender === 'user') ? 'user' : 'assistant',
            content: cleanText,
            timestamp: message.timestamp || Date.now(),
            buttons: parsedButtons.length > 0 ? parsedButtons : (message.buttons || undefined),
            cards: message.cards || (message.metadata && message.metadata.cards) || undefined,
          }]
        })
        setIsTyping(false)
      },
      onError: (error) => {
        console.error('❌ WebSocket error:', error)
        setMessages(prev => [...prev, {
          id: `error-${prev.length}`,
          role: 'assistant',
          content: 'Connection lost. Please refresh the page.',
          timestamp: Date.now(),
        }])
      },
      // Centralized Auth Sync Handlers
      onAuthSynced: (data) => {
        console.log('🔐 Auth synced from:', data.platform)
        const { syncFromRemote } = useAuthStore.getState()
        syncFromRemote(data)
        
        // Update local profile
        const profile = { name: data.userName, phone: '' }
        setUserProfile(profile)
        localStorage.setItem('mangwale-user-profile', JSON.stringify(profile))
        
        // Show notification
        setMessages(prev => [...prev, {
          id: `auth-sync-${Date.now()}`,
          role: 'assistant',
          content: `✅ You're now logged in! (Synced from ${data.platform === 'whatsapp' ? 'WhatsApp' : data.platform})`,
          timestamp: Date.now(),
        }])
      },
      onAuthLoggedOut: () => {
        console.log('🚪 Logged out from another channel')
        const { clearAuth } = useAuthStore.getState()
        clearAuth('remote')
        setUserProfile(null)
        localStorage.removeItem('mangwale-user-profile')
        
        // Show notification
        setMessages(prev => [...prev, {
          id: `auth-logout-${Date.now()}`,
          role: 'assistant',
          content: '👋 You have been logged out from another device.',
          timestamp: Date.now(),
        }])
      },
      onAuthSuccess: (data) => {
        console.log('✅ Auth success:', data)
      },
      onAuthFailed: (data) => {
        console.error('❌ Auth failed:', data)
      },
      // Location request handler - server wants user to share location
      onRequestLocation: (data) => {
        console.log('📍 Server requesting location:', data)
        // Show the location picker
        setShowLocationPicker(true)
      },
    })

    if (wsClient.isConnected()) {
      console.log('✅ WebSocket already connected')
      setIsConnected(true)
      wsClient.joinSession(sessionIdState, getJoinData())
    }

    return () => {
      wsClient.leaveSession(sessionIdState)
    }
  }, [sessionIdState, _hasHydrated, authData])

  // Helper to check if a message is an internal action (should not be displayed)
  const isInternalAction = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim()
    
    // Exact matches for internal actions
    const internalActions = [
      'cancel_resume',
      'confirm_cancel', 
      'cancel',
      'resume',
      '__init__',
      'location_shared',
      'confirm_location',
      'retry_location',
      // Button action values (should not be shown to user)
      'order_food',
      'send_parcel',
      'shop_online', 
      'help_support',
      'btn_food',
      'btn_parcel',
      'btn_shop',
      'btn_help',
    ]
    if (internalActions.includes(lowerText)) return true
    
    // Pattern matches for button actions
    // Actions like "Add Chicken Good Chilli to cart", "select_pizza", etc.
    if (lowerText.startsWith('add ') && lowerText.includes(' to cart')) return true
    if (lowerText.startsWith('select_')) return true
    if (lowerText.startsWith('btn_')) return true
    if (lowerText.startsWith('action_')) return true
    
    return false
  }

  const handleSend = (textInput?: string, buttonAction?: string) => {
    const messageText = textInput || input.trim()
    if (!messageText) return

    if (!isConnected) {
      setMessages(prev => [...prev, {
        id: `error-${prev.length}`,
        role: 'assistant',
        content: 'Connection lost. Please refresh the page.',
        timestamp: Date.now(),
      }])
      return
    }

    try {
      console.log('🚀 Sending message via WebSocket:', messageText)
      
      // Only add user message to UI if it's not an internal action
      if (!isInternalAction(messageText)) {
        setMessages(prev => [...prev, {
          id: `msg-${prev.length}-${Date.now()}`,
          role: 'user',
          content: messageText,
          timestamp: Date.now(),
        }])
      }

      if (!textInput) setInput('')
      setIsTyping(true)

      // Send via WebSocket
      wsClientRef.current?.sendMessage({
        message: messageText,
        sessionId: sessionIdState,
        platform: 'web',
        type: buttonAction ? 'button_click' : 'text',
        action: buttonAction,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsTyping(false)
      setMessages(prev => [...prev, {
        id: `error-${prev.length}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      }])
    }
  }

  const handleSendClick = () => {
    void handleSend()
  }

  const handleModuleSelect = (moduleId: string) => {
    if (moduleId === 'profile') {
      if (!isAuthenticated) {
        setShowLoginModal(true)
        return
      }
      // If authenticated, trigger profile completion flow
      handleSend('complete my profile')
      return
    }

    setSelectedModule(moduleId)
    const selectedModuleData = modules.find(m => m.id === moduleId)
    
    setMessages(prev => [
      ...prev,
      {
        id: `module-${prev.length}-${Date.now()}`,
        role: 'assistant',
        content: `Great! I'm now your ${selectedModuleData?.name} assistant. What would you like to do?`,
        timestamp: Date.now(),
      }
    ])
  }

  const handleLocationConfirm = async (location: {
    lat: number
    lng: number
    address: string
    road?: string
    house?: string
    floor?: string
    contact_person_name?: string
    contact_person_number?: string
    address_type?: string
    zoneId?: number
  }) => {
    setShowLocationPicker(false)
    
    // Only update profile if contact info is provided (legacy support)
    if (location.contact_person_name && location.contact_person_number) {
      const profile = {
        name: location.contact_person_name,
        phone: location.contact_person_number
      }
      
      // Update auth store if user is authenticated
      if (user) {
        const { updateUser } = useAuthStore.getState()
        updateUser({
          f_name: location.contact_person_name.split(' ')[0],
          l_name: location.contact_person_name.split(' ').slice(1).join(' ') || undefined,
          phone: location.contact_person_number,
        })
      }
      
      // Also save to localStorage for backward compatibility
      localStorage.setItem('mangwale-user-profile', JSON.stringify(profile))
      setUserProfile(profile)
    }
    
    // Save location data for delivery app
    const locationData = {
      lat: location.lat,
      lng: location.lng,
      address: location.address,
      timestamp: Date.now(),
      zoneId: location.zoneId
    }
    localStorage.setItem('mangwale-user-location', JSON.stringify(locationData))
    localStorage.setItem('user-location-captured', 'true')

    // Save zone ID separately for API interceptor access
    if (location.zoneId) {
      localStorage.setItem('mangwale-user-zone-id', location.zoneId.toString())
    }
    
    // Send location to backend via WebSocket
    if (wsClientRef.current) {
      wsClientRef.current.updateLocation(sessionIdState, location.lat, location.lng, location.zoneId)
    }
    
    // Format the complete address message for display
    let fullAddress = `${location.address}`
    
    if (location.contact_person_name) {
      fullAddress += `\nContact: ${location.contact_person_name} (${location.contact_person_number})`
    }
    if (location.address_type) {
      fullAddress += `\nType: ${location.address_type}`
    }
    
    if (location.house) {
      fullAddress += `\nHouse/Flat: ${location.house}`
    }
    if (location.floor) {
      fullAddress += `, Floor: ${location.floor}`
    }
    if (location.road) {
      fullAddress += `\nRoad: ${location.road}`
    }
    
    // Add location shared message with formatted details
    const displayMessage = `📍 Location shared:\n${fullAddress}\n\nCoordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
    
    // Send to backend - handleSend will add the message to chat
    await handleSend(displayMessage)
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&libraries=places`}
        strategy="lazyOnload"
        onLoad={() => console.log('✅ Google Maps API loaded')}
      />

      <div className="flex h-screen bg-white text-gray-900 overflow-hidden font-sans">
        {/* Sidebar - Desktop */}
        <div className="hidden md:flex flex-col w-[260px] bg-gray-900 text-gray-100 p-3 transition-all">
          {/* Logo header */}
          <div className="flex items-center gap-2.5 px-2 py-2 mb-3">
            <Image 
              src="/mangwale-logo.png" 
              alt="Mangwale" 
              width={32} 
              height={32} 
              className="rounded-lg"
            />
            <span className="font-bold text-lg">Mangwale</span>
          </div>
          
          <button 
            onClick={handleNewChat}
            className="flex items-center gap-3 px-3 py-3 rounded-md border border-gray-700 hover:bg-gray-800 transition-colors mb-4 text-sm text-left"
          >
            <Plus className="w-4 h-4" />
            <span>New chat</span>
          </button>

          <div className="flex-1 overflow-y-auto">
            <div className="text-xs font-medium text-gray-500 mb-2 px-3">Today</div>
            <button className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-gray-800 transition-colors w-full text-left text-sm truncate">
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">New Conversation</span>
            </button>
          </div>

          <div className="border-t border-gray-700 pt-3 mt-2 relative">
             {showProfile && (
               <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 rounded-md shadow-lg overflow-hidden border border-gray-700 z-50">
                 <div className="p-3 border-b border-gray-700">
                   <div className="text-xs text-gray-400">Wallet Balance</div>
                   <div className="text-lg font-bold text-green-400">₹0.00</div>
                 </div>
                 <Link href="/orders" className="flex items-center gap-3 px-3 py-3 hover:bg-gray-700 transition-colors text-sm">
                   <RotateCcw className="w-4 h-4" />
                   <span>Order History</span>
                 </Link>
                 <button 
                   onClick={handleLogout}
                   className="flex items-center gap-3 px-3 py-3 hover:bg-gray-700 transition-colors text-sm w-full text-left text-red-400"
                 >
                   <LogOut className="w-4 h-4" />
                   <span>Log out</span>
                 </button>
               </div>
             )}
             {userProfile ? (
                <div className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-gray-800 cursor-pointer" onClick={() => setShowProfile(!showProfile)}>
                  <div className="w-8 h-8 bg-green-600 rounded-sm flex items-center justify-center text-white font-bold">
                    {userProfile.name ? userProfile.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{userProfile.name || 'User'}</div>
                  </div>
                </div>
             ) : (
                <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-gray-800 w-full text-left text-sm">
                  <User className="w-4 h-4" />
                  <span>Log in</span>
                </button>
             )}
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}
        
        {/* Mobile Sidebar */}
        <div className={`fixed inset-y-0 left-0 w-[260px] bg-gray-900 text-gray-100 p-3 z-50 transform transition-transform duration-300 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <button onClick={() => setIsSidebarOpen(false)} className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white">
             <X className="w-6 h-6" />
           </button>
           
           {/* Logo header in mobile sidebar */}
           <div className="flex items-center gap-2.5 px-2 py-2 mb-3 mt-1">
             <Image 
               src="/mangwale-logo.png" 
               alt="Mangwale" 
               width={32} 
               height={32} 
               className="rounded-lg"
             />
             <span className="font-bold text-lg">Mangwale</span>
           </div>
           
           <button 
            onClick={handleNewChat}
            className="flex items-center gap-3 px-3 py-3 rounded-md border border-gray-700 hover:bg-gray-800 transition-colors mb-4 text-sm text-left"
          >
            <Plus className="w-4 h-4" />
            <span>New chat</span>
          </button>

          <div className="flex-1 overflow-y-auto">
            <div className="text-xs font-medium text-gray-500 mb-2 px-3">Today</div>
            <button className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-gray-800 transition-colors w-full text-left text-sm truncate">
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">New Conversation</span>
            </button>
          </div>

          <div className="border-t border-gray-700 pt-3 mt-2 relative">
             {showProfile && (
               <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 rounded-md shadow-lg overflow-hidden border border-gray-700 z-50">
                 <div className="p-3 border-b border-gray-700">
                   <div className="text-xs text-gray-400">Wallet Balance</div>
                   <div className="text-lg font-bold text-green-400">₹0.00</div>
                 </div>
                 <Link href="/orders" className="flex items-center gap-3 px-3 py-3 hover:bg-gray-700 transition-colors text-sm">
                   <RotateCcw className="w-4 h-4" />
                   <span>Order History</span>
                 </Link>
                 <button 
                   onClick={handleLogout}
                   className="flex items-center gap-3 px-3 py-3 hover:bg-gray-700 transition-colors text-sm w-full text-left text-red-400"
                 >
                   <LogOut className="w-4 h-4" />
                   <span>Log out</span>
                 </button>
               </div>
             )}
             {userProfile ? (
                <div className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-gray-800 cursor-pointer" onClick={() => setShowProfile(!showProfile)}>
                  <div className="w-8 h-8 bg-green-600 rounded-sm flex items-center justify-center text-white font-bold">
                    {userProfile.name ? userProfile.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{userProfile.name || 'User'}</div>
                  </div>
                </div>
             ) : (
                <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-gray-800 w-full text-left text-sm">
                  <User className="w-4 h-4" />
                  <span>Log in</span>
                </button>
             )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full relative">
          {/* Mobile Header - Improved with logo */}
          <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-30">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 -ml-1 text-gray-600 hover:bg-gray-100 rounded-xl active:scale-95 transition-all">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Image 
                src="/mangwale-logo.png" 
                alt="Mangwale" 
                width={28} 
                height={28} 
                className="rounded-lg"
              />
              <span className="font-bold text-gray-800 text-sm">Mangwale</span>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
            </div>
            <button onClick={handleNewChat} className="p-2.5 -mr-1 text-gray-600 hover:bg-gray-100 rounded-xl active:scale-95 transition-all">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop Model Selector (Header) */}
          <div className="hidden md:flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
             <div className="flex items-center gap-2 text-gray-700 font-medium cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
                <span>Mangwale AI 3.5</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
             </div>
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
             </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto scroll-smooth overscroll-contain">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 min-h-full">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] sm:min-h-[calc(100vh-200px)] text-center px-2">
                  {/* Logo & Avatar combo */}
                  <div className="relative mb-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full shadow-lg flex items-center justify-center border-4 border-orange-200 overflow-hidden relative animate-bounce-slow">
                      <Image 
                        src="/chotu-avatar.png" 
                        alt="Chotu - Mangwale AI" 
                        fill
                        className="object-cover p-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerHTML = '<span class="text-3xl sm:text-4xl">🤖</span>'
                          }
                        }}
                      />
                    </div>
                    {/* Small Mangwale badge */}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-orange-200">
                      <Image 
                        src="/mangwale-logo.png" 
                        alt="Mangwale" 
                        width={24} 
                        height={24}
                        className="rounded-md"
                      />
                    </div>
                  </div>
                  
                  {/* Greeting with time awareness */}
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
                    {(() => {
                      const hour = new Date().getHours()
                      if (hour < 12) return 'Good Morning! ☀️'
                      if (hour < 17) return 'Good Afternoon! 🌤️'
                      if (hour < 21) return 'Good Evening! 🌅'
                      return 'Hello Night Owl! 🌙'
                    })()}
                  </h2>
                  <p className="text-base sm:text-lg text-gray-600 mb-1">I&apos;m <span className="font-semibold text-orange-600">Chotu</span> - your Nashik buddy!</p>
                  <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">Order food, send parcels, or just chat with me 💬</p>
                  
                  {/* Quick action cards - Mobile optimized grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-md sm:max-w-2xl mb-4 sm:mb-6">
                    <button 
                      onClick={() => handleSend('I want to order food')}
                      className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl sm:rounded-2xl border-2 border-orange-200 hover:border-orange-400 hover:shadow-lg active:scale-[0.98] transition-all group"
                    >
                      <span className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">🍔</span>
                      <span className="font-semibold text-gray-800 text-xs sm:text-sm">Order Food</span>
                      <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Restaurants near you</span>
                    </button>
                    <button 
                      onClick={() => handleSend('I want to send a parcel')}
                      className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl sm:rounded-2xl border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg active:scale-[0.98] transition-all group"
                    >
                      <span className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">📦</span>
                      <span className="font-semibold text-gray-800 text-xs sm:text-sm">Send Parcel</span>
                      <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Quick delivery</span>
                    </button>
                    <button 
                      onClick={() => handleSend('Track my order')}
                      className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl border-2 border-green-200 hover:border-green-400 hover:shadow-lg active:scale-[0.98] transition-all group"
                    >
                      <span className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">🔍</span>
                      <span className="font-semibold text-gray-800 text-xs sm:text-sm">Track Order</span>
                      <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Real-time updates</span>
                    </button>
                    <button 
                      onClick={() => setShowLocationPicker(true)}
                      className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg active:scale-[0.98] transition-all group"
                    >
                      <span className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">📍</span>
                      <span className="font-semibold text-gray-800 text-xs sm:text-sm">Set Location</span>
                      <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">For delivery</span>
                    </button>
                  </div>
                  
                  {/* Suggestion chips - Horizontally scrollable on mobile */}
                  <div className="w-full max-w-md sm:max-w-lg">
                    <span className="text-[10px] sm:text-xs text-gray-400 block text-center mb-2">Try saying:</span>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-start sm:justify-center sm:flex-wrap px-1">
                      {['What can you do?', 'Show me biryani', 'kya chal raha hai?', 'I\'m hungry'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSend(suggestion)}
                          className="flex-shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[11px] sm:text-xs text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 active:scale-95 transition-all whitespace-nowrap shadow-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages
                    .filter((message) => {
                      // Hide internal/system messages from display
                      const content = message.content.toLowerCase().trim()
                      
                      // Internal action values (sent by button clicks or system)
                      const internalActions = [
                        'cancel_resume', 'yes_resume', 'confirm_cancel', 
                        'cancel', 'resume', '__init__', 'location_shared',
                        'confirm_location', 'retry_location', 'yes, resume',
                        'no, thanks', 'no thanks', 'confirm', 'retry',
                        // Button action values
                        'order_food', 'send_parcel', 'shop_online', 'help_support',
                        'btn_food', 'btn_parcel', 'btn_shop', 'btn_help',
                        'order food', 'send parcel', 'shop online', 'help & support',
                      ]
                      if (internalActions.includes(content)) return false
                      
                      // Pattern matches for cart actions
                      if (content.startsWith('add ') && content.includes(' to cart')) return false
                      if (content.startsWith('select_') || content.startsWith('btn_') || content.startsWith('action_')) return false
                      
                      // Hide location shared messages (shown as map confirmation instead)
                      if (content.includes('📍 location shared') || content.includes('location shared:')) return false
                      
                      // Hide internal commands (like __init__, __LOCATION__)
                      if (content.startsWith('__') && content.endsWith('__')) return false
                      
                      // Hide coordinates-only messages
                      if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(content)) return false
                      
                      // Hide single digit/number responses (selecting from numbered list)
                      if (message.role === 'user' && /^\d{1,2}$/.test(content)) return false
                      
                      return true
                    })
                    .map((message, msgIndex) => (
                    <div 
                      key={message.id} 
                      className={`group w-full ${message.role === 'user' ? 'flex justify-end' : ''}`}
                    >
                      <div className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] md:max-w-[75%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar - Smaller on mobile */}
                        <div className="flex-shrink-0">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center overflow-hidden relative ${
                            message.role === 'user' 
                              ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-sm' 
                              : 'bg-gradient-to-br from-orange-100 to-orange-50 border-2 border-orange-200'
                          }`}>
                            {message.role === 'user' ? (
                              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                            ) : (
                              <Image 
                                src="/chotu-avatar.png" 
                                alt="Chotu" 
                                fill
                                className="object-cover p-0.5"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                    if (e.currentTarget.parentElement) {
                                      e.currentTarget.parentElement.innerHTML = '<span class="text-lg">🤖</span>'
                                    }
                                }}
                              />
                            )}
                          </div>
                        </div>
                        
                        {/* Message bubble */}
                        <div className={`relative flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                          <div className={`inline-block px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-[13px] sm:text-sm leading-relaxed ${
                            message.role === 'user' 
                              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white rounded-br-md' 
                              : 'bg-gray-100 text-gray-800 rounded-bl-md'
                          }`}>
                            <span className="whitespace-pre-wrap">{message.content}</span>
                          </div>
                          
                          {/* TTS Button - only for assistant */}
                          {message.role === 'assistant' && message.content && (
                            <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TTSButton text={message.content} language="hi-IN" />
                            </div>
                          )}

                          {/* Buttons - Zomato style compact pills */}
                          {message.role === 'assistant' && message.buttons && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {message.buttons.map((button) => (
                                <button
                                  key={button.id}
                                  onClick={() => {
                                    if (button.value === '__LOGIN__' || button.value === '__AUTHENTICATE__') {
                                      setShowLoginModal(true)
                                    } else if (button.value === '__LOCATION__' || button.value === '__REQUEST_LOCATION__') {
                                      setShowLocationPicker(true)
                                    } else {
                                      handleSend(button.value, button.id || button.value)
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-white border border-gray-200 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-full text-xs font-medium transition-all shadow-sm active:scale-95"
                                >
                                  {button.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Cards - Compact horizontal scroll with max 6 visible */}
                          {message.role === 'assistant' && message.cards && message.cards.length > 0 && (
                            <div className="mt-3">
                              {/* Card count badge */}
                              {message.cards.length > 1 && (
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    {message.cards.length} items found
                                  </span>
                                  {message.cards.length > 6 && (
                                    <button
                                      onClick={() => setExpandedCards(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                                    >
                                      {expandedCards[message.id] ? 'Show less' : `View all ${message.cards.length}`}
                                    </button>
                                  )}
                                </div>
                              )}
                              
                              {/* Horizontal scrolling container */}
                              <div className="relative group">
                                {/* Scroll buttons for desktop */}
                                {message.cards.length > 2 && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const container = cardScrollRefs.current[message.id]
                                        if (container) container.scrollBy({ left: -200, behavior: 'smooth' })
                                      }}
                                      className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 bg-white shadow-lg rounded-full items-center justify-center text-gray-600 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const container = cardScrollRefs.current[message.id]
                                        if (container) container.scrollBy({ left: 200, behavior: 'smooth' })
                                      }}
                                      className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 bg-white shadow-lg rounded-full items-center justify-center text-gray-600 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <ChevronRight className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                                
                                <div 
                                  ref={el => { cardScrollRefs.current[message.id] = el }}
                                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent snap-x snap-mandatory"
                                  style={{ scrollbarWidth: 'thin' }}
                                >
                                  {(expandedCards[message.id] ? message.cards : message.cards.slice(0, 6)).map((card, cardIndex) => (
                                    <div key={card.id} className="snap-start">
                                      <ProductCard
                                        card={card}
                                        onAction={(value) => handleSend(value)}
                                        index={cardIndex}
                                        compact={message.cards!.length > 2}
                                        direction={cardIndex % 2 === 0 ? 'left' : 'right'}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Show more indicator for mobile */}
                              {message.cards.length > 6 && !expandedCards[message.id] && (
                                <div className="text-center mt-2">
                                  <button
                                    onClick={() => setExpandedCards(prev => ({ ...prev, [message.id]: true }))}
                                    className="text-xs text-orange-600 hover:text-orange-700 font-medium py-1 px-3 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors"
                                  >
                                    +{message.cards.length - 6} more items
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3 max-w-[85%] animate-pulse">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-50 border-2 border-orange-200 rounded-full flex items-center justify-center overflow-hidden relative flex-shrink-0">
                            <Image 
                              src="/chotu-avatar.png" 
                              alt="Chotu" 
                              fill
                              className="object-cover p-0.5"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.innerHTML = '<span class="text-lg">🤖</span>'
                                }
                              }}
                            />
                        </div>
                        <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions - Above Input (shown when chatting) */}
          {messages.length > 0 && (
            <div className="w-full bg-gradient-to-t from-white via-white/95 to-transparent pt-1 pb-0.5 sm:pt-2 sm:pb-1">
              <div className="max-w-3xl mx-auto px-3 sm:px-4">
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 sm:pb-2 scrollbar-hide">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleSend(action.action)}
                      className="flex-shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white border border-gray-200 rounded-full text-[11px] sm:text-xs font-medium text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 active:scale-95 transition-all whitespace-nowrap shadow-sm"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input Area - Safe area aware */}
          <div className="w-full border-t bg-white/95 backdrop-blur-sm pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-area-inset-bottom">
            <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-3 sm:pb-4 md:pb-6">
               <div className="relative flex items-end gap-1.5 sm:gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 sm:p-2 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 focus-within:bg-white transition-all">
                  <button 
                    onClick={() => setShowLocationPicker(true)}
                    className="p-2 sm:p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors active:scale-95"
                    title="Share Location"
                  >
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                    placeholder="Message Mangwale AI..."
                    className="flex-1 max-h-[100px] sm:max-h-[120px] min-h-[22px] sm:min-h-[24px] bg-transparent border-0 focus:ring-0 focus:outline-none p-0 resize-none py-1.5 sm:py-2 text-[13px] sm:text-sm placeholder:text-gray-400"
                    rows={1}
                    style={{ height: 'auto', minHeight: '22px' }}
                  />

                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {useEnhancedVoice ? (
                      <EnhancedVoiceInput 
                        onTranscription={(text) => {
                          setInput(text)
                          setInterimTranscript('')
                          setTimeout(() => handleSend(text), 100)
                        }}
                        onInterimTranscription={(text) => {
                          setInterimTranscript(text)
                        }}
                        language="hi-IN"
                        enableStreaming={true}
                        showSettings={true}
                        autoSend={true}
                        className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors active:scale-95"
                      />
                    ) : (
                      <VoiceInput 
                        onTranscription={(text) => {
                          setInput(text)
                          setTimeout(() => handleSend(text), 100)
                        }}
                        language="hi-IN"
                        className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors active:scale-95"
                      />
                    )}
                    <button
                        onClick={handleSendClick}
                        disabled={!input.trim() || isTyping}
                        className={`p-2 sm:p-2.5 rounded-xl transition-all ${
                            input.trim() && !isTyping 
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500 shadow-md hover:shadow-lg active:scale-95' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                  </div>
               </div>
               {/* Interim transcript display */}
               {interimTranscript && (
                 <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs text-gray-500 italic bg-orange-50 rounded-xl mt-2 flex items-center gap-2">
                   <Mic className="w-3 h-3 text-orange-500 animate-pulse" />
                   <span className="truncate">{interimTranscript}...</span>
                 </div>
               )}
               <div className="text-center mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-400 flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                  <span className="hidden sm:inline">Mangwale AI can make mistakes. Consider checking important information.</span>
                  <span className="sm:hidden">AI can make mistakes</span>
                  <button 
                    onClick={() => setUseEnhancedVoice(!useEnhancedVoice)}
                    className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs ${useEnhancedVoice ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    title={useEnhancedVoice ? 'Using streaming voice' : 'Using basic voice'}
                  >
                    <Mic className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-0.5" />
                    <span className="hidden sm:inline">{useEnhancedVoice ? 'Streaming' : 'Basic'}</span>
                  </button>
               </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showLocationPicker && (
            <LocationPicker
            onLocationConfirm={handleLocationConfirm}
            onCancel={() => setShowLocationPicker(false)}
            />
        )}

        {showLoginModal && (
            <InlineLogin
            onClose={() => setShowLoginModal(false)}
            onSuccess={() => {
                setShowLoginModal(false)
                setTimeout(() => setShowLocationPicker(true), 1000)
            }}
            />
        )}
      </div>
    </>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#fffff6]">Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  )
}
