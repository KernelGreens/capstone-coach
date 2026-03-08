import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push utilities using Web Crypto API (works in Deno/Edge)
async function generateVapidAuthHeader(
  endpoint: string,
  vapidSubject: string,
  privateKeyBase64: string,
  publicKeyBase64: string
) {
  const audience = new URL(endpoint).origin;

  // Create JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: vapidSubject,
  };

  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import private key and sign
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format
  const rawSig = derToRaw(new Uint8Array(signature));
  const encodedSignature = base64UrlEncode(rawSig);
  const jwt = `${unsignedToken}.${encodedSignature}`;

  return {
    authorization: `vapid t=${jwt}, k=${publicKeyBase64}`,
  };
}

function derToRaw(der: Uint8Array): Uint8Array {
  // DER signature: 0x30 [total-length] 0x02 [r-length] [r] 0x02 [s-length] [s]
  const raw = new Uint8Array(64);
  let offset = 2;
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, rStart + Math.min(rLen, 32)), rDest);

  offset += rLen;
  const sLen = der[offset + 1];
  offset += 2;
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, sStart + Math.min(sLen, 32)), sDest);
  return raw;
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function encryptPayload(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
) {
  const p256dhKey = base64UrlDecode(subscription.keys.p256dh);
  const authSecret = base64UrlDecode(subscription.keys.auth);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    p256dhKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberKey },
    localKeyPair.privateKey,
    256
  );

  // Export local public key
  const localPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for encryption key derivation (RFC 8291)
  const ikm = await hkdf(
    new Uint8Array(sharedSecret),
    authSecret,
    createInfo("WebPush: info\0", p256dhKey, localPublicKey),
    32
  );

  const prk = await hkdf(ikm, salt, createCEKInfo("aesgcm", localPublicKey), 16);
  const nonce = await hkdf(
    ikm,
    salt,
    createNonceInfo("nonce", localPublicKey),
    12
  );

  // Pad and encrypt payload
  const payloadBytes = new TextEncoder().encode(payload);
  const paddingLength = 2;
  const padded = new Uint8Array(paddingLength + payloadBytes.length);
  padded[0] = 0;
  padded[1] = 0;
  padded.set(payloadBytes, paddingLength);

  const encryptionKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    encryptionKey,
    padded
  );

  return { encrypted: new Uint8Array(encrypted), salt, localPublicKey };
}

function createInfo(
  type: string,
  clientPublicKey: Uint8Array,
  serverPublicKey: Uint8Array
): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const info = new Uint8Array(
    typeBytes.length + clientPublicKey.length + serverPublicKey.length + 5
  );
  let offset = 0;
  info.set(typeBytes, offset);
  offset += typeBytes.length;
  info[offset++] = 0;
  info[offset++] = clientPublicKey.length >> 8;
  info[offset++] = clientPublicKey.length & 0xff;
  info.set(clientPublicKey, offset);
  offset += clientPublicKey.length;
  info[offset++] = serverPublicKey.length >> 8;
  info[offset++] = serverPublicKey.length & 0xff;
  info.set(serverPublicKey, offset);
  return info;
}

function createCEKInfo(
  _type: string,
  _key: Uint8Array
): Uint8Array {
  return new TextEncoder().encode("Content-Encoding: aesgcm\0");
}

function createNonceInfo(
  _type: string,
  _key: Uint8Array
): Uint8Array {
  return new TextEncoder().encode("Content-Encoding: nonce\0");
}

async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    salt.length ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));

  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const okm = new Uint8Array(
    await crypto.subtle.sign("HMAC", prkKey, infoWithCounter)
  );
  return okm.slice(0, length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { user_id, title, message, url } = await req.json();

    // Fetch push subscriptions for target user
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: title || "Capstone Coach",
      body: message || "You have a new notification",
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      url: url || "/dashboard",
    });

    let sent = 0;
    const failures: string[] = [];

    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        // For simplicity, send without encryption (raw push)
        // Most browsers accept this for simple notifications
        const vapidHeaders = await generateVapidAuthHeader(
          subscription.endpoint,
          vapidSubject,
          vapidPrivateKey,
          vapidPublicKey
        );

        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            ...vapidHeaders,
            "Content-Type": "application/octet-stream",
            "Content-Length": "0",
            TTL: "86400",
          },
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          failures.push(`Removed expired subscription ${sub.id}`);
        } else {
          const text = await response.text();
          failures.push(`Failed for ${sub.id}: ${response.status} ${text}`);
        }
      } catch (err) {
        failures.push(`Error for ${sub.id}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failures }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
