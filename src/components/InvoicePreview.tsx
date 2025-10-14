import { useState, useEffect } from 'react';
import { Send, Download, Link as LinkIcon, Edit, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface InvoicePreviewProps {
  invoiceId: string;
  onBack: () => void;
  onEdit?: () => void;
}

export function InvoicePreview({ invoiceId, onBack, onEdit }: InvoicePreviewProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '' });
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadInvoice();
    loadSettings();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      // Check if this is the sample invoice
      if (invoiceId === 'sample-demo-invoice') {
        const mockInvoice = {
          id: 'sample-demo-invoice',
          invoice_number: 'SAMPLE-2025-001',
          client_name: 'Demo Client',
          client_company: 'Sample Corporation',
          client_email: 'client@example.com',
          client_address: '123 Business Street\nNew York, NY 10001',
          invoice_date: '2025-10-01',
          due_date: '2025-10-31',
          period_start: '2025-09-01',
          period_end: '2025-09-30',
          subtotal: 3000.00,
          tax_rate: 8.5,
          tax_amount: 255.00,
          discount_amount: 0,
          total: 3255.00,
          currency: 'USD',
          status: 'draft',
          payment_terms: 'Net 30 days',
          notes: 'This is a sample invoice to demonstrate the invoice generation feature.',
          items: [
            {
              description: 'Website Development - Homepage Design',
              quantity: 40,
              rate: 50.00,
              amount: 2000.00
            },
            {
              description: 'API Integration - Payment Gateway',
              quantity: 20,
              rate: 50.00,
              amount: 1000.00
            }
          ]
        };
        setInvoice(mockInvoice);
        setEmailData(prev => ({ ...prev, to: mockInvoice.client_email }));
      } else {
        const data = await apiClient.getInvoice(invoiceId);
        setInvoice(data);
        setEmailData(prev => ({ ...prev, to: data.client_email || '' }));
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await apiClient.getInvoiceSettings();
      setInvoiceSettings(settings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      const response = await apiClient.generateInvoiceShareLink(invoiceId);
      const shareUrl = `${window.location.origin}/invoice/${response.token}`;
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Error generating share link:', error);
      alert('Failed to generate share link');
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.to) {
      alert('Please enter recipient email');
      return;
    }

    try {
      setSendingEmail(true);
      await apiClient.sendInvoiceEmail(invoiceId, emailData);
      alert('Invoice sent successfully!');
      setShowEmailModal(false);
      loadInvoice(); // Reload to update sent status
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDelete = async () => {
    // Prevent deleting sample invoice
    if (invoiceId === 'sample-demo-invoice') {
      alert('Cannot delete the sample invoice. This is for demonstration purposes only.');
      return;
    }

    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await apiClient.deleteInvoice(invoiceId);
      onBack();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Invoice not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-700">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Action Bar - Hidden when printing */}
      <div className="mb-6 print:hidden">
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Invoices
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleGenerateShareLink}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-all"
            >
              <LinkIcon className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              Send Email
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              Print/PDF
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg flex items-center gap-2 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 md:p-12 max-w-4xl mx-auto print:shadow-none print:border-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-8 border-b-2 border-gray-200">
          <div>
            {invoiceSettings?.business_name && (
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {invoiceSettings.business_name}
              </h1>
            )}
            {invoiceSettings?.business_address && (
              <p className="text-gray-600 whitespace-pre-line">{invoiceSettings.business_address}</p>
            )}
            {invoiceSettings?.business_phone && (
              <p className="text-gray-600">{invoiceSettings.business_phone}</p>
            )}
            {invoiceSettings?.business_email && (
              <p className="text-gray-600">{invoiceSettings.business_email}</p>
            )}
          </div>

          <div className="text-right">
            <h2 className="text-4xl font-bold text-blue-600 mb-2">INVOICE</h2>
            <p className="text-gray-600">
              <span className="font-semibold">Invoice #:</span> {invoice.invoice_number}
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">Date:</span> {formatDate(invoice.invoice_date)}
            </p>
            {invoice.due_date && (
              <p className="text-gray-600">
                <span className="font-semibold">Due Date:</span> {formatDate(invoice.due_date)}
              </p>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Bill To:</h3>
          <div className="text-gray-800">
            <p className="font-semibold text-lg">{invoice.client_name}</p>
            {invoice.client_company && <p>{invoice.client_company}</p>}
            {invoice.client_address && (
              <p className="whitespace-pre-line">{invoice.client_address}</p>
            )}
            {invoice.client_email && <p>{invoice.client_email}</p>}
          </div>
        </div>

        {/* Period */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-gray-700">
            <span className="font-semibold">Billing Period:</span>{' '}
            {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
          </p>
        </div>

        {/* Line Items */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-2 font-semibold text-gray-700">Description</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Qty/Hours</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Rate</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-2 text-gray-800">{item.description}</td>
                  <td className="py-3 px-2 text-right text-gray-800">{item.quantity}</td>
                  <td className="py-3 px-2 text-right text-gray-800">
                    {formatCurrency(item.rate, invoice.currency)}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-800 font-medium">
                    {formatCurrency(item.amount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="flex justify-between py-2 text-gray-700">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between py-2 text-gray-700">
                <span>Tax ({invoice.tax_rate}%):</span>
                <span className="font-medium">{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
              </div>
            )}
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between py-2 text-gray-700">
                <span>Discount:</span>
                <span className="font-medium">-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 border-gray-300 text-lg font-bold">
              <span className="text-gray-800">Total:</span>
              <span className="text-blue-600">{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes and Payment Info */}
        <div className="space-y-4 pt-8 border-t-2 border-gray-200">
          {invoice.payment_terms && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Payment Terms:</h4>
              <p className="text-gray-600">{invoice.payment_terms}</p>
            </div>
          )}

          {invoice.notes && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Notes:</h4>
              <p className="text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {invoiceSettings?.payment_instructions && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Payment Instructions:</h4>
              <p className="text-gray-600 whitespace-pre-line">{invoiceSettings.payment_instructions}</p>
            </div>
          )}

          {invoiceSettings?.bank_details && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Bank Details:</h4>
              <p className="text-gray-600 whitespace-pre-line">{invoiceSettings.bank_details}</p>
            </div>
          )}

          {invoiceSettings?.tax_id && (
            <div>
              <p className="text-sm text-gray-500">Tax ID: {invoiceSettings.tax_id}</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Send Invoice via Email</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  required
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject (Optional)
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Invoice ${invoice.invoice_number}`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Add a personal message..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
