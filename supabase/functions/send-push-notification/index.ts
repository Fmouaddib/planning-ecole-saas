import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Send Web Push notifications to specified users.
 * verify_jwt: false — called by other Edge Functions and pg_cron.
 *
 * POST body: { user_ids: string[], title: string, body: string, url?: string }
 * Returns:   { sent: number, failed: number, deactivated: number }
 *
 * Implements VAPID + RFC 8291 payload encryption using Deno crypto APIs.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
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

/** Build a 2-byte big-endian length prefix + data buffer (used in info strings). */
function lengthPrefixed(data: Uint8Array): Uint8Array {
  const len = new Uint8Array(2);
  len[0] = (data.length >> 8) & 0xff;
  len[1] = data.length & 0xff;
  return concat(len, data);
}

// ─── VAPID JWT ──────────────────────────────────────────────────────────────

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64Url: string,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = `${encHeader}.${encPayload}`;

  // Import the raw 32-byte ECDSA private key
  const rawKey = base64UrlDecode(privateKeyBase64Url);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    buildPkcs8FromRaw(rawKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );

  // WebCrypto returns DER-encoded signature; convert to raw r||s (64 bytes)
  const rawSig = derToRaw(new Uint8Array(sig));
  return `${unsigned}.${base64UrlEncode(rawSig)}`;
}

/** Wrap a 32-byte raw EC private key into PKCS#8 DER for P-256. */
function buildPkcs8FromRaw(raw32: Uint8Array): Uint8Array {
  // PKCS#8 prefix for EC P-256 private key (RFC 5958 / 5915)
  const prefix = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  // suffix: optional public key tag (omitted — crypto.subtle derives it)
  const suffix = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  // We need to provide 32 bytes of private key + 65 bytes of uncompressed public key
  // Actually, the simplest valid PKCS#8 for P-256 is prefix + 32-byte key + no public key.
  // Let's use the minimal form.
  const minimalPrefix = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  return concat(minimalPrefix, raw32);
}

/** Convert DER-encoded ECDSA signature to raw 64-byte r||s. */
function derToRaw(der: Uint8Array): Uint8Array {
  // DER: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
  let offset = 2; // skip 0x30 + total length
  // r
  if (der[offset] !== 0x02) throw new Error("Invalid DER signature");
  offset++;
  const rLen = der[offset++];
  const rStart = offset;
  offset += rLen;
  // s
  if (der[offset] !== 0x02) throw new Error("Invalid DER signature");
  offset++;
  const sLen = der[offset++];
  const sStart = offset;

  const r = der.slice(rStart, rStart + rLen);
  const s = der.slice(sStart, sStart + sLen);

  const out = new Uint8Array(64);
  // r and s may have leading zero padding; copy right-aligned into 32-byte slots
  out.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  out.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  return out;
}

// ─── RFC 8291 payload encryption (aes128gcm) ───────────────────────────────

async function encryptPayload(
  payload: string,
  subscriptionPublicKey: string,  // base64url
  subscriptionAuth: string,       // base64url
): Promise<{ ciphertext: Uint8Array; localPublicKey: Uint8Array; salt: Uint8Array }> {
  const clientPublicKeyBytes = base64UrlDecode(subscriptionPublicKey);
  const authSecret = base64UrlDecode(subscriptionAuth);

  // Generate an ephemeral ECDH key pair for the server
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  // Export the server public key (uncompressed, 65 bytes)
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey),
  );

  // Import the client (subscriber) public key
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeyPair.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // --- HKDF step 1: extract IKM from auth_secret ---
  // PRK = HMAC-SHA-256(auth_secret, ecdh_secret)
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const ikm_info = concat(authInfo, clientPublicKeyBytes, serverPublicKeyRaw);

  const prk_key = await crypto.subtle.importKey(
    "raw", authSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prk_key, sharedSecret));

  // IKM via HKDF-Expand(PRK, info, 32)
  const ikm = await hkdfExpand(prk, ikm_info, 32);

  // --- HKDF step 2: derive content encryption key (CEK) and nonce ---
  // PRK2 = HMAC-SHA-256(salt, IKM)
  const salt_key = await crypto.subtle.importKey(
    "raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const prk2 = new Uint8Array(await crypto.subtle.sign("HMAC", salt_key, ikm));

  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cek = await hkdfExpand(prk2, cekInfo, 16);
  const nonce = await hkdfExpand(prk2, nonceInfo, 12);

  // --- Encrypt with AES-128-GCM ---
  const payloadBytes = new TextEncoder().encode(payload);
  // Add padding delimiter (0x02 = final record)
  const paddedPayload = concat(payloadBytes, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey(
    "raw", cek, { name: "AES-GCM" }, false, ["encrypt"],
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload,
    ),
  );

  // Build aes128gcm payload: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  // Record size: payload length + 16 (tag) + 1 (padding delimiter) — but the standard
  // uses a large default (4096). We set it to the actual encrypted content size.
  const recordSize = encrypted.length + 1 + 65 + 16 + 5; // generous
  new DataView(rs.buffer).setUint32(0, 4096);

  const idLen = new Uint8Array([65]); // length of server public key

  const body = concat(salt, rs, idLen, serverPublicKeyRaw, encrypted);

  return { ciphertext: body, localPublicKey: serverPublicKeyRaw, salt };
}

/** HKDF-Expand (RFC 5869) using HMAC-SHA-256. */
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  // For lengths <= 32 we only need one iteration
  const input = concat(info, new Uint8Array([1]));
  const output = new Uint8Array(await crypto.subtle.sign("HMAC", key, input));
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
}

async function sendPush(
  sub: PushSubscription,
  payloadJson: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<PushResult> {
  try {
    // Parse the push endpoint to get the audience (origin)
    const endpointUrl = new URL(sub.endpoint);
    const audience = endpointUrl.origin;

    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey);

    // Encrypt the payload
    const { ciphertext } = await encryptPayload(payloadJson, sub.p256dh, sub.auth_key);

    // Build the authorization header
    const authHeader = `vapid t=${jwt}, k=${vapidPublicKey}`;

    // Send the push message
    const response = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
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
    console.error(
      `Push failed for sub ${sub.id}: HTTP ${response.status} — ${errBody}`,
    );
    return { status: "failed", subscriptionId: sub.id };
  } catch (err) {
    console.error(`Push error for sub ${sub.id}:`, err);
    return { status: "failed", subscriptionId: sub.id };
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

    // Env vars
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@anti-planning.com";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
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
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
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
      ...(url && { data: { url } }),
    });

    // Send push to all subscriptions in parallel
    const results = await Promise.all(
      subscriptions.map((sub: PushSubscription) =>
        sendPush(sub, notificationPayload, vapidPublicKey, vapidPrivateKey, vapidSubject)
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

    const summary = {
      sent: sentIds.length,
      failed: failedCount,
      deactivated: deactivatedIds.length,
    };

    console.log("Push notification summary:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
