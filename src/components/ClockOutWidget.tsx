import { useState, useEffect } from 'react';
import { Clock, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ClockOutWidget() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    if (sessionId && clockInTime) {
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
  }, [sessionId, clockInTime]);

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
        setSessionId(data.id);
        setClockInTime(new Date(data.clock_in));
      }
    } catch (error) {
      console.error('Error checking active session:', error);
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
        setIsProcessing(false);
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
      window.location.reload();
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Failed to clock out. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!sessionId) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
      <Clock className="w-5 h-5 text-blue-600" />
      <div className="flex flex-col">
        <span className="text-xs text-gray-600">Session Time</span>
        <span className="text-sm font-mono font-semibold text-blue-600">{elapsedTime}</span>
      </div>
      <button
        onClick={handleClockOut}
        disabled={isProcessing}
        className="ml-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <Square className="w-4 h-4" />
        {isProcessing ? 'Clocking Out...' : 'Clock Out'}
      </button>
    </div>
  );
}
