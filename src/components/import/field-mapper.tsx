"use client";

import { FieldMapping, LeadField } from "@/lib/import/mapper";

interface FieldMapperProps {
  mappings: FieldMapping[];
  onMappingChange: (index: number, dbField: LeadField) => void;
}

const FIELD_OPTIONS: { value: LeadField; label: string; required?: boolean }[] = [
  { value: "name", label: "Name", required: true },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "role", label: "Job Title / Role" },
  { value: "organization", label: "Company / Organization" },
  { value: "notes", label: "Notes" },
  { value: "skip", label: "Skip this column" },
];

export function FieldMapper({ mappings, onMappingChange }: FieldMapperProps) {
  const usedFields = new Set(
    mappings.filter((m) => m.dbField !== "skip").map((m) => m.dbField)
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 rounded-lg text-sm font-medium text-slate-600">
        <div className="col-span-4">CSV Column</div>
        <div className="col-span-4">Maps To</div>
        <div className="col-span-4">Sample Value</div>
      </div>

      {mappings.map((mapping, index) => (
        <div
          key={mapping.csvColumn}
          className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg border transition-colors ${
            mapping.dbField === "skip"
              ? "border-slate-200 bg-slate-50/50 opacity-60"
              : "border-slate-200 bg-white"
          }`}
        >
          {/* CSV Column */}
          <div className="col-span-4 flex items-center">
            <span className="font-medium text-slate-900 truncate" title={mapping.csvColumn}>
              {mapping.csvColumn}
            </span>
          </div>

          {/* Field Selector */}
          <div className="col-span-4">
            <select
              value={mapping.dbField}
              onChange={(e) => onMappingChange(index, e.target.value as LeadField)}
              className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                mapping.dbField === "name"
                  ? "border-teal-300 bg-teal-50"
                  : mapping.dbField === "skip"
                  ? "border-slate-200 bg-slate-50 text-slate-500"
                  : "border-slate-200"
              }`}
            >
              {FIELD_OPTIONS.map((option) => {
                const isUsed = usedFields.has(option.value) && mapping.dbField !== option.value;
                return (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.value !== "skip" && isUsed}
                  >
                    {option.label}
                    {option.required ? " *" : ""}
                    {isUsed ? " (already mapped)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sample Value */}
          <div className="col-span-4 flex items-center">
            <span
              className="text-sm text-slate-500 truncate"
              title={mapping.sample || "No data"}
            >
              {mapping.sample || <span className="italic text-slate-400">No data</span>}
            </span>
          </div>
        </div>
      ))}

      <p className="text-xs text-slate-500 mt-2">
        * Required field. Rows without a name will be skipped.
      </p>
    </div>
  );
}
