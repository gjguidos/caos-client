import type {
  FormValue,
  OutputProfilesConfig,
} from "@/app/(workspace)/_tool-form/toolForm.types";

/** Field a profile config stores its selected key in, when it names no other. */
export const DEFAULT_OUTPUT_PROFILE_FIELD = "output_profile";

/**
 * Which form field holds the selected profile key. Read through here rather
 * than hard-coding `output_profile`, so the form-state layer stays free of any
 * one tool's field names.
 */
export function outputProfileField(
  config: OutputProfilesConfig | null | undefined
): string {
  return config?.field ?? DEFAULT_OUTPUT_PROFILE_FIELD;
}

/**
 * Field defaults for a profile.
 *
 * The backend sends a profile entry either flat (field -> value) or nested
 * under `defaults` alongside a `preview` block. Both spellings are read here so
 * the store and the panels can never drift apart on which one they expect.
 */
export function getProfileDefaults(
  config: OutputProfilesConfig | null | undefined,
  profileKey: string | undefined
): Record<string, FormValue> | null {
  if (!config || !profileKey) {
    return null;
  }

  const entry = config.profiles?.[profileKey];

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  if (
    entry.defaults &&
    typeof entry.defaults === "object" &&
    !Array.isArray(entry.defaults)
  ) {
    return entry.defaults;
  }

  const { defaults: _defaults, preview: _preview, ...flat } = entry;

  return Object.keys(flat).length > 0
    ? (flat as Record<string, FormValue>)
    : null;
}

/** Preview block for a profile, when the backend supplies one. */
export function getProfilePreview(
  config: OutputProfilesConfig | null | undefined,
  profileKey: string | undefined
): Record<string, unknown> | null {
  if (!config || !profileKey) {
    return null;
  }

  const preview = config.profiles?.[profileKey]?.preview;

  return preview && typeof preview === "object" && !Array.isArray(preview)
    ? preview
    : null;
}

/**
 * Compare two field values ignoring ordering and the list/CSV split, so a
 * multiselect stored as `"b,a"` matches a profile default of `["a", "b"]`.
 */
export function profileValuesEqual(left: unknown, right: unknown): boolean {
  return normalizeProfileValue(left) === normalizeProfileValue(right);
}

function normalizeProfileValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(String).sort().join(",");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(",");
  }

  return JSON.stringify(value);
}

/** Human-readable rendering of a field value for summaries and badges. */
export function formatProfileValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }

  if (typeof value === "string" && value.includes(",")) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === undefined || value === null || value === "") {
    return "Not set";
  }

  return String(value);
}

/** `crawl_depth` -> `Crawl Depth`, for fields with no label in the registry. */
export function humanizeFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Short "output_format · 5 pages · depth 2" line summarising a profile.
 *
 * Reads whatever keys the source carries rather than any fixed field list, so
 * a tool's own vocabulary shows through without this module knowing it. A
 * profile can pin the order and subset via `preview_fields`.
 */
export function summariseProfileValues(
  source: Record<string, unknown> | null | undefined,
  previewFields?: string[]
): string[] {
  if (!source) {
    return [];
  }

  const fields =
    previewFields && previewFields.length > 0
      ? previewFields
      : Object.keys(source);

  return fields
    .filter((field) => hasMeaningfulValue(source[field]))
    .map((field) => {
      const value = source[field];

      // A flag reads better as its own name than as "Include Raw Pages: Yes".
      if (typeof value === "boolean") {
        return value ? humanizeFieldName(field).toLowerCase() : null;
      }

      return `${humanizeFieldName(field).toLowerCase()} ${formatProfileValue(value)}`;
    })
    .filter((item): item is string => item !== null);
}

/** Whether the user has actually supplied a value, as opposed to a blank. */
export function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}
