'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Loader2,
  ChevronLeft,
  CreditCard,
  Filter,
  TrendingUp,
  Gift
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/navigation/BottomNav'

interface WalletTransaction {
  id: number
  transaction_id: string
  amount: number
  transaction_type: 'credit' | 'debit'
  debit?: number
  credit?: number
  balance?: number
  reference?: string
  created_at: string
  admin_bonus?: number
}

interface WalletData {
  balance: number
  transactions: WalletTransaction[]
  pending_bonus?: number
  loyalty_points?: number
}

const PHP_API_URL = process.env.NEXT_PUBLIC_PHP_API_URL || 'https://new.mangwale.com/api/v1'

export default function WalletPage() {
  const router = useRouter()
  const { token, isAuthenticated, user, _hasHydrated } = useAuthStore()
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addMoneyOpen, setAddMoneyOpen] = useState(false)
  const [addAmount, setAddAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [animateIn, setAnimateIn] = useState(false)

  const presetAmounts = [100, 200, 500, 1000, 2000]

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${PHP_API_URL}/customer/wallet/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet data')
      }
      
      const data = await response.json()
      setWalletData({
        balance: data.total_wallet_balance || data.wallet_balance || 0,
        transactions: data.data || data.transactions || [],
        pending_bonus: data.pending_bonus || 0,
        loyalty_points: data.loyalty_points || 0,
      })
    } catch (err) {
      console.error('Error fetching wallet:', err)
      setError('Failed to load wallet data')
    } finally {
      setLoading(false)
      setTimeout(() => setAnimateIn(true), 100)
    }
  }, [token])

  useEffect(() => {
    if (!_hasHydrated) return
    
    if (!isAuthenticated) {
      router.push('/chat')
      return
    }
    fetchWalletData()
  }, [isAuthenticated, _hasHydrated, router, fetchWalletData])

  const handleAddMoney = async () => {
    if (!addAmount || !token) return
    
    setProcessing(true)
    try {
      const response = await fetch(`${PHP_API_URL}/customer/wallet/add-fund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: parseFloat(addAmount) }),
      })
      
      if (response.ok) {
        setAddMoneyOpen(false)
        setAddAmount('')
        fetchWalletData()
      }
    } catch (err) {
      console.error('Error adding money:', err)
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredTransactions = walletData?.transactions.filter(t => {
    if (filter === 'all') return true
    const type = t.credit && t.credit > 0 ? 'credit' : 'debit'
    return type === filter
  }) || []

  // Animation directions
  const getAnimationClass = (direction: string, index: number) => {
    if (!animateIn) {
      switch (direction) {
        case 'left': return 'translate-x-[-100%] opacity-0'
        case 'right': return 'translate-x-[100%] opacity-0'
        case 'top': return 'translate-y-[-100%] opacity-0'
        case 'bottom': return 'translate-y-[100%] opacity-0'
        default: return 'opacity-0 scale-95'
      }
    }
    return 'translate-x-0 translate-y-0 opacity-100 scale-100'
  }

  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
          <div className={`flex items-center gap-4 mb-6 transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[-20px]'}`}>
            <Link href="/chat" className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-semibold">Wallet</h1>
          </div>
          
          {/* Balance Card */}
          <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 transition-all duration-500 delay-100 ${
            animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-orange-100 text-sm">Available Balance</p>
                <p className="text-4xl font-bold mt-1">₹{walletData?.balance.toFixed(0) || '0'}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <Wallet className="w-7 h-7" />
              </div>
            </div>
            
            <button
              onClick={() => setAddMoneyOpen(true)}
              className="w-full mt-4 py-3 bg-white text-orange-500 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Money
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className={`bg-white/10 backdrop-blur rounded-xl p-4 transition-all duration-500 delay-200 ${
              getAnimationClass('left', 0)
            }`}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-300" />
                <span className="text-xs text-orange-100">Total Credited</span>
              </div>
              <p className="text-lg font-bold mt-1">
                ₹{filteredTransactions.filter(t => t.credit && t.credit > 0).reduce((sum, t) => sum + (t.credit || 0), 0).toFixed(0)}
              </p>
            </div>
            <div className={`bg-white/10 backdrop-blur rounded-xl p-4 transition-all duration-500 delay-200 ${
              getAnimationClass('right', 0)
            }`}>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-yellow-300" />
                <span className="text-xs text-orange-100">Loyalty Points</span>
              </div>
              <p className="text-lg font-bold mt-1">{walletData?.loyalty_points || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Money Modal */}
      {addMoneyOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300">
            <h2 className="text-xl font-bold mb-4">Add Money to Wallet</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Enter Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₹</span>
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-4 text-2xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setAddAmount(String(amount))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    addAmount === String(amount)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ₹{amount}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setAddMoneyOpen(false)
                  setAddAmount('')
                }}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMoney}
                disabled={!addAmount || processing}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Section */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className={`flex items-center justify-between mb-4 transition-all duration-500 delay-300 ${
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[20px]'
        }`}>
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          <div className="flex gap-2">
            {(['all', 'credit', 'debit'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className={`text-center py-12 transition-all duration-500 delay-400 ${
            animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction, index) => {
              const isCredit = transaction.credit && transaction.credit > 0
              const amount = isCredit ? transaction.credit : transaction.debit
              const directions = ['left', 'right', 'left', 'right']
              
              return (
                <div
                  key={transaction.id || index}
                  className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-500 ${
                    getAnimationClass(directions[index % 4], index)
                  }`}
                  style={{ transitionDelay: `${400 + index * 80}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCredit ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {isCredit ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {isCredit ? 'Money Added' : 'Payment'}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                        {isCredit ? '+' : '-'}₹{(amount || 0).toFixed(0)}
                      </p>
                      {transaction.balance !== undefined && (
                        <p className="text-xs text-gray-500">Bal: ₹{transaction.balance.toFixed(0)}</p>
                      )}
                    </div>
                  </div>
                  {transaction.reference && (
                    <p className="text-xs text-gray-400 mt-2 truncate">
                      Ref: {transaction.reference}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
