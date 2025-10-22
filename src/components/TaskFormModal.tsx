import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, AlertTriangle, Flame, FileText, ExternalLink, Users } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskFormModalProps {
  onTaskCreated: () => void;
  onClose: () => void;
}

interface AsanaProject {
  gid: string;
  name: string;
}

interface AsanaWorkspace {
  gid: string;
  name: string;
}

export function TaskFormModal({ onTaskCreated, onClose }: TaskFormModalProps) {
  const { currentWorkspace } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingEmoji, setLoadingEmoji] = useState('');
  const [loadingInterval, setLoadingInterval] = useState<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    estimatedTime: '',
    taskLink: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    asanaProjectId: '',
    assignedTo: '',
  });

  // Team collaboration state
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Asana integration state
  const [asanaIntegration, setAsanaIntegration] = useState<any>(null);
  const [asanaWorkspaces, setAsanaWorkspaces] = useState<AsanaWorkspace[]>([]);
  const [asanaProjects, setAsanaProjects] = useState<AsanaProject[]>([]);
  const [selectedAsanaWorkspace, setSelectedAsanaWorkspace] = useState('');
  const [isLoadingAsanaData, setIsLoadingAsanaData] = useState(false);

  // Load workspace members for team collaboration
  useEffect(() => {
    const loadWorkspaceMembers = async () => {
      if (!currentWorkspace?.id) return;
      
      setIsLoadingMembers(true);
      try {
        const members = await apiClient.getWorkspaceMembers(currentWorkspace.id);
        setWorkspaceMembers(members);
      } catch (error) {
        console.error('Error loading workspace members:', error);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    loadWorkspaceMembers();
  }, [currentWorkspace?.id]);

  // Load Asana integration data
  useEffect(() => {
    const loadAsanaIntegration = async () => {
      try {
        const integration = await apiClient.getIntegration('asana');
        if (integration && integration.is_active) {
          setAsanaIntegration(integration);
          
          // Load workspaces
          const { workspaces } = await apiClient.getAsanaWorkspaces();
          setAsanaWorkspaces(workspaces || []);
          
          // If integration has a default workspace, load its projects
          if (integration.config?.workspace_gid) {
            setSelectedAsanaWorkspace(integration.config.workspace_gid);
            await loadAsanaProjects(integration.config.workspace_gid);
          }
        }
      } catch (error) {
        console.error('Error loading Asana integration:', error);
      }
    };

    const loadAsanaProjects = async (workspaceId: string) => {
      if (!workspaceId) return;
      
      setIsLoadingAsanaData(true);
      try {
        const { projects } = await apiClient.getAsanaProjects(workspaceId);
        setAsanaProjects(projects || []);
      } catch (error) {
        console.error('Error loading Asana projects:', error);
      } finally {
        setIsLoadingAsanaData(false);
      }
    };

    loadAsanaIntegration();
  }, []);

  // Load projects when workspace changes
  useEffect(() => {
    if (selectedAsanaWorkspace) {
      setIsLoadingAsanaData(true);
      apiClient.getAsanaProjects(selectedAsanaWorkspace)
        .then(({ projects }) => setAsanaProjects(projects || []))
        .catch(console.error)
        .finally(() => setIsLoadingAsanaData(false));
    }
  }, [selectedAsanaWorkspace]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (loadingInterval) {
        clearInterval(loadingInterval);
      }
    };
  }, [loadingInterval]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const startGamifiedLoading = () => {
    const loadingSequence = [
      { text: 'workoto...', emoji: '🚀', color: 'text-blue-600' },
      { text: '⚡', emoji: '⚡', color: 'text-green-600' },
      { text: 'workana!', emoji: '🎉', color: 'text-purple-600' }
    ];
    
    let currentIndex = 0;
    setLoadingText(loadingSequence[currentIndex].text);
    setLoadingEmoji(loadingSequence[currentIndex].emoji);
    
    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex < loadingSequence.length) {
        setLoadingText(loadingSequence[currentIndex].text);
        setLoadingEmoji(loadingSequence[currentIndex].emoji);
      } else {
        clearInterval(interval);
        setLoadingInterval(null);
      }
    }, 1500); // Change every 1.5 seconds for more satisfying experience
    
    setLoadingInterval(interval);
    return interval;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.taskName.trim()) {
      alert('Please enter a task name');
      return;
    }

    setIsSubmitting(true);
    const loadingInterval = startGamifiedLoading();
    try {
      const taskData = {
        taskName: formData.taskName.trim(),
        description: formData.description.trim(),
        estimatedTime: formData.estimatedTime || '',
        taskLink: formData.taskLink.trim(),
        priority: formData.priority,
        workspaceId: currentWorkspace?.id,
        assignedTo: formData.assignedTo || undefined,
        asanaProjectId: formData.asanaProjectId || undefined,
      };

      await apiClient.createTaskWithAssignment(taskData);
      
      // Wait for the animation to complete before closing
      setTimeout(() => {
        onTaskCreated();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating task:', error);
      alert(error.message || 'Failed to create task');
      if (loadingInterval) {
        clearInterval(loadingInterval);
        setLoadingInterval(null);
      }
      setIsSubmitting(false);
      setLoadingText('');
      setLoadingEmoji('');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Flame className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {isSubmitting ? (
          /* Full-screen Gamified Loading State */
          <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
            <div className="mb-8">
              <div className="text-8xl mb-4 animate-bounce">
                {loadingEmoji}
              </div>
              <div className="text-4xl font-bold mb-2 animate-pulse">
                {loadingText}
              </div>
              <div className="text-lg text-gray-600">
                Creating your amazing task...
              </div>
            </div>
            
            {/* Progress Dots */}
            <div className="flex space-x-2 mb-6">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
            
            {/* Fun motivational messages */}
            <div className="text-sm text-gray-500 max-w-md">
              {loadingText === 'workoto...' && "🚀 Getting ready to launch your productivity!"}
              {loadingText === '⚡' && "⚡ Powering up your productivity engine!"}
              {loadingText === 'workana!' && "🎉 Your task is ready to conquer the world!"}
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Create New Task</h2>
                  <p className="text-sm text-gray-500">Add a new task to your workflow</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Name *
            </label>
            <input
              type="text"
              value={formData.taskName}
              onChange={(e) => handleInputChange('taskName', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task name..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          {/* Priority and Estimated Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon('low')}
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon('medium')}
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon('high')}
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon('urgent')}
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Time
              </label>
              <input
                type="text"
                value={formData.estimatedTime}
                onChange={(e) => handleInputChange('estimatedTime', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="30 minutes"
              />
            </div>
          </div>

          {/* Task Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Link
            </label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={formData.taskLink}
                onChange={(e) => handleInputChange('taskLink', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/task"
              />
            </div>
          </div>

          {/* Team Assignment */}
          {workspaceMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign To
              </label>
              <Select value={formData.assignedTo} onValueChange={(value) => handleInputChange('assignedTo', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {workspaceMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {member.name || member.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Asana Integration */}
          {asanaIntegration && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">Asana Integration</span>
              </div>
              
              {asanaWorkspaces.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asana Workspace
                  </label>
                  <Select value={selectedAsanaWorkspace} onValueChange={setSelectedAsanaWorkspace}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select workspace..." />
                    </SelectTrigger>
                    <SelectContent>
                      {asanaWorkspaces.map((workspace) => (
                        <SelectItem key={workspace.gid} value={workspace.gid}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedAsanaWorkspace && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asana Project
                  </label>
                  <Select value={formData.asanaProjectId} onValueChange={(value) => handleInputChange('asanaProjectId', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingAsanaData ? "Loading projects..." : "Select project..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {asanaProjects.map((project) => (
                        <SelectItem key={project.gid} value={project.gid}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {loadingText || 'Creating Task...'}
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
