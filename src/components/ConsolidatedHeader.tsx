import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { CheckSquare, Play, Square, Pause, Settings, LogOut, BarChart3, Download, ChevronDown, Lightbulb } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useToast } from '../context/ToastContext';
import { useTaskTimer } from '../context/TaskTimerContext';
import { useInactivityBanner } from '../context/InactivityBannerContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useActivityTracker } from '../hooks/useActivityTracker';
import { ActivityPrompt } from './ActivityPrompt';
import { InactivityBanner } from './InactivityBanner';
import { FeatureRequestModal } from './FeatureRequestModal';

type ShiftAction = 'clockIn' | 'clockOut' | 'pause' | 'resume';

function formatElapsed(ms: number): string {
  const safe = Math.max(0, ms);
  const hours = Math.floor(safe / 3600000);
  const minutes = Math.floor((safe % 3600000) / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface ConsolidatedHeaderProps {
  user: any;
  onSettings: () => void;
  onLogout: () => void;
  onTeamDashboard?: () => void;
  onAsanaImport?: () => void;
  canViewTeamFeatures?: boolean;
  hasAsanaIntegration?: boolean;
  sendActivityHeartbeat?: (tabId: string) => void;
  onActivityBroadcast?: (callback: (data: { fromTabId: string; timestamp: number }) => void) => void;
}

export function ConsolidatedHeader({ 
  user, 
  onSettings, 
  onLogout, 
  onTeamDashboard, 
  onAsanaImport,
  canViewTeamFeatures = false,
  hasAsanaIntegration = false,
  sendActivityHeartbeat,
  onActivityBroadcast
}: ConsolidatedHeaderProps) {
  const { showSuccess, showError } = useToast();
  const { pauseAllTasks, resumeAllTasks, pauseUserTasks, resumeUserTasks, isAnyTaskRunning } = useTaskTimer();
  const { bannerState, showBanner, dismissBanner } = useInactivityBanner();
  const { currentWorkspace } = useWorkspace();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [totalPausedMinutes, setTotalPausedMinutes] = useState(0);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [pendingAction, setPendingAction] = useState<ShiftAction | null>(null);
  const isProcessing = pendingAction !== null;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFeatureRequest, setShowFeatureRequest] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;

    // While paused the clock holds at the moment the pause started
    const tick = () => {
      const end = isPaused && pausedAt ? pausedAt.getTime() : Date.now();
      setElapsedTime(formatElapsed(end - clockInTime.getTime() - totalPausedMinutes * 60000));
    };

    tick();
    if (isPaused) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime, isPaused, pausedAt, totalPausedMinutes]);

  // Close the account menu on an outside click or Escape
  useEffect(() => {
    if (!showUserMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu]);

  const checkActiveSession = async () => {
    try {
      const { session } = await apiClient.getActiveSession();
      
      if (session) {
        setIsClockedIn(true);
        setSessionId(session.id);
        setClockInTime(new Date(session.clock_in));
        setIsPaused(session.is_paused === 1);
        setPausedAt(session.is_paused === 1 && session.paused_at ? new Date(session.paused_at) : null);
        setTotalPausedMinutes(session.total_paused_minutes || 0);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  const handleClockIn = async () => {
    setPendingAction('clockIn');
    try {
      const { session } = await apiClient.clockIn();
      
      setSessionId(session.id);
      setClockInTime(new Date(session.clock_in));
      setIsClockedIn(true);
    } catch (error: any) {
      console.error('Error clocking in:', error);
      showError('Clock In Failed', error.message || 'Failed to clock in. Please try again.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleClockOut = async () => {
    setPendingAction('clockOut');
    try {
      const { durationMinutes } = await apiClient.clockOut();
      
      setIsClockedIn(false);
      setIsPaused(false);
      setPausedAt(null);
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
      setPendingAction(null);
    }
  };

  const handlePause = async () => {
    setPendingAction('pause');
    try {
      await apiClient.pauseSession();
      setPausedAt(new Date());
      setIsPaused(true);
      showSuccess('Session Paused', 'Your work session has been paused.');
    } catch (error: any) {
      console.error('Error pausing session:', error);
      showError('Pause Failed', error.message || 'Failed to pause session. Please try again.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleResume = async () => {
    setPendingAction('resume');
    try {
      const { pausedMinutes } = await apiClient.resumeSession();
      setIsPaused(false);
      setPausedAt(null);
      setTotalPausedMinutes(prev => prev + pausedMinutes);
      showSuccess('Session Resumed', 'Your work session has been resumed.');
    } catch (error: any) {
      console.error('Error resuming session:', error);
      showError('Resume Failed', error.message || 'Failed to resume session. Please try again.');
    } finally {
      setPendingAction(null);
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

  // Activity tracking - auto-pause on inactivity with cross-tab support
  const {
    showPrompt,
    confirmActivity,
    pauseTracking,
  } = useActivityTracker({
    idleTimeoutMs: 10 * 60 * 1000, // 10 minutes idle timeout
    promptTimeoutMs: 60 * 1000, // 1 minute prompt timeout
    enabled: isClockedIn && !isPaused, // Only track when clocked in and not paused
    onIdle,
    onActive,
    onPromptTimeout,
    sendActivityHeartbeat, // Send heartbeats to other tabs via WebSocket
    onActivityBroadcast, // Receive activity broadcasts from other tabs
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

  const displayName = user?.name || user?.email || 'Account';
  const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();
  const shiftState = !isClockedIn ? 'off' : isPaused ? 'paused' : 'active';

  const menuItemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900';

  const runFromMenu = (action?: () => void) => {
    setShowUserMenu(false);
    action?.();
  };

  return (
    <>
      <header className="sticky top-3 z-30 mb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-2xl bg-white/95 px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_28px_-16px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.06] backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-4">
          {/* Brand and workspace */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5 md:flex-none">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(37,99,235,0.4)]">
              <CheckSquare className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-[17px] font-semibold tracking-tight text-slate-900">Workoto</div>
              {currentWorkspace?.name && (
                <div className="max-w-[180px] truncate text-xs text-slate-500" title={currentWorkspace.name}>
                  {currentWorkspace.name}
                </div>
              )}
            </div>
          </div>

          {/* Shift clock */}
          <div className="order-last flex w-full justify-center md:order-none md:w-auto md:flex-1">
            <div
              className={`flex w-full items-center justify-between gap-3 rounded-full py-1 pl-4 pr-1 ring-1 ring-inset transition-colors md:w-auto md:justify-start ${
                shiftState === 'active'
                  ? 'bg-emerald-50/70 ring-emerald-200'
                  : shiftState === 'paused'
                    ? 'bg-amber-50 ring-amber-200'
                    : 'bg-slate-50 ring-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5" role="status" aria-live="off">
                {shiftState === 'active' ? (
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                ) : (
                  <span
                    className={`h-2 w-2 rounded-full ${shiftState === 'paused' ? 'bg-amber-500' : 'bg-slate-300'}`}
                    aria-hidden="true"
                  />
                )}
                {isClockedIn ? (
                  <>
                    <span className="text-[15px] font-semibold tabular-nums tracking-tight text-slate-900">
                      {elapsedTime}
                    </span>
                    <span className={`sr-only whitespace-nowrap text-xs font-medium sm:not-sr-only ${isPaused ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {isPaused ? 'Paused' : 'On the clock'}
                    </span>
                  </>
                ) : (
                  <span className="whitespace-nowrap text-sm font-medium text-slate-600">Off the clock</span>
                )}
              </div>

              {!isClockedIn ? (
                <button
                  onClick={handleClockIn}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  {pendingAction === 'clockIn' ? 'Starting...' : 'Clock In'}
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  {!isPaused ? (
                    <button
                      onClick={handlePause}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
                    >
                      <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      {pendingAction === 'pause' ? 'Pausing...' : 'Pause'}
                    </button>
                  ) : (
                    <button
                      onClick={handleResume}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      {pendingAction === 'resume' ? 'Resuming...' : 'Resume'}
                    </button>
                  )}
                  <button
                    onClick={handleClockOut}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60"
                  >
                    <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                    {pendingAction === 'clockOut' ? 'Stopping...' : 'Clock Out'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Shortcuts and account */}
          <div className="flex flex-shrink-0 items-center gap-0.5">
            <div className="hidden items-center gap-0.5 sm:flex">
              <HeaderIconButton label="Request a Feature" onClick={() => setShowFeatureRequest(true)}>
                <Lightbulb className="h-[18px] w-[18px]" aria-hidden="true" />
              </HeaderIconButton>
              {canViewTeamFeatures && (
                <HeaderIconButton label="Team Dashboard" onClick={onTeamDashboard}>
                  <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />
                </HeaderIconButton>
              )}
              {hasAsanaIntegration && (
                <HeaderIconButton label="Import from Asana" onClick={onAsanaImport}>
                  <Download className="h-[18px] w-[18px]" aria-hidden="true" />
                </HeaderIconButton>
              )}
              <span className="mx-1.5 h-5 w-px bg-slate-200" aria-hidden="true" />
            </div>

            <div className="relative" ref={menuRef}>
              <button
                ref={menuButtonRef}
                onClick={() => setShowUserMenu((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
                aria-label={`Account menu for ${displayName}`}
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  showUserMenu ? 'bg-slate-100' : 'hover:bg-slate-100'
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {initial}
                </span>
                <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 lg:block">
                  {displayName}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {showUserMenu && (
                <div
                  role="menu"
                  aria-label="Account"
                  className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl bg-white p-1.5 shadow-[0_4px_6px_-2px_rgba(15,23,42,0.05),0_16px_40px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-2.5 pb-2 pt-1.5">
                    <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
                    {user?.name && user?.email && (
                      <div className="truncate text-xs text-slate-500">{user.email}</div>
                    )}
                  </div>
                  <div className="my-1 h-px bg-slate-100" />
                  <button role="menuitem" onClick={() => runFromMenu(onSettings)} className={menuItemClass}>
                    <Settings className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    Settings
                  </button>
                  {canViewTeamFeatures && (
                    <button role="menuitem" onClick={() => runFromMenu(onTeamDashboard)} className={menuItemClass}>
                      <BarChart3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      Team Dashboard
                    </button>
                  )}
                  {hasAsanaIntegration && (
                    <button role="menuitem" onClick={() => runFromMenu(onAsanaImport)} className={menuItemClass}>
                      <Download className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      Import from Asana
                    </button>
                  )}
                  <button
                    role="menuitem"
                    onClick={() => runFromMenu(() => setShowFeatureRequest(true))}
                    className={menuItemClass}
                  >
                    <Lightbulb className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    Request a Feature
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  <button role="menuitem" onClick={() => runFromMenu(onLogout)} className={menuItemClass}>
                    <LogOut className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showFeatureRequest && (
        <FeatureRequestModal userEmail={user?.email} onClose={() => setShowFeatureRequest(false)} />
      )}

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
    </>
  );
}

function HeaderIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity delay-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </button>
  );
}
