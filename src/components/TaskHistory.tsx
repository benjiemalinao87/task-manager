import { useEffect, useState } from 'react';
import {
  Clock,
  Link as LinkIcon,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History
} from 'lucide-react';
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
  status: string;
  asana_task_id?: string;
  notes?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface TaskHistoryProps {
  refreshTrigger: number;
}

export function TaskHistory({ refreshTrigger }: TaskHistoryProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistoricalTasks();
  }, [refreshTrigger]);

  const fetchHistoricalTasks = async () => {
    setIsLoading(true);
    try {
      // Fetch both completed and cancelled tasks
      const [completed, cancelled] = await Promise.all([
        apiClient.getTasks('completed'),
        apiClient.getTasks('cancelled')
      ]);
      setTasks([...completed, ...cancelled]);
    } catch (error) {
      console.error('Error fetching historical tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const formatDate = (dateString: string | null) => {
    return formatDateTimePST(dateString);
  };

  const renderTaskCard = (task: Task) => (
    <div
      key={task.id}
      className={`rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border-2 ${
        task.status === 'completed' 
          ? 'bg-gradient-to-br from-white to-green-50 border-green-300' 
          : 'bg-gradient-to-br from-white to-red-50 border-red-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <h3 className="text-2xl font-bold text-gray-800 flex-1">{task.task_name}</h3>
        <div className="flex items-center gap-2">
          {task.status === 'completed' && (
            <span className="flex items-center gap-2 text-sm text-green-700 bg-green-100 px-4 py-2 rounded-xl font-bold shadow-sm border border-green-200">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </span>
          )}
          {task.status === 'cancelled' && (
            <span className="flex items-center gap-2 text-sm text-red-700 bg-red-100 px-4 py-2 rounded-xl font-bold shadow-sm border border-red-200">
              <XCircle className="w-4 h-4" />
              Cancelled
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-gray-700 leading-relaxed">{task.description}</p>
      </div>

      {/* AI Summary */}
      {task.ai_summary && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
          <p className="text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide">✨ AI Summary</p>
          <p className="text-sm text-blue-800 leading-relaxed">{task.ai_summary}</p>
        </div>
      )}

      {/* Task Metadata */}
      <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 text-gray-700">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-medium">Estimated Time</span>
              <span className="font-semibold">{task.estimated_time}</span>
            </div>
          </div>

          {task.actual_time && (
            <div className="flex items-center gap-3 text-gray-700">
              <div className="bg-green-100 p-2 rounded-lg">
                <Clock className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <span className="block text-xs text-gray-500 font-medium">Actual Time</span>
                <span className="font-semibold">{task.actual_time}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-gray-700">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <span className="block text-xs text-gray-500 font-medium">Started</span>
              <span className="font-semibold text-sm">{formatDate(task.started_at)}</span>
            </div>
          </div>

          {task.completed_at && (
            <div className="flex items-center gap-3 text-gray-700">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <span className="block text-xs text-gray-500 font-medium">Completed</span>
                <span className="font-semibold text-sm">{formatDate(task.completed_at)}</span>
              </div>
            </div>
          )}

          {task.task_link && (
            <div className="flex items-center gap-3 text-gray-700 sm:col-span-2">
              <div className="bg-cyan-100 p-2 rounded-lg">
                <LinkIcon className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-xs text-gray-500 font-medium mb-1">Task Link</span>
                <a
                  href={task.task_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline truncate block font-medium"
                >
                  {task.task_link}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completion Notes */}
      {task.notes && (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-bold text-yellow-900 mb-2 uppercase tracking-wide">📝 Completion Note</p>
          <p className="text-sm text-yellow-900 leading-relaxed">{task.notes}</p>
        </div>
      )}
    </div>
  );

  const renderStatusSection = (status: string, title: string, icon: React.ReactNode, colorClass: string) => {
    const statusTasks = getTasksByStatus(status);

    if (statusTasks.length === 0) {
      return null;
    }

    return (
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          <div className={`flex items-center gap-3 ${colorClass}`}>
            <div className={`p-2 rounded-xl ${
              status === 'completed' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {icon}
            </div>
            <h2 className="text-2xl font-bold">
              {title}
              <span className="ml-2 text-lg font-normal text-gray-500">({statusTasks.length})</span>
            </h2>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>
        <div className="space-y-6">
          {statusTasks.map(renderTaskCard)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-16 text-center border-2 border-gray-200">
        <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <History className="w-12 h-12 text-gray-500" />
        </div>
        <h3 className="text-3xl font-bold text-gray-800 mb-3">No Task History Yet</h3>
        <p className="text-gray-600 text-lg mb-2">
          Completed and cancelled tasks will appear here
        </p>
        <p className="text-sm text-gray-500">
          Start completing tasks to build your work history
        </p>
      </div>
    );
  }

  return (
    <div>
      {renderStatusSection(
        'completed',
        'Completed Tasks',
        <CheckCircle2 className="w-8 h-8" />,
        'text-green-600'
      )}

      {renderStatusSection(
        'cancelled',
        'Cancelled Tasks',
        <XCircle className="w-8 h-8" />,
        'text-red-600'
      )}

      {getTasksByStatus('completed').length === 0 && getTasksByStatus('cancelled').length === 0 && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-16 text-center border-2 border-gray-200">
          <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-gray-500" />
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-3">No Completed Tasks Yet</h3>
          <p className="text-gray-600 text-lg">
            Tasks with status other than "in_progress" will appear here
          </p>
        </div>
      )}
    </div>
  );
}
