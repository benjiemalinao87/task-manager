import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface AsanaProject {
  gid: string;
  name: string;
}

interface AsanaWorkspace {
  gid: string;
  name: string;
}

export function AsanaIntegration() {
  const [apiKey, setApiKey] = useState('');
  const [defaultAssignee, setDefaultAssignee] = useState('');
  const [workspaces, setWorkspaces] = useState<AsanaWorkspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [projects, setProjects] = useState<AsanaProject[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingWorkspaces, setIsFetchingWorkspaces] = useState(false);
  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [integrationId, setIntegrationId] = useState<string | null>(null);

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      const integration = await apiClient.getIntegration('asana');

      if (integration && integration.id) {
        setIntegrationId(integration.id);
        setApiKey(integration.api_key || '');
        setIsConnected(integration.is_active);
        if (integration.config) {
          setSelectedProject(integration.config.project_gid || '');
          setDefaultAssignee(integration.config.default_assignee_email || '');
          setSelectedWorkspace(integration.config.workspace_gid || '');
        }
        if (integration.is_active && integration.api_key) {
          await fetchWorkspaces();
        }
      }
    } catch (error) {
      console.error('Error loading Asana integration:', error);
    }
  };

  const fetchWorkspaces = async () => {
    setIsFetchingWorkspaces(true);
    setError('');
    try {
      const { workspaces: fetchedWorkspaces } = await apiClient.getAsanaWorkspaces();
      setWorkspaces(fetchedWorkspaces || []);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Asana');
      setIsConnected(false);
    } finally {
      setIsFetchingWorkspaces(false);
    }
  };

  const fetchProjects = async (workspaceId: string) => {
    if (!workspaceId) return;

    setIsFetchingProjects(true);
    setError('');
    try {
      const { projects: fetchedProjects } = await apiClient.getAsanaProjects(workspaceId);
      setProjects(fetchedProjects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setIsFetchingProjects(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Asana API token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Test the API key first
      const testResult = await apiClient.testAsanaConnection(apiKey);

      if (testResult.success) {
        // Save the integration with just the API key for now
        const result = await apiClient.saveIntegration({
          integration_type: 'asana',
          api_key: apiKey,
          is_active: false, // Not fully active until workspace and project are selected
          config: {},
        });

        if (result.integration) {
          setIntegrationId(result.integration.id);
        }

        // Fetch workspaces immediately after successful connection
        await fetchWorkspaces();
        setIsConnected(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Asana');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Asana API token');
      return;
    }

    if (!selectedWorkspace) {
      setError('Please select a workspace');
      return;
    }

    if (!selectedProject) {
      setError('Please select a project');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const config = {
        project_gid: selectedProject,
        default_assignee_email: defaultAssignee.trim(),
        workspace_gid: selectedWorkspace,
      };

      await apiClient.saveIntegration({
        integration_type: 'asana',
        api_key: apiKey,
        is_active: true,
        config,
      });

      setIsConnected(true);
      alert('Asana integration saved successfully!');
    } catch (error) {
      console.error('Error saving Asana integration:', error);
      setError('Failed to save integration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiClient.deleteIntegration('asana');
      setIsConnected(false);
      setApiKey('');
      setSelectedWorkspace('');
      setSelectedProject('');
      setWorkspaces([]);
      setProjects([]);
      setIntegrationId(null);
      alert('Asana integration disconnected');
    } catch (error) {
      console.error('Error disconnecting Asana:', error);
      setError('Failed to disconnect. Please try again.');
    }
  };

  const handleWorkspaceChange = async (workspaceId: string) => {
    setSelectedWorkspace(workspaceId);
    setSelectedProject(''); // Reset project when workspace changes
    if (workspaceId) {
      await fetchProjects(workspaceId);
    } else {
      setProjects([]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Asana Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect your Asana account to automatically create tasks in your Asana project when you create tasks here.
        </p>

        {isConnected && (
          <div className="flex items-center gap-2 text-green-600 mb-4 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Connected to Asana</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-red-600 mb-4 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="asanaApiKey" className="block text-sm font-medium text-gray-700 mb-2">
          Asana Access Token *
        </label>
        <input
          type="password"
          id="asanaApiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your Asana access token"
        />
        <p className="text-xs text-gray-500 mt-2">
          Get your access token from{' '}
          <a
            href="https://app.asana.com/0/my-apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Asana Developer Console
          </a>
        </p>
      </div>

      {!isConnected && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={isLoading || !apiKey.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect to Asana'
          )}
        </button>
      )}

      {isConnected && (
        <>
          <div>
            <label htmlFor="asanaWorkspace" className="block text-sm font-medium text-gray-700 mb-2">
              Workspace *
            </label>
            {isFetchingWorkspaces ? (
              <div className="flex items-center gap-2 text-gray-600 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading workspaces...</span>
              </div>
            ) : (
              <select
                id="asanaWorkspace"
                value={selectedWorkspace}
                onChange={(e) => handleWorkspaceChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.gid} value={workspace.gid}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Select the workspace where you want to create tasks
            </p>
          </div>

          {selectedWorkspace && (
            <div>
              <label htmlFor="asanaProject" className="block text-sm font-medium text-gray-700 mb-2">
                Default Project *
              </label>
              {isFetchingProjects ? (
                <div className="flex items-center gap-2 text-gray-600 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading projects...</span>
                </div>
              ) : (
                <select
                  id="asanaProject"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.gid} value={project.gid}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Tasks created in this app will be added to this Asana project
              </p>
            </div>
          )}

          <div>
            <label htmlFor="defaultAssignee" className="block text-sm font-medium text-gray-700 mb-2">
              Default Assignee Email (Optional)
            </label>
            <input
              type="email"
              id="defaultAssignee"
              value={defaultAssignee}
              onChange={(e) => setDefaultAssignee(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="benjie@channelautomation.com"
            />
            <p className="text-xs text-gray-500 mt-2">
              Tasks will be automatically assigned to this email address in Asana
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !selectedProject || !selectedWorkspace}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
