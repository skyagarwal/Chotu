'use client';

import { useState, useEffect } from 'react';
import {
  MapPin, Map, Plus, Edit, Trash2, RefreshCw, CheckCircle, XCircle,
  AlertCircle, Save, X, Globe, Layers, Navigation, Target,
  Clock, DollarSign, Truck, Search, Filter, MoreVertical
} from 'lucide-react';

interface DeliveryZone {
  id: number;
  name: string;
  city: string;
  state: string;
  pincode_start?: string;
  pincode_end?: string;
  pincodes?: string[];
  polygon?: { lat: number; lng: number }[];
  delivery_fee: number;
  min_order_value: number;
  estimated_time_minutes: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface ZoneStats {
  total_zones: number;
  active_zones: number;
  total_pincodes: number;
  cities_covered: number;
}

export default function ZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [stats, setStats] = useState<ZoneStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state: '',
    pincode_start: '',
    pincode_end: '',
    pincodes: '',
    delivery_fee: 30,
    min_order_value: 100,
    estimated_time_minutes: 45,
    is_active: true,
    priority: 1,
  });

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      const response = await fetch('/api/zones');
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones || []);
        setStats({
          total_zones: data.zones?.length || 0,
          active_zones: data.zones?.filter((z: DeliveryZone) => z.is_active).length || 0,
          total_pincodes: data.zones?.reduce((acc: number, z: DeliveryZone) => acc + (z.pincodes?.length || 0), 0) || 0,
          cities_covered: new Set(data.zones?.map((z: DeliveryZone) => z.city)).size || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load zones:', error);
      // Load mock data for demo
      const mockZones: DeliveryZone[] = [
        {
          id: 1,
          name: 'Indore Central',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode_start: '452001',
          pincode_end: '452010',
          pincodes: ['452001', '452002', '452003', '452004', '452005'],
          delivery_fee: 25,
          min_order_value: 100,
          estimated_time_minutes: 35,
          is_active: true,
          priority: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Vijay Nagar',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincodes: ['452010', '452011', '452012'],
          delivery_fee: 30,
          min_order_value: 150,
          estimated_time_minutes: 40,
          is_active: true,
          priority: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: 'Palasia',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincodes: ['452001', '452018'],
          delivery_fee: 20,
          min_order_value: 100,
          estimated_time_minutes: 30,
          is_active: true,
          priority: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setZones(mockZones);
      setStats({
        total_zones: mockZones.length,
        active_zones: mockZones.filter(z => z.is_active).length,
        total_pincodes: mockZones.reduce((acc, z) => acc + (z.pincodes?.length || 0), 0),
        cities_covered: new Set(mockZones.map(z => z.city)).size,
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        city: zone.city,
        state: zone.state,
        pincode_start: zone.pincode_start || '',
        pincode_end: zone.pincode_end || '',
        pincodes: zone.pincodes?.join(', ') || '',
        delivery_fee: zone.delivery_fee,
        min_order_value: zone.min_order_value,
        estimated_time_minutes: zone.estimated_time_minutes,
        is_active: zone.is_active,
        priority: zone.priority,
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        city: '',
        state: '',
        pincode_start: '',
        pincode_end: '',
        pincodes: '',
        delivery_fee: 30,
        min_order_value: 100,
        estimated_time_minutes: 45,
        is_active: true,
        priority: 1,
      });
    }
    setEditModalOpen(true);
  };

  const saveZone = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        pincodes: formData.pincodes.split(',').map(p => p.trim()).filter(Boolean),
      };

      const response = await fetch(
        editingZone ? `/api/zones/${editingZone.id}` : '/api/zones',
        {
          method: editingZone ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        await loadZones();
        setEditModalOpen(false);
        alert(editingZone ? 'Zone updated!' : 'Zone created!');
      } else {
        alert('Failed to save zone');
      }
    } catch (error) {
      console.error('Error saving zone:', error);
      alert('Error saving zone');
    } finally {
      setSaving(false);
    }
  };

  const deleteZone = async (zoneId: number) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;

    try {
      const response = await fetch(`/api/zones/${zoneId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadZones();
        alert('Zone deleted!');
      } else {
        alert('Failed to delete zone');
      }
    } catch (error) {
      console.error('Error deleting zone:', error);
      alert('Error deleting zone');
    }
  };

  const toggleZoneActive = async (zone: DeliveryZone) => {
    try {
      const response = await fetch(`/api/zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !zone.is_active }),
      });

      if (response.ok) {
        await loadZones();
      }
    } catch (error) {
      console.error('Error toggling zone:', error);
    }
  };

  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.pincodes?.some(p => p.includes(searchTerm));
    
    const matchesFilter = filterActive === 'all' ||
      (filterActive === 'active' && zone.is_active) ||
      (filterActive === 'inactive' && !zone.is_active);
    
    return matchesSearch && matchesFilter;
  });

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
            <Map className="w-6 h-6 text-green-400" />
            Delivery Zones
          </h1>
          <p className="text-gray-400 mt-1">
            Manage delivery areas, fees, and service coverage
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadZones}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => openEditModal()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Add Zone
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Total Zones</span>
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-white">{stats?.total_zones || 0}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Active Zones</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-green-400">{stats?.active_zones || 0}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Pincodes</span>
            <MapPin className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-white">{stats?.total_pincodes || 0}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Cities</span>
            <Globe className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-white">{stats?.cities_covered || 0}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search zones, cities, pincodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as any)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="all">All Zones</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredZones.map((zone) => (
          <div
            key={zone.id}
            className={`bg-gray-800 rounded-xl border ${zone.is_active ? 'border-gray-700' : 'border-red-900/50'} overflow-hidden`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{zone.name}</h3>
                  <p className="text-gray-400 text-sm">{zone.city}, {zone.state}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleZoneActive(zone)}
                    className={`p-1 rounded ${zone.is_active ? 'text-green-400' : 'text-gray-500'}`}
                  >
                    {zone.is_active ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => openEditModal(zone)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteZone(zone.id)}
                    className="p-1 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300">
                    {zone.pincodes?.length || 0} pincodes
                  </span>
                  {zone.pincode_start && zone.pincode_end && (
                    <span className="text-gray-500 text-xs">
                      ({zone.pincode_start} - {zone.pincode_end})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300">
                    ₹{zone.delivery_fee} delivery fee
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">
                    Min ₹{zone.min_order_value} order
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-300">
                    ~{zone.estimated_time_minutes} min delivery
                  </span>
                </div>
              </div>

              {zone.pincodes && zone.pincodes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {zone.pincodes.slice(0, 5).map((pincode) => (
                    <span
                      key={pincode}
                      className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                    >
                      {pincode}
                    </span>
                  ))}
                  {zone.pincodes.length > 5 && (
                    <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
                      +{zone.pincodes.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-gray-700/30 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
              <span>Priority: {zone.priority}</span>
              <span>Updated: {new Date(zone.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredZones.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No zones found</p>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingZone ? 'Edit Zone' : 'Add New Zone'}
              </h2>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Zone Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., Vijay Nagar"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Indore"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Madhya Pradesh"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Pincodes (comma separated)</label>
                <textarea
                  value={formData.pincodes}
                  onChange={(e) => setFormData({ ...formData, pincodes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="452001, 452002, 452003"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Delivery Fee (₹)</label>
                  <input
                    type="number"
                    value={formData.delivery_fee}
                    onChange={(e) => setFormData({ ...formData, delivery_fee: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={formData.min_order_value}
                    onChange={(e) => setFormData({ ...formData, min_order_value: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Est. Time (min)</label>
                  <input
                    type="number"
                    value={formData.estimated_time_minutes}
                    onChange={(e) => setFormData({ ...formData, estimated_time_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    min={1}
                    max={10}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveZone}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-lg transition"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingZone ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
