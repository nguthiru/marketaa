"use client";

import { useCallback, useState } from "react";

interface CSVUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function CSVUpload({ onFileSelect, disabled }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        onFileSelect(file);
      } else {
        alert("Please upload a CSV file");
      }
    }
  }, [onFileSelect, disabled]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-all
        ${isDragging ? "border-teal-400 bg-teal-50" : "border-slate-300 hover:border-slate-400"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".csv"
        onChange={handleFileInput}
        className="hidden"
        id="csv-upload"
        disabled={disabled}
      />
      <label
        htmlFor="csv-upload"
        className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`p-3 rounded-full ${isDragging ? "bg-teal-100" : "bg-slate-100"}`}>
            <svg
              className={`w-8 h-8 ${isDragging ? "text-teal-600" : "text-slate-400"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-slate-700">
              {isDragging ? "Drop your CSV here" : "Drag & drop your CSV file"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              or <span className="text-teal-600 hover:underline">browse</span> to choose a file
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Supports CSV files with headers
          </p>
        </div>
      </label>
    </div>
  );
}
