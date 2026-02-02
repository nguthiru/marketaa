import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/integrations/encryption";

// GET /api/integrations/google/callback - Handle Google OAuth callback
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state"); // User ID
  const error = searchParams.get("error");

  if (error) {
    console.error("Google OAuth error:", error);
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

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=not_configured", process.env.NEXTAUTH_URL)
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL("/settings/integrations?error=token_exchange_failed", process.env.NEXTAUTH_URL)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user's email from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    const userInfo = await userInfoResponse.json();
    const email = userInfo.email;

    // Store credentials
    const credentials = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      email,
    };

    // Create/update Gmail integration
    await db.integration.upsert({
      where: {
        userId_type: {
          userId,
          type: "email_gmail",
        },
      },
      create: {
        userId,
        type: "email_gmail",
        name: `Gmail (${email})`,
        status: "connected",
        credentials: encrypt(JSON.stringify(credentials)),
        lastSyncAt: new Date(),
      },
      update: {
        name: `Gmail (${email})`,
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
          type: "calendar_google",
        },
      },
      create: {
        userId,
        type: "calendar_google",
        name: `Google Calendar (${email})`,
        status: "connected",
        credentials: encrypt(JSON.stringify(credentials)),
      },
      update: {
        name: `Google Calendar (${email})`,
        status: "connected",
        credentials: encrypt(JSON.stringify(credentials)),
        errorMessage: null,
      },
    });

    return NextResponse.redirect(
      new URL("/settings/integrations?success=google_connected", process.env.NEXTAUTH_URL)
    );
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(
      new URL("/settings/integrations?error=callback_failed", process.env.NEXTAUTH_URL)
    );
  }
}
