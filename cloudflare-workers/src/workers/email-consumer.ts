import type { Env, EmailMessage } from '../types';

// Default email configuration (YOUR Resend account)
const DEFAULT_FROM_EMAIL = 'task@customerconnects.app';
const DEFAULT_FROM_NAME = 'Task Manager';

export default {
  async queue(batch: MessageBatch<EmailMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const { type, userId, email, task, to, data } = message.body;

        // Handle workspace invitations separately (they don't have userId)
        if (type === 'workspace_invitation') {
          const emailHtml = buildWorkspaceInvitationEmail(data);
          const subject = `You're invited to join ${data.workspace_name} on Workoto`;

          const emailSent = await sendViaResend(
            [to || data.email],
            subject,
            emailHtml,
            env.RESEND_API_KEY,
            DEFAULT_FROM_EMAIL,
            DEFAULT_FROM_NAME
          );

          if (emailSent) {
            console.log(`Workspace invitation email sent to ${to || data.email}`);
            message.ack();
          } else {
            throw new Error('Failed to send workspace invitation email');
          }
          continue;
        }

        // Handle onboarding invitations (viral loop)
        if (type === 'onboarding_invitation') {
          const emailHtml = buildOnboardingInvitationEmail(data);
          const subject = `${data.inviter_name} invited you to Workoto - Boost your productivity together!`;

          const emailSent = await sendViaResend(
            [to || data.email],
            subject,
            emailHtml,
            env.RESEND_API_KEY,
            DEFAULT_FROM_EMAIL,
            DEFAULT_FROM_NAME
          );

          if (emailSent) {
            console.log(`Onboarding invitation email sent to ${to || data.email}`);
            message.ack();
          } else {
            throw new Error('Failed to send onboarding invitation email');
          }
          continue;
        }

        // Get user's name from the database
        const user = await env.DB.prepare(`
          SELECT name FROM users WHERE id = ?
        `).bind(userId).first<{ name: string | null }>();

        const userName = user?.name || 'User';

        // Get user's notification preferences and custom email subjects
        const settings = await env.DB.prepare(`
          SELECT notify_task_created, notify_task_completed, notify_daily_summary, notify_weekly_summary,
                 email_subject_task_created, email_subject_task_completed
          FROM settings 
          WHERE user_id = ?
        `).bind(userId).first<{
          notify_task_created: number;
          notify_task_completed: number;
          notify_daily_summary: number;
          notify_weekly_summary: number;
          email_subject_task_created: string | null;
          email_subject_task_completed: string | null;
        }>();

        // Check if user wants this type of notification
        if (settings) {
          if (type === 'task_created' && !settings.notify_task_created) {
            console.log(`User ${userId} has disabled task_created notifications, skipping`);
            message.ack();
            continue;
          }
          if (type === 'task_completed' && !settings.notify_task_completed) {
            console.log(`User ${userId} has disabled task_completed notifications, skipping`);
            message.ack();
            continue;
          }
          // Future: Check notify_daily_summary and notify_weekly_summary
        }

        let emailHtml = '';
        let subject = '';

        // Build email based on type
        switch (type) {
          case 'task_created':
            // Use custom subject if available, otherwise use default
            if (settings?.email_subject_task_created) {
              subject = settings.email_subject_task_created.replace('{task_name}', task?.name || '');
            } else {
              subject = `New Task: ${task?.name}`;
            }
            emailHtml = buildTaskCreatedEmail(task!, userName);
            break;

          case 'task_completed':
            // Use custom subject if available, otherwise use default
            if (settings?.email_subject_task_completed) {
              subject = settings.email_subject_task_completed.replace('{task_name}', task?.name || '');
            } else {
              subject = `Task Completed: ${task?.name}`;
            }
            emailHtml = buildTaskCompletedEmail(task!, userName);
            break;

          case 'clock_in':
            subject = 'Clocked In';
            emailHtml = buildClockInEmail(userName);
            break;

          case 'daily_report':
            const clockInDate = new Date(message.body.session?.clockIn || new Date());
            subject = `Daily Work Report - ${clockInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' })}`;
            emailHtml = buildDailyReportEmail(message.body.session!, message.body.tasks || [], userName);
            break;

          default:
            console.warn('Unknown email type:', type);
            message.ack();
            continue;
        }

        // Check if user has custom email integration configured
        const userIntegration = await env.DB.prepare(`
          SELECT integration_type, api_key, is_active 
          FROM integrations 
          WHERE user_id = ? 
          AND integration_type IN ('sendgrid', 'resend') 
          AND is_active = 1
          ORDER BY created_at DESC
          LIMIT 1
        `).bind(userId).first();

        // Parse comma-separated emails
        const emailAddresses = email.split(',').map(e => e.trim()).filter(e => e.length > 0);
        
        if (emailAddresses.length === 0) {
          console.error('No valid email addresses found');
          message.ack();
          continue;
        }

        console.log(`Sending email to ${emailAddresses.length} recipient(s): ${emailAddresses.join(', ')}`);

        let emailSent = false;

        // If user has their own integration, use it
        if (userIntegration && userIntegration.api_key) {
          console.log(`Using custom ${userIntegration.integration_type} integration for user ${userId}`);
          
          if (userIntegration.integration_type === 'sendgrid') {
            emailSent = await sendViaSendGrid(
              emailAddresses,
              subject,
              emailHtml,
              userIntegration.api_key as string,
              'noreply@yourdomain.com', // User's custom domain
              'Task Manager'
            );
          } else if (userIntegration.integration_type === 'resend') {
            emailSent = await sendViaResend(
              emailAddresses,
              subject,
              emailHtml,
              userIntegration.api_key as string,
              'noreply@yourdomain.com', // User's custom domain
              'Task Manager'
            );
          }
        } else {
          // Use default Resend integration (customerconnects.com)
          console.log(`Using default Resend integration for user ${userId}`);
          emailSent = await sendViaResend(
            emailAddresses,
            subject,
            emailHtml,
            env.RESEND_API_KEY,
            DEFAULT_FROM_EMAIL,
            DEFAULT_FROM_NAME
          );
        }

        if (!emailSent) {
          throw new Error('Email sending failed');
        }

        console.log(`Email sent successfully to ${emailAddresses.length} recipient(s)`);
        
        // Mark as processed
        message.ack();

      } catch (error) {
        console.error('Email sending failed:', error);
        // Message will be retried automatically (up to 3 times)
        message.retry();
      }
    }
  }
};

