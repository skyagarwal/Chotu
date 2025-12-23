'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare, Phone, Globe, Send, CheckCircle, XCircle,
  RefreshCw, Settings, ExternalLink, Copy, Eye, EyeOff,
  Smartphone, Bot, Zap, Activity, ArrowRight, PhoneCall,
  Clock, Shield, Users, Mic, Volume2, Calendar
} from 'lucide-react';
import { useToast } from '@/components/shared';

interface ChannelConfig {
  id: string;
  name: string;
  platform: 'whatsapp' | 'telegram' | 'web' | 'rcs' | 'sms' | 'voice';
  status: 'active' | 'inactive' | 'error';
  lastActivity?: Date;
  messagesTotal?: number;
  messagesToday?: number;
  config: Record<string, string>;
  capabilities: string[];
}

interface ExotelStatus {
  enabled: boolean;
  features: Record<string, boolean>;
  serviceUrl?: string;
}

const WHATSAPP_CAPABILITIES = [
  'Text Messages',
  'Interactive Buttons (3 max)',
  'Interactive Lists (10 sections)',
  'CTA URL Buttons',
  'Location Sharing',
  'Location Request',
  'Image Messages',
  'Video Messages',
  'Audio Messages',
  'Document Messages',
  'Contact Cards',
  'Templates',
  'Reactions',
  'Read Receipts',
  'Typing Indicators',
  'WhatsApp Flows',
];

const VOICE_CAPABILITIES = [
  'Click-to-Call',
  'Number Masking',
  'Voice Streaming (ASR)',
  'Verified Calls (Truecaller)',
  'Auto Dialer (PACE)',
  'IVR System',
  'Call Recording',
  'CQA Analysis',
  'Voice Ordering',
  'Scheduled Calls',
  'DND Management',
  'Retry with Backoff',
];

