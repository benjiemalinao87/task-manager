import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    const { apiToken } = await req.json();

    if (!apiToken) {
      return new Response(
        JSON.stringify({ error: "Missing API token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('Fetching Asana projects with token length:', apiToken.length);

    const asanaResponse = await fetch('https://app.asana.com/api/1.0/projects', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    console.log('Asana response status:', asanaResponse.status);

    if (!asanaResponse.ok) {
      const errorText = await asanaResponse.text();
      console.error('Asana API error:', asanaResponse.status, errorText);

      let errorMessage = "Failed to fetch projects. Please check your API token.";

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors && errorData.errors.length > 0) {
          errorMessage = errorData.errors[0].message || errorMessage;
        }
      } catch (e) {
        // If error text is not JSON, use default message
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          status: asanaResponse.status,
          details: errorText
        }),
        {
          status: asanaResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await asanaResponse.json();
    console.log('Successfully fetched', data.data?.length || 0, 'projects');

    return new Response(
      JSON.stringify({ projects: data.data || [] }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching Asana projects:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to fetch projects",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});