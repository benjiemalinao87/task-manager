import { ListTodo, History, Calendar, FileText, Plus } from 'lucide-react';

interface CompactNavigationProps {
  activeTab: 'manager' | 'history' | 'calendar' | 'invoices';
  onTabChange: (tab: 'manager' | 'history' | 'calendar' | 'invoices') => void;
  onCreateTask: () => void;
  showInvoices?: boolean;
}

export function CompactNavigation({ 
  activeTab, 
  onTabChange, 
  onCreateTask, 
  showInvoices = false 
}: CompactNavigationProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => onTabChange('manager')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'manager'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>Tasks</span>
        </button>
        <button
          onClick={() => onTabChange('calendar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'calendar'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendar</span>
        </button>
        <button
          onClick={() => onTabChange('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>
        {showInvoices && (
          <button
            onClick={() => onTabChange('invoices')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Invoices</span>
          </button>
        )}
      </div>

      {/* Create Task Button */}
      <button
        onClick={onCreateTask}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>New Task</span>
      </button>
    </div>
  );
}
