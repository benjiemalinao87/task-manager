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
              <div className="flex items-center gap-4 bg-white rounded-xl px-6 py-3 shadow-md border border-green-200">
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold text-green-600 tracking-wider">
                    {elapsedTime}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 font-medium">
                    Hours : Minutes : Seconds
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Active
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

          {/* Right: Action Button */}
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
            <button
              onClick={handleClockOut}
              disabled={isProcessing}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <Square className="w-5 h-5" />
              {isProcessing ? 'Clocking Out...' : 'Clock Out'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

