import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CRMSyncManager, syncLeadToAllCRMs, getConnectedCRMs } from "@/lib/crm/sync-manager";
import type { CRMProvider } from "@/lib/crm/types";

/**
 * POST /api/crm/sync
 * Sync a lead to connected CRMs
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId, provider } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    if (provider) {
      // Sync to specific provider
      const manager = new CRMSyncManager(session.user.id);
      const result = await manager.syncLeadToCRM(leadId, provider as CRMProvider);
      return NextResponse.json({ [provider]: result });
    } else {
      // Sync to all connected CRMs
      const results = await syncLeadToAllCRMs(session.user.id, leadId);
      return NextResponse.json(results);
    }
  } catch (error) {
    console.error("CRM sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/crm/sync?leadId=xxx
 * Get sync status for a lead
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");

  try {
    if (leadId) {
      // Get sync status for specific lead
      const manager = new CRMSyncManager(session.user.id);
      const status = await manager.getSyncStatus(leadId);
      return NextResponse.json(status);
    } else {
      // Get connected CRMs
      const connectedCRMs = await getConnectedCRMs(session.user.id);
      return NextResponse.json({ connectedCRMs });
    }
  } catch (error) {
    console.error("CRM status error:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