// Send email via SendGrid
async function sendViaSendGrid(
  to: string[],
  subject: string,
  html: string,
  apiKey: string,
  fromEmail: string,
  fromName: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ 
          to: to.map(email => ({ email })), 
          subject 
        }],
        from: { email: fromEmail, name: fromName },
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('SendGrid error:', error);
    return false;
  }
}

// Send email via Resend
async function sendViaResend(
  to: string[],
  subject: string,
  html: string,
  apiKey: string,
  fromEmail: string,
  fromName: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Resend error:', error);
    return false;
  }
}

function buildTaskCreatedEmail(task: any, userName: string): string {
  const createdDate = new Date();
  const pstTime = createdDate.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const sydneyTime = createdDate.toLocaleString('en-US', {
    timeZone: 'Australia/Sydney',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 650px;
      margin: 0 auto;
      background-color: white;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 50px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 36px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header p {
      margin: 12px 0 0 0;
      font-size: 18px;
      opacity: 0.95;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .status-badge {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 18px;
      font-weight: 700;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
    }
    .task-details {
      background: #f8fafc;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
    }
    .detail-row {
      display: flex;
      padding: 16px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #6b7280;
      min-width: 140px;
      font-size: 14px;
    }
    .detail-value {
      color: #1f2937;
      font-size: 15px;
      flex: 1;
    }
    .time-section {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 24px;
      margin: 30px 0;
    }
    .time-block {
      margin-bottom: 16px;
    }
    .time-block:last-child {
      margin-bottom: 0;
    }
    .time-label {
      font-size: 12px;
      font-weight: 600;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .time-value {
      font-size: 16px;
      font-weight: 600;
      color: #78350f;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      font-size: 13px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .task-name {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin: 24px 0;
      text-align: center;
      line-height: 1.3;
    }
    .ai-summary-box {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .ai-summary-box strong {
      color: #1e40af;
      font-size: 14px;
    }
    .ai-summary-box p {
      margin: 8px 0 0 0;
      color: #1e3a8a;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">✅</div>
      <h1>New Task Created!</h1>
      <p>${userName} just added a new task</p>
    </div>

    <div class="content">
      <div style="text-align: center;">
        <div class="status-badge">✨ Task Added to Workflow</div>
      </div>

      <div class="task-name">${task.name}</div>

      ${task.aiSummary ? `
      <div class="ai-summary-box">
        <strong>🤖 AI INSIGHT</strong>
        <p>${task.aiSummary}</p>
      </div>
      ` : ''}

      <div class="task-details">
        ${task.description ? `
        <div class="detail-row">
          <div class="detail-label">📝 Description:</div>
          <div class="detail-value">${task.description}</div>
        </div>
        ` : ''}
        
        <div class="detail-row">
          <div class="detail-label">⏱️ Estimated Time:</div>
          <div class="detail-value"><strong>${task.estimatedTime}</strong></div>
        </div>
      </div>

      <div class="time-section">
        <div style="text-align: center; margin-bottom: 20px;">
          <strong style="font-size: 16px; color: #92400e;">🕒 Task Created At</strong>
        </div>
        
        <div class="time-block">
          <div class="time-label">🇺🇸 Pacific Time (PST/PDT)</div>
          <div class="time-value">${pstTime}</div>
        </div>

        <div style="height: 12px;"></div>

        <div class="time-block">
          <div class="time-label">🇦🇺 Sydney Time (AEDT/AEST)</div>
          <div class="time-value">${sydneyTime}</div>
        </div>
      </div>

      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <p style="margin: 0; color: #065f46; font-size: 15px;">
          <strong>🎯 Pro Tip:</strong> Break down large tasks into smaller, manageable chunks for better tracking and motivation!
        </p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0;">This is an automated notification from Task Manager</p>
      <p style="margin: 8px 0 0 0; color: #9ca3af;">Stay organized and crush your goals!</p>
    </div>
  </div>
</body>
</html>
  `;
}

function buildTaskCompletedEmail(task: any, userName: string): string {
  const completedDate = new Date();
  const pstTime = completedDate.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const sydneyTime = completedDate.toLocaleString('en-US', {
    timeZone: 'Australia/Sydney',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 650px;
      margin: 0 auto;
      background-color: white;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 50px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 36px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header p {
      margin: 12px 0 0 0;
      font-size: 18px;
      opacity: 0.95;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .status-badge {
      display: inline-block;
      background: #d1fae5;
      color: #065f46;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 18px;
      font-weight: 700;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
    }
    .task-details {
      background: #f8fafc;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
    }
    .detail-row {
      display: flex;
      padding: 16px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #6b7280;
      min-width: 140px;
      font-size: 14px;
    }
    .detail-value {
      color: #1f2937;
      font-size: 15px;
      flex: 1;
    }
    .time-section {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 24px;
      margin: 30px 0;
    }
    .time-block {
      margin-bottom: 16px;
    }
    .time-block:last-child {
      margin-bottom: 0;
    }
    .time-label {
      font-size: 12px;
      font-weight: 600;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .time-value {
      font-size: 16px;
      font-weight: 600;
      color: #78350f;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      font-size: 13px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .task-name {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin: 24px 0;
      text-align: center;
      line-height: 1.3;
    }
    .ai-summary-box {
      background: #dbeafe;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .ai-summary-box strong {
      color: #1e40af;
      font-size: 14px;
    }
    .ai-summary-box p {
      margin: 8px 0 0 0;
      color: #1e3a8a;
      font-size: 14px;
    }
    .notes-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .notes-box strong {
      color: #92400e;
      font-size: 14px;
    }
    .notes-box p {
      margin: 8px 0 0 0;
      color: #78350f;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🎉</div>
      <h1>Task Completed!</h1>
      <p>${userName} just finished a task</p>
    </div>

    <div class="content">
      <div style="text-align: center;">
        <div class="status-badge">✅ Successfully Completed</div>
      </div>

      <div class="task-name">${task.name}</div>

      ${task.aiSummary && task.aiSummary !== 'Summary not available' ? `
      <div class="ai-summary-box">
        <strong>🤖 AI SUMMARY</strong>
        <p>${task.aiSummary}</p>
      </div>
      ` : ''}

      ${task.notes ? `
      <div class="notes-box">
        <strong>📝 COMPLETION NOTE</strong>
        <p>${task.notes}</p>
      </div>
      ` : ''}

      <div class="task-details">
        ${task.description ? `
        <div class="detail-row">
          <div class="detail-label">📋 Description:</div>
          <div class="detail-value">${task.description}</div>
        </div>
        ` : ''}
        
        <div class="detail-row">
          <div class="detail-label">⏱️ Estimated Time:</div>
          <div class="detail-value"><strong>${task.estimatedTime}</strong></div>
        </div>

        <div class="detail-row">
          <div class="detail-label">⏰ Actual Time:</div>
          <div class="detail-value"><strong style="color: #10b981;">${task.actualTime}</strong></div>
        </div>
      </div>

      <div class="time-section">
        <div style="text-align: center; margin-bottom: 20px;">
          <strong style="font-size: 16px; color: #92400e;">⏰ Completed At</strong>
        </div>
        
        <div class="time-block">
          <div class="time-label">🇺🇸 Pacific Time (PST/PDT)</div>
          <div class="time-value">${pstTime}</div>
        </div>

        <div style="height: 12px;"></div>

        <div class="time-block">
          <div class="time-label">🇦🇺 Sydney Time (AEDT/AEST)</div>
          <div class="time-value">${sydneyTime}</div>
        </div>
      </div>

      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <p style="margin: 0; color: #065f46; font-size: 15px;">
          <strong>🏆 Great Work!</strong> Celebrate your progress and keep the momentum going. You're crushing it!
        </p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0;">This is an automated notification from Task Manager</p>
      <p style="margin: 8px 0 0 0; color: #9ca3af;">Stay organized and crush your goals!</p>
    </div>
  </div>
</body>
</html>
  `;
}

function buildClockInEmail(userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background-color: #f9fafb;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 20px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⏰ Clocked In</h1>
          <p style="margin: 12px 0 0 0; font-size: 18px; opacity: 0.95;">${userName} just started a work session</p>
        </div>
        <div class="content">
          <p style="font-size: 18px;">Work session started!</p>
          <p style="color: #6b7280;">
            Started at ${new Date().toLocaleTimeString()}
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            You will receive a daily report when you clock out.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildDailyReportEmail(session: any, tasks: any[], userName: string): string {
  const clockInDate = new Date(session.clockIn);
  const clockOutDate = new Date(session.clockOut);
  const totalTasks = tasks.length;

  const tasksHtml = tasks.length > 0
    ? tasks.map((task, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 16px 12px; font-weight: 600; color: #374151;">${index + 1}</td>
        <td style="padding: 16px 12px;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${task.taskName}</div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${task.description}</div>
          ${task.aiSummary ? `
            <div style="background: #dbeafe; border-left: 3px solid #3b82f6; padding: 8px 12px; margin-top: 8px; border-radius: 4px; font-size: 13px;">
              <strong style="color: #1e40af;">🤖 AI Summary:</strong> ${task.aiSummary}
            </div>
          ` : ''}
        </td>
        <td style="padding: 16px 12px; text-align: center; color: #059669; font-weight: 500;">${task.estimatedTime}</td>
        <td style="padding: 16px 12px; text-align: center; color: #7c3aed; font-weight: 500;">${task.actualTime}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" style="padding: 32px; text-align: center; color: #9ca3af;">No tasks were completed during this session.</td></tr>';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      padding: 30px;
      background: #f8fafc;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #2563eb;
      margin: 8px 0;
    }
    .stat-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      font-size: 13px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #dcfce7;
      color: #166534;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Daily Work Report</h1>
      <p>${userName}'s work summary for ${clockInDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' })}</p>
    </div>

    <div class="summary-stats">
      <div class="stat-card">
        <div class="stat-label">Total Tasks</div>
        <div class="stat-value">${totalTasks}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Time Worked</div>
        <div class="stat-value" style="font-size: 28px;">${session.durationFormatted}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Status</div>
        <div class="stat-value" style="font-size: 20px;">
          <span class="badge">Completed</span>
        </div>
      </div>
    </div>

    <div class="content">
      <h2 class="section-title">⏰ Session Details</h2>
      <table style="margin-bottom: 30px;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 600; color: #6b7280; width: 150px;">Clock In</td>
          <td style="padding: 12px;">${clockInDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' })}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; font-weight: 600; color: #6b7280;">Clock Out</td>
          <td style="padding: 12px;">${clockOutDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' })}</td>
        </tr>
        <tr>
          <td style="padding: 12px; font-weight: 600; color: #6b7280;">Total Duration</td>
          <td style="padding: 12px; font-weight: 700; color: #2563eb;">${session.durationFormatted}</td>
        </tr>
      </table>

      <h2 class="section-title">✅ Tasks Completed</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Task Details</th>
            <th style="text-align: center; width: 120px;">Estimated</th>
            <th style="text-align: center; width: 120px;">Actual</th>
          </tr>
        </thead>
        <tbody>
          ${tasksHtml}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p style="margin: 0;">This is an automated daily report from Task Manager.</p>
      <p style="margin: 8px 0 0 0; color: #9ca3af;">Generated on ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}</p>
    </div>
  </div>
</body>
</html>
  `;
}

function buildWorkspaceInvitationEmail(data: any): string {
  const { workspace_name, inviter_name, role, invitation_link, expires_at } = data;

  const expiresDate = new Date(expires_at);
  const expiresFormatted = expiresDate.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 650px;
      margin: 0 auto;
      background-color: white;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      padding: 50px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 36px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header p {
      margin: 12px 0 0 0;
      font-size: 18px;
      opacity: 0.95;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .invitation-box {
      background: #f8fafc;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
      text-align: center;
    }
    .workspace-name {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin: 16px 0;
    }
    .inviter-text {
      font-size: 16px;
      color: #6b7280;
      margin: 8px 0;
    }
    .role-badge {
      display: inline-block;
      background: #dbeafe;
      color: #1e40af;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 16px 40px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 18px;
      font-weight: 600;
      margin: 24px 0;
      box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 8px rgba(59, 130, 246, 0.4);
    }
    .expiry-notice {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .expiry-notice strong {
      color: #92400e;
      font-size: 14px;
    }
    .expiry-notice p {
      margin: 8px 0 0 0;
      color: #78350f;
      font-size: 14px;
    }
    .features-list {
      background: #f0fdf4;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
      text-align: left;
    }
    .features-list h3 {
      margin: 0 0 16px 0;
      color: #065f46;
      font-size: 16px;
    }
    .features-list ul {
      margin: 0;
      padding-left: 24px;
      color: #047857;
    }
    .features-list li {
      margin: 8px 0;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      font-size: 13px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🎉</div>
      <h1>You're Invited!</h1>
      <p>Join your team on Workoto</p>
    </div>

    <div class="content">
      <div class="invitation-box">
        <p style="font-size: 16px; color: #6b7280; margin: 0;">You've been invited to join</p>
        <div class="workspace-name">${workspace_name}</div>
        <p class="inviter-text">Invited by <strong>${inviter_name || 'a team member'}</strong></p>
        <div class="role-badge">Role: ${role}</div>
      </div>

      <div style="text-align: center;">
        <a href="${invitation_link}" class="cta-button">Accept Invitation</a>
      </div>

      <div class="expiry-notice">
        <strong>⏰ Time Sensitive</strong>
        <p>This invitation expires on ${expiresFormatted}. Accept soon to join your team!</p>
      </div>

      <div class="features-list">
        <h3>🚀 What you can do in Workoto:</h3>
        <ul>
          <li>Collaborate on tasks with your team</li>
          <li>Track time and generate reports</li>
          <li>Assign and manage tasks across the workspace</li>
          <li>View team dashboard and analytics</li>
          <li>Import tasks from Asana and other integrations</li>
        </ul>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-top: 24px; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          If you don't want to accept this invitation, you can safely ignore this email.
        </p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0;">This is an invitation from Workoto Task Manager</p>
      <p style="margin: 8px 0 0 0; color: #9ca3af;">Organize your team, track your progress!</p>
    </div>
  </div>
</body>
</html>
  `;
}

function buildOnboardingInvitationEmail(data: any): string {
  const { inviter_name, inviter_email, workspace_name, signup_link } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 650px;
      margin: 0 auto;
      background-color: white;
    }
    .header {
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      color: white;
      padding: 50px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 36px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header p {
      margin: 12px 0 0 0;
      font-size: 18px;
      opacity: 0.95;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .invitation-box {
      background: linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%);
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
      text-align: center;
      border: 2px solid #e9d5ff;
    }
    .inviter-name {
      font-size: 24px;
      font-weight: 700;
      color: #7c3aed;
      margin: 16px 0;
    }
    .inviter-email {
      font-size: 14px;
      color: #6b7280;
      margin: 8px 0 0 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      color: white;
      padding: 18px 48px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 18px;
      font-weight: 600;
      margin: 32px 0;
      box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 8px rgba(139, 92, 246, 0.4);
    }
    .features-list {
      background: #f0fdf4;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
      border-left: 4px solid #10b981;
    }
    .features-list h3 {
      color: #065f46;
      margin: 0 0 20px 0;
      font-size: 20px;
    }
    .features-list ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .features-list li {
      padding: 12px 0;
      border-bottom: 1px solid #d1fae5;
      display: flex;
      align-items: center;
    }
    .features-list li:last-child {
      border-bottom: none;
    }
    .check-icon {
      color: #10b981;
      font-weight: bold;
      margin-right: 12px;
      font-size: 20px;
    }
    .social-proof {
      background: #fef3c7;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
      border: 2px solid #fcd34d;
    }
    .social-proof p {
      margin: 0;
      color: #78350f;
      font-size: 16px;
      font-weight: 600;
    }
    .footer {
      background: #f3f4f6;
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🚀</div>
      <h1>You've Been Invited!</h1>
      <p>Join Workoto and boost your productivity</p>
    </div>

    <div class="content">
      <div class="invitation-box">
        <p style="margin: 0; font-size: 18px; color: #6b7280;">You've been invited by</p>
        <div class="inviter-name">${inviter_name}</div>
        <div class="inviter-email">${inviter_email}</div>
        ${workspace_name ? `<p style="margin: 20px 0 0 0; font-size: 16px; color: #4b5563;">to join <strong>${workspace_name}</strong> workspace</p>` : ''}
      </div>

      <p style="font-size: 18px; line-height: 1.8; color: #374151;">
        <strong>${inviter_name}</strong> is using <strong>Workoto</strong> to manage tasks, track time, and boost productivity.
        They'd like you to join them for better team collaboration!
      </p>

      <div class="features-list">
        <h3>✨ What You'll Get with Workoto:</h3>
        <ul>
          <li>
            <span class="check-icon">✓</span>
            <span><strong>AI-Powered Task Management</strong> - Smart summaries and insights for every task</span>
          </li>
          <li>
            <span class="check-icon">✓</span>
            <span><strong>Time Tracking</strong> - Know exactly where your time goes</span>
          </li>
          <li>
            <span class="check-icon">✓</span>
            <span><strong>Team Collaboration</strong> - Shared workspaces for seamless teamwork</span>
          </li>
          <li>
            <span class="check-icon">✓</span>
            <span><strong>Smart Notifications</strong> - Stay in the loop with customizable email alerts</span>
          </li>
          <li>
            <span class="check-icon">✓</span>
            <span><strong>Productivity Reports</strong> - Track progress and optimize your workflow</span>
          </li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="${signup_link}" class="cta-button">
          Join ${inviter_name} on Workoto →
        </a>
      </div>

      <div class="social-proof">
        <p>🎉 Early Adopter Plan - Free access to all features!</p>
      </div>

      <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
        When you sign up, you'll automatically be added to ${inviter_name}'s workspace and can start collaborating immediately.
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0; font-weight: 600;">Workoto - AI-Powered Task Management</p>
      <p style="margin: 8px 0 0 0;">Organize your work, track your time, boost your productivity!</p>
    </div>
  </div>
</body>
</html>
  `;
}
