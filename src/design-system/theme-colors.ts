/** Semantic CAOS theme tokens for CSS-driven visuals (charts, SVG, React Flow).
 * Variables hold HSL channels, e.g. `--primary: 221 71% 46%`.
 * Prefer Tailwind classes for standard component styling.
 */
export const ThemeColors = {
  BACKGROUND: "--background",
  FOREGROUND: "--foreground",
  CARD: "--card",
  CARD_FOREGROUND: "--card-foreground",
  POPOVER: "--popover",
  POPOVER_FOREGROUND: "--popover-foreground",
  PRIMARY: "--primary",
  PRIMARY_FOREGROUND: "--primary-foreground",
  SECONDARY: "--secondary",
  SECONDARY_FOREGROUND: "--secondary-foreground",
  MUTED: "--muted",
  MUTED_FOREGROUND: "--muted-foreground",
  ACCENT: "--accent",
  ACCENT_FOREGROUND: "--accent-foreground",
  DESTRUCTIVE: "--destructive",
  DESTRUCTIVE_FOREGROUND: "--destructive-foreground",
  BORDER: "--border",
  INPUT: "--input",
  RING: "--ring",
  CHART_1: "--chart-1",
  CHART_2: "--chart-2",
  CHART_3: "--chart-3",
  CHART_4: "--chart-4",
  CHART_5: "--chart-5",
  SIDEBAR_BACKGROUND: "--sidebar-background",
  SIDEBAR_FOREGROUND: "--sidebar-foreground",
  SIDEBAR_PRIMARY: "--sidebar-primary",
  SIDEBAR_PRIMARY_FOREGROUND: "--sidebar-primary-foreground",
  SIDEBAR_ACCENT: "--sidebar-accent",
  SIDEBAR_ACCENT_FOREGROUND: "--sidebar-accent-foreground",
  SIDEBAR_BORDER: "--sidebar-border",
  SIDEBAR_RING: "--sidebar-ring",
} as const;

export type ThemeColorToken = (typeof ThemeColors)[keyof typeof ThemeColors];

/** Typed CSS color string helpers — token values are HSL channels, not RGB. */
export const ThemeColor = {
  css: (token: ThemeColorToken) => `var(${token})`,
  hsl: (token: ThemeColorToken) => `hsl(var(${token}))`,
  hsla: (token: ThemeColorToken, alpha: number) =>
    `hsl(var(${token}) / ${Math.max(0, Math.min(1, alpha))})`,
} as const;

// Example: ThemeColor.hsl(ThemeColors.PRIMARY)
// Example: ThemeColor.hsla(ThemeColors.CHART_1, 0.5)
