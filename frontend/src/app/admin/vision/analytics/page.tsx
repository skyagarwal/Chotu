'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react';

interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  byDepartment: Array<{
    department: string;
    count: number;
  }>;
}

interface AttendanceLog {
  id: string;
  employeeId: string;
  employee: {
    name: string;
    employeeCode: string;
    department: string;
  };
  timestamp: string;
  confidence: number;
  cameraId: string;
  storeId: string;
}

interface AttendanceSummary {
  totalLogs: number;
  uniqueEmployees: number;
  averageConfidence: number;
  byDepartment: Array<{
    department: string;
    count: number;
  }>;
  byDate: Array<{
    date: string;
    count: number;
  }>;
}

export default function AnalyticsPage() {
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');

  const fetchData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: '10'
      });

      const [employeeStatsRes, attendanceSummaryRes, attendanceLogsRes] = await Promise.all([
        fetch('/api/vision/employees/stats'),
        fetch(`/api/vision/attendance/summary?${params.toString()}`),
        fetch(`/api/vision/attendance/logs?${params.toString()}`)
      ]);

      if (employeeStatsRes.ok) {
        const data = await employeeStatsRes.json();
        setEmployeeStats(data);
      }

      if (attendanceSummaryRes.ok) {
        const data = await attendanceSummaryRes.json();
        setAttendanceSummary(data);
      }

      if (attendanceLogsRes.ok) {
        const data = await attendanceLogsRes.json();
        setRecentLogs(data.logs || data);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const exportData = () => {
    const csvContent = [
      ['Date Range', `Last ${dateRange} days`],
      [''],
      ['Employee Statistics'],
      ['Total Employees', employeeStats?.total || 0],
      ['Active Employees', employeeStats?.active || 0],
      ['Inactive Employees', employeeStats?.inactive || 0],
      [''],
      ['Attendance Summary'],
      ['Total Logs', attendanceSummary?.totalLogs || 0],
      ['Unique Employees', attendanceSummary?.uniqueEmployees || 0],
      ['Average Confidence', `${(attendanceSummary?.averageConfidence || 0).toFixed(2)}%`],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Insights and trends for Vision & Safety module</p>
            </div>
            <div className="flex gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <button
                onClick={exportData}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Employees</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{employeeStats?.total || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{employeeStats?.active || 0} active</p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Attendance Logs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{attendanceSummary?.totalLogs || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Last {dateRange} days</p>
                </div>
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unique Employees</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{attendanceSummary?.uniqueEmployees || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Detected in period</p>
                </div>
                <TrendingUp className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {(attendanceSummary?.averageConfidence || 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Recognition accuracy</p>
                </div>
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Employees by Department</h2>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : employeeStats && employeeStats.byDepartment.length > 0 ? (
                <div className="space-y-3">
                  {employeeStats.byDepartment.map((dept) => {
                    const percentage = ((dept.count / employeeStats.total) * 100).toFixed(1);
                    return (
                      <div key={dept.department} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-900">{dept.department}</span>
                          <span className="text-gray-600">{dept.count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  No department data available
                </div>
              )}
            </div>

            {/* Attendance by Department */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance by Department</h2>
              <p className="text-sm text-gray-600 mb-4">Last {dateRange} days activity</p>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : attendanceSummary && attendanceSummary.byDepartment && attendanceSummary.byDepartment.length > 0 ? (
                <div className="space-y-3">
                  {attendanceSummary.byDepartment.map((dept) => {
                    const total = attendanceSummary.totalLogs;
                    const percentage = total > 0 ? ((dept.count / total) * 100).toFixed(1) : '0';
                    return (
                      <div key={dept.department} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-900">{dept.department}</span>
                          <span className="text-gray-600">{dept.count} logs ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  No attendance data available
                </div>
              )}
            </div>
          </div>

          {/* Daily Trend */}
          {attendanceSummary && attendanceSummary.byDate && attendanceSummary.byDate.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Attendance Trend</h2>
              <p className="text-sm text-gray-600 mb-4">Attendance logs per day</p>
              <div className="space-y-2">
                {attendanceSummary.byDate.map((day) => {
                  const maxCount = Math.max(...attendanceSummary.byDate.map(d => d.count));
                  const percentage = maxCount > 0 ? ((day.count / maxCount) * 100).toFixed(1) : '0';
                  return (
                    <div key={day.date} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(day.date)}
                      </div>
                      <div className="flex-1">
                        <div className="h-6 bg-gray-200 rounded-md overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all flex items-center justify-end pr-2"
                            style={{ width: `${percentage}%` }}
                          >
                            {parseInt(percentage) > 20 && (
                              <span className="text-xs font-medium text-white">{day.count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {parseInt(percentage) <= 20 && (
                        <div className="w-12 text-sm font-medium text-gray-900">{day.count}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Attendance Logs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance Logs</h2>
            <p className="text-sm text-gray-600 mb-4">Latest employee detections</p>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{log.employee.name}</p>
                        <p className="text-sm text-gray-600">
                          {log.employee.employeeCode} • {log.employee.department}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatDate(log.timestamp)}</p>
                      <p className="text-sm text-gray-600">{formatTime(log.timestamp)}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      log.confidence > 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {log.confidence.toFixed(0)}% conf
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                No attendance logs available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
