export type LeadField = "name" | "email" | "phone" | "role" | "organization" | "notes" | "skip";

export interface FieldMapping {
  csvColumn: string;
  dbField: LeadField;
  sample: string;
}

// Common variations of field names
const FIELD_PATTERNS: Record<LeadField, RegExp[]> = {
  name: [
    /^(full[_\s]?)?name$/i,
    /^contact[_\s]?name$/i,
    /^person$/i,
    /^lead[_\s]?name$/i,
  ],
  email: [
    /^e[\-_]?mail$/i,
    /^email[_\s]?address$/i,
    /^contact[_\s]?email$/i,
  ],
  phone: [
    /^phone$/i,
    /^phone[_\s]?(number)?$/i,
    /^tel(ephone)?$/i,
    /^mobile$/i,
    /^cell$/i,
  ],
  role: [
    /^(job[_\s]?)?title$/i,
    /^role$/i,
    /^position$/i,
    /^designation$/i,
  ],
  organization: [
    /^(company|organization|org|organisation)$/i,
    /^company[_\s]?name$/i,
    /^employer$/i,
    /^business$/i,
  ],
  notes: [
    /^notes?$/i,
    /^comments?$/i,
    /^description$/i,
    /^remarks?$/i,
  ],
  skip: [],
};

export function autoDetectFieldMapping(
  headers: string[],
  previewRows: Record<string, string>[]
): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const usedDbFields = new Set<LeadField>();

  for (const header of headers) {
    let matchedField: LeadField = "skip";

    // Try to match header to a known field
    for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [LeadField, RegExp[]][]) {
      if (field === "skip") continue;
      if (usedDbFields.has(field)) continue;

      for (const pattern of patterns) {
        if (pattern.test(header.trim())) {
          matchedField = field;
          usedDbFields.add(field);
          break;
        }
      }

      if (matchedField !== "skip") break;
    }

    // Get sample value from first non-empty row
    let sample = "";
    for (const row of previewRows) {
      const value = row[header]?.trim();
      if (value) {
        sample = value;
        break;
      }
    }

    mappings.push({
      csvColumn: header,
      dbField: matchedField,
      sample,
    });
  }

  return mappings;
}

export function validateMappings(mappings: FieldMapping[]): string[] {
  const errors: string[] = [];

  // Name is required
  const hasName = mappings.some((m) => m.dbField === "name");
  if (!hasName) {
    errors.push("A 'name' field is required. Please map at least one column to Name.");
  }

  // Check for duplicate mappings (except skip)
  const usedFields = new Set<LeadField>();
  for (const mapping of mappings) {
    if (mapping.dbField !== "skip") {
      if (usedFields.has(mapping.dbField)) {
        errors.push(`Multiple columns mapped to '${mapping.dbField}'. Each field can only be mapped once.`);
      }
      usedFields.add(mapping.dbField);
    }
  }

  return errors;
}

export function applyMappings(
  rows: Record<string, string>[],
  mappings: FieldMapping[]
): { name: string; email?: string; phone?: string; role?: string; organization?: string; notes?: string }[] {
  return rows.map((row) => {
    const lead: Record<string, string> = {};

    for (const mapping of mappings) {
      if (mapping.dbField !== "skip") {
        const value = row[mapping.csvColumn]?.trim();
        if (value) {
          lead[mapping.dbField] = value;
        }
      }
    }

    return lead as { name: string; email?: string; phone?: string; role?: string; organization?: string; notes?: string };
  }).filter((lead) => lead.name); // Filter out rows without a name
}
