import { useState } from 'react';
import { CheckSquare, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { NotificationPreferences } from './components/onboarding/NotificationPreferences';
import { SimpleSettings } from './components/SimpleSettings';
import { Integrations } from './components/Integrations';
import { ClockInOut } from './components/ClockInOut';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskHistory } from './components/TaskHistory';
import { TabNavigation } from './components/TabNavigation';

function TaskManager() {
  const { user, logout } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [activeTab, setActiveTab] = useState<'manager' | 'history'>('manager');

  const handleTaskCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8 relative">
          <div className="absolute right-0 top-0 flex items-center gap-3">
            <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg">
              👤 {user?.name || user?.email}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <CheckSquare className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Task Manager</h1>
          </div>
          <p className="text-gray-600">Create tasks with AI summaries and automatic email notifications</p>
        </header>

        {/* Clock In/Out Widget */}
        <div className="mb-6">
          <ClockInOut />
        </div>

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

      {showSettings && (
        <SimpleSettings 
          onClose={() => setShowSettings(false)} 
          onOpenIntegrations={() => {
            setShowSettings(false);
            setShowIntegrations(true);
          }}
        />
      )}
      {showIntegrations && <Integrations onClose={() => setShowIntegrations(false)} />}
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, needsOnboarding, completeOnboarding } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show landing page or auth page if not authenticated
  if (!isAuthenticated) {
    if (showAuth) {
      return <AuthPage onBackToLanding={() => setShowAuth(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // Show notification preferences if user needs onboarding
  if (needsOnboarding) {
    return <NotificationPreferences onComplete={completeOnboarding} />;
  }

  // Show main app
  return <TaskManager />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
