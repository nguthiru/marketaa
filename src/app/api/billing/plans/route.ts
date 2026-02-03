import { NextResponse } from "next/server";
import { getPlansWithPricing, CURRENCY } from "@/lib/paystack";

// Ensure consistent ordering
const PLAN_ORDER = ["free", "starter", "pro", "enterprise"];

export async function GET() {
  try {
    const plans = await getPlansWithPricing();

    // Add the plan key and sort in correct order
    const plansWithKeys = PLAN_ORDER
      .filter((key) => plans[key]) // Only include plans that exist
      .map((key) => ({
        ...plans[key],
        key, // "free", "starter", "pro", "enterprise"
      }));

    return NextResponse.json({
      plans: plansWithKeys,
      currency: CURRENCY,
    });
  } catch (error) {
    console.error("Failed to fetch plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
