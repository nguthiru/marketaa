import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db.integration.deleteMany({
      where: {
        userId: session.user.id,
        type: "crm_salesforce",
      },
    });

    // Also delete any CRM mappings for this provider
    await db.cRMMapping.deleteMany({
      where: {
        userId: session.user.id,
        provider: "salesforce",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Salesforce disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Salesforce" },
      { status: 500 }
    );
  }
}
