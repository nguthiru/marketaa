export type IntegrationProvider = "google" | "microsoft" | "hubspot" | "salesforce" | "pipedrive";

export type IntegrationType =
  | "crm_hubspot"
  | "crm_salesforce"
  | "crm_pipedrive"
  | "email_gmail"
  | "email_outlook"
  | "calendar_google"
  | "calendar_outlook";

export interface IntegrationProviderConfig {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  types: IntegrationType[];
  scopes: {
    email?: string[];
    calendar?: string[];
    crm?: string[];
  };
  oauthUrl: string;
  tokenUrl: string;
}

export const INTEGRATION_PROVIDERS: Record<IntegrationProvider, IntegrationProviderConfig> = {
  google: {
    provider: "google",
    name: "Google",
    description: "Connect Gmail and Google Calendar",
    icon: "google",
    types: ["email_gmail", "calendar_google"],
    scopes: {
      email: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
      ],
      calendar: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    },
    oauthUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
  },
  microsoft: {
    provider: "microsoft",
    name: "Microsoft",
    description: "Connect Outlook and Microsoft Calendar",
    icon: "microsoft",
    types: ["email_outlook", "calendar_outlook"],
    scopes: {
      email: ["Mail.Read", "Mail.Send", "Mail.ReadWrite"],
      calendar: ["Calendars.ReadWrite"],
    },
    oauthUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  },
  hubspot: {
    provider: "hubspot",
    name: "HubSpot",
    description: "Sync contacts and deals with HubSpot CRM",
    icon: "hubspot",
    types: ["crm_hubspot"],
    scopes: {
      crm: ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.deals.read"],
    },
    oauthUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
  },
  salesforce: {
    provider: "salesforce",
    name: "Salesforce",
    description: "Sync leads and opportunities with Salesforce",
    icon: "salesforce",
    types: ["crm_salesforce"],
    scopes: {
      crm: ["api", "refresh_token"],
    },
    oauthUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
  },
  pipedrive: {
    provider: "pipedrive",
    name: "Pipedrive",
    description: "Sync persons, deals, and activities with Pipedrive",
    icon: "pipedrive",
    types: ["crm_pipedrive"],
    scopes: {
      crm: ["deals:full", "persons:full", "activities:full"],
    },
    oauthUrl: "https://oauth.pipedrive.com/oauth/authorize",
    tokenUrl: "https://oauth.pipedrive.com/oauth/token",
  },
};

export interface IntegrationCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}

export interface IntegrationStatus {
  isConfigured: boolean;
  isConnected: boolean;
  lastSyncAt?: Date;
  errorMessage?: string;
}
