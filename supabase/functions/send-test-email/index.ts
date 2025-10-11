import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { provider, toEmail, fromEmail, fromName } = await req.json();

    if (!provider || !toEmail || !fromEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (provider === 'sendgrid') {
      const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
      if (!sendgridApiKey) {
        return new Response(
          JSON.stringify({ error: "SendGrid API key not configured" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

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
                to: [{ email: toEmail }],
                subject: "Test Email from Task Manager",
              },
            ],
            from: {
              email: fromEmail,
              name: fromName || undefined,
            },
            content: [
              {
                type: "text/html",
                value: "<p>This is a test email from your Task Manager application using SendGrid.</p><p>Your SendGrid integration is working correctly!</p>",
              },
            ],
          }),
        }
      );

      if (!sendgridResponse.ok) {
        const errorData = await sendgridResponse.text();
        console.error("SendGrid API error:", errorData);
        throw new Error("Failed to send test email via SendGrid");
      }

      return new Response(
        JSON.stringify({ success: true, provider: 'sendgrid' }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (provider === 'resend') {
      const { data: integration } = await supabase
        .from('integrations')
        .select('*')
        .eq('integration_type', 'resend')
        .eq('is_active', true)
        .maybeSingle();

      if (!integration || !integration.api_key) {
        return new Response(
          JSON.stringify({ error: "Resend integration not configured" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
          to: [toEmail],
          subject: 'Test Email from Task Manager',
          html: '<p>This is a test email from your Task Manager application using Resend.</p><p>Your Resend integration is working correctly!</p>',
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        throw new Error(errorData.message || 'Failed to send test email via Resend');
      }

      return new Response(
        JSON.stringify({ success: true, provider: 'resend' }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid email provider" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error sending test email:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to send test email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});