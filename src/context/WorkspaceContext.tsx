import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../lib/api-client';
import { useAuth } from './AuthContext';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  role: string;
  member_count: number;
  task_count: number;
  owner_name?: string;
  owner_email?: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load workspaces when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getWorkspaces();
      const workspaceList = response.workspaces || [];
      setWorkspaces(workspaceList);

      // Set current workspace from localStorage or prioritize shared workspaces
      const savedWorkspaceId = localStorage.getItem('current_workspace_id');
      if (savedWorkspaceId) {
        const saved = workspaceList.find((w: Workspace) => w.id === savedWorkspaceId);
        if (saved) {
          setCurrentWorkspace(saved);
        } else if (workspaceList.length > 0) {
          // Prioritize shared workspaces (where user is a member, not owner)
          const sharedWorkspace = workspaceList.find((w: Workspace) => w.role === 'member');
          const defaultWorkspace = sharedWorkspace || workspaceList[0];
          setCurrentWorkspace(defaultWorkspace);
          localStorage.setItem('current_workspace_id', defaultWorkspace.id);
        }
      } else if (workspaceList.length > 0) {
        // Prioritize shared workspaces (where user is a member, not owner)
        const sharedWorkspace = workspaceList.find((w: Workspace) => w.role === 'member');
        const defaultWorkspace = sharedWorkspace || workspaceList[0];
        setCurrentWorkspace(defaultWorkspace);
        localStorage.setItem('current_workspace_id', defaultWorkspace.id);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setError('Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('current_workspace_id', workspaceId);
    }
  };

  const refreshWorkspaces = async () => {
    await loadWorkspaces();
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    try {
      const response = await apiClient.createWorkspace({ name });
      const newWorkspace = response.workspace;
      await refreshWorkspaces();
      switchWorkspace(newWorkspace.id);
      return newWorkspace;
    } catch (err) {
      console.error('Failed to create workspace:', err);
      throw err;
    }
  };

  const updateWorkspace = async (id: string, name: string) => {
    try {
      await apiClient.updateWorkspace(id, { name });
      await refreshWorkspaces();
    } catch (err) {
      console.error('Failed to update workspace:', err);
      throw err;
    }
  };

  const deleteWorkspace = async (id: string) => {
    try {
      await apiClient.deleteWorkspace(id);
      await refreshWorkspaces();
      // If deleted workspace was current, switch to first available
      if (currentWorkspace?.id === id && workspaces.length > 1) {
        const remaining = workspaces.filter(w => w.id !== id);
        if (remaining.length > 0) {
          switchWorkspace(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      throw err;
    }
  };

  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    isLoading,
    error,
    switchWorkspace,
    refreshWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
