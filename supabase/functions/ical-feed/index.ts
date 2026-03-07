import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ==================== iCal helpers (RFC 5545) ====================

function toICalDate(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;
  const parts: string[] = [];
  parts.push(line.substring(0, maxLen));
  let pos = maxLen;
  while (pos < line.length) {
    parts.push(" " + line.substring(pos, pos + maxLen - 1));
    pos += maxLen - 1;
  }
  return parts.join("\r\n");
}

const STATUS_MAP: Record<string, string> = {
  scheduled: "CONFIRMED",
  confirmed: "CONFIRMED",
  in_progress: "CONFIRMED",
  completed: "CONFIRMED",
  cancelled: "CANCELLED",
  pending: "TENTATIVE",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SESSION_SELECT = `
  id, title, description, start_time, end_time, status, session_type, meeting_url, visio_join_url,
  room:rooms(name),
  trainer:profiles!training_sessions_trainer_id_fkey(full_name),
  subject:subjects(name),
  class_:classes(name, diploma:diplomas(title))
`;

// ==================== Build VEVENT ====================

function buildVEvent(s: any, calName: string): string[] {
  const uid = `${s.id}@antiplanning`;
  const summary = escapeICalText(s.title || "Séance");
  const dtStart = toICalDate(s.start_time);
  const dtEnd = toICalDate(s.end_time);

  const descParts: string[] = [];
  const trainerName = s.trainer?.full_name;
  if (trainerName) descParts.push(`Professeur: ${trainerName}`);
  const subjectName = s.subject?.name;
  if (subjectName) descParts.push(`Matière: ${subjectName}`);
  const classData = s.class_;
  if (classData?.name) descParts.push(`Classe: ${classData.name}`);
  if (classData?.diploma?.title) descParts.push(`Diplôme: ${classData.diploma.title}`);
  if (s.session_type) {
    const typeLabels: Record<string, string> = { in_person: "Présentiel", online: "En ligne", hybrid: "Hybride" };
    descParts.push(`Type: ${typeLabels[s.session_type] || s.session_type}`);
  }
  const visioUrl = s.visio_join_url || s.meeting_url;
  if (visioUrl) descParts.push(`Visio: ${visioUrl}`);

  const description = escapeICalText(descParts.join("\\n"));
  const roomName = s.room?.name;
  const location = roomName ? escapeICalText(roomName) : "";
  const status = STATUS_MAP[s.status || ""] || "CONFIRMED";

  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(foldLine(`UID:${uid}`));
  lines.push(foldLine(`DTSTART:${dtStart}`));
  lines.push(foldLine(`DTEND:${dtEnd}`));
  lines.push(foldLine(`SUMMARY:${summary}`));
  if (description) lines.push(foldLine(`DESCRIPTION:${description}`));
  if (location) lines.push(foldLine(`LOCATION:${location}`));
  if (visioUrl) lines.push(foldLine(`URL:${visioUrl}`));
  lines.push(foldLine(`STATUS:${status}`));
  lines.push(foldLine(`CATEGORIES:${escapeICalText(calName)}`));
  lines.push(`DTSTAMP:${toICalDate(new Date().toISOString())}`);
  // Alarm 15 min before
  lines.push("BEGIN:VALARM");
  lines.push("TRIGGER:-PT15M");
  lines.push("ACTION:DISPLAY");
  lines.push(foldLine(`DESCRIPTION:${summary} dans 15 minutes`));
  lines.push("END:VALARM");
  lines.push("END:VEVENT");
  return lines;
}

function buildICalResponse(calName: string, sessions: any[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AntiPlanning//Planning SaaS//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine(`X-WR-CALNAME:${escapeICalText(calName)}`),
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    // Timezone
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Paris",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const s of sessions) {
    lines.push(...buildVEvent(s, calName));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ==================== HANDLER ====================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token || !UUID_RE.test(token)) {
      return new Response("Invalid token", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Date range: 30 days past + all future
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);

    // ==================== Try calendar_feeds first (subject feeds) ====================
    const { data: feed } = await supabase
      .from("calendar_feeds")
      .select("id, center_id, subject_id, is_active, label, access_count")
      .eq("token", token)
      .maybeSingle();

    if (feed) {
      if (!feed.is_active) {
        return new Response("Feed disabled", { status: 403, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      const { data: subject } = await supabase
        .from("subjects")
        .select("name")
        .eq("id", feed.subject_id)
        .single();

      const calName = feed.label || subject?.name || "Planning";

      const { data: sessions, error: sessErr } = await supabase
        .from("training_sessions")
        .select(SESSION_SELECT)
        .eq("center_id", feed.center_id)
        .eq("subject_id", feed.subject_id)
        .neq("status", "cancelled")
        .gte("start_time", pastDate.toISOString())
        .order("start_time", { ascending: true });

      if (sessErr) {
        console.error("Sessions query error:", sessErr);
        return new Response("Internal error", { status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
      }

      // Update access stats
      supabase
        .from("calendar_feeds")
        .update({ access_count: (feed.access_count || 0) + 1, last_accessed_at: new Date().toISOString() })
        .eq("id", feed.id)
        .then(() => {});

      const ical = buildICalResponse(calName, sessions || []);
      return new Response(ical, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `inline; filename="${calName}.ics"`,
          "Cache-Control": "public, max-age=900",
        },
      });
    }

    // ==================== Try calendar_tokens (personal/class/subject user feeds) ====================
    const { data: tokenRow } = await supabase
      .from("calendar_tokens")
      .select("id, user_id, center_id, scope, label, is_active")
      .eq("token", token)
      .maybeSingle();

    if (!tokenRow) {
      return new Response("Feed not found", { status: 404, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    if (!tokenRow.is_active) {
      return new Response("Feed disabled", { status: 403, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    // Update last_accessed_at
    supabase
      .from("calendar_tokens")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", tokenRow.id)
      .then(() => {});

    const centerId = tokenRow.center_id;
    const scope = tokenRow.scope as string;
    let calName = "Mon Planning — AntiPlanning";

    let query = supabase
      .from("training_sessions")
      .select(SESSION_SELECT)
      .eq("center_id", centerId)
      .neq("status", "cancelled")
      .gte("start_time", pastDate.toISOString())
      .order("start_time", { ascending: true });

    if (scope === "user") {
      // Personal feed: filter by role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, class_id, full_name")
        .eq("id", tokenRow.user_id)
        .single();

      if (profile?.role === "trainer" || profile?.role === "teacher") {
        query = query.eq("trainer_id", tokenRow.user_id);
        calName = `Planning ${profile.full_name || ""} — AntiPlanning`;
      } else if (profile?.role === "student" && profile?.class_id) {
        query = query.eq("class_id", profile.class_id);
        calName = `Mon Planning — AntiPlanning`;
      } else {
        // Admin/staff: all sessions
        calName = "Planning Centre — AntiPlanning";
      }
    } else if (scope.startsWith("subject:")) {
      const subjectId = scope.replace("subject:", "");
      query = query.eq("subject_id", subjectId);
      const { data: subj } = await supabase.from("subjects").select("name").eq("id", subjectId).single();
      calName = subj?.name ? `${subj.name} — AntiPlanning` : tokenRow.label || "Matière — AntiPlanning";
    } else if (scope.startsWith("class:")) {
      const classId = scope.replace("class:", "");
      query = query.eq("class_id", classId);
      const { data: cls } = await supabase.from("classes").select("name").eq("id", classId).single();
      calName = cls?.name ? `${cls.name} — AntiPlanning` : tokenRow.label || "Classe — AntiPlanning";
    }

    const { data: sessions, error: sessErr } = await query;

    if (sessErr) {
      console.error("Sessions query error:", sessErr);
      return new Response("Internal error", { status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }

    const ical = buildICalResponse(calName, sessions || []);
    return new Response(ical, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="planning.ics"`,
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch (error) {
    console.error("ical-feed error:", error);
    return new Response("Internal error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});