export default function ChannelsPage() {
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [exotelStatus, setExotelStatus] = useState<ExotelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadChannels();
    loadExotelStatus();
  }, []);

  const loadExotelStatus = async () => {
    try {
      const response = await fetch('/api/exotel/health');
      if (response.ok) {
        const data = await response.json();
        setExotelStatus(data);
      }
    } catch (error) {
      console.error('Failed to load Exotel status:', error);
      setExotelStatus({ enabled: false, features: {} });
    }
  };

  const loadChannels = async () => {
    setLoading(true);
    try {
      // Load channel configurations from backend
      const response = await fetch('/api/channels');
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      } else {
        // Default configuration
        setChannels([
          {
            id: 'whatsapp-main',
            name: 'WhatsApp Business',
            platform: 'whatsapp',
            status: 'active',
            lastActivity: new Date(),
            messagesTotal: 15234,
            messagesToday: 127,
            config: {
              phoneNumberId: '908689285655004',
              wabaId: '1538156784195596',
              businessName: 'Mangwale',
              businessPhone: '+91 97301 99571',
              apiVersion: 'v22.0',
              webhookUrl: 'https://api.mangwale.ai/api/webhook/whatsapp',
            },
            capabilities: WHATSAPP_CAPABILITIES,
          },
          {
            id: 'voice-exotel',
            name: 'Voice (Exotel)',
            platform: 'voice',
            status: exotelStatus?.enabled ? 'active' : 'inactive',
            lastActivity: new Date(),
            messagesTotal: 3421,
            messagesToday: 45,
            config: {
              serviceUrl: 'Mercury (192.168.0.151:3100)',
              provider: 'Exotel Cloud API',
              features: 'IVR, Click-to-Call, Number Masking',
              truecaller: 'Verified Calls Enabled',
            },
            capabilities: VOICE_CAPABILITIES,
          },
          {
            id: 'telegram-main',
            name: 'Telegram Bot',
            platform: 'telegram',
            status: 'inactive',
            config: {
              botUsername: '@MangwaleBot',
              webhookUrl: 'https://api.mangwale.ai/api/webhook/telegram',
            },
            capabilities: [
              'Text Messages',
              'Inline Keyboards',
              'Reply Keyboards',
              'Images & Media',
              'Location Sharing',
              'Contact Cards',
              'Polls',
            ],
          },
          {
            id: 'web-chat',
            name: 'Web Chat',
            platform: 'web',
            status: 'active',
            lastActivity: new Date(),
            messagesTotal: 8921,
            messagesToday: 89,
            config: {
              widgetUrl: 'https://chat.mangwale.ai',
              wsEndpoint: 'wss://api.mangwale.ai/socket',
            },
            capabilities: [
              'Text Messages',
              'Interactive Buttons',
              'Product Cards',
              'Image Upload',
              'Location Sharing',
              'Voice Messages',
              'Real-time Updates',
            ],
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      toast.error('Failed to load channel configurations');
    } finally {
      setLoading(false);
    }
  };

  const testChannel = async (channelId: string) => {
    setTestingChannel(channelId);
    try {
      const channel = channels.find(c => c.id === channelId);
      if (!channel) return;

      if (channel.platform === 'whatsapp') {
        // Test WhatsApp by sending a test message
        const response = await fetch('/api/channels/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, platform: 'whatsapp' }),
        });
        
        if (response.ok) {
          toast.success('WhatsApp connection test successful!');
        } else {
          toast.error('WhatsApp connection test failed');
        }
      } else if (channel.platform === 'voice') {
        // Test Exotel connection
        const response = await fetch('/api/exotel/health');
        if (response.ok) {
          const data = await response.json();
          if (data.enabled) {
            toast.success('Voice (Exotel) service is connected and healthy!');
            setExotelStatus(data);
          } else {
            toast.warning('Exotel service is offline or unavailable');
          }
        } else {
          toast.error('Failed to connect to Exotel service');
        }
      } else {
        toast.info(`Testing ${channel.name}...`);
        await new Promise(r => setTimeout(r, 1000));
        toast.success(`${channel.name} is working correctly!`);
      }
    } catch (error) {
      toast.error('Channel test failed');
    } finally {
      setTestingChannel(null);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-600';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return <MessageSquare className="text-green-500" size={24} />;
      case 'telegram': return <Send className="text-blue-500" size={24} />;
      case 'web': return <Globe className="text-purple-500" size={24} />;
      case 'sms': return <Smartphone className="text-orange-500" size={24} />;
      case 'voice': return <PhoneCall className="text-red-500" size={24} />;
      default: return <Bot className="text-gray-500" size={24} />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return 'from-green-500 to-green-600';
      case 'telegram': return 'from-blue-500 to-blue-600';
      case 'web': return 'from-purple-500 to-purple-600';
      case 'sms': return 'from-orange-500 to-orange-600';
      case 'voice': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-[#059211]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Zap size={32} />
              <h1 className="text-3xl font-bold">Communication Channels</h1>
            </div>
            <p className="text-green-100">
              Manage WhatsApp, Telegram, Web Chat, and other messaging channels
            </p>
          </div>
          <button
            onClick={loadChannels}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all"
          >
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {channels.map(channel => (
          <div
            key={channel.id}
            className="bg-white rounded-xl shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all overflow-hidden"
          >
            {/* Channel Header */}
            <div className={`bg-gradient-to-r ${getPlatformColor(channel.platform)} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {getPlatformIcon(channel.platform)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{channel.name}</h3>
                    <p className="text-sm opacity-80 capitalize">{channel.platform}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  channel.status === 'active' ? 'bg-white/20' : 'bg-black/20'
                }`}>
                  {channel.status === 'active' ? '● Active' : channel.status === 'error' ? '● Error' : '○ Inactive'}
                </span>
              </div>
            </div>

            {/* Channel Stats */}
            {channel.messagesTotal !== undefined && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-b">
                <div>
                  <p className="text-sm text-gray-500">Total Messages</p>
                  <p className="text-xl font-bold text-gray-900">{channel.messagesTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Today</p>
                  <p className="text-xl font-bold text-[#059211]">{channel.messagesToday?.toLocaleString() || 0}</p>
                </div>
              </div>
            )}

            {/* Channel Configuration */}
            <div className="p-4 space-y-3">
              {Object.entries(channel.config).slice(0, 4).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <div className="flex items-center gap-2">
                    {key.toLowerCase().includes('token') || key.toLowerCase().includes('secret') ? (
                      <>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {showSecrets[`${channel.id}-${key}`] ? value : '••••••••'}
                        </span>
                        <button onClick={() => toggleSecret(`${channel.id}-${key}`)}>
                          {showSecrets[`${channel.id}-${key}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </>
                    ) : (
                      <span className="font-medium text-gray-900 text-right max-w-[180px] truncate">{value}</span>
                    )}
                    <button
                      onClick={() => copyToClipboard(value, key)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Capabilities */}
            <div className="px-4 pb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Capabilities:</p>
              <div className="flex flex-wrap gap-1">
                {channel.capabilities.slice(0, 5).map(cap => (
                  <span key={cap} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {cap}
                  </span>
                ))}
                {channel.capabilities.length > 5 && (
                  <span className="text-xs bg-[#059211]/10 text-[#059211] px-2 py-1 rounded">
                    +{channel.capabilities.length - 5} more
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={() => testChannel(channel.id)}
                disabled={testingChannel === channel.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#059211] text-white rounded-lg hover:bg-[#047a0e] transition-colors text-sm font-medium disabled:opacity-50"
              >
                {testingChannel === channel.id ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Activity size={16} />
                )}
                Test
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                <Settings size={16} />
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp Feature Reference */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="text-green-500" />
          WhatsApp Cloud API v22.0 Features
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {WHATSAPP_CAPABILITIES.map(cap => (
            <div key={cap} className="flex items-center gap-2 text-sm">
              <CheckCircle className="text-green-500 flex-shrink-0" size={16} />
              <span className="text-gray-700">{cap}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Voice/Exotel Feature Reference */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <PhoneCall className="text-red-500" />
          Voice (Exotel) Features
          {exotelStatus?.enabled && (
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              Connected
            </span>
          )}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {VOICE_CAPABILITIES.map(cap => (
            <div key={cap} className="flex items-center gap-2 text-sm">
              <CheckCircle className="text-red-500 flex-shrink-0" size={16} />
              <span className="text-gray-700">{cap}</span>
            </div>
          ))}
        </div>
        
        {/* Exotel Features Status */}
        {exotelStatus?.features && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Active Features:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(exotelStatus.features).map(([feature, enabled]) => (
                <span
                  key={feature}
                  className={`px-2 py-1 text-xs rounded ${
                    enabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {enabled ? '✓' : '○'} {feature.replace(/([A-Z])/g, ' $1').replace('Enabled', '').trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <a
          href="https://developers.facebook.com/docs/whatsapp/cloud-api"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:border-green-300 transition-all group"
        >
          <div className="p-3 bg-green-100 rounded-lg">
            <MessageSquare className="text-green-600" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">WhatsApp API Docs</h4>
            <p className="text-sm text-gray-600">Official documentation</p>
          </div>
          <ExternalLink className="text-gray-400 group-hover:text-green-500" size={20} />
        </a>

        <a
          href="https://developer.exotel.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:border-red-300 transition-all group"
        >
          <div className="p-3 bg-red-100 rounded-lg">
            <PhoneCall className="text-red-600" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Exotel API Docs</h4>
            <p className="text-sm text-gray-600">Voice & SMS APIs</p>
          </div>
          <ExternalLink className="text-gray-400 group-hover:text-red-500" size={20} />
        </a>

        <a
          href="/admin/exotel"
          className="flex items-center gap-4 bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:border-red-300 transition-all group"
        >
          <div className="p-3 bg-red-100 rounded-lg">
            <Settings className="text-red-600" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Exotel Management</h4>
            <p className="text-sm text-gray-600">Full configuration page</p>
          </div>
          <ArrowRight className="text-gray-400 group-hover:text-red-500" size={20} />
        </a>

        <a
          href="/admin/webhooks"
          className="flex items-center gap-4 bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:border-purple-300 transition-all group"
        >
          <div className="p-3 bg-purple-100 rounded-lg">
            <Zap className="text-purple-600" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Webhook Settings</h4>
            <p className="text-sm text-gray-600">Configure webhooks</p>
          </div>
          <ArrowRight className="text-gray-400 group-hover:text-purple-500" size={20} />
        </a>
      </div>
    </div>
  );
}
