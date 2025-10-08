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
import { supabase } from '../lib/supabase';
import { formatDateTimePST } from '../lib/dateUtils';
import type { Database } from '../lib/database.types';

type Task = Database['public']['Tables']['tasks']['Row'];

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
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'in_progress')
        .order('completed_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
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
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-semibold text-gray-800">{task.task_name}</h3>
        <div className="flex items-center gap-2">
          {task.status === 'completed' && (
            <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </span>
          )}
          {task.status === 'cancelled' && (
            <span className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full font-medium">
              <XCircle className="w-4 h-4" />
              Cancelled
            </span>
          )}
        </div>
      </div>

      <p className="text-gray-600 mb-4">{task.description}</p>

      {task.ai_summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-800 mb-1">AI Summary</p>
          <p className="text-sm text-blue-900">{task.ai_summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="font-medium">Estimated:</span>
          <span>{task.estimated_time}</span>
        </div>

        {task.actual_time && (
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-medium">Actual:</span>
            <span>{task.actual_time}</span>
          </div>
        )}

        {task.task_link && (
          <div className="flex items-center gap-2 text-gray-700 sm:col-span-2">
            <LinkIcon className="w-4 h-4 text-gray-500" />
            <a
              href={task.task_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate"
            >
              {task.task_link}
            </a>
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Calendar className="w-4 h-4" />
          <span>Started: {formatDate(task.started_at)}</span>
        </div>

        {task.completed_at && (
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Calendar className="w-4 h-4" />
            <span>Completed: {formatDate(task.completed_at)}</span>
          </div>
        )}
      </div>

      {task.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm font-medium text-yellow-800 mb-1">Completion Note:</p>
          <p className="text-sm text-yellow-900">{task.notes}</p>
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
      <div className="mb-8">
        <div className={`flex items-center gap-2 mb-4 ${colorClass}`}>
          {icon}
          <h2 className="text-2xl font-bold">
            {title}
            <span className="ml-2 text-lg font-normal">({statusTasks.length})</span>
          </h2>
        </div>
        <div className="space-y-4">
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
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Task History</h3>
        <p className="text-gray-600">
          Completed and cancelled tasks will appear here
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
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Completed Tasks Yet</h3>
          <p className="text-gray-600">
            Tasks with status other than "in_progress" will appear here
          </p>
        </div>
      )}
    </div>
  );
}
