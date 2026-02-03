import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export interface OnboardingChecklist {
  emailVerified: boolean;
  gmailConnected: boolean;
  firstProjectCreated: boolean;
  firstLeadAdded: boolean;
  firstSequenceCreated: boolean;
  dismissedAt: string | null;
}

// GET /api/onboarding - Get onboarding state
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user and detect checklist state
    const [user, projectCount, leadCount, sequenceCount, gmailIntegration] = await Promise.all([
      db.user.findUnique({
        where: { id: session.user.id },
        select: {
          emailVerified: true,
          onboardingCompleted: true,
          welcomeWizardCompleted: true,
          productTourCompleted: true,
          onboardingChecklistState: true,
        },
      }),
      db.project.count({ where: { ownerId: session.user.id } }),
      db.lead.count({ where: { project: { ownerId: session.user.id } } }),
      db.sequence.count({ where: { project: { ownerId: session.user.id } } }),
      db.integration.findFirst({
        where: { userId: session.user.id, type: "email_gmail", status: "connected" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse stored checklist state for dismissedAt
    let storedState: Partial<OnboardingChecklist> = {};
    if (user.onboardingChecklistState) {
      try {
        storedState = JSON.parse(user.onboardingChecklistState);
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Auto-detect checklist completion
    const checklist: OnboardingChecklist = {
      emailVerified: user.emailVerified || false,
      gmailConnected: !!gmailIntegration,
      firstProjectCreated: projectCount > 0,
      firstLeadAdded: leadCount > 0,
      firstSequenceCreated: sequenceCount > 0,
      dismissedAt: storedState.dismissedAt || null,
    };

    // Calculate progress
    const completedItems = [
      checklist.emailVerified,
      checklist.gmailConnected,
      checklist.firstProjectCreated,
      checklist.firstLeadAdded,
      checklist.firstSequenceCreated,
    ].filter(Boolean).length;
    const progress = Math.round((completedItems / 5) * 100);

    // Check if onboarding is complete
    const allComplete = completedItems === 5;

    return NextResponse.json({
      welcomeWizardCompleted: user.welcomeWizardCompleted,
      productTourCompleted: user.productTourCompleted,
      onboardingCompleted: user.onboardingCompleted || allComplete,
      checklist,
      progress,
    });
  } catch (error) {
    console.error("Failed to fetch onboarding state:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding state" },
      { status: 500 }
    );
  }
}

// PATCH /api/onboarding - Update onboarding state
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      welcomeWizardCompleted,
      productTourCompleted,
      dismissChecklist,
    } = body;

    // Build update data
    const updateData: {
      welcomeWizardCompleted?: boolean;
      productTourCompleted?: boolean;
      onboardingChecklistState?: string;
      onboardingCompleted?: boolean;
    } = {};

    if (typeof welcomeWizardCompleted === "boolean") {
      updateData.welcomeWizardCompleted = welcomeWizardCompleted;
    }

    if (typeof productTourCompleted === "boolean") {
      updateData.productTourCompleted = productTourCompleted;
    }

    if (dismissChecklist === true) {
      // Get current state and add dismissedAt
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { onboardingChecklistState: true },
      });

      let currentState: Partial<OnboardingChecklist> = {};
      if (user?.onboardingChecklistState) {
        try {
          currentState = JSON.parse(user.onboardingChecklistState);
        } catch {
          // Invalid JSON, ignore
        }
      }

      updateData.onboardingChecklistState = JSON.stringify({
        ...currentState,
        dismissedAt: new Date().toISOString(),
      });
    }

    // Check if all onboarding is complete
    if (welcomeWizardCompleted && productTourCompleted) {
      updateData.onboardingCompleted = true;
    }

    await db.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update onboarding state:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding state" },
      { status: 500 }
    );
  }
}
