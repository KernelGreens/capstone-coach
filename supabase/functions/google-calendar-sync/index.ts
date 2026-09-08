import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getConnectionKeyForUser } from "../_shared/appUserConnections.ts";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_calendar";

function callAsAppUser(opts: {
  gatewayBaseUrl: string;
  connectorId: string;
  connectionAPIKey: string;
  path: string;
  method?: string;
  body?: any;
}) {
  const lovableApiKey = Deno.env.get("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY");
  if (!lovableApiKey) throw new Error("Google Calendar connector not linked to this project");

  return fetch(`${opts.gatewayBaseUrl}/${opts.connectorId}${opts.path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": opts.connectionAPIKey,
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

    const body = await req.json().catch(() => ({}));
    const meetingIds: string[] = Array.isArray(body.meeting_ids) ? body.meeting_ids : [];
    const action = ["create", "update", "cancel"].includes(body.action) ? body.action : "create";
    if (meetingIds.length === 0) {
      return new Response(JSON.stringify({ error: "meeting_ids is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: meetings, error: mErr } = await admin
      .from("meetings")
      .select("*")
      .in("id", meetingIds);
    if (mErr) throw mErr;
    if (!meetings || meetings.length === 0) {
      return new Response(JSON.stringify({ error: "Meetings not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const first: any = meetings[0];
    const start = new Date(first.scheduled_at);
    const end = new Date(start.getTime() + (first.duration_minutes || 60) * 60000);

    const studentIds = [...new Set(meetings.map((m: any) => m.student_id))];
    const { data: studentRows } = await admin
      .from("students")
      .select("id, user_id, email")
      .in("id", studentIds);

    const userIds = [
      first.supervisor_id,
      ...(studentRows ?? []).map((s: any) => s.user_id).filter(Boolean),
    ];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const syncForUser = async (userId: string, role: "organizer" | "attendee") => {
      const connectionAPIKey = await getConnectionKeyForUser(userId, CONNECTOR_ID);
      if (!connectionAPIKey) return false;

      const profile = profileMap.get(userId);
      const eventBody: any = {
        summary: first.title,
        description: [first.description, first.meeting_link && `Video link: ${first.meeting_link}`]
          .filter(Boolean)
          .join("\n\n"),
        start: { dateTime: start.toISOString(), timeZone: "UTC" },
        end: { dateTime: end.toISOString(), timeZone: "UTC" },
        location: first.location || first.meeting_link || undefined,
        attendees: [
          ...(role === "organizer"
            ? []
            : [
                {
                  email: profileMap.get(first.supervisor_id)?.email || "no-reply@kernelgreens.com",
                  displayName: profileMap.get(first.supervisor_id)?.full_name || "Supervisor",
                },
              ]),
        ],
      };

      const existingEventId = first.google_event_id;

      if (action === "cancel") {
        if (existingEventId) {
          await callAsAppUser({
            gatewayBaseUrl: GATEWAY_BASE_URL,
            connectorId: CONNECTOR_ID,
            connectionAPIKey,
            path: `/calendars/primary/events/${existingEventId}`,
            method: "DELETE",
          });
        }
        return true;
      }

      let response: Response;
      if (existingEventId && action === "update") {
        response = await callAsAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectorId: CONNECTOR_ID,
          connectionAPIKey,
          path: `/calendars/primary/events/${existingEventId}`,
          method: "PATCH",
          body: eventBody,
        });
      } else {
        response = await callAsAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectorId: CONNECTOR_ID,
          connectionAPIKey,
          path: "/calendars/primary/events",
          method: "POST",
          body: eventBody,
        });
      }

      if (!response.ok) {
        const err = await response.text();
        console.error(`Google Calendar sync failed for ${userId}:`, response.status, err);
        return false;
      }

      if (!existingEventId && action === "create") {
        const json = await response.json();
        await admin
          .from("meetings")
          .update({ google_event_id: json.id })
          .in("id", meetingIds);
      }
      return true;
    };

    let synced = 0;
    if (await syncForUser(first.supervisor_id, "organizer")) synced++;
    for (const s of studentRows ?? []) {
      if (s.user_id && (await syncForUser(s.user_id, "attendee"))) synced++;
    }

    return new Response(JSON.stringify({ success: true, synced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("google-calendar-sync error:", error);
    return new Response(JSON.stringify({ error: String((error as Error).message ?? error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
