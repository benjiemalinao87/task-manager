interface TabNavigationProps {
  activeTab: 'manager' | 'history';
  onTabChange: (tab: 'manager' | 'history') => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="bg-white rounded-lg shadow-md mb-6 p-1 flex gap-1">
      <button
        onClick={() => onTabChange('manager')}
        className={`flex-1 py-3 px-6 rounded-md font-semibold transition-all ${
          activeTab === 'manager'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        Task Manager
      </button>
      <button
        onClick={() => onTabChange('history')}
        className={`flex-1 py-3 px-6 rounded-md font-semibold transition-all ${
          activeTab === 'history'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        Task History
      </button>
    </div>
  );
}
