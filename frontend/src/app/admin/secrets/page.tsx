'use client';

import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, RotateCw, Eye, EyeOff, Shield, Clock, Check, X, AlertTriangle, Calendar } from 'lucide-react';

interface Secret {
  name: string;
  category: string;
  description: string | null;
  lastRotated: string | null;
  expiresAt: string | null;
  maskedValue?: string;
}

interface ExpirationAlert {
  name: string;
  expiresAt: string;
  daysUntilExpiry?: number;
}

export default function SecretsManagementPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [expiringSecrets, setExpiringSecrets] = useState<ExpirationAlert[]>([]);
  const [expiredSecrets, setExpiredSecrets] = useState<ExpirationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyCategory, setNewKeyCategory] = useState('api_key');
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [rotateValue, setRotateValue] = useState('');

  const loadSecrets = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load secrets
      const response = await fetch('http://localhost:3200/api/secrets');
      const data = await response.json();
      
      if (data.success) {
        setSecrets(data.secrets || []);
      } else {
        setError('Failed to load secrets');
      }

      // Load expiration alerts
      try {
        const alertsResponse = await fetch('http://localhost:3200/api/secrets/alerts/expiring?days=30');
        const alertsData = await alertsResponse.json();
        if (alertsData.success) {
          setExpiringSecrets(alertsData.expiring || []);
          setExpiredSecrets(alertsData.expired || []);
        }
      } catch (alertErr) {
        console.error('Error loading expiration alerts:', alertErr);
      }
    } catch (err) {
      setError('Failed to connect to backend');
      console.error('Error loading secrets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const handleAddSecret = async () => {
    try {
      setError(null);
      
      if (!newKeyName || !newKeyValue) {
        setError('Name and value are required');
        return;
      }

      const response = await fetch('http://localhost:3200/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          value: newKeyValue,
          description: newKeyDescription || undefined,
          category: newKeyCategory,
          expiresAt: newKeyExpiresAt || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Secret '${newKeyName}' created successfully`);
        setShowAddModal(false);
        setNewKeyName('');
        setNewKeyValue('');
        setNewKeyDescription('');
        setNewKeyCategory('api_key');
        setNewKeyExpiresAt('');
        loadSecrets();
      } else {
        setError(data.message || 'Failed to create secret');
      }
    } catch (err) {
      setError('Failed to create secret');
      console.error('Error creating secret:', err);
    }
  };

  const handleRotateSecret = async () => {
    if (!selectedSecret || !rotateValue) {
      setError('New value is required');
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`http://localhost:3200/api/secrets/${selectedSecret}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: rotateValue }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Secret '${selectedSecret}' rotated successfully`);
        setShowRotateModal(false);
        setSelectedSecret(null);
        setRotateValue('');
        loadSecrets();
      } else {
        setError(data.message || 'Failed to rotate secret');
      }
    } catch (err) {
      setError('Failed to rotate secret');
      console.error('Error rotating secret:', err);
    }
  };

  const handleDeleteSecret = async (name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}'? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`http://localhost:3200/api/secrets/${name}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Secret '${name}' deleted successfully`);
        loadSecrets();
      } else {
        setError(data.message || 'Failed to delete secret');
      }
    } catch (err) {
      setError('Failed to delete secret');
      console.error('Error deleting secret:', err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'api_key':
        return <Key className="w-4 h-4" />;
      case 'token':
        return <Shield className="w-4 h-4" />;
      default:
        return <Key className="w-4 h-4" />;
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'api_key':
        return 'bg-blue-100 text-blue-800';
      case 'token':
        return 'bg-purple-100 text-purple-800';
      case 'credential':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Clear messages after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] text-white py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={32} />
            <h1 className="text-4xl font-bold">Secrets Management</h1>
          </div>
          <p className="text-green-100 text-lg">
            Securely manage LLM API keys and credentials with AES-256-GCM encryption
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <X className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
            <Check className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Expiration Alerts */}
        {(expiredSecrets.length > 0 || expiringSecrets.length > 0) && (
          <div className="mb-6 space-y-3">
            {expiredSecrets.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-900 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  Expired Secrets ({expiredSecrets.length})
                </h3>
                <ul className="text-sm text-red-800 space-y-1">
                  {expiredSecrets.map((s) => (
                    <li key={s.name} className="flex items-center justify-between">
                      <span className="font-mono">{s.name}</span>
                      <span>Expired {formatDate(s.expiresAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {expiringSecrets.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-900 flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5" />
                  Expiring Soon ({expiringSecrets.length})
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {expiringSecrets.map((s) => (
                    <li key={s.name} className="flex items-center justify-between">
                      <span className="font-mono">{s.name}</span>
                      <span>Expires in {s.daysUntilExpiry} days</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {secrets.length} secret{secrets.length !== 1 ? 's' : ''} stored
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#059211] text-white rounded-lg hover:bg-[#047a0e] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Secret
          </button>
        </div>

        {/* Common API Keys Quick Add */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">🚀 Quick Add Common API Keys</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'groq_api_key', label: 'Groq API Key' },
              { name: 'openai_api_key', label: 'OpenAI API Key' },
              { name: 'anthropic_api_key', label: 'Anthropic API Key' },
              { name: 'google_api_key', label: 'Google AI Key' },
            ].map((key) => (
              <button
                key={key.name}
                onClick={() => {
                  setNewKeyName(key.name);
                  setNewKeyDescription(`API key for ${key.label.replace(' API Key', '')} LLM service`);
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 bg-white text-blue-700 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition-colors"
              >
                + {key.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secrets List */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-[#059211] border-t-transparent rounded-full mx-auto mb-4" />
              Loading secrets...
            </div>
          ) : secrets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No secrets stored yet</p>
              <p className="text-sm mt-1">Add your first API key to enable LLM services</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiration</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Rotated</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {secrets.map((secret) => {
                  const isExpired = secret.expiresAt && new Date(secret.expiresAt) < new Date();
                  const isExpiringSoon = secret.expiresAt && !isExpired && 
                    (new Date(secret.expiresAt).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
                  
                  return (
                  <tr key={secret.name} className={`hover:bg-gray-50 ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-yellow-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{getCategoryIcon(secret.category)}</span>
                        <span className="font-mono text-sm font-medium text-gray-900">{secret.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(secret.category)}`}>
                        {secret.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {secret.description || <span className="text-gray-400">No description</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {secret.expiresAt ? (
                        <div className={`flex items-center gap-1 ${isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {isExpired ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                          {isExpired ? 'Expired' : formatDate(secret.expiresAt)}
                        </div>
                      ) : (
                        <span className="text-gray-400">No expiration</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(secret.lastRotated)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedSecret(secret.name);
                            setShowRotateModal(true);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Rotate secret"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSecret(secret.name)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete secret"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">🔐 Security Information</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• All secrets are encrypted with <strong>AES-256-GCM</strong> before storage</li>
            <li>• Values are never exposed in logs or API responses (only masked values)</li>
            <li>• Rotate secrets regularly for best security practices</li>
            <li>• Secrets can be accessed by backend services via <code className="bg-green-100 px-1 rounded">SecretsService.getSecret()</code></li>
          </ul>
        </div>
      </div>

      {/* Add Secret Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Secret</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="groq_api_key"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Use lowercase letters, numbers, and underscores</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <div className="relative">
                  <input
                    type={showValue ? 'text' : 'password'}
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    placeholder="sk-xxxx..."
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowValue(!showValue)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newKeyCategory}
                  onChange={(e) => setNewKeyCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
                >
                  <option value="api_key">API Key</option>
                  <option value="token">Token</option>
                  <option value="credential">Credential</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newKeyDescription}
                  onChange={(e) => setNewKeyDescription(e.target.value)}
                  placeholder="API key for Groq LLM service"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date (optional)</label>
                <input
                  type="date"
                  value={newKeyExpiresAt}
                  onChange={(e) => setNewKeyExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Set a reminder for when to rotate this key</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewKeyName('');
                  setNewKeyValue('');
                  setNewKeyDescription('');
                  setNewKeyExpiresAt('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSecret}
                className="px-4 py-2 bg-[#059211] text-white rounded-lg hover:bg-[#047a0e] transition-colors"
              >
                Add Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotate Secret Modal */}
      {showRotateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Rotate Secret</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter a new value for <span className="font-mono font-medium">{selectedSecret}</span>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Value</label>
                <div className="relative">
                  <input
                    type={showValue ? 'text' : 'password'}
                    value={rotateValue}
                    onChange={(e) => setRotateValue(e.target.value)}
                    placeholder="Enter new secret value"
                    className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowValue(!showValue)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Make sure to update any services using this secret after rotation.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRotateModal(false);
                  setSelectedSecret(null);
                  setRotateValue('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRotateSecret}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Rotate Secret
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
