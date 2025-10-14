import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, Flame, AlertTriangle, FileText } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { formatDateTimePST } from '../lib/dateUtils';

interface Task {
  id: string;
  user_id: string;
  task_name: string;
  description: string;
  estimated_time: string;
  actual_time?: string;
  task_link?: string;
  ai_summary?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  asana_task_id?: string;
  notes?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface CalendarViewProps {
  refreshTrigger: number;
}

export function CalendarView({ refreshTrigger }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllTasks();
  }, [refreshTrigger]);

  const fetchAllTasks = async () => {
    setIsLoading(true);
    try {
      // Fetch both in_progress and completed tasks
      const [inProgressTasks, completedTasks] = await Promise.all([
        apiClient.getTasks('in_progress'),
        apiClient.getTasks('completed'),
      ]);
      setAllTasks([...inProgressTasks, ...completedTasks]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityConfig = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const configs = {
      low: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        dot: 'bg-gray-400',
        label: 'Low',
        Icon: FileText
      },
      medium: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        dot: 'bg-blue-500',
        label: 'Medium',
        Icon: AlertCircle
      },
      high: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        dot: 'bg-orange-500',
        label: 'High',
        Icon: AlertTriangle
      },
      urgent: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        dot: 'bg-red-500',
        label: 'Urgent',
        Icon: Flame
      }
    };
    return configs[priority];
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getTasksForDate = (dateStr: string) => {
    return allTasks.filter(task => {
      const taskDate = new Date(task.created_at);
      const checkDate = new Date(dateStr);
      return (
        taskDate.getFullYear() === checkDate.getFullYear() &&
        taskDate.getMonth() === checkDate.getMonth() &&
        taskDate.getDate() === checkDate.getDate()
      );
    });
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+)h?\s*(\d+)?m?/);
    if (!match) return 0;
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    return hours * 60 + minutes;
  };

  const formatMinutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const calculateTotalHours = (tasks: Task[]): number => {
    return tasks.reduce((total, task) => {
      if (task.actual_time) {
        return total + parseTimeToMinutes(task.actual_time);
      }
      return total;
    }, 0);
  };

  const getTasksForMonth = () => {
    return allTasks.filter(task => {
      const taskDate = new Date(task.created_at);
      return (
        taskDate.getFullYear() === year &&
        taskDate.getMonth() === month
      );
    });
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const today = new Date();
  const todayStr = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Calculate monthly statistics
  const monthlyTasks = getTasksForMonth();
  const monthlyTotalMinutes = calculateTotalHours(monthlyTasks);
  const monthlyCompletedTasks = monthlyTasks.filter(t => t.status === 'completed').length;
  const monthlyActiveTasks = monthlyTasks.filter(t => t.status === 'in_progress').length;

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const selectedDateTotalMinutes = selectedDate ? calculateTotalHours(selectedTasks) : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-4 border-2 border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 p-1.5 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Task Calendar</h2>
          </div>
          <button
            onClick={goToToday}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg transition-all shadow-sm hover:shadow-md text-sm"
          >
            Today
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={previousMonth}
            className="p-1.5 hover:bg-purple-100 rounded-lg transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h3 className="text-lg font-bold text-gray-800">
            {monthName} {year}
          </h3>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-purple-100 rounded-lg transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Monthly Statistics */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-purple-200">
          <div className="bg-white rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-purple-600">{formatMinutesToTime(monthlyTotalMinutes)}</div>
            <div className="text-[10px] text-gray-600 font-medium">Total Hours</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-600">{monthlyCompletedTasks}</div>
            <div className="text-[10px] text-gray-600 font-medium">Completed</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-orange-600">{monthlyActiveTasks}</div>
            <div className="text-[10px] text-gray-600 font-medium">Active</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-lg p-3 border border-gray-200">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-bold text-gray-600 text-xs py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-12" />;
            }

            const dateKey = formatDateKey(year, month, day);
            const tasksOnDay = getTasksForDate(dateKey);
            const isToday = dateKey === todayStr;
            const isSelected = dateKey === selectedDate;
            const hasActiveTasks = tasksOnDay.some(t => t.status === 'in_progress');
            const hasCompletedTasks = tasksOnDay.some(t => t.status === 'completed');

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`h-12 p-1 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : isToday
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between h-full">
                  <span
                    className={`text-xs font-semibold ${
                      isToday ? 'text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </span>
                  
                  {tasksOnDay.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-gray-600">
                        {tasksOnDay.length}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {hasActiveTasks && (
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Active tasks" />
                        )}
                        {hasCompletedTasks && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Completed tasks" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Tasks */}
      {selectedDate && (
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </h3>
            {selectedDateTotalMinutes > 0 && (
              <div className="bg-blue-600 text-white px-3 py-1 rounded-lg">
                <span className="text-sm font-bold">{formatMinutesToTime(selectedDateTotalMinutes)}</span>
              </div>
            )}
          </div>

          {selectedTasks.length === 0 ? (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No tasks on this date</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map(task => {
                const priorityConfig = getPriorityConfig(task.priority);
                const PriorityIcon = priorityConfig.Icon;
                const isCompleted = task.status === 'completed';
                
                return (
                  <div
                    key={task.id}
                    className={`${
                      isCompleted ? 'bg-green-50 border-green-300' : 'bg-white border-gray-300'
                    } border rounded-lg p-3 hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold text-sm text-gray-800 ${isCompleted ? 'line-through' : ''}`}>
                            {task.task_name}
                          </h4>
                          {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        </div>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                        
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          <span className={`flex items-center gap-1 ${priorityConfig.text} ${priorityConfig.bg} px-1.5 py-0.5 rounded font-semibold border ${priorityConfig.border}`}>
                            <PriorityIcon className="w-2.5 h-2.5" />
                            {priorityConfig.label}
                          </span>
                          
                          <span className="flex items-center gap-1 text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded font-semibold">
                            <Clock className="w-2.5 h-2.5" />
                            {task.estimated_time}
                          </span>
                          
                          {task.actual_time && (
                            <span className="flex items-center gap-1 text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-semibold">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {task.actual_time}
                            </span>
                          )}
                        </div>

                        {task.ai_summary && (
                          <div className="mt-1.5 bg-blue-50 border border-blue-200 rounded p-1.5">
                            <p className="text-[10px] text-blue-800 line-clamp-2">
                              <span className="font-semibold">AI:</span> {task.ai_summary}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-3 border border-gray-200">
        <h4 className="text-xs font-bold text-gray-700 mb-1.5">Legend</h4>
        <div className="flex flex-wrap gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-gray-600">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border-2 border-blue-400 bg-blue-50"></div>
            <span className="text-gray-600">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

