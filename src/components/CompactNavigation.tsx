import { ListTodo, History, Calendar, FileText, Plus, type LucideIcon } from 'lucide-react';

type Tab = 'manager' | 'history' | 'calendar' | 'invoices';

interface CompactNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onCreateTask: () => void;
  showInvoices?: boolean;
}

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'manager', label: 'Tasks', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'history', label: 'History', icon: History },
  { id: 'invoices', label: 'Invoices', icon: FileText },
];

export function CompactNavigation({
  activeTab,
  onTabChange,
  onCreateTask,
  showInvoices = false
}: CompactNavigationProps) {
  const tabs = TABS.filter((tab) => tab.id !== 'invoices' || showInvoices);

  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      {/* Navigation Tabs */}
      <nav
        aria-label="Views"
        className="-mx-1 min-w-0 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="inline-flex items-center gap-0.5 rounded-xl bg-slate-900/[0.05] p-1 ring-1 ring-inset ring-slate-900/[0.04]">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.06]'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Create Task Button */}
      <button
        onClick={onCreateTask}
        aria-label="New Task"
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(37,99,235,0.45)] transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-4"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">New Task</span>
      </button>
    </div>
  );
}
