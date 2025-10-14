import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, DollarSign, Save, Send, Loader2, CheckSquare, Square } from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface Task {
  id: string;
  task_name: string;
  description: string;
  actual_time: string | null;
  completed_at: string;
}

interface InvoiceItem {
  taskId?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoiceForm({ onSuccess, onCancel }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Available tasks from selected period
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Invoice settings
  const [invoiceSettings, setInvoiceSettings] = useState<any>(null);

  // Form data
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    clientCompany: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    periodStart: '',
    periodEnd: '',
    taxRate: 0,
    discountAmount: 0,
    notes: '',
    paymentTerms: 'Net 30',
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    loadInvoiceSettings();
    // Set default period to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      periodStart: firstDay,
      periodEnd: lastDay,
    }));
  }, []);

  useEffect(() => {
    if (formData.periodStart && formData.periodEnd) {
      loadTasksForPeriod();
    }
  }, [formData.periodStart, formData.periodEnd]);

  const loadInvoiceSettings = async () => {
    try {
      const settings = await apiClient.getInvoiceSettings();
      setInvoiceSettings(settings);
      setFormData(prev => ({
        ...prev,
        taxRate: settings.default_tax_rate || 0,
        paymentTerms: settings.default_payment_terms || 'Net 30',
      }));
    } catch (error) {
      console.error('Error loading invoice settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadTasksForPeriod = async () => {
    try {
      setLoadingTasks(true);
      const tasks = await apiClient.getBillableTasksForPeriod(
        formData.periodStart,
        formData.periodEnd
      );
      setAvailableTasks(tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const parseTimeToHours = (timeString: string | null): number => {
    if (!timeString) return 0;

    // Handle various formats: "2 hours", "2h", "30 minutes", "30m", "2.5 hours"
    const hoursMatch = timeString.match(/(\d+\.?\d*)\s*h/i);
    const minutesMatch = timeString.match(/(\d+)\s*m/i);

    let hours = 0;
    if (hoursMatch) hours += parseFloat(hoursMatch[1]);
    if (minutesMatch) hours += parseFloat(minutesMatch[1]) / 60;

    return hours || 0;
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds);
    const task = availableTasks.find(t => t.id === taskId);

    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
      // Remove from items
      setItems(items.filter(item => item.taskId !== taskId));
    } else {
      newSelected.add(taskId);
      // Add to items
      if (task) {
        const hours = parseTimeToHours(task.actual_time);
        const rate = invoiceSettings?.default_hourly_rate || 50;
        setItems([...items, {
          taskId: task.id,
          description: task.task_name,
          quantity: hours,
          rate: rate,
          amount: hours * rate,
        }]);
      }
    }

    setSelectedTaskIds(newSelected);
  };

  const addCustomItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1,
      rate: invoiceSettings?.default_hourly_rate || 50,
      amount: invoiceSettings?.default_hourly_rate || 50,
    }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate amount if quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const item = items[index];
    if (item.taskId) {
      const newSelected = new Set(selectedTaskIds);
      newSelected.delete(item.taskId);
      setSelectedTaskIds(newSelected);
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (formData.taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - formData.discountAmount;
  };

  const handleSubmit = async (e: React.FormEvent, sendEmail: boolean = false) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    if (!formData.clientName) {
      alert('Please enter client name');
      return;
    }

    try {
      setLoading(true);

      const invoiceData = {
        clientName: formData.clientName,
        clientEmail: formData.clientEmail || undefined,
        clientAddress: formData.clientAddress || undefined,
        clientCompany: formData.clientCompany || undefined,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate || undefined,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        items: items.map(item => ({
          taskId: item.taskId,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
        })),
        taxRate: formData.taxRate,
        discountAmount: formData.discountAmount,
        notes: formData.notes || undefined,
        paymentTerms: formData.paymentTerms,
      };

      const response = await apiClient.createInvoice(invoiceData);

      if (sendEmail && formData.clientEmail) {
        await apiClient.sendInvoiceEmail(response.id, {
          to: formData.clientEmail,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(error.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Invoice</h2>

        {/* Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Period Start *
            </label>
            <input
              type="date"
              required
              value={formData.periodStart}
              onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Period End *
            </label>
            <input
              type="date"
              required
              value={formData.periodEnd}
              onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Client Information */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Client Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Company
              </label>
              <input
                type="text"
                value={formData.clientCompany}
                onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Acme Inc."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.clientAddress}
                onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Main St, City, State"
              />
            </div>
          </div>
        </div>

        {/* Invoice Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Invoice Date *
            </label>
            <input
              type="date"
              required
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Task Selection */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Select Tasks from Period
        </h3>

        {loadingTasks ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2 text-sm">Loading tasks...</p>
          </div>
        ) : availableTasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No completed tasks found for this period
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTaskSelection(task.id)}
                className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
              >
                {selectedTaskIds.has(task.id) ? (
                  <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{task.task_name}</p>
                  <p className="text-sm text-gray-600">{task.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Time: {task.actual_time || 'Not tracked'} •
                    Completed: {new Date(task.completed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Line Items</h3>
          <button
            type="button"
            onClick={addCustomItem}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Custom Item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 md:col-span-5">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
              </div>
              <div className="col-span-3 md:col-span-2 flex items-center">
                <span className="text-sm font-medium text-gray-700">
                  ${item.amount.toFixed(2)}
                </span>
              </div>
              <div className="col-span-1 md:col-span-1">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-6 pt-6 border-t-2 border-gray-200">
          <div className="space-y-2 max-w-md ml-auto">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-700">Tax:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
                <span className="text-sm">%</span>
                <span className="font-semibold w-24 text-right">${calculateTax().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center gap-4">
              <span className="text-gray-700">Discount:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discountAmount}
                  onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200">
              <span className="text-lg font-bold text-gray-800">Total:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Terms
            </label>
            <input
              type="text"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Net 30"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Add any additional notes or payment instructions..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Create Invoice
            </>
          )}
        </button>
        {formData.clientEmail && (
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Create & Send
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
