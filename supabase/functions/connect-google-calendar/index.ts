import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { saveConnectionKeyForUser } from "../_shared/appUserConnections.ts";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_calendar";
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/connect-google-calendar`;

  // Step 2: OAuth callback from gateway
  if (code) {
    try {
      if (error) throw new Error(`OAuth error: ${error}`);
      if (!state) throw new Error("Missing state parameter");

      const stateData = JSON.parse(atob(state));
      const userId = stateData.userId;
      if (!userId) throw new Error("Invalid state");

      const lovableApiKey = Deno.env.get("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY");
      if (!lovableApiKey) throw new Error("Google Calendar connector is not linked to this project");

      const tokenRes = await fetch(`${GATEWAY_BASE_URL}/api/v1/app-users/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          connector_id: CONNECTOR_ID,
          code,
          redirect_uri: functionUrl,
        }),
      });

      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        throw new Error(`Token exchange failed: ${tokenRes.status} ${body}`);
      }

      const tokenJson = await tokenRes.json();
      const connectionAPIKey = tokenJson.connection_api_key || tokenJson.connection_key;
      if (!connectionAPIKey) {
        throw new Error("No connection key returned. Ensure offline access is enabled for this connector.");
      }

      await saveConnectionKeyForUser(userId, CONNECTOR_ID, connectionAPIKey);

      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'GOOGLE_CALENDAR_CONNECTED'}, '*');window.close();</script><p>Google Calendar connected. You may close this window.</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } },
      );
    } catch (err) {
      console.error("connect-google-calendar callback error:", err);
      return new Response(
        `<html><body><script>window.opener?.postMessage({type:'GOOGLE_CALENDAR_ERROR',error:${JSON.stringify(String(err))}}, '*');window.close();</script><p>Connection failed: ${String(err)}</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" } },
      );
    }
  }

  // Step 1: Authenticate and redirect to gateway authorize
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "Google Calendar connector is not linked to this project" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const state = btoa(JSON.stringify({ userId: caller.id, nonce: crypto.randomUUID() }));

    const authorizeRes = await fetch(`${GATEWAY_BASE_URL}/api/v1/app-users/oauth2/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        connector_id: CONNECTOR_ID,
        redirect_uri: functionUrl,
        credentials_configuration: { scopes: SCOPES },
        state,
      }),
    });

    if (!authorizeRes.ok) {
      const body = await authorizeRes.text();
      throw new Error(`Authorize request failed: ${authorizeRes.status} ${body}`);
    }

    const authorizeJson = await authorizeRes.json();
    const redirectUrl = authorizeJson.authorization_url || authorizeJson.url;
    if (!redirectUrl) throw new Error("No authorization URL returned from gateway");

    return Response.redirect(redirectUrl, 302);
  } catch (err) {
    console.error("connect-google-calendar authorize error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
