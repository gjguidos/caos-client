import type { SwitchFieldProps } from "@/app/(workspace)/_tool-form/toolForm.types";

export function SwitchField({
  id,
  label,
  checked,
  onChange,
  required,
  disabled,
}: SwitchFieldProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-3 text-sm"
    >
      <span className="font-medium">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>

      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
