import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findEmail } from "@/lib/ai/email-finder";

// POST /api/email-finder - Find email for a person
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, company, domain } = body;

    if (!name || !company) {
      return NextResponse.json(
        { error: "Name and company are required" },
        { status: 400 }
      );
    }

    const result = await findEmail(name, company, domain);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Email finder error:", error);
    return NextResponse.json(
      { error: "Failed to find email" },
      { status: 500 }
    );
  }
}
