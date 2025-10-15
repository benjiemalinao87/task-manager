import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { getCurrentTimestamp, generateId } from '../utils/crypto';

const integrations = new Hono<{ Bindings: Env }>();

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// GET /api/integrations - Get all user's integrations
integrations.get('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM integrations WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(auth.userId).all();

    return c.json(results || []);
  } catch (error) {
    console.error('Get integrations error:', error);
    return c.json({ error: 'Failed to get integrations' }, 500);
  }
});

// GET /api/integrations/:type - Get specific integration by type
integrations.get('/:type', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const integrationType = c.req.param('type');
    
    if (!['asana', 'resend', 'sendgrid'].includes(integrationType)) {
      return c.json({ error: 'Invalid integration type' }, 400);
    }

    const integration = await c.env.DB.prepare(
      'SELECT * FROM integrations WHERE user_id = ? AND integration_type = ?'
    ).bind(auth.userId, integrationType).first();

    if (!integration) {
      return c.json({ integration: null });
    }

    // Parse config JSON
    let parsedIntegration = { ...integration };
    if (integration.config && typeof integration.config === 'string') {
      try {
        parsedIntegration.config = JSON.parse(integration.config as string);
      } catch {
        parsedIntegration.config = {};
      }
    }

    return c.json(parsedIntegration);
  } catch (error) {
    console.error('Get integration error:', error);
    return c.json({ error: 'Failed to get integration' }, 500);
  }
});

// POST /api/integrations - Create or update integration
integrations.post('/', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { integration_type, api_key, is_active, config } = await c.req.json();

    if (!['asana', 'resend', 'sendgrid'].includes(integration_type)) {
      return c.json({ error: 'Invalid integration type' }, 400);
    }

    if (!api_key) {
      return c.json({ error: 'API key is required' }, 400);
    }

    // Validate Asana config if provided
    if (integration_type === 'asana' && config) {
      const configObj = typeof config === 'string' ? JSON.parse(config) : config;
      
      if (configObj.default_assignee_email) {
        if (!isValidEmail(configObj.default_assignee_email)) {
          return c.json({ 
            error: 'Invalid email format for default assignee. Please use a valid email address (e.g., user@example.com)' 
          }, 400);
        }
      }
    }

    // Check if integration already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM integrations WHERE user_id = ? AND integration_type = ?'
    ).bind(auth.userId, integration_type).first<{ id: string }>();

    const now = getCurrentTimestamp();
    const configStr = typeof config === 'string' ? config : JSON.stringify(config || {});

    if (existing) {
      // Update existing
      await c.env.DB.prepare(`
        UPDATE integrations 
        SET api_key = ?, is_active = ?, config = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).bind(
        api_key,
        is_active ? 1 : 0,
        configStr,
        now,
        existing.id,
        auth.userId
      ).run();

      const updated = await c.env.DB.prepare(
        'SELECT * FROM integrations WHERE id = ?'
      ).bind(existing.id).first();

      return c.json({ 
        integration: updated,
        message: 'Integration updated successfully' 
      });
    } else {
      // Create new
      const integrationId = generateId();
      
      await c.env.DB.prepare(`
        INSERT INTO integrations (id, user_id, integration_type, api_key, is_active, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        integrationId,
        auth.userId,
        integration_type,
        api_key,
        is_active ? 1 : 0,
        configStr,
        now,
        now
      ).run();

      const created = await c.env.DB.prepare(
        'SELECT * FROM integrations WHERE id = ?'
      ).bind(integrationId).first();

      return c.json({ 
        integration: created,
        message: 'Integration created successfully' 
      }, 201);
    }
  } catch (error) {
    console.error('Save integration error:', error);
    return c.json({ error: 'Failed to save integration' }, 500);
  }
});

// DELETE /api/integrations/:type - Delete integration
integrations.delete('/:type', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const integrationType = c.req.param('type');
    
    if (!['asana', 'resend', 'sendgrid'].includes(integrationType)) {
      return c.json({ error: 'Invalid integration type' }, 400);
    }

    await c.env.DB.prepare(
      'DELETE FROM integrations WHERE user_id = ? AND integration_type = ?'
    ).bind(auth.userId, integrationType).run();

    return c.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    console.error('Delete integration error:', error);
    return c.json({ error: 'Failed to delete integration' }, 500);
  }
});

