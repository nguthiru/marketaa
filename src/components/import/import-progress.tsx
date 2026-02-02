"use client";

interface ImportProgressProps {
  status: "pending" | "processing" | "completed" | "failed";
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors?: string[];
}

export function ImportProgress({
  status,
  totalRows,
  processedRows,
  successCount,
  errorCount,
  errors,
}: ImportProgressProps) {
  const progress = totalRows > 0 ? (processedRows / totalRows) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600">
            {status === "processing" ? "Importing..." : status === "completed" ? "Complete" : status === "failed" ? "Failed" : "Pending"}
          </span>
          <span className="text-slate-500">
            {processedRows} / {totalRows} rows
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              status === "failed"
                ? "bg-red-500"
                : status === "completed"
                ? "bg-teal-500"
                : "bg-teal-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalRows}</p>
          <p className="text-xs text-slate-500">Total Rows</p>
        </div>
        <div className="bg-teal-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-teal-600">{successCount}</p>
          <p className="text-xs text-slate-500">Imported</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${errorCount > 0 ? "bg-red-50" : "bg-slate-50"}`}>
          <p className={`text-2xl font-bold ${errorCount > 0 ? "text-red-600" : "text-slate-400"}`}>
            {errorCount}
          </p>
          <p className="text-xs text-slate-500">Failed</p>
        </div>
      </div>

      {/* Status Message */}
      {status === "completed" && (
        <div className="flex items-center gap-2 text-teal-600 bg-teal-50 px-4 py-3 rounded-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">
            Successfully imported {successCount} lead{successCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Errors */}
      {errors && errors.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Some rows failed to import</span>
          </div>
          <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
            {errors.map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
