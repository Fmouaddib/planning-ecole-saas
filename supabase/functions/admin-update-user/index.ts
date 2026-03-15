import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://anti-planning.com",
  "https://planning-ecole-saas.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin)
    || origin.endsWith(".anti-planning.com") && origin.startsWith("https://")
    || origin.startsWith("http://localhost");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify caller is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Create a service-role admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Verify caller JWT using the service-role client
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;

    // 4. Check caller is admin or super_admin
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (profileError || !profile || !["admin", "super_admin"].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin or super_admin role required" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 5. Parse request body
    const body = await req.json();
    const { user_id } = body;

    // Backward compatibility: if no action but password exists, treat as update_password
    const action: string = body.action || (body.password ? "update_password" : "");

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (!["update_password", "ban", "unban"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing action. Must be: update_password, ban, or unban" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 6. Execute action via GoTrue admin API
    if (action === "update_password") {
      const { password } = body;
      if (!password) {
        return new Response(
          JSON.stringify({ error: "Missing password" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
        password,
      });

      if (updateError) {
        console.error("Password update failed:", updateError.message);
        return new Response(
          JSON.stringify({ error: "Failed to update password" }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    } else if (action === "ban") {
      const { error: banError } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h",
      });

      if (banError) {
        console.error("Ban user failed:", banError.message);
        return new Response(
          JSON.stringify({ error: "Failed to ban user" }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    } else if (action === "unban") {
      const { error: unbanError } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });

      if (unbanError) {
        console.error("Unban user failed:", unbanError.message);
        return new Response(
          JSON.stringify({ error: "Failed to unban user" }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-update-user error:", String(err));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
