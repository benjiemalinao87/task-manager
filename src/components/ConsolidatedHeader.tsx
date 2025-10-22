import { useState, useEffect } from 'react';
import { CheckSquare, Clock, Play, Square, Settings, LogOut, BarChart3, Download, MoreHorizontal } from 'lucide-react';
import { apiClient } from '../lib/api-client';

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
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
                  <div className="text-xs text-gray-500">
                    {elapsedTime} • Active
                  </div>
                )}
              </div>
            </div>

            {/* Time Action Button */}
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
              <button
                onClick={handleClockOut}
                disabled={isProcessing}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                {isProcessing ? 'Stopping...' : 'Clock Out'}
              </button>
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
    </div>
  );
}
