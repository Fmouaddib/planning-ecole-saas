import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limiter.ts";

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

  // Rate limit: 20 user creations per minute per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`create-user:${ip}`, { maxRequests: 20, windowMs: 60_000 });
  if (rl.limited) return rateLimitResponse(rl.retryAfter, cors);

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

    // 6. Check if user already exists in auth.users
    // Use profile lookup first (faster), then fallback to admin API
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    let existingUser: { id: string; email?: string } | null = existingProfile;

    // If not found in profiles, check auth.users directly (handles edge cases)
    if (!existingUser) {
      const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const found = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (found) existingUser = { id: found.id, email: found.email };
    }

    if (existingUser) {
      // ========== MULTI-CENTER: Link existing user to this center ==========
      const existingUserId = existingUser.id;

      // Check if already in this center via profiles
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id, is_active")
        .eq("id", existingUserId)
        .eq("center_id", center_id)
        .maybeSingle();

      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: "Cet utilisateur est déjà membre de ce centre" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // Check if already linked via user_centers
      const { data: existingLink } = await adminClient
        .from("user_centers")
        .select("user_id, is_active")
        .eq("user_id", existingUserId)
        .eq("center_id", center_id)
        .maybeSingle();

      if (existingLink && existingLink.is_active) {
        return new Response(
          JSON.stringify({ error: "Cet utilisateur est déjà lié à ce centre" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // Reactivate or create user_centers entry
      if (existingLink && !existingLink.is_active) {
        const { error: reactivateError } = await adminClient
          .from("user_centers")
          .update({ is_active: true, role, updated_at: new Date().toISOString() })
          .eq("user_id", existingUserId)
          .eq("center_id", center_id);

        if (reactivateError) {
          console.error("[create-user-for-center] reactivate user_centers error:", reactivateError.message);
          return new Response(
            JSON.stringify({ error: "Erreur lors de la réactivation du lien centre" }),
            { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }
      } else {
        const { error: linkError } = await adminClient
          .from("user_centers")
          .insert({
            user_id: existingUserId,
            center_id,
            role,
            is_active: true,
          });

        if (linkError) {
          console.error("[create-user-for-center] insert user_centers error:", linkError.message);
          return new Response(
            JSON.stringify({ error: "Erreur lors du rattachement au centre: " + linkError.message }),
            { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
          );
        }
      }

      // Get existing profile info
      const { data: existingProfileData } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", existingUserId)
        .single();

      // Send invitation email if requested
      if (send_invitation !== false) {
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

        try {
          const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo: redirectBase },
          });

          if (!linkError && linkData?.properties?.action_link) {
            const actionUrl = new URL(linkData.properties.action_link);
            const tokenHash = actionUrl.searchParams.get("token_hash") || actionUrl.searchParams.get("token") || linkData.properties.hashed_token || "";
            const setupUrl = `${redirectBase}/#/setup-account/${tokenHash}`;
            const userName = full_name || existingProfileData?.full_name || email;

            const brevoKey = Deno.env.get("BREVO_API_KEY");
            if (brevoKey) {
              const roleLabels: Record<string, string> = {
                teacher: "Enseignant", student: "Étudiant", admin: "Administrateur",
                staff: "Personnel", trainer: "Formateur", coordinator: "Coordinateur",
              };
              const roleLabel = roleLabels[role] || role;

              const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
                <div style="background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:24px;border-radius:8px 8px 0 0">
                  <h1 style="margin:0;font-size:22px">Vous avez été ajouté(e) à un nouveau centre !</h1>
                </div>
                <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;background:#fff">
                  <p style="font-size:15px;color:#333">Bonjour <strong>${userName}</strong>,</p>
                  <p style="font-size:15px;color:#333">Vous avez été ajouté(e) à <strong>${centerName}</strong> en tant que <strong>${roleLabel}</strong>.</p>
                  <p style="font-size:15px;color:#333">Vous pouvez vous connecter avec vos identifiants habituels et sélectionner ce centre :</p>
                  <p style="text-align:center;margin:28px 0">
                    <a href="${redirectBase}" style="display:inline-block;background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
                      Se connecter
                    </a>
                  </p>
                  <p style="color:#6b7280;font-size:13px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
                    Vos identifiants existants restent les mêmes.
                  </p>
                </div>
              </div>`;

              await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                  "accept": "application/json",
                  "api-key": brevoKey,
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  sender: { name: "AntiPlanning", email: Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@anti-planning.com" },
                  to: [{ email, name: userName }],
                  subject: `Vous avez été ajouté(e) à ${centerName}`,
                  htmlContent,
                  tags: ["multi-center-link"],
                }),
              });
            }
          }
        } catch (inviteErr) {
          console.warn("[create-user-for-center] multi-center invitation email failed:", inviteErr);
        }
      }

      console.log(`[create-user-for-center] Existing user ${email} (${existingUserId}) linked to center ${center_id} via user_centers`);

      return new Response(
        JSON.stringify({
          success: true,
          linked: true,
          user: {
            id: existingUserId,
            email,
            full_name: existingProfileData?.full_name || full_name,
            role,
            center_id,
            phone: existingProfileData?.phone || phone || null,
            is_active: true,
          },
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
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
