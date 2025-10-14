import { ListTodo, History, Calendar, FileText } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'manager' | 'history' | 'calendar' | 'invoices';
  onTabChange: (tab: 'manager' | 'history' | 'calendar' | 'invoices') => void;
  showInvoices?: boolean;
}

export function TabNavigation({ activeTab, onTabChange, showInvoices = false }: TabNavigationProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 border border-gray-100">
      <button
        onClick={() => onTabChange('manager')}
        className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
          activeTab === 'manager'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-[1.02]'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <ListTodo className="w-5 h-5" />
        <span>Task Manager</span>
      </button>
      <button
        onClick={() => onTabChange('calendar')}
        className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
          activeTab === 'calendar'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-[1.02]'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <Calendar className="w-5 h-5" />
        <span>Calendar</span>
      </button>
      <button
        onClick={() => onTabChange('history')}
        className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
          activeTab === 'history'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-[1.02]'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <History className="w-5 h-5" />
        <span>Task History</span>
      </button>
      {showInvoices && (
        <button
          onClick={() => onTabChange('invoices')}
          className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'invoices'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-[1.02]'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Invoices</span>
        </button>
      )}
    </div>
  );
}
