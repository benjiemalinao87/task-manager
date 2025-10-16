import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useWorkspace } from '../context/WorkspaceContext';

export function TeamNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();

  const isActive = (path: string) => location.pathname === path;
  
  // Check if user is owner or admin (members have restricted access)
  const canViewReports = currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'admin';

  return (
    <nav className="bg-[#0f1b2e] border-b border-gray-800 mb-8">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Workoto</span>
          </div>

          {/* Center: Workspace Selector */}
          <div className="flex items-center gap-8">
            <WorkspaceSwitcher />
          </div>

          {/* Right: Navigation Items */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tasks
            </button>
            
            {/* Dashboard - Only for owners and admins */}
            {canViewReports && (
              <button
                onClick={() => navigate('/team-dashboard')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/team-dashboard')
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                📊 Dashboard
              </button>
            )}
            
            {/* Team - Available for all roles */}
            <button
              onClick={() => navigate('/team-management')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/team-management')
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              👥 Team
            </button>
            
            {/* Reports - Only for owners and admins */}
            {canViewReports && (
              <button
                onClick={() => navigate('/time-reports')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/time-reports')
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                ⏱️ Reports
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
