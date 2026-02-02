import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/integrations/encryption";

// GET /api/integrations/microsoft/callback - Handle Microsoft OAuth callback
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state"); // User ID
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("Microsoft OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${error}`, process.env.NEXTAUTH_URL)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=no_code", process.env.NEXTAUTH_URL)
    );
  }

  // Verify user
  const userId = session?.user?.id || state;
  if (!userId) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXTAUTH_URL)
    );
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/microsoft/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=not_configured", process.env.NEXTAUTH_URL)
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL("/settings/integrations?error=token_exchange_failed", process.env.NEXTAUTH_URL)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user's profile from Microsoft Graph
    const profileResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    const profile = await profileResponse.json();
    const email = profile.mail || profile.userPrincipalName;

    // Store credentials
    const credentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      email,
    };

    // Create/update Outlook integration
    await db.integration.upsert({
      where: {
        userId_type: {
          userId,
          type: "email_outlook",
        },
      },
      create: {
        userId,
        type: "email_outlook",
        name: `Outlook (${email})`,
        status: "connected",
        credentials: encrypt(JSON.stringify(credentials)),
        lastSyncAt: new Date(),
      },
      update: {
        name: `Outlook (${email})`,
        status: "connected",
        credentials: encrypt(JSON.stringify(credentials)),
        lastSyncAt: new Date(),
        errorMessage: null,
      },
    });

    // Also create calendar integration
    await db.integration.upsert({
      where: {
        userId_type: {
          userId,
          type: "calendar_outlook",
        },
      },
      create: {
        userId,
        type: "calendar_outlook",
        name: `Outlook Calendar (${email})`,
        status: "connected",
        credentials: encrypt(JSON.stringify(credentials)),
      },
      update: {
        name: `Outlook Calendar (${email})`,
        status: "connected",
        credentials: encrypt(JSON.stringify(credentials)),
        errorMessage: null,
      },
    });

    return NextResponse.redirect(
      new URL("/settings/integrations?success=microsoft_connected", process.env.NEXTAUTH_URL)
    );
  } catch (error) {
    console.error("Microsoft callback error:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=callback_failed", process.env.NEXTAUTH_URL)
    );
  }
}
