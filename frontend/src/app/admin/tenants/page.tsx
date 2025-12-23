'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Edit2, Settings, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  features?: string[];
  settings?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ALL_FEATURES = ['ai', 'vision', 'search', 'chat', 'voice', 'flows', 'gamification'];

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    domain: '',
    logo: '',
    primaryColor: '#10b981',
    features: ['ai', 'vision', 'search'],
    isActive: true,
  });

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3200/api/tenants');
      if (!response.ok) throw new Error('Failed to fetch tenants');
      const data = await response.json();
      setTenants(data);
    } catch (err) {
      setError('Failed to load tenants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleCreate = async () => {
    if (!formData.id || !formData.name) {
      setError('ID and Name are required');
      return;
    }

    try {
      const response = await fetch('http://localhost:3200/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create tenant');

      const newTenant = await response.json();
      setTenants([...tenants, newTenant]);
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setError('Failed to create tenant');
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!editingTenant) return;

    try {
      const response = await fetch(`http://localhost:3200/api/tenants/${editingTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          domain: formData.domain,
          logo: formData.logo,
          primaryColor: formData.primaryColor,
          features: formData.features,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) throw new Error('Failed to update tenant');

      const updatedTenant = await response.json();
      setTenants(tenants.map(t => t.id === editingTenant.id ? updatedTenant : t));
      setEditingTenant(null);
      resetForm();
    } catch (err) {
      setError('Failed to update tenant');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      domain: '',
      logo: '',
      primaryColor: '#10b981',
      features: ['ai', 'vision', 'search'],
      isActive: true,
    });
  };

  const startEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain || '',
      logo: tenant.logo || '',
      primaryColor: tenant.primaryColor || '#10b981',
      features: tenant.features || ['ai', 'vision', 'search'],
      isActive: tenant.isActive,
    });
  };

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#059211] to-[#047a0e] text-white py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Building2 size={32} />
                <h1 className="text-4xl font-bold">Tenant Management</h1>
              </div>
              <p className="text-green-100 text-lg">
                Manage multi-tenant configuration and settings
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadTenants}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#059211] rounded-lg hover:bg-green-50 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Tenant
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#059211] border-t-transparent rounded-full mx-auto mb-4" />
            Loading tenants...
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tenants Found</h3>
            <p className="text-gray-500 mb-4">Create your first tenant to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#059211] text-white rounded-lg hover:bg-[#047a0e] transition-colors"
            >
              Create Tenant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map(tenant => (
              <div
                key={tenant.id}
                className={`bg-white rounded-xl shadow-md border-2 transition-all ${
                  tenant.isActive ? 'border-green-200' : 'border-gray-200 opacity-75'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {tenant.logo ? (
                        <picture>
                          <img src={tenant.logo} alt={tenant.name} className="w-12 h-12 rounded-lg object-cover" />
                        </picture>
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: tenant.primaryColor || '#10b981' }}
                        >
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                        <p className="text-sm text-gray-500">{tenant.id}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {tenant.domain && (
                    <p className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">Domain:</span> {tenant.domain}
                    </p>
                  )}

                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {(tenant.features || []).map(feature => (
                        <span
                          key={feature}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => startEdit(tenant)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTenant) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTenant ? 'Edit Tenant' : 'Create Tenant'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {!editingTenant && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="my-company"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Company"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="mycompany.mangwale.ai"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_FEATURES.map(feature => (
                    <button
                      key={feature}
                      onClick={() => toggleFeature(feature)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.features.includes(feature)
                          ? 'bg-[#059211] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {formData.features.includes(feature) && <Check className="w-4 h-4 inline mr-1" />}
                      {feature}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-[#059211] rounded focus:ring-[#059211]"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTenant(null);
                  resetForm();
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingTenant ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-[#059211] text-white rounded-lg hover:bg-[#047a0e] transition-colors"
              >
                {editingTenant ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
