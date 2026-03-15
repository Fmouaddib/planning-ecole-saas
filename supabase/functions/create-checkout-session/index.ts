import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limiter.ts";

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

  // Rate limit: 10 checkout sessions per minute per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`checkout:${ip}`, { maxRequests: 10, windowMs: 60_000 });
  if (rl.limited) return rateLimitResponse(rl.retryAfter, cors);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // Auth: get caller
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

    // Get profile (center_id, role)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("center_id, role, email, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.center_id) {
      return new Response(
        JSON.stringify({ error: "Profile or center not found" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      plan_slug,
      addon_slug,
      billing_cycle = "monthly",
      quantity = 1,
      success_url,
      cancel_url,
    } = body;

    // Resolve Stripe price ID
    let stripePriceId: string | null = null;
    let mode: "subscription" | "payment" = "subscription";
    let metadata: Record<string, string> = {
      center_id: profile.center_id,
      user_id: user.id,
      billing_cycle,
    };

    if (plan_slug) {
      // Subscription plan checkout
      const { data: plan } = await adminClient
        .from("subscription_plans")
        .select("*")
        .eq("slug", plan_slug)
        .eq("is_active", true)
        .single();

      if (!plan) {
        return new Response(
          JSON.stringify({ error: `Plan '${plan_slug}' not found` }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      stripePriceId =
        billing_cycle === "yearly"
          ? plan.stripe_price_id_yearly
          : plan.stripe_price_id_monthly;
      metadata.plan_slug = plan_slug;
      metadata.plan_id = plan.id;
    } else if (addon_slug) {
      // Addon checkout
      const { data: addon } = await adminClient
        .from("addon_plans")
        .select("*")
        .eq("slug", addon_slug)
        .eq("is_active", true)
        .single();

      if (!addon) {
        return new Response(
          JSON.stringify({ error: `Addon '${addon_slug}' not found` }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      stripePriceId =
        billing_cycle === "yearly"
          ? addon.stripe_price_id_yearly
          : addon.stripe_price_id_monthly;
      metadata.addon_slug = addon_slug;
      metadata.addon_id = addon.id;
    } else {
      return new Response(
        JSON.stringify({ error: "plan_slug or addon_slug required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (!stripePriceId) {
      return new Response(
        JSON.stringify({
          error: "Stripe price not configured for this plan/addon",
        }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Find or create Stripe Customer
    const { data: sub } = await adminClient
      .from("center_subscriptions")
      .select("stripe_customer_id")
      .eq("center_id", profile.center_id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      // Check if customer exists by email
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: profile.full_name || undefined,
          metadata: { center_id: profile.center_id, user_id: user.id },
        });
        customerId = customer.id;
      }
    }

    // Create Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode,
      line_items: [{ price: stripePriceId, quantity }],
      success_url: success_url || "https://anti-planning.com/#/checkout-success",
      cancel_url: cancel_url || "https://anti-planning.com/#/?checkout=cancelled",
      metadata,
      locale: "fr",
      allow_promotion_codes: true,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(
      `[create-checkout-session] Session created: ${session.id} for center ${profile.center_id}`
    );

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-checkout-session] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
