import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, Users, TrendingUp, Download, Filter, Loader2, User, CheckCircle } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiClient } from '../lib/api-client';
import { TeamNavigation } from './TeamNavigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Member {
  user_id: string;
  name: string;
  email: string;
}

interface HoursBreakdown {
  user_id: string;
  name: string;
  total_minutes: number;
  session_count: number;
  assigned_tasks: number;
}

interface DetailedSession {
  date: string;
  user_name: string;
  duration_minutes: number;
  task_name?: string;
}

interface HoursReport {
  total_hours: number;
  total_minutes: number;
  breakdown: HoursBreakdown[];
  detailed_log?: DetailedSession[];
}

export function TimeReports() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [report, setReport] = useState<HoursReport | null>(null);

  // Redirect members to main tasks page
  useEffect(() => {
    if (currentWorkspace && currentWorkspace.role === 'member') {
      console.log('Time Reports is only available for owners and admins. Redirecting member to tasks page...');
      navigate('/');
    }
  }, [currentWorkspace, navigate]);

  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [includeDetails, setIncludeDetails] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      loadMembers();
      loadReport();
    }
  }, [currentWorkspace]);

  const loadMembers = async () => {
    if (!currentWorkspace) return;

    try {
      const response = await apiClient.getWorkspaceMembers(currentWorkspace.id);
      setMembers(response.members || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadReport = async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);
    try {
      const filters: any = {
        dateFrom,
        dateTo,
        includeDetails,
      };

      if (selectedUserId !== 'all') {
        filters.userId = selectedUserId;
      }

      const response = await apiClient.getHoursReport(currentWorkspace.id, filters);
      setReport(response);
    } catch (error: any) {
      console.error('Error loading report:', error);
      // Provide specific error messages
      if (error.message?.includes('Permission denied')) {
        alert('Access denied. Time Reports are only available for workspace owners and admins.');
      } else {
        alert(`Failed to load report: ${error.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadReport();
  };

  const formatMinutesToHours = (minutes: number | undefined | null): string => {
    if (!minutes || isNaN(minutes)) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const exportToCSV = () => {
    if (!report) return;

    const rows = [
      ['Member', 'Total Hours', 'Sessions', 'Assigned Tasks'],
      ...report.breakdown.map(item => [
        item.name,
        formatMinutesToHours(item.total_minutes),
        item.session_count.toString(),
        item.assigned_tasks.toString(),
      ]),
      [],
      ['Total', formatMinutesToHours(report.total_minutes), '', ''],
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const canViewAllData = currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'admin';

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white">
        <TeamNavigation />
        <div className="flex items-center justify-center py-20">
          <div className="bg-[#0f1b2e] rounded-2xl shadow-lg p-12 text-center border border-gray-800">
            <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Workspace Selected</h3>
            <p className="text-gray-400">Please select a workspace to view time reports.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <TeamNavigation />

      <div className="px-6 py-8 max-w-[1600px] mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Time Reports</h1>
                <p className="text-purple-100">Track hours worked by team members in {currentWorkspace.name}</p>
              </div>
              {report && (
                <button
                  onClick={exportToCSV}
                  className="bg-white text-purple-600 hover:bg-purple-50 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-[#0f1b2e] rounded-2xl shadow-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Filter className="w-6 h-6 text-white" />
              Filters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* User Filter - Only show for owners/admins */}
              {canViewAllData && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Team Member
                  </label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger className="w-full h-[50px] px-4 border-2 border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-[#1a2332] text-white">
                      <SelectValue placeholder="All members" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="cursor-pointer">
                        All Members
                      </SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id} className="cursor-pointer">
                          {member.name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date From */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-[#1a2332] text-white"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-[#1a2332] text-white"
                />
              </div>

              {/* Apply Button */}
              <div className="flex items-end">
                <button
                  onClick={handleApplyFilters}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Filter className="w-5 h-5" />
                      Apply Filters
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Include Details Toggle */}
            <div className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                id="includeDetails"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 bg-[#1a2332] border-gray-700"
              />
              <label htmlFor="includeDetails" className="text-sm text-gray-300 font-medium">
                Include detailed session log (slower)
              </label>
            </div>
          </div>

          {/* Summary Stats */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">Total Hours</h3>
                </div>
                <p className="text-4xl font-bold">{formatMinutesToHours(report.total_minutes)}</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">Active Members</h3>
                </div>
                <p className="text-4xl font-bold">{report.breakdown.filter(b => b.total_minutes > 0).length}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold">Avg per Member</h3>
                </div>
                <p className="text-4xl font-bold">
                  {report.breakdown.length > 0
                    ? formatMinutesToHours(Math.round(report.total_minutes / report.breakdown.filter(b => b.total_minutes > 0).length))
                    : '0h 0m'}
                </p>
              </div>
            </div>
          )}

          {/* Team Breakdown */}
          {report && report.breakdown.length > 0 && (
            <div className="bg-[#0f1b2e] rounded-2xl shadow-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-white" />
                Team Breakdown
              </h2>
              <div className="space-y-3">
                {report.breakdown
                  .sort((a, b) => b.total_minutes - a.total_minutes)
                  .map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-4 bg-[#1a2332] rounded-xl border border-gray-700 hover:shadow-md hover:border-gray-600 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                          {member.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white">{member.name}</div>
                          <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{member.session_count} sessions</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              <span>{member.assigned_tasks} tasks assigned</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-400">
                          {formatMinutesToHours(member.total_minutes)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {((member.total_minutes / report.total_minutes) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Detailed Session Log */}
          {report && includeDetails && report.detailed_log && report.detailed_log.length > 0 && (
            <div className="bg-[#0f1b2e] rounded-2xl shadow-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-white" />
                Detailed Session Log
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a2332] border-b-2 border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-300">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-300">Member</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-300">Task</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-gray-300">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {report.detailed_log.map((session, index) => (
                      <tr key={index} className="hover:bg-[#1a2332] transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {new Date(session.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-medium">
                          {session.user_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {session.task_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-semibold text-right">
                          {formatMinutesToHours(session.duration_minutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {report && report.breakdown.length === 0 && (
            <div className="bg-[#0f1b2e] rounded-2xl shadow-lg p-12 text-center border border-gray-700">
              <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Data Available</h3>
              <p className="text-gray-400">
                No time has been logged for the selected filters. Try adjusting your date range or member selection.
              </p>
            </div>
          )}

          {/* Permission Notice */}
          {!canViewAllData && (
            <div className="bg-blue-900/20 border-2 border-blue-500/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <User className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-blue-300 mb-1">Limited Access</h3>
                  <p className="text-sm text-blue-200">
                    You can only view your own time data. Contact your workspace owner or admin to view team-wide reports.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
