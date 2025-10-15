import { useState } from 'react';
import { ChevronDown, Plus, Building2, Check, Users } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, switchWorkspace, createWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [error, setError] = useState('');

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }

    try {
      setError('');
      await createWorkspace(newWorkspaceName.trim());
      setNewWorkspaceName('');
      setIsCreating(false);
      setIsOpen(false);
    } catch (err) {
      setError('Failed to create workspace');
      console.error(err);
    }
  };

  const handleSwitchWorkspace = (workspaceId: string) => {
    switchWorkspace(workspaceId);
    setIsOpen(false);
  };

  if (isLoading || !currentWorkspace) {
    return (
      <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Hide workspace switcher if user only has one workspace
  const showSwitcher = workspaces.length > 1;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 hover:border-gray-300 transition-colors"
      >
        <Building2 className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-gray-800 text-sm max-w-[150px] truncate">
          {currentWorkspace.name}
        </span>
        {showSwitcher && (
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
        {currentWorkspace.member_count > 1 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 ml-1">
            <Users className="w-3 h-3" />
            <span>{currentWorkspace.member_count}</span>
          </div>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setIsCreating(false);
              setError('');
            }}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
            {/* Workspaces List */}
            <div className="max-h-64 overflow-y-auto">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Your Workspaces
              </div>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleSwitchWorkspace(workspace.id)}
                  className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    workspace.id === currentWorkspace.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Building2 className={`w-4 h-4 flex-shrink-0 ${
                      workspace.id === currentWorkspace.id ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                    <div className="flex-1 min-w-0 text-left">
                      <div className={`text-sm font-medium truncate ${
                        workspace.id === currentWorkspace.id ? 'text-blue-600' : 'text-gray-800'
                      }`}>
                        {workspace.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {workspace.member_count} {workspace.member_count === 1 ? 'member' : 'members'}
                        </span>
                        <span>{workspace.task_count} tasks</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase">
                          {workspace.role}
                        </span>
                      </div>
                    </div>
                    {workspace.id === currentWorkspace.id && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Create New Workspace */}
            <div className="border-t border-gray-200">
              {!isCreating ? (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full px-3 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors text-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Create New Workspace</span>
                </button>
              ) : (
                <form onSubmit={handleCreateWorkspace} className="p-3">
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="Workspace name"
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {error && (
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="submit"
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setNewWorkspaceName('');
                        setError('');
                      }}
                      className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
