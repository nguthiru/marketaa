/**
 * Parse a LinkedIn URL to extract profile information
 */
export interface LinkedInUrlInfo {
  isValid: boolean;
  profileId?: string;
  type?: "personal" | "company";
  normalizedUrl?: string;
}

/**
 * Parse a LinkedIn URL and extract the profile ID
 */
export function parseLinkedInUrl(url: string): LinkedInUrlInfo {
  if (!url) {
    return { isValid: false };
  }

  // Clean the URL
  let cleanUrl = url.trim();

  // Add protocol if missing
  if (!cleanUrl.startsWith("http")) {
    cleanUrl = "https://" + cleanUrl;
  }

  try {
    const urlObj = new URL(cleanUrl);

    // Check if it's a LinkedIn domain
    if (
      !urlObj.hostname.includes("linkedin.com") &&
      !urlObj.hostname.includes("linkedin.cn")
    ) {
      return { isValid: false };
    }

    // Personal profile patterns
    const personalPatterns = [
      /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i,
      /linkedin\.com\/pub\/([a-zA-Z0-9_-]+)/i,
    ];

    for (const pattern of personalPatterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        const profileId = match[1].split(/[?#]/)[0]; // Remove query params
        return {
          isValid: true,
          profileId,
          type: "personal",
          normalizedUrl: `https://www.linkedin.com/in/${profileId}`,
        };
      }
    }

    // Company page patterns
    const companyPattern = /linkedin\.com\/company\/([a-zA-Z0-9_-]+)/i;
    const companyMatch = cleanUrl.match(companyPattern);
    if (companyMatch) {
      const profileId = companyMatch[1].split(/[?#]/)[0];
      return {
        isValid: true,
        profileId,
        type: "company",
        normalizedUrl: `https://www.linkedin.com/company/${profileId}`,
      };
    }

    return { isValid: false };
  } catch {
    return { isValid: false };
  }
}

/**
 * Normalize a LinkedIn URL to a consistent format
 */
export function normalizeLinkedInUrl(url: string): string | null {
  const parsed = parseLinkedInUrl(url);
  return parsed.normalizedUrl || null;
}

/**
 * Extract profile ID from a LinkedIn URL
 */
export function extractLinkedInProfileId(url: string): string | null {
  const parsed = parseLinkedInUrl(url);
  return parsed.profileId || null;
}

/**
 * Check if a URL is a valid LinkedIn profile URL
 */
export function isValidLinkedInUrl(url: string): boolean {
  return parseLinkedInUrl(url).isValid;
}
