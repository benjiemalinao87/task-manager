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
    const { apiToken, asanaTaskId } = await req.json();

    if (!apiToken) {
      return new Response(
        JSON.stringify({ error: "Missing API token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!asanaTaskId) {
      return new Response(
        JSON.stringify({ error: "Missing Asana task ID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('Completing Asana task:', asanaTaskId);

    const asanaResponse = await fetch(
      `https://app.asana.com/api/1.0/tasks/${asanaTaskId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          data: {
            completed: true
          }
        })
      }
    );

    if (!asanaResponse.ok) {
      const errorText = await asanaResponse.text();
      console.error('Asana API error:', asanaResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to complete task in Asana",
          details: errorText 
        }),
        {
          status: asanaResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await asanaResponse.json();
    console.log('Successfully completed Asana task');

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error completing Asana task:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to complete Asana task",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});