'use client'

import { useState, useEffect } from 'react'
import { X, MapPin, Home, Building2, User, Phone, Loader2, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface AddressFormProps {
  onComplete: (address: AddressData) => void
  onClose: () => void
  initialLocation?: {
    lat: number
    lng: number
    address: string
  }
  mode?: 'create' | 'edit'
  existingAddress?: AddressData
}

export interface AddressData {
  id?: number
  address_type: 'home' | 'office' | 'other'
  contact_person_name: string
  contact_person_number: string
  address: string
  latitude: number
  longitude: number
  floor?: string
  house?: string
  road?: string
  zone_id?: number
}

const ADDRESS_TYPES = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'office', label: 'Office', icon: Building2 },
  { id: 'other', label: 'Other', icon: MapPin },
] as const

/**
 * AddressForm - Structured form for address management
 * 
 * TOOL-BASED approach:
 * - Shows after location is picked from map
 * - Collects all required fields in structured way
 * - Validates before submission
 * - Linear, predictable flow
 */
export function AddressForm({ 
  onComplete, 
  onClose, 
  initialLocation, 
  mode = 'create',
  existingAddress 
}: AddressFormProps) {
  const { user, token } = useAuthStore()
  
  const [addressType, setAddressType] = useState<'home' | 'office' | 'other'>(
    existingAddress?.address_type || 'home'
  )
  const [contactName, setContactName] = useState(
    existingAddress?.contact_person_name || 
    (user ? `${user.f_name || ''} ${user.l_name || ''}`.trim() : '')
  )
  const [contactPhone, setContactPhone] = useState(
    existingAddress?.contact_person_number || user?.phone || ''
  )
  const [fullAddress, setFullAddress] = useState(
    existingAddress?.address || initialLocation?.address || ''
  )
  const [floor, setFloor] = useState(existingAddress?.floor || '')
  const [house, setHouse] = useState(existingAddress?.house || '')
  const [road, setRoad] = useState(existingAddress?.road || '')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Update address when location changes
  useEffect(() => {
    if (initialLocation?.address && !existingAddress) {
      setFullAddress(initialLocation.address)
    }
  }, [initialLocation, existingAddress])

  const validatePhone = (phone: string) => {
    return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!contactName.trim()) {
      setError('Contact name is required')
      return
    }
    if (!contactPhone.trim()) {
      setError('Contact phone is required')
      return
    }
    if (!validatePhone(contactPhone)) {
      setError('Please enter a valid 10-digit phone number')
      return
    }
    if (!fullAddress.trim()) {
      setError('Address is required')
      return
    }
    if (!initialLocation?.lat || !initialLocation?.lng) {
      setError('Location coordinates are required. Please pick location on map.')
      return
    }

    setLoading(true)
    setError('')

    const addressData: AddressData = {
      id: existingAddress?.id,
      address_type: addressType,
      contact_person_name: contactName.trim(),
      contact_person_number: contactPhone.replace(/\D/g, ''),
      address: fullAddress.trim(),
      latitude: initialLocation.lat,
      longitude: initialLocation.lng,
      floor: floor.trim() || undefined,
      house: house.trim() || undefined,
      road: road.trim() || undefined,
      zone_id: existingAddress?.zone_id,
    }

    try {
      console.log(`📍 ${mode === 'create' ? 'Creating' : 'Updating'} address:`, addressData)
      
      if (token) {
        // User is authenticated - save to backend
        if (mode === 'create') {
          const response = await api.addresses.create(addressData)
          addressData.id = response.data?.id
          console.log('✅ Address saved to backend:', response.data)
        } else {
          await api.addresses.update(addressData.id!, addressData)
          console.log('✅ Address updated in backend')
        }
      } else {
        // Guest - just save locally
        console.log('📍 Guest mode - address saved locally only')
      }
      
      setSuccess(true)
      
      // Brief success animation then complete
      setTimeout(() => {
        onComplete(addressData)
      }, 800)
      
    } catch (err: any) {
      console.error('❌ Address save failed:', err)
      setError(err?.response?.data?.message || 'Failed to save address. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Address {mode === 'create' ? 'Saved' : 'Updated'}! ✅
          </h2>
          <p className="text-gray-600 text-sm">{fullAddress}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative my-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Add New Address' : 'Edit Address'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter delivery details
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Address Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ADDRESS_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = addressType === type.id
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setAddressType(type.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Delivery contact name"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit phone number"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                maxLength={10}
                disabled={loading}
              />
            </div>
          </div>

          {/* Full Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complete Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="Full address with area, city"
                rows={2}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm resize-none"
                disabled={loading}
              />
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                House/Flat
              </label>
              <input
                type="text"
                value={house}
                onChange={(e) => setHouse(e.target.value)}
                placeholder="e.g., A-101"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Floor
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g., 2nd"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Road/Area
              </label>
              <input
                type="text"
                value={road}
                onChange={(e) => setRoad(e.target.value)}
                placeholder="e.g., MG Road"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* Coordinates Display (read-only) */}
          {initialLocation && (
            <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span>📍 {initialLocation.lat.toFixed(6)}, {initialLocation.lng.toFixed(6)}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !contactName.trim() || !contactPhone.trim() || !fullAddress.trim()}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              mode === 'create' ? 'Save Address' : 'Update Address'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
