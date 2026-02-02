import Papa from "papaparse";

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  preview: Record<string, string>[];
  errors: string[];
}

export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const errors: string[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        // Collect parse errors
        if (results.errors.length > 0) {
          results.errors.forEach((err) => {
            errors.push(`Row ${err.row}: ${err.message}`);
          });
        }

        resolve({
          headers,
          rows,
          totalRows: rows.length,
          preview: rows.slice(0, 5), // First 5 rows for preview
          errors,
        });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

export function parseCSVString(csvString: string): ParseResult {
  const errors: string[] = [];

  const results = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = results.meta.fields || [];
  const rows = results.data as Record<string, string>[];

  if (results.errors.length > 0) {
    results.errors.forEach((err) => {
      errors.push(`Row ${err.row}: ${err.message}`);
    });
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    preview: rows.slice(0, 5),
    errors,
  };
}
