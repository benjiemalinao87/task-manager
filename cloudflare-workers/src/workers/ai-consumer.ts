import type { Env, AIMessage } from '../types';
import { getCurrentTimestamp } from '../utils/crypto';

export default {
  async queue(batch: MessageBatch<AIMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const { userId, taskId, taskName, description, estimatedTime, sendEmail } = message.body;

        console.log(`Processing AI summary for task ${taskId}`);

        // Verify task exists and belongs to user
        const task = await env.DB.prepare(
          'SELECT id FROM tasks WHERE id = ? AND user_id = ?'
        ).bind(taskId, userId).first();

        if (!task) {
          console.error(`Task ${taskId} not found for user ${userId}`);
          message.ack();
          continue;
        }

        // Get user's token usage and limits
        const user = await env.DB.prepare(
          'SELECT ai_tokens_used, ai_tokens_limit, ai_tokens_reset_at, plan_name FROM users WHERE id = ?'
        ).bind(userId).first<{
          ai_tokens_used: number;
          ai_tokens_limit: number;
          ai_tokens_reset_at: string;
          plan_name: string;
        }>();

        if (!user) {
          console.error(`User ${userId} not found`);
          message.ack();
          continue;
        }

        // Check if token reset date has passed
        const now = new Date();
        const resetDate = new Date(user.ai_tokens_reset_at);
        
        if (now >= resetDate) {
          // Reset tokens for new month
          await env.DB.prepare(
            'UPDATE users SET ai_tokens_used = 0, ai_tokens_reset_at = ? WHERE id = ?'
          ).bind(
            new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            userId
          ).run();
          
          user.ai_tokens_used = 0;
        }

        // Check if user has exceeded token limit (only for non-Pro users)
        if (user.plan_name !== 'Pro' && user.ai_tokens_used >= user.ai_tokens_limit) {
          console.error(`User ${userId} has exceeded AI token limit`);
          message.ack();
          continue;
        }

        // Call OpenAI API
        console.log('Calling OpenAI API...');
        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
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
          message.retry();
          continue;
        }

        const openaiData = await openaiResponse.json();
        const summary = openaiData.choices[0]?.message?.content || "";
        const tokensUsed = openaiData.usage?.total_tokens || 0;

        console.log(`AI summary generated: ${summary.substring(0, 50)}...`);
        console.log(`Tokens used: ${tokensUsed}`);

        // Update task with AI summary
        await env.DB.prepare(
          'UPDATE tasks SET ai_summary = ?, updated_at = ? WHERE id = ? AND user_id = ?'
        ).bind(summary, getCurrentTimestamp(), taskId, userId).run();

        console.log(`Task ${taskId} updated with AI summary`);

        // Update user's token usage
        await env.DB.prepare(
          'UPDATE users SET ai_tokens_used = ai_tokens_used + ? WHERE id = ?'
        ).bind(tokensUsed, userId).run();

        console.log(`User ${userId} token usage updated: +${tokensUsed}`);

        // Send email notification with AI summary if requested
        if (sendEmail) {
          const settings = await env.DB.prepare(
            'SELECT default_email, notify_task_created FROM settings WHERE user_id = ?'
          ).bind(userId).first<{ default_email: string; notify_task_created: number }>();

          if (settings && settings.default_email && settings.notify_task_created) {
            await env.EMAIL_QUEUE.send({
              type: 'task_created',
              userId,
              email: settings.default_email,
              taskId,
              task: {
                name: taskName,
                description,
                estimatedTime: estimatedTime || 'Not specified',
                aiSummary: summary
              }
            });
            console.log(`✅ Task creation email queued for ${settings.default_email} with AI summary`);
          } else {
            console.log('Email notification disabled or no default email set');
          }
        }

        message.ack();
        console.log(`✅ AI summary processing complete for task ${taskId}`);

      } catch (error) {
        console.error('AI summary processing failed:', error);
        message.retry();
      }
    }
  }
};

