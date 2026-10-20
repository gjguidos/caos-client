import type { FormValue } from "@/app/(workspace)/_tool-form/toolForm.types";
import type { UIComponent } from "@/app/(workspace)/_tool-form/toolForm.types";

type SearchBehaviorInference = {
    match: "option_value";
    source_options: string;
    target_field: string;
    also_include_report?: string;
  };
  
  type SearchBehaviorConfig = {
    field: string;
    produces_report?: string;
    inference?: SearchBehaviorInference[];
  };
  
  type SearchInferenceResult = {
    inferredValues: Record<string, FormValue>;
    inferredReports: string[];
  };
  
  export function resolveSearchInference({
    value,
    searchBehavior,
    components,
  }: {
    value: FormValue;
    searchBehavior?: SearchBehaviorConfig | null;
    components: UIComponent[];
  }): SearchInferenceResult {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
  
    const inferredValues: Record<string, FormValue> = {};
    const inferredReports = new Set<string>();
  
    if (!normalized || !searchBehavior) {
      return {
        inferredValues,
        inferredReports: [],
      };
    }
  
    if (searchBehavior.produces_report) {
      inferredReports.add(searchBehavior.produces_report);
    }
  
    for (const rule of searchBehavior.inference ?? []) {
      if (rule.match !== "option_value") {
        continue;
      }
  
      const sourceComponent = components.find(
        (component) => component.id === rule.source_options
      );
  
      const options =
        (sourceComponent?.props?.options as
          | Array<{ value: string; label?: string }>
          | undefined) ?? [];
  
      const matchedOption = options.find(
        (option) =>
          String(option.value).trim().toLowerCase() === normalized
      );
  
      if (!matchedOption) {
        continue;
      }
  
      inferredValues[rule.target_field] = matchedOption.value;
  
      if (rule.also_include_report) {
        inferredReports.add(rule.also_include_report);
      }
    }
  
    return {
      inferredValues,
      inferredReports: [...inferredReports],
    };
  }