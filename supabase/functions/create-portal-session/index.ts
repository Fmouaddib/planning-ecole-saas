import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

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
  };
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("center_id")
      .eq("id", user.id)
      .single();

    if (!profile?.center_id) {
      return new Response(
        JSON.stringify({ error: "Profile or center not found" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Get Stripe customer ID from subscription
    const { data: sub } = await adminClient
      .from("center_subscriptions")
      .select("stripe_customer_id")
      .eq("center_id", profile.center_id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          error: "No Stripe customer found. Please subscribe to a plan first.",
        }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const return_url =
      body.return_url || "https://anti-planning.com/#/profile";

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url,
    });

    console.log(
      `[create-portal-session] Portal session created for center ${profile.center_id}`
    );

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-portal-session] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
