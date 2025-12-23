'use client';

import { useState } from 'react';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/shared';

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: 'key_1',
      name: 'Production API',
      key: 'sk_live_' + '•'.repeat(40),
      permissions: ['read', 'write'],
      lastUsed: new Date(),
      createdAt: new Date('2025-01-01'),
      expiresAt: new Date('2026-01-01')
    },
    {
      id: 'key_2',
      name: 'Development',
      key: 'sk_test_' + '•'.repeat(40),
      permissions: ['read'],
      lastUsed: new Date(),
      createdAt: new Date('2025-02-15')
    }
  ]);
  const [showKey, setShowKey] = useState<string | null>(null);
  const toast = useToast();

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const deleteKey = (id: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    setApiKeys(prev => prev.filter(k => k.id !== id));
    toast.success('API key deleted');
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Key size={32} />
              <h1 className="text-3xl font-bold">API Keys</h1>
            </div>
            <p className="text-amber-100">
              Manage API keys for programmatic access to your platform
            </p>
          </div>
          <button className="flex items-center gap-2 bg-white text-amber-600 px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all">
            <Plus size={20} />
            Create API Key
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {apiKeys.map(apiKey => (
          <div key={apiKey.id} className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{apiKey.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 text-sm bg-gray-50 px-4 py-2 rounded font-mono">
                    {showKey === apiKey.id ? 'sk_live_1234567890abcdef...' : apiKey.key}
                  </code>
                  <button
                    onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    {showKey === apiKey.id ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button
                    onClick={() => copyKey(apiKey.key)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {apiKey.permissions.map(perm => (
                    <span key={perm} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                      {perm}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  Created {apiKey.createdAt.toLocaleDateString()}
                  {apiKey.lastUsed && ` • Last used ${apiKey.lastUsed.toLocaleString()}`}
                  {apiKey.expiresAt && ` • Expires ${apiKey.expiresAt.toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                  <RefreshCw size={18} className="text-gray-600" />
                </button>
                <button
                  onClick={() => deleteKey(apiKey.id)}
                  className="p-2 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={18} className="text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
