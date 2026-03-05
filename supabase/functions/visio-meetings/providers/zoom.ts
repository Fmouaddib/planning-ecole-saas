// ==================== ZOOM PROVIDER ====================

export interface ZoomConfig {
  accountId: string;
  clientId: string;
  clientSecret: string;
  userEmail: string;
}

export function extractZoomConfig(settings: Record<string, unknown>): ZoomConfig {
  if (!settings?.zoom_account_id || !settings?.zoom_client_id || !settings?.zoom_client_secret || !settings?.zoom_user_email) {
    throw new Error("Configuration Zoom incomplète — remplissez tous les champs dans Paramètres");
  }
  return {
    accountId: settings.zoom_account_id as string,
    clientId: settings.zoom_client_id as string,
    clientSecret: settings.zoom_client_secret as string,
    userEmail: settings.zoom_user_email as string,
  };
}

async function getAccessToken(config: ZoomConfig): Promise<string> {
  const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: config.accountId,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom OAuth failed (${res.status}): ${body}`);
  }
  return (await res.json()).access_token;
}

export async function zoomTest(config: ZoomConfig): Promise<{ success: boolean; message: string }> {
  const token = await getAccessToken(config);
  const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(config.userEmail)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom user lookup failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return { success: true, message: `Connexion Zoom OK — ${data.first_name} ${data.last_name} (${data.email})` };
}

export async function zoomCreate(config: ZoomConfig, params: { topic: string; startTime: string; duration: number; timezone?: string }) {
  const token = await getAccessToken(config);
  const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(config.userEmail)}/meetings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: params.topic,
      type: 2,
      start_time: params.startTime,
      duration: params.duration,
      timezone: params.timezone || "Europe/Paris",
      settings: { join_before_host: true, waiting_room: false },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom create meeting failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return { meeting_id: String(data.id), join_url: data.join_url, password: data.password || "" };
}

export async function zoomUpdate(config: ZoomConfig, meetingId: string, params: { topic?: string; startTime?: string; duration?: number; timezone?: string }) {
  const token = await getAccessToken(config);
  const body: Record<string, unknown> = {};
  if (params.topic) body.topic = params.topic;
  if (params.startTime) body.start_time = params.startTime;
  if (params.duration) body.duration = params.duration;
  if (params.timezone) body.timezone = params.timezone;
  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const responseBody = await res.text();
    throw new Error(`Zoom update meeting failed (${res.status}): ${responseBody}`);
  }
}

export async function zoomDelete(config: ZoomConfig, meetingId: string) {
  const token = await getAccessToken(config);
  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Zoom delete meeting failed (${res.status}): ${body}`);
  }
}
