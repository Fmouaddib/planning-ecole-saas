import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ==================== CORS ====================

const ALLOWED_ORIGINS = [
  "https://anti-planning.com",
  "https://planning-ecole-saas.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin)
    || (origin.endsWith(".anti-planning.com") && origin.startsWith("https://"))
    || origin.startsWith("http://localhost");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(data: unknown, status = 200, req?: Request) {
  const corsHeaders = req ? getCorsHeaders(req) : { "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0], "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ==================== VALIDATION ====================

function isValidMeetingId(id: string): boolean {
  return /^[a-zA-Z0-9_\-=+.]+$/.test(id) && id.length < 512;
}

// ==================== SUPABASE ====================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ==================== ZOOM HELPERS ====================

interface ZoomConfig {
  accountId: string;
  clientId: string;
  clientSecret: string;
  userEmail: string;
}

async function getZoomConfig(
  supabase: ReturnType<typeof createClient>,
  centerId: string
): Promise<ZoomConfig> {
  const { data, error } = await supabase
    .from("training_centers")
    .select("settings")
    .eq("id", centerId)
    .single();

  if (error || !data) throw new Error("Centre introuvable");

  const s = data.settings as Record<string, unknown>;
  if (
    !s?.zoom_account_id ||
    !s?.zoom_client_id ||
    !s?.zoom_client_secret ||
    !s?.zoom_user_email
  ) {
    throw new Error(
      "Configuration Zoom incomplète — remplissez tous les champs dans Paramètres"
    );
  }

  return {
    accountId: s.zoom_account_id as string,
    clientId: s.zoom_client_id as string,
    clientSecret: s.zoom_client_secret as string,
    userEmail: s.zoom_user_email as string,
  };
}

async function getZoomAccessToken(config: ZoomConfig): Promise<string> {
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: config.accountId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom OAuth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ==================== ZOOM API ====================

interface CreateMeetingParams {
  topic: string;
  startTime: string; // ISO 8601
  duration: number; // minutes
  timezone?: string;
}

interface ZoomMeetingResult {
  id: number;
  join_url: string;
  password: string;
}

async function zoomCreateMeeting(
  token: string,
  email: string,
  params: CreateMeetingParams
): Promise<ZoomMeetingResult> {
  const res = await fetch(
    `https://api.zoom.us/v2/users/${encodeURIComponent(email)}/meetings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: params.topic,
        type: 2, // scheduled
        start_time: params.startTime,
        duration: params.duration,
        timezone: params.timezone || "Europe/Paris",
        settings: {
          join_before_host: true,
          waiting_room: false,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom create meeting failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return { id: data.id, join_url: data.join_url, password: data.password || "" };
}

async function zoomUpdateMeeting(
  token: string,
  meetingId: string,
  params: Partial<CreateMeetingParams>
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (params.topic) body.topic = params.topic;
  if (params.startTime) body.start_time = params.startTime;
  if (params.duration) body.duration = params.duration;
  if (params.timezone) body.timezone = params.timezone;

  const res = await fetch(
    `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const responseBody = await res.text();
    throw new Error(
      `Zoom update meeting failed (${res.status}): ${responseBody}`
    );
  }
}

async function zoomDeleteMeeting(
  token: string,
  meetingId: string
): Promise<void> {
  const res = await fetch(
    `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  // 204 = success, 404 = already deleted (ok)
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(
      `Zoom delete meeting failed (${res.status}): ${body}`
    );
  }
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const {
      action,
      meeting_id: meetingId,
      topic,
      start_time: startTime,
      duration,
      timezone,
    } = await req.json();

    const supabaseAdmin = getSupabaseAdmin();

    // ALWAYS resolve center_id from JWT → profile (ignore body-supplied center_id)
    let centerId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await createClient(
        SUPABASE_URL,
        Deno.env.get("SUPABASE_ANON_KEY")!
      ).auth.getUser(token);

      if (user) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("center_id")
          .eq("id", user.id)
          .single();
        if (profile) centerId = profile.center_id;
      }
    }

    if (!centerId) {
      return json({ error: "Non authentifié — veuillez vous reconnecter" }, 401, req);
    }

    const config = await getZoomConfig(supabaseAdmin, centerId);

    // ---- TEST ----
    if (action === "test") {
      const token = await getZoomAccessToken(config);
      // Verify by fetching user info
      const res = await fetch(
        `https://api.zoom.us/v2/users/${encodeURIComponent(config.userEmail)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Zoom user lookup failed (${res.status}): ${body}`);
      }
      const userData = await res.json();
      return json({
        success: true,
        message: `Connexion Zoom OK — ${userData.first_name} ${userData.last_name} (${userData.email})`,
      }, 200, req);
    }

    // ---- CREATE ----
    if (action === "create") {
      if (!topic || !startTime || !duration) {
        return json(
          { error: "topic, start_time, duration are required" },
          400, req
        );
      }
      const token = await getZoomAccessToken(config);
      const result = await zoomCreateMeeting(token, config.userEmail, {
        topic,
        startTime,
        duration,
        timezone,
      });
      return json({
        success: true,
        meeting_id: String(result.id),
        join_url: result.join_url,
        password: result.password,
      }, 200, req);
    }

    // Validate meetingId format for update/delete actions
    if ((action === "update" || action === "delete") && meetingId && !isValidMeetingId(meetingId)) {
      return json({ error: "meeting_id format invalide" }, 400, req);
    }

    // ---- UPDATE ----
    if (action === "update") {
      if (!meetingId) {
        return json({ error: "meeting_id is required" }, 400, req);
      }
      const token = await getZoomAccessToken(config);
      await zoomUpdateMeeting(token, meetingId, {
        topic,
        startTime,
        duration,
        timezone,
      });
      return json({ success: true }, 200, req);
    }

    // ---- DELETE ----
    if (action === "delete") {
      if (!meetingId) {
        return json({ error: "meeting_id is required" }, 400, req);
      }
      const token = await getZoomAccessToken(config);
      await zoomDeleteMeeting(token, meetingId);
      return json({ success: true }, 200, req);
    }

    return json({ error: `Unknown action: ${action}` }, 400, req);
  } catch (e) {
    console.error("[zoom-meetings]", e);
    return json({ error: (e as Error).message }, 500, req);
  }
});
