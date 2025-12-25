'use client'

import { useState } from 'react'
import { X, User, Mail, Phone, Loader2, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface ProfileCompletionFormProps {
  phone: string
  onComplete: () => void
  onClose: () => void
}

/**
 * ProfileCompletionForm - Structured form for new user profile completion
 * 
 * This is a TOOL-BASED approach instead of conversational:
 * - Shows after OTP verification for new users (is_personal_info === 0)
 * - Collects required fields in structured way
 * - Validates before submission
 * - No AI jumping around - linear, predictable flow
 */
export function ProfileCompletionForm({ phone, onComplete, onClose }: ProfileCompletionFormProps) {
  const { setAuth } = useAuthStore()
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!firstName.trim()) {
      setError('First name is required')
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('📝 Completing profile for:', phone)
      
      const response = await api.auth.updateUserInfo({
        phone,
        f_name: firstName.trim(),
        l_name: lastName.trim(),
        email: email.trim()
      })

      const { token, user } = response.data
      
      console.log('✅ Profile completed:', { 
        id: user?.id, 
        f_name: user?.f_name,
        email: user?.email 
      })

      // Update auth store with complete user
      setAuth(user, token)
      
      setSuccess(true)
      
      // Brief success animation then close
      setTimeout(() => {
        onComplete()
      }, 1000)
      
    } catch (err: any) {
      console.error('❌ Profile completion failed:', err)
      setError(err?.response?.data?.message || 'Failed to save profile. Please try again.')
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome, {firstName}! 🎉</h2>
          <p className="text-gray-600">Your profile is all set up.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Complete Your Profile</h2>
          <p className="text-sm text-gray-500 mt-1">
            Quick setup to get you started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{phone}</span>
              <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                disabled={loading}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !firstName.trim() || !email.trim()}
            className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete Profile'
            )}
          </button>
        </form>

        {/* Skip option */}
        <p className="text-center text-xs text-gray-400 mt-4">
          This helps us personalize your experience
        </p>
      </div>
    </div>
  )
}
