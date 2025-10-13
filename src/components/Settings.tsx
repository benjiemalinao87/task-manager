import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [defaultEmail, setDefaultEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateEmails = (emailString: string): { valid: boolean; error?: string; count?: number } => {
    if (!emailString.trim()) {
      return { valid: true, count: 0 }; // Empty is allowed in settings
    }

    const emails = emailString.split(',').map(e => e.trim()).filter(e => e.length > 0);
    
    if (emails.length > 5) {
      return { valid: false, error: 'Maximum 5 email addresses allowed' };
    }

    const invalidEmails = emails.filter(e => !validateEmail(e));
    
    if (invalidEmails.length > 0) {
      return { 
        valid: false, 
        error: `Invalid email format: ${invalidEmails[0]}` 
      };
    }

    return { valid: true, count: emails.length };
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDefaultEmail(data.default_email);
        setSettingsId(data.id);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    // Validate emails
    const validation = validateEmails(defaultEmail);
    if (!validation.valid) {
      setEmailError(validation.error || 'Invalid email address');
      return;
    }

    setIsSaving(true);
    setEmailError('');
    
    try {
      if (settingsId) {
        const { error } = await supabase
          .from('settings')
          .update({ default_email: defaultEmail.trim(), updated_at: new Date().toISOString() })
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('settings')
          .insert({ default_email: defaultEmail.trim() })
          .select()
          .maybeSingle();

        if (error) throw error;
        if (data) setSettingsId(data.id);
      }

      alert('Settings saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label htmlFor="defaultEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Default Email Destinations
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Enter email addresses separated by commas for multiple recipients (e.g., notify supervisor, manager)
            </p>
            <input
              type="text"
              id="defaultEmail"
              value={defaultEmail}
              onChange={(e) => {
                setDefaultEmail(e.target.value);
                setEmailError('');
              }}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:outline-none transition-all ${
                emailError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="user@email.com, manager@email.com, supervisor@email.com"
            />
            {emailError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <span className="font-medium">⚠️</span> {emailError}
              </p>
            )}
            {!emailError && defaultEmail.trim() && (() => {
              const count = defaultEmail.split(',').map(e => e.trim()).filter(e => e.length > 0).length;
              return (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <span className="font-medium">✓</span> {count} email {count === 1 ? 'address' : 'addresses'} configured
                </p>
              );
            })()}
            <p className="text-xs text-gray-400 mt-2">
              Max 5 email addresses. Example: john@example.com, jane@example.com
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
