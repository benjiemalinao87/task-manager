import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Link as LinkIcon, Calendar, CheckCircle2, AlertCircle, Loader2, Trash2, Maximize2, Minimize2, ExternalLink, Pause, Play, AlertTriangle, Flame, FileText, User } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { formatDateTimePST } from '../lib/dateUtils';
import { StatusSelector } from './StatusSelector';
import { TaskStatus } from '../lib/statusConstants';
import { useToast } from '../context/ToastContext';
import { useConfirmation } from '../hooks/useConfirmation';
import { ConfirmationModal } from './ConfirmationModal';

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
  priority: 'low' | 'medium' | 'high' | 'urgent';
  asana_task_id?: string;
  notes?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  workspace_id?: string;
  assigned_to?: string;
  assigned_by?: string;
  assigned_at?: string;
  assignee_name?: string;
  assignee_email?: string;
  creator_name?: string;
  creator_email?: string;
}

interface TaskListProps {
  refreshTrigger: number;
}

export function TaskList({ refreshTrigger }: TaskListProps) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { confirm, isOpen, options, onConfirm, onCancel } = useConfirmation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [previousTaskCount, setPreviousTaskCount] = useState(0);

  // Pause/resume state management (keyed by task ID)
  const [pauseStates, setPauseStates] = useState<Record<string, {
    isPaused: boolean;
    pausedTime: number;
    pauseStartTime: number | null;
  }>>({});

  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  // Load pause states from localStorage on mount and when tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      const newPauseStates: typeof pauseStates = {};
      tasks.forEach(task => {
        const savedState = localStorage.getItem(`task_pause_${task.id}`);
        if (savedState) {
          newPauseStates[task.id] = JSON.parse(savedState);
        } else {
          newPauseStates[task.id] = {
            isPaused: false,
            pausedTime: 0,
            pauseStartTime: null,
          };
        }
      });
      setPauseStates(newPauseStates);
    }
  }, [tasks]);

  // Separate effect to handle auto-expanding new tasks
  useEffect(() => {
    if (tasks.length > 0 && tasks.length > previousTaskCount) {
      // A new task was added, expand the first task (most recent)
      setExpandedTaskId(tasks[0].id);
      setPreviousTaskCount(tasks.length);
    } else if (tasks.length !== previousTaskCount) {
      // Task count changed (task deleted or completed)
      setPreviousTaskCount(tasks.length);
    }
  }, [tasks.length, previousTaskCount, tasks]);

  // Save pause states to localStorage whenever they change
  useEffect(() => {
    Object.entries(pauseStates).forEach(([taskId, state]) => {
      localStorage.setItem(`task_pause_${taskId}`, JSON.stringify(state));
    });
  }, [pauseStates]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const calculateElapsedTime = (startedAt: string, taskId: string) => {
    const start = new Date(startedAt);
    let diff = currentTime.getTime() - start.getTime();

    const pauseState = pauseStates[taskId];
    if (pauseState) {
      // Subtract the total paused time
      let totalPausedTime = pauseState.pausedTime;

      // If currently paused, add the time since pause started
      if (pauseState.isPaused && pauseState.pauseStartTime) {
        totalPausedTime += currentTime.getTime() - pauseState.pauseStartTime;
      }

      diff -= totalPausedTime;
    }

    // Ensure diff is not negative
    if (diff < 0) diff = 0;

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleTogglePause = (taskId: string) => {
    setPauseStates(prev => {
      const currentState = prev[taskId] || { isPaused: false, pausedTime: 0, pauseStartTime: null };

      if (currentState.isPaused) {
        // Resume: add the paused duration to total paused time
        const pauseDuration = currentState.pauseStartTime
          ? Date.now() - currentState.pauseStartTime
          : 0;
        return {
          ...prev,
          [taskId]: {
            isPaused: false,
            pausedTime: currentState.pausedTime + pauseDuration,
            pauseStartTime: null,
          }
        };
      } else {
        // Pause: record the pause start time
        return {
          ...prev,
          [taskId]: {
            ...currentState,
            isPaused: true,
            pauseStartTime: Date.now(),
          }
        };
      }
    });
  };

  const getPriorityConfig = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const configs = {
      low: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-300',
        label: 'Low',
        Icon: FileText
      },
      medium: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        label: 'Medium',
        Icon: AlertCircle
      },
      high: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-300',
        label: 'High',
        Icon: AlertTriangle
      },
      urgent: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        label: 'Urgent',
        Icon: Flame
      }
    };
    return configs[priority];
  };

  const getAsanaTaskUrl = (asanaTaskId: string) => {
    return `https://app.asana.com/0/0/${asanaTaskId}`;
  };

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getTasks('in_progress');
      setTasks(data);
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

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus | null) => {
    if (!newStatus) return;

    try {
      await apiClient.updateTask(taskId, {
        status: newStatus,
      });

      // Update local task state
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
      showError('Update Failed', 'Failed to update task status. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete Task',
      cancelText: 'Cancel',
      type: 'danger'
    });
    
    if (!confirmed) return;

    setDeletingTaskId(taskId);

    try {
      await apiClient.deleteTask(taskId);

      // Clean up pause state from localStorage
      localStorage.removeItem(`task_pause_${taskId}`);

      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('Delete Failed', 'Failed to delete task. Please try again.');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleCompleteTask = async (task: Task, notes?: string) => {
    setCompletingTaskId(task.id);

    try {
      const completedAt = new Date();
      const startedAt = new Date(task.started_at);

      // Calculate actual duration excluding paused time
      let totalDuration = completedAt.getTime() - startedAt.getTime();
      const pauseState = pauseStates[task.id];

      if (pauseState) {
        let totalPausedTime = pauseState.pausedTime;

        // If currently paused when completing, add the current pause duration
        if (pauseState.isPaused && pauseState.pauseStartTime) {
          totalPausedTime += completedAt.getTime() - pauseState.pauseStartTime;
        }

        // Subtract paused time from total duration
        totalDuration -= totalPausedTime;
      }

      // Ensure duration is not negative
      if (totalDuration < 0) totalDuration = 0;

      const durationMinutes = Math.round(totalDuration / 60000);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const actualTime = `${hours}h ${minutes}m`;

      await apiClient.updateTask(task.id, {
        status: 'completed',
        notes: notes || undefined,
        actualTime,
      });

      // Clean up pause state from localStorage
      localStorage.removeItem(`task_pause_${task.id}`);

      setShowNoteInput(null);
      setNoteText('');
      await fetchTasks();
      showSuccess('Task Completed!', 'Great job! Your task has been completed successfully.');
    } catch (error) {
      console.error('Error completing task:', error);
      showError('Completion Failed', 'Failed to complete task. Please try again.');
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
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg p-12 text-center border-2 border-blue-200">
        <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-10 h-10 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">No Active Tasks</h3>
        <p className="text-gray-600 text-lg">Create a task above to get started!</p>
        <p className="text-sm text-gray-500 mt-3">Tasks you create will appear here with live timers</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        <h2 className="text-2xl font-bold text-gray-800 px-4">Active Tasks</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      </div>
      
      {tasks.map((task) => {
        const isExpanded = expandedTaskId === task.id;
        
        return (
          <div
            key={task.id}
            className={`bg-gradient-to-br from-white to-orange-50 rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-orange-300 ${
              isExpanded ? 'p-8' : 'p-6'
            }`}
          >
            {/* Compact View - Always Visible */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex-1">
                <h3 className={`font-bold text-gray-800 ${isExpanded ? 'text-2xl mb-2' : 'text-xl'}`}>
                  {task.task_name}
                </h3>
                {!isExpanded && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-mono font-bold">{calculateElapsedTime(task.started_at, task.id)}</span>
                    </div>
                    {task.assigned_to && task.assignee_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">•</span>
                        <User className="w-4 h-4" />
                        <span className="font-medium">{task.assignee_name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Priority Badge */}
                {task.priority && (() => {
                  const config = getPriorityConfig(task.priority);
                  const Icon = config.Icon;
                  return (
                    <span className={`flex items-center gap-2 text-sm ${config.text} ${config.bg} px-3 py-2 rounded-xl font-bold shadow-sm border ${config.border} whitespace-nowrap`}>
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </span>
                  );
                })()}
                {/* Status Selector */}
                <StatusSelector
                  type="task"
                  value={task.status as TaskStatus}
                  onChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                  allowNoStatus={false}
                  className="w-auto"
                />
                <button
                  type="button"
                  onClick={() => navigate(`/task/${task.id}`)}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-all shadow-sm hover:shadow-md"
                  title="Open in Focus View"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleExpand(task.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all shadow-sm hover:shadow-md"
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded View - Conditional */}
            {isExpanded && (
              <>
                {/* Timer Display */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white rounded-2xl p-8 mb-6 shadow-xl border border-blue-500">
                  <div className="text-center">
                    <p className="text-sm font-bold mb-3 opacity-90 uppercase tracking-wide">
                      {pauseStates[task.id]?.isPaused ? 'Timer Paused' : 'Time Running'}
                    </p>
                    <p className="text-6xl font-bold font-mono tracking-wider mb-2">{calculateElapsedTime(task.started_at, task.id)}</p>
                    <p className="text-xs opacity-75 font-medium mb-5">Hours : Minutes : Seconds</p>

                    {/* Pause/Resume Button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePause(task.id)}
                      className={`${
                        pauseStates[task.id]?.isPaused
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-yellow-500 hover:bg-yellow-600'
                      } text-white font-bold py-2 px-6 rounded-xl transition-all flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105`}
                    >
                      {pauseStates[task.id]?.isPaused ? (
                        <>
                          <Play className="w-4 h-4" />
                          Resume Timer
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause Timer
                        </>
                      )}
                    </button>
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

                    {task.assigned_to && task.assignee_name && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500 font-medium">Assigned To</span>
                          <span className="font-semibold">{task.assignee_name}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-gray-700 sm:col-span-2">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500 font-medium">Created</span>
                        <span className="font-semibold text-sm">{formatDateTimePST(task.created_at)}</span>
                      </div>
                    </div>

                    {task.task_link && (
                      <div className="flex items-center gap-3 text-gray-700 sm:col-span-2">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                          <LinkIcon className="w-4 h-4 text-indigo-600" />
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

                    {task.asana_task_id && (
                      <div className="flex items-center gap-3 text-gray-700 sm:col-span-2">
                        <div className="bg-purple-100 p-2 rounded-lg">
                          <ExternalLink className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs text-gray-500 font-medium mb-1">Asana Task</span>
                          <a
                            href={getAsanaTaskUrl(task.asana_task_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-800 hover:underline font-medium flex items-center gap-1"
                          >
                            <span>View in Asana</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {showNoteInput === task.id ? (
                    <div className="flex-1 space-y-4">
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          📝 Add Completion Note (Optional)
                        </label>
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Any additional notes about this task completion..."
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleCompleteTask(task, noteText)}
                          disabled={completingTaskId === task.id}
                          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.01]"
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
                          className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleShowNoteInput(task.id)}
                      disabled={completingTaskId === task.id}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.01]"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Complete Task
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={deletingTaskId === task.id || completingTaskId === task.id}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    title="Delete task"
                  >
                    {deletingTaskId === task.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isOpen}
        onClose={onCancel || (() => {})}
        onConfirm={onConfirm || (() => {})}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        type={options?.type}
      />
    </div>
  );
}
