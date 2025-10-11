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

    let assigneeGid: string | null = null;
    if (defaultAssigneeEmail) {
      try {
        const userResponse = await fetch(
          `https://app.asana.com/api/1.0/users?workspace=${projectGid.split('/')[0]}`,
          {
            headers: {
              "Authorization": `Bearer ${integration.api_key}`,
              "Accept": "application/json",
            },
          }
        );

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const user = userData.data?.find(
            (u: any) => u.email?.toLowerCase() === defaultAssigneeEmail.toLowerCase()
          );
          if (user) {
            assigneeGid = user.gid;
          }
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