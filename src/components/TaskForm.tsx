import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TaskFormProps {
  onTaskCreated: () => void;
}

export function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    taskName: '',
    description: '',
    estimatedTime: '',
    taskLink: '',
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const createdAtTime = new Date().toISOString();
      const { data: task, error: insertError } = await supabase
        .from('tasks')
        .insert({
          task_name: formData.taskName,
          description: formData.description,
          estimated_time: formData.estimatedTime,
          task_link: formData.taskLink || null,
          status: 'in_progress',
          started_at: createdAtTime,
        })
        .select()
        .maybeSingle();

      if (insertError) throw insertError;
      if (!task) throw new Error('Task creation failed');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-summary`;
      const summaryResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.id,
          taskName: formData.taskName,
          description: formData.description,
        }),
      });

      if (!summaryResponse.ok) {
        console.error('Failed to generate AI summary');
      }

      const { data: settingsData } = await supabase
        .from('settings')
        .select('default_email')
        .maybeSingle();

      const email = settingsData?.default_email;
      if (email) {
        const taskCreatedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-task-created-email`;
        await fetch(taskCreatedUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            taskName: formData.taskName,
            description: formData.description,
            estimatedTime: formData.estimatedTime,
            taskLink: formData.taskLink || null,
            createdAt: createdAtTime,
          }),
        });
      }

      setFormData({
        taskName: '',
        description: '',
        estimatedTime: '',
        taskLink: '',
      });

      onTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Task</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="taskName" className="block text-sm font-medium text-gray-700 mb-1">
            Task Name *
          </label>
          <input
            type="text"
            id="taskName"
            required
            value={formData.taskName}
            onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter task name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe the task in detail"
          />
        </div>

        <div>
          <label htmlFor="estimatedTime" className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Time *
          </label>
          <input
            type="text"
            id="estimatedTime"
            required
            value={formData.estimatedTime}
            onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 2 hours"
          />
        </div>

        <div>
          <label htmlFor="taskLink" className="block text-sm font-medium text-gray-700 mb-1">
            Task Link
          </label>
          <input
            type="url"
            id="taskLink"
            value={formData.taskLink}
            onChange={(e) => setFormData({ ...formData, taskLink: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/task"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </form>
  );
}
