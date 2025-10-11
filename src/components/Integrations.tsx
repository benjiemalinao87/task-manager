import { useState } from 'react';
import { Settings as SettingsIcon, X } from 'lucide-react';
import { AsanaIntegration } from './integrations/AsanaIntegration';
import { ResendIntegration } from './integrations/ResendIntegration';
import { SendGridIntegration } from './integrations/SendGridIntegration';

interface IntegrationsProps {
  onClose: () => void;
}

type TabType = 'asana' | 'resend' | 'sendgrid';

export function Integrations({ onClose }: IntegrationsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('asana');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-800">Integrations</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-1 px-6">
            <button
              onClick={() => setActiveTab('asana')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'asana'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Asana
            </button>
            <button
              onClick={() => setActiveTab('resend')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'resend'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Resend
            </button>
            <button
              onClick={() => setActiveTab('sendgrid')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'sendgrid'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              SendGrid
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'asana' && <AsanaIntegration />}
          {activeTab === 'resend' && <ResendIntegration />}
          {activeTab === 'sendgrid' && <SendGridIntegration />}
        </div>

        <div className="border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
