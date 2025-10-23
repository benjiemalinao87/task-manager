import { useState, useEffect } from 'react';
import { AlertCircle, Play, Clock, X } from 'lucide-react';

interface InactivityBannerProps {
  show: boolean;
  onResumeSession: () => void;
  onResumeTasks: () => void;
  onDismiss: () => void;
  sessionPaused: boolean;
  tasksPaused: boolean;
}

export function InactivityBanner({ 
  show, 
  onResumeSession, 
  onResumeTasks, 
  onDismiss,
  sessionPaused,
  tasksPaused 
}: InactivityBannerProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  if (!isVisible) return null;

  const handleResumeAll = () => {
    if (sessionPaused) onResumeSession();
    if (tasksPaused) onResumeTasks();
    onDismiss();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Icon and Message */}
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-white">
              <h3 className="font-semibold text-sm">
                Timers Paused Due to Inactivity
              </h3>
              <p className="text-xs opacity-90">
                {sessionPaused && tasksPaused && "Your session and task timers were paused"}
                {sessionPaused && !tasksPaused && "Your session timer was paused"}
                {!sessionPaused && tasksPaused && "Your task timers were paused"}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Resume All Button */}
            <button
              onClick={handleResumeAll}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
            >
              <Play className="w-4 h-4" />
              Resume All
            </button>

            {/* Individual Resume Buttons */}
            {sessionPaused && (
              <button
                onClick={() => {
                  onResumeSession();
                  if (!tasksPaused) onDismiss();
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
              >
                <Clock className="w-4 h-4" />
                Resume Session
              </button>
            )}

            {tasksPaused && (
              <button
                onClick={() => {
                  onResumeTasks();
                  if (!sessionPaused) onDismiss();
                }}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
              >
                <Play className="w-4 h-4" />
                Resume Tasks
              </button>
            )}

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all backdrop-blur-sm"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
