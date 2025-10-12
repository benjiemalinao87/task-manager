import { useState, useEffect } from 'react';
import { Clock, Play, Square } from 'lucide-react';
import { apiClient } from '../lib/api-client';

export function ClockInOut() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    if (isClockedIn && clockInTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - clockInTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isClockedIn, clockInTime]);

  const checkActiveSession = async () => {
    try {
      const { session } = await apiClient.getActiveSession();
      
      if (session) {
        setIsClockedIn(true);
        setSessionId(session.id);
        setClockInTime(new Date(session.clock_in));
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
      setSessionId(null);
      setClockInTime(null);
      setElapsedTime('00:00:00');
      
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

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Status and Time */}
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Time Tracking</span>
          </div>
          
          {isClockedIn && (
            <div className="flex items-center gap-3">
              <div className="text-2xl font-mono font-bold text-blue-600">{elapsedTime}</div>
              <div
                className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
              >
                Clocked In
              </div>
            </div>
          )}
          
          {!isClockedIn && (
            <div
              className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
            >
              Clocked Out
            </div>
          )}
        </div>

        {/* Right: Action Button */}
        {!isClockedIn ? (
          <button
            onClick={handleClockIn}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            <Play className="w-4 h-4" />
            {isProcessing ? 'Clocking In...' : 'Clock In'}
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            disabled={isProcessing}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            <Square className="w-4 h-4" />
            {isProcessing ? 'Clocking Out...' : 'Clock Out'}
          </button>
        )}
      </div>
    </div>
  );
}

