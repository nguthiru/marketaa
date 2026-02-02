import { db } from "@/lib/db";
import { decrypt, encrypt } from "../encryption";
import { refreshMicrosoftToken } from "../oauth";

interface OutlookCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

// Get valid access token (refresh if needed)
export async function getOutlookAccessToken(userId: string): Promise<{ token: string; email: string } | null> {
  const integration = await db.integration.findFirst({
    where: {
      userId,
      type: "email_outlook",
      status: "connected",
    },
  });

  if (!integration?.credentials) {
    return null;
  }

  const credentials: OutlookCredentials = JSON.parse(decrypt(integration.credentials));

  // Check if token is expired (with 5 min buffer)
  if (credentials.expiresAt < Date.now() + 5 * 60 * 1000) {
    const newTokens = await refreshMicrosoftToken(credentials.refreshToken);

    // Update stored credentials
    const newCredentials: OutlookCredentials = {
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

// Send email via Microsoft Graph API
export async function sendOutlookEmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  conversationId?: string
): Promise<{ id: string; conversationId: string }> {
  const auth = await getOutlookAccessToken(userId);
  if (!auth) {
    throw new Error("Outlook not connected");
  }

  const message = {
    subject,
    body: {
      contentType: "Text",
      content: body,
    },
    toRecipients: [
      {
        emailAddress: {
          address: to,
        },
      },
    ],
    conversationId,
  };

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Outlook send failed: ${error}`);
  }

  // sendMail returns 202 Accepted with no body
  return { id: "", conversationId: conversationId || "" };
}

// List messages (for inbox sync)
export async function listOutlookMessages(
  userId: string,
  filter?: string,
  top: number = 50,
  skip: number = 0
): Promise<{
  value: OutlookMessage[];
  "@odata.nextLink"?: string;
}> {
  const auth = await getOutlookAccessToken(userId);
  if (!auth) {
    throw new Error("Outlook not connected");
  }

  const params = new URLSearchParams({
    $top: top.toString(),
    $skip: skip.toString(),
    $orderby: "receivedDateTime desc",
    $select: "id,conversationId,subject,bodyPreview,from,receivedDateTime,isRead",
  });

  if (filter) params.set("$filter", filter);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${auth.token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to list Outlook messages");
  }

  return response.json();
}

// Get message details
export async function getOutlookMessage(
  userId: string,
  messageId: string
): Promise<OutlookMessage> {
  const auth = await getOutlookAccessToken(userId);
  if (!auth) {
    throw new Error("Outlook not connected");
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
    {
      headers: { Authorization: `Bearer ${auth.token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get Outlook message");
  }

  return response.json();
}

// Type for Outlook message
export interface OutlookMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  body?: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  isRead: boolean;
}
