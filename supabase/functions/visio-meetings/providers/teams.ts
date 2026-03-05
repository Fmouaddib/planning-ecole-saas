// ==================== MICROSOFT TEAMS PROVIDER ====================

export interface TeamsConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  userId: string;
}

export function extractTeamsConfig(settings: Record<string, unknown>): TeamsConfig {
  if (!settings?.teams_tenant_id || !settings?.teams_client_id || !settings?.teams_client_secret || !settings?.teams_user_id) {
    throw new Error("Configuration Teams incomplète — remplissez tous les champs dans Paramètres");
  }
  return {
    tenantId: settings.teams_tenant_id as string,
    clientId: settings.teams_client_id as string,
    clientSecret: settings.teams_client_secret as string,
    userId: settings.teams_user_id as string,
  };
}

async function getAccessToken(config: TeamsConfig): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Teams OAuth failed (${res.status}): ${body}`);
  }
  return (await res.json()).access_token;
}

export async function teamsTest(config: TeamsConfig): Promise<{ success: boolean; message: string }> {
  const token = await getAccessToken(config);
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${config.userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Teams user lookup failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return { success: true, message: `Connexion Teams OK — ${data.displayName} (${data.mail || data.userPrincipalName})` };
}

export async function teamsCreate(config: TeamsConfig, params: { topic: string; startTime: string; duration: number; timezone?: string }) {
  const token = await getAccessToken(config);
  const startDate = new Date(params.startTime);
  const endDate = new Date(startDate.getTime() + params.duration * 60000);
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${config.userId}/onlineMeetings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: params.topic,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Teams create meeting failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return { meeting_id: data.id, join_url: data.joinWebUrl, password: "" };
}

export async function teamsUpdate(config: TeamsConfig, meetingId: string, params: { topic?: string; startTime?: string; duration?: number; timezone?: string }) {
  const token = await getAccessToken(config);
  const body: Record<string, unknown> = {};
  if (params.topic) body.subject = params.topic;
  if (params.startTime) {
    body.startDateTime = new Date(params.startTime).toISOString();
    if (params.duration) {
      body.endDateTime = new Date(new Date(params.startTime).getTime() + params.duration * 60000).toISOString();
    }
  }
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${config.userId}/onlineMeetings/${meetingId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const responseBody = await res.text();
    throw new Error(`Teams update meeting failed (${res.status}): ${responseBody}`);
  }
}

export async function teamsDelete(config: TeamsConfig, meetingId: string) {
  const token = await getAccessToken(config);
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${config.userId}/onlineMeetings/${meetingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Teams delete meeting failed (${res.status}): ${body}`);
  }
}
