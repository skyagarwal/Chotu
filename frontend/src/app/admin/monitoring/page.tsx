'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Database,
  MessageSquare,
  Search,
  Globe,
  RefreshCw,
  Cpu,
  HardDrive,
  Server,
  Wifi
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface LLMCosts {
  [provider: string]: {
    requests: number;
    tokens: number;
    cost: number;
    avgLatency: number;
  };
}

interface Analytics {
  conversations: { total: number; unique_users: number };
  search: { total: number; avg_results: number };
  nlu: { total: number; avg_confidence: number };
  llm: { total: number; total_cost: number };
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  provider?: string;
  message: string;
  timestamp: number;
}

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  memory_free: number;
  disk_usage: number;
  uptime_seconds: number;
  load_average: number[];
  platform: string;
  hostname: string;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  last_check: string;
}

export default function MonitoringDashboard() {
  const [llmCosts, setLLMCosts] = useState<LLMCosts>({});
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);

      // Fetch system metrics (new)
      try {
        const metricsRes = await fetch('/api/monitoring/metrics');
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setSystemMetrics(metricsData);
        }
      } catch (e) {
        console.error('Error fetching system metrics:', e);
      }

      // Fetch service health (new)
      try {
        const servicesRes = await fetch('/api/monitoring/services');
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setServices(servicesData.services || []);
        }
      } catch (e) {
        console.error('Error fetching service health:', e);
      }

      // Fetch LLM costs
      try {
        const costsRes = await fetch(`${API_URL}/monitoring/llm/costs`);
        if (costsRes.ok) {
          const costsData = await costsRes.json();
          setLLMCosts(costsData);
        }
      } catch (e) {
        console.error('Error fetching LLM costs:', e);
      }

      // Fetch analytics summary
      try {
        const analyticsRes = await fetch(`${API_URL}/monitoring/analytics/summary?timeRange=${timeRange}`);
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }
      } catch (e) {
        console.error('Error fetching analytics:', e);
      }

      // Fetch alerts from both old and new endpoints
      try {
        const [oldAlertsRes, newAlertsRes] = await Promise.all([
          fetch(`${API_URL}/monitoring/alerts`).catch(() => null),
          fetch('/api/monitoring/alerts').catch(() => null),
        ]);
        
        const combinedAlerts: Alert[] = [];
        if (oldAlertsRes?.ok) {
          const oldData = await oldAlertsRes.json();
          combinedAlerts.push(...(oldData.alerts || []));
        }
        if (newAlertsRes?.ok) {
          const newData = await newAlertsRes.json();
          const formattedAlerts = (newData.alerts || []).map((a: any) => ({
            id: a.id,
            type: a.type,
            message: a.message,
            timestamp: new Date(a.timestamp).getTime(),
          }));
          combinedAlerts.push(...formattedAlerts);
        }
        setAlerts(combinedAlerts);
      } catch (e) {
        console.error('Error fetching alerts:', e);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const getTotalCost = () => {
    return Object.values(llmCosts).reduce((sum, data) => sum + data.cost, 0);
  };

  const getTotalRequests = () => {
    return Object.values(llmCosts).reduce((sum, data) => sum + data.requests, 0);
  };

  const getTotalTokens = () => {
    return Object.values(llmCosts).reduce((sum, data) => sum + data.tokens, 0);
  };

  const getAvgLatency = () => {
    const providers = Object.values(llmCosts);
    if (providers.length === 0) return 0;
    const totalLatency = providers.reduce((sum, data) => sum + data.avgLatency, 0);
    return Math.round(totalLatency / providers.length);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount * 85); // USD to INR
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'degraded': return 'outline';
      case 'down': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time performance and cost tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchMonitoringData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <Button
          variant={timeRange === '1h' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('1h')}
        >
          Last Hour
        </Button>
        <Button
          variant={timeRange === '24h' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('24h')}
        >
          Last 24 Hours
        </Button>
        <Button
          variant={timeRange === '7d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('7d')}
        >
          Last 7 Days
        </Button>
        <Button
          variant={timeRange === '30d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('30d')}
        >
          Last 30 Days
        </Button>
      </div>

      {/* System Metrics */}
      {systemMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${systemMetrics.cpu_usage > 80 ? 'text-red-500' : systemMetrics.cpu_usage > 60 ? 'text-yellow-500' : 'text-green-500'}`}>
                {systemMetrics.cpu_usage.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${systemMetrics.cpu_usage > 80 ? 'bg-red-500' : systemMetrics.cpu_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(systemMetrics.cpu_usage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${systemMetrics.memory_usage > 85 ? 'text-red-500' : systemMetrics.memory_usage > 70 ? 'text-yellow-500' : 'text-green-500'}`}>
                {systemMetrics.memory_usage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {systemMetrics.memory_free.toFixed(1)}GB free / {systemMetrics.memory_total.toFixed(1)}GB
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${systemMetrics.disk_usage > 90 ? 'text-red-500' : systemMetrics.disk_usage > 75 ? 'text-yellow-500' : 'text-green-500'}`}>
                {systemMetrics.disk_usage}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${systemMetrics.disk_usage > 90 ? 'bg-red-500' : systemMetrics.disk_usage > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${systemMetrics.disk_usage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatUptime(systemMetrics.uptime_seconds)}
              </div>
              <p className="text-xs text-muted-foreground">
                Load: {systemMetrics.load_average.map(l => l.toFixed(2)).join(' ')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Host</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{systemMetrics.hostname}</div>
              <p className="text-xs text-muted-foreground capitalize">
                {systemMetrics.platform}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Health */}
      {services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Service Health
            </CardTitle>
            <CardDescription>Real-time service status and latency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {service.status === 'healthy' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : service.status === 'degraded' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.latency_ms}ms
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusBadge(service.status) as "default" | "destructive" | "outline" | "secondary"}>
                    {service.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalCost())}</div>
            <p className="text-xs text-muted-foreground">
              ${getTotalCost().toFixed(4)} USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LLM Requests</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(getTotalRequests())}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(getTotalTokens())} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getAvgLatency()}ms</div>
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
            </CardTitle>
            <CardDescription>System warnings and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    {alert.provider && (
                      <Badge variant="outline" className="mt-1">
                        {alert.provider}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LLM Provider Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            LLM Provider Breakdown
          </CardTitle>
          <CardDescription>Usage and costs by provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(llmCosts).map(([provider, data]) => (
              <div key={provider} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize">{provider}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(data.cost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatNumber(data.requests)} requests</span>
                    <span>{formatNumber(data.tokens)} tokens</span>
                    <span>{data.avgLatency}ms avg</span>
                  </div>
                </div>
                <Badge variant={provider === 'groq' ? 'default' : 'outline'}>
                  {provider === 'groq' ? 'Primary' : 'Backup'}
                </Badge>
              </div>
            ))}
            {Object.keys(llmCosts).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No LLM usage data available for this time period
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.conversations?.total || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(analytics.conversations?.unique_users || 0)} unique users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Search Queries</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.search?.total || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.search?.avg_results?.toFixed(1) || 0} avg results
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">NLU Calls</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.nlu?.total || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {(analytics.nlu?.avg_confidence * 100 || 0).toFixed(1)}% avg confidence
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LLM Calls</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(analytics.llm?.total || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(analytics.llm?.total_cost || 0)} total cost
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
