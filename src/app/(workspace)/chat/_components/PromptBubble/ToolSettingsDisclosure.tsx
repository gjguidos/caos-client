
import { ChevronDown } from "lucide-react";

import type { ToolDisplayField } from "@/app/(workspace)/_types/chat.types";

interface ToolSettingsDisclosureProps {
  /**
   * At least one field.
   * The caller decides whether settings should be displayed.
   */
  fields: ToolDisplayField[];
}

/**
 * Displays tool invocation settings collapsed by default.
 *
 * Native <details> provides keyboard accessibility,
 * toggle behavior, and state without React hooks.
 */
export function ToolSettingsDisclosure({
  fields,
}: Readonly<ToolSettingsDisclosureProps>) {
  return (
    <details className="group">
      <summary
        className="
          flex cursor-pointer list-none items-center gap-2
          rounded-sm text-muted-foreground
          transition-colors hover:text-foreground
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-ring
          focus-visible:ring-offset-2
          [&::-webkit-details-marker]:hidden
        "
      >
        <ChevronDown
          className="
            size-3 shrink-0
            transition-transform
            group-open:rotate-180
            motion-reduce:transition-none
          "
          aria-hidden="true"
        />

        <span className="text-xs">
          {fields.length}{" "}
          {fields.length === 1 ? "setting" : "settings"}
        </span>
      </summary>

      <dl className="mt-3 flex flex-col gap-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex justify-between gap-4"
          >
            <dt className="shrink-0 text-xs text-muted-foreground">
              {field.label}
            </dt>

            <dd className="min-w-0 break-words text-right text-xs text-foreground">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
