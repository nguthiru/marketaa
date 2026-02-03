import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  enrichLeadFromLinkedIn,
  getLinkedInProfile,
  deleteLinkedInProfile,
} from "@/lib/linkedin/enrichment";
import { isValidLinkedInUrl } from "@/lib/linkedin/parser";

/**
 * GET /api/leads/[leadId]/linkedin - Get LinkedIn profile for a lead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId } = await params;

    // Get lead and verify access
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        project: true,
        linkedInProfile: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Verify access
    const hasAccess =
      lead.project.ownerId === session.user.id ||
      (await db.projectMember.findFirst({
        where: {
          projectId: lead.projectId,
          userId: session.user.id,
        },
      }));

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile data
    const profile = await getLinkedInProfile(leadId);

    return NextResponse.json({
      hasProfile: !!profile,
      linkedinUrl: lead.linkedin,
      profile,
      rawProfile: lead.linkedInProfile,
    });
  } catch (error) {
    console.error("Error fetching LinkedIn profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch LinkedIn profile" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads/[leadId]/linkedin - Add/update LinkedIn profile
 * Body:
 * - linkedinUrl: string (required if no existing profile)
 * - headline?: string
 * - summary?: string
 * - location?: string
 * - industry?: string
 * - currentCompany?: string
 * - currentTitle?: string
 * - experience?: array
 * - education?: array
 * - skills?: string[]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId } = await params;
    const body = await request.json();

    // Get lead and verify access
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { project: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Verify access
    const hasAccess =
      lead.project.ownerId === session.user.id ||
      (await db.projectMember.findFirst({
        where: {
          projectId: lead.projectId,
          userId: session.user.id,
        },
      }));

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get LinkedIn URL (from body or existing lead)
    const linkedinUrl = body.linkedinUrl || lead.linkedin;
    if (!linkedinUrl) {
      return NextResponse.json(
        { error: "LinkedIn URL is required" },
        { status: 400 }
      );
    }

    // Validate LinkedIn URL
    if (!isValidLinkedInUrl(linkedinUrl)) {
      return NextResponse.json(
        { error: "Invalid LinkedIn URL" },
        { status: 400 }
      );
    }

    // Enrich lead with LinkedIn data
    const result = await enrichLeadFromLinkedIn(
      leadId,
      linkedinUrl,
      {
        headline: body.headline,
        summary: body.summary,
        location: body.location,
        industry: body.industry,
        connections: body.connections,
        currentCompany: body.currentCompany,
        currentTitle: body.currentTitle,
        experience: body.experience,
        education: body.education,
        skills: body.skills,
        recentPosts: body.recentPosts,
      },
      "manual"
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to enrich lead" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: result.profile,
    });
  } catch (error) {
    console.error("Error updating LinkedIn profile:", error);
    return NextResponse.json(
      { error: "Failed to update LinkedIn profile" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/[leadId]/linkedin - Remove LinkedIn profile
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId } = await params;

    // Get lead and verify access
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { project: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Verify access
    const hasAccess =
      lead.project.ownerId === session.user.id ||
      (await db.projectMember.findFirst({
        where: {
          projectId: lead.projectId,
          userId: session.user.id,
        },
      }));

    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await deleteLinkedInProfile(leadId);

    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error("Error deleting LinkedIn profile:", error);
    return NextResponse.json(
      { error: "Failed to delete LinkedIn profile" },
      { status: 500 }
    );
  }
}
