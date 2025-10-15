import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';

const reports = new Hono<{ Bindings: Env }>();

// ============================================
// GET /api/workspaces/:id/reports/hours - Team hours report
// ============================================
reports.get('/:workspaceId/reports/hours', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('workspaceId');

  try {
    const url = new URL(c.req.url);
    const userId = url.searchParams.get('userId'); // Filter by specific user
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const groupBy = url.searchParams.get('groupBy') || 'user'; // 'day', 'week', 'month', 'user'

    // Verify user has access to this workspace
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    // Members can only see their own hours, admins and owners can see all
    const canViewAll = membership.role === 'owner' || membership.role === 'admin';
    const targetUserId = canViewAll ? (userId || null) : auth.userId;

    // Build query for total hours
    let totalQuery = `
      SELECT
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COUNT(*) as total_sessions
      FROM time_sessions
      WHERE workspace_id = ?
    `;

    const totalBindings: any[] = [workspaceId];

    if (targetUserId) {
      totalQuery += ` AND user_id = ?`;
      totalBindings.push(targetUserId);
    }

    if (dateFrom) {
      totalQuery += ` AND date(clock_in) >= date(?)`;
      totalBindings.push(dateFrom);
    }

    if (dateTo) {
      totalQuery += ` AND date(clock_in) <= date(?)`;
      totalBindings.push(dateTo);
    }

    const totalResult = await c.env.DB.prepare(totalQuery)
      .bind(...totalBindings)
      .first<{ total_minutes: number; total_sessions: number }>();

    const totalHours = totalResult ? (totalResult.total_minutes / 60).toFixed(2) : '0.00';

    // Build query for breakdown by user
    let breakdownQuery = `
      SELECT
        ts.user_id,
        u.name as user_name,
        u.email as user_email,
        COALESCE(SUM(ts.duration_minutes), 0) as total_minutes,
        COUNT(ts.id) as session_count,
        MIN(ts.clock_in) as first_session,
        MAX(ts.clock_out) as last_session,
        (SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND assigned_to = ts.user_id) as assigned_tasks,
        (SELECT COUNT(*) FROM tasks WHERE workspace_id = ? AND assigned_to = ts.user_id AND status = 'completed') as completed_tasks
      FROM time_sessions ts
      INNER JOIN users u ON ts.user_id = u.id
      WHERE ts.workspace_id = ?
    `;

    const breakdownBindings: any[] = [workspaceId, workspaceId, workspaceId];

    if (targetUserId) {
      breakdownQuery += ` AND ts.user_id = ?`;
      breakdownBindings.push(targetUserId);
    }

    if (dateFrom) {
      breakdownQuery += ` AND date(ts.clock_in) >= date(?)`;
      breakdownBindings.push(dateFrom);
    }

    if (dateTo) {
      breakdownQuery += ` AND date(ts.clock_in) <= date(?)`;
      breakdownBindings.push(dateTo);
    }

    breakdownQuery += ` GROUP BY ts.user_id, u.name, u.email`;
    breakdownQuery += ` ORDER BY total_minutes DESC`;

    const breakdownResult = await c.env.DB.prepare(breakdownQuery)
      .bind(...breakdownBindings)
      .all();

    const breakdown = (breakdownResult.results || []).map((row: any) => ({
      user_id: row.user_id,
      name: row.user_name,  // Frontend expects 'name'
      user_name: row.user_name,
      user_email: row.user_email,
      hours: (row.total_minutes / 60).toFixed(2),
      total_minutes: row.total_minutes,  // Frontend expects 'total_minutes'
      minutes: row.total_minutes,
      session_count: row.session_count,
      first_session: row.first_session,
      last_session: row.last_session,
      assigned_tasks: row.assigned_tasks,
      completed_tasks: row.completed_tasks
    }));

    // Get detailed time log if requested
    let detailedLog = null;
    if (url.searchParams.get('includeDetails') === 'true') {
      let detailQuery = `
        SELECT
          ts.id,
          ts.user_id,
          u.name as user_name,
          u.email as user_email,
          ts.clock_in,
          ts.clock_out,
          ts.duration_minutes,
          date(ts.clock_in) as work_date
        FROM time_sessions ts
        INNER JOIN users u ON ts.user_id = u.id
        WHERE ts.workspace_id = ?
      `;

      const detailBindings: any[] = [workspaceId];

      if (targetUserId) {
        detailQuery += ` AND ts.user_id = ?`;
        detailBindings.push(targetUserId);
      }

      if (dateFrom) {
        detailQuery += ` AND date(ts.clock_in) >= date(?)`;
        detailBindings.push(dateFrom);
      }

      if (dateTo) {
        detailQuery += ` AND date(ts.clock_in) <= date(?)`;
        detailBindings.push(dateTo);
      }

      detailQuery += ` ORDER BY ts.clock_in DESC LIMIT 100`;

      const detailResult = await c.env.DB.prepare(detailQuery)
        .bind(...detailBindings)
        .all();

      detailedLog = (detailResult.results || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name,
        user_email: row.user_email,
        clock_in: row.clock_in,
        clock_out: row.clock_out,
        duration: row.duration_minutes ? `${Math.floor(row.duration_minutes / 60)}h ${row.duration_minutes % 60}m` : null,
        work_date: row.work_date
      }));
    }

    return c.json({
      workspace_id: workspaceId,
      total_hours: parseFloat(totalHours),
      total_minutes: totalResult?.total_minutes || 0,  // Frontend expects 'total_minutes'
      total_sessions: totalResult?.total_sessions || 0,
      breakdown: breakdown,
      detailed_log: detailedLog,
      filters: {
        user_id: targetUserId,
        date_from: dateFrom,
        date_to: dateTo,
        group_by: groupBy
      }
    });

  } catch (error) {
    console.error('Get hours report error:', error);
    return c.json({ error: 'Failed to generate hours report' }, 500);
  }
});

// ============================================
// GET /api/workspaces/:id/reports/tasks - Team tasks report
// ============================================
reports.get('/:workspaceId/reports/tasks', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('workspaceId');

  try {
    const url = new URL(c.req.url);
    const userId = url.searchParams.get('userId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const status = url.searchParams.get('status');

    // Verify user has access to this workspace
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    const canViewAll = membership.role === 'owner' || membership.role === 'admin';
    const targetUserId = canViewAll ? (userId || null) : auth.userId;

    // Get overall stats
    let statsQuery = `
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_tasks,
        SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned_tasks
      FROM tasks
      WHERE workspace_id = ?
    `;

    const statsBindings: any[] = [workspaceId];

    if (targetUserId) {
      statsQuery += ` AND assigned_to = ?`;
      statsBindings.push(targetUserId);
    }

    if (dateFrom) {
      statsQuery += ` AND date(created_at) >= date(?)`;
      statsBindings.push(dateFrom);
    }

    if (dateTo) {
      statsQuery += ` AND date(created_at) <= date(?)`;
      statsBindings.push(dateTo);
    }

    if (status) {
      statsQuery += ` AND status = ?`;
      statsBindings.push(status);
    }

    const statsResult = await c.env.DB.prepare(statsQuery)
      .bind(...statsBindings)
      .first();

    // Get breakdown by member
    let memberQuery = `
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM workspace_members wm
      INNER JOIN users u ON wm.user_id = u.id
      LEFT JOIN tasks t ON t.assigned_to = u.id AND t.workspace_id = wm.workspace_id
    `;

    const memberBindings: any[] = [];

    memberQuery += ` WHERE wm.workspace_id = ?`;
    memberBindings.push(workspaceId);

    if (targetUserId) {
      memberQuery += ` AND wm.user_id = ?`;
      memberBindings.push(targetUserId);
    }

    if (dateFrom) {
      memberQuery += ` AND (t.id IS NULL OR date(t.created_at) >= date(?))`;
      memberBindings.push(dateFrom);
    }

    if (dateTo) {
      memberQuery += ` AND (t.id IS NULL OR date(t.created_at) <= date(?))`;
      memberBindings.push(dateTo);
    }

    if (status) {
      memberQuery += ` AND (t.id IS NULL OR t.status = ?)`;
      memberBindings.push(status);
    }

    memberQuery += ` GROUP BY u.id, u.name, u.email`;
    memberQuery += ` ORDER BY completed DESC, total_tasks DESC`;

    const memberResult = await c.env.DB.prepare(memberQuery)
      .bind(...memberBindings)
      .all();

    return c.json({
      workspace_id: workspaceId,
      stats: statsResult,
      by_member: memberResult.results || [],
      filters: {
        user_id: targetUserId,
        date_from: dateFrom,
        date_to: dateTo,
        status: status
      }
    });

  } catch (error) {
    console.error('Get tasks report error:', error);
    return c.json({ error: 'Failed to generate tasks report' }, 500);
  }
});

// ============================================
// GET /api/workspaces/:id/reports/performance - Team performance overview
// ============================================
reports.get('/:workspaceId/reports/performance', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  const workspaceId = c.req.param('workspaceId');

  try {
    // Verify user has access
    const membership = await c.env.DB.prepare(`
      SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ?
    `).bind(workspaceId, auth.userId).first<{ role: string }>();

    if (!membership) {
      return c.json({ error: 'Workspace not found or access denied' }, 404);
    }

    // Only owners and admins can view full performance reports
    if (membership.role === 'member') {
      return c.json({ error: 'Permission denied. Only owners and admins can view performance reports' }, 403);
    }

    const url = new URL(c.req.url);
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    // Get comprehensive member performance
    let query = `
      SELECT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        wm.role,
        COUNT(DISTINCT t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as active_tasks,
        COALESCE(SUM(ts.duration_minutes), 0) as total_minutes,
        COUNT(DISTINCT ts.id) as time_sessions
      FROM workspace_members wm
      INNER JOIN users u ON wm.user_id = u.id
      LEFT JOIN tasks t ON t.assigned_to = u.id AND t.workspace_id = wm.workspace_id
      LEFT JOIN time_sessions ts ON ts.user_id = u.id AND ts.workspace_id = wm.workspace_id
      WHERE wm.workspace_id = ?
    `;

    const bindings: any[] = [workspaceId];

    if (dateFrom) {
      query += ` AND (t.id IS NULL OR date(t.created_at) >= date(?))`;
      query += ` AND (ts.id IS NULL OR date(ts.clock_in) >= date(?))`;
      bindings.push(dateFrom, dateFrom);
    }

    if (dateTo) {
      query += ` AND (t.id IS NULL OR date(t.created_at) <= date(?))`;
      query += ` AND (ts.id IS NULL OR date(ts.clock_in) <= date(?))`;
      bindings.push(dateTo, dateTo);
    }

    query += ` GROUP BY u.id, u.name, u.email, wm.role`;
    query += ` ORDER BY completed_tasks DESC, total_minutes DESC`;

    const result = await c.env.DB.prepare(query).bind(...bindings).all();

    const performance = (result.results || []).map((row: any) => ({
      user_id: row.user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      role: row.role,
      total_tasks: row.total_tasks,
      completed_tasks: row.completed_tasks,
      active_tasks: row.active_tasks,
      completion_rate: row.total_tasks > 0 ? ((row.completed_tasks / row.total_tasks) * 100).toFixed(1) : '0.0',
      total_hours: (row.total_minutes / 60).toFixed(2),
      time_sessions: row.time_sessions
    }));

    return c.json({
      workspace_id: workspaceId,
      members: performance,
      filters: {
        date_from: dateFrom,
        date_to: dateTo
      }
    });

  } catch (error) {
    console.error('Get performance report error:', error);
    return c.json({ error: 'Failed to generate performance report' }, 500);
  }
});

export default reports;
