import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/integrations/encryption";
import type {
  CRMClient,
  CRMContact,
  CRMActivity,
  CRMDeal,
  CRMSyncResult,
} from "../types";

const HUBSPOT_API_URL = "https://api.hubapi.com";

/**
 * HubSpot API Client
 */
export class HubSpotClient implements CRMClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Create a HubSpot client for a user
   */
  static async forUser(userId: string): Promise<HubSpotClient | null> {
    const integration = await db.integration.findFirst({
      where: {
        userId,
        type: "crm_hubspot",
        status: "connected",
      },
    });

    if (!integration?.credentials) return null;

    try {
      const credentials = JSON.parse(decrypt(integration.credentials));

      // Check if token needs refresh
      if (new Date(credentials.expiresAt) <= new Date()) {
        const newTokens = await refreshHubSpotToken(credentials.refreshToken);
        if (!newTokens) return null;

        // Update stored credentials
        await db.integration.update({
          where: { id: integration.id },
          data: {
            credentials: encrypt(JSON.stringify(newTokens)),
          },
        });

        return new HubSpotClient(newTokens.accessToken);
      }

      return new HubSpotClient(credentials.accessToken);
    } catch (error) {
      console.error("Error creating HubSpot client:", error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${HUBSPOT_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Contact Operations

  async createContact(contact: CRMContact): Promise<CRMSyncResult> {
    try {
      const properties = {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
        company: contact.company,
        phone: contact.phone,
        jobtitle: contact.title,
        website: contact.website,
      };

      // Remove undefined values
      const cleanProperties = Object.fromEntries(
        Object.entries(properties).filter(([, v]) => v !== undefined)
      );

      const result = await this.request<{ id: string }>(
        "/crm/v3/objects/contacts",
        {
          method: "POST",
          body: JSON.stringify({ properties: cleanProperties }),
        }
      );

      return { success: true, remoteId: result.id, operation: "create" };
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
      const properties: Record<string, string | undefined> = {};
      if (contact.email) properties.email = contact.email;
      if (contact.firstName) properties.firstname = contact.firstName;
      if (contact.lastName) properties.lastname = contact.lastName;
      if (contact.company) properties.company = contact.company;
      if (contact.phone) properties.phone = contact.phone;
      if (contact.title) properties.jobtitle = contact.title;

      await this.request(`/crm/v3/objects/contacts/${contactId}`, {
        method: "PATCH",
        body: JSON.stringify({ properties }),
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
        id: string;
        properties: Record<string, string>;
      }>(`/crm/v3/objects/contacts/${contactId}`);

      return {
        id: result.id,
        email: result.properties.email,
        firstName: result.properties.firstname,
        lastName: result.properties.lastname,
        company: result.properties.company,
        phone: result.properties.phone,
        title: result.properties.jobtitle,
      };
    } catch {
      return null;
    }
  }

  async findContactByEmail(email: string): Promise<CRMContact | null> {
    try {
      const result = await this.request<{
        results: Array<{ id: string; properties: Record<string, string> }>;
      }>("/crm/v3/objects/contacts/search", {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "email",
                  operator: "EQ",
                  value: email,
                },
              ],
            },
          ],
        }),
      });

      if (result.results.length === 0) return null;

      const contact = result.results[0];
      return {
        id: contact.id,
        email: contact.properties.email,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        company: contact.properties.company,
        phone: contact.properties.phone,
        title: contact.properties.jobtitle,
      };
    } catch {
      return null;
    }
  }

  // Activity Operations

  async createActivity(activity: CRMActivity): Promise<CRMSyncResult> {
    try {
      const engagementType = this.mapActivityType(activity.type);

      const engagement = {
        engagement: {
          active: true,
          type: engagementType,
          timestamp: activity.timestamp.getTime(),
        },
        associations: {
          contactIds: [parseInt(activity.contactId)],
        },
        metadata: {
          subject: activity.subject,
          body: activity.body,
        },
      };

      const result = await this.request<{ engagement: { id: number } }>(
        "/engagements/v1/engagements",
        {
          method: "POST",
          body: JSON.stringify(engagement),
        }
      );

      return {
        success: true,
        remoteId: String(result.engagement.id),
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
      email: "EMAIL",
      call: "CALL",
      meeting: "MEETING",
      note: "NOTE",
    };
    return mapping[type] || "NOTE";
  }

  // Deal Operations

  async createDeal(deal: CRMDeal): Promise<CRMSyncResult> {
    try {
      const properties = {
        dealname: deal.name,
        amount: deal.amount?.toString(),
        dealstage: deal.stage,
        closedate: deal.closeDate?.toISOString().split("T")[0],
      };

      const result = await this.request<{ id: string }>(
        "/crm/v3/objects/deals",
        {
          method: "POST",
          body: JSON.stringify({ properties }),
        }
      );

      // Associate deal with contact
      await this.request(
        `/crm/v3/objects/deals/${result.id}/associations/contacts/${deal.contactId}/deal_to_contact`,
        { method: "PUT" }
      );

      return { success: true, remoteId: result.id, operation: "create" };
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
      const properties: Record<string, string | undefined> = {};
      if (deal.name) properties.dealname = deal.name;
      if (deal.amount) properties.amount = deal.amount.toString();
      if (deal.stage) properties.dealstage = deal.stage;

      await this.request(`/crm/v3/objects/deals/${dealId}`, {
        method: "PATCH",
        body: JSON.stringify({ properties }),
      });

      return { success: true, remoteId: dealId, operation: "update" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

/**
 * Refresh HubSpot access token
 */
async function refreshHubSpotToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  try {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("HubSpot credentials not configured");
    }

    const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
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
      expiresAt,
    };
  } catch (error) {
    console.error("Error refreshing HubSpot token:", error);
    return null;
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeHubSpotCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  try {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("HubSpot credentials not configured");
    }

    const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
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
      expiresAt,
    };
  } catch (error) {
    console.error("Error exchanging HubSpot code:", error);
    return null;
  }
}

/**
 * Build HubSpot OAuth URL
 */
export function getHubSpotAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  if (!clientId) {
    throw new Error("HUBSPOT_CLIENT_ID not configured");
  }

  const scopes = [
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
    "crm.objects.deals.read",
    "crm.objects.deals.write",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
  });

  return `https://app.hubspot.com/oauth/authorize?${params}`;
}
