import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Resend from "https://esm.sh/resend@2.0.0";

type Action = "create" | "update" | "cancel";

function esc(text: string) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function fold(line: string) {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    parts.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  if (rest.length) parts.push(" " + rest);
  return parts.join("\r\n");
}

function buildIcs(opts: {
  uid: string;
  sequence: number;
  action: Action;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  organizer: { name: string; email: string };
  attendees: { name: string; email: string }[];
}) {
  const method = opts.action === "cancel" ? "CANCEL" : "REQUEST";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Capstone Coach//Meetings//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `SEQUENCE:${opts.sequence}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(opts.start)}`,
    `DTEND:${toIcsDate(opts.end)}`,
    `SUMMARY:${esc(opts.title)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    `LOCATION:${esc(opts.location)}`,
    `ORGANIZER;CN=${esc(opts.organizer.name)}:mailto:${opts.organizer.email}`,
    ...opts.attendees.map(
      (a) =>
        `ATTENDEE;CN=${esc(a.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`,
    ),
    `STATUS:${opts.action === "cancel" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n");
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
    const action: Action = ["create", "update", "cancel"].includes(body.action) ? body.action : "create";
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

    const supervisorId = meetings[0].supervisor_id;
    if (supervisorId !== caller.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve attendee emails
    const studentIds = [...new Set(meetings.map((m: any) => m.student_id))];
    const { data: studentRows } = await admin
      .from("students")
      .select("id, user_id, email")
      .in("id", studentIds);

    const userIds = [
      supervisorId,
      ...(studentRows ?? []).map((s: any) => s.user_id).filter(Boolean),
    ];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const organizerProfile = profileMap.get(supervisorId);
    let organizerEmail = organizerProfile?.email as string | undefined;
    if (!organizerEmail) {
      const { data: authUser } = await admin.auth.admin.getUserById(supervisorId);
      organizerEmail = authUser?.user?.email ?? undefined;
    }
    const organizer = {
      name: organizerProfile?.full_name || "Supervisor",
      email: organizerEmail || "no-reply@kernelgreens.com",
    };

    const attendees = (studentRows ?? [])
      .map((s: any) => {
        const p = profileMap.get(s.user_id);
        const email = p?.email || s.email;
        return email ? { name: p?.full_name || "Student", email } : null;
      })
      .filter(Boolean) as { name: string; email: string }[];

    const first: any = meetings[0];
    const start = new Date(first.scheduled_at);
    const end = new Date(start.getTime() + (first.duration_minutes || 60) * 60000);

    // Stable UID shared by everyone in the same meeting group
    let uid: string = first.calendar_uid || `${first.id}@capstone-coach.lovable.app`;
    const sequence = (first.calendar_sequence ?? 0) + (action === "create" ? 0 : 1);

    const descriptionParts = [first.description || ""];
    if (first.meeting_link) descriptionParts.push(`Video link: ${first.meeting_link}`);
    const description = descriptionParts.filter(Boolean).join("\n\n");

    const ics = buildIcs({
      uid,
      sequence,
      action,
      title: first.title,
      description,
      location: first.location || first.meeting_link || "Online",
      start,
      end,
      organizer,
      attendees,
    });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailsSent = 0;
    if (resendApiKey) {
      const resend = new Resend.Resend(resendApiKey);
      const from = `Internship Platform <${Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev"}>`;
      const when = start.toUTCString();
      const verb =
        action === "cancel" ? "Cancelled" : action === "update" ? "Updated" : "Invitation";
      const subject = `${action === "create" ? "📅" : action === "update" ? "🔄" : "❌"} ${verb}: ${first.title}`;
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto">
          <h2 style="margin-bottom:4px">${first.title}</h2>
          <p style="color:#555;margin-top:0">${
            action === "cancel"
              ? "This meeting has been cancelled."
              : action === "update"
              ? "This meeting has been updated. Your calendar will be refreshed."
              : "You have been invited to a meeting."
          }</p>
          <table style="font-size:14px;color:#333">
            <tr><td style="padding:4px 12px 4px 0"><b>When</b></td><td>${when}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Duration</b></td><td>${first.duration_minutes || 60} minutes</td></tr>
            ${first.location ? `<tr><td style="padding:4px 12px 4px 0"><b>Where</b></td><td>${first.location}</td></tr>` : ""}
            ${first.meeting_link ? `<tr><td style="padding:4px 12px 4px 0"><b>Link</b></td><td><a href="${first.meeting_link}">Join</a></td></tr>` : ""}
            <tr><td style="padding:4px 12px 4px 0"><b>With</b></td><td>${[organizer.name, ...attendees.map((a) => a.name)].join(", ")}</td></tr>
          </table>
          ${first.description ? `<p style="white-space:pre-wrap;color:#444">${first.description}</p>` : ""}
          <p style="color:#888;font-size:12px">Open the attached calendar file to add or update this meeting in your calendar.</p>
        </div>`;

      const recipients = [organizer, ...attendees];
      const attachmentName = action === "cancel" ? "cancel.ics" : "invite.ics";
      const encoded = btoa(unescape(encodeURIComponent(ics)));

      for (const r of recipients) {
        const { error } = await resend.emails.send({
          from,
          to: [r.email],
          subject,
          html,
          attachments: [{ filename: attachmentName, content: encoded }],
        });
        if (error) console.error("Email send failed", r.email, JSON.stringify(error));
        else emailsSent++;
      }
    } else {
      console.warn("RESEND_API_KEY not configured; skipping email invites");
    }

    // Persist calendar identity/sequence on every meeting row in the group
    await admin
      .from("meetings")
      .update({ calendar_uid: uid, calendar_sequence: sequence })
      .in("id", meetingIds);

    // Best-effort Google Calendar sync for anyone who connected their account
    let googleSynced = 0;
    try {
      const syncRes = await fetch(`${supabaseUrl}/functions/v1/google-calendar-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ meeting_ids: meetingIds, action }),
      });
      if (syncRes.ok) {
        const j = await syncRes.json().catch(() => ({}));
        googleSynced = j.synced ?? 0;
      }
    } catch (e) {
      console.warn("Google Calendar sync skipped:", String(e));
    }

    return new Response(JSON.stringify({ success: true, emailsSent, googleSynced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-meeting-invite error:", error);
    return new Response(JSON.stringify({ error: String((error as Error).message ?? error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
