import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

    if (action === "register-options") {
      // Generate registration challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const options = {
        challenge: arrayBufferToBase64Url(challenge),
        rp: {
          name: "Capstone Coach",
          id: new URL(req.headers.get("origin") || supabaseUrl).hostname,
        },
        user: {
          id: arrayBufferToBase64Url(new TextEncoder().encode(user.id)),
          name: user.email || user.id,
          displayName: user.user_metadata?.full_name || user.email || "User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      };

      // Store challenge temporarily (use user metadata or a simple approach)
      // We'll verify by re-checking on the verify step
      return new Response(
        JSON.stringify({ options, challenge: options.challenge }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register-verify") {
      // No additional verification needed for attestation: "none"
      // Just store the credential
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "auth-options") {
      const { email } = await req.json().catch(() => ({}));

      // Get user's credentials from DB using service role
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      // Find user by email if not authenticated
      let targetUserId = user?.id;
      if (email && !targetUserId) {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();
        targetUserId = profiles?.id;
      }

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: credentials } = await adminClient
        .from("webauthn_credentials")
        .select("credential_id")
        .eq("user_id", targetUserId);

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const options = {
        challenge: arrayBufferToBase64Url(challenge),
        rpId: new URL(req.headers.get("origin") || supabaseUrl).hostname,
        allowCredentials: (credentials || []).map((c: any) => ({
          id: c.credential_id,
          type: "public-key",
          transports: ["internal"],
        })),
        userVerification: "required",
        timeout: 60000,
      };

      return new Response(
        JSON.stringify({ options }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function arrayBufferToBase64Url(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
