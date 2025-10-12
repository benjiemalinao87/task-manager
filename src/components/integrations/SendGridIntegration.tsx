import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, AlertCircle, Mail } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

export function SendGridIntegration() {
  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [error, setError] = useState('');
  const [integrationId, setIntegrationId] = useState<string | null>(null);

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      const integration = await apiClient.getIntegration('sendgrid');

      if (integration && integration.id) {
        setIntegrationId(integration.id);
        setApiKey(integration.api_key || '');
        setIsConnected(integration.is_active);
        if (integration.config) {
          setFromEmail(integration.config.from_email || '');
          setFromName(integration.config.from_name || '');
        }
      }
    } catch (error) {
      console.error('Error loading SendGrid integration:', error);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your SendGrid API key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to verify API key. Please check your SendGrid API key.');
      }

      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to SendGrid');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your SendGrid API key');
      return;
    }

    if (!fromEmail.trim()) {
      setError('Please enter a from email address');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const config = {
        from_email: fromEmail.trim(),
        from_name: fromName.trim(),
      };

      const result = await apiClient.saveIntegration({
        integration_type: 'sendgrid',
        api_key: apiKey,
        is_active: true,
        config,
      });

      if (result.integration) {
        setIntegrationId(result.integration.id);
      }

      setIsConnected(true);
      alert('SendGrid integration saved successfully!');
    } catch (error) {
      console.error('Error saving SendGrid integration:', error);
      setError('Failed to save integration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiClient.deleteIntegration('sendgrid');
      setIsConnected(false);
      setApiKey('');
      setFromEmail('');
      setFromName('');
      setIntegrationId(null);
      alert('SendGrid integration disconnected');
    } catch (error) {
      console.error('Error disconnecting SendGrid:', error);
      setError('Failed to disconnect. Please try again.');
    }
  };

  const handleSendTest = async () => {
    if (!fromEmail.trim()) {
      setError('Please configure and save the integration first');
      return;
    }

    setIsSendingTest(true);
    setError('');

    try {
      const settings = await apiClient.getSettings();
      const testEmail = settings.default_email?.split(',')[0]?.trim();

      if (!testEmail) {
        setError('Please set a default email in settings first');
        setIsSendingTest(false);
        return;
      }

      // For now, we'll skip the test email functionality
      // You may want to add a test endpoint to your Cloudflare Workers
      alert(`Test email functionality coming soon! Would send to: ${testEmail}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">SendGrid Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect SendGrid as your email provider for sending notifications and reports.
        </p>

        {isConnected && (
          <div className="flex items-center gap-2 text-green-600 mb-4 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Connected to SendGrid</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-red-600 mb-4 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="sendgridApiKey" className="block text-sm font-medium text-gray-700 mb-2">
          SendGrid API Key *
        </label>
        <input
          type="password"
          id="sendgridApiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your SendGrid API key"
        />
        <p className="text-xs text-gray-500 mt-2">
          Get your API key from{' '}
          <a
            href="https://app.sendgrid.com/settings/api_keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            SendGrid Dashboard
          </a>
        </p>
      </div>

      {!isConnected && (
        <button
          onClick={handleConnect}
          disabled={isLoading || !apiKey.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect to SendGrid'
          )}
        </button>
      )}

      {isConnected && (
        <>
          <div>
            <label htmlFor="sendgridFromEmail" className="block text-sm font-medium text-gray-700 mb-2">
              From Email Address *
            </label>
            <input
              type="email"
              id="sendgridFromEmail"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="noreply@yourdomain.com"
            />
            <p className="text-xs text-gray-500 mt-2">
              Email address that will appear in the "From" field (must be verified in SendGrid)
            </p>
          </div>

          <div>
            <label htmlFor="sendgridFromName" className="block text-sm font-medium text-gray-700 mb-2">
              From Name (Optional)
            </label>
            <input
              type="text"
              id="sendgridFromName"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Task Manager"
            />
            <p className="text-xs text-gray-500 mt-2">
              Name that will appear in the "From" field
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving || !fromEmail.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </button>
            <button
              onClick={handleDisconnect}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>

          <button
            onClick={handleSendTest}
            disabled={isSendingTest}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingTest ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending Test Email...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Send Test Email
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
