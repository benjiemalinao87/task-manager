import { useState } from 'react';
import { useActivityTracker } from '../hooks/useActivityTracker';
import { ActivityPrompt } from './ActivityPrompt';

/**
 * Test component for activity tracking
 * This can be temporarily added to test the functionality
 */
export function ActivityTest() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const {
    showPrompt,
    confirmActivity,
    pauseTracking,
  } = useActivityTracker({
    idleTimeoutMs: 10 * 1000, // 10 seconds for testing
    promptTimeoutMs: 5 * 1000, // 5 seconds for testing
    enabled: isClockedIn && !isPaused,
    onIdle: () => {
      console.log('⏸️ Test: User idle detected');
    },
    onActive: () => {
      console.log('🟢 Test: User active again');
    },
    onPromptTimeout: () => {
      console.log('⏸️ Test: Auto-pausing due to inactivity');
      setIsPaused(true);
    },
  });

  const handleClockIn = () => {
    setIsClockedIn(true);
    setIsPaused(false);
  };

  const handleClockOut = () => {
    setIsClockedIn(false);
    setIsPaused(false);
  };

  const handleContinueWorking = () => {
    confirmActivity();
    setIsPaused(false);
  };

  const handlePauseFromPrompt = () => {
    pauseTracking();
    setIsPaused(true);
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Activity Tracking Test</h3>
      
      <div className="mb-4">
        <p>Status: {isClockedIn ? (isPaused ? 'Paused' : 'Active') : 'Not Clocked In'}</p>
        <p>Prompt: {showPrompt ? 'Showing' : 'Hidden'}</p>
      </div>

      <div className="flex gap-2 mb-4">
        {!isClockedIn ? (
          <button
            onClick={handleClockIn}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Clock In
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Clock Out
          </button>
        )}
      </div>

      <div className="text-sm text-gray-600">
        <p>• Clock in to start activity tracking</p>
        <p>• Wait 10 seconds without moving mouse/keyboard</p>
        <p>• Prompt should appear with 5-second countdown</p>
        <p>• Check console for activity logs</p>
      </div>

      <ActivityPrompt
        show={showPrompt}
        timeoutSeconds={5}
        onContinue={handleContinueWorking}
        onPause={handlePauseFromPrompt}
      />
    </div>
  );
}
