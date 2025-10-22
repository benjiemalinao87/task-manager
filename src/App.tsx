import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, LogOut, CheckSquare, LayoutDashboard, Download, Users, BarChart3 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { ToastProvider } from './context/ToastContext';
import { apiClient } from './lib/api-client';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/auth/AuthPage';
import { NotificationPreferences } from './components/onboarding/NotificationPreferences';
import { InviteColleagues } from './components/onboarding/InviteColleagues';
import { SimpleSettings } from './components/SimpleSettings';
import { Integrations } from './components/Integrations';
import { AsanaImport } from './components/AsanaImport';
import { ClockInOut } from './components/ClockInOut';
import { TaskForm } from './components/TaskForm';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskList } from './components/TaskList';
import { TaskHistory } from './components/TaskHistory';
import { CalendarView } from './components/CalendarView';
import { TabNavigation } from './components/TabNavigation';
import { CompactNavigation } from './components/CompactNavigation';
import { ConsolidatedHeader } from './components/ConsolidatedHeader';
import { TaskDetailView } from './components/TaskDetailView';
import { Invoices } from './components/Invoices';
import { TeamDashboard } from './components/TeamDashboard';
import { TeamManagement } from './components/TeamManagement';
import { TimeReports } from './components/TimeReports';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { PendingInvitations } from './components/PendingInvitations';
import { AcceptInvitation } from './components/AcceptInvitation';
import { ChatBubble } from './components/ChatBubble';

function TaskManager() {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showAsanaImport, setShowAsanaImport] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
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
        {/* Consolidated Header */}
        <ConsolidatedHeader
          user={user}
          onSettings={() => setShowSettings(true)}
          onLogout={handleLogout}
          onTeamDashboard={() => navigate('/team-dashboard')}
          onAsanaImport={() => setShowAsanaImport(true)}
          canViewTeamFeatures={canViewTeamFeatures}
          hasAsanaIntegration={hasAsanaIntegration}
        />

        {/* Pending Invitations */}
        <PendingInvitations />

        {/* Compact Navigation */}
        <CompactNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCreateTask={() => setShowTaskForm(true)}
          showInvoices={invoiceModuleEnabled}
        />

        {/* Main Content Area */}
        {activeTab === 'manager' ? (
          <TaskList refreshTrigger={refreshTrigger} />
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

      {showTaskForm && (
        <TaskFormModal
          onTaskCreated={() => {
            setRefreshTrigger(prev => prev + 1);
            setShowTaskForm(false);
          }}
          onClose={() => setShowTaskForm(false)}
        />
      )}

      {/* Chat Bubble - Available for all workspace members */}
      <ChatBubble />
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, needsOnboarding, completeOnboarding } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'notifications' | 'invites'>('notifications');

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

  // Show onboarding flow if user needs onboarding
  if (needsOnboarding) {
    if (onboardingStep === 'notifications') {
      return (
        <NotificationPreferences
          onComplete={() => setOnboardingStep('invites')}
        />
      );
    }

    if (onboardingStep === 'invites') {
      return (
        <InviteColleagues
          onComplete={completeOnboarding}
        />
      );
    }
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
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
