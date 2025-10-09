import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { email, taskName, description, estimatedTime, taskLink, createdAt } = await req.json();

    if (!email || !taskName || !createdAt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const createdDate = new Date(createdAt);

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
    .link {
      color: #2563eb;
      text-decoration: none;
      word-break: break-all;
    }
    .link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">✅</div>
      <h1>New Task Created!</h1>
      <p>Benjie Malinao just added a new task</p>
    </div>

    <div class="content">
      <div style="text-align: center;">
        <div class="status-badge">✨ Task Added to Workflow</div>
      </div>

      <div class="task-name">${taskName}</div>

      <div class="task-details">
        ${description ? `
        <div class="detail-row">
          <div class="detail-label">📝 Description:</div>
          <div class="detail-value">${description}</div>
        </div>
        ` : ''}
        
        <div class="detail-row">
          <div class="detail-label">⏱️ Estimated Time:</div>
          <div class="detail-value"><strong>${estimatedTime}</strong></div>
        </div>

        ${taskLink ? `
        <div class="detail-row">
          <div class="detail-label">🔗 Task Link:</div>
          <div class="detail-value"><a href="${taskLink}" class="link">${taskLink}</a></div>
        </div>
        ` : ''}
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

    const emailAddresses = email.split(',').map((e: string) => e.trim()).filter((e: string) => e.length > 0);
    const recipients = emailAddresses.map((e: string) => ({ email: e }));

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
              subject: `✅ New Task: ${taskName}`,
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

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-task-created-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});