
import type {
  FormValue,
  OutputProfilesConfig,
} from "@/app/(workspace)/_tool-form/toolForm.types";

import {
  formatProfileValue,
  getProfileDefaults,
  hasMeaningfulValue,
  humanizeFieldName,
} from "@/app/(workspace)/_tool-form/lib/profileValues";

type ToolProfileConfigurationProps = {
  profileConfig?: OutputProfilesConfig | null;
  selectedProfile: string;
};

export function ToolProfileConfiguration({
  profileConfig,
  selectedProfile,
}: ToolProfileConfigurationProps) {
  const controlledFields = profileConfig?.controlled_fields ?? [];

  const defaults = getProfileDefaults(
    profileConfig,
    selectedProfile
  );

  const rows = controlledFields
    .map((field) => {
      const value = defaults?.[field];

      if (!hasMeaningfulValue(value)) {
        return null;
      }

      return {
        field,
        label: humanizeFieldName(field),
        value: formatProfileValue(value as FormValue),
      };
    })
    .filter(
      (
        row
      ): row is {
        field: string;
        label: string;
        value: string;
      } => row !== null
    );

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        This preset does not define any configuration values.
      </p>
    );
  }

  return (
    <dl className="divide-y divide-border">
      {rows.map((row) => (
        <div
          key={row.field}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 py-4 first:pt-0 last:pb-0"
        >
          <dt className="text-sm text-muted-foreground">
            {row.label}
          </dt>

          <dd className="min-w-0 break-words text-right text-sm font-semibold text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
