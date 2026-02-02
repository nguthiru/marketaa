import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createGoogleCalendarEvent,
  listGoogleCalendarEvents,
} from "@/lib/integrations/gmail/calendar";
import {
  createOutlookCalendarEvent,
  listOutlookCalendarEvents,
} from "@/lib/integrations/outlook/calendar";

// GET /api/calendar/events - List calendar events
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start") || new Date().toISOString();
    const endDate =
      searchParams.get("end") ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Check which calendar is connected
    const googleCalendar = await db.integration.findFirst({
      where: {
        userId: session.user.id,
        type: "calendar_google",
        status: "connected",
      },
    });

    const outlookCalendar = await db.integration.findFirst({
      where: {
        userId: session.user.id,
        type: "calendar_outlook",
        status: "connected",
      },
    });

    const events: {
      id: string;
      title: string;
      start: string;
      end: string;
      link?: string;
      meetingLink?: string;
      provider: string;
    }[] = [];

    // Fetch Google Calendar events
    if (googleCalendar) {
      try {
        const { items } = await listGoogleCalendarEvents(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );

        for (const event of items || []) {
          events.push({
            id: event.id,
            title: event.summary,
            start: event.start.dateTime || event.start.date || "",
            end: event.end.dateTime || event.end.date || "",
            link: event.htmlLink,
            meetingLink: event.hangoutLink,
            provider: "google",
          });
        }
      } catch (error) {
        console.error("Failed to fetch Google Calendar events:", error);
      }
    }

    // Fetch Outlook Calendar events
    if (outlookCalendar) {
      try {
        const { value } = await listOutlookCalendarEvents(
          session.user.id,
          new Date(startDate),
          new Date(endDate)
        );

        for (const event of value || []) {
          events.push({
            id: event.id,
            title: event.subject,
            start: event.start.dateTime,
            end: event.end.dateTime,
            link: event.webLink,
            meetingLink: event.onlineMeetingUrl,
            provider: "microsoft",
          });
        }
      } catch (error) {
        console.error("Failed to fetch Outlook Calendar events:", error);
      }
    }

    // Sort by start time
    events.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to list calendar events:", error);
    return NextResponse.json(
      { error: "Failed to list calendar events" },
      { status: 500 }
    );
  }
}

// POST /api/calendar/events - Create a calendar event
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, start, end, attendees, meetingLink, leadId, provider } = body;

    if (!title || !start || !end) {
      return NextResponse.json(
        { error: "Title, start, and end are required" },
        { status: 400 }
      );
    }

    const eventData = {
      summary: title,
      description,
      start: new Date(start),
      end: new Date(end),
      attendees,
      meetingLink,
    };

    let result: { id: string; link?: string; meetingLink?: string };

    // Prefer the specified provider, or use whichever is connected
    if (provider === "google" || !provider) {
      const googleCalendar = await db.integration.findFirst({
        where: {
          userId: session.user.id,
          type: "calendar_google",
          status: "connected",
        },
      });

      if (googleCalendar) {
        const event = await createGoogleCalendarEvent(session.user.id, eventData);
        result = {
          id: event.id,
          link: event.htmlLink,
          meetingLink: event.hangoutLink,
        };
      } else {
        return NextResponse.json(
          { error: "No calendar connected" },
          { status: 400 }
        );
      }
    } else {
      const outlookCalendar = await db.integration.findFirst({
        where: {
          userId: session.user.id,
          type: "calendar_outlook",
          status: "connected",
        },
      });

      if (outlookCalendar) {
        const event = await createOutlookCalendarEvent(session.user.id, eventData);
        result = {
          id: event.id,
          link: event.webLink,
          meetingLink: event.onlineMeetingUrl,
        };
      } else {
        return NextResponse.json(
          { error: "No calendar connected" },
          { status: 400 }
        );
      }
    }

    // If associated with a lead, create calendar event record
    if (leadId) {
      await db.calendarEvent.create({
        data: {
          externalId: result.id,
          title,
          description,
          startTime: new Date(start),
          endTime: new Date(end),
          meetingLink: result.meetingLink,
          status: "scheduled",
          leadId,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}
