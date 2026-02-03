import { db } from "@/lib/db";
import { HubSpotClient } from "./hubspot/client";
import { SalesforceClient } from "./salesforce/client";
import { PipedriveClient } from "./pipedrive/client";
import type { CRMProvider, CRMContact, CRMActivity, CRMSyncResult, CRMClient } from "./types";

/**
 * CRM Sync Manager - Orchestrates syncing between Marketaa and CRM platforms
 */
export class CRMSyncManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Sync a lead to a CRM
   */
  async syncLeadToCRM(
    leadId: string,
    provider: CRMProvider
  ): Promise<CRMSyncResult> {
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        actions: {
          where: { status: "sent" },
          include: { feedback: true },
        },
      },
    });

    if (!lead || !lead.email) {
      return { success: false, error: "Lead not found or has no email" };
    }

    const client = await this.getClient(provider);
    if (!client) {
      return { success: false, error: `${provider} not connected` };
    }

    // Check for existing mapping
    let mapping = await db.cRMMapping.findUnique({
      where: {
        provider_localEntityType_localEntityId: {
          provider,
          localEntityType: "lead",
          localEntityId: leadId,
        },
      },
    });

    // Build contact data from lead
    const nameParts = lead.name.split(" ");
    const contact: CRMContact = {
      email: lead.email,
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(" ") || undefined,
      company: lead.organization || undefined,
      title: lead.role || undefined,
      website: lead.website || undefined,
    };

    let result: CRMSyncResult;

    if (mapping) {
      // Update existing contact
      result = await client.updateContact(mapping.remoteEntityId, contact);
    } else {
      // Check if contact already exists in CRM
      const existingContact = await client.findContactByEmail(lead.email);

      if (existingContact?.id) {
        // Update and create mapping
        result = await client.updateContact(existingContact.id, contact);
        if (result.success) {
          result.remoteId = existingContact.id;
          result.operation = "update";
        }
      } else {
        // Create new contact
        result = await client.createContact(contact);
      }

      // Create mapping if successful
      if (result.success && result.remoteId) {
        await db.cRMMapping.create({
          data: {
            userId: this.userId,
            provider,
            localEntityType: "lead",
            localEntityId: leadId,
            remoteEntityType: "contact",
            remoteEntityId: result.remoteId,
            lastSyncedAt: new Date(),
          },
        });
      }
    }

    // Log the sync
    await this.logSync(provider, result.success ? "create" : "update", "contact", leadId, result);

    // Sync activities if contact sync was successful
    if (result.success && result.remoteId) {
      for (const action of lead.actions) {
        await this.syncActivityToCRM(action.id, provider, result.remoteId);
      }
    }

    return result;
  }

  /**
   * Sync an action (email) to CRM as an activity
   */
  async syncActivityToCRM(
    actionId: string,
    provider: CRMProvider,
    contactId: string
  ): Promise<CRMSyncResult> {
    // Check if already synced
    const existingMapping = await db.cRMMapping.findUnique({
      where: {
        provider_localEntityType_localEntityId: {
          provider,
          localEntityType: "action",
          localEntityId: actionId,
        },
      },
    });

    if (existingMapping) {
      return { success: true, remoteId: existingMapping.remoteEntityId, operation: "skip" };
    }

    const action = await db.action.findUnique({
      where: { id: actionId },
      include: { feedback: true },
    });

    if (!action || action.status !== "sent") {
      return { success: false, error: "Action not found or not sent" };
    }

    const client = await this.getClient(provider);
    if (!client) {
      return { success: false, error: `${provider} not connected` };
    }

    const activity: CRMActivity = {
      contactId,
      type: action.type as "email" | "call" | "meeting" | "note",
      subject: action.subject || "Email",
      body: action.body,
      timestamp: action.sentAt || new Date(),
      outcome: action.feedback?.outcome,
      direction: "outbound",
    };

    const result = await client.createActivity(activity);

    // Create mapping if successful
    if (result.success && result.remoteId) {
      await db.cRMMapping.create({
        data: {
          userId: this.userId,
          provider,
          localEntityType: "action",
          localEntityId: actionId,
          remoteEntityType: "activity",
          remoteEntityId: result.remoteId,
          lastSyncedAt: new Date(),
        },
      });
    }

    await this.logSync(provider, "create", "activity", actionId, result);

    return result;
  }

  /**
   * Get the appropriate CRM client
   */
  private async getClient(provider: CRMProvider): Promise<CRMClient | null> {
    switch (provider) {
      case "hubspot":
        return HubSpotClient.forUser(this.userId);
      case "salesforce":
        return SalesforceClient.forUser(this.userId);
      case "pipedrive":
        return PipedriveClient.forUser(this.userId);
      default:
        return null;
    }
  }

  /**
   * Log sync operation
   */
  private async logSync(
    provider: CRMProvider,
    operation: string,
    entityType: string,
    entityId: string,
    result: CRMSyncResult
  ): Promise<void> {
    await db.cRMSyncLog.create({
      data: {
        userId: this.userId,
        provider,
        operation,
        direction: "outbound",
        entityType,
        entityId,
        success: result.success,
        errorMessage: result.error,
      },
    });
  }

  /**
   * Get sync status for a lead
   */
  async getSyncStatus(
    leadId: string
  ): Promise<{
    hubspot: { synced: boolean; lastSyncedAt?: Date };
    salesforce: { synced: boolean; lastSyncedAt?: Date };
    pipedrive: { synced: boolean; lastSyncedAt?: Date };
  }> {
    const mappings = await db.cRMMapping.findMany({
      where: {
        userId: this.userId,
        localEntityType: "lead",
        localEntityId: leadId,
      },
    });

    const status = {
      hubspot: { synced: false as boolean, lastSyncedAt: undefined as Date | undefined },
      salesforce: { synced: false as boolean, lastSyncedAt: undefined as Date | undefined },
      pipedrive: { synced: false as boolean, lastSyncedAt: undefined as Date | undefined },
    };

    for (const mapping of mappings) {
      const provider = mapping.provider as CRMProvider;
      if (provider in status) {
        status[provider] = {
          synced: true,
          lastSyncedAt: mapping.lastSyncedAt,
        };
      }
    }

    return status;
  }
}

/**
 * Sync a single lead to all connected CRMs
 */
export async function syncLeadToAllCRMs(
  userId: string,
  leadId: string
): Promise<Record<CRMProvider, CRMSyncResult>> {
  const manager = new CRMSyncManager(userId);

  const results: Record<CRMProvider, CRMSyncResult> = {
    hubspot: { success: false, error: "Not connected" },
    salesforce: { success: false, error: "Not connected" },
    pipedrive: { success: false, error: "Not connected" },
  };

  // Get connected CRM integrations
  const integrations = await db.integration.findMany({
    where: {
      userId,
      type: { startsWith: "crm_" },
      status: "connected",
    },
  });

  for (const integration of integrations) {
    const provider = integration.type.replace("crm_", "") as CRMProvider;
    results[provider] = await manager.syncLeadToCRM(leadId, provider);
  }

  return results;
}

/**
 * Get connected CRM providers for a user
 */
export async function getConnectedCRMs(userId: string): Promise<CRMProvider[]> {
  const integrations = await db.integration.findMany({
    where: {
      userId,
      type: { startsWith: "crm_" },
      status: "connected",
    },
  });

  return integrations.map((i) => i.type.replace("crm_", "") as CRMProvider);
}
