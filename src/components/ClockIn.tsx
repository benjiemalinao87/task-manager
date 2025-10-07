import { useState, useEffect } from 'react';
import { Clock, Play, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ClockInProps {
  onClockIn: (sessionId: string) => void;
}

export function ClockIn({ onClockIn }: ClockInProps) {
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
      const { data, error } = await supabase
        .from('time_sessions')
        .select('*')
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsClockedIn(true);
        setSessionId(data.id);
        setClockInTime(new Date(data.clock_in));
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  const handleClockIn = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .from('time_sessions')
        .insert({
          clock_in: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Failed to create session');

      setSessionId(data.id);
      setClockInTime(new Date(data.clock_in));
      setIsClockedIn(true);
      onClockIn(data.id);
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Failed to clock in. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    if (!sessionId || !clockInTime) return;

    setIsProcessing(true);
    try {
      const clockOutTime = new Date();
      const durationMinutes = Math.floor(
        (clockOutTime.getTime() - clockInTime.getTime()) / 60000
      );

      const { error: updateError } = await supabase
        .from('time_sessions')
        .update({
          clock_out: clockOutTime.toISOString(),
          duration_minutes: durationMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      const { data: settingsData } = await supabase
        .from('settings')
        .select('default_email')
        .maybeSingle();

      const email = settingsData?.default_email;
      if (!email) {
        alert('No default email set. Please configure in settings.');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-daily-report`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          email,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send daily report');
      }

      const { error: reportUpdateError } = await supabase
        .from('time_sessions')
        .update({ report_sent: true })
        .eq('id', sessionId);

      if (reportUpdateError) {
        console.error('Failed to update report status:', reportUpdateError);
      }

      alert('Clocked out successfully! Daily report has been sent.');
      setIsClockedIn(false);
      setSessionId(null);
      setClockInTime(null);
      setElapsedTime('00:00:00');
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Failed to clock out. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Time Tracker</h1>
          <p className="text-gray-600">
            {isClockedIn ? 'You are currently clocked in' : 'Start your work session'}
          </p>
        </div>

        {isClockedIn && (
          <div className="bg-blue-50 rounded-lg p-6 mb-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Time Elapsed</p>
            <p className="text-4xl font-bold text-blue-600 font-mono">{elapsedTime}</p>
          </div>
        )}

        <button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={isProcessing}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
            isClockedIn
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isProcessing ? (
            <>Processing...</>
          ) : isClockedIn ? (
            <>
              <Square className="w-6 h-6" />
              Clock Out & Send Report
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              Clock In
            </>
          )}
        </button>

        {isClockedIn && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Clocking out will send a daily report of all completed tasks
          </p>
        )}
      </div>
    </div>
  );
}
