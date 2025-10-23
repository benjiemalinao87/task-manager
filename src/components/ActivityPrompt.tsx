import { useEffect, useState } from 'react';
import { AlertCircle, Activity } from 'lucide-react';

interface ActivityPromptProps {
  show: boolean;
  timeoutSeconds: number; // How long until auto-pause
  onContinue: () => void;
  onPause: () => void;
}

export function ActivityPrompt({ show, timeoutSeconds, onContinue, onPause }: ActivityPromptProps) {
  const [countdown, setCountdown] = useState(timeoutSeconds);

  useEffect(() => {
    if (!show) {
      setCountdown(timeoutSeconds);
      return;
    }

    // Start countdown
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onPause(); // Auto-pause when countdown reaches 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, timeoutSeconds, onPause]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-yellow-100 rounded-full p-4">
            <AlertCircle className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-3">
          Are you still working?
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          We noticed you've been inactive for a while. Your timers will automatically pause in:
        </p>

        {/* Countdown */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-center gap-3">
            <Activity className="w-6 h-6 text-yellow-600 animate-pulse" />
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-600 font-mono">
                {countdown}s
              </div>
              <div className="text-sm text-gray-600 mt-1">
                seconds remaining
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <p className="text-sm text-gray-500 text-center mb-6">
          This helps ensure accurate time tracking by pausing timers when you're away.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onContinue}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Activity className="w-5 h-5" />
            Yes, I'm Still Working
          </button>
          
          <button
            onClick={onPause}
            className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all border-2 border-gray-200 hover:border-gray-300"
          >
            Pause My Timers
          </button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-400 text-center mt-4">
          You can resume tracking anytime by clicking Resume
        </p>
      </div>
    </div>
  );
}

