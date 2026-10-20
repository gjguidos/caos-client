import type { ComponentType } from "react";
import GreenClaimWidget from "./GreenClaimWidget/GreenClaimWidget";

export interface WidgetProps<T = unknown> {
  data: T;
  className?: string;
  sourceText?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const widgetRegistry: Record<string, ComponentType<WidgetProps<any>>> = {
  green_claim: GreenClaimWidget,
};

/** Returns `undefined` for a type with no widget - which is the "is there one"
 * answer as well, so there is no separate lookup for that. */
export function getWidget(
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ComponentType<WidgetProps<any>> | undefined {
  return widgetRegistry[type];
}