// POST /api/integrations/asana/test - Test Asana connection
integrations.post('/asana/test', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { api_key } = await c.req.json();

    if (!api_key) {
      return c.json({ error: 'API key is required' }, 400);
    }

    // Test Asana API
    const response = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return c.json({ error: 'Invalid Asana API key' }, 400);
    }

    const data = await response.json();
    
    return c.json({ 
      success: true,
      user: data.data 
    });
  } catch (error) {
    console.error('Test Asana error:', error);
    return c.json({ error: 'Failed to test Asana connection' }, 500);
  }
});

// GET /api/integrations/asana/workspaces - Get Asana workspaces
integrations.get('/asana/workspaces', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const integration = await c.env.DB.prepare(
      'SELECT api_key FROM integrations WHERE user_id = ? AND integration_type = ?'
    ).bind(auth.userId, 'asana').first<{ api_key: string }>();

    if (!integration) {
      return c.json({ error: 'Asana not configured' }, 404);
    }

    const response = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: {
        'Authorization': `Bearer ${integration.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch workspaces' }, 400);
    }

    const data = await response.json();
    return c.json({ workspaces: data.data });
  } catch (error) {
    console.error('Get workspaces error:', error);
    return c.json({ error: 'Failed to get workspaces' }, 500);
  }
});

// GET /api/integrations/asana/projects - Get Asana projects
integrations.get('/asana/projects', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const workspaceId = c.req.query('workspace_id');

    if (!workspaceId) {
      return c.json({ error: 'workspace_id is required' }, 400);
    }

    const integration = await c.env.DB.prepare(
      'SELECT api_key FROM integrations WHERE user_id = ? AND integration_type = ?'
    ).bind(auth.userId, 'asana').first<{ api_key: string }>();

    if (!integration) {
      return c.json({ error: 'Asana not configured' }, 404);
    }

    const response = await fetch(
      `https://app.asana.com/api/1.0/workspaces/${workspaceId}/projects?opt_fields=name`,
      {
        headers: {
          'Authorization': `Bearer ${integration.api_key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch projects' }, 400);
    }

    const data = await response.json();
    return c.json({ projects: data.data });
  } catch (error) {
    console.error('Get projects error:', error);
    return c.json({ error: 'Failed to get projects' }, 500);
  }
});

// GET /api/integrations/asana/projects/:projectId/tasks - Get Asana project tasks
integrations.get('/asana/projects/:projectId/tasks', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const projectId = c.req.param('projectId');

    if (!projectId) {
      return c.json({ error: 'projectId is required' }, 400);
    }

    const integration = await c.env.DB.prepare(
      'SELECT api_key FROM integrations WHERE user_id = ? AND integration_type = ?'
    ).bind(auth.userId, 'asana').first<{ api_key: string }>();

    if (!integration) {
      return c.json({ error: 'Asana not configured' }, 404);
    }

    console.log(`📥 Fetching tasks from Asana project: ${projectId}`);
    
    const response = await fetch(
      `https://app.asana.com/api/1.0/projects/${projectId}/tasks?opt_fields=name,notes,due_on,completed,assignee.name`,
      {
        headers: {
          'Authorization': `Bearer ${integration.api_key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Asana API error:', response.status, errorText);
      return c.json({ 
        error: 'Failed to fetch tasks from Asana', 
        details: errorText,
        status: response.status 
      }, 400);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.data?.length || 0} tasks from Asana`);
    return c.json({ tasks: data.data });
  } catch (error) {
    console.error('Get project tasks error:', error);
    return c.json({ error: 'Failed to get project tasks' }, 500);
  }
});

// POST /api/integrations/asana/import - Import Asana task
integrations.post('/asana/import', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { asanaTaskId, taskName, description, estimatedTime, priority, asanaProjectId } = await c.req.json();

    if (!asanaTaskId || !taskName || !description || !estimatedTime) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Check if task already exists
    const existingTask = await c.env.DB.prepare(
      'SELECT id FROM tasks WHERE user_id = ? AND asana_task_id = ?'
    ).bind(auth.userId, asanaTaskId).first<{ id: string }>();

    if (existingTask) {
      return c.json({ error: 'Task already imported' }, 400);
    }

    // Create the task in our system
    const taskId = generateId();
    const now = getCurrentTimestamp();
    const taskPriority = priority || 'medium';

    await c.env.DB.prepare(`
      INSERT INTO tasks (
        id, user_id, task_name, description, estimated_time,
        priority, asana_task_id, started_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId, auth.userId, taskName, description, estimatedTime,
      taskPriority, asanaTaskId, now, now, now
    ).run();

    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(taskId).first();

    return c.json(task, 201);
  } catch (error) {
    console.error('Import Asana task error:', error);
    return c.json({ error: 'Failed to import task' }, 500);
  }
});

export default integrations;

