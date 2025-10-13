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
    const { email, clockInTime } = await req.json();

    if (!email || !clockInTime) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clockInDate = new Date(clockInTime);

    const pstTime = clockInDate.toLocaleString('en-US', {
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

    const sydneyTime = clockInDate.toLocaleString('en-US', {
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
      max-width: 600px;
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
    .time-section {
      background: #f8fafc;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
    }
    .time-block {
      margin-bottom: 24px;
    }
    .time-block:last-child {
      margin-bottom: 0;
    }
    .time-label {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .time-value {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .timezone-icon {
      font-size: 28px;
    }
    .divider {
      height: 2px;
      background: linear-gradient(to right, transparent, #e5e7eb, transparent);
      margin: 24px 0;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #6b7280;
      font-size: 13px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .message {
      font-size: 18px;
      color: #374151;
      text-align: center;
      margin: 30px 0;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🚀</div>
      <h1>Work Session Started!</h1>
      <p>Ready to be productive</p>
    </div>

    <div class="content">
      <div style="text-align: center;">
        <div class="status-badge">✓ Benjie Malinao Just Clocked In</div>
      </div>

      <div class="message">
        <strong>Let's make today count!</strong><br>
        Your work session has officially begun.
      </div>

      <div class="time-section">
        <div class="time-block">
          <div class="time-label">🇺🇸 Pacific Time (PST/PDT)</div>
          <div class="time-value">
            <span class="timezone-icon">🕐</span>
            <span>${pstTime}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="time-block">
          <div class="time-label">🇦🇺 Sydney Time (AEDT/AEST)</div>
          <div class="time-value">
            <span class="timezone-icon">🕐</span>
            <span>${sydneyTime}</span>
          </div>
        </div>
      </div>

      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <p style="margin: 0; color: #1e40af; font-size: 15px;">
          <strong>💡 Tip:</strong> Stay focused and take regular breaks to maintain peak productivity throughout your session!
        </p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0;">This is an automated notification from Task Manager</p>
      <p style="margin: 8px 0 0 0; color: #9ca3af;">You're doing great! Keep up the excellent work.</p>
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
              subject: "🚀 Benjie Malinao Just Clocked In - Work Session Started!",
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
    console.error("Error in send-clockin-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});