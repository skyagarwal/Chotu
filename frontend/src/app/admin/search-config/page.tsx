'use client';

import { useState } from 'react';
import { Settings, Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/shared';

export default function SearchConfigPage() {
  const [reindexing, setReindexing] = useState(false);
  const toast = useToast();

  const modules = [
    { name: 'Food', index: 'food_items', status: 'healthy', docs: 15420 },
    { name: 'Ecom', index: 'ecom_items', status: 'healthy', docs: 28945 },
    { name: 'Parcel', index: 'parcel_zones', status: 'healthy', docs: 342 },
    { name: 'Ride', index: 'ride_locations', status: 'warning', docs: 1250 },
    { name: 'Health', index: 'health_services', status: 'healthy', docs: 8960 },
    { name: 'Rooms', index: 'rooms_items', status: 'healthy', docs: 3421 },
    { name: 'Movies', index: 'movies_items', status: 'healthy', docs: 752 },
    { name: 'Services', index: 'services_items', status: 'healthy', docs: 4893 }
  ];

  const reindexModule = async (moduleName: string) => {
    setReindexing(true);
    toast.info(`Reindexing ${moduleName}...`);
    setTimeout(() => {
      setReindexing(false);
      toast.success(`${moduleName} reindexed successfully`);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={32} />
          <h1 className="text-3xl font-bold">Search Configuration</h1>
        </div>
        <p className="text-cyan-100">
          Manage OpenSearch indices and search settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map(module => (
          <div key={module.name} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{module.name}</h3>
              {module.status === 'healthy' ? (
                <CheckCircle2 size={20} className="text-green-600" />
              ) : (
                <AlertCircle size={20} className="text-yellow-600" />
              )}
            </div>
            <div className="text-sm text-gray-600 mb-1">Index: {module.index}</div>
            <div className="text-2xl font-bold text-gray-900 mb-4">
              {module.docs.toLocaleString()} docs
            </div>
            <button
              onClick={() => reindexModule(module.name)}
              disabled={reindexing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={reindexing ? 'animate-spin' : ''} />
              Reindex
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database size={20} />
          OpenSearch Cluster
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Cluster Health</div>
            <div className="text-2xl font-bold text-green-600">Green</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Indices</div>
            <div className="text-2xl font-bold text-gray-900">16</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Documents</div>
            <div className="text-2xl font-bold text-gray-900">64,983</div>
          </div>
        </div>
      </div>
    </div>
  );
}
