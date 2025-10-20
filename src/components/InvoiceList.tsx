import { useState, useEffect } from 'react';
import { FileText, Plus, Eye, Trash2, DollarSign } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { StatusBadge } from './StatusBadge';
import { InvoiceStatus } from '../lib/statusConstants';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_company: string | null;
  invoice_date: string;
  due_date: string | null;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  period_start: string;
  period_end: string;
}

interface InvoiceListProps {
  onCreateNew: () => void;
  onViewInvoice: (id: string) => void;
}

export function InvoiceList({ onCreateNew, onViewInvoice }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getInvoices(filter === 'all' ? undefined : filter);

      // Add mock sample invoice if no invoices exist
      const mockInvoice: Invoice = {
        id: 'sample-demo-invoice',
        invoice_number: 'SAMPLE-2025-001',
        client_name: 'Demo Client',
        client_company: 'Sample Corporation',
        invoice_date: '2025-10-01',
        due_date: '2025-10-31',
        total: 3255.00,
        currency: 'USD',
        status: 'draft',
        period_start: '2025-09-01',
        period_end: '2025-09-30',
      };

      // Show mock invoice along with real invoices (or just mock if empty)
      setInvoices(data.length > 0 ? data : [mockInvoice]);
    } catch (error) {
      console.error('Error loading invoices:', error);

      // Show mock invoice on error too
      const mockInvoice: Invoice = {
        id: 'sample-demo-invoice',
        invoice_number: 'SAMPLE-2025-001',
        client_name: 'Demo Client',
        client_company: 'Sample Corporation',
        invoice_date: '2025-10-01',
        due_date: '2025-10-31',
        total: 3255.00,
        currency: 'USD',
        status: 'draft',
        period_start: '2025-09-01',
        period_end: '2025-09-30',
      };
      setInvoices([mockInvoice]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Prevent deleting sample invoice
    if (id === 'sample-demo-invoice') {
      alert('This is a sample invoice for demonstration. Create your own invoice to see the full functionality!');
      return;
    }

    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await apiClient.deleteInvoice(id);
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };


  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Invoices
            </h1>
            <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 text-sm font-semibold rounded-full border border-purple-200">
              🚧 Beta - In Development
            </span>
          </div>
          <p className="text-gray-600 mt-1">Manage and track your invoices</p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'sent', 'paid', 'overdue'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === status
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No invoices yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first invoice from completed tasks
          </p>
          <button
            onClick={onCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl inline-flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Your First Invoice
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-800">
                      {invoice.invoice_number}
                    </h3>
                    {invoice.id === 'sample-demo-invoice' && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                        📋 SAMPLE
                      </span>
                    )}
                    <StatusBadge type="invoice" status={invoice.status} />
                  </div>
                  <div className="space-y-1 text-gray-600">
                    <p className="font-medium text-lg">{invoice.client_name}</p>
                    {invoice.client_company && (
                      <p className="text-sm text-gray-500">{invoice.client_company}</p>
                    )}
                    <p className="text-sm">
                      Period: {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                    </p>
                    <p className="text-sm">
                      Date: {formatDate(invoice.invoice_date)}
                      {invoice.due_date && ` • Due: ${formatDate(invoice.due_date)}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-4">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    <span className="text-2xl font-bold text-gray-800">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onViewInvoice(invoice.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="View"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
