import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // 1. Database connectivity
  try {
    const dbStart = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.from("training_centers").select("id").limit(1);
    if (error) throw error;
    checks.database = { status: "ok", latency: Date.now() - dbStart };
  } catch (e) {
    checks.database = { status: "error", error: e.message };
  }

  // 2. Auth service
  try {
    const authStart = Date.now();
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/health`, {
      headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
    });
    checks.auth = { status: res.ok ? "ok" : "degraded", latency: Date.now() - authStart };
  } catch (e) {
    checks.auth = { status: "error", error: e.message };
  }

  // 3. Edge Functions (self-check)
  checks.edge_functions = { status: "ok", latency: 0 };

  // 4. Cron jobs
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.rpc("get_cron_job_count");
    if (error) {
      // Fallback: just mark as unknown if RPC doesn't exist
      checks.cron_jobs = { status: "unknown", error: "RPC not available" };
    } else {
      checks.cron_jobs = { status: "ok" };
    }
  } catch {
    checks.cron_jobs = { status: "unknown" };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok" || c.status === "unknown");
  const totalLatency = Date.now() - start;

  return new Response(
    JSON.stringify({
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latency_ms: totalLatency,
      version: "1.0.0",
      checks,
    }),
    {
      status: allOk ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
