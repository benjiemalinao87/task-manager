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

    console.log('Fetching Asana workspaces');

    // First, fetch workspaces
    const workspacesResponse = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!workspacesResponse.ok) {
      const errorText = await workspacesResponse.text();
      console.error('Asana workspaces error:', workspacesResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch workspaces. Please check your API token." }),
        {
          status: workspacesResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const workspacesData = await workspacesResponse.json();
    const workspaces = workspacesData.data || [];
    console.log('Found workspaces:', workspaces.length);

    if (workspaces.length === 0) {
      return new Response(
        JSON.stringify({ error: "No workspaces found for this token." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch projects from all workspaces
    const allProjects: any[] = [];

    for (const workspace of workspaces) {
      console.log('Fetching projects for workspace:', workspace.name);
      const projectsResponse = await fetch(
        `https://app.asana.com/api/1.0/projects?workspace=${workspace.gid}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        const projects = projectsData.data || [];
        // Add workspace name to each project for clarity
        projects.forEach((project: any) => {
          project.workspace_name = workspace.name;
        });
        allProjects.push(...projects);
      }
    }

    console.log('Successfully fetched', allProjects.length, 'total projects');

    return new Response(
      JSON.stringify({ projects: allProjects }),
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