import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://anti-planning.com",
  "https://planning-ecole-saas.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin)
    || (origin.endsWith(".anti-planning.com") && origin.startsWith("https://"))
    || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface CreateUserRequest {
  email: string;
  full_name: string;
  role: string;
  center_id: string;
  phone?: string;
  password?: string;
  send_invitation?: boolean;
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

    // 3. Verify caller JWT
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;

    // 4. Check caller is admin or super_admin
    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, center_id")
      .eq("id", callerId)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: "Forbidden: unable to verify caller" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const allowedRoles = ["admin", "super_admin"];
    if (!allowedRoles.includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin or super_admin role required" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 5. Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, full_name, role, center_id, phone, password, send_invitation } = body;

    if (!email || !full_name || !role || !center_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, full_name, role, center_id" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Admin can only create users for their own center (super_admin can create for any)
    if (callerProfile.role === "admin" && callerProfile.center_id !== center_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: cannot create user for another center" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 6. Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Un utilisateur avec cet email existe déjà" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 7. Create auth user via admin API (bypasses email confirmation)
    const userPassword = password || (crypto.randomUUID() + "!Aa1");

    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role,
      },
    });

    if (createError) {
      console.error("[create-user-for-center] createUser error:", createError.message);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (!newAuthUser?.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create auth user" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newAuthUser.user.id;

    // 8. Create or update profile
    const { data: profile, error: profileInsertError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUserId,
        email,
        full_name,
        role,
        center_id,
        phone: phone || null,
        is_active: true,
      }, { onConflict: "id" })
      .select()
      .single();

    if (profileInsertError) {
      console.error("[create-user-for-center] profile upsert error:", profileInsertError.message);
      // Don't fail completely - user was created in auth
    }

    // 9. Send invitation email if requested (and no password was provided)
    if (send_invitation !== false && !password) {
      // Get center info for the invitation email
      const { data: center } = await adminClient
        .from("training_centers")
        .select("name, slug")
        .eq("id", center_id)
        .single();

      const centerName = center?.name || "votre centre";
      const centerSlug = center?.slug;
      const redirectBase = centerSlug
        ? `https://${centerSlug}.anti-planning.com`
        : "https://anti-planning.com";

      // Generate password reset link and send via Brevo directly
      // (avoid calling send-invitation which requires user JWT)
      try {
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: redirectBase },
        });

        if (linkError) {
          console.warn("[create-user-for-center] generateLink error:", linkError.message);
        } else if (linkData?.properties?.action_link) {
          const actionUrl = new URL(linkData.properties.action_link);
          const tokenHash = actionUrl.searchParams.get("token_hash") || actionUrl.searchParams.get("token") || linkData.properties.hashed_token || "";
          const setupUrl = `${redirectBase}/#/setup-account/${tokenHash}`;

          // Send email via Brevo
          const brevoKey = Deno.env.get("BREVO_API_KEY");
          if (brevoKey) {
            const roleLabels: Record<string, string> = {
              teacher: "Enseignant", student: "Étudiant", admin: "Administrateur",
              staff: "Personnel", trainer: "Formateur", coordinator: "Coordinateur",
            };
            const roleLabel = roleLabels[role] || role;

            const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:24px;border-radius:8px 8px 0 0">
                <h1 style="margin:0;font-size:22px">Bienvenue sur AntiPlanning !</h1>
              </div>
              <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;background:#fff">
                <p style="font-size:15px;color:#333">Bonjour <strong>${full_name}</strong>,</p>
                <p style="font-size:15px;color:#333">Vous avez été invité(e) à rejoindre <strong>${centerName}</strong> en tant que <strong>${roleLabel}</strong>.</p>
                <p style="font-size:15px;color:#333">Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>
                <p style="text-align:center;margin:28px 0">
                  <a href="${setupUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
                    Créer mon mot de passe
                  </a>
                </p>
                <p style="color:#6b7280;font-size:13px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
                  Ce lien est valable 24 heures.
                </p>
              </div>
            </div>`;

            const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
              method: "POST",
              headers: {
                "accept": "application/json",
                "api-key": brevoKey,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                sender: { name: "AntiPlanning", email: Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@anti-planning.com" },
                to: [{ email, name: full_name }],
                subject: `Invitation à rejoindre ${centerName}`,
                htmlContent,
                tags: ["invitation"],
              }),
            });

            if (!brevoResponse.ok) {
              console.warn("[create-user-for-center] Brevo email warning:", await brevoResponse.text());
            }
          }
        }
      } catch (inviteErr) {
        console.warn("[create-user-for-center] invitation email failed:", inviteErr);
      }
    }

    console.log(`[create-user-for-center] User created: ${email} (${newUserId}) for center ${center_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email,
          full_name,
          role,
          center_id,
          phone: phone || null,
          is_active: true,
        },
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-user-for-center] error:", String(err));
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
