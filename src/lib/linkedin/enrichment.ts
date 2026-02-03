import { db } from "@/lib/db";
import { normalizeLinkedInUrl } from "./parser";
import { generateLinkedInContext } from "./context-generator";

/**
 * LinkedIn profile data structure
 */
export interface LinkedInData {
  headline?: string;
  summary?: string;
  location?: string;
  industry?: string;
  connections?: number;
  currentCompany?: string;
  currentTitle?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
    current?: boolean;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    years?: string;
  }>;
  skills?: string[];
  recentPosts?: Array<{
    content: string;
    date?: string;
    engagement?: number;
  }>;
}

/**
 * Enrich a lead with LinkedIn data
 * This function stores the data and generates context items
 */
export async function enrichLeadFromLinkedIn(
  leadId: string,
  linkedinUrl: string,
  data: Partial<LinkedInData>,
  source: "manual" | "api" | "scraper" = "manual"
): Promise<{
  success: boolean;
  profile?: {
    id: string;
    headline: string | null;
    currentCompany: string | null;
    currentTitle: string | null;
  };
  error?: string;
}> {
  try {
    // Normalize the LinkedIn URL
    const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
    if (!normalizedUrl) {
      return { success: false, error: "Invalid LinkedIn URL" };
    }

    // Verify lead exists
    const lead = await db.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return { success: false, error: "Lead not found" };
    }

    // Upsert LinkedIn profile
    const profile = await db.linkedInProfile.upsert({
      where: { leadId },
      create: {
        leadId,
        linkedinUrl: normalizedUrl,
        headline: data.headline,
        summary: data.summary,
        location: data.location,
        industry: data.industry,
        connections: data.connections,
        currentCompany: data.currentCompany,
        currentTitle: data.currentTitle,
        experience: data.experience ? JSON.stringify(data.experience) : null,
        education: data.education ? JSON.stringify(data.education) : null,
        skills: data.skills ? JSON.stringify(data.skills) : null,
        recentPosts: data.recentPosts ? JSON.stringify(data.recentPosts) : null,
        enrichmentSource: source,
        enrichedAt: new Date(),
      },
      update: {
        linkedinUrl: normalizedUrl,
        headline: data.headline,
        summary: data.summary,
        location: data.location,
        industry: data.industry,
        connections: data.connections,
        currentCompany: data.currentCompany,
        currentTitle: data.currentTitle,
        experience: data.experience ? JSON.stringify(data.experience) : null,
        education: data.education ? JSON.stringify(data.education) : null,
        skills: data.skills ? JSON.stringify(data.skills) : null,
        recentPosts: data.recentPosts ? JSON.stringify(data.recentPosts) : null,
        enrichmentSource: source,
        enrichedAt: new Date(),
      },
    });

    // Update lead's LinkedIn URL if not set
    if (!lead.linkedin || lead.linkedin !== normalizedUrl) {
      await db.lead.update({
        where: { id: leadId },
        data: { linkedin: normalizedUrl },
      });
    }

    // Generate context items from LinkedIn data
    await generateLinkedInContext(leadId, data);

    return {
      success: true,
      profile: {
        id: profile.id,
        headline: profile.headline,
        currentCompany: profile.currentCompany,
        currentTitle: profile.currentTitle,
      },
    };
  } catch (error) {
    console.error("Error enriching lead from LinkedIn:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get LinkedIn profile for a lead
 */
export async function getLinkedInProfile(
  leadId: string
): Promise<LinkedInData | null> {
  const profile = await db.linkedInProfile.findUnique({
    where: { leadId },
  });

  if (!profile) return null;

  return {
    headline: profile.headline || undefined,
    summary: profile.summary || undefined,
    location: profile.location || undefined,
    industry: profile.industry || undefined,
    connections: profile.connections || undefined,
    currentCompany: profile.currentCompany || undefined,
    currentTitle: profile.currentTitle || undefined,
    experience: profile.experience ? JSON.parse(profile.experience) : undefined,
    education: profile.education ? JSON.parse(profile.education) : undefined,
    skills: profile.skills ? JSON.parse(profile.skills) : undefined,
    recentPosts: profile.recentPosts
      ? JSON.parse(profile.recentPosts)
      : undefined,
  };
}

/**
 * Delete LinkedIn profile for a lead
 */
export async function deleteLinkedInProfile(leadId: string): Promise<boolean> {
  try {
    await db.linkedInProfile.delete({
      where: { leadId },
    });
    return true;
  } catch {
    return false;
  }
}
