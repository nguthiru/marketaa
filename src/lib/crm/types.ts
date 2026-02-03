/**
 * CRM Integration Types and Interfaces
 */

export type CRMProvider = "hubspot" | "salesforce" | "pipedrive";

/**
 * CRM Contact representation
 */
export interface CRMContact {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  title?: string;
  website?: string;
  customFields?: Record<string, unknown>;
}

/**
 * CRM Activity (email, call, meeting, note)
 */
export interface CRMActivity {
  id?: string;
  contactId: string;
  type: "email" | "call" | "meeting" | "note";
  subject: string;
  body: string;
  timestamp: Date;
  outcome?: string;
  direction?: "inbound" | "outbound";
}

/**
 * CRM Deal/Opportunity
 */
export interface CRMDeal {
  id?: string;
  contactId: string;
  name: string;
  amount?: number;
  stage: string;
  closeDate?: Date;
  probability?: number;
}

/**
 * Sync operation result
 */
export interface CRMSyncResult {
  success: boolean;
  remoteId?: string;
  error?: string;
  operation?: "create" | "update" | "skip";
}

/**
 * CRM Client interface - all providers implement this
 */
export interface CRMClient {
  // Contact operations
  createContact(contact: CRMContact): Promise<CRMSyncResult>;
  updateContact(contactId: string, contact: Partial<CRMContact>): Promise<CRMSyncResult>;
  getContact(contactId: string): Promise<CRMContact | null>;
  findContactByEmail(email: string): Promise<CRMContact | null>;

  // Activity operations
  createActivity(activity: CRMActivity): Promise<CRMSyncResult>;

  // Deal operations (optional)
  createDeal?(deal: CRMDeal): Promise<CRMSyncResult>;
  updateDeal?(dealId: string, deal: Partial<CRMDeal>): Promise<CRMSyncResult>;
}

/**
 * CRM OAuth configuration
 */
export interface CRMOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * CRM OAuth tokens
 */
export interface CRMOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  instanceUrl?: string; // Salesforce specific
}

/**
 * Field mapping between Marketaa and CRM
 */
export interface CRMFieldMapping {
  local: string;
  remote: string;
  transform?: (value: unknown) => unknown;
}

/**
 * Default field mappings for contacts
 */
export const DEFAULT_CONTACT_MAPPINGS: Record<CRMProvider, CRMFieldMapping[]> = {
  hubspot: [
    { local: "email", remote: "email" },
    { local: "firstName", remote: "firstname" },
    { local: "lastName", remote: "lastname" },
    { local: "company", remote: "company" },
    { local: "phone", remote: "phone" },
    { local: "title", remote: "jobtitle" },
    { local: "website", remote: "website" },
  ],
  salesforce: [
    { local: "email", remote: "Email" },
    { local: "firstName", remote: "FirstName" },
    { local: "lastName", remote: "LastName" },
    { local: "company", remote: "Company" },
    { local: "phone", remote: "Phone" },
    { local: "title", remote: "Title" },
    { local: "website", remote: "Website" },
  ],
  pipedrive: [
    { local: "email", remote: "email" },
    { local: "firstName", remote: "first_name" },
    { local: "lastName", remote: "last_name" },
    { local: "phone", remote: "phone" },
    { local: "title", remote: "job_title" },
  ],
};

/**
 * Convert a local contact to CRM-specific format
 */
export function mapContactToCRM(
  contact: CRMContact,
  provider: CRMProvider
): Record<string, unknown> {
  const mappings = DEFAULT_CONTACT_MAPPINGS[provider];
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const value = contact[mapping.local as keyof CRMContact];
    if (value !== undefined && value !== null) {
      result[mapping.remote] = mapping.transform ? mapping.transform(value) : value;
    }
  }

  return result;
}
