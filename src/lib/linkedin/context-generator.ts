import { db } from "@/lib/db";
import type { LinkedInData } from "./enrichment";

/**
 * Context item to create from LinkedIn data
 */
interface ContextItem {
  key: string;
  value: string;
  source: string;
  confidence: string;
}

/**
 * Generate lead context items from LinkedIn profile data
 */
export async function generateLinkedInContext(
  leadId: string,
  data: Partial<LinkedInData>
): Promise<number> {
  const contextItems: ContextItem[] = [];

  // Headline - great for understanding what they do
  if (data.headline) {
    contextItems.push({
      key: "linkedin_headline",
      value: data.headline,
      source: "linkedin",
      confidence: "confirmed",
    });
  }

  // Current position
  if (data.currentCompany && data.currentTitle) {
    contextItems.push({
      key: "current_position",
      value: `${data.currentTitle} at ${data.currentCompany}`,
      source: "linkedin",
      confidence: "confirmed",
    });
  } else if (data.currentTitle) {
    contextItems.push({
      key: "current_title",
      value: data.currentTitle,
      source: "linkedin",
      confidence: "confirmed",
    });
  } else if (data.currentCompany) {
    contextItems.push({
      key: "current_company",
      value: data.currentCompany,
      source: "linkedin",
      confidence: "confirmed",
    });
  }

  // Location
  if (data.location) {
    contextItems.push({
      key: "location",
      value: data.location,
      source: "linkedin",
      confidence: "confirmed",
    });
  }

  // Industry
  if (data.industry) {
    contextItems.push({
      key: "industry",
      value: data.industry,
      source: "linkedin",
      confidence: "confirmed",
    });
  }

  // Top skills (limit to 10)
  if (data.skills && data.skills.length > 0) {
    contextItems.push({
      key: "linkedin_skills",
      value: data.skills.slice(0, 10).join(", "),
      source: "linkedin",
      confidence: "confirmed",
    });
  }

  // Career background from experience
  if (data.experience && data.experience.length > 0) {
    const companies = data.experience
      .slice(0, 5)
      .map((e) => e.company)
      .filter(Boolean);
    if (companies.length > 0) {
      contextItems.push({
        key: "career_history",
        value: `Previously at: ${[...new Set(companies)].join(", ")}`,
        source: "linkedin",
        confidence: "confirmed",
      });
    }

    // Years of experience estimate
    const currentRole = data.experience.find((e) => e.current);
    if (currentRole?.duration) {
      contextItems.push({
        key: "tenure_current_role",
        value: currentRole.duration,
        source: "linkedin",
        confidence: "confirmed",
      });
    }
  }

  // Education highlights
  if (data.education && data.education.length > 0) {
    const schools = data.education
      .slice(0, 3)
      .map((e) => e.school)
      .filter(Boolean);
    if (schools.length > 0) {
      contextItems.push({
        key: "education",
        value: schools.join(", "),
        source: "linkedin",
        confidence: "confirmed",
      });
    }
  }

  // Professional summary
  if (data.summary && data.summary.length > 50) {
    // Truncate if too long
    const truncated =
      data.summary.length > 500
        ? data.summary.substring(0, 500) + "..."
        : data.summary;
    contextItems.push({
      key: "professional_summary",
      value: truncated,
      source: "linkedin",
      confidence: "confirmed",
    });
  }

  // Network size (useful for influence assessment)
  if (data.connections && data.connections > 0) {
    let networkSize = "small";
    if (data.connections >= 500) networkSize = "large (500+)";
    else if (data.connections >= 200) networkSize = "medium";

    contextItems.push({
      key: "linkedin_network",
      value: `${networkSize} network`,
      source: "linkedin",
      confidence: "confirmed",
    });
  }

  // Recent activity (if available)
  if (data.recentPosts && data.recentPosts.length > 0) {
    const recentTopics = data.recentPosts
      .slice(0, 3)
      .map((p) => p.content.substring(0, 100))
      .join("; ");
    if (recentTopics) {
      contextItems.push({
        key: "recent_linkedin_activity",
        value: recentTopics,
        source: "linkedin",
        confidence: "likely",
      });
    }
  }

  // Upsert all context items
  let created = 0;
  for (const item of contextItems) {
    try {
      await db.leadContext.upsert({
        where: {
          // Use a compound query since we don't have a compound unique constraint
          id: await getContextId(leadId, item.key),
        },
        create: {
          leadId,
          key: item.key,
          value: item.value,
          source: item.source,
          confidence: item.confidence,
        },
        update: {
          value: item.value,
          source: item.source,
          confidence: item.confidence,
          updatedAt: new Date(),
        },
      });
      created++;
    } catch {
      // If upsert fails due to constraint, try create
      try {
        await db.leadContext.create({
          data: {
            leadId,
            key: item.key,
            value: item.value,
            source: item.source,
            confidence: item.confidence,
          },
        });
        created++;
      } catch {
        // Item might already exist with different id, skip
      }
    }
  }

  return created;
}

/**
 * Helper to get existing context ID for upsert
 */
async function getContextId(leadId: string, key: string): Promise<string> {
  const existing = await db.leadContext.findFirst({
    where: { leadId, key },
    select: { id: true },
  });
  return existing?.id || "new-id-" + Date.now();
}
