import { useEffect, useState } from 'react';
import { Clock, Link as LinkIcon, Calendar, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDateTimePST } from '../lib/dateUtils';
import type { Database } from '../lib/database.types';

type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskListProps {
  refreshTrigger: number;
}

export function TaskList({ refreshTrigger }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowNoteInput = (taskId: string) => {
    setShowNoteInput(taskId);
    setNoteText('');
  };

  const handleCancelNote = () => {
    setShowNoteInput(null);
    setNoteText('');
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setDeletingTaskId(taskId);

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleCompleteTask = async (task: Task, notes?: string) => {
    setCompletingTaskId(task.id);

    try {
      const completedAt = new Date();
      const startedAt = new Date(task.started_at);
      const durationMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60000);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const actualTime = `${hours}h ${minutes}m`;

      const { data: settingsData } = await supabase
        .from('settings')
        .select('default_email')
        .maybeSingle();

      const email = settingsData?.default_email;
      if (!email) {
        alert('No default email set. Please configure in settings.');
        setCompletingTaskId(null);
        return;
      }

      const emailUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
      const emailResponse = await fetch(emailUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.id,
          to: email,
          taskName: task.task_name,
          description: task.description,
          estimatedTime: task.estimated_time,
          actualTime: actualTime,
          taskLink: task.task_link || 'No link provided',
          aiSummary: task.ai_summary || 'Summary not available',
          notes: notes || null,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send email');
      }

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: completedAt.toISOString(),
          actual_time: actualTime,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (updateError) throw updateError;

      setShowNoteInput(null);
      setNoteText('');
      await fetchTasks();
      alert('Task completed and email sent!');
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task. Please try again.');
    } finally {
      setCompletingTaskId(null);
    }
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
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No active tasks. Create a task above to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Tasks</h2>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-2 border-orange-400"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xl font-semibold text-gray-800">{task.task_name}</h3>
            <span className="flex items-center gap-1 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full font-medium">
              <Clock className="w-4 h-4 animate-pulse" />
              In Progress
            </span>
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

            <div className="flex items-center gap-2 text-gray-500 text-xs sm:col-span-2">
              <Calendar className="w-4 h-4" />
              <span>Created: {formatDateTimePST(task.created_at)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {showNoteInput === task.id ? (
              <div className="flex-1 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Note (optional)
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Any additional notes about this task completion..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCompleteTask(task, noteText)}
                    disabled={completingTaskId === task.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {completingTaskId === task.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Complete Task
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelNote}
                    disabled={completingTaskId === task.id}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleShowNoteInput(task.id)}
                disabled={completingTaskId === task.id}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5" />
                Complete Task
              </button>
            )}
            <button
              onClick={() => handleDeleteTask(task.id)}
              disabled={deletingTaskId === task.id || completingTaskId === task.id}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete task"
            >
              {deletingTaskId === task.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
