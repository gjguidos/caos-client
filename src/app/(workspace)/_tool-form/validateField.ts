import type {
  FieldConfig,
  FormValues,
  UIComponent,
} from "@/app/(workspace)/_tool-form/toolForm.types";
import { uiComponentToFieldConfig } from "./uiComponentToFieldConfig";

/** A value counts as filled when it's a non-empty string/array, or any number. */
export function isFilled(value: FormValues[string]): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true; // numbers
}

/**
 * Each bound is checked in the branch where it is known to exist, so the message
 * never has to interpolate a bound that isn't there.
 */
function rangeError(value: number, min?: number, max?: number): string | null {
  if (min !== undefined && max !== undefined) {
    return value < min || value > max
      ? `Enter a value between ${min} and ${max}`
      : null;
  }
  if (min !== undefined) return value < min ? `Must be at least ${min}` : null;
  if (max !== undefined) return value > max ? `Must be at most ${max}` : null;
  return null;
}

/**
 * Why a field's value is unacceptable, or `null` when it is fine.
 *
 * The single source of validity for the tool form: the widget renders this as
 * its message and the surrounding form gates submission on it, so a field can
 * never show an error the submit button ignores.
 */
export function fieldError(
  config: FieldConfig,
  value: FormValues[string]
): string | null {
  if (!isFilled(value)) {
    return config.required ? "This field is required" : null;
  }

  if (config.type === "number" && typeof value === "number") {
    return rangeError(value, config.min, config.max);
  }

  return null;
}

/** Every field's error, keyed by field key. Empty when the form is submittable. */
export function formErrors(
  components: UIComponent[],
  values: FormValues
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const component of components) {
    const config = uiComponentToFieldConfig(component);
    if (!config || config === "unimplemented") continue;

    const message = fieldError(config, values[config.key]);
    if (message) errors[config.key] = message;
  }

  return errors;
}
