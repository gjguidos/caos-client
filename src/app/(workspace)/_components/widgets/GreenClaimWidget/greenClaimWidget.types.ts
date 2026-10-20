import type {
  GreenClaimResponse,
  GreenClaimReportItem,
  PrincipleViolation,
  ProblematicWordMatch,
  ProblematicWordResult,
} from "../../../_api/greenClaim.types";
import type { WidgetProps } from "../widgetRegistry";

export type GreenClaimWidgetProps = WidgetProps<GreenClaimResponse>;

export interface ProblematicWordsSectionProps {
  problematicWords: ProblematicWordResult;
  className?: string;
}

export interface WordMatchListProps {
  matches: ProblematicWordMatch[];
  type: "exact" | "close";
  className?: string;
}

export interface ViolationAccordionProps {
  statement: GreenClaimReportItem;
  index: number;
  className?: string;
  onStatementHover?: (statementId: string | null) => void;
  onStatementClick?: (statementId: string | null) => void;
  statementId?: string;
}

export interface ViolationDetailsProps {
  violation: PrincipleViolation;
  className?: string;
}
