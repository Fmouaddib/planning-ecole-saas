// ==================== GOOGLE MEET PROVIDER ====================

import { importPKCS8, SignJWT } from "jose";

export interface MeetConfig {
  clientEmail: string;
  privateKey: string;
  userEmail: string;
}

export function extractMeetConfig(settings: Record<string, unknown>): MeetConfig {
  if (!settings?.meet_client_email || !settings?.meet_private_key || !settings?.meet_user_email) {
    throw new Error("Configuration Google Meet incomplète — remplissez tous les champs dans Paramètres");
  }
  return {
    clientEmail: settings.meet_client_email as string,
    privateKey: settings.meet_private_key as string,
    userEmail: settings.meet_user_email as string,
  };
}

async function getAccessToken(config: MeetConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(config.privateKey, "RS256");
  const jwt = await new SignJWT({
    iss: config.clientEmail,
    sub: config.userEmail,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google OAuth failed (${res.status}): ${body}`);
  }
  return (await res.json()).access_token;
}

export async function meetTest(config: MeetConfig): Promise<{ success: boolean; message: string }> {
  const token = await getAccessToken(config);
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar access failed (${res.status}): ${body}`);
  }
  return { success: true, message: `Connexion Google Meet OK — compte ${config.userEmail}` };
}

export async function meetCreate(config: MeetConfig, params: { topic: string; startTime: string; duration: number; timezone?: string }) {
  const token = await getAccessToken(config);
  const startDate = new Date(params.startTime);
  const endDate = new Date(startDate.getTime() + params.duration * 60000);
  const tz = params.timezone || "Europe/Paris";

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: params.topic,
      start: { dateTime: startDate.toISOString(), timeZone: tz },
      end: { dateTime: endDate.toISOString(), timeZone: tz },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Meet create failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  const meetLink = data.hangoutLink || data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri || "";
  return { meeting_id: data.id, join_url: meetLink, password: "" };
}

export async function meetUpdate(config: MeetConfig, meetingId: string, params: { topic?: string; startTime?: string; duration?: number; timezone?: string }) {
  const token = await getAccessToken(config);
  const body: Record<string, unknown> = {};
  const tz = params.timezone || "Europe/Paris";
  if (params.topic) body.summary = params.topic;
  if (params.startTime) {
    body.start = { dateTime: new Date(params.startTime).toISOString(), timeZone: tz };
    if (params.duration) {
      body.end = { dateTime: new Date(new Date(params.startTime).getTime() + params.duration * 60000).toISOString(), timeZone: tz };
    }
  }
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${meetingId}?conferenceDataVersion=1`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const responseBody = await res.text();
    throw new Error(`Google Meet update failed (${res.status}): ${responseBody}`);
  }
}

export async function meetDelete(config: MeetConfig, meetingId: string) {
  const token = await getAccessToken(config);
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${meetingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const body = await res.text();
    throw new Error(`Google Meet delete failed (${res.status}): ${body}`);
  }
}
