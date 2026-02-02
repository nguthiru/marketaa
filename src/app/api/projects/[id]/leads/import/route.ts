import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseCSVString } from "@/lib/import/parser";
import { applyMappings, FieldMapping } from "@/lib/import/mapper";

// POST /api/projects/[id]/leads/import - Import leads from CSV
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  try {
    // Check project access
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const { csvData, mappings, fileName } = body as {
      csvData: string;
      mappings: FieldMapping[];
      fileName: string;
    };

    if (!csvData || !mappings) {
      return NextResponse.json(
        { error: "CSV data and mappings are required" },
        { status: 400 }
      );
    }

    // Create import job
    const importJob = await db.importJob.create({
      data: {
        fileName: fileName || "import.csv",
        fieldMapping: JSON.stringify(mappings),
        projectId,
        userId: session.user.id,
        status: "processing",
      },
    });

    // Parse CSV
    const parseResult = parseCSVString(csvData);

    // Update total rows
    await db.importJob.update({
      where: { id: importJob.id },
      data: { totalRows: parseResult.totalRows },
    });

    // Apply mappings to get lead data
    const leads = applyMappings(parseResult.rows, mappings);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);

      for (const leadData of batch) {
        try {
          await db.lead.create({
            data: {
              name: leadData.name,
              email: leadData.email || null,
              phone: leadData.phone || null,
              role: leadData.role || null,
              organization: leadData.organization || null,
              notes: leadData.notes || null,
              projectId,
            },
          });
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`Failed to import "${leadData.name}": ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      // Update progress
      await db.importJob.update({
        where: { id: importJob.id },
        data: {
          processedRows: Math.min(i + batchSize, leads.length),
          successCount,
          errorCount,
        },
      });
    }

    // Mark as completed
    await db.importJob.update({
      where: { id: importJob.id },
      data: {
        status: errorCount === leads.length ? "failed" : "completed",
        completedAt: new Date(),
        errors: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : null,
      },
    });

    return NextResponse.json({
      importJobId: importJob.id,
      totalRows: parseResult.totalRows,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: "Import failed: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/leads/import - Get import history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  try {
    // Check project access
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const imports = await db.importJob.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json(imports);
  } catch (error) {
    console.error("Failed to fetch imports:", error);
    return NextResponse.json(
      { error: "Failed to fetch imports" },
      { status: 500 }
    );
  }
}
