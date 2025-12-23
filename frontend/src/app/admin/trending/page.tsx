'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, Clock, MapPin, RefreshCw, BarChart3, Search, Filter,
  ArrowUp, ArrowDown, Flame, Package, ShoppingCart, Car, Utensils,
  Activity, Target, Calendar, Download, Users
} from 'lucide-react';

interface TrendingItem {
  query: string;
  count: number;
  trend: number;
  module: string;
  velocity: 'rising' | 'stable' | 'falling';
}

interface LocationTrend {
  location: string;
  top_queries: string[];
  total_searches: number;
  change: number;
}

interface ProductTrend {
  product_id: string;
  name: string;
  category: string;
  orders: number;
  trend: number;
  revenue: number;
}

export default function TrendingPage() {
  const [activeTab, setActiveTab] = useState<'queries' | 'products' | 'locations' | 'analytics'>('queries');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const [trendingQueries, setTrendingQueries] = useState<TrendingItem[]>([
    { query: 'pizza delivery', count: 2450, trend: 245, module: 'Food', velocity: 'rising' },
    { query: 'grocery home delivery', count: 1890, trend: 189, module: 'Ecom', velocity: 'rising' },
    { query: 'urgent parcel', count: 1560, trend: 156, module: 'Parcel', velocity: 'rising' },
    { query: 'airport taxi', count: 1340, trend: 134, module: 'Ride', velocity: 'stable' },
    { query: 'medicine delivery', count: 980, trend: 98, module: 'Health', velocity: 'rising' },
    { query: 'biryani near me', count: 876, trend: 87, module: 'Food', velocity: 'rising' },
    { query: 'cab booking', count: 765, trend: 45, module: 'Ride', velocity: 'stable' },
    { query: 'track my order', count: 654, trend: -12, module: 'General', velocity: 'falling' },
    { query: 'vegetable delivery', count: 543, trend: 67, module: 'Ecom', velocity: 'rising' },
    { query: 'covid test home', count: 432, trend: -25, module: 'Health', velocity: 'falling' },
  ]);

  const [locationTrends, setLocationTrends] = useState<LocationTrend[]>([
    { location: 'Indore', top_queries: ['pizza', 'grocery', 'medicine'], total_searches: 5670, change: 23 },
    { location: 'Bhopal', top_queries: ['cab', 'food', 'parcel'], total_searches: 4320, change: 15 },
    { location: 'Mumbai', top_queries: ['late night food', 'cab'], total_searches: 8900, change: 34 },
    { location: 'Delhi', top_queries: ['grocery', 'medicine'], total_searches: 7650, change: 28 },
    { location: 'Bangalore', top_queries: ['food delivery', 'grocery'], total_searches: 6540, change: 19 },
  ]);

  const [productTrends, setProductTrends] = useState<ProductTrend[]>([
    { product_id: '1', name: 'Margherita Pizza', category: 'Food', orders: 345, trend: 156, revenue: 69000 },
    { product_id: '2', name: 'Chicken Biryani', category: 'Food', orders: 298, trend: 89, revenue: 59600 },
    { product_id: '3', name: 'Onions (1kg)', category: 'Grocery', orders: 567, trend: 45, revenue: 17010 },
    { product_id: '4', name: 'Milk Packet', category: 'Grocery', orders: 890, trend: 23, revenue: 44500 },
    { product_id: '5', name: 'Cough Syrup', category: 'Medicine', orders: 234, trend: 78, revenue: 28080 },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/trending?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        if (data.queries) setTrendingQueries(data.queries);
        if (data.locations) setLocationTrends(data.locations);
        if (data.products) setProductTrends(data.products);
      }
    } catch (error) {
      console.error('Error loading trending data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const getModuleIcon = (module: string) => {
    switch (module.toLowerCase()) {
      case 'food': return <Utensils className="w-4 h-4 text-orange-400" />;
      case 'ecom': return <ShoppingCart className="w-4 h-4 text-blue-400" />;
      case 'ride': return <Car className="w-4 h-4 text-green-400" />;
      case 'parcel': return <Package className="w-4 h-4 text-purple-400" />;
      default: return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const getVelocityIcon = (velocity: string) => {
    switch (velocity) {
      case 'rising': return <ArrowUp className="w-4 h-4 text-green-400" />;
      case 'falling': return <ArrowDown className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredQueries = trendingQueries.filter(item => {
    const matchesSearch = item.query.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesModule = moduleFilter === 'all' || item.module.toLowerCase() === moduleFilter.toLowerCase();
    return matchesSearch && matchesModule;
  });

  const modules = ['all', ...new Set(trendingQueries.map(q => q.module))];

  const tabs = [
    { id: 'queries', label: 'Search Queries', icon: Search },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-pink-400" />
            Trending Analytics
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time trending searches, products, and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg transition">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Total Searches</span>
            <Search className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-white">
            {trendingQueries.reduce((acc, q) => acc + q.count, 0).toLocaleString()}
          </p>
          <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
            <ArrowUp className="w-3 h-3" /> +12.5% from last period
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Rising Queries</span>
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-orange-400">
            {trendingQueries.filter(q => q.velocity === 'rising').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Currently trending up</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Active Locations</span>
            <MapPin className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-white">{locationTrends.length}</p>
          <p className="text-xs text-gray-500 mt-1">With active searches</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Unique Users</span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-white">2,456</p>
          <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
            <ArrowUp className="w-3 h-3" /> +8.3% from last period
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              activeTab === tab.id ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queries Tab */}
      {activeTab === 'queries' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search queries..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              {modules.map((m) => (
                <option key={m} value={m}>{m === 'all' ? 'All Modules' : m}</option>
              ))}
            </select>
          </div>

          {/* Trending List */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-700 text-gray-400 text-sm font-medium">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Query</div>
              <div className="col-span-2">Module</div>
              <div className="col-span-2">Searches</div>
              <div className="col-span-2">Trend</div>
              <div className="col-span-1">Velocity</div>
            </div>
            {filteredQueries.map((item, index) => (
              <div 
                key={index} 
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-700/50 hover:bg-gray-700/30 transition"
              >
                <div className="col-span-1">
                  <span className={`text-lg font-bold ${
                    index < 3 ? 'text-yellow-400' : 'text-gray-500'
                  }`}>
                    #{index + 1}
                  </span>
                </div>
                <div className="col-span-4 text-white font-medium">{item.query}</div>
                <div className="col-span-2">
                  <span className="flex items-center gap-2">
                    {getModuleIcon(item.module)}
                    <span className="text-gray-300">{item.module}</span>
                  </span>
                </div>
                <div className="col-span-2 text-gray-300">{item.count.toLocaleString()}</div>
                <div className="col-span-2">
                  <span className={`font-medium ${
                    item.trend > 0 ? 'text-green-400' : item.trend < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {item.trend > 0 ? '+' : ''}{item.trend}%
                  </span>
                </div>
                <div className="col-span-1">{getVelocityIcon(item.velocity)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Trending Products</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Trend</th>
                  <th className="px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {productTrends.map((product, index) => (
                  <tr key={product.product_id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <span className={`font-bold ${index < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{product.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-sm">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{product.orders}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 ${product.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {product.trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(product.trend)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      ₹{product.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locationTrends.map((location, index) => (
            <div key={location.location} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-400" />
                  <h3 className="text-white font-semibold">{location.location}</h3>
                </div>
                <span className={`flex items-center gap-1 text-sm ${location.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {location.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(location.change)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-400">Total Searches</span>
                <span className="text-white font-medium">{location.total_searches.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Top Queries:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {location.top_queries.map((query) => (
                    <span key={query} className="px-2 py-1 bg-gray-700 rounded text-gray-300 text-sm">
                      {query}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Search Volume by Module</h3>
            <div className="space-y-4">
              {[
                { module: 'Food', percent: 35, color: 'bg-orange-500' },
                { module: 'Ecom', percent: 28, color: 'bg-blue-500' },
                { module: 'Ride', percent: 18, color: 'bg-green-500' },
                { module: 'Parcel', percent: 12, color: 'bg-purple-500' },
                { module: 'Health', percent: 7, color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.module}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{item.module}</span>
                    <span className="text-gray-400">{item.percent}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Peak Hours</h3>
            <div className="space-y-3">
              {[
                { hour: '12:00 - 14:00', label: 'Lunch Rush', percent: 85 },
                { hour: '19:00 - 21:00', label: 'Dinner Peak', percent: 92 },
                { hour: '09:00 - 11:00', label: 'Morning Orders', percent: 65 },
                { hour: '15:00 - 17:00', label: 'Afternoon', percent: 45 },
                { hour: '22:00 - 00:00', label: 'Late Night', percent: 55 },
              ].map((item) => (
                <div key={item.hour} className="flex items-center gap-4">
                  <div className="w-28">
                    <p className="text-white text-sm">{item.hour}</p>
                    <p className="text-gray-500 text-xs">{item.label}</p>
                  </div>
                  <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-pink-600"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm w-10">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
