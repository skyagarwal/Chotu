'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Eye,
  Activity,
  Server,
  Camera,
  Users,
  FlaskConical,
  Wand2,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Zap,
  TrendingUp,
  Clock,
  DollarSign,
  Hash,
  Search,
  Package,
  ShoppingCart,
  FileText,
  Video,
  Map,
  Layout,
  Cpu,
  Database,
  Brain,
} from 'lucide-react';

interface QuickStats {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  activeExperiments: number;
  camerasOnline: number;
  employeesEnrolled: number;
  alertsActive: number;
  cacheHitRate: number;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency?: number;
  lastCheck?: string;
}

export default function VisionHubPage() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashboardRes, healthRes] = await Promise.all([
        fetch('/api/vision/dashboard').catch(() => null),
        fetch('/api/vision/dashboard/health').catch(() => null),
      ]);

      if (dashboardRes?.ok) {
        const data = await dashboardRes.json();
        setStats({
          totalRequests: data.metrics?.totalRequests || 0,
          successRate: data.metrics?.successRate || 1,
          avgLatencyMs: data.metrics?.avgLatencyMs || 0,
          activeExperiments: data.experiments?.running || 0,
          camerasOnline: 0,
          employeesEnrolled: 0,
          alertsActive: data.alerts?.length || 0,
          cacheHitRate: data.cache?.hitRate || 0,
        });
      }

      // Build services health
      const servicesList: ServiceHealth[] = [
        { name: 'Vision AI Engine', status: dashboardRes?.ok ? 'healthy' : 'offline' },
        { name: 'VLM Gateway', status: healthRes?.ok ? 'healthy' : 'offline' },
        { name: 'Face Recognition', status: 'healthy' },
        { name: 'Object Detection', status: 'healthy' },
        { name: 'A/B Testing', status: 'healthy' },
        { name: 'Cache Layer', status: 'healthy' },
      ];
      setServices(servicesList);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch vision hub data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const modules = [
    {
      id: 'ai-dashboard',
      name: 'AI Dashboard',
      description: 'Real-time Vision AI metrics, provider health, and system monitoring',
      icon: Activity,
      href: '/admin/vision/ai-dashboard',
      color: 'bg-blue-500',
      stats: stats ? `${((stats.successRate) * 100).toFixed(1)}% success` : 'Loading...',
    },
    {
      id: 'playground',
      name: 'Vision Playground',
      description: 'Test and explore Vision Agent capabilities with any image',
      icon: Wand2,
      href: '/admin/vision/playground',
      color: 'bg-purple-500',
      stats: '9 intents available',
    },
    {
      id: 'ab-testing',
      name: 'A/B Testing',
      description: 'Run experiments to optimize VLM providers and model settings',
      icon: FlaskConical,
      href: '/admin/vision/ab-testing',
      color: 'bg-orange-500',
      stats: stats ? `${stats.activeExperiments} running` : 'Loading...',
    },
    {
      id: 'compliance',
      name: 'Rider Compliance',
      description: 'Check PPE compliance for delivery riders (helmet, uniform, bag)',
      icon: Eye,
      href: '/admin/vision',
      color: 'bg-green-500',
      stats: 'PPE Detection',
    },
    {
      id: 'employees',
      name: 'Face Recognition',
      description: 'Manage employee enrollment and face recognition for attendance',
      icon: Users,
      href: '/admin/vision/employees',
      color: 'bg-pink-500',
      stats: 'Employee Management',
    },
    {
      id: 'cameras',
      name: 'Camera Management',
      description: 'Configure and monitor RTSP cameras for live vision processing',
      icon: Camera,
      href: '/admin/vision/cameras',
      color: 'bg-indigo-500',
      stats: 'RTSP Streams',
    },
    {
      id: 'counting',
      name: 'Object Counting',
      description: 'Real-time object counting and zone monitoring with live feeds',
      icon: Hash,
      href: '/admin/vision/counting',
      color: 'bg-teal-500',
      stats: 'Live Counting',
    },
    {
      id: 'monitoring',
      name: 'Live Monitoring',
      description: 'Real-time video feed monitoring with AI overlays',
      icon: Video,
      href: '/admin/vision/monitoring',
      color: 'bg-red-500',
      stats: 'Video Streams',
    },
    {
      id: 'zones',
      name: 'Zone Management',
      description: 'Define and manage detection zones for cameras',
      icon: Map,
      href: '/admin/vision/zones',
      color: 'bg-amber-500',
      stats: 'Detection Zones',
    },
    {
      id: 'analytics',
      name: 'Vision Analytics',
      description: 'Attendance logs, face recognition stats, and historical data',
      icon: BarChart3,
      href: '/admin/vision/analytics',
      color: 'bg-cyan-500',
      stats: 'Historical Data',
    },
    {
      id: 'menu-ocr',
      name: 'Menu OCR',
      description: 'Extract menu items and prices from restaurant menu images',
      icon: FileText,
      href: '/admin/vision/menu-ocr',
      color: 'bg-emerald-500',
      stats: 'Text Extraction',
    },
    {
      id: 'enrollment',
      name: 'Camera Enrollment',
      description: 'Enroll employees using camera feed for face recognition',
      icon: Layout,
      href: '/admin/vision/camera-enrollment',
      color: 'bg-violet-500',
      stats: 'Live Enrollment',
    },
  ];

  const quickActions = [
    { label: 'Check Rider Compliance', href: '/admin/vision', icon: Eye },
    { label: 'Test Vision Agent', href: '/admin/vision/playground', icon: Wand2 },
    { label: 'View AI Metrics', href: '/admin/vision/ai-dashboard', icon: Activity },
    { label: 'Manage Experiments', href: '/admin/vision/ab-testing', icon: FlaskConical },
  ];

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
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Eye className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mangwale Eyes - Vision Hub
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unified Vision AI Platform for Computer Vision, VLM, and Real-time Analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalRequests?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-gray-500">Total Requests</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">
                {((stats?.successRate || 1) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Success Rate</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.avgLatencyMs?.toFixed(0) || 0}ms
              </p>
              <p className="text-xs text-gray-500">Avg Latency</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Database className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {((stats?.cacheHitRate || 0) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">Cache Hit Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Health */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          Service Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <span className={`text-lg ${getStatusColor(service.status)}`}>●</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {service.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{action.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Module Cards */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Vision Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                href={module.href}
                className="group bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 ${module.color} rounded-xl group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {module.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {module.description}
                    </p>
                    <p className="text-xs text-blue-500 mt-2 font-medium">
                      {module.stats}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* VLM Providers */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5" />
            VLM Providers (Vision Language Models)
          </h3>
          <Link
            href="/admin/vision/ai-dashboard"
            className="text-sm text-blue-500 hover:underline"
          >
            View Details →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-green-800 dark:text-green-300">OpenRouter</span>
              <span className="text-xs px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full">
                8 FREE models
              </span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">
              Primary provider with auto-fallback
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-blue-800 dark:text-blue-300">Gemini</span>
              <span className="text-xs px-2 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                2.5 Flash
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              High-quality fallback
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-purple-800 dark:text-purple-300">OpenAI</span>
              <span className="text-xs px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                GPT-4o
              </span>
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Premium quality option
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-orange-800 dark:text-orange-300">Groq</span>
              <span className="text-xs px-2 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full">
                Fast
              </span>
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Ultra-fast inference
            </p>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Platform Capabilities
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Eye, label: 'PPE Detection', desc: 'Helmet, uniform, bag check' },
            { icon: Users, label: 'Face Recognition', desc: 'Employee attendance' },
            { icon: Hash, label: 'Object Counting', desc: 'Real-time counting' },
            { icon: Search, label: 'Visual Search', desc: 'Product similarity' },
            { icon: FileText, label: 'OCR & Documents', desc: 'Text extraction' },
            { icon: Package, label: 'Parcel Analysis', desc: 'Package inspection' },
            { icon: ShoppingCart, label: 'Shelf Analytics', desc: 'Inventory tracking' },
            { icon: Video, label: 'Live Streams', desc: 'RTSP processing' },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.label} className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {feature.label}
                  </p>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
