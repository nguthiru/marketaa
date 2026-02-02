import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
});

interface EmailFinderResult {
  email: string | null;
  confidence: "high" | "medium" | "low";
  source: string;
  alternatives?: string[];
}

// Common email patterns
const EMAIL_PATTERNS = [
  "{first}@{domain}",
  "{last}@{domain}",
  "{first}.{last}@{domain}",
  "{first}{last}@{domain}",
  "{f}{last}@{domain}",
  "{first}.{l}@{domain}",
  "{first}_{last}@{domain}",
];

// Generate possible email variations
export function generateEmailVariations(
  firstName: string,
  lastName: string,
  domain: string
): string[] {
  const first = firstName.toLowerCase().trim();
  const last = lastName.toLowerCase().trim();
  const f = first[0] || "";
  const l = last[0] || "";

  return EMAIL_PATTERNS.map((pattern) =>
    pattern
      .replace("{first}", first)
      .replace("{last}", last)
      .replace("{f}", f)
      .replace("{l}", l)
      .replace("{domain}", domain)
  );
}

// Find email using Tavily API (if configured)
export async function findEmailWithSearch(
  name: string,
  company: string
): Promise<EmailFinderResult> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!tavilyApiKey) {
    return {
      email: null,
      confidence: "low",
      source: "web_search",
    };
  }

  try {
    // Use Tavily API directly
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: `${name} ${company} email contact`,
        max_results: 5,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      throw new Error("Tavily API request failed");
    }

    const data = await response.json();

    // Parse results for email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails: string[] = [];

    for (const result of data.results || []) {
      const content = result.content || "";
      const matches = content.match(emailRegex);
      if (matches) {
        foundEmails.push(...matches);
      }
    }

    // Filter out common generic emails
    const filteredEmails = foundEmails.filter(
      (email) =>
        !email.includes("example.com") &&
        !email.includes("noreply") &&
        !email.includes("info@") &&
        !email.includes("support@") &&
        !email.includes("contact@")
    );

    if (filteredEmails.length > 0) {
      const email = filteredEmails[0];
      return {
        email,
        confidence: "high",
        source: "web_search",
        alternatives: filteredEmails.slice(1),
      };
    }

    return {
      email: null,
      confidence: "low",
      source: "web_search",
    };
  } catch (error) {
    console.error("Email search failed:", error);
    return {
      email: null,
      confidence: "low",
      source: "web_search",
    };
  }
}

// Use AI to infer email from available data
export async function inferEmailWithAI(
  name: string,
  company: string,
  domain?: string,
  additionalContext?: string
): Promise<EmailFinderResult> {
  try {
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ");

    // If we have a domain, generate variations
    if (domain) {
      const variations = generateEmailVariations(firstName, lastName, domain);

      // Use AI to pick the most likely format
      const response = await model.invoke([
        {
          role: "system",
          content: `You are an email pattern expert. Given a person's name and company, determine the most likely email format.

Common patterns:
- firstname@domain (most common for small companies)
- firstname.lastname@domain (common for larger companies)
- firstnamelastname@domain
- f.lastname@domain
- firstname.l@domain

Respond with just the email address, nothing else.`,
        },
        {
          role: "user",
          content: `Name: ${name}
Company: ${company}
Domain: ${domain}
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Possible variations:
${variations.join("\n")}

What is the most likely email address?`,
        },
      ]);

      const email = response.content.toString().trim().toLowerCase();

      // Validate it's a real email format
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (emailRegex.test(email)) {
        return {
          email,
          confidence: "medium",
          source: "ai_inference",
          alternatives: variations.filter((v) => v !== email),
        };
      }
    }

    return {
      email: null,
      confidence: "low",
      source: "ai_inference",
    };
  } catch (error) {
    console.error("AI email inference failed:", error);
    return {
      email: null,
      confidence: "low",
      source: "ai_inference",
    };
  }
}

// Main email finder function
export async function findEmail(
  name: string,
  company: string,
  domain?: string
): Promise<EmailFinderResult> {
  // First, try web search
  const searchResult = await findEmailWithSearch(name, company);
  if (searchResult.email && searchResult.confidence === "high") {
    return searchResult;
  }

  // If we have a domain, try AI inference
  if (domain) {
    const aiResult = await inferEmailWithAI(name, company, domain);
    if (aiResult.email) {
      return aiResult;
    }
  }

  // Return best effort result
  if (searchResult.email) {
    return searchResult;
  }

  // Generate guess if we have domain
  if (domain) {
    const [firstName] = name.split(" ");
    return {
      email: `${firstName.toLowerCase()}@${domain}`,
      confidence: "low",
      source: "pattern_guess",
      alternatives: generateEmailVariations(
        firstName,
        name.split(" ").slice(1).join(" ") || firstName,
        domain
      ),
    };
  }

  return {
    email: null,
    confidence: "low",
    source: "not_found",
  };
}
