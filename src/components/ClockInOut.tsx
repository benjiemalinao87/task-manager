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
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6" />
          <h3 className="text-xl font-bold">Time Tracking</h3>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isClockedIn
              ? 'bg-green-500 text-white'
              : 'bg-white/20 text-white'
          }`}
        >
          {isClockedIn ? 'Clocked In' : 'Clocked Out'}
        </div>
      </div>

      {isClockedIn && (
        <div className="mb-4 text-center">
          <div className="text-4xl font-mono font-bold mb-1">{elapsedTime}</div>
          <div className="text-blue-200 text-sm">
            Started at {clockInTime?.toLocaleTimeString()}
          </div>
        </div>
      )}

      {!isClockedIn ? (
        <button
          onClick={handleClockIn}
          disabled={isProcessing}
          className="w-full bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Play className="w-5 h-5" />
          {isProcessing ? 'Clocking In...' : 'Clock In'}
        </button>
      ) : (
        <button
          onClick={handleClockOut}
          disabled={isProcessing}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Square className="w-5 h-5" />
          {isProcessing ? 'Clocking Out...' : 'Clock Out'}
        </button>
      )}

      <div className="mt-4 text-blue-100 text-xs text-center">
        {isClockedIn
          ? 'You will receive an email when you clock out'
          : 'Clock in to start tracking your time'}
      </div>
    </div>
  );
}

