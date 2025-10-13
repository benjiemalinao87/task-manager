import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      taskId,
      to,
      taskName,
      description,
      estimatedTime,
      actualTime,
      taskLink,
      aiSummary,
      notes,
    } = await req.json();

    if (!taskId || !to || !taskName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    const emailContent = `
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
    .link {
      color: #2563eb;
      text-decoration: none;
      word-break: break-all;
    }
    .link:hover {
      text-decoration: underline;
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
      <p>Benjie Malinao just finished a task</p>
    </div>

    <div class="content">
      <div style="text-align: center;">
        <div class="status-badge">✅ Successfully Completed</div>
      </div>

      <div class="task-name">${taskName}</div>

      ${aiSummary && aiSummary !== 'Summary not available' ? `
      <div class="ai-summary-box">
        <strong>🤖 AI SUMMARY</strong>
        <p>${aiSummary}</p>
      </div>
      ` : ''}

      ${notes ? `
      <div class="notes-box">
        <strong>📝 COMPLETION NOTE</strong>
        <p>${notes}</p>
      </div>
      ` : ''}

      <div class="task-details">
        ${description ? `
        <div class="detail-row">
          <div class="detail-label">📋 Description:</div>
          <div class="detail-value">${description}</div>
        </div>
        ` : ''}
        
        <div class="detail-row">
          <div class="detail-label">⏱️ Estimated Time:</div>
          <div class="detail-value"><strong>${estimatedTime}</strong></div>
        </div>

        <div class="detail-row">
          <div class="detail-label">⏰ Actual Time:</div>
          <div class="detail-value"><strong style="color: #10b981;">${actualTime}</strong></div>
        </div>

        ${taskLink && taskLink !== 'No link provided' ? `
        <div class="detail-row">
          <div class="detail-label">🔗 Task Link:</div>
          <div class="detail-value"><a href="${taskLink}" class="link">${taskLink}</a></div>
        </div>
        ` : ''}
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

      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <p style="margin: 0; color: #065f46; font-size: 15px;">
          <strong>🎯 Great Job!</strong> Another task completed! Keep up the excellent momentum and continue making progress.
        </p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0;">This is an automated notification from Task Manager</p>
      <p style="margin: 8px 0 0 0; color: #9ca3af;">Celebrating your success, one task at a time!</p>
    </div>
  </div>
</body>
</html>
    `;

    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      return new Response(
        JSON.stringify({ error: "SendGrid API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailAddresses = to.split(',').map((email: string) => email.trim()).filter((email: string) => email.length > 0);
    const recipients = emailAddresses.map((email: string) => ({ email }));

    const sendgridResponse = await fetch(
      "https://api.sendgrid.com/v3/mail/send",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: recipients,
              subject: `🎉 Task Completed: ${taskName}`,
            },
          ],
          from: {
            email: "benjie@channelautomation.com",
            name: "Task Manager",
          },
          content: [
            {
              type: "text/html",
              value: emailContent,
            },
          ],
        }),
      }
    );

    if (!sendgridResponse.ok) {
      const errorData = await sendgridResponse.text();
      console.error("SendGrid API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ email_sent: true })
      .eq("id", taskId);

    if (updateError) {
      console.error("Database update error:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});