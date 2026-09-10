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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "capstone-intern@kernelgreens.com";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Determine reminder type from request body (or default to both)
    let reminderType = "both";
    try {
      const body = await req.json();
      if (body?.type) reminderType = body.type;
    } catch {
      // No body = cron call, run both
    }

    const now = new Date();
    const results = { morningDigest: 0, hourBefore: 0, errors: [] as string[] };

    // ─── 1) HOUR-BEFORE REMINDERS ───
    // Find meetings starting in the next 30–75 minutes (to handle cron drift)
    if (reminderType === "both" || reminderType === "hour_before") {
      const from = new Date(now.getTime() + 30 * 60 * 1000);
      const to = new Date(now.getTime() + 75 * 60 * 1000);

      const { data: upcomingMeetings, error: meetErr } = await supabase
        .from("meetings")
        .select("*")
        .eq("status", "scheduled")
        .gte("scheduled_at", from.toISOString())
        .lte("scheduled_at", to.toISOString());

      if (meetErr) {
        results.errors.push(`Meetings query: ${meetErr.message}`);
      } else if (upcomingMeetings && upcomingMeetings.length > 0) {
        for (const meeting of upcomingMeetings) {
          const userIds = [meeting.supervisor_id, meeting.student_id];

          // Get student's user_id from students table
          const { data: student } = await supabase
            .from("students")
            .select("user_id")
            .eq("id", meeting.student_id)
            .single();

          const recipientUserIds = [meeting.supervisor_id];
          if (student?.user_id) recipientUserIds.push(student.user_id);

          const meetingTime = new Date(meeting.scheduled_at);
          const timeStr = meetingTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          for (const userId of recipientUserIds) {
            // Push notification
            await sendPushNotification(supabase, userId, {
              title: `⏰ Meeting in ~1 hour`,
              message: `"${meeting.title}" at ${timeStr}${meeting.meeting_link ? " — Join link available" : ""}`,
              url: "/meetings",
            });

            // Email notification
            if (resendApiKey) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("email, full_name")
                .eq("id", userId)
                .single();

              if (profile?.email) {
                await sendEmail(resendApiKey, resendFromEmail, {
                  to: profile.email,
                  subject: `⏰ Meeting Reminder: ${meeting.title}`,
                  html: buildMeetingEmailHtml(meeting, profile.full_name, "hour_before"),
                });
              }
            }

            results.hourBefore++;
          }
        }
      }
    }

    // ─── 2) MORNING DIGEST ───
    // For each user, check if it's ~7 AM in their timezone and send today's meetings
    if (reminderType === "both" || reminderType === "morning_digest") {
      // Get all unique users who have meetings (supervisors + students)
      const { data: allMeetings, error: allErr } = await supabase
        .from("meetings")
        .select("*")
        .eq("status", "scheduled")
        .gte("scheduled_at", now.toISOString());

      if (allErr) {
        results.errors.push(`All meetings query: ${allErr.message}`);
      } else if (allMeetings && allMeetings.length > 0) {
        // Collect unique user IDs and their meetings
        const userMeetingsMap = new Map<string, any[]>();

        for (const meeting of allMeetings) {
          // Supervisor
          if (!userMeetingsMap.has(meeting.supervisor_id)) {
            userMeetingsMap.set(meeting.supervisor_id, []);
          }
          userMeetingsMap.get(meeting.supervisor_id)!.push(meeting);

          // Student user_id
          const { data: student } = await supabase
            .from("students")
            .select("user_id")
            .eq("id", meeting.student_id)
            .single();

          if (student?.user_id) {
            if (!userMeetingsMap.has(student.user_id)) {
              userMeetingsMap.set(student.user_id, []);
            }
            userMeetingsMap.get(student.user_id)!.push(meeting);
          }
        }

        // For each user, check if it's morning in their timezone
        for (const [userId, meetings] of userMeetingsMap) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name, timezone")
            .eq("id", userId)
            .single();

          const tz = profile?.timezone || "UTC";
          const userNow = getTimeInTimezone(now, tz);
          const userHour = userNow.getHours();

          // Only send if it's between 6:30 AM and 7:30 AM in user's timezone
          if (userHour !== 7) continue;

          // Filter meetings for today in user's timezone
          const todayMeetings = meetings.filter((m: any) => {
            const mDate = getTimeInTimezone(new Date(m.scheduled_at), tz);
            return (
              mDate.getFullYear() === userNow.getFullYear() &&
              mDate.getMonth() === userNow.getMonth() &&
              mDate.getDate() === userNow.getDate()
            );
          });

          if (todayMeetings.length === 0) continue;

          // Push notification
          const meetingCount = todayMeetings.length;
          await sendPushNotification(supabase, userId, {
            title: `📅 ${meetingCount} meeting${meetingCount > 1 ? "s" : ""} today`,
            message: todayMeetings.map((m: any) => m.title).join(", "),
            url: "/meetings",
          });

          // Email digest
          if (resendApiKey && profile?.email) {
            await sendEmail(resendApiKey, resendFromEmail, {
              to: profile.email,
              subject: `📅 Your meetings for today (${todayMeetings.length})`,
              html: buildDigestEmailHtml(todayMeetings, profile.full_name, tz),
            });
          }

          results.morningDigest++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Meeting reminders error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── HELPER: Send push notification via existing edge function ───
async function sendPushNotification(
  supabase: any,
  userId: string,
  payload: { title: string; message: string; url?: string }
) {
  try {
    // Create in-app notification
    await supabase.from("notifications").insert({
      user_id: userId,
      title: payload.title,
      message: payload.message,
      type: "meeting_reminder",
    });

    // Get push subscriptions and send
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) return;

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

    for (const sub of subs) {
      try {
        const audience = new URL(sub.endpoint).origin;
        const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
            "Content-Type": "application/octet-stream",
            "Content-Length": "0",
            TTL: "86400",
          },
        });

        if (response.status === 410 || response.status === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      } catch {
        // Silent push failure
      }
    }
  } catch {
    // Silent notification failure
  }
}

