import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Link as LinkIcon, Calendar, CheckCircle2, Loader2, Trash2, ArrowLeft, CheckSquare, Pause, Play, AlertCircle, AlertTriangle, Flame, FileText } from 'lucide-react';
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
  priority: 'low' | 'medium' | 'high' | 'urgent';
  asana_task_id?: string;
  notes?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export function TaskDetailView() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0); // Total paused time in milliseconds
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPaused) {
        setCurrentTime(new Date());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Load pause state from localStorage on mount
  useEffect(() => {
    if (taskId) {
      const savedState = localStorage.getItem(`task_pause_${taskId}`);
      if (savedState) {
        const { isPaused: savedIsPaused, pausedTime: savedPausedTime, pauseStartTime: savedPauseStartTime } = JSON.parse(savedState);
        setIsPaused(savedIsPaused);
        setPausedTime(savedPausedTime);
        if (savedIsPaused && savedPauseStartTime) {
          setPauseStartTime(savedPauseStartTime);
        }
      }
    }
  }, [taskId]);

  // Save pause state to localStorage whenever it changes
  useEffect(() => {
    if (taskId) {
      const state = {
        isPaused,
        pausedTime,
        pauseStartTime,
      };
      localStorage.setItem(`task_pause_${taskId}`, JSON.stringify(state));
    }
  }, [taskId, isPaused, pausedTime, pauseStartTime]);

  const calculateElapsedTime = (startedAt: string) => {
    const start = new Date(startedAt);
    let diff = currentTime.getTime() - start.getTime();

    // Subtract the total paused time
    let totalPausedTime = pausedTime;

    // If currently paused, add the time since pause started
    if (isPaused && pauseStartTime) {
      totalPausedTime += currentTime.getTime() - pauseStartTime;
    }

    diff -= totalPausedTime;

    // Ensure diff is not negative
    if (diff < 0) diff = 0;

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleTogglePause = () => {
    if (isPaused) {
      // Resume: add the paused duration to total paused time
      if (pauseStartTime) {
        const pauseDuration = Date.now() - pauseStartTime;
        setPausedTime(prev => prev + pauseDuration);
        setPauseStartTime(null);
      }
      setIsPaused(false);
    } else {
      // Pause: record the pause start time
      setPauseStartTime(Date.now());
      setIsPaused(true);
    }
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

  const fetchTask = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTasks('in_progress');
      const foundTask = data.find((t: Task) => t.id === taskId);
      
      if (foundTask) {
        setTask(foundTask);
      } else {
        setError('Task not found or has been completed');
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      setError('Failed to load task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowNoteInput = () => {
    setShowNoteInput(true);
    setNoteText('');
  };

  const handleCancelNote = () => {
    setShowNoteInput(false);
    setNoteText('');
  };

  const handleDeleteTask = async () => {
    if (!task || !confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setDeletingTaskId(task.id);

    try {
      await apiClient.deleteTask(task.id);

      // Clean up pause state from localStorage
      localStorage.removeItem(`task_pause_${task.id}`);

      alert('Task deleted successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleCompleteTask = async (notes?: string) => {
    if (!task) return;

    setCompletingTaskId(task.id);

    try {
      const completedAt = new Date();
      const startedAt = new Date(task.started_at);

      // Calculate actual duration excluding paused time
      let totalDuration = completedAt.getTime() - startedAt.getTime();
      let totalPausedTime = pausedTime;

      // If currently paused when completing, add the current pause duration
      if (isPaused && pauseStartTime) {
        totalPausedTime += completedAt.getTime() - pauseStartTime;
      }

      // Subtract paused time from total duration
      totalDuration -= totalPausedTime;

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

      setShowNoteInput(false);
      setNoteText('');
      alert('Task completed successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task. Please try again.');
    } finally {
      setCompletingTaskId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Tasks
          </button>
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{error || 'Task Not Found'}</h2>
            <p className="text-gray-600">This task may have been completed or deleted.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 bg-white px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-md">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Workoto</h1>
              <p className="text-[10px] text-gray-500">Focus View</p>
            </div>
          </div>
        </header>

        {/* Task Card */}
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-xl p-4 border-2 border-orange-300">
          {/* Header */}
          <div className="flex items-start justify-between mb-3 gap-3">
            <h2 className="text-2xl font-bold text-gray-800 flex-1">{task.task_name}</h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Priority Badge */}
              {task.priority && (() => {
                const config = getPriorityConfig(task.priority);
                const Icon = config.Icon;
                return (
                  <span className={`flex items-center gap-1 text-xs ${config.text} ${config.bg} px-2 py-1 rounded-lg font-bold shadow-sm border ${config.border}`}>
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </span>
                );
              })()}
              {/* Status Badge */}
              <span className="flex items-center gap-1 text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-lg font-bold shadow-sm border border-orange-200">
                <Clock className="w-3 h-3 animate-pulse" />
                In Progress
              </span>
            </div>
          </div>

          {/* Timer Display */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white rounded-xl p-6 mb-3 shadow-xl border border-blue-500">
            <div className="text-center">
              <p className="text-xs font-bold mb-2 opacity-90 uppercase tracking-wide">
                {isPaused ? '⏸️ Timer Paused' : '⏱️ Time Running'}
              </p>
              <p className="text-5xl font-bold font-mono tracking-wider mb-2">{calculateElapsedTime(task.started_at)}</p>
              <p className="text-[10px] opacity-75 font-medium mb-3">Hours : Minutes : Seconds</p>

              {/* Pause/Resume Button */}
              <button
                type="button"
                onClick={handleTogglePause}
                className={`${
                  isPaused
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                } text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105 text-sm`}
              >
                {isPaused ? (
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
          <div className="mb-3 bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
          </div>

          {/* AI Summary */}
          {task.ai_summary && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-3 shadow-sm">
              <p className="text-[10px] font-bold text-blue-900 mb-1 uppercase tracking-wide">✨ AI SUMMARY</p>
              <p className="text-xs text-blue-800 leading-relaxed">{task.ai_summary}</p>
            </div>
          )}

          {/* Task Metadata */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="bg-blue-100 p-1.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500 font-medium">Estimated Time</span>
                  <span className="font-bold text-sm">{task.estimated_time}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <div className="bg-purple-100 p-1.5 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div>
                  <span className="block text-[10px] text-gray-500 font-medium">Created</span>
                  <span className="font-bold text-[10px]">{formatDateTimePST(task.created_at)}</span>
                </div>
              </div>

              {task.task_link && (
                <div className="col-span-2 flex items-center gap-2 text-gray-700 pt-2 border-t border-gray-200">
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] text-gray-500 font-medium">Task Link</span>
                    <a
                      href={task.task_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline truncate block font-medium text-xs"
                    >
                      {task.task_link}
                    </a>
                  </div>
                </div>
              )}

              {task.asana_task_id && (
                <div className="col-span-2 flex items-center gap-2 text-gray-700 pt-2 border-t border-gray-200">
                  <div className="bg-purple-100 p-1.5 rounded-lg">
                    <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] text-gray-500 font-medium">Asana Task</span>
                    <a
                      href={getAsanaTaskUrl(task.asana_task_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800 hover:underline font-medium text-xs flex items-center gap-1"
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
          <div className="flex gap-2">
            {showNoteInput ? (
              <div className="flex-1 space-y-2">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    📝 Add Completion Note (Optional)
                  </label>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Any additional notes..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all text-sm"
                    rows={3}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCompleteTask(noteText)}
                    disabled={completingTaskId === task.id}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm"
                  >
                    {completingTaskId === task.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Complete
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelNote}
                    disabled={completingTaskId === task.id}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleShowNoteInput}
                disabled={completingTaskId === task.id}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm"
              >
                <CheckCircle2 className="w-5 h-5" />
                Complete Task
              </button>
            )}
            <button
              onClick={handleDeleteTask}
              disabled={deletingTaskId === task.id || completingTaskId === task.id}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              title="Delete task"
            >
              {deletingTaskId === task.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

