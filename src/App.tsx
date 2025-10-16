import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, LogOut, CheckSquare, LayoutDashboard, Download, Users, BarChart3 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { apiClient } from './lib/api-client';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { NotificationPreferences } from './components/onboarding/NotificationPreferences';
import { SimpleSettings } from './components/SimpleSettings';
import { Integrations } from './components/Integrations';
import { AsanaImport } from './components/AsanaImport';
import { ClockInOut } from './components/ClockInOut';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskHistory } from './components/TaskHistory';
import { CalendarView } from './components/CalendarView';
import { TabNavigation } from './components/TabNavigation';
import { TaskDetailView } from './components/TaskDetailView';
import { Invoices } from './components/Invoices';
import { TeamDashboard } from './components/TeamDashboard';
import { TeamManagement } from './components/TeamManagement';
import { TimeReports } from './components/TimeReports';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { PendingInvitations } from './components/PendingInvitations';
import { AcceptInvitation } from './components/AcceptInvitation';

function TaskManager() {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showAsanaImport, setShowAsanaImport] = useState(false);
  const [activeTab, setActiveTab] = useState<'manager' | 'history' | 'calendar' | 'invoices'>('manager');
  const [invoiceModuleEnabled, setInvoiceModuleEnabled] = useState(false);
  const [hasAsanaIntegration, setHasAsanaIntegration] = useState(false);
  
  // Check if user can view team features (owners and admins only)
  const canViewTeamFeatures = currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'admin';

  useEffect(() => {
    loadSettings();
    checkAsanaIntegration();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await apiClient.getSettings();
      setInvoiceModuleEnabled(!!settings.invoice_module_enabled);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const checkAsanaIntegration = async () => {
    try {
      const integration = await apiClient.getIntegration('asana');
      setHasAsanaIntegration(!!(integration && integration.is_active && integration.api_key));
    } catch (error) {
      console.error('Error checking Asana integration:', error);
      setHasAsanaIntegration(false);
    }
  };

  const handleInvoiceToggle = async () => {
    await loadSettings();
    // If user disables invoices while on that tab, redirect to manager
    if (activeTab === 'invoices') {
      const settings = await apiClient.getSettings();
      if (!settings.invoice_module_enabled) {
        setActiveTab('manager');
      }
    }
  };

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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Branding */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md">
              <CheckSquare className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Workoto</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100">
              <span className="text-gray-400 mr-2">👤</span>
              <span className="font-medium">{user?.name || user?.email}</span>
            </div>
            {canViewTeamFeatures && (
              <button
                onClick={() => navigate('/team-dashboard')}
                className="p-2.5 text-gray-600 hover:text-blue-600 bg-white hover:shadow-md rounded-xl transition-all border border-gray-100 shadow-sm"
                title="Team Dashboard"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            )}
            {hasAsanaIntegration && (
              <button
                onClick={() => setShowAsanaImport(true)}
                className="p-2.5 text-gray-600 hover:text-purple-600 bg-white hover:shadow-md rounded-xl transition-all border border-gray-100 shadow-sm"
                title="Import from Asana"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 text-gray-600 hover:text-gray-800 bg-white hover:shadow-md rounded-xl transition-all border border-gray-100 shadow-sm"
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 text-gray-600 hover:text-red-600 bg-white hover:shadow-md rounded-xl transition-all border border-gray-100 shadow-sm"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Clock In/Out Widget */}
        <div className="mb-8">
          <ClockInOut />
        </div>

        {/* Pending Invitations */}
        <PendingInvitations />

        {/* Tab Navigation */}
        <div className="mb-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showInvoices={invoiceModuleEnabled}
          />
        </div>

        {/* Main Content Area */}
        {activeTab === 'manager' ? (
          <div className="space-y-8">
            <TaskForm onTaskCreated={handleTaskCreated} />
            <TaskList refreshTrigger={refreshTrigger} />
          </div>
        ) : activeTab === 'calendar' ? (
          <CalendarView refreshTrigger={refreshTrigger} />
        ) : activeTab === 'invoices' ? (
          <Invoices />
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
          onInvoiceToggle={handleInvoiceToggle}
        />
      )}
      {showIntegrations && <Integrations onClose={() => setShowIntegrations(false)} />}
      {showAsanaImport && (
        <AsanaImport 
          onClose={() => setShowAsanaImport(false)} 
          onTasksImported={() => {
            setRefreshTrigger(prev => prev + 1);
            setShowAsanaImport(false);
          }} 
        />
      )}
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

  // Show main app with routes
  return (
    <Routes>
      <Route path="/" element={<TaskManager />} />
      <Route path="/task/:taskId" element={<TaskDetailView />} />
      <Route path="/team-dashboard" element={<TeamDashboard />} />
      <Route path="/team-management" element={<TeamManagement />} />
      <Route path="/time-reports" element={<TimeReports />} />
      <Route path="/accept-invitation" element={<AcceptInvitation />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <AppContent />
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
