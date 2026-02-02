import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/integrations/encryption";
import { INTEGRATION_PROVIDERS, IntegrationProvider } from "@/lib/integrations/types";

// GET /api/integrations/config - Get all configs (without secrets)
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await db.integrationConfig.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        clientId: false, // Never return actual credentials
        clientSecret: false,
        redirectUri: true,
        scopes: true,
        isConfigured: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Return configs with masked indicators
    const safeConfigs = configs.map((c) => ({
      ...c,
      hasClientId: true,
      hasClientSecret: true,
    }));

    return NextResponse.json(safeConfigs);
  } catch (error) {
    console.error("Failed to fetch integration configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch configs" },
      { status: 500 }
    );
  }
}

// POST /api/integrations/config - Create or update config
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { provider, clientId, clientSecret, redirectUri } = body;

    // Validate provider
    if (!provider || !INTEGRATION_PROVIDERS[provider as IntegrationProvider]) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 }
      );
    }

    // Get default scopes for this provider
    const providerConfig = INTEGRATION_PROVIDERS[provider as IntegrationProvider];
    const allScopes = [
      ...(providerConfig.scopes.email || []),
      ...(providerConfig.scopes.calendar || []),
      ...(providerConfig.scopes.crm || []),
    ];

    // Upsert the config
    const config = await db.integrationConfig.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider,
        },
      },
      update: {
        clientId: encrypt(clientId),
        clientSecret: encrypt(clientSecret),
        redirectUri: redirectUri || `${process.env.NEXTAUTH_URL}/api/integrations/${provider}/callback`,
        scopes: JSON.stringify(allScopes),
        isConfigured: true,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        provider,
        clientId: encrypt(clientId),
        clientSecret: encrypt(clientSecret),
        redirectUri: redirectUri || `${process.env.NEXTAUTH_URL}/api/integrations/${provider}/callback`,
        scopes: JSON.stringify(allScopes),
        isConfigured: true,
      },
    });

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      isConfigured: config.isConfigured,
      redirectUri: config.redirectUri,
      message: `${providerConfig.name} credentials saved successfully`,
    });
  } catch (error) {
    console.error("Failed to save integration config:", error);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/config - Remove config
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    // Delete the config
    await db.integrationConfig.delete({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider,
        },
      },
    });

    // Also delete any connected integrations for this provider
    const providerConfig = INTEGRATION_PROVIDERS[provider as IntegrationProvider];
    if (providerConfig) {
      await db.integration.deleteMany({
        where: {
          userId: session.user.id,
          type: { in: providerConfig.types },
        },
      });
    }

    return NextResponse.json({ message: "Config removed" });
  } catch (error) {
    console.error("Failed to delete integration config:", error);
    return NextResponse.json(
      { error: "Failed to delete config" },
      { status: 500 }
    );
  }
}
