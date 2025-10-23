import { useState, useEffect, useCallback } from 'react';
import { CheckSquare, Clock, Play, Square, Pause, Settings, LogOut, BarChart3, Download, MoreHorizontal } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useToast } from '../context/ToastContext';
import { useTaskTimer } from '../context/TaskTimerContext';
import { useInactivityBanner } from '../context/InactivityBannerContext';
import { useActivityTracker } from '../hooks/useActivityTracker';
import { ActivityPrompt } from './ActivityPrompt';
import { InactivityBanner } from './InactivityBanner';

interface ConsolidatedHeaderProps {
  user: any;
  onSettings: () => void;
  onLogout: () => void;
  onTeamDashboard?: () => void;
  onAsanaImport?: () => void;
  canViewTeamFeatures?: boolean;
  hasAsanaIntegration?: boolean;
}

export function ConsolidatedHeader({ 
  user, 
  onSettings, 
  onLogout, 
  onTeamDashboard, 
  onAsanaImport,
  canViewTeamFeatures = false,
  hasAsanaIntegration = false 
}: ConsolidatedHeaderProps) {
  const { showSuccess, showError } = useToast();
  const { pauseAllTasks, resumeAllTasks, pauseUserTasks, resumeUserTasks, isAnyTaskRunning } = useTaskTimer();
  const { bannerState, showBanner, dismissBanner } = useInactivityBanner();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [totalPausedMinutes, setTotalPausedMinutes] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    if (isClockedIn && clockInTime && !isPaused) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - clockInTime.getTime();
        // Subtract paused time from elapsed time
        const activeTime = diff - (totalPausedMinutes * 60000);
        const hours = Math.floor(activeTime / 3600000);
        const minutes = Math.floor((activeTime % 3600000) / 60000);
        const seconds = Math.floor((activeTime % 60000) / 1000);
        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isClockedIn, clockInTime, isPaused, totalPausedMinutes]);

  const checkActiveSession = async () => {
    try {
      const { session } = await apiClient.getActiveSession();
      
      if (session) {
        setIsClockedIn(true);
        setSessionId(session.id);
        setClockInTime(new Date(session.clock_in));
        setIsPaused(session.is_paused === 1);
        setTotalPausedMinutes(session.total_paused_minutes || 0);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  const handleClockIn = async () => {
    setIsProcessing(true);
    try {
      const { session } = await apiClient.clockIn();
      
      setSessionId(session.id);
      setClockInTime(new Date(session.clock_in));
      setIsClockedIn(true);
    } catch (error: any) {
      console.error('Error clocking in:', error);
      showError('Clock In Failed', error.message || 'Failed to clock in. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    setIsProcessing(true);
    try {
      const { durationMinutes } = await apiClient.clockOut();
      
      setIsClockedIn(false);
      setIsPaused(false);
      setSessionId(null);
      setClockInTime(null);
      setElapsedTime('00:00:00');
      setTotalPausedMinutes(0);
      
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      showSuccess('Clocked Out!', `Great work! Duration: ${hours}h ${mins}m`);
    } catch (error: any) {
      console.error('Error clocking out:', error);
      showError('Clock Out Failed', error.message || 'Failed to clock out. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePause = async () => {
    setIsProcessing(true);
    try {
      await apiClient.pauseSession();
      setIsPaused(true);
      showSuccess('Session Paused', 'Your work session has been paused.');
    } catch (error: any) {
      console.error('Error pausing session:', error);
      showError('Pause Failed', error.message || 'Failed to pause session. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResume = async () => {
    setIsProcessing(true);
    try {
      const { pausedMinutes } = await apiClient.resumeSession();
      setIsPaused(false);
      setTotalPausedMinutes(prev => prev + pausedMinutes);
      showSuccess('Session Resumed', 'Your work session has been resumed.');
    } catch (error: any) {
      console.error('Error resuming session:', error);
      showError('Resume Failed', error.message || 'Failed to resume session. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Memoized callbacks for activity tracking to prevent infinite loops
  const onIdle = useCallback(() => {
    console.log('⏸️ User idle detected - showing prompt');
  }, []);

  const onActive = useCallback(() => {
    console.log('🟢 User active again');
  }, []);

  const onPromptTimeout = useCallback(async () => {
    // Capture states BEFORE any changes
    const wasClockedInBeforePause = isClockedIn && !isPaused;
    const wasTaskRunningBeforePause = isAnyTaskRunning();
    
    let sessionWasPaused = false;
    let tasksWerePaused = false;
    
    // Auto-pause the session
    if (isClockedIn && !isPaused) {
      await handlePause();
      sessionWasPaused = true;
    }
    
    // Pause only the current user's task timers
    if (user?.id) {
      pauseUserTasks(user.id);
      tasksWerePaused = true;
    }
    
    // Log the auto-pause event with captured states
    try {
      await apiClient.logActivity({
        eventType: 'auto_paused',
        wasClockedIn: wasClockedInBeforePause,
        wasTaskTimerRunning: wasTaskRunningBeforePause,
        tabVisible: !document.hidden,
        notes: 'Auto-paused due to inactivity timeout',
      });
    } catch (error) {
      console.error('Failed to log auto-pause activity:', error);
    }
    
    // Show banner if anything was paused
    if (sessionWasPaused || tasksWerePaused) {
      showBanner(sessionWasPaused, tasksWerePaused, 'inactivity');
    }
  }, [isClockedIn, isPaused, handlePause, pauseUserTasks, user, showBanner, isAnyTaskRunning]);

  // Activity tracking - auto-pause on inactivity
  const {
    showPrompt,
    confirmActivity,
    pauseTracking,
  } = useActivityTracker({
    idleTimeoutMs: 2 * 60 * 1000, // 2 minutes idle timeout
    promptTimeoutMs: 60 * 1000, // 1 minute prompt timeout
    enabled: isClockedIn && !isPaused, // Only track when clocked in and not paused
    onIdle,
    onActive,
    onPromptTimeout,
  });

  // Handle activity prompt - user confirms they're still working
  const handleContinueWorking = useCallback(async () => {
    confirmActivity();
    // Resume only the current user's task timers
    if (user?.id) {
      resumeUserTasks(user.id);
    }
    
    // Log the continue working event
    try {
      const wasClockedInState = isClockedIn && !isPaused;
      const wasTaskRunningState = isAnyTaskRunning();
      
      await apiClient.logActivity({
        eventType: 'user_continued',
        wasClockedIn: wasClockedInState,
        wasTaskTimerRunning: wasTaskRunningState,
        tabVisible: !document.hidden,
        notes: 'User chose to continue working',
      });
    } catch (error) {
      console.error('Failed to log continue working activity:', error);
    }
    
    showSuccess('Tracking Continues', 'Your timers are still running.');
  }, [confirmActivity, showSuccess, resumeUserTasks, user, isClockedIn, isPaused, isAnyTaskRunning]);

  // Handle activity prompt - user wants to pause
  const handlePauseFromPrompt = useCallback(async () => {
    pauseTracking();
    if (isClockedIn && !isPaused) {
      await handlePause();
    }
  }, [pauseTracking, isClockedIn, isPaused, handlePause]);

  // Banner handlers
  const handleResumeSession = useCallback(async () => {
    if (isPaused) {
      await handleResume();
    }
  }, [isPaused, handleResume]);

  const handleResumeTasks = useCallback(() => {
    if (user?.id) {
      resumeUserTasks(user.id);
    }
  }, [user, resumeUserTasks]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Workoto</h1>
            </div>
          </div>

          {/* Center: Time Tracking */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isClockedIn ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Clock className={`w-5 h-5 ${isClockedIn ? 'text-green-600' : 'text-gray-500'}`} />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-800">
                  {isClockedIn ? 'Session Active' : 'Time Tracking'}
                </div>
                {isClockedIn && (
                  <div className={`text-xs ${isPaused ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {elapsedTime} • {isPaused ? 'Paused' : 'Active'}
                  </div>
                )}
              </div>
            </div>

            {/* Time Action Buttons */}
            {!isClockedIn ? (
              <button
                onClick={handleClockIn}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isProcessing ? 'Starting...' : 'Clock In'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* Pause/Resume Button */}
                {!isPaused ? (
                  <button
                    onClick={handlePause}
                    disabled={isProcessing}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    {isProcessing ? 'Pausing...' : 'Pause'}
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    disabled={isProcessing}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {isProcessing ? 'Resuming...' : 'Resume'}
                  </button>
                )}
                
                {/* Clock Out Button */}
                <button
                  onClick={handleClockOut}
                  disabled={isProcessing}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  {isProcessing ? 'Stopping...' : 'Clock Out'}
                </button>
              </div>
            )}
          </div>

          {/* Right: User Actions */}
          <div className="flex items-center gap-2">
            {/* Secondary Actions */}
            {canViewTeamFeatures && (
              <button
                onClick={onTeamDashboard}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Team Dashboard"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            )}
            {hasAsanaIntegration && (
              <button
                onClick={onAsanaImport}
                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Import from Asana"
              >
                <Download className="w-5 h-5" />
              </button>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.name || user?.email}
                </span>
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      onSettings();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Prompt Modal */}
      <ActivityPrompt
        show={showPrompt}
        timeoutSeconds={60} // 1 minute prompt timeout
        onContinue={handleContinueWorking}
        onPause={handlePauseFromPrompt}
      />

      {/* Inactivity Banner */}
      <InactivityBanner
        show={bannerState.show}
        sessionPaused={bannerState.sessionPaused}
        tasksPaused={bannerState.tasksPaused}
        onResumeSession={handleResumeSession}
        onResumeTasks={handleResumeTasks}
        onDismiss={dismissBanner}
      />
    </div>
  );
}
