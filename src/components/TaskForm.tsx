import { useState } from 'react';
import { Plus, Loader2, ChevronDown, AlertCircle, AlertTriangle, Flame, FileText } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TaskFormProps {
  onTaskCreated: () => void;
}

export function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    estimatedTime: '',
    taskLink: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiClient.createTask({
        taskName: formData.taskName,
        description: formData.description,
        estimatedTime: formData.estimatedTime,
        taskLink: formData.taskLink || undefined,
        priority: formData.priority,
      });

      setFormData({
        taskName: '',
        description: '',
        estimatedTime: '',
        taskLink: '',
        priority: 'medium',
      });

      setIsExpanded(false);
      onTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Plus className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-800">Create New Task</h2>
            <p className="text-sm text-gray-500 mt-0.5">Add a new task to your workflow</p>
          </div>
        </div>
        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-6 h-6 text-gray-600" />
        </div>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2">
          <div className="space-y-5">
        <div>
          <label htmlFor="taskName" className="block text-sm font-semibold text-gray-700 mb-2">
            Task Name *
          </label>
          <input
            type="text"
            id="taskName"
            required
            value={formData.taskName}
            onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Enter task name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            placeholder="Describe the task in detail"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="estimatedTime" className="block text-sm font-semibold text-gray-700 mb-2">
              Estimated Time *
            </label>
            <input
              type="text"
              id="estimatedTime"
              required
              value={formData.estimatedTime}
              onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="e.g., 2 hours"
            />
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-semibold text-gray-700 mb-2">
              Priority *
            </label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' | 'urgent' })}
            >
              <SelectTrigger className="w-full h-[50px] px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span>Low</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <span>Medium</span>
                  </div>
                </SelectItem>
                <SelectItem value="high" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>High</span>
                  </div>
                </SelectItem>
                <SelectItem value="urgent" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-red-600" />
                    <span>Urgent</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="taskLink" className="block text-sm font-semibold text-gray-700 mb-2">
            Task Link <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            type="url"
            id="taskLink"
            value={formData.taskLink}
            onChange={(e) => setFormData({ ...formData, taskLink: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="https://example.com/task"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.01]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Task...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Task
              </>
            )}
          </button>
        </div>
          </div>
        </form>
      )}
    </div>
  );
}
