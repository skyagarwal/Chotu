'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Clock, MapPin, Phone, ChevronDown, ChevronRight, Check, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface Order {
  id: string
  module: string
  moduleIcon: string
  type: string
  status: 'pending' | 'confirmed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled'
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  total: number
  createdAt: string
  estimatedDelivery?: string
  deliveryAddress?: string
  tracking?: {
    steps: Array<{
      label: string
      completed: boolean
      time?: string
    }>
  }
  contact?: {
    name: string
    phone: string
  }
}

const MODULE_ICONS: Record<string, string> = {
  food: '🍔',
  ecom: '🛒',
  parcel: '📦',
  ride: '🚗',
  rooms: '🏨',
  movies: '🎬',
  health: '🏥',
  services: '🔧',
}

const MODULE_TYPES: Record<string, string> = {
  food: 'Food Delivery',
  ecom: 'Shopping',
  parcel: 'Parcel Delivery',
  ride: 'Ride Booking',
  rooms: 'Hotel Booking',
  movies: 'Movie Ticket',
  health: 'Healthcare',
  services: 'Service Booking',
}

// Transform backend order to frontend format
const transformOrder = (backendOrder: any): Order => {
  const module = backendOrder.order_type || backendOrder.module || 'food'
  return {
    id: backendOrder.id?.toString() || `ORD-${Date.now()}`,
    module,
    moduleIcon: MODULE_ICONS[module] || '📦',
    type: MODULE_TYPES[module] || 'Order',
    status: backendOrder.order_status || 'pending',
    items: backendOrder.details?.map((item: any) => ({
      name: item.food_details?.name || item.product_details?.name || item.name || 'Item',
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
    })) || [],
    total: parseFloat(backendOrder.order_amount) || 0,
    createdAt: backendOrder.created_at || new Date().toISOString(),
    estimatedDelivery: backendOrder.expected_delivery_time || backendOrder.schedule_at,
    deliveryAddress: backendOrder.delivery_address?.address || backendOrder.delivery_address,
    tracking: backendOrder.tracking || generateTrackingSteps(backendOrder.order_status),
    contact: backendOrder.delivery_man ? {
      name: `${backendOrder.delivery_man.f_name || ''} ${backendOrder.delivery_man.l_name || ''}`.trim() || 'Delivery Partner',
      phone: backendOrder.delivery_man.phone || '',
    } : undefined,
  }
}

// Generate tracking steps based on status
const generateTrackingSteps = (status: string) => {
  const steps = [
    { label: 'Order placed', completed: true },
    { label: 'Confirmed', completed: ['confirmed', 'preparing', 'on_the_way', 'delivered'].includes(status) },
    { label: 'Preparing', completed: ['preparing', 'on_the_way', 'delivered'].includes(status) },
    { label: 'On the way', completed: ['on_the_way', 'delivered'].includes(status) },
    { label: 'Delivered', completed: status === 'delivered' },
  ]
  return { steps }
}

// Fallback mock data for demo/development
const FALLBACK_ORDERS: Order[] = [
  {
    id: 'DEMO-001',
    module: 'food',
    moduleIcon: '🍔',
    type: 'Food Delivery',
    status: 'on_the_way',
    items: [
      { name: 'Sample Pizza', quantity: 1, price: 299 },
    ],
    total: 299,
    createdAt: new Date().toISOString(),
    estimatedDelivery: '30 mins',
    deliveryAddress: 'Your delivery address',
    tracking: generateTrackingSteps('on_the_way'),
  },
]

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  on_the_way: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  on_the_way: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function OrdersPage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [filterModule, setFilterModule] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setOrders(FALLBACK_ORDERS)
      setLoading(false)
      return
    }

    try {
      setError(null)
      const response = await api.orders.list({ limit: 50 })
      const backendOrders = response.data?.orders || response.data || []
      
      if (Array.isArray(backendOrders) && backendOrders.length > 0) {
        const transformedOrders = backendOrders.map(transformOrder)
        setOrders(transformedOrders)
      } else {
        // No orders from backend - show empty state (not fallback)
        setOrders([])
      }
    } catch (err) {
      console.error('Failed to load orders:', err)
      setError('Failed to load orders. Please try again.')
      // Don't use fallback on error for authenticated users
      setOrders([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (_hasHydrated) {
      loadOrders()
    }
  }, [_hasHydrated, loadOrders])

  const handleRefresh = () => {
    setRefreshing(true)
    loadOrders()
  }

  const filteredOrders = filterModule === 'all'
    ? orders
    : orders.filter((order) => order.module === filterModule)

  const activeOrders = filteredOrders.filter((order) =>
    ['pending', 'confirmed', 'preparing', 'on_the_way'].includes(order.status)
  )
  const pastOrders = filteredOrders.filter((order) =>
    ['delivered', 'cancelled'].includes(order.status)
  )

  const toggleOrder = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600 mt-1">
                Track and manage all your orders in one place
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/chat"
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                New Order
              </Link>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button onClick={handleRefresh} className="ml-auto text-sm font-medium hover:underline">
                Retry
              </button>
            </div>
          )}

          {/* Not Logged In Message */}
          {!isAuthenticated && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              <Link href="/login" className="font-medium hover:underline">
                Log in
              </Link>{' '}
              to see your real orders
            </div>
          )}

          {/* Module Filters */}
          <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterModule('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterModule === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setFilterModule('food')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterModule === 'food'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🍔 Food
            </button>
            <button
              onClick={() => setFilterModule('ecom')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterModule === 'ecom'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🛒 Shopping
            </button>
            <button
              onClick={() => setFilterModule('parcel')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterModule === 'parcel'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📦 Parcel
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Active Orders ({activeOrders.length})
            </h2>
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrder === order.id}
                  onToggle={() => toggleOrder(order.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Orders */}
        {pastOrders.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Past Orders ({pastOrders.length})
            </h2>
            <div className="space-y-4">
              {pastOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrder === order.id}
                  onToggle={() => toggleOrder(order.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-4">No orders found</p>
            <Link
              href="/chat"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Place Your First Order
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({
  order,
  expanded,
  onToggle,
}: {
  order: Order
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="text-3xl">{order.moduleIcon}</div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-gray-900">{order.id}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                >
                  {statusLabels[order.status]}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{order.type}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">₹{order.total}</p>
            {order.estimatedDelivery && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ETA: {order.estimatedDelivery}
              </p>
            )}
            <div className="mt-2">
              {expanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          {/* Items */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Items</h4>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.name} x {item.quantity}
                  </span>
                  <span className="font-medium">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-300">
                <span>Total</span>
                <span>₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Tracking */}
          {order.tracking && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Tracking</h4>
              <div className="space-y-3">
                {order.tracking.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div
                      className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        step.completed
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {step.completed && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          step.completed ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-xs text-gray-500">{step.time}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Info */}
          {order.deliveryAddress && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Address
              </h4>
              <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
            </div>
          )}

          {/* Contact */}
          {order.contact && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact
              </h4>
              <p className="text-sm text-gray-600">
                {order.contact.name} • {order.contact.phone}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-6">
            <button className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Reorder
            </button>
            <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
              Get Help
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
