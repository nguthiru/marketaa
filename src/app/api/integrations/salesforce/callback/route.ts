import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeSalesforceCode } from "@/lib/crm/salesforce/client";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/integrations/encryption";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/login?error=unauthorized`);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const settingsUrl = `${baseUrl}/settings/integrations`;

  if (error) {
    console.error("Salesforce OAuth error:", error);
    return NextResponse.redirect(`${settingsUrl}?error=salesforce_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=salesforce_invalid`);
  }

  try {
    // Verify state
    const integration = await db.integration.findUnique({
      where: {
        userId_type: {
          userId: session.user.id,
          type: "crm_salesforce",
        },
      },
    });

    if (!integration) {
      return NextResponse.redirect(`${settingsUrl}?error=salesforce_no_state`);
    }

    const settings = integration.settings ? JSON.parse(integration.settings) : {};
    if (settings.oauthState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=salesforce_state_mismatch`);
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/integrations/salesforce/callback`;
    const tokens = await exchangeSalesforceCode(code, redirectUri);

    if (!tokens) {
      return NextResponse.redirect(`${settingsUrl}?error=salesforce_token_exchange`);
    }

    // Store encrypted credentials
    await db.integration.update({
      where: { id: integration.id },
      data: {
        status: "connected",
        credentials: encrypt(JSON.stringify(tokens)),
        settings: JSON.stringify({
          connectedAt: new Date().toISOString(),
          instanceUrl: tokens.instanceUrl,
        }),
      },
    });

    return NextResponse.redirect(`${settingsUrl}?success=salesforce_connected`);
  } catch (error) {
    console.error("Salesforce callback error:", error);
    return NextResponse.redirect(`${settingsUrl}?error=salesforce_failed`);
  }
}
