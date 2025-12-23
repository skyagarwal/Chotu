'use client';

import { useState, useEffect, useCallback } from 'react';
import { Webhook, Plus, Trash2, Edit, TestTube, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { LoadingSpinner, useToast } from '@/components/shared';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret: string;
  lastTriggered?: Date;
  successCount: number;
  failureCount: number;
  createdAt: Date;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      // Mock data for now
      setWebhooks([
        {
          id: 'wh_1',
          name: 'Order Notification',
          url: 'https://api.example.com/webhooks/orders',
          events: ['order.created', 'order.completed'],
          enabled: true,
          secret: 'sk_test_***************',
          lastTriggered: new Date(),
          successCount: 1247,
          failureCount: 3,
          createdAt: new Date('2025-01-15')
        },
        {
          id: 'wh_2',
          name: 'Training Events',
          url: 'https://api.example.com/webhooks/training',
          events: ['training.started', 'training.completed', 'training.failed'],
          enabled: true,
          secret: 'sk_test_***************',
          lastTriggered: new Date(),
          successCount: 45,
          failureCount: 0,
          createdAt: new Date('2025-02-01')
        },
        {
          id: 'wh_3',
          name: 'Search Analytics',
          url: 'https://analytics.example.com/webhooks',
          events: ['search.query', 'search.click'],
          enabled: false,
          secret: 'sk_test_***************',
          successCount: 0,
          failureCount: 0,
          createdAt: new Date('2025-02-20')
        }
      ]);
    } catch (error) {
      console.error('Failed to load webhooks', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const toggleWebhook = async (id: string) => {
    setWebhooks(prev => prev.map(wh => 
      wh.id === id ? { ...wh, enabled: !wh.enabled } : wh
    ));
    toast.success('Webhook status updated');
  };

  const testWebhook = async (id: string) => {
    toast.info(`Sending test payload for ${id}...`);
    // Simulate test
    setTimeout(() => {
      toast.success(`Test webhook ${id} sent successfully`);
    }, 1000);
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    setWebhooks(prev => prev.filter(wh => wh.id !== id));
    toast.success('Webhook deleted successfully');
  };

  const availableEvents = [
    { category: 'Orders', events: ['order.created', 'order.updated', 'order.completed', 'order.cancelled'] },
    { category: 'Training', events: ['training.started', 'training.completed', 'training.failed', 'model.deployed'] },
    { category: 'Search', events: ['search.query', 'search.click', 'search.trending'] },
    { category: 'Users', events: ['user.created', 'user.updated', 'user.deleted'] },
    { category: 'Agents', events: ['agent.message', 'agent.fallback', 'agent.handoff'] }
  ];

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading webhooks..." fullPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Webhook size={32} />
              <h1 className="text-3xl font-bold">Webhooks</h1>
            </div>
            <p className="text-emerald-100">
              Configure webhooks to receive real-time events from your platform
            </p>
          </div>
          <button
            onClick={() => toast.info('Webhook creation coming soon')}
            className="flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            <Plus size={20} />
            Add Webhook
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Activity className="text-emerald-600" size={24} />
            <span className="text-sm font-medium text-gray-500">Active Webhooks</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {webhooks.filter(wh => wh.enabled).length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="text-green-600" size={24} />
            <span className="text-sm font-medium text-gray-500">Total Deliveries</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {webhooks.reduce((sum, wh) => sum + wh.successCount, 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="text-red-600" size={24} />
            <span className="text-sm font-medium text-gray-500">Failed Deliveries</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {webhooks.reduce((sum, wh) => sum + wh.failureCount, 0)}
          </div>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.map(webhook => (
          <div
            key={webhook.id}
            className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6 hover:border-emerald-300 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{webhook.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    webhook.enabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {webhook.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <code className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded">
                  {webhook.url}
                </code>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => testWebhook(webhook.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Test webhook"
                >
                  <TestTube size={18} className="text-blue-600" />
                </button>
                <button
                  onClick={() => toast.info('Edit webhook - Coming soon')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit webhook"
                >
                  <Edit size={18} className="text-gray-600" />
                </button>
                <button
                  onClick={() => deleteWebhook(webhook.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete webhook"
                >
                  <Trash2 size={18} className="text-red-600" />
                </button>
              </div>
            </div>

            {/* Events */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Subscribed Events:</div>
              <div className="flex flex-wrap gap-2">
                {webhook.events.map(event => (
                  <span
                    key={event}
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium"
                  >
                    {event}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                <span><strong>{webhook.successCount.toLocaleString()}</strong> successful</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-600" />
                <span><strong>{webhook.failureCount}</strong> failed</span>
              </div>
              {webhook.lastTriggered && (
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  <span>Last triggered {webhook.lastTriggered.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Toggle */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Secret: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{webhook.secret}</code>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-700">Enable webhook</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={webhook.enabled}
                    onChange={() => toggleWebhook(webhook.id)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${
                    webhook.enabled ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      webhook.enabled ? 'transform translate-x-5' : ''
                    }`} />
                  </div>
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {webhooks.length === 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
          <Webhook size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Webhooks Configured</h3>
          <p className="text-gray-600 mb-6">
            Create your first webhook to start receiving real-time events
          </p>
          <button
            onClick={() => toast.info('Webhook creation coming soon')}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all mx-auto"
          >
            <Plus size={20} />
            Add Your First Webhook
          </button>
        </div>
      )}

      {/* Available Events Reference */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableEvents.map(group => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{group.category}</h3>
              <div className="space-y-1">
                {group.events.map(event => (
                  <div key={event} className="text-sm text-gray-600 font-mono">
                    {event}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
