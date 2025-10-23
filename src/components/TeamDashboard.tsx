import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  AlertCircle,
  BarChart3,
  Target,
  Activity,
  Loader2,
  UserPlus,
  X
} from 'lucide-react';
import { TeamNavigation } from './TeamNavigation';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiClient } from '../lib/api-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TeamMember {
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  total_tasks: number;
  completed_tasks: number;
  active_tasks: number;
  completion_rate: string;
  total_hours: string;
  time_sessions: number;
}

interface TaskStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  cancelled_tasks: number;
  unassigned_tasks: number;
}

interface Task {
  id: string;
  task_name: string;
  status: string;
  priority: string;
  created_at: string;
  assigned_to?: string;
  assignee_name?: string;
  duration_minutes?: number;
}

export function TeamDashboard() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('14d');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Redirect members to main tasks page
  useEffect(() => {
    if (currentWorkspace && currentWorkspace.role === 'member') {
      console.log('Team Dashboard is only available for owners and admins. Redirecting member to tasks page...');
      navigate('/');
    }
  }, [currentWorkspace, navigate]);
  
  // State for data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [totalHours, setTotalHours] = useState(0);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState<any[]>([]);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);

  // Calculate date range
  const getDateRange = (range: string) => {
    if (range === 'custom') {
      return {
        dateFrom: customDateFrom,
        dateTo: customDateTo
      };
    }
    const now = new Date();
    const daysAgo = parseInt(range.replace('d', ''));
    const dateFrom = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0]
    };
  };

  // Fetch all dashboard data
  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { dateFrom, dateTo } = getDateRange(dateRange);

        // Fetch all data in parallel
        const [performanceData, tasksData, hoursData, tasksListData, membersData] = await Promise.all([
          apiClient.getPerformanceReport(currentWorkspace.id, { dateFrom, dateTo }),
          apiClient.getTasksReport(currentWorkspace.id, { dateFrom, dateTo }),
          apiClient.getHoursReport(currentWorkspace.id, { dateFrom, dateTo }),
          apiClient.getTasksWithFilters({ 
            workspaceId: currentWorkspace.id,
            dateFrom,
            dateTo
          }),
          apiClient.getWorkspaceMembers(currentWorkspace.id)
        ]);

        // Process team members data
        setTeamMembers(performanceData.members || []);
        
        // Process workspace members for assignment
        setWorkspaceMembers(membersData.members || []);

        // Process task stats
        setTaskStats(tasksData.stats || null);

        // Process hours data
        setTotalHours(hoursData.total_hours || 0);

        // Process recent tasks (limit to 10 most recent)
        const sortedTasks = (tasksListData || [])
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
        setRecentTasks(sortedTasks);

        // Calculate priority distribution
        const priorityCounts = {
          urgent: 0,
          high: 0,
          medium: 0,
          low: 0
        };

        tasksListData.forEach((task: any) => {
          const priority = (task.priority || 'medium').toLowerCase();
          if (priority in priorityCounts) {
            priorityCounts[priority as keyof typeof priorityCounts]++;
          }
        });

        const total = tasksListData.length || 1;
        setTasksByPriority([
          { 
            label: 'Urgent', 
            count: priorityCounts.urgent, 
            percentage: (priorityCounts.urgent / total * 100).toFixed(1), 
            color: 'bg-red-500' 
          },
          { 
            label: 'High', 
            count: priorityCounts.high, 
            percentage: (priorityCounts.high / total * 100).toFixed(1), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Medium', 
            count: priorityCounts.medium, 
            percentage: (priorityCounts.medium / total * 100).toFixed(1), 
            color: 'bg-blue-500' 
          },
          { 
            label: 'Low', 
            count: priorityCounts.low, 
            percentage: (priorityCounts.low / total * 100).toFixed(1), 
            color: 'bg-green-500' 
          }
        ]);

      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        // Provide specific error messages
        if (err.message?.includes('Permission denied')) {
          setError('Access denied. This dashboard is only available for workspace owners and admins.');
        } else if (err.message?.includes('404')) {
          setError('Dashboard data not found. Please try refreshing the page.');
        } else {
          setError(`Unable to load dashboard: ${err.message || 'Unknown error'}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentWorkspace, dateRange]);

  // Handle custom date range
  const handleApplyCustomDateRange = () => {
    if (!customDateFrom || !customDateTo) {
      alert('Please select both start and end dates');
      return;
    }
    if (new Date(customDateFrom) > new Date(customDateTo)) {
      alert('Start date must be before end date');
      return;
    }
    setDateRange('custom');
    setShowCustomDatePicker(false);
  };

  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setDateRange(value);
    }
  };

  // Handle task assignment
  const handleAssignTask = async (taskId: string, assignedTo: string | null) => {
    try {
      setAssigningTaskId(taskId);
      await apiClient.assignTask(taskId, { assignedTo });
      
      // Refresh the tasks list
      const { dateFrom, dateTo } = getDateRange(dateRange);
      const tasksListData = await apiClient.getTasksWithFilters({ 
        workspaceId: currentWorkspace?.id,
        dateFrom,
        dateTo
      });
      
      const sortedTasks = (tasksListData || [])
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      setRecentTasks(sortedTasks);
      
    } catch (error: any) {
      console.error('Error assigning task:', error);
      alert(error.message || 'Failed to assign task. Please try again.');
    } finally {
      setAssigningTaskId(null);
    }
  };

  // Calculate stats from data
  const stats = {
    totalTasks: taskStats?.total_tasks || 0,
    completedTasks: taskStats?.completed_tasks || 0,
    activeTasks: taskStats?.in_progress_tasks || 0,
    completionRate: taskStats?.total_tasks ? 
      Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100) : 0,
    totalHours: totalHours,
    avgTaskTime: taskStats?.completed_tasks ? 
      (totalHours / taskStats.completed_tasks).toFixed(1) : '0.0',
    teamMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.time_sessions > 0).length
  };

  // Helper function to get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to get avatar color
  const getAvatarColor = (index: number) => {
    const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-cyan-500', 'bg-yellow-500'];
    return colors[index % colors.length];
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Helper function to format duration
  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white">
        <TeamNavigation />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white">
        <TeamNavigation />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white">
        <TeamNavigation />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-400">Please select a workspace</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Top Navigation */}
      <TeamNavigation />

      {/* Main Content */}
      <div className="px-4 md:px-6 py-8 max-w-[1800px] mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Team Performance</h1>
            <p className="text-sm sm:text-base text-gray-400">
              Viewing metrics for {currentWorkspace?.name || 'workspace'}
              {dateRange === 'custom' && customDateFrom && customDateTo && (
                <span className="ml-2 text-blue-400">
                  ({new Date(customDateFrom).toLocaleDateString()} - {new Date(customDateTo).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dateRange === 'custom' && customDateFrom && customDateTo ? (
              <div className="flex items-center gap-2">
                <div className="bg-[#1a2332] border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {new Date(customDateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(customDateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <button
                  onClick={() => setShowCustomDatePicker(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                aria-label="Select date range"
                className="bg-[#1a2332] border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="14d">Last 14 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="custom">Custom Range</option>
              </select>
            )}
          </div>
        </div>

        {/* Metric Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Tasks */}
          <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Tasks</p>
                <p className="text-4xl font-bold text-white">{stats.totalTasks}</p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500">{stats.activeTasks} active, {stats.completedTasks} completed</p>
          </div>

          {/* Completion Rate */}
          <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Completion Rate</p>
                <p className="text-4xl font-bold text-white">{stats.completionRate}%</p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Tasks successfully completed</p>
          </div>

          {/* Total Hours */}
          <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Hours</p>
                <p className="text-4xl font-bold text-white">{stats.totalHours}</p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Hours logged this period</p>
          </div>

          {/* Avg Task Time */}
          <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Avg Handling Time</p>
                <p className="text-4xl font-bold text-white">{stats.avgTaskTime}h</p>
              </div>
              <div className="bg-orange-500/20 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Hours per completed task</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Team Performance Chart */}
          <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Team Members</h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {teamMembers.length > 0 ? (
                teamMembers.map((member, idx) => (
                  <div key={member.user_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`${getAvatarColor(idx)} w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                          {getInitials(member.user_name)}
                      </div>
                      <div>
                          <p className="text-sm font-medium text-white">{member.user_name}</p>
                          <p className="text-xs text-gray-500">{member.total_tasks} tasks • {member.total_hours}h</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-white">{member.completion_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                        className={`${getAvatarColor(idx)} h-2 rounded-full transition-all`}
                        style={{ width: `${Math.min(parseFloat(member.completion_rate), 100)}%` }}
                    />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No team members found</p>
                </div>
              )}
            </div>
          </div>

          {/* Task Priority Distribution */}
          <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Task Priority Distribution</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-center justify-center mb-8">
              <div className="text-center">
                <p className="text-5xl font-bold text-white mb-2">{stats.totalTasks}</p>
                <p className="text-sm text-gray-400">Total</p>
              </div>
            </div>

            <div className="space-y-3">
              {tasksByPriority.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-gray-300">{item.label}</span>
                    <div className="flex-1 mx-3">
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{item.count}</span>
                    <span className="text-sm text-gray-500">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Tasks Table */}
        <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Tasks</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Task</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Assignee</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Duration</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Priority</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-4">
                        <span className="text-sm text-white font-medium">{task.task_name}</span>
                    </td>
                    <td className="py-4">
                        {workspaceMembers.length > 1 && task.status !== 'completed' ? (
                          <Select
                            value={task.assigned_to || '__unassigned__'}
                            onValueChange={(value) => {
                              const assignedTo = value === '__unassigned__' ? null : value;
                              handleAssignTask(task.id, assignedTo);
                            }}
                            disabled={assigningTaskId === task.id}
                          >
                            <SelectTrigger className="w-[180px] h-8 px-3 border border-gray-700 bg-[#1a2332] text-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__unassigned__" className="cursor-pointer text-sm">
                                <div className="flex items-center gap-2">
                                  <UserPlus className="w-3 h-3 text-gray-500" />
                                  <span className="text-gray-400">Unassigned</span>
                                </div>
                              </SelectItem>
                              {workspaceMembers.map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id} className="cursor-pointer text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span>{member.name || member.email}</span>
                                    {member.role === 'owner' && (
                                      <span className="text-xs text-purple-400">(Owner)</span>
                                    )}
                                    {member.role === 'admin' && (
                                      <span className="text-xs text-blue-400">(Admin)</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-blue-400">{task.assignee_name || 'Unassigned'}</span>
                        )}
                    </td>
                    <td className="py-4">
                        <span className="text-sm text-gray-300">{formatDuration(task.duration_minutes)}</span>
                    </td>
                    <td className="py-4">
                      {task.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                        ) : task.status === 'in_progress' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                          <Clock className="w-3 h-3" />
                          In Progress
                        </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
                            <Clock className="w-3 h-3" />
                            {task.status}
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                        task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        task.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                          {task.priority || 'medium'}
                      </span>
                    </td>
                    <td className="py-4">
                        <span className="text-sm text-gray-400">{formatDate(task.created_at)}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No recent tasks found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Active Team Members */}
          <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-cyan-500/20 p-2 rounded-lg">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.activeMembers}/{stats.teamMembers}</p>
                <p className="text-sm text-gray-400">Active team members</p>
              </div>
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">+18%</p>
                <p className="text-sm text-gray-400">Productivity increase</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Compared to last period</p>
          </div>

          {/* Alert/Issues */}
          <div className="bg-[#1a2332] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">2</p>
                <p className="text-sm text-gray-400">Tasks need attention</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Overdue or blocked</p>
          </div>
        </div>
      </div>

      {/* Custom Date Range Modal */}
      {showCustomDatePicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Custom Date Range</h3>
              <button
                onClick={() => setShowCustomDatePicker(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Start Date */}
              <div>
                <label htmlFor="date-from" className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* End Date */}
              <div>
                <label htmlFor="date-to" className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  min={customDateFrom}
                  className="w-full bg-[#0a1628] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCustomDatePicker(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCustomDateRange}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
