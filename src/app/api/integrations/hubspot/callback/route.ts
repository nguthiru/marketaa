import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeHubSpotCode } from "@/lib/crm/hubspot/client";
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
    console.error("HubSpot OAuth error:", error);
    return NextResponse.redirect(`${settingsUrl}?error=hubspot_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=hubspot_invalid`);
  }

  try {
    // Verify state
    const integration = await db.integration.findUnique({
      where: {
        userId_type: {
          userId: session.user.id,
          type: "crm_hubspot",
        },
      },
    });

    if (!integration) {
      return NextResponse.redirect(`${settingsUrl}?error=hubspot_no_state`);
    }

    const settings = integration.settings ? JSON.parse(integration.settings) : {};
    if (settings.oauthState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=hubspot_state_mismatch`);
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/integrations/hubspot/callback`;
    const tokens = await exchangeHubSpotCode(code, redirectUri);

    if (!tokens) {
      return NextResponse.redirect(`${settingsUrl}?error=hubspot_token_exchange`);
    }

    // Store encrypted credentials
    await db.integration.update({
      where: { id: integration.id },
      data: {
        status: "connected",
        credentials: encrypt(JSON.stringify(tokens)),
        settings: JSON.stringify({
          connectedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.redirect(`${settingsUrl}?success=hubspot_connected`);
  } catch (error) {
    console.error("HubSpot callback error:", error);
    return NextResponse.redirect(`${settingsUrl}?error=hubspot_failed`);
  }
}
