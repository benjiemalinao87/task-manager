import { useState, useEffect } from 'react';
import { X, Save, Bell, Mail, Loader2, Settings } from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface SimpleSettingsProps {
  onClose: () => void;
  onOpenIntegrations: () => void;
}

export function SimpleSettings({ onClose, onOpenIntegrations }: SimpleSettingsProps) {
  const [settings, setSettings] = useState({
    default_email: '',
    notify_task_created: true,
    notify_task_completed: true,
    notify_daily_summary: false,
    notify_weekly_summary: false,
    email_subject_task_created: '',
    email_subject_task_completed: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiClient.getSettings();
      setSettings({
        default_email: data.default_email || '',
        notify_task_created: !!data.notify_task_created,
        notify_task_completed: !!data.notify_task_completed,
        notify_daily_summary: !!data.notify_daily_summary,
        notify_weekly_summary: !!data.notify_weekly_summary,
        email_subject_task_created: data.email_subject_task_created || '',
        email_subject_task_completed: data.email_subject_task_completed || '',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      await apiClient.updateSettings({
        default_email: settings.default_email,
        notify_task_created: settings.notify_task_created ? 1 : 0,
        notify_task_completed: settings.notify_task_completed ? 1 : 0,
        notify_daily_summary: settings.notify_daily_summary ? 1 : 0,
        notify_weekly_summary: settings.notify_weekly_summary ? 1 : 0,
        email_subject_task_created: settings.email_subject_task_created,
        email_subject_task_completed: settings.email_subject_task_completed,
      });
      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('❌ Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close settings"
            aria-label="Close settings"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Default Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Default Email Address
            </label>
            <input
              type="email"
              value={settings.default_email}
              onChange={(e) => setSettings({ ...settings, default_email: e.target.value })}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Email address to receive task notifications
            </p>
          </div>

          {/* Email Subject Lines */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Email Subject Lines</h3>
            <div className="space-y-4">
              {/* Task Created Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Task Created Subject
                </label>
                <input
                  type="text"
                  value={settings.email_subject_task_created}
                  onChange={(e) => setSettings({ ...settings, email_subject_task_created: e.target.value })}
                  placeholder="New Task Created: {task_name}"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{'}task_name{'}'} to include the task name. Leave empty for default.
                </p>
              </div>

              {/* Task Completed Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Completed Subject
                </label>
                <input
                  type="text"
                  value={settings.email_subject_task_completed}
                  onChange={(e) => setSettings({ ...settings, email_subject_task_completed: e.target.value })}
                  placeholder="Task Completed: {task_name}"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{'}task_name{'}'} to include the task name. Leave empty for default.
                </p>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Email Notifications</h3>
            <div className="space-y-3">
              {/* Task Created */}
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notify_task_created}
                  onChange={(e) =>
                    setSettings({ ...settings, notify_task_created: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-grow">
                  <div className="font-medium text-gray-800">New Task Created</div>
                  <div className="text-sm text-gray-500">
                    Get notified when you create a new task with AI summary
                  </div>
                </div>
              </label>

              {/* Task Completed */}
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notify_task_completed}
                  onChange={(e) =>
                    setSettings({ ...settings, notify_task_completed: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-grow">
                  <div className="font-medium text-gray-800">Task Completion</div>
                  <div className="text-sm text-gray-500">
                    Receive summary when you complete a task
                  </div>
                </div>
              </label>

              {/* Daily Summary */}
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer opacity-60">
                <input
                  type="checkbox"
                  checked={settings.notify_daily_summary}
                  onChange={(e) =>
                    setSettings({ ...settings, notify_daily_summary: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  disabled
                />
                <div className="flex-grow">
                  <div className="font-medium text-gray-800 flex items-center gap-2">
                    Daily Summary
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Daily recap of all tasks completed
                  </div>
                </div>
              </label>

              {/* Weekly Summary */}
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer opacity-60">
                <input
                  type="checkbox"
                  checked={settings.notify_weekly_summary}
                  onChange={(e) =>
                    setSettings({ ...settings, notify_weekly_summary: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  disabled
                />
                <div className="flex-grow">
                  <div className="font-medium text-gray-800 flex items-center gap-2">
                    Weekly Summary
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Weekly performance report with trends
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Settings
              </>
            )}
          </button>

          {/* Integrations Button */}
          <button
            onClick={onOpenIntegrations}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Manage Integrations
          </button>
        </div>
      </div>
    </div>
  );
}

