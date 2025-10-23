import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

interface ActivityTrackerOptions {
  idleTimeoutMs?: number; // Time until considered idle (default: 5 minutes)
  promptTimeoutMs?: number; // Time to show prompt before auto-pause (default: 1 minute)
  onIdle?: () => void; // Callback when user becomes idle
  onActive?: () => void; // Callback when user becomes active
  onPromptTimeout?: () => void; // Callback when prompt times out
  enabled?: boolean; // Whether tracking is enabled
}

interface ActivityTrackerState {
  isIdle: boolean;
  showPrompt: boolean;
  lastActivityTime: Date | null;
  promptStartTime: Date | null;
}

/**
 * Custom hook for tracking user activity and detecting inactivity
 * 
 * Features:
 * - Tracks mouse movement, keyboard input, clicks, touch events
 * - Detects when user switches tabs (Page Visibility API)
 * - Shows prompt after idle timeout
 * - Auto-pauses after prompt timeout
 * - Logs activity to console for debugging
 */
export function useActivityTracker(options: ActivityTrackerOptions = {}) {
  const {
    idleTimeoutMs = 5 * 60 * 1000, // 5 minutes default
    promptTimeoutMs = 60 * 1000, // 1 minute default
    onIdle,
    onActive,
    onPromptTimeout,
    enabled = true,
  } = options;

  const [state, setState] = useState<ActivityTrackerState>({
    isIdle: false,
    showPrompt: false,
    lastActivityTime: null,
    promptStartTime: null,
  });

  // Refs for stable references
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());
  const isInitializedRef = useRef(false);

  // Stable callback refs
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  const onPromptTimeoutRef = useRef(onPromptTimeout);

  // Update callback refs when they change
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    onActiveRef.current = onActive;
  }, [onActive]);

  useEffect(() => {
    onPromptTimeoutRef.current = onPromptTimeout;
  }, [onPromptTimeout]);

  // Debug: Log when enabled state changes
  useEffect(() => {
    console.log('🔧 Activity tracker enabled:', enabled);
  }, [enabled]);

  // Log activity to database
  const logActivity = useCallback(async (eventType: string, data: any = {}) => {
    try {
      console.log('📊 Logging activity:', eventType, data);
      await apiClient.logActivity({
        eventType,
        ...data,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, []);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
  }, []);

  // Reset activity timer - stable function
  const resetActivityTimer = useCallback(() => {
    if (!enabled) return;

    const now = new Date();
    lastActivityRef.current = now;

    // Clear existing timers
    clearTimers();

    // Update state
    setState(prev => {
      // If we were idle or showing prompt, mark as active again
      if (prev.isIdle || prev.showPrompt) {
        console.log('🟢 User is active again');
        logActivity('user_continued', {
          tabVisible: !document.hidden,
        });
        onActiveRef.current?.();
        return {
          isIdle: false,
          showPrompt: false,
          lastActivityTime: now,
          promptStartTime: null,
        };
      } else {
        return {
          ...prev,
          lastActivityTime: now,
        };
      }
    });

    // Set new idle timer
    idleTimerRef.current = setTimeout(() => {
      console.log('⏸️ User is idle - showing prompt after 30 seconds');
      logActivity('idle_detected', {
        idleDurationSeconds: Math.floor((Date.now() - lastActivityRef.current.getTime()) / 1000),
        tabVisible: !document.hidden,
      });
      setState(prev => ({
        ...prev,
        isIdle: true,
        showPrompt: true,
        promptStartTime: new Date(),
      }));
      onIdleRef.current?.();

      // Set prompt timeout timer
      promptTimerRef.current = setTimeout(() => {
        console.log('⏸️ Prompt timeout - auto-pausing');
        logActivity('auto_paused', {
          idleDurationSeconds: Math.floor((Date.now() - lastActivityRef.current.getTime()) / 1000),
          tabVisible: !document.hidden,
        });
        setState(prev => ({
          ...prev,
          showPrompt: false,
        }));
        onPromptTimeoutRef.current?.();
      }, promptTimeoutMs);
    }, idleTimeoutMs);
  }, [enabled, idleTimeoutMs, promptTimeoutMs, clearTimers]);

  // User confirms they want to continue
  const confirmActivity = useCallback(() => {
    console.log('✅ User confirmed activity');
    resetActivityTimer();
  }, [resetActivityTimer]);

  // User declines or prompt times out - pause tracking
  const pauseTracking = useCallback(() => {
    console.log('⏸️ Pausing tracking');
    clearTimers();
    setState(prev => ({
      ...prev,
      isIdle: true,
      showPrompt: false,
      promptStartTime: null,
    }));
    onPromptTimeoutRef.current?.();
  }, [clearTimers]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Tab hidden - pausing activity tracking');
        clearTimers();
      } else {
        console.log('👁️ Tab visible - resuming activity tracking');
        resetActivityTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, resetActivityTimer, clearTimers]);

  // Track user activity events
  useEffect(() => {
    if (!enabled) return;

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Throttle activity tracking to avoid excessive updates
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledResetTimer = () => {
      if (!throttleTimeout) {
        console.log('🟢 Activity detected - resetting timer');
        resetActivityTimer();
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
        }, 1000); // Throttle to once per second
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledResetTimer, true);
    });

    // Initialize timer only once
    if (!isInitializedRef.current) {
      resetActivityTimer();
      isInitializedRef.current = true;
    }

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledResetTimer, true);
      });
      clearTimers();
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [enabled, resetActivityTimer, clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isIdle: state.isIdle,
    showPrompt: state.showPrompt,
    lastActivityTime: state.lastActivityTime,
    promptStartTime: state.promptStartTime,
    confirmActivity,
    pauseTracking,
  };
}