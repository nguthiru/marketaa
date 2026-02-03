import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/integrations/encryption";
import type {
  CRMClient,
  CRMContact,
  CRMActivity,
  CRMDeal,
  CRMSyncResult,
} from "../types";

const PIPEDRIVE_API_URL = "https://api.pipedrive.com/v1";

/**
 * Pipedrive API Client
 */
export class PipedriveClient implements CRMClient {
  private accessToken: string;
  private apiDomain: string;

  constructor(accessToken: string, apiDomain: string = "api.pipedrive.com") {
    this.accessToken = accessToken;
    this.apiDomain = apiDomain;
  }

  /**
   * Create a Pipedrive client for a user
   */
  static async forUser(userId: string): Promise<PipedriveClient | null> {
    const integration = await db.integration.findFirst({
      where: {
        userId,
        type: "crm_pipedrive",
        status: "connected",
      },
    });

    if (!integration?.credentials) return null;

    try {
      const credentials = JSON.parse(decrypt(integration.credentials));

      // Check if token needs refresh
      if (new Date(credentials.expiresAt) <= new Date()) {
        const newTokens = await refreshPipedriveToken(credentials.refreshToken);
        if (!newTokens) return null;

        // Update stored credentials
        await db.integration.update({
          where: { id: integration.id },
          data: {
            credentials: encrypt(JSON.stringify(newTokens)),
          },
        });

        return new PipedriveClient(newTokens.accessToken, newTokens.apiDomain);
      }

      return new PipedriveClient(credentials.accessToken, credentials.apiDomain);
    } catch (error) {
      console.error("Error creating Pipedrive client:", error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `https://${this.apiDomain}/v1${endpoint}`;
    const separator = endpoint.includes("?") ? "&" : "?";

    const response = await fetch(`${url}${separator}api_token=${this.accessToken}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pipedrive API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(`Pipedrive API error: ${data.error || "Unknown error"}`);
    }

    return data.data;
  }

  // Contact Operations (using Person object in Pipedrive)

  async createContact(contact: CRMContact): Promise<CRMSyncResult> {
    try {
      const personData = {
        name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email,
        email: [{ value: contact.email, primary: true }],
        phone: contact.phone ? [{ value: contact.phone, primary: true }] : undefined,
        org_id: undefined as number | undefined,
      };

      // If company provided, create or find organization first
      if (contact.company) {
        const orgId = await this.findOrCreateOrganization(contact.company);
        if (orgId) {
          personData.org_id = orgId;
        }
      }

      const result = await this.request<{ id: number }>(
        "/persons",
        {
          method: "POST",
          body: JSON.stringify(personData),
        }
      );

      return { success: true, remoteId: String(result.id), operation: "create" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateContact(
    contactId: string,
    contact: Partial<CRMContact>
  ): Promise<CRMSyncResult> {
    try {
      const personData: Record<string, unknown> = {};

      if (contact.firstName || contact.lastName) {
        personData.name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
      }
      if (contact.email) {
        personData.email = [{ value: contact.email, primary: true }];
      }
      if (contact.phone) {
        personData.phone = [{ value: contact.phone, primary: true }];
      }

      await this.request(`/persons/${contactId}`, {
        method: "PUT",
        body: JSON.stringify(personData),
      });

      return { success: true, remoteId: contactId, operation: "update" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getContact(contactId: string): Promise<CRMContact | null> {
    try {
      const result = await this.request<{
        id: number;
        name: string;
        email: Array<{ value: string; primary: boolean }>;
        phone: Array<{ value: string; primary: boolean }>;
        org_id: { name: string } | null;
      }>(`/persons/${contactId}`);

      const nameParts = result.name.split(" ");
      return {
        id: String(result.id),
        email: result.email.find((e) => e.primary)?.value || result.email[0]?.value || "",
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" "),
        company: result.org_id?.name,
        phone: result.phone.find((p) => p.primary)?.value || result.phone[0]?.value,
      };
    } catch {
      return null;
    }
  }

  async findContactByEmail(email: string): Promise<CRMContact | null> {
    try {
      const result = await this.request<
        Array<{
          id: number;
          name: string;
          email: Array<{ value: string; primary: boolean }>;
          phone: Array<{ value: string; primary: boolean }>;
          org_id: { name: string } | null;
        }>
      >(`/persons/search?term=${encodeURIComponent(email)}&fields=email`);

      if (!result || result.length === 0) return null;

      const person = result[0];
      const nameParts = person.name.split(" ");
      return {
        id: String(person.id),
        email: person.email.find((e) => e.primary)?.value || person.email[0]?.value || email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" "),
        company: person.org_id?.name,
        phone: person.phone?.find((p) => p.primary)?.value || person.phone?.[0]?.value,
      };
    } catch {
      return null;
    }
  }

  // Activity Operations

  async createActivity(activity: CRMActivity): Promise<CRMSyncResult> {
    try {
      const activityData = {
        subject: activity.subject,
        type: this.mapActivityType(activity.type),
        person_id: parseInt(activity.contactId),
        note: activity.body,
        done: 1,
        due_date: activity.timestamp.toISOString().split("T")[0],
        due_time: activity.timestamp.toISOString().split("T")[1].substring(0, 5),
      };

      const result = await this.request<{ id: number }>(
        "/activities",
        {
          method: "POST",
          body: JSON.stringify(activityData),
        }
      );

      return {
        success: true,
        remoteId: String(result.id),
        operation: "create",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private mapActivityType(type: string): string {
    const mapping: Record<string, string> = {
      email: "email",
      call: "call",
      meeting: "meeting",
      note: "task",
    };
    return mapping[type] || "task";
  }

  // Deal Operations

  async createDeal(deal: CRMDeal): Promise<CRMSyncResult> {
    try {
      const dealData = {
        title: deal.name,
        value: deal.amount,
        person_id: parseInt(deal.contactId),
        expected_close_date: deal.closeDate?.toISOString().split("T")[0],
        probability: deal.probability,
      };

      const result = await this.request<{ id: number }>(
        "/deals",
        {
          method: "POST",
          body: JSON.stringify(dealData),
        }
      );

      return { success: true, remoteId: String(result.id), operation: "create" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateDeal(
    dealId: string,
    deal: Partial<CRMDeal>
  ): Promise<CRMSyncResult> {
    try {
      const dealData: Record<string, unknown> = {};
      if (deal.name) dealData.title = deal.name;
      if (deal.amount) dealData.value = deal.amount;
      if (deal.probability) dealData.probability = deal.probability;

      await this.request(`/deals/${dealId}`, {
        method: "PUT",
        body: JSON.stringify(dealData),
      });

      return { success: true, remoteId: dealId, operation: "update" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Helper methods

  private async findOrCreateOrganization(name: string): Promise<number | null> {
    try {
      // Search for existing org
      const searchResult = await this.request<Array<{ id: number; name: string }>>(
        `/organizations/search?term=${encodeURIComponent(name)}`
      );

      if (searchResult && searchResult.length > 0) {
        return searchResult[0].id;
      }

      // Create new org
      const newOrg = await this.request<{ id: number }>(
        "/organizations",
        {
          method: "POST",
          body: JSON.stringify({ name }),
        }
      );

      return newOrg.id;
    } catch {
      return null;
    }
  }
}

/**
 * Refresh Pipedrive access token
 */
async function refreshPipedriveToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; apiDomain: string; expiresAt: Date } | null> {
  try {
    const clientId = process.env.PIPEDRIVE_CLIENT_ID;
    const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Pipedrive credentials not configured");
    }

    const response = await fetch("https://oauth.pipedrive.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      apiDomain: data.api_domain || "api.pipedrive.com",
      expiresAt,
    };
  } catch (error) {
    console.error("Error refreshing Pipedrive token:", error);
    return null;
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangePipedriveCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; apiDomain: string; expiresAt: Date } | null> {
  try {
    const clientId = process.env.PIPEDRIVE_CLIENT_ID;
    const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Pipedrive credentials not configured");
    }

    const response = await fetch("https://oauth.pipedrive.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      apiDomain: data.api_domain || "api.pipedrive.com",
      expiresAt,
    };
  } catch (error) {
    console.error("Error exchanging Pipedrive code:", error);
    return null;
  }
}

/**
 * Build Pipedrive OAuth URL
 */
export function getPipedriveAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.PIPEDRIVE_CLIENT_ID;
  if (!clientId) {
    throw new Error("PIPEDRIVE_CLIENT_ID not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return `https://oauth.pipedrive.com/oauth/authorize?${params}`;
}
