import { db } from "@/lib/db";
import { decrypt, encrypt } from "../encryption";
import { refreshGoogleToken } from "../oauth";

interface CalendarCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

// Get valid access token for Google Calendar
export async function getGoogleCalendarAccessToken(userId: string): Promise<{ token: string; email: string } | null> {
  const integration = await db.integration.findFirst({
    where: {
      userId,
      type: "calendar_google",
      status: "connected",
    },
  });

  if (!integration?.credentials) {
    return null;
  }

  const credentials: CalendarCredentials = JSON.parse(decrypt(integration.credentials));

  // Check if token is expired
  if (credentials.expiresAt < Date.now() + 5 * 60 * 1000) {
    const newTokens = await refreshGoogleToken(credentials.refreshToken);

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
export async function createGoogleCalendarEvent(
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
  htmlLink: string;
  hangoutLink?: string;
}> {
  const auth = await getGoogleCalendarAccessToken(userId);
  if (!auth) {
    throw new Error("Google Calendar not connected");
  }

  const eventBody: Record<string, unknown> = {
    summary: event.summary,
    description: event.description,
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
    eventBody.attendees = event.attendees.map((email) => ({ email }));
  }

  if (event.meetingLink) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: `marketaa-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const params = new URLSearchParams();
  if (event.meetingLink) {
    params.set("conferenceDataVersion", "1");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
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
export async function listGoogleCalendarEvents(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<{
  items: GoogleCalendarEvent[];
}> {
  const auth = await getGoogleCalendarAccessToken(userId);
  if (!auth) {
    throw new Error("Google Calendar not connected");
  }

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
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
export async function deleteGoogleCalendarEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const auth = await getGoogleCalendarAccessToken(userId);
  if (!auth) {
    throw new Error("Google Calendar not connected");
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.token}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete calendar event");
  }
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  hangoutLink?: string;
  attendees?: { email: string; responseStatus: string }[];
}
