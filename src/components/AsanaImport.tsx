import { useState, useEffect } from 'react';
import { Download, Loader2, AlertCircle, CheckCircle, ExternalLink, X } from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface AsanaProject {
  gid: string;
  name: string;
}

interface AsanaWorkspace {
  gid: string;
  name: string;
}

interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  due_on?: string;
  completed: boolean;
  assignee?: {
    gid: string;
    name: string;
  };
}

interface AsanaImportProps {
  onClose: () => void;
  onTasksImported: () => void;
}

export function AsanaImport({ onClose, onTasksImported }: AsanaImportProps) {
  const [asanaIntegration, setAsanaIntegration] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState<AsanaWorkspace[]>([]);
  const [projects, setProjects] = useState<AsanaProject[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [asanaTasks, setAsanaTasks] = useState<AsanaTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'workspace' | 'project' | 'tasks' | 'import'>('workspace');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  useEffect(() => {
    loadAsanaIntegration();
  }, []);

  const loadAsanaIntegration = async () => {
    try {
      const integration = await apiClient.getIntegration('asana');
      if (integration && integration.is_active) {
        setAsanaIntegration(integration);
        
        // Load workspaces
        const { workspaces: fetchedWorkspaces } = await apiClient.getAsanaWorkspaces();
        setWorkspaces(fetchedWorkspaces || []);
        
        // If integration has a default workspace, pre-select it
        if (integration.config?.workspace_gid) {
          setSelectedWorkspace(integration.config.workspace_gid);
          await loadProjects(integration.config.workspace_gid);
        }
      } else {
        setError('Asana integration not configured. Please set up Asana integration first.');
      }
    } catch (error) {
      console.error('Error loading Asana integration:', error);
      setError('Failed to load Asana integration');
    }
  };

  const loadProjects = async (workspaceId: string) => {
    if (!workspaceId) return;
    
    setIsLoading(true);
    setError('');
    try {
      const { projects: fetchedProjects } = await apiClient.getAsanaProjects(workspaceId);
      setProjects(fetchedProjects || []);
      setStep('project');
    } catch (err) {
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAsanaTasks = async (projectId: string) => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError('');
    try {
      console.log('Loading tasks from Asana project:', projectId);
      const { tasks } = await apiClient.getAsanaProjectTasks(projectId);
      console.log('Received tasks:', tasks);
      // Filter out completed tasks for import
      const incompleteTasks = tasks?.filter((task: AsanaTask) => !task.completed) || [];
      setAsanaTasks(incompleteTasks);
      setStep('tasks');
    } catch (err) {
      console.error('Error loading Asana tasks:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks from Asana';
      setError(`${errorMessage}. This project may be private, archived, or inaccessible with your current API token.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkspaceSelect = async (workspaceId: string) => {
    setSelectedWorkspace(workspaceId);
    setSelectedProject('');
    setProjects([]);
    await loadProjects(workspaceId);
  };

  const handleProjectSelect = async (projectId: string) => {
    setSelectedProject(projectId);
    await loadAsanaTasks(projectId);
  };

  const handleTaskToggle = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === asanaTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(asanaTasks.map(task => task.gid)));
    }
  };

  const handleImport = async () => {
    if (selectedTasks.size === 0) {
      setError('Please select at least one task to import');
      return;
    }

    setIsImporting(true);
    setError('');
    
    try {
      const tasksToImport = asanaTasks.filter(task => selectedTasks.has(task.gid));
      
      for (const task of tasksToImport) {
        await apiClient.importAsanaTask({
          asanaTaskId: task.gid,
          taskName: task.name,
          description: task.notes || task.name,
          estimatedTime: '1 hour', // Default estimate
          priority: 'medium',
          asanaProjectId: selectedProject,
        });
      }
      
      onTasksImported();
      onClose();
    } catch (err) {
      setError('Failed to import tasks');
    } finally {
      setIsImporting(false);
    }
  };

  const getSelectedProjectName = () => {
    return projects.find(p => p.gid === selectedProject)?.name || '';
  };

  const getSelectedWorkspaceName = () => {
    return workspaces.find(w => w.gid === selectedWorkspace)?.name || '';
  };

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  if (!asanaIntegration) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Asana Integration Required</h3>
            <p className="text-gray-600 mb-4">
              Please set up your Asana integration first to import tasks.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Download className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-800">Import from Asana</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close import dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'workspace' ? 'text-purple-600' : step === 'project' || step === 'tasks' || step === 'import' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'workspace' ? 'bg-purple-100' : step === 'project' || step === 'tasks' || step === 'import' ? 'bg-green-100' : 'bg-gray-100'}`}>
                {step === 'project' || step === 'tasks' || step === 'import' ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-sm font-medium">Select Workspace</span>
            </div>
            <div className={`flex items-center gap-2 ${step === 'project' ? 'text-purple-600' : step === 'tasks' || step === 'import' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'project' ? 'bg-purple-100' : step === 'tasks' || step === 'import' ? 'bg-green-100' : 'bg-gray-100'}`}>
                {step === 'tasks' || step === 'import' ? <CheckCircle className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-sm font-medium">Select Project</span>
            </div>
            <div className={`flex items-center gap-2 ${step === 'tasks' ? 'text-purple-600' : step === 'import' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'tasks' ? 'bg-purple-100' : step === 'import' ? 'bg-green-100' : 'bg-gray-100'}`}>
                {step === 'import' ? <CheckCircle className="w-4 h-4" /> : '3'}
              </div>
              <span className="text-sm font-medium">Select Tasks</span>
            </div>
            <div className={`flex items-center gap-2 ${step === 'import' ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'import' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                4
              </div>
              <span className="text-sm font-medium">Import</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="flex items-start gap-2 text-red-600 mb-4 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step 1: Workspace Selection */}
          {step === 'workspace' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Asana Workspace</h3>
              <div className="space-y-3">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.gid}
                    onClick={() => handleWorkspaceSelect(workspace.gid)}
                    className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                  >
                    <div className="font-medium text-gray-800">{workspace.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Project Selection */}
          {step === 'project' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setStep('workspace')}
                  className="text-gray-500 hover:text-gray-700"
                  title="Go back to workspace selection"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-semibold text-gray-800">
                  Select Project from {getSelectedWorkspaceName()}
                </h3>
              </div>

              {/* Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {isLoading ? (
                  // Skeleton loader
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-full p-4 border border-gray-200 rounded-lg animate-pulse">
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {projectSearchQuery ? `No projects found matching "${projectSearchQuery}"` : 'No projects found'}
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <button
                      key={project.gid}
                      onClick={() => handleProjectSelect(project.gid)}
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <div className="font-medium text-gray-800">{project.name}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Task Selection */}
          {step === 'tasks' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setStep('project')}
                  className="text-gray-500 hover:text-gray-700"
                  title="Go back to project selection"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-semibold text-gray-800">
                  Select Tasks from {getSelectedProjectName()}
                </h3>
              </div>

              {asanaTasks.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No incomplete tasks found in this project.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">
                      {asanaTasks.length} incomplete tasks found
                    </p>
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                    >
                      {selectedTasks.size === asanaTasks.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {asanaTasks.map((task) => (
                      <div
                        key={task.gid}
                        className={`p-4 border rounded-lg transition-colors ${
                          selectedTasks.has(task.gid)
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task.gid)}
                            onChange={() => handleTaskToggle(task.gid)}
                            className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            title={`Select task: ${task.name}`}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 mb-1">{task.name}</div>
                            {task.notes && (
                              <div className="text-sm text-gray-600 mb-2">{task.notes}</div>
                            )}
                            {task.assignee && (
                              <div className="text-xs text-gray-500">
                                Assigned to: {task.assignee.name}
                              </div>
                            )}
                          </div>
                          <a
                            href={`https://app.asana.com/0/0/${task.gid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-800"
                            title={`View task "${task.name}" in Asana`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {step === 'tasks' && asanaTasks.length > 0 && (
              <button
                onClick={handleImport}
                disabled={isImporting || selectedTasks.size === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Import {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
