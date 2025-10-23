import { useState, useEffect } from 'react';
import { Clock, Play, Square, Pause } from 'lucide-react';
import { apiClient } from '../lib/api-client';

export function ClockInOut() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [totalPausedMinutes, setTotalPausedMinutes] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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
      alert(error.message || 'Failed to clock in');
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
      alert(`Clocked out! Duration: ${hours}h ${mins}m`);
    } catch (error: any) {
      console.error('Error clocking out:', error);
      alert(error.message || 'Failed to clock out');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePause = async () => {
    setIsProcessing(true);
    try {
      await apiClient.pauseSession();
      setIsPaused(true);
    } catch (error: any) {
      console.error('Error pausing session:', error);
      alert(error.message || 'Failed to pause session');
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
    } catch (error: any) {
      console.error('Error resuming session:', error);
      alert(error.message || 'Failed to resume session');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className={`rounded-2xl shadow-lg border-2 transition-all ${
      isClockedIn 
        ? 'bg-gradient-to-br from-green-50 to-blue-50 border-green-300' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="p-6">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Status and Time */}
          <div className="flex items-center gap-6 flex-1">
            {/* Icon and Label */}
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl shadow-md ${
                isClockedIn ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gray-100'
              }`}>
                <Clock className={`w-6 h-6 ${isClockedIn ? 'text-white' : 'text-gray-600'}`} />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-800 block">Time Tracking</span>
                <span className="text-xs text-gray-500">
                  {isClockedIn ? 'Session active' : 'Start your work session'}
                </span>
              </div>
            </div>
            
            {/* Timer Display */}
            {isClockedIn && (
              <div className={`flex items-center gap-4 bg-white rounded-xl px-6 py-3 shadow-md border ${
                isPaused ? 'border-yellow-200' : 'border-green-200'
              }`}>
                <div className="text-center">
                  <div className={`text-3xl font-mono font-bold tracking-wider ${
                    isPaused ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {elapsedTime}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">
                    Hours : Minutes : Seconds
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'
                  }`}></div>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${
                    isPaused ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    {isPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Clocked Out Status */}
            {!isClockedIn && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 border border-gray-200">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-sm font-medium text-gray-600">Not Clocked In</span>
              </div>
            )}
            
          </div>

          {/* Right: Action Buttons */}
          {!isClockedIn ? (
            <button
              onClick={handleClockIn}
              disabled={isProcessing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <Play className="w-5 h-5" />
              {isProcessing ? 'Clocking In...' : 'Clock In'}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {/* Pause/Resume Button */}
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Pause className="w-5 h-5" />
                  {isProcessing ? 'Pausing...' : 'Pause'}
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Play className="w-5 h-5" />
                  {isProcessing ? 'Resuming...' : 'Resume'}
                </button>
              )}

              {/* Clock Out Button */}
              <button
                onClick={handleClockOut}
                disabled={isProcessing}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <Square className="w-5 h-5" />
                {isProcessing ? 'Clocking Out...' : 'Clock Out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

