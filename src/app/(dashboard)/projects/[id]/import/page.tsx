"use client";

import { useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CSVUpload } from "@/components/import/csv-upload";
import { FieldMapper } from "@/components/import/field-mapper";
import { ImportProgress } from "@/components/import/import-progress";
import { parseCSV, ParseResult } from "@/lib/import/parser";
import { autoDetectFieldMapping, validateMappings, FieldMapping, LeadField } from "@/lib/import/mapper";

type Step = "upload" | "map" | "import" | "done";

interface ImportResult {
  importJobId: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export default function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);

    try {
      const result = await parseCSV(selectedFile);
      setParseResult(result);

      // Auto-detect mappings
      const detectedMappings = autoDetectFieldMapping(result.headers, result.preview);
      setMappings(detectedMappings);

      setStep("map");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to parse CSV");
    }
  }, []);

  const handleMappingChange = useCallback((index: number, dbField: LeadField) => {
    setMappings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], dbField };
      return updated;
    });
    setValidationErrors([]);
  }, []);

  const handleValidateAndImport = useCallback(async () => {
    // Validate mappings
    const errors = validateMappings(mappings);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!file || !parseResult) return;

    setImporting(true);
    setStep("import");

    try {
      // Read file as text
      const csvData = await file.text();

      const res = await fetch(`/api/projects/${projectId}/leads/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvData,
          mappings,
          fileName: file.name,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Import failed");
      }

      const result = await res.json();
      setImportResult(result);
      setStep("done");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Import failed");
      setStep("map");
    } finally {
      setImporting(false);
    }
  }, [mappings, file, parseResult, projectId]);

  const handleStartOver = useCallback(() => {
    setStep("upload");
    setFile(null);
    setParseResult(null);
    setMappings([]);
    setValidationErrors([]);
    setImportResult(null);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Project
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Import Leads</h1>
          <p className="text-slate-600 mt-1">
            Upload a CSV file to bulk import leads into your project
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {["Upload", "Map Fields", "Import"].map((label, i) => {
            const stepNum = i + 1;
            const isActive =
              (step === "upload" && stepNum === 1) ||
              (step === "map" && stepNum === 2) ||
              ((step === "import" || step === "done") && stepNum === 3);
            const isComplete =
              (step === "map" && stepNum === 1) ||
              ((step === "import" || step === "done") && stepNum <= 2) ||
              (step === "done" && stepNum === 3);

            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isComplete
                      ? "bg-teal-500 text-white"
                      : isActive
                      ? "bg-teal-100 text-teal-700 ring-2 ring-teal-500"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span className={`text-sm ${isActive ? "text-slate-900 font-medium" : "text-slate-500"}`}>
                  {label}
                </span>
                {i < 2 && (
                  <div className="w-8 h-px bg-slate-200 mx-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div>
              <CSVUpload onFileSelect={handleFileSelect} />

              <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                <h3 className="text-sm font-medium text-slate-700 mb-2">CSV Format Tips</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• First row should contain column headers</li>
                  <li>• Include at least a Name column</li>
                  <li>• Common columns: Name, Email, Phone, Title/Role, Company</li>
                  <li>• UTF-8 encoding recommended</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Map Fields */}
          {step === "map" && parseResult && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">{file?.name}</h3>
                    <p className="text-sm text-slate-500">
                      {parseResult.totalRows} rows found • {parseResult.headers.length} columns
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleStartOver}>
                    Choose Different File
                  </Button>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg">
                  <ul className="text-sm text-red-600 space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <FieldMapper
                mappings={mappings}
                onMappingChange={handleMappingChange}
              />

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                <Button variant="secondary" onClick={handleStartOver}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleValidateAndImport}
                  loading={importing}
                >
                  Import {parseResult.totalRows} Leads
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Importing / Done */}
          {(step === "import" || step === "done") && importResult && (
            <div>
              <ImportProgress
                status={step === "done" ? (importResult.errorCount === importResult.totalRows ? "failed" : "completed") : "processing"}
                totalRows={importResult.totalRows}
                processedRows={importResult.successCount + importResult.errorCount}
                successCount={importResult.successCount}
                errorCount={importResult.errorCount}
                errors={importResult.errors}
              />

              {step === "done" && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                  <Button variant="secondary" onClick={handleStartOver}>
                    Import More
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => router.push(`/projects/${projectId}`)}
                  >
                    View Leads
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Loading state for import step */}
          {step === "import" && !importResult && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600">Processing your file...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
