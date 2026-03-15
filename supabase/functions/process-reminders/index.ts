import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Automated email reminders for upcoming training sessions.
 * Called by pg_cron — verify_jwt: false (service_role_key is NULL in pg_cron context).
 *
 * Workflow:
 *  1. Find sessions in the next 24h that haven't been reminded yet
 *  2. Gather participants + trainer for each session
 *  3. Check user-level & center-level email preferences
 *  4. Send reminder emails via internal send-email Edge Function
 *  5. Mark sessions as reminded + log to email_logs
 */

interface SessionRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  session_type: string;
  center_id: string;
  trainer_id: string | null;
  room_id: string | null;
  visio_join_url: string | null;
}

interface ParticipantProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  email_preferences: Record<string, boolean> | null;
}

interface CenterSettings {
  email_reminders_students?: boolean;
  email_reminders_teachers?: boolean;
}

// ── HTML email template ──────────────────────────────────────────────────────

function buildReminderHtml(
  recipientName: string,
  sessionTitle: string,
  sessionDate: string,
  sessionTime: string,
  sessionType: string,
  roomName: string | null,
  visioUrl: string | null,
): string {
  const typeLabel =
    sessionType === "online"
      ? "En ligne"
      : sessionType === "hybrid"
        ? "Hybride"
        : "En presentiel";

  const locationBlock = visioUrl
    ? `<p style="font-size:14px;color:#333;margin:4px 0">
        <strong>Lien visio :</strong>
        <a href="${visioUrl}" style="color:#FF5B46;text-decoration:underline">${visioUrl}</a>
      </p>`
    : roomName
      ? `<p style="font-size:14px;color:#333;margin:4px 0"><strong>Salle :</strong> ${roomName}</p>`
      : "";

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Rappel de s\u00e9ance</h1>
    <p style="margin:6px 0 0;font-size:14px;opacity:0.9">AntiPlanning</p>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;background:#fff">
    <p style="font-size:15px;color:#333">Bonjour <strong>${recipientName}</strong>,</p>
    <p style="font-size:15px;color:#333">Vous avez une s\u00e9ance pr\u00e9vue prochainement :</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
      <p style="font-size:16px;color:#111;margin:0 0 8px;font-weight:bold">${sessionTitle}</p>
      <p style="font-size:14px;color:#333;margin:4px 0"><strong>Date :</strong> ${sessionDate}</p>
      <p style="font-size:14px;color:#333;margin:4px 0"><strong>Horaire :</strong> ${sessionTime}</p>
      <p style="font-size:14px;color:#333;margin:4px 0"><strong>Format :</strong> ${typeLabel}</p>
      ${locationBlock}
    </div>

    <p style="text-align:center;margin:24px 0">
      <a href="https://anti-planning.com/#/calendar" style="display:inline-block;background:linear-gradient(135deg,#FF5B46,#FBA625);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">
        Voir mon planning
      </a>
    </p>

    <p style="color:#6b7280;font-size:13px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      Vous recevez cet email car les rappels de s\u00e9ance sont activ\u00e9s pour votre compte.
    </p>
  </div>
  <p style="color:#9ca3af;font-size:11px;margin-top:16px;text-align:center">AntiPlanning \u2014 Ne pas r\u00e9pondre \u00e0 cet email</p>
</div>`;
}

// ── Date formatting helpers (fr locale) ──────────────────────────────────────

const DAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS_FR = [
  "janvier", "f\u00e9vrier", "mars", "avril", "mai", "juin",
  "juillet", "ao\u00fbt", "septembre", "octobre", "novembre", "d\u00e9cembre",
];

function formatDateFr(isoString: string): string {
  const d = new Date(isoString);
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTimeFr(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 1. Find sessions in the next 24h that haven't been reminded ──────

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: sessions, error: sessionsError } = await supabase
      .from("training_sessions")
      .select("id, title, start_time, end_time, session_type, center_id, trainer_id, room_id, visio_join_url")
      .gte("start_time", now.toISOString())
      .lte("start_time", in24h.toISOString())
      .neq("status", "cancelled")
      .is("reminder_sent_at", null)
      .order("start_time", { ascending: true });

    if (sessionsError) {
      console.error("[process-reminders] Error fetching sessions:", sessionsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch sessions", details: sessionsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!sessions || sessions.length === 0) {
      console.log("[process-reminders] No upcoming sessions to remind");
      return new Response(
        JSON.stringify({ success: true, reminded: 0, message: "No sessions to remind" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(`[process-reminders] Found ${sessions.length} session(s) to process`);

    // ── Pre-fetch center settings (deduplicated) ─────────────────────────

    const centerIds = [...new Set(sessions.map((s: SessionRow) => s.center_id).filter(Boolean))];
    const centerSettingsMap: Record<string, CenterSettings> = {};

    if (centerIds.length > 0) {
      const { data: centers } = await supabase
        .from("training_centers")
        .select("id, settings")
        .in("id", centerIds);

      if (centers) {
        for (const c of centers) {
          centerSettingsMap[c.id] = (c.settings as CenterSettings) || {};
        }
      }
    }

    // ── Process each session ─────────────────────────────────────────────

    let totalReminded = 0;
    let totalEmailsSent = 0;
    const errors: string[] = [];

    for (const session of sessions as SessionRow[]) {
      try {
        const centerSettings = centerSettingsMap[session.center_id] || {};

        // ── 2. Get participants from session_participants ─────────────────

        const recipients: ParticipantProfile[] = [];

        // Participants (students)
        const { data: participants } = await supabase
          .from("session_participants")
          .select("profile_id")
          .eq("session_id", session.id);

        const participantIds = (participants || []).map((p: { profile_id: string }) => p.profile_id);

        // Add trainer
        if (session.trainer_id) {
          participantIds.push(session.trainer_id);
        }

        if (participantIds.length === 0) {
          console.log(`[process-reminders] Session ${session.id} has no participants — skipping`);
          // Still mark as reminded so we don't retry
          await supabase
            .from("training_sessions")
            .update({ reminder_sent_at: now.toISOString() })
            .eq("id", session.id);
          totalReminded++;
          continue;
        }

        // Fetch profiles for all participant IDs
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name, role, email_preferences")
          .in("id", participantIds);

        if (!profiles || profiles.length === 0) {
          console.log(`[process-reminders] No profiles found for session ${session.id} — skipping`);
          await supabase
            .from("training_sessions")
            .update({ reminder_sent_at: now.toISOString() })
            .eq("id", session.id);
          totalReminded++;
          continue;
        }

        // ── 3. Filter by email preferences ───────────────────────────────

        for (const profile of profiles as ParticipantProfile[]) {
          if (!profile.email) continue;

          // User-level preference: check email_preferences.email_reminders (default: true)
          const userPrefs = profile.email_preferences || {};
          if (userPrefs.email_reminders === false) {
            console.log(`[process-reminders] User ${profile.email} has reminders disabled — skipping`);
            continue;
          }

          // Center-level settings
          const isTeacherRole = ["teacher", "trainer", "coordinator"].includes(profile.role);
          const isStudentRole = ["student"].includes(profile.role);

          if (isTeacherRole && centerSettings.email_reminders_teachers === false) {
            console.log(`[process-reminders] Center has teacher reminders disabled — skipping ${profile.email}`);
            continue;
          }
          if (isStudentRole && centerSettings.email_reminders_students === false) {
            console.log(`[process-reminders] Center has student reminders disabled — skipping ${profile.email}`);
            continue;
          }

          recipients.push(profile);
        }

        if (recipients.length === 0) {
          console.log(`[process-reminders] All recipients filtered out for session ${session.id}`);
          await supabase
            .from("training_sessions")
            .update({ reminder_sent_at: now.toISOString() })
            .eq("id", session.id);
          totalReminded++;
          continue;
        }

        // ── Get room name if applicable ──────────────────────────────────

        let roomName: string | null = null;
        if (session.room_id) {
          const { data: room } = await supabase
            .from("rooms")
            .select("name")
            .eq("id", session.room_id)
            .single();
          roomName = room?.name || null;
        }

        // ── 4. Build & send emails ───────────────────────────────────────

        const sessionDate = formatDateFr(session.start_time);
        const sessionTime = `${formatTimeFr(session.start_time)} - ${formatTimeFr(session.end_time)}`;

        // Try to fetch a reminder template from email_templates
        const { data: template } = await supabase
          .from("email_templates")
          .select("subject, body_html")
          .eq("name", "session_reminder")
          .eq("is_active", true)
          .limit(1)
          .single();

        const emailLogs: Array<Record<string, unknown>> = [];

        for (const recipient of recipients) {
          const recipientName =
            [recipient.first_name, recipient.last_name].filter(Boolean).join(" ") || recipient.email;

          let subject: string;
          let htmlContent: string;

          if (template) {
            // Use DB template with variable replacement
            subject = template.subject
              .replace(/\{\{session_title\}\}/g, session.title)
              .replace(/\{\{session_date\}\}/g, sessionDate);
            htmlContent = template.body_html
              .replace(/\{\{recipient_name\}\}/g, recipientName)
              .replace(/\{\{session_title\}\}/g, session.title)
              .replace(/\{\{session_date\}\}/g, sessionDate)
              .replace(/\{\{session_time\}\}/g, sessionTime)
              .replace(/\{\{session_type\}\}/g, session.session_type)
              .replace(/\{\{room_name\}\}/g, roomName || "")
              .replace(/\{\{visio_url\}\}/g, session.visio_join_url || "");
          } else {
            // Default built-in template
            subject = `Rappel : ${session.title} \u2014 ${sessionDate}`;
            htmlContent = buildReminderHtml(
              recipientName,
              session.title,
              sessionDate,
              sessionTime,
              session.session_type,
              roomName,
              session.visio_join_url,
            );
          }

          // ── 5. Send via internal send-email Edge Function ──────────────

          try {
            const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                to: [{ email: recipient.email, name: recipientName }],
                subject,
                htmlContent,
                tags: ["session_reminder", "automated"],
              }),
            });

            const sendResult = await sendRes.json();
            const status = sendRes.ok ? "sent" : "failed";
            const errorMsg = sendRes.ok ? null : (sendResult.error || "send-email returned error");

            if (!sendRes.ok) {
              console.error(`[process-reminders] Failed to send to ${recipient.email}:`, sendResult);
            }

            // ── 6. Log to email_logs ─────────────────────────────────────

            emailLogs.push({
              session_id: session.id,
              center_id: session.center_id || null,
              participant_email: recipient.email,
              email_type: "session_reminder",
              status,
              error_message: errorMsg,
              rendered_subject: subject,
              rendered_html: htmlContent,
            });

            if (sendRes.ok) totalEmailsSent++;
          } catch (sendErr) {
            console.error(`[process-reminders] Error sending to ${recipient.email}:`, sendErr);
            emailLogs.push({
              session_id: session.id,
              center_id: session.center_id || null,
              participant_email: recipient.email,
              email_type: "session_reminder",
              status: "failed",
              error_message: sendErr.message || "Unknown send error",
              rendered_subject: subject,
              rendered_html: htmlContent,
            });
          }
        }

        // Batch insert email logs
        if (emailLogs.length > 0) {
          const { error: logErr } = await supabase.from("email_logs").insert(emailLogs);
          if (logErr) {
            console.error(`[process-reminders] email_logs insert error for session ${session.id}:`, logErr);
          }
        }

        // ── 7. Mark session as reminded ──────────────────────────────────

        const { error: updateErr } = await supabase
          .from("training_sessions")
          .update({ reminder_sent_at: now.toISOString() })
          .eq("id", session.id);

        if (updateErr) {
          console.error(`[process-reminders] Failed to mark session ${session.id} as reminded:`, updateErr);
          errors.push(`Session ${session.id}: ${updateErr.message}`);
        } else {
          totalReminded++;
        }
      } catch (sessionErr) {
        console.error(`[process-reminders] Error processing session ${session.id}:`, sessionErr);
        errors.push(`Session ${session.id}: ${sessionErr.message}`);
      }
    }

    console.log(
      `[process-reminders] Done: ${totalReminded} session(s) reminded, ${totalEmailsSent} email(s) sent, ${errors.length} error(s)`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        sessions_found: sessions.length,
        sessions_reminded: totalReminded,
        emails_sent: totalEmailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[process-reminders] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
