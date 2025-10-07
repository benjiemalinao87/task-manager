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

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .status-badge { display: inline-block; background: #10b981; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin: 15px 0; }
    .summary-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
    .label { font-weight: bold; color: #4b5563; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Task Completed</h1>
    </div>
    <div class="content">
      <h2>${taskName}</h2>
      <div class="status-badge">✓ Completed</div>
      <p>${description}</p>
      
      ${aiSummary !== 'Summary not available' ? `
      <div class="summary-box">
        <strong>AI Summary:</strong><br>
        ${aiSummary}
      </div>
      ` : ''}
      
      <div class="info-row">
        <span class="label">Estimated Time:</span> ${estimatedTime}
      </div>
      
      <div class="info-row">
        <span class="label">Actual Time:</span> ${actualTime}
      </div>
      
      ${taskLink !== 'No link provided' ? `
      <div class="info-row">
        <span class="label">Task Link:</span> <a href="${taskLink}">${taskLink}</a>
      </div>
      ` : ''}

      ${notes ? `
      <div class="info-row" style="background: #fef3c7; border-left: 4px solid #f59e0b;">
        <span class="label" style="color: #92400e;">Completion Note:</span><br>
        <span style="color: #78350f;">${notes}</span>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      This is an automated email from Task Manager.
    </div>
  </div>
</body>
</html>
    `;

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
              subject: `Task Completed: ${taskName}`,
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
