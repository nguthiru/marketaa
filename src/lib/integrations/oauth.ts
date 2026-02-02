// Google OAuth helpers
export function getGoogleAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`;

  if (!clientId) {
    throw new Error("Google OAuth not configured");
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "openid",
    "email",
    "profile",
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Microsoft OAuth helpers
export function getMicrosoftAuthUrl(state: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/microsoft/callback`;

  if (!clientId) {
    throw new Error("Microsoft OAuth not configured");
  }

  const scopes = [
    "offline_access",
    "openid",
    "profile",
    "email",
    "Mail.Read",
    "Mail.Send",
    "Mail.ReadWrite",
    "Calendars.ReadWrite",
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state,
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

// Refresh access token - Google
export async function refreshGoogleToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google token");
  }

  return response.json();
}

// Refresh access token - Microsoft
export async function refreshMicrosoftToken(refreshToken: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth not configured");
  }

  const response = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to refresh Microsoft token");
  }

  return response.json();
}

// Get user info from Google
export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get Google user info");
  }

  return response.json();
}

// Get user info from Microsoft
export async function getMicrosoftUserInfo(accessToken: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to get Microsoft user info");
  }

  return response.json();
}
