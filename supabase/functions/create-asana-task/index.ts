import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AsanaTaskRequest {
  taskName: string;
  description: string;
  estimatedTime: string;
  taskLink?: string;
}

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

    const { taskName, description, estimatedTime, taskLink }: AsanaTaskRequest = await req.json();

    if (!taskName || !description) {
      return new Response(
        JSON.stringify({ error: "Task name and description are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("integration_type", "asana")
      .eq("is_active", true)
      .maybeSingle();

    if (integrationError) {
      throw integrationError;
    }

    if (!integration || !integration.api_key) {
      return new Response(
        JSON.stringify({ error: "Asana integration not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const projectGid = integration.config?.project_gid;
    const defaultAssigneeEmail = integration.config?.default_assignee_email;

    if (!projectGid) {
      return new Response(
        JSON.stringify({ error: "Asana project not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // First, get the project details to find the workspace
    let workspaceGid: string | null = null;
    try {
      const projectResponse = await fetch(
        `https://app.asana.com/api/1.0/projects/${projectGid}`,
        {
          headers: {
            "Authorization": `Bearer ${integration.api_key}`,
            "Accept": "application/json",
          },
        }
      );

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        workspaceGid = projectData.data?.workspace?.gid;
        console.log('Found workspace GID:', workspaceGid);
      }
    } catch (err) {
      console.error("Failed to fetch project details:", err);
    }

    let assigneeGid: string | null = null;
    if (defaultAssigneeEmail && workspaceGid) {
      try {
        const userResponse = await fetch(
          `https://app.asana.com/api/1.0/workspaces/${workspaceGid}/users`,
          {
            headers: {
              "Authorization": `Bearer ${integration.api_key}`,
              "Accept": "application/json",
            },
          }
        );

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('Users found:', userData.data?.length);
          const user = userData.data?.find(
            (u: any) => u.email?.toLowerCase() === defaultAssigneeEmail.toLowerCase()
          );
          if (user) {
            assigneeGid = user.gid;
            console.log('Found assignee GID:', assigneeGid, 'for email:', defaultAssigneeEmail);
          } else {
            console.log('No user found with email:', defaultAssigneeEmail);
          }
        } else {
          const errorText = await userResponse.text();
          console.error('Failed to fetch users:', userResponse.status, errorText);
        }
      } catch (err) {
        console.error("Failed to fetch Asana user:", err);
      }
    }

    const today = new Date().toISOString().split('T')[0];

    let notes = description;
    if (estimatedTime) {
      notes += `\n\nEstimated Time: ${estimatedTime}`;
    }
    if (taskLink) {
      notes += `\n\nTask Link: ${taskLink}`;
    }

    const asanaTaskData: any = {
      data: {
        name: taskName,
        notes: notes,
        projects: [projectGid],
        due_on: today,
      },
    };

    if (assigneeGid) {
      asanaTaskData.data.assignee = assigneeGid;
      console.log('Assigning task to:', assigneeGid);
    } else {
      console.log('No assignee found, task will be unassigned');
    }

    const asanaResponse = await fetch("https://app.asana.com/api/1.0/tasks", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${integration.api_key}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(asanaTaskData),
    });

    if (!asanaResponse.ok) {
      const errorText = await asanaResponse.text();
      console.error("Asana API error:", errorText);
      throw new Error(`Failed to create Asana task: ${asanaResponse.statusText}`);
    }

    const asanaTask = await asanaResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        asanaTaskGid: asanaTask.data?.gid,
        asanaTaskUrl: `https://app.asana.com/0/${projectGid}/${asanaTask.data?.gid}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating Asana task:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to create Asana task",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});