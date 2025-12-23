'use client';

import { useState, useEffect } from 'react';
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Users, Store, Bike, RefreshCw, CheckCircle, XCircle,
  AlertCircle, Play, Square, Volume2, Activity, Zap,
  Clock, Globe, List, Send, Radio, Headphones, MessageSquare,
  TrendingUp, BarChart3, Settings, History, Mic
} from 'lucide-react';

interface NerveHealth {
  status: string;
  service: string;
  active_calls: number;
  tts_cache_size: number;
  components: {
    tts_cache: boolean;
    exotel_client: boolean;
    jupiter_reporter: boolean;
  };
}

interface VoiceCall {
  id: string;
  call_type: 'VENDOR_ORDER_CONFIRMATION' | 'RIDER_ASSIGNMENT' | 'RIDER_PICKUP_READY' | 'CUSTOMER_NOTIFICATION';
  status: 'INITIATED' | 'RINGING' | 'ANSWERED' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY';
  order_id: number;
  recipient_name: string;
  phone_number: string;
  duration_seconds?: number;
  dtmf_digits?: string;
  prep_time_minutes?: number;
  created_at: string;
  completed_at?: string;
}

interface CallStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  avg_duration: number;
  vendor_acceptance_rate: number;
  rider_acceptance_rate: number;
}

