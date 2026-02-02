import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/warmup - List warmup accounts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await db.warmupAccount.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { activities: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await Promise.all(
      accounts.map(async (account) => {
        const activities = await db.warmupActivity.groupBy({
          by: ["type"],
          where: {
            accountId: account.id,
            timestamp: { gte: today },
          },
          _count: true,
        });

        const sentToday = activities.find((a) => a.type === "sent")?._count || 0;
        const receivedToday = activities.find((a) => a.type === "received")?._count || 0;

        return {
          ...account,
          sentToday,
          receivedToday,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch warmup accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch warmup accounts" },
      { status: 500 }
    );
  }
}

// POST /api/warmup - Create warmup account
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, provider } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if account already exists
    const existing = await db.warmupAccount.findFirst({
      where: {
        userId: session.user.id,
        email,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Account already exists" },
        { status: 400 }
      );
    }

    // Verify email is connected via integration
    const integration = await db.integration.findFirst({
      where: {
        userId: session.user.id,
        type: provider === "microsoft" ? "email_outlook" : "email_gmail",
        status: "connected",
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: "Email account not connected. Please connect it in Settings first." },
        { status: 400 }
      );
    }

    const account = await db.warmupAccount.create({
      data: {
        email,
        status: "warming",
        reputation: 50, // Start at 50%
        dailyLimit: 10, // Start with 10 emails/day
        userId: session.user.id,
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("Failed to create warmup account:", error);
    return NextResponse.json(
      { error: "Failed to create warmup account" },
      { status: 500 }
    );
  }
}