// ─── HELPER: Send email via Resend gateway ───
import { sendEmailViaResend } from "../_shared/resendGateway.ts";

async function sendEmail(
  _apiKey: string,
  from: string,
  opts: { to: string; subject: string; html: string }
) {
  try {
    await sendEmailViaResend({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch {
    // Silent email failure
  }
}

// ─── HELPER: Build hour-before email ───
function buildMeetingEmailHtml(meeting: any, userName: string, _type: string): string {
  const meetingTime = new Date(meeting.scheduled_at);
  const dateStr = meetingTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = meetingTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 24px; color: white; margin-bottom: 24px;">
        <h1 style="margin: 0 0 8px 0; font-size: 20px;">⏰ Meeting Reminder</h1>
        <p style="margin: 0; opacity: 0.9;">Hi ${userName}, your meeting starts in about 1 hour</p>
      </div>
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e293b;">${meeting.title}</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 100px;">📅 Date</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">🕐 Time</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${timeStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">⏱ Duration</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${meeting.duration_minutes} minutes</td>
          </tr>
          ${meeting.location ? `<tr><td style="padding: 8px 0; color: #64748b;">📍 Location</td><td style="padding: 8px 0; color: #1e293b; font-weight: 500;">${meeting.location}</td></tr>` : ""}
        </table>
        ${
          meeting.meeting_link
            ? `<a href="${meeting.meeting_link}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">Join Meeting</a>`
            : ""
        }
        ${meeting.description ? `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #64748b; font-size: 14px; white-space: pre-line;">${meeting.description}</p></div>` : ""}
      </div>
      <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">Sent from Capstone Coach</p>
    </div>
  `;
}

// ─── HELPER: Build morning digest email ───
function buildDigestEmailHtml(meetings: any[], userName: string, tz: string): string {
  const meetingRows = meetings
    .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .map((m: any) => {
      const time = getTimeInTimezone(new Date(m.scheduled_at), tz);
      const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #6366f1; font-weight: 600; white-space: nowrap;">${timeStr}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
            <strong style="color: #1e293b;">${m.title}</strong>
            <br/><span style="color: #64748b; font-size: 13px;">${m.duration_minutes} min${m.location ? ` · ${m.location}` : ""}${m.meeting_link ? ` · <a href="${m.meeting_link}" style="color: #6366f1;">Join</a>` : ""}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 24px; color: white; margin-bottom: 24px;">
        <h1 style="margin: 0 0 8px 0; font-size: 20px;">📅 Good morning, ${userName}!</h1>
        <p style="margin: 0; opacity: 0.9;">Here are your meetings for today</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; color: #64748b; font-size: 13px;">Time</th>
            <th style="padding: 12px; text-align: left; color: #64748b; font-size: 13px;">Meeting</th>
          </tr>
        </thead>
        <tbody>${meetingRows}</tbody>
      </table>
      <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">Sent from Capstone Coach</p>
    </div>
  `;
}

// ─── HELPER: Get time in timezone ───
function getTimeInTimezone(date: Date, timezone: string): Date {
  try {
    const str = date.toLocaleString("en-US", { timeZone: timezone });
    return new Date(str);
  } catch {
    return date;
  }
}

// ─── VAPID JWT helpers (same as send-push-notification) ───
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 60 * 60, sub: subject };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const keyData = base64UrlDecode(privateKeyBase64);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signature = derToRaw(new Uint8Array(signatureBuffer));
  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
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
