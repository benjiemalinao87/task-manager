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
    const { sessionId, email } = await req.json();

    if (!sessionId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: session, error: sessionError } = await supabase
      .from("time_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) throw new Error("Session not found");

    const clockInDate = new Date(session.clock_in);
    const clockOutDate = session.clock_out ? new Date(session.clock_out) : new Date();

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .gte("created_at", clockInDate.toISOString())
      .lte("created_at", clockOutDate.toISOString())
      .order("created_at", { ascending: true });

    if (tasksError) throw tasksError;

    const totalTasks = tasks?.length || 0;
    const hours = Math.floor((session.duration_minutes || 0) / 60);
    const minutes = (session.duration_minutes || 0) % 60;
    const durationFormatted = `${hours}h ${minutes}m`;

    const tasksHtml = tasks && tasks.length > 0
      ? tasks.map((task, index) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 16px 12px; font-weight: 600; color: #374151;">${index + 1}</td>
          <td style="padding: 16px 12px;">
            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${task.task_name}</div>
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${task.description}</div>
            ${task.ai_summary ? `
              <div style="background: #dbeafe; border-left: 3px solid #3b82f6; padding: 8px 12px; margin-top: 8px; border-radius: 4px; font-size: 13px;">
                <strong style="color: #1e40af;">AI Summary:</strong> ${task.ai_summary}
              </div>
            ` : ''}
          </td>
          <td style="padding: 16px 12px; text-align: center; color: #059669; font-weight: 500;">${task.estimated_time}</td>
          <td style="padding: 16px 12px; text-align: center; color: #7c3aed; font-weight: 500;">${task.actual_time || 'N/A'}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="4" style="padding: 32px; text-align: center; color: #9ca3af;">No tasks were completed during this session.</td></tr>';

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
      <p>${clockInDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' })}</p>
    </div>

    <div class="summary-stats">
      <div class="stat-card">
        <div class="stat-label">Total Tasks</div>
        <div class="stat-value">${totalTasks}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Time Worked</div>
        <div class="stat-value" style="font-size: 28px;">${durationFormatted}</div>
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
          <td style="padding: 12px; font-weight: 700; color: #2563eb;">${durationFormatted}</td>
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
              subject: `Daily Work Report - ${clockInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' })}`,
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
      JSON.stringify({ success: true, tasksCount: totalTasks }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-daily-report function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});