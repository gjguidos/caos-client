/**
 * Type definitions for Green Claim Analysis API
 */

/** Individual problematic word or phrase match. */
export interface ProblematicWordMatch {
  text: string;
  matched_against: string;
  /** Confidence score (1.0 for exact, <1.0 for fuzzy) */
  confidence: number;
  type: "exact" | "close";
  start: number;
  end: number;
}

/** Result of problematic word matching. */
export interface ProblematicWordResult {
  exact_matches: ProblematicWordMatch[];
  close_matches: ProblematicWordMatch[];
}

/** Request model for green claim analysis. */
export interface GreenClaimRequest {
  text: string;
  chunk_text?: boolean;
  use_second_opinion?: boolean;
  include_formatted_report?: boolean;
}

/** Represents a single violated green-claim principle. */
export interface PrincipleViolation {
  principle: string;
  /** ≤ 30 words */
  explanation: string;
  /** Lexicographically sorted list of ICC guideline references (e.g., ['4. Scope']) */
  guidelines_reference: string[];
  /** ≤ 20 words */
  improvement_recommendation: string;
  confidence: "strong" | "weak";
}

/** Represents a single GREEN_CLAIM and all violated principles for that claim. */
export interface GreenClaimReportItem {
  statement: string;
  principles_violated: PrincipleViolation[];
}

/** Response model for green claim analysis. */
export interface GreenClaimResponse {
  green_claim_report: GreenClaimReportItem[];
  legal_statement: string;
  guidelines: string;
  problematic_words: ProblematicWordResult;
  formatted_report?: string;
}

/** Deterministic LLM response model for green claim compliance analysis. */
export interface GreenClaimLLMResponse {
  green_claim_report: GreenClaimReportItem[];
  legal_statement: string;
  guidelines: string;
}

/** Type of green claim analysis performed */
export type AnalysisType = "text" | "chunked_text" | "file";

/** Audit log entry for green claim analysis requests */
export interface GreenClaimAudit {
  _id?: string;
  user_object_id?: string;
  analysis_type: AnalysisType;
  timestamp: string;
  duration_ms: number;
  input_metadata: Record<string, any>;
  analysis_config: Record<string, any>;
  output_summary: Record<string, any>;
  full_response?: Record<string, any>;
  error?: string;
  success: boolean;
  created: string;
  modified: string;
}

/** Query parameters for listing audit logs */
export interface GreenClaimAuditQueryParams {
  user_object_id?: string;
  analysis_type?: AnalysisType;
  success?: boolean;
  start_date?: string;
  end_date?: string;
  limit?: number;
  skip?: number;
}