export default function NervePage() {
  const [health, setHealth] = useState<NerveHealth | null>(null);
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'test' | 'settings'>('overview');
  
  // Test call state
  const [testOrderId, setTestOrderId] = useState('12345');
  const [testVendorPhone, setTestVendorPhone] = useState('');
  const [testVendorName, setTestVendorName] = useState('Test Vendor');
  const [testAmount, setTestAmount] = useState('450');
  const [initiatingCall, setInitiatingCall] = useState(false);
  const [callResult, setCallResult] = useState<any>(null);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    await Promise.all([loadHealth(), loadCalls(), loadStats()]);
    setLoading(false);
  };

  const loadHealth = async () => {
    try {
      // Try Mercury Nerve directly first
      const response = await fetch('/api/exotel/nerve/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      } else {
        // Fallback to direct Mercury
        const directRes = await fetch('http://192.168.0.151:7100/health');
        if (directRes.ok) {
          const data = await directRes.json();
          setHealth(data);
        }
      }
    } catch (error) {
      console.error('Failed to load Nerve health:', error);
    }
  };

  const loadCalls = async () => {
    try {
      const response = await fetch('/api/exotel/nerve/calls?limit=50');
      if (response.ok) {
        const data = await response.json();
        setCalls(data.calls || []);
      }
    } catch (error) {
      console.error('Failed to load calls:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/exotel/nerve/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      // Use mock stats
      setStats({
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        avg_duration: 0,
        vendor_acceptance_rate: 0,
        rider_acceptance_rate: 0,
      });
    }
  };

  const initiateTestCall = async (type: 'vendor' | 'rider') => {
    if (!testVendorPhone) {
      alert('Please enter a phone number');
      return;
    }
    
    setInitiatingCall(true);
    setCallResult(null);
    
    try {
      const endpoint = type === 'vendor' 
        ? '/api/exotel/nerve/vendor/confirm'
        : '/api/exotel/nerve/rider/assign';
      
      const body = type === 'vendor' ? {
        orderId: parseInt(testOrderId),
        vendorId: 1,
        vendorPhone: testVendorPhone,
        vendorName: testVendorName,
        orderAmount: parseFloat(testAmount),
        itemCount: 3,
        language: 'hi'
      } : {
        orderId: parseInt(testOrderId),
        riderId: 1,
        riderPhone: testVendorPhone,
        riderName: testVendorName,
        vendorName: 'Test Restaurant',
        vendorAddress: 'Near Main Market',
        estimatedAmount: 35,
        language: 'hi'
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      setCallResult(data);
      
      if (data.status === 'initiated') {
        alert(`✅ Call initiated! Call ID: ${data.callId}`);
      } else {
        alert(`❌ Call failed: ${data.message}`);
      }
    } catch (error: any) {
      setCallResult({ error: error.message });
      alert('Error initiating call: ' + error.message);
    } finally {
      setInitiatingCall(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400';
      case 'ANSWERED': return 'text-blue-400';
      case 'RINGING': return 'text-yellow-400';
      case 'INITIATED': return 'text-gray-400';
      case 'FAILED': case 'NO_ANSWER': case 'BUSY': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case 'VENDOR_ORDER_CONFIRMATION': return <Store className="w-4 h-4" />;
      case 'RIDER_ASSIGNMENT': return <Bike className="w-4 h-4" />;
      case 'RIDER_PICKUP_READY': return <PhoneOutgoing className="w-4 h-4" />;
      case 'CUSTOMER_NOTIFICATION': return <Users className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Nerve AI Voice System
          </h1>
          <p className="text-gray-400 mt-1">
            Automated AI voice calls for vendors and riders
          </p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">System Status</span>
            {health?.status === 'healthy' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
          <p className={`text-xl font-bold mt-2 ${health?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
            {health?.status || 'Unknown'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Active Calls</span>
            <PhoneCall className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-xl font-bold mt-2 text-white">
            {health?.active_calls || 0}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">TTS Cache</span>
            <Volume2 className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-xl font-bold mt-2 text-white">
            {health?.tts_cache_size || 0} phrases
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Components</span>
            <Activity className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex gap-2 mt-2">
            <span className={`px-2 py-1 rounded text-xs ${health?.components?.tts_cache ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
              TTS
            </span>
            <span className={`px-2 py-1 rounded text-xs ${health?.components?.exotel_client ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
              Exotel
            </span>
            <span className={`px-2 py-1 rounded text-xs ${health?.components?.jupiter_reporter ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
              Jupiter
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {(['overview', 'calls', 'test', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg transition ${
              activeTab === tab
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stats */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Call Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Calls</span>
                <span className="text-white font-bold">{stats?.total_calls || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Successful</span>
                <span className="text-green-400 font-bold">{stats?.successful_calls || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Failed</span>
                <span className="text-red-400 font-bold">{stats?.failed_calls || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Duration</span>
                <span className="text-white font-bold">{stats?.avg_duration || 0}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Vendor Accept Rate</span>
                <span className="text-blue-400 font-bold">{(stats?.vendor_acceptance_rate || 0) * 100}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rider Accept Rate</span>
                <span className="text-purple-400 font-bold">{(stats?.rider_acceptance_rate || 0) * 100}%</span>
              </div>
            </div>
          </div>

          {/* Call Flow */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5" />
              AI Call Flow
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                <Store className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-white font-medium">Vendor Confirmation</p>
                  <p className="text-gray-400 text-xs">AI calls vendor → Press 1 to accept → Set prep time</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                <Bike className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Rider Assignment</p>
                  <p className="text-gray-400 text-xs">AI calls rider → Press 1 to accept → Navigate to vendor</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                <PhoneOutgoing className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">Pickup Ready</p>
                  <p className="text-gray-400 text-xs">Notify rider → Order is ready for pickup</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Customer Update</p>
                  <p className="text-gray-400 text-xs">Notify customer → Order status updates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calls' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Calls
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Order</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Duration</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">DTMF</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {calls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No calls recorded yet
                    </td>
                  </tr>
                ) : (
                  calls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getCallTypeIcon(call.call_type)}
                          <span className="text-xs text-gray-300">
                            {call.call_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm">{call.recipient_name}</p>
                          <p className="text-gray-400 text-xs">{call.phone_number}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white">#{call.order_id}</td>
                      <td className="px-4 py-3">
                        <span className={`${getStatusColor(call.status)} text-sm`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {call.duration_seconds ? `${call.duration_seconds}s` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {call.dtmf_digits || '-'}
                        {call.prep_time_minutes && (
                          <span className="text-xs text-blue-400 ml-1">
                            ({call.prep_time_minutes}min)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(call.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'test' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-400" />
              Test Vendor Confirmation Call
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Order ID</label>
                <input
                  type="text"
                  value={testOrderId}
                  onChange={(e) => setTestOrderId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="12345"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Vendor Phone</label>
                <input
                  type="text"
                  value={testVendorPhone}
                  onChange={(e) => setTestVendorPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="919876543210"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Vendor Name</label>
                <input
                  type="text"
                  value={testVendorName}
                  onChange={(e) => setTestVendorName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Test Vendor"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Order Amount (₹)</label>
                <input
                  type="text"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="450"
                />
              </div>
              <button
                onClick={() => initiateTestCall('vendor')}
                disabled={initiatingCall}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 rounded-lg transition"
              >
                {initiatingCall ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                Call Vendor
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bike className="w-5 h-5 text-blue-400" />
              Test Rider Assignment Call
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Order ID</label>
                <input
                  type="text"
                  value={testOrderId}
                  onChange={(e) => setTestOrderId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="12345"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rider Phone</label>
                <input
                  type="text"
                  value={testVendorPhone}
                  onChange={(e) => setTestVendorPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="919876543210"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rider Name</label>
                <input
                  type="text"
                  value={testVendorName}
                  onChange={(e) => setTestVendorName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Test Rider"
                />
              </div>
              <button
                onClick={() => initiateTestCall('rider')}
                disabled={initiatingCall}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg transition mt-[88px]"
              >
                {initiatingCall ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                Call Rider
              </button>
            </div>
          </div>

          {callResult && (
            <div className="md:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Call Result</h3>
              <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-auto">
                {JSON.stringify(callResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Nerve System Settings
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">Nerve System URL</p>
                <p className="text-white font-mono">http://192.168.0.151:7100</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">TTS Provider</p>
                <p className="text-white">Chatterbox (Hindi) + Kokoro (English)</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">Telephony Provider</p>
                <p className="text-white">Exotel</p>
              </div>
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">Default Language</p>
                <p className="text-white">Hindi (hi)</p>
              </div>
            </div>
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <p className="text-gray-400 text-sm mb-2">Call Flow Configuration</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Vendor Accept Timeout</span>
                  <span className="text-white">30 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Max Retry Attempts</span>
                  <span className="text-white">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Escalation to Admin</span>
                  <span className="text-white">After 2 failed attempts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
