import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/integrations/encryption";
import type {
  CRMClient,
  CRMContact,
  CRMActivity,
  CRMDeal,
  CRMSyncResult,
} from "../types";

/**
 * Salesforce API Client
 */
export class SalesforceClient implements CRMClient {
  private accessToken: string;
  private instanceUrl: string;

  constructor(accessToken: string, instanceUrl: string) {
    this.accessToken = accessToken;
    this.instanceUrl = instanceUrl;
  }

  /**
   * Create a Salesforce client for a user
   */
  static async forUser(userId: string): Promise<SalesforceClient | null> {
    const integration = await db.integration.findFirst({
      where: {
        userId,
        type: "crm_salesforce",
        status: "connected",
      },
    });

    if (!integration?.credentials) return null;

    try {
      const credentials = JSON.parse(decrypt(integration.credentials));

      // Check if token needs refresh
      if (new Date(credentials.expiresAt) <= new Date()) {
        const newTokens = await refreshSalesforceToken(
          credentials.refreshToken,
          credentials.instanceUrl
        );
        if (!newTokens) return null;

        // Update stored credentials
        await db.integration.update({
          where: { id: integration.id },
          data: {
            credentials: encrypt(JSON.stringify(newTokens)),
          },
        });

        return new SalesforceClient(newTokens.accessToken, newTokens.instanceUrl);
      }

      return new SalesforceClient(credentials.accessToken, credentials.instanceUrl);
    } catch (error) {
      console.error("Error creating Salesforce client:", error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.instanceUrl}/services/data/v59.0${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salesforce API error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Contact Operations (using Lead object in Salesforce)

  async createContact(contact: CRMContact): Promise<CRMSyncResult> {
    try {
      const leadData = {
        Email: contact.email,
        FirstName: contact.firstName,
        LastName: contact.lastName || "Unknown",
        Company: contact.company || "Unknown",
        Phone: contact.phone,
        Title: contact.title,
        Website: contact.website,
      };

      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(leadData).filter(([, v]) => v !== undefined)
      );

      const result = await this.request<{ id: string }>(
        "/sobjects/Lead",
        {
          method: "POST",
          body: JSON.stringify(cleanData),
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
      const leadData: Record<string, string | undefined> = {};
      if (contact.email) leadData.Email = contact.email;
      if (contact.firstName) leadData.FirstName = contact.firstName;
      if (contact.lastName) leadData.LastName = contact.lastName;
      if (contact.company) leadData.Company = contact.company;
      if (contact.phone) leadData.Phone = contact.phone;
      if (contact.title) leadData.Title = contact.title;

      await this.request(`/sobjects/Lead/${contactId}`, {
        method: "PATCH",
        body: JSON.stringify(leadData),
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
        Id: string;
        Email: string;
        FirstName: string;
        LastName: string;
        Company: string;
        Phone: string;
        Title: string;
      }>(`/sobjects/Lead/${contactId}`);

      return {
        id: result.Id,
        email: result.Email,
        firstName: result.FirstName,
        lastName: result.LastName,
        company: result.Company,
        phone: result.Phone,
        title: result.Title,
      };
    } catch {
      return null;
    }
  }

  async findContactByEmail(email: string): Promise<CRMContact | null> {
    try {
      const query = encodeURIComponent(
        `SELECT Id, Email, FirstName, LastName, Company, Phone, Title FROM Lead WHERE Email = '${email}' LIMIT 1`
      );

      const result = await this.request<{
        records: Array<{
          Id: string;
          Email: string;
          FirstName: string;
          LastName: string;
          Company: string;
          Phone: string;
          Title: string;
        }>;
      }>(`/query?q=${query}`);

      if (result.records.length === 0) return null;

      const lead = result.records[0];
      return {
        id: lead.Id,
        email: lead.Email,
        firstName: lead.FirstName,
        lastName: lead.LastName,
        company: lead.Company,
        phone: lead.Phone,
        title: lead.Title,
      };
    } catch {
      return null;
    }
  }

  // Activity Operations (using Task object)

  async createActivity(activity: CRMActivity): Promise<CRMSyncResult> {
    try {
      const taskData = {
        WhoId: activity.contactId,
        Subject: activity.subject,
        Description: activity.body,
        Status: "Completed",
        Priority: "Normal",
        ActivityDate: activity.timestamp.toISOString().split("T")[0],
        Type: this.mapActivityType(activity.type),
      };

      const result = await this.request<{ id: string }>(
        "/sobjects/Task",
        {
          method: "POST",
          body: JSON.stringify(taskData),
        }
      );

      return {
        success: true,
        remoteId: result.id,
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
      email: "Email",
      call: "Call",
      meeting: "Meeting",
      note: "Other",
    };
    return mapping[type] || "Other";
  }

  // Deal Operations (using Opportunity object)

  async createDeal(deal: CRMDeal): Promise<CRMSyncResult> {
    try {
      const opportunityData = {
        Name: deal.name,
        Amount: deal.amount,
        StageName: deal.stage || "Prospecting",
        CloseDate: deal.closeDate?.toISOString().split("T")[0] ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        Probability: deal.probability,
      };

      const result = await this.request<{ id: string }>(
        "/sobjects/Opportunity",
        {
          method: "POST",
          body: JSON.stringify(opportunityData),
        }
      );

      // Associate with Lead if contactId provided
      if (deal.contactId) {
        await this.request(
          `/sobjects/OpportunityContactRole`,
          {
            method: "POST",
            body: JSON.stringify({
              OpportunityId: result.id,
              ContactId: deal.contactId,
              IsPrimary: true,
            }),
          }
        ).catch(() => {
          // Contact role association is optional
        });
      }

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
      const opportunityData: Record<string, unknown> = {};
      if (deal.name) opportunityData.Name = deal.name;
      if (deal.amount) opportunityData.Amount = deal.amount;
      if (deal.stage) opportunityData.StageName = deal.stage;
      if (deal.probability) opportunityData.Probability = deal.probability;

      await this.request(`/sobjects/Opportunity/${dealId}`, {
        method: "PATCH",
        body: JSON.stringify(opportunityData),
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
 * Refresh Salesforce access token
 */
async function refreshSalesforceToken(
  refreshToken: string,
  instanceUrl: string
): Promise<{ accessToken: string; refreshToken: string; instanceUrl: string; expiresAt: Date } | null> {
  try {
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Salesforce credentials not configured");
    }

    const response = await fetch("https://login.salesforce.com/services/oauth2/token", {
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
    // Salesforce tokens typically last 2 hours
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Salesforce doesn't return new refresh token
      instanceUrl: data.instance_url || instanceUrl,
      expiresAt,
    };
  } catch (error) {
    console.error("Error refreshing Salesforce token:", error);
    return null;
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeSalesforceCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; instanceUrl: string; expiresAt: Date } | null> {
  try {
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Salesforce credentials not configured");
    }

    const response = await fetch("https://login.salesforce.com/services/oauth2/token", {
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
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      instanceUrl: data.instance_url,
      expiresAt,
    };
  } catch (error) {
    console.error("Error exchanging Salesforce code:", error);
    return null;
  }
}

/**
 * Build Salesforce OAuth URL
 */
export function getSalesforceAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  if (!clientId) {
    throw new Error("SALESFORCE_CLIENT_ID not configured");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "api refresh_token",
  });

  return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
}
