import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { INTEGRATION_PROVIDERS, IntegrationProvider } from "@/lib/integrations/types";

// GET /api/integrations - List all integrations with their status
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's integration configs (OAuth credentials)
    const configs = await db.integrationConfig.findMany({
      where: { userId: session.user.id },
    });

    // Get user's connected integrations
    const integrations = await db.integration.findMany({
      where: { userId: session.user.id },
    });

    // Build status for each provider
    const providerStatus = Object.entries(INTEGRATION_PROVIDERS).map(([key, provider]) => {
      const config = configs.find((c) => c.provider === key);
      const connected = integrations.filter((i) => provider.types.includes(i.type as never));

      return {
        provider: key as IntegrationProvider,
        name: provider.name,
        description: provider.description,
        icon: provider.icon,
        types: provider.types,
        isConfigured: config?.isConfigured ?? false,
        connections: connected.map((c) => ({
          type: c.type,
          status: c.status,
          lastSyncAt: c.lastSyncAt,
          errorMessage: c.errorMessage,
        })),
      };
    });

    return NextResponse.json(providerStatus);
  } catch (error) {
    console.error("Failed to fetch integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}
