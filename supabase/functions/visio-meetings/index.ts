import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { extractZoomConfig, zoomTest, zoomCreate, zoomUpdate, zoomDelete } from "./providers/zoom.ts";
import { extractTeamsConfig, teamsTest, teamsCreate, teamsUpdate, teamsDelete } from "./providers/teams.ts";
import { extractMeetConfig, meetTest, meetCreate, meetUpdate, meetDelete } from "./providers/meet.ts";

// ==================== CORS ====================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ==================== SUPABASE ====================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ==================== SETTINGS LOADER ====================

async function getCenterSettings(
  supabase: ReturnType<typeof createClient>,
  centerId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("training_centers")
    .select("settings")
    .eq("id", centerId)
    .single();
  if (error || !data) throw new Error("Centre introuvable");
  return (data.settings as Record<string, unknown>) || {};
}

type Provider = "zoom" | "teams" | "meet";

// ==================== MAIN HANDLER ====================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      action,
      provider: bodyProvider,
      center_id: bodyCenterId,
      meeting_id: meetingId,
      topic,
      start_time: startTime,
      duration,
      timezone,
    } = await req.json();

    const supabaseAdmin = getSupabaseAdmin();

    // Resolve center_id from JWT → profile
    let centerId = bodyCenterId as string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await createClient(
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
      return json({ error: "center_id required" }, 400);
    }

    const settings = await getCenterSettings(supabaseAdmin, centerId);

    // Resolve provider: explicit body.provider > settings.visio_provider
    const provider = (bodyProvider || settings.visio_provider) as Provider | undefined;
    if (!provider) {
      return json({ error: "Aucun fournisseur visio configuré" }, 400);
    }

    const params = { topic, startTime, duration, timezone };

    // ---- TEST ----
    if (action === "test") {
      let result;
      switch (provider) {
        case "zoom":
          result = await zoomTest(extractZoomConfig(settings));
          break;
        case "teams":
          result = await teamsTest(extractTeamsConfig(settings));
          break;
        case "meet":
          result = await meetTest(extractMeetConfig(settings));
          break;
        default:
          return json({ error: `Fournisseur inconnu : ${provider}` }, 400);
      }
      return json(result);
    }

    // ---- CREATE ----
    if (action === "create") {
      if (!topic || !startTime || !duration) {
        return json({ error: "topic, start_time, duration are required" }, 400);
      }
      let result;
      switch (provider) {
        case "zoom":
          result = await zoomCreate(extractZoomConfig(settings), params);
          break;
        case "teams":
          result = await teamsCreate(extractTeamsConfig(settings), params);
          break;
        case "meet":
          result = await meetCreate(extractMeetConfig(settings), params);
          break;
        default:
          return json({ error: `Fournisseur inconnu : ${provider}` }, 400);
      }
      return json({ success: true, ...result });
    }

    // ---- UPDATE ----
    if (action === "update") {
      if (!meetingId) return json({ error: "meeting_id is required" }, 400);
      switch (provider) {
        case "zoom":
          await zoomUpdate(extractZoomConfig(settings), meetingId, params);
          break;
        case "teams":
          await teamsUpdate(extractTeamsConfig(settings), meetingId, params);
          break;
        case "meet":
          await meetUpdate(extractMeetConfig(settings), meetingId, params);
          break;
        default:
          return json({ error: `Fournisseur inconnu : ${provider}` }, 400);
      }
      return json({ success: true });
    }

    // ---- DELETE ----
    if (action === "delete") {
      if (!meetingId) return json({ error: "meeting_id is required" }, 400);
      switch (provider) {
        case "zoom":
          await zoomDelete(extractZoomConfig(settings), meetingId);
          break;
        case "teams":
          await teamsDelete(extractTeamsConfig(settings), meetingId);
          break;
        case "meet":
          await meetDelete(extractMeetConfig(settings), meetingId);
          break;
        default:
          return json({ error: `Fournisseur inconnu : ${provider}` }, 400);
      }
      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("[visio-meetings]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
