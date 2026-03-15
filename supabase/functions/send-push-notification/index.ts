import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Send Web Push notifications to specified users.
 * verify_jwt: false — called by other Edge Functions and pg_cron.
 *
 * POST body: { user_ids: string[], title: string, body: string, url?: string }
 * Returns:   { sent: number, failed: number, deactivated: number }
 *
 * Implements VAPID + RFC 8291 payload encryption using Deno WebCrypto APIs.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  let b64 = s.trim().replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

// ─── VAPID JWT ──────────────────────────────────────────────────────────────

/**
 * Import VAPID ECDSA P-256 signing key using JWK format.
 * vapidPrivateKey: base64url-encoded 32-byte raw private key (d)
 * vapidPublicKey: base64url-encoded 65-byte uncompressed public key (0x04 || x || y)
 */
async function importVapidKey(
  vapidPrivateKey: string,
  vapidPublicKey: string,
): Promise<CryptoKey> {
  const pubBytes = base64UrlDecode(vapidPublicKey);
  const x = base64UrlEncode(pubBytes.slice(1, 33));
  const y = base64UrlEncode(pubBytes.slice(33, 65));
  const d = vapidPrivateKey.trim();

  return crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function createVapidJwt(
  audience: string,
  subject: string,
  signingKey: CryptoKey,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = `${encHeader}.${encPayload}`;

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    new TextEncoder().encode(unsigned),
  );

  return `${unsigned}.${base64UrlEncode(new Uint8Array(sig))}`;
}

// ─── RFC 8291 payload encryption (aes128gcm) ───────────────────────────────

async function encryptPayload(
  payload: string,
  subscriptionPublicKey: string,
  subscriptionAuth: string,
): Promise<{ ciphertext: Uint8Array }> {
  const clientPublicKeyBytes = base64UrlDecode(subscriptionPublicKey);
  const authSecret = base64UrlDecode(subscriptionAuth);

  // Generate ephemeral ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey),
  );

  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPublicKey },
      serverKeyPair.privateKey,
      256,
    ),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF Extract: PRK = HMAC-SHA256(auth_secret, shared_secret)
  const prk_key = await crypto.subtle.importKey(
    "raw", authSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prk_key, sharedSecret));

  // HKDF Expand for IKM
  const authInfo = concat(
    new TextEncoder().encode("WebPush: info\0"),
    clientPublicKeyBytes,
    serverPublicKeyRaw,
  );
  const ikm = await hkdfExpand(prk, authInfo, 32);

  // HKDF Extract: PRK2 = HMAC-SHA256(salt, IKM)
  const salt_key = await crypto.subtle.importKey(
    "raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const prk2 = new Uint8Array(await crypto.subtle.sign("HMAC", salt_key, ikm));

  // Derive CEK and nonce
  const cek = await hkdfExpand(prk2, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpand(prk2, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  // Encrypt with AES-128-GCM (padding delimiter 0x02 = final record)
  const paddedPayload = concat(new TextEncoder().encode(payload), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey(
    "raw", cek, { name: "AES-GCM" }, false, ["encrypt"],
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload),
  );

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  return {
    ciphertext: concat(salt, rs, new Uint8Array([65]), serverPublicKeyRaw, encrypted),
  };
}

/** HKDF-Expand (RFC 5869) using HMAC-SHA-256. */
async function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const output = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, concat(info, new Uint8Array([1]))),
  );
  return output.slice(0, length);
}

// ─── Send a single push notification ────────────────────────────────────────

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

interface PushResult {
  status: "sent" | "failed" | "deactivated";
  subscriptionId: string;
  error?: string;
}

async function sendPush(
  sub: PushSubscription,
  payloadJson: string,
  vapidPublicKey: string,
  signingKey: CryptoKey,
  vapidSubject: string,
): Promise<PushResult> {
  try {
    const audience = new URL(sub.endpoint).origin;
    const jwt = await createVapidJwt(audience, vapidSubject, signingKey);
    const { ciphertext } = await encryptPayload(payloadJson, sub.p256dh, sub.auth_key);

    const response = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
        "Urgency": "normal",
      },
      body: ciphertext,
    });

    if (response.status === 201 || response.status === 200) {
      return { status: "sent", subscriptionId: sub.id };
    }

    // 404 or 410 = subscription expired/invalid
    if (response.status === 404 || response.status === 410) {
      return { status: "deactivated", subscriptionId: sub.id };
    }

    const errBody = await response.text().catch(() => "");
    console.error(`Push failed for sub ${sub.id}: HTTP ${response.status} — ${errBody}`);
    return { status: "failed", subscriptionId: sub.id, error: `HTTP ${response.status}: ${errBody.substring(0, 300)}` };
  } catch (err) {
    console.error(`Push error for sub ${sub.id}:`, err?.message || err);
    return { status: "failed", subscriptionId: sub.id, error: err?.message || String(err) };
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { user_ids, title, body, url } = await req.json();

    if (!Array.isArray(user_ids) || !user_ids.length || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_ids, title, body" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Env vars (trim to handle trailing whitespace in secrets)
    const vapidPublicKey = (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
    const vapidPrivateKey = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@anti-planning.com";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Import the VAPID signing key once (JWK format)
    let signingKey: CryptoKey;
    try {
      signingKey = await importVapidKey(vapidPrivateKey, vapidPublicKey);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: `VAPID key import failed: ${e?.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Supabase client (service role to bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active subscriptions for the given user_ids
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth_key")
      .in("user_id", user_ids)
      .eq("is_active", true);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions", details: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, deactivated: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Build notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      ...(url && { url }),
    });

    // Send push to all subscriptions in parallel
    const results = await Promise.all(
      subscriptions.map((sub: PushSubscription) =>
        sendPush(sub, notificationPayload, vapidPublicKey, signingKey, vapidSubject)
      ),
    );

    // Process results
    const sentIds: string[] = [];
    const deactivatedIds: string[] = [];
    let failedCount = 0;

    for (const r of results) {
      if (r.status === "sent") sentIds.push(r.subscriptionId);
      else if (r.status === "deactivated") deactivatedIds.push(r.subscriptionId);
      else failedCount++;
    }

    // Update last_used_at for successful deliveries
    if (sentIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", sentIds);
    }

    // Deactivate expired/invalid subscriptions
    if (deactivatedIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("id", deactivatedIds);
    }

    const errors = results.filter((r) => r.error).map((r) => r.error);
    const summary = {
      sent: sentIds.length,
      failed: failedCount,
      deactivated: deactivatedIds.length,
      ...(errors.length > 0 && { errors }),
    };

    console.log("[push] Summary:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[push] Unhandled error:", err?.message || err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
