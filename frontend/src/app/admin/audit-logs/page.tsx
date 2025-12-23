'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, Filter, Download, Search, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Calendar, User, Activity
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resource_id?: string;
  details: string;
  ip: string;
  status: 'success' | 'failure';
}

interface AuditStats {
  total_logs: number;
  logs_24h: number;
  logs_7d: number;
  success_rate: number;
  action_breakdown: Record<string, number>;
  resource_breakdown: Record<string, number>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/audit-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      // Load mock data on error
      setLogs([
        {
          id: '1',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'admin@mangwale.ai',
          action: 'CREATE',
          resource: 'Training Job',
          details: 'Started NLU training job for food module',
          ip: '192.168.1.100',
          status: 'success',
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          user: 'system',
          action: 'UPDATE',
          resource: 'Flow',
          details: 'Auto-saved flow configuration changes',
          ip: '127.0.0.1',
          status: 'success',
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          user: 'admin@mangwale.ai',
          action: 'DELETE',
          resource: 'Dataset',
          details: 'Cleaned up old training dataset',
          ip: '192.168.1.100',
          status: 'success',
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          user: 'unknown',
          action: 'LOGIN',
          resource: 'Auth',
          details: 'Failed login attempt with invalid credentials',
          ip: '203.0.113.42',
          status: 'failure',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/audit-logs/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        total_logs: 156,
        logs_24h: 23,
        logs_7d: 89,
        success_rate: 94,
        action_breakdown: { CREATE: 45, UPDATE: 67, DELETE: 12, LOGIN: 32 },
        resource_breakdown: { Flow: 34, Model: 28, User: 45, Dataset: 23 },
      });
    }
  };

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [page, actionFilter, statusFilter]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.user.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.resource.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term)
    );
  });

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'LOGIN': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Details', 'IP', 'Status'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.user,
        log.action,
        log.resource,
        `"${log.details}"`,
        log.ip,
        log.status,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-400" />
            Audit Logs
          </h1>
          <p className="text-gray-400 mt-1">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { loadLogs(); loadStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Total Logs</span>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-white">{stats?.total_logs || 0}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last 24h</span>
            <Calendar className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-green-400">{stats?.logs_24h || 0}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last 7 Days</span>
            <Calendar className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-white">{stats?.logs_7d || 0}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Success Rate</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-green-400">{stats?.success_rate || 0}%</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="all">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-white">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{log.resource}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-sm">{log.ip}</td>
                    <td className="px-4 py-3">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
          <span className="text-gray-400 text-sm">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
