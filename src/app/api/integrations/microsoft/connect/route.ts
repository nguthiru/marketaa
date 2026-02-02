import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/integrations/microsoft/connect - Start Microsoft OAuth flow
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/microsoft/callback`;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=microsoft_not_configured", process.env.NEXTAUTH_URL)
    );
  }

  // Build OAuth URL
  const scopes = [
    "offline_access",
    "User.Read",
    "Mail.Read",
    "Mail.Send",
    "Calendars.ReadWrite",
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    response_mode: "query",
    state: session.user.id,
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
