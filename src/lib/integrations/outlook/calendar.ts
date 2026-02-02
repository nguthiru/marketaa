import { db } from "@/lib/db";
import { decrypt, encrypt } from "../encryption";
import { refreshMicrosoftToken } from "../oauth";

interface CalendarCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

// Get valid access token for Outlook Calendar
export async function getOutlookCalendarAccessToken(userId: string): Promise<{ token: string; email: string } | null> {
  const integration = await db.integration.findFirst({
    where: {
      userId,
      type: "calendar_outlook",
      status: "connected",
    },
  });

  if (!integration?.credentials) {
    return null;
  }

  const credentials: CalendarCredentials = JSON.parse(decrypt(integration.credentials));

  // Check if token is expired
  if (credentials.expiresAt < Date.now() + 5 * 60 * 1000) {
    const newTokens = await refreshMicrosoftToken(credentials.refreshToken);

    const newCredentials: CalendarCredentials = {
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

// Create a calendar event
export async function createOutlookCalendarEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    attendees?: string[];
    meetingLink?: boolean;
  }
): Promise<{
  id: string;
  webLink: string;
  onlineMeetingUrl?: string;
}> {
  const auth = await getOutlookCalendarAccessToken(userId);
  if (!auth) {
    throw new Error("Outlook Calendar not connected");
  }

  const eventBody: Record<string, unknown> = {
    subject: event.summary,
    body: {
      contentType: "Text",
      content: event.description || "",
    },
    start: {
      dateTime: event.start.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: event.end.toISOString(),
      timeZone: "UTC",
    },
  };

  if (event.attendees) {
    eventBody.attendees = event.attendees.map((email) => ({
      emailAddress: { address: email },
      type: "required",
    }));
  }

  if (event.meetingLink) {
    eventBody.isOnlineMeeting = true;
    eventBody.onlineMeetingProvider = "teamsForBusiness";
  }

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create calendar event: ${error}`);
  }

  return response.json();
}

// List calendar events
export async function listOutlookCalendarEvents(
  userId: string,
  startDateTime: Date,
  endDateTime: Date
): Promise<{
  value: OutlookCalendarEvent[];
}> {
  const auth = await getOutlookCalendarAccessToken(userId);
  if (!auth) {
    throw new Error("Outlook Calendar not connected");
  }

  const params = new URLSearchParams({
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    $orderby: "start/dateTime",
    $select: "id,subject,bodyPreview,start,end,webLink,onlineMeetingUrl,attendees",
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${auth.token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to list calendar events");
  }

  return response.json();
}

// Delete a calendar event
export async function deleteOutlookCalendarEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const auth = await getOutlookCalendarAccessToken(userId);
  if (!auth) {
    throw new Error("Outlook Calendar not connected");
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.token}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete calendar event");
  }
}

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  webLink: string;
  onlineMeetingUrl?: string;
  attendees?: {
    emailAddress: { address: string; name: string };
    status: { response: string };
  }[];
}
