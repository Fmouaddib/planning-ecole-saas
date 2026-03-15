import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

/**
 * Stripe Webhook handler
 * Listens for: checkout.session.completed, customer.subscription.updated/deleted,
 * invoice.payment_succeeded/failed
 */

Deno.serve(async (req: Request) => {
  // Webhooks are POST only
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    console.error("[stripe-webhook] STRIPE_SECRET_KEY not set");
    return new Response("Server config error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify webhook signature if secret is configured
  let event: Stripe.Event;

  const body = await req.text();

  if (webhookSecret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      console.error("[stripe-webhook] Missing stripe-signature header");
      return new Response("Missing signature", { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("[stripe-webhook] Signature verification failed:", err.message);
      return new Response(`Webhook signature error: ${err.message}`, {
        status: 400,
      });
    }
  } else {
    // No webhook secret → parse directly (less secure, OK for initial setup)
    console.warn("[stripe-webhook] No STRIPE_WEBHOOK_SECRET — skipping signature verification");
    event = JSON.parse(body) as Stripe.Event;
  }

  console.log(`[stripe-webhook] Event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      // ─── Checkout completed ──────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const centerId = metadata.center_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!centerId) {
          console.warn("[stripe-webhook] No center_id in metadata, skipping");
          break;
        }

        if (metadata.plan_slug && metadata.plan_id) {
          // Plan subscription checkout
          const now = new Date().toISOString();
          const periodEnd = new Date();
          periodEnd.setMonth(
            periodEnd.getMonth() +
              (metadata.billing_cycle === "yearly" ? 12 : 1)
          );

          await adminClient.from("center_subscriptions").upsert(
            {
              center_id: centerId,
              plan_id: metadata.plan_id,
              billing_cycle: metadata.billing_cycle || "monthly",
              status: "active",
              stripe_subscription_id: subscriptionId || null,
              stripe_customer_id: customerId || null,
              current_period_start: now,
              current_period_end: periodEnd.toISOString(),
              cancel_at_period_end: false,
            },
            { onConflict: "center_id" }
          );

          console.log(
            `[stripe-webhook] Plan ${metadata.plan_slug} activated for center ${centerId}`
          );
        } else if (metadata.addon_slug && metadata.addon_id) {
          // Addon checkout
          await adminClient.from("center_addons").insert({
            center_id: centerId,
            addon_id: metadata.addon_id,
            status: "active",
            billing_cycle: metadata.billing_cycle || "monthly",
            stripe_subscription_id: subscriptionId || null,
            quantity: 1,
          });

          console.log(
            `[stripe-webhook] Addon ${metadata.addon_slug} activated for center ${centerId}`
          );
        }

        // Log billing event
        await adminClient.from("billing_events").insert({
          center_id: centerId,
          stripe_event_id: event.id,
          event_type: "checkout_completed",
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || "eur",
          metadata,
        });

        break;
      }

      // ─── Subscription updated ──────────────────────────────
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;

        // Update center_subscriptions
        const { data: existing } = await adminClient
          .from("center_subscriptions")
          .select("id, center_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (existing) {
          await adminClient
            .from("center_subscriptions")
            .update({
              status: subscription.status === "active" ? "active" : "past_due",
              cancel_at_period_end: subscription.cancel_at_period_end,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
            })
            .eq("id", existing.id);

          console.log(
            `[stripe-webhook] Subscription ${subId} updated for center ${existing.center_id}`
          );
        }

        // Also check center_addons
        const { data: addonSub } = await adminClient
          .from("center_addons")
          .select("id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (addonSub) {
          await adminClient
            .from("center_addons")
            .update({
              status: subscription.status === "active" ? "active" : "cancelled",
            })
            .eq("id", addonSub.id);
        }

        break;
      }

      // ─── Subscription deleted ──────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;

        // Downgrade to free plan
        const { data: existing } = await adminClient
          .from("center_subscriptions")
          .select("id, center_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (existing) {
          // Find free plan
          const { data: freePlan } = await adminClient
            .from("subscription_plans")
            .select("id")
            .eq("slug", "free")
            .single();

          if (freePlan) {
            await adminClient
              .from("center_subscriptions")
              .update({
                plan_id: freePlan.id,
                status: "active",
                stripe_subscription_id: null,
                cancel_at_period_end: false,
              })
              .eq("id", existing.id);
          }

          console.log(
            `[stripe-webhook] Subscription ${subId} cancelled → downgraded to free for center ${existing.center_id}`
          );
        }

        // Cancel addon if matches
        await adminClient
          .from("center_addons")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subId);

        break;
      }

      // ─── Invoice payment succeeded ──────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          const { data: sub } = await adminClient
            .from("center_subscriptions")
            .select("center_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (sub) {
            await adminClient.from("billing_events").insert({
              center_id: sub.center_id,
              stripe_event_id: event.id,
              event_type: "payment_succeeded",
              amount: (invoice.amount_paid || 0) / 100,
              currency: invoice.currency || "eur",
              metadata: {
                invoice_id: invoice.id,
                invoice_number: invoice.number,
              },
            });
          }
        }
        break;
      }

      // ─── Invoice payment failed ──────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (customerId) {
          const { data: sub } = await adminClient
            .from("center_subscriptions")
            .select("center_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (sub) {
            await adminClient.from("billing_events").insert({
              center_id: sub.center_id,
              stripe_event_id: event.id,
              event_type: "payment_failed",
              amount: (invoice.amount_due || 0) / 100,
              currency: invoice.currency || "eur",
              metadata: { invoice_id: invoice.id },
            });

            // Mark subscription as past_due
            await adminClient
              .from("center_subscriptions")
              .update({ status: "past_due" })
              .eq("stripe_customer_id", customerId);
          }
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[stripe-webhook] Processing error:", err);
    // Return 200 to avoid Stripe retries for processing errors
    return new Response(JSON.stringify({ received: true, error: err.message }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
