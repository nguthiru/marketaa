import { db } from "@/lib/db";
import { decrypt, encrypt } from "../encryption";
import { refreshGoogleToken } from "../oauth";

interface GmailCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

// Get valid access token (refresh if needed)
export async function getGmailAccessToken(userId: string): Promise<{ token: string; email: string } | null> {
  const integration = await db.integration.findFirst({
    where: {
      userId,
      type: "email_gmail",
      status: "connected",
    },
  });

  if (!integration?.credentials) {
    return null;
  }

  const credentials: GmailCredentials = JSON.parse(decrypt(integration.credentials));

  // Check if token is expired (with 5 min buffer)
  if (credentials.expiresAt < Date.now() + 5 * 60 * 1000) {
    // Refresh token
    const newTokens = await refreshGoogleToken(credentials.refreshToken);

    // Update stored credentials
    const newCredentials: GmailCredentials = {
      ...credentials,
      accessToken: newTokens.access_token,
      expiresAt: Date.now() + newTokens.expires_in * 1000,
    };

    await db.integration.update({
      where: { id: integration.id },
      data: {
        credentials: encrypt(JSON.stringify(newCredentials)),
        lastSyncAt: new Date(),
      },
    });

    return { token: newTokens.access_token, email: credentials.email };
  }

  return { token: credentials.accessToken, email: credentials.email };
}

// Send email via Gmail API
export async function sendGmailEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<{ id: string; threadId: string }> {
  const auth = await getGmailAccessToken(userId);
  if (!auth) {
    throw new Error("Gmail not connected");
  }

  // Build raw email
  const rawEmail = buildRawEmail(auth.email, to, subject, body, threadId);

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: rawEmail,
        threadId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail send failed: ${error}`);
  }

  return response.json();
}

// List messages (for inbox sync)
export async function listGmailMessages(
  userId: string,
  query?: string,
  maxResults: number = 50,
  pageToken?: string
): Promise<{
  messages: { id: string; threadId: string }[];
  nextPageToken?: string;
}> {
  const auth = await getGmailAccessToken(userId);
  if (!auth) {
    throw new Error("Gmail not connected");
  }

  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
  });

  if (query) params.set("q", query);
  if (pageToken) params.set("pageToken", pageToken);

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${auth.token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to list Gmail messages");
  }

  return response.json();
}

// Get message details
export async function getGmailMessage(
  userId: string,
  messageId: string
): Promise<{
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: { body?: { data?: string }; mimeType: string }[];
  };
  internalDate: string;
}> {
  const auth = await getGmailAccessToken(userId);
  if (!auth) {
    throw new Error("Gmail not connected");
  }

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${auth.token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get Gmail message");
  }

  return response.json();
}

// Helper: Build raw email for Gmail API
function buildRawEmail(
  from: string,
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string
): string {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];

  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  const email = `${headers.join("\r\n")}\r\n\r\n${body}`;

  // Base64 URL encode
  return Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper: Parse email headers
export function parseEmailHeaders(headers: { name: string; value: string }[]) {
  const result: Record<string, string> = {};
  for (const header of headers) {
    result[header.name.toLowerCase()] = header.value;
  }
  return result;
}

// Helper: Decode base64 email body
export function decodeEmailBody(data?: string): string {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}
