import { db } from "@/lib/db";
import { decrypt, encrypt } from "./encryption";
import { refreshGoogleToken, refreshMicrosoftToken } from "./oauth";

interface CalendarCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

interface CalendarEventInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail?: string;
  attendeeName?: string;
  location?: string;
}

interface CalendarEventResult {
  id: string;
  meetingLink?: string;
  htmlLink?: string;
}

// Get valid access token for Google Calendar
async function getGoogleCalendarToken(userId: string): Promise<{ token: string; email: string } | null> {
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
      data: { credentials: encrypt(JSON.stringify(newCredentials)) },
    });

    return { token: newTokens.access_token, email: credentials.email };
  }

  return { token: credentials.accessToken, email: credentials.email };
}

// Get valid access token for Outlook Calendar
async function getOutlookCalendarToken(userId: string): Promise<{ token: string; email: string } | null> {
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
      data: { credentials: encrypt(JSON.stringify(newCredentials)) },
    });

    return { token: newTokens.access_token, email: credentials.email };
  }

  return { token: credentials.accessToken, email: credentials.email };
}

// Create Google Calendar event
export async function createGoogleCalendarEvent(
  userId: string,
  event: CalendarEventInput
): Promise<CalendarEventResult> {
  const auth = await getGoogleCalendarToken(userId);
  if (!auth) {
    throw new Error("Google Calendar not connected");
  }

  const eventBody: Record<string, unknown> = {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: event.startTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: event.endTime.toISOString(),
      timeZone: "UTC",
    },
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  if (event.attendeeEmail) {
    eventBody.attendees = [
      {
        email: event.attendeeEmail,
        displayName: event.attendeeName,
      },
    ];
  }

  if (event.location) {
    eventBody.location = event.location;
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
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
    throw new Error(`Failed to create Google Calendar event: ${error}`);
  }

  const result = await response.json();

  return {
    id: result.id,
    meetingLink: result.conferenceData?.entryPoints?.find(
      (ep: { entryPointType: string }) => ep.entryPointType === "video"
    )?.uri,
    htmlLink: result.htmlLink,
  };
}

// Create Outlook Calendar event
export async function createOutlookCalendarEvent(
  userId: string,
  event: CalendarEventInput
): Promise<CalendarEventResult> {
  const auth = await getOutlookCalendarToken(userId);
  if (!auth) {
    throw new Error("Outlook Calendar not connected");
  }

  const eventBody: Record<string, unknown> = {
    subject: event.title,
    body: {
      contentType: "text",
      content: event.description || "",
    },
    start: {
      dateTime: event.startTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: event.endTime.toISOString(),
      timeZone: "UTC",
    },
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
  };

  if (event.attendeeEmail) {
    eventBody.attendees = [
      {
        emailAddress: {
          address: event.attendeeEmail,
          name: event.attendeeName,
        },
        type: "required",
      },
    ];
  }

  if (event.location) {
    eventBody.location = { displayName: event.location };
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
    throw new Error(`Failed to create Outlook Calendar event: ${error}`);
  }

  const result = await response.json();

  return {
    id: result.id,
    meetingLink: result.onlineMeeting?.joinUrl,
    htmlLink: result.webLink,
  };
}

// Create calendar event using available integration
export async function createCalendarEvent(
  userId: string,
  event: CalendarEventInput,
  leadId?: string
): Promise<CalendarEventResult & { provider: string }> {
  // Try Google first, then Outlook
  const googleIntegration = await db.integration.findFirst({
    where: { userId, type: "calendar_google", status: "connected" },
  });

  let result: CalendarEventResult;
  let provider: string;

  if (googleIntegration) {
    result = await createGoogleCalendarEvent(userId, event);
    provider = "google";
  } else {
    const outlookIntegration = await db.integration.findFirst({
      where: { userId, type: "calendar_outlook", status: "connected" },
    });

    if (!outlookIntegration) {
      throw new Error("No calendar integration connected");
    }

    result = await createOutlookCalendarEvent(userId, event);
    provider = "outlook";
  }

  // Store event in database
  await db.calendarEvent.create({
    data: {
      userId,
      leadId,
      externalId: result.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      meetingLink: result.meetingLink,
      status: "scheduled",
    },
  });

  return { ...result, provider };
}
