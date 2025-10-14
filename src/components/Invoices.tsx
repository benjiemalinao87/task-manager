import { useState } from 'react';
import { InvoiceList } from './InvoiceList';
import { InvoiceForm } from './InvoiceForm';
import { InvoicePreview } from './InvoicePreview';
import { InvoiceSettings } from './InvoiceSettings';
import { Settings } from 'lucide-react';

type View = 'list' | 'create' | 'preview' | 'settings';

export function Invoices() {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const handleViewInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setCurrentView('preview');
  };

  const handleCreateSuccess = () => {
    setCurrentView('list');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Settings Button - Only show in list view */}
        {currentView === 'list' && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setCurrentView('settings')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-all"
            >
              <Settings className="w-5 h-5" />
              Invoice Settings
            </button>
          </div>
        )}

        {/* Render appropriate view */}
        {currentView === 'list' && (
          <InvoiceList
            onCreateNew={() => setCurrentView('create')}
            onViewInvoice={handleViewInvoice}
          />
        )}

        {currentView === 'create' && (
          <InvoiceForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setCurrentView('list')}
          />
        )}

        {currentView === 'preview' && selectedInvoiceId && (
          <InvoicePreview
            invoiceId={selectedInvoiceId}
            onBack={() => setCurrentView('list')}
          />
        )}

        {currentView === 'settings' && (
          <div>
            <button
              onClick={() => setCurrentView('list')}
              className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Invoices
            </button>
            <InvoiceSettings />
          </div>
        )}
      </div>
    </div>
  );
}
