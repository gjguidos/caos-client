"use client";

import type { EnrichedTool } from "@/app/(workspace)/_types/chat.types";
import { ToolProfileSection } from "@/app/(workspace)/_tool-form/components/ToolProfileSection";
import type {
  FormValue,
  FormValues,
} from "@/app/(workspace)/_tool-form/toolForm.types";

type CrawlerOutputProfileSectionProps = {
  crawlerToolDef: EnrichedTool | null;
  values: FormValues;
  outputProfile: string;
  effectiveReports: string[];

  onValueChange: (
    key: string,
    value: FormValue
  ) => void;

  onOpenConfiguration?: () => void;
};

export function CrawlerOutputProfileSection({
  crawlerToolDef,
  values,
  outputProfile,
  effectiveReports,
  onValueChange,
  onOpenConfiguration,
}: CrawlerOutputProfileSectionProps) {
  return (
    <ToolProfileSection
      title="Crawl preset"
      description="Choose the kind of crawl report you need."
      profileField="output_profile"
      selectedProfile={outputProfile}
      profileConfig={
        crawlerToolDef?.uiOutputProfiles ?? null
      }
      currentValues={values}
      effectiveReports={effectiveReports}
      onValueChange={onValueChange}
      onOpenConfiguration={onOpenConfiguration}
    />
  );
}