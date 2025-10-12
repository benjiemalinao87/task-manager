import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { getCurrentTimestamp } from '../utils/crypto';

const ai = new Hono<{ Bindings: Env }>();

// POST /api/ai/generate-summary
ai.post('/generate-summary', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    const { taskId, taskName, description, estimatedTime, sendEmail } = await c.req.json();

    if (!taskId || !taskName || !description) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Verify task belongs to user
    const task = await c.env.DB.prepare(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?'
    ).bind(taskId, auth.userId).first();

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Get user's token usage and limits
    const user = await c.env.DB.prepare(
      'SELECT ai_tokens_used, ai_tokens_limit, ai_tokens_reset_at, plan_name FROM users WHERE id = ?'
    ).bind(auth.userId).first<{
      ai_tokens_used: number;
      ai_tokens_limit: number;
      ai_tokens_reset_at: string;
      plan_name: string;
    }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if token reset date has passed
    const now = new Date();
    const resetDate = new Date(user.ai_tokens_reset_at);
    
    if (now >= resetDate) {
      // Reset tokens for new month
      await c.env.DB.prepare(
        'UPDATE users SET ai_tokens_used = 0, ai_tokens_reset_at = ? WHERE id = ?'
      ).bind(
        new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        auth.userId
      ).run();
      
      user.ai_tokens_used = 0;
    }

    // Check if user has exceeded token limit (only for non-Pro users)
    if (user.plan_name !== 'Pro' && user.ai_tokens_used >= user.ai_tokens_limit) {
      return c.json({ 
        error: 'AI token limit reached',
        message: `You've used ${user.ai_tokens_used} of your ${user.ai_tokens_limit} monthly AI tokens. Upgrade to Pro for unlimited access!`,
        tokensUsed: user.ai_tokens_used,
        tokensLimit: user.ai_tokens_limit,
        resetAt: user.ai_tokens_reset_at
      }, 429);
    }

    // Call OpenAI API
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${c.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that creates concise task summaries. Summarize the task in 2-3 sentences, highlighting the key objectives and deliverables."
            },
            {
              role: "user",
              content: `Task: ${taskName}\n\nDescription: ${description}`
            }
          ],
          temperature: 0.7,
          max_tokens: 150,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return c.json({ error: 'Failed to generate AI summary' }, 500);
    }

    const openaiData = await openaiResponse.json();
    const summary = openaiData.choices[0]?.message?.content || "";
    const tokensUsed = openaiData.usage?.total_tokens || 0;

    // Update task with AI summary
    await c.env.DB.prepare(
      'UPDATE tasks SET ai_summary = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(summary, getCurrentTimestamp(), taskId, auth.userId).run();

    // Update user's token usage
    await c.env.DB.prepare(
      'UPDATE users SET ai_tokens_used = ai_tokens_used + ? WHERE id = ?'
    ).bind(tokensUsed, auth.userId).run();

    const newTokensUsed = user.ai_tokens_used + tokensUsed;
    const remaining = user.ai_tokens_limit - newTokensUsed;

    // Send email notification with AI summary if requested
    if (sendEmail) {
      const settings = await c.env.DB.prepare(
        'SELECT default_email, notify_task_created FROM settings WHERE user_id = ?'
      ).bind(auth.userId).first<{ default_email: string; notify_task_created: number }>();

      if (settings && settings.default_email && settings.notify_task_created) {
        await c.env.EMAIL_QUEUE.send({
          type: 'task_created',
          userId: auth.userId,
          email: settings.default_email,
          taskId,
          task: {
            name: taskName,
            description,
            estimatedTime: estimatedTime || 'Not specified',
            aiSummary: summary
          }
        });
      }
    }

    return c.json({ 
      success: true, 
      summary,
      tokensUsed: tokensUsed,
      totalTokensUsed: newTokensUsed,
      tokensRemaining: user.plan_name === 'Pro' ? 'unlimited' : remaining,
      tokensLimit: user.plan_name === 'Pro' ? 'unlimited' : user.ai_tokens_limit
    });

  } catch (error) {
    console.error('AI summary error:', error);
    return c.json({ error: 'Failed to generate summary' }, 500);
  }
});

// GET /api/ai/token-usage
ai.get('/token-usage', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);
  if (auth instanceof Response) return auth;

  try {
    // Get user's token usage and limits
    const user = await c.env.DB.prepare(
      'SELECT ai_tokens_used, ai_tokens_limit, ai_tokens_reset_at, plan_name FROM users WHERE id = ?'
    ).bind(auth.userId).first<{
      ai_tokens_used: number;
      ai_tokens_limit: number;
      ai_tokens_reset_at: string;
      plan_name: string;
    }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if token reset date has passed
    const now = new Date();
    const resetDate = new Date(user.ai_tokens_reset_at);
    
    if (now >= resetDate) {
      // Reset tokens for new month
      const newResetDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await c.env.DB.prepare(
        'UPDATE users SET ai_tokens_used = 0, ai_tokens_reset_at = ? WHERE id = ?'
      ).bind(newResetDate, auth.userId).run();
      
      user.ai_tokens_used = 0;
      user.ai_tokens_reset_at = newResetDate;
    }

    const remaining = user.plan_name === 'Pro' 
      ? 'unlimited' 
      : Math.max(0, user.ai_tokens_limit - user.ai_tokens_used);

    return c.json({ 
      planName: user.plan_name,
      tokensUsed: user.ai_tokens_used,
      tokensLimit: user.plan_name === 'Pro' ? 'unlimited' : user.ai_tokens_limit,
      tokensRemaining: remaining,
      resetAt: user.ai_tokens_reset_at,
      percentageUsed: user.plan_name === 'Pro' ? 0 : (user.ai_tokens_used / user.ai_tokens_limit) * 100
    });

  } catch (error) {
    console.error('Token usage error:', error);
    return c.json({ error: 'Failed to get token usage' }, 500);
  }
});

export default ai;
