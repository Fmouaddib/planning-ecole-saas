import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Edge Function: change-email
 * Handles email change with confirmation flow:
 * 1. Generates a confirmation link for the NEW email (user must click to confirm)
 * 2. Sends confirmation email to NEW address via Brevo
 * 3. Sends notification to OLD address via Brevo
 * Auth: caller must be admin/super_admin OR the user themselves
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BASE_DOMAIN = "anti-planning.com";

const ALLOWED_ORIGINS = [
  "https://anti-planning.com",
  "https://planning-ecole-saas.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (origin.endsWith(".anti-planning.com") && origin.startsWith("https://")) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "fahd.mouaddib@gmail.com";

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Parse body
    const { user_id, new_email } = await req.json();
    if (!user_id || !new_email) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or new_email" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(new_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Permission check: caller must be the user OR admin/super_admin
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    const isAdmin = callerProfile && ["admin", "super_admin"].includes(callerProfile.role);
    const isSelf = caller.id === user_id;

    if (!isAdmin && !isSelf) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Get current user info
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("email, full_name, center_id")
      .eq("id", user_id)
      .single();

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const oldEmail = targetProfile.email;
    const userName = targetProfile.full_name || "";

    if (oldEmail === new_email) {
      return new Response(
        JSON.stringify({ error: "New email is the same as current email" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Check if new email is already in use
    const { data: existingUser } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", new_email)
      .neq("id", user_id)
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "This email is already used by another account" }),
        { status: 409, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Resolve center for redirect URL
    let redirectUrl = `https://${BASE_DOMAIN}`;
    if (targetProfile.center_id) {
      const { data: center } = await adminClient
        .from("training_centers")
        .select("slug")
        .eq("id", targetProfile.center_id)
        .single();
      if (center?.slug) {
        redirectUrl = `https://${center.slug}.${BASE_DOMAIN}`;
      }
    }

    // Generate email change confirmation link via admin API
    // This sets new_email on auth.users and returns a confirmation link
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "email_change_new",
        email: oldEmail,
        newEmail: new_email,
        options: { redirectTo: redirectUrl },
      });

    if (linkError) {
      console.error("[change-email] generateLink error:", linkError);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // The action_link goes through Supabase auth verification
    const confirmationLink = linkData.properties.action_link;
    console.log(`[change-email] Confirmation link generated for ${oldEmail} → ${new_email}`);

    const safeUserName = escapeHtml(userName);
    const safeOldEmail = escapeHtml(oldEmail);
    const safeNewEmail = escapeHtml(new_email);
    const initiator = isAdmin && !isSelf ? "votre administrateur" : "vous";

    // Send confirmation email to NEW email
    if (brevoKey) {
      const confirmHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Confirmation de votre nouvelle adresse email</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;background:#fff">
    <p style="font-size:15px;color:#333">Bonjour <strong>${safeUserName}</strong>,</p>
    <p style="font-size:15px;color:#333">Un changement d'adresse email a été demandé par ${initiator} sur votre compte AntiPlanning.</p>
    <p style="font-size:15px;color:#333">Nouvelle adresse : <strong>${safeNewEmail}</strong></p>
    <p style="font-size:15px;color:#333">Pour confirmer ce changement, cliquez sur le bouton ci-dessous :</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${confirmationLink}" style="display:inline-block;background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
        Confirmer ma nouvelle adresse
      </a>
    </p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      Ce lien est valable 24 heures. Si vous n'avez pas demandé ce changement, ignorez cet email — votre adresse actuelle restera inchangée.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;margin-top:16px;text-align:center">AntiPlanning — Ne pas répondre à cet email</p>
</div>`;

      await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: "AntiPlanning", email: senderEmail },
          to: [{ email: new_email, name: userName || new_email }],
          subject: "Confirmez votre nouvelle adresse email — AntiPlanning",
          htmlContent: confirmHtml,
          tags: ["email_change_confirm"],
        }),
      });

      // Send notification to OLD email
      const notifyHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Changement d'adresse email en cours</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;background:#fff">
    <p style="font-size:15px;color:#333">Bonjour <strong>${safeUserName}</strong>,</p>
    <p style="font-size:15px;color:#333">Un changement d'adresse email a été initié par ${initiator} sur votre compte AntiPlanning.</p>
    <p style="font-size:15px;color:#333">Votre adresse actuelle (<strong>${safeOldEmail}</strong>) sera remplacée par <strong>${safeNewEmail}</strong> une fois que le propriétaire de la nouvelle adresse aura confirmé le changement.</p>
    <p style="font-size:15px;color:#333;background:#fef3c7;padding:12px;border-radius:6px;border:1px solid #fcd34d">
      <strong>Si vous n'êtes pas à l'origine de cette demande</strong>, contactez immédiatement votre administrateur pour sécuriser votre compte.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;margin-top:16px;text-align:center">AntiPlanning — Ne pas répondre à cet email</p>
</div>`;

      await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: "AntiPlanning", email: senderEmail },
          to: [{ email: oldEmail, name: userName || oldEmail }],
          subject: "Changement d'adresse email en cours — AntiPlanning",
          htmlContent: notifyHtml,
          tags: ["email_change_notify"],
        }),
      });

      console.log(`[change-email] Emails sent: confirm → ${new_email}, notify → ${oldEmail}`);
    }

    // Log in email_logs
    await adminClient.from("email_logs").insert([
      {
        participant_email: new_email,
        email_type: "email_change_confirm",
        status: "sent",
        rendered_subject: "Confirmez votre nouvelle adresse email",
        center_id: targetProfile.center_id,
      },
      {
        participant_email: oldEmail,
        email_type: "email_change_notify",
        status: "sent",
        rendered_subject: "Changement d'adresse email en cours",
        center_id: targetProfile.center_id,
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Confirmation email sent to ${new_email}. Notification sent to ${oldEmail}.`,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[change-email] error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
