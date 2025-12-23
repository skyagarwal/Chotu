'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  Play,
  Pause,
  ExternalLink
} from 'lucide-react';

interface DataSource {
  id: number;
  name: string;
  dataType: string;
  apiEndpoint?: string;
  apiKey?: string;
  priority: number;
  isActive: boolean;
  usageCount: number;
  avgResponseTime: number;
  errorCount: number;
  healthStatus: 'healthy' | 'warning' | 'degraded' | 'critical';
  lastSuccess?: string;
  lastError?: string;
  createdAt: string;
}

const DATA_TYPES = [
  { value: 'weather', label: 'Weather' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'store_info', label: 'Store Info' },
  { value: 'user_preferences', label: 'User Preferences' },
  { value: 'festivals', label: 'Festivals' },
  { value: 'local_knowledge', label: 'Local Knowledge' },
];

export default function DataSourcesPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    dataType: 'weather',
    apiEndpoint: '',
    apiKey: '',
    priority: 1,
    isActive: true,
  });

  useEffect(() => {
    loadDataSources();
  }, []);

  const loadDataSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/data-sources');
      const data = await response.json();
      setDataSources(data);
    } catch (error) {
      console.error('Failed to load data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDataSource = async () => {
    try {
      const url = editingSource 
        ? `/api/admin/data-sources/${editingSource.id}`
        : '/api/admin/data-sources';
      
      await fetch(url, {
        method: editingSource ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      loadDataSources();
      setShowAddModal(false);
      setEditingSource(null);
      resetForm();
    } catch (error) {
      console.error('Failed to save data source:', error);
    }
  };

  const deleteDataSource = async (id: number) => {
    if (!confirm('Are you sure you want to delete this data source?')) return;
    
    try {
      await fetch(`/api/admin/data-sources/${id}`, { method: 'DELETE' });
      loadDataSources();
    } catch (error) {
      console.error('Failed to delete data source:', error);
    }
  };

  const toggleActive = async (source: DataSource) => {
    try {
      await fetch(`/api/admin/data-sources/${source.id}/toggle`, { method: 'POST' });
      loadDataSources();
    } catch (error) {
      console.error('Failed to toggle data source:', error);
    }
  };

  const testDataSource = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/data-sources/${id}/test`, { method: 'POST' });
      const result = await response.json();
      alert(result.success ? 'Test successful!' : `Test failed: ${result.error}`);
    } catch (error) {
      alert('Test failed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dataType: 'weather',
      apiEndpoint: '',
      apiKey: '',
      priority: 1,
      isActive: true,
    });
  };

  const openEditModal = (source: DataSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      dataType: source.dataType,
      apiEndpoint: source.apiEndpoint || '',
      apiKey: source.apiKey || '',
      priority: source.priority,
      isActive: source.isActive,
    });
    setShowAddModal(true);
  };

  const getHealthBadge = (status: string) => {
    const colors = {
      healthy: 'bg-green-100 text-green-700 border-green-200',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      degraded: 'bg-orange-100 text-orange-700 border-orange-200',
      critical: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Sources</h1>
          <p className="text-gray-600 mt-1">Manage external data sources for Chotu's context</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDataSources}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#059211] text-white rounded-lg hover:bg-[#047a0e]"
          >
            <Plus size={18} />
            Add Source
          </button>
        </div>
      </div>

      {/* Data Sources Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <RefreshCw className="animate-spin mx-auto text-gray-400" size={32} />
                </td>
              </tr>
            ) : dataSources.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No data sources configured. Add one to get started.
                </td>
              </tr>
            ) : (
              dataSources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Database size={20} className={source.isActive ? 'text-green-500' : 'text-gray-400'} />
                      <div>
                        <div className="font-medium text-gray-900">{source.name}</div>
                        {source.apiEndpoint && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{source.apiEndpoint}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                      {source.dataType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleActive(source)}
                      className={`flex items-center gap-1 ${source.isActive ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {source.isActive ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      <span className="text-sm">{source.isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{source.priority}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {source.usageCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {source.avgResponseTime}ms
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getHealthBadge(source.healthStatus)}`}>
                      {source.healthStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => testDataSource(source.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Test"
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(source)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteDataSource(source.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingSource ? 'Edit Data Source' : 'Add Data Source'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211]"
                  placeholder="e.g., Open-Meteo Weather"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
                <select
                  value={formData.dataType}
                  onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211]"
                >
                  {DATA_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
                <input
                  type="text"
                  value={formData.apiEndpoint}
                  onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211]"
                  placeholder="https://api.example.com/v1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key (Optional)</label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211]"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1 = highest)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#059211]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-[#059211]"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => { setShowAddModal(false); setEditingSource(null); resetForm(); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveDataSource}
                className="px-4 py-2 bg-[#059211] text-white rounded-lg hover:bg-[#047a0e]"
              >
                {editingSource ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
