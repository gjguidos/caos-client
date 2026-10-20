import type { FormValue } from "@/app/(workspace)/_tool-form/toolForm.types";

export function normalizeReportValues(
  value: FormValue | unknown
): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function mergeReportValues(
  value: FormValue | unknown,
  inferredReports: string[] = []
): string[] {
  const existing = normalizeReportValues(value);
  const inferred = normalizeReportValues(inferredReports);

  return [
    ...new Set([
      ...existing,
      ...inferred,
    ]),
  ];
}