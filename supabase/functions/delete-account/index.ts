import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limiter.ts";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const ALLOWED_ORIGINS = [
  "https://anti-planning.com",
  "https://planning-ecole-saas.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin)
    || origin.endsWith(".anti-planning.com") && origin.startsWith("https://")
    || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function buildDeletionConfirmationHtml(userName: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Confirmation de suppression de compte</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;background:#fff">
    <p style="font-size:15px;color:#333">Bonjour <strong>${userName}</strong>,</p>
    <p style="font-size:15px;color:#333">Nous vous confirmons que votre compte AntiPlanning a \u00e9t\u00e9 supprim\u00e9 avec succ\u00e8s.</p>
    <p style="font-size:15px;color:#333">Conform\u00e9ment au RGPD (R\u00e8glement G\u00e9n\u00e9ral sur la Protection des Donn\u00e9es), toutes vos donn\u00e9es personnelles ont \u00e9t\u00e9 d\u00e9finitivement effac\u00e9es de nos syst\u00e8mes :</p>
    <ul style="font-size:14px;color:#555;line-height:1.8">
      <li>Profil et informations personnelles</li>
      <li>Donn\u00e9es de connexion</li>
      <li>Participations aux sessions</li>
      <li>Notes, pr\u00e9sences et bulletins associ\u00e9s</li>
      <li>Messages et notifications</li>
    </ul>
    <p style="font-size:15px;color:#333">Cette action est irr\u00e9versible. Si vous souhaitez utiliser AntiPlanning \u00e0 nouveau, vous devrez cr\u00e9er un nouveau compte.</p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      Si vous n'avez pas demand\u00e9 cette suppression, contactez-nous imm\u00e9diatement \u00e0 <a href="mailto:contact@anti-planning.com" style="color:#FF5B46">contact@anti-planning.com</a>.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;margin-top:16px;text-align:center">AntiPlanning \u2014 Ne pas r\u00e9pondre \u00e0 cet email</p>
</div>`;
}

interface DeleteAccountRequest {
  user_id?: string;
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  // Rate limit: 2 deletions per hour per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`delete-account:${ip}`, { maxRequests: 2, windowMs: 3600_000 });
  if (rl.limited) return rateLimitResponse(rl.retryAfter, cors);

  try {
    // 1. Verify JWT — get caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    // 2. Parse body — if user_id not provided, delete self
    let body: DeleteAccountRequest = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine — means delete self
    }

    const targetUserId = body.user_id || caller.id;
    const isSelfDeletion = targetUserId === caller.id;

    // 3. Permission check: caller must be the target user OR super_admin
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("role, full_name, email, center_id")
      .eq("id", caller.id)
      .single();

    if (callerProfileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: "Caller profile not found" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const isSuperAdmin = callerProfile.role === "super_admin";

    if (!isSelfDeletion && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: you can only delete your own account, or be super_admin" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // 4. Fetch target user's profile (for email confirmation + audit)
    let targetEmail: string;
    let targetName: string;
    let targetCenterId: string | null;

    if (isSelfDeletion) {
      targetEmail = callerProfile.email || caller.email || "";
      targetName = callerProfile.full_name || targetEmail;
      targetCenterId = callerProfile.center_id;
    } else {
      const { data: targetProfile, error: targetProfileError } = await adminClient
        .from("profiles")
        .select("full_name, email, center_id")
        .eq("id", targetUserId)
        .single();

      if (targetProfileError || !targetProfile) {
        return new Response(
          JSON.stringify({ error: "Target user not found" }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      targetEmail = targetProfile.email || "";
      targetName = targetProfile.full_name || targetEmail;
      targetCenterId = targetProfile.center_id;
    }

    // Prevent deleting another super_admin (safety guardrail)
    if (!isSelfDeletion) {
      const { data: targetRole } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", targetUserId)
        .single();

      if (targetRole?.role === "super_admin") {
        return new Response(
          JSON.stringify({ error: "Cannot delete a super_admin account" }),
          { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }

    // 5. Delete from profiles table (CASCADE will handle related data)
    const { error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    if (profileDeleteError) {
      console.error("Profile deletion failed:", profileDeleteError.message);
      return new Response(
        JSON.stringify({ error: "Failed to delete profile", details: profileDeleteError.message }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // 6. Delete from auth.users via admin API
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (authDeleteError) {
      console.error("Auth user deletion failed:", authDeleteError.message);
      // Profile is already deleted — log the inconsistency but don't fail silently
      return new Response(
        JSON.stringify({
          error: "Profile deleted but auth.users deletion failed. Manual cleanup required.",
          details: authDeleteError.message,
        }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // 7. Log to audit_log
    try {
      await adminClient.from("audit_log").insert({
        action: "user.deleted_gdpr",
        entity_type: "user",
        entity_id: targetUserId,
        user_id: caller.id,
        user_email: callerProfile.email || caller.email,
        details: {
          deleted_user_email: targetEmail,
          deleted_user_name: targetName,
          self_deletion: isSelfDeletion,
          center_id: targetCenterId,
          timestamp: new Date().toISOString(),
          gdpr_compliant: true,
        },
      });
    } catch (auditError) {
      // Audit must never block the deletion flow
      console.warn("Audit log insert failed (non-blocking):", auditError);
    }

    // 8. Send confirmation email via Brevo
    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (brevoKey && targetEmail) {
      try {
        const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "contact@anti-planning.com";

        const brevoPayload = {
          sender: { name: "AntiPlanning", email: senderEmail },
          to: [{ email: targetEmail, name: targetName }],
          subject: "Confirmation de suppression de votre compte AntiPlanning",
          htmlContent: buildDeletionConfirmationHtml(targetName),
          tags: ["account_deletion", "gdpr"],
        };

        const brevoResponse = await fetch(BREVO_API_URL, {
          method: "POST",
          headers: {
            accept: "application/json",
            "api-key": brevoKey,
            "content-type": "application/json",
          },
          body: JSON.stringify(brevoPayload),
        });

        if (!brevoResponse.ok) {
          const brevoResult = await brevoResponse.json();
          console.error("Brevo confirmation email failed:", brevoResult);
        } else {
          console.log(`[delete-account] Confirmation email sent to ${targetEmail}`);
        }

        // Log the email
        try {
          await adminClient.from("email_logs").insert({
            participant_email: targetEmail,
            email_type: "account_deletion_confirmation",
            status: brevoResponse.ok ? "sent" : "failed",
            rendered_subject: "Confirmation de suppression de votre compte AntiPlanning",
            rendered_html: buildDeletionConfirmationHtml(targetName),
            ...(targetCenterId ? { center_id: targetCenterId } : {}),
          });
        } catch (logError) {
          console.warn("Email log insert failed (non-blocking):", logError);
        }
      } catch (emailError) {
        // Email failure must not block the deletion success response
        console.error("Confirmation email error (non-blocking):", emailError);
      }
    } else {
      console.warn("[delete-account] BREVO_API_KEY not set or no target email — skipping confirmation email");
    }

    console.log(`[delete-account] User ${targetUserId} (${targetEmail}) deleted by ${caller.id} (self=${isSelfDeletion})`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_user_id: targetUserId,
        self_deletion: isSelfDeletion,
        confirmation_email_sent: !!(brevoKey && targetEmail),
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("delete-account error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
