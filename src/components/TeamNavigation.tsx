import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export function TeamNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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
          </div>
        </div>
      </div>
    </nav>
  );
}
