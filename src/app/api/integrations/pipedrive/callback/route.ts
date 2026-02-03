import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangePipedriveCode } from "@/lib/crm/pipedrive/client";
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
    console.error("Pipedrive OAuth error:", error);
    return NextResponse.redirect(`${settingsUrl}?error=pipedrive_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=pipedrive_invalid`);
  }

  try {
    // Verify state
    const integration = await db.integration.findUnique({
      where: {
        userId_type: {
          userId: session.user.id,
          type: "crm_pipedrive",
        },
      },
    });

    if (!integration) {
      return NextResponse.redirect(`${settingsUrl}?error=pipedrive_no_state`);
    }

    const settings = integration.settings ? JSON.parse(integration.settings) : {};
    if (settings.oauthState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=pipedrive_state_mismatch`);
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/integrations/pipedrive/callback`;
    const tokens = await exchangePipedriveCode(code, redirectUri);

    if (!tokens) {
      return NextResponse.redirect(`${settingsUrl}?error=pipedrive_token_exchange`);
    }

    // Store encrypted credentials
    await db.integration.update({
      where: { id: integration.id },
      data: {
        status: "connected",
        credentials: encrypt(JSON.stringify(tokens)),
        settings: JSON.stringify({
          connectedAt: new Date().toISOString(),
          apiDomain: tokens.apiDomain,
        }),
      },
    });

    return NextResponse.redirect(`${settingsUrl}?success=pipedrive_connected`);
  } catch (error) {
    console.error("Pipedrive callback error:", error);
    return NextResponse.redirect(`${settingsUrl}?error=pipedrive_failed`);
  }
}
