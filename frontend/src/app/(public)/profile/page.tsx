'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Wallet,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface Address {
  id: string
  type: 'home' | 'work' | 'other'
  label: string
  address: string
  lat: number
  lng: number
  isDefault: boolean
}

interface PaymentMethod {
  id: string
  type: 'card' | 'upi' | 'wallet'
  label: string
  details: string
  isDefault: boolean
}

interface UserProfile {
  name: string
  email: string
  phone: string
  avatar: string
  joinedDate: string
  walletBalance: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, clearAuth, _hasHydrated } = useAuthStore()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'account' | 'addresses' | 'payments' | 'settings'>(
    'account'
  )

  const loadProfileData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      // Use auth store data for basic profile
      if (user) {
        setProfile({
          name: `${user.f_name || ''} ${user.l_name || ''}`.trim() || 'User',
          email: user.email || '',
          phone: user.phone || '',
          avatar: user.image || '👤',
          joinedDate: new Date().toISOString(),
          walletBalance: 0,
        })
      }
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      // Load profile from API
      const profileRes = await api.auth.getProfile().catch(() => null)
      if (profileRes?.data) {
        const userData = profileRes.data
        setProfile({
          name: `${userData.f_name || ''} ${userData.l_name || ''}`.trim() || 'User',
          email: userData.email || '',
          phone: userData.phone || '',
          avatar: userData.image || '👤',
          joinedDate: userData.created_at || new Date().toISOString(),
          walletBalance: parseFloat(userData.wallet_balance) || 0,
        })
      } else if (user) {
        // Fallback to auth store data
        setProfile({
          name: `${user.f_name || ''} ${user.l_name || ''}`.trim() || 'User',
          email: user.email || '',
          phone: user.phone || '',
          avatar: '👤',
          joinedDate: new Date().toISOString(),
          walletBalance: 0,
        })
      }

      // Load addresses
      const addressRes = await api.addresses.list().catch(() => null)
      if (addressRes?.data && Array.isArray(addressRes.data)) {
        const transformedAddresses: Address[] = addressRes.data.map((addr: any) => ({
          id: addr.id?.toString() || `addr-${Date.now()}`,
          type: addr.address_type || 'other',
          label: addr.address_type === 'home' ? 'Home' : addr.address_type === 'work' ? 'Office' : 'Other',
          address: addr.address || '',
          lat: parseFloat(addr.latitude) || 0,
          lng: parseFloat(addr.longitude) || 0,
          isDefault: addr.is_default || false,
        }))
        setAddresses(transformedAddresses)
      }

      // Load payment methods (if endpoint exists)
      const paymentRes = await api.payments.methods().catch(() => null)
      if (paymentRes?.data && Array.isArray(paymentRes.data)) {
        const transformedPayments: PaymentMethod[] = paymentRes.data.map((pm: any) => ({
          id: pm.id?.toString() || `pm-${Date.now()}`,
          type: pm.type || 'card',
          label: pm.name || pm.label || 'Payment Method',
          details: pm.details || pm.last_four ? `**** ${pm.last_four}` : '',
          isDefault: pm.is_default || false,
        }))
        setPaymentMethods(transformedPayments)
      } else {
        // Default wallet payment method
        setPaymentMethods([{
          id: 'wallet',
          type: 'wallet',
          label: 'Mangwale Wallet',
          details: `₹${profile?.walletBalance || 0} available`,
          isDefault: true,
        }])
      }

    } catch (err) {
      console.error('Failed to load profile:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (_hasHydrated) {
      loadProfileData()
    }
  }, [_hasHydrated, loadProfileData])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return
    
    try {
      await api.addresses.delete(id)
      setAddresses(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error('Failed to delete address:', err)
      alert('Failed to delete address')
    }
  }

  // Redirect to login if not authenticated
  if (_hasHydrated && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Please Log In</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view your profile</p>
          <Link
            href="/login"
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl">
              {profile?.avatar || '👤'}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{profile?.name || 'User'}</h1>
              <p className="text-orange-100 mt-1">{profile?.email || 'No email'}</p>
              <p className="text-orange-100 text-sm mt-1">
                {profile?.phone || 'No phone'} • Member since {profile?.joinedDate ? new Date(profile.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
              </p>
            </div>
          </div>

          {/* Wallet Card */}
          <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8" />
              <div>
                <p className="text-sm text-orange-100">Wallet Balance</p>
                <p className="text-2xl font-bold">₹{profile?.walletBalance || 0}</p>
              </div>
            </div>
            <Link href="/wallet" className="px-4 py-2 bg-white text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors">
              Add Money
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('account')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'account'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'addresses'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Addresses
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'payments'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <User className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium text-gray-900">{profile?.name || 'Not set'}</p>
                  </div>
                  <button className="text-orange-600 hover:text-orange-700">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{profile?.email || 'Not set'}</p>
                  </div>
                  <button className="text-orange-600 hover:text-orange-700">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{profile?.phone || 'Not set'}</p>
                  </div>
                  <button className="text-orange-600 hover:text-orange-700">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/orders"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-2xl">📦</div>
                  <div>
                    <p className="font-medium text-gray-900">My Orders</p>
                    <p className="text-xs text-gray-500">View order history</p>
                  </div>
                </Link>
                <Link
                  href="/chat"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-2xl">💬</div>
                  <div>
                    <p className="font-medium text-gray-900">Chat Assistant</p>
                    <p className="text-xs text-gray-500">Get help instantly</p>
                  </div>
                </Link>
                <Link
                  href="/search"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-2xl">🔍</div>
                  <div>
                    <p className="font-medium text-gray-900">Search</p>
                    <p className="text-xs text-gray-500">Find anything</p>
                  </div>
                </Link>
                <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-2xl">❤️</div>
                  <div>
                    <p className="font-medium text-gray-900">Favorites</p>
                    <p className="text-xs text-gray-500">Saved items</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Saved Addresses</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                <Plus className="w-4 h-4" />
                Add Address
              </button>
            </div>

            {addresses.map((address) => (
              <div
                key={address.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{address.label}</h3>
                        {address.isDefault && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">{address.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-gray-100">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAddress(address.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {addresses.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No addresses saved yet</p>
                <button className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                  Add Your First Address
                </button>
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                <Plus className="w-4 h-4" />
                Add Method
              </button>
            </div>

            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {method.type === 'card' && <CreditCard className="w-5 h-5 text-gray-600" />}
                      {method.type === 'upi' && <Phone className="w-5 h-5 text-gray-600" />}
                      {method.type === 'wallet' && <Wallet className="w-5 h-5 text-gray-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{method.label}</h3>
                        {method.isDefault && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">{method.details}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-gray-100">
                      <Edit className="w-4 h-4" />
                    </button>
                    {method.type !== 'wallet' && (
                      <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Notifications</p>
                    <p className="text-sm text-gray-500">Manage notification preferences</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Privacy & Security</p>
                    <p className="text-sm text-gray-500">Control your data and security</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Help & Support</p>
                    <p className="text-sm text-gray-500">Get help and FAQs</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">App Settings</p>
                    <p className="text-sm text-gray-500">Language, theme, and more</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full bg-white rounded-lg shadow-sm border border-red-200 p-4 flex items-center justify-center gap-2 text-red-600 font-medium hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
