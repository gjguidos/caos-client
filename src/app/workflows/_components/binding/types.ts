import type { ToolOutput } from "@/store/slices/registry/toolsSlice";

/** An upstream step whose declared outputs a field may bind to. */
export interface OutputSource {
  stepId: string;
  label: string;
  /** The producer tool's declared outputs (empty when it declares none). */
  outputs: ToolOutput[];
}
