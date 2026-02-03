import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSalesforceAuthUrl } from "@/lib/crm/salesforce/client";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/integrations/salesforce/callback`;

    // Generate state for CSRF protection
    const state = randomBytes(32).toString("hex");

    // Store state in database for verification
    await db.integration.upsert({
      where: {
        userId_type: {
          userId: session.user.id,
          type: "crm_salesforce",
        },
      },
      update: {
        settings: JSON.stringify({ oauthState: state }),
        status: "pending",
      },
      create: {
        userId: session.user.id,
        type: "crm_salesforce",
        name: "Salesforce",
        status: "pending",
        settings: JSON.stringify({ oauthState: state }),
      },
    });

    const authUrl = getSalesforceAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Salesforce connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Salesforce connection" },
      { status: 500 }
    );
  }
}
