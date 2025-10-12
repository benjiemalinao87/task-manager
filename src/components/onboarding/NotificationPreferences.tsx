import { useState } from 'react';
import { Bell, CheckCircle2, Loader2, Mail, Calendar, BarChart3 } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface NotificationPreferencesProps {
  onComplete: () => void;
}

export function NotificationPreferences({ onComplete }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState({
    notifyTaskCreated: true,
    notifyTaskCompleted: true,
    notifyDailySummary: false,
    notifyWeeklySummary: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.saveNotificationPreferences(preferences);
      onComplete();
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Save default preferences (all disabled) and continue
    apiClient.saveNotificationPreferences({
      notifyTaskCreated: false,
      notifyTaskCompleted: false,
      notifyDailySummary: false,
      notifyWeeklySummary: false,
    }).then(() => {
      onComplete();
    }).catch(() => {
      // Even if it fails, continue to app
      onComplete();
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Bell className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Stay in the Loop! 📬
          </h1>
          <p className="text-gray-600">
            Choose which notifications you'd like to receive. You can always change these later in settings.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {/* Task Created Notification */}
          <div
            onClick={() => handleToggle('notifyTaskCreated')}
            className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
              preferences.notifyTaskCreated
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex-shrink-0 mr-4">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  preferences.notifyTaskCreated
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {preferences.notifyTaskCreated && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">New Task Created</h3>
              </div>
              <p className="text-sm text-gray-600">
                Get notified when you create a new task with AI summary and details
              </p>
            </div>
          </div>

          {/* Task Completed Notification */}
          <div
            onClick={() => handleToggle('notifyTaskCompleted')}
            className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
              preferences.notifyTaskCompleted
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex-shrink-0 mr-4">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  preferences.notifyTaskCompleted
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300'
                }`}
              >
                {preferences.notifyTaskCompleted && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-800">Task Completion</h3>
              </div>
              <p className="text-sm text-gray-600">
                Receive a summary email when you complete a task with actual time vs estimated
              </p>
            </div>
          </div>

          {/* Daily Summary Notification */}
          <div
            onClick={() => handleToggle('notifyDailySummary')}
            className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
              preferences.notifyDailySummary
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex-shrink-0 mr-4">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  preferences.notifyDailySummary
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300'
                }`}
              >
                {preferences.notifyDailySummary && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-800">Daily Summary</h3>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Get a daily recap of all tasks completed, time spent, and productivity insights
              </p>
            </div>
          </div>

          {/* Weekly Summary Notification */}
          <div
            onClick={() => handleToggle('notifyWeeklySummary')}
            className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
              preferences.notifyWeeklySummary
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex-shrink-0 mr-4">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  preferences.notifyWeeklySummary
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-gray-300'
                }`}
              >
                {preferences.notifyWeeklySummary && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-gray-800">Weekly Summary</h3>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Weekly performance report with task completion rate, time tracking, and trends
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 text-gray-600 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Skip for Now
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          💡 Tip: You can change these settings anytime from the Settings menu
        </p>
      </div>
    </div>
  );
}

