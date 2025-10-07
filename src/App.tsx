import { useState, useEffect } from 'react';
import { CheckSquare, Settings as SettingsIcon } from 'lucide-react';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskHistory } from './components/TaskHistory';
import { TabNavigation } from './components/TabNavigation';
import { Settings } from './components/Settings';
import { ClockIn } from './components/ClockIn';
import { ClockOutWidget } from './components/ClockOutWidget';
import { supabase } from './lib/supabase';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState<'manager' | 'history'>('manager');

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('time_sessions')
        .select('*')
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentSessionId(data.id);
        setIsClockedIn(true);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handleTaskCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleClockIn = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsClockedIn(true);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isClockedIn) {
    return <ClockIn onClockIn={handleClockIn} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8 relative">
          <div className="absolute right-0 top-0 flex items-center gap-3">
            <ClockOutWidget />
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <CheckSquare className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Task Manager</h1>
          </div>
          <p className="text-gray-600">Create tasks with AI summaries and automatic email notifications</p>
        </header>

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'manager' ? (
          <>
            <TaskForm onTaskCreated={handleTaskCreated} />
            <TaskList refreshTrigger={refreshTrigger} />
          </>
        ) : (
          <TaskHistory refreshTrigger={refreshTrigger} />
        )}
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
