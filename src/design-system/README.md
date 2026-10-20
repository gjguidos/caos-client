# CAOS Design System — Theme Foundation

CAOS is a standalone application using shadcn/ui, Radix UI, Tailwind CSS and Lucide React.
This directory contains the global stylesheet and typed access to CAOS's semantic theme variables.

## Files

- `globals.css` — typography, semantic colors, light/dark themes, global surface defaults and existing application animations.
- `theme-colors.ts` — typed token names and CSS color helpers for JavaScript-driven surfaces (charts, canvases, React Flow).

## Integration

Import `globals.css` **once** from `src/app/layout.tsx` (adjust the relative import for your actual location).
The stylesheet in this package uses **Tailwind CSS v3** syntax (`@tailwind` and HSL token triplets) to match the supplied project's stylesheet. The project must map CSS variables into its `tailwind.config` for semantic utilities such as `bg-background`, `bg-card`, `text-foreground` and `border-border` to work. Check your existing Tailwind configuration before replacing the stylesheet. For Tailwind CSS v4, use its `@import "tailwindcss"` / `@theme inline` theme approach instead of combining both versions.

### Tailwind v3 token configuration

Merge these entries into your existing Tailwind theme `extend` configuration:

```ts
colors: {
  border: "hsl(var(--border) / <alpha-value>)",
  input: "hsl(var(--input) / <alpha-value>)",
  ring: "hsl(var(--ring) / <alpha-value>)",
  background: "hsl(var(--background) / <alpha-value>)",
  foreground: "hsl(var(--foreground) / <alpha-value>)",
  primary: {
    DEFAULT: "hsl(var(--primary) / <alpha-value>)",
    foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
    foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
  },
  destructive: {
    DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
    foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
  },
  muted: {
    DEFAULT: "hsl(var(--muted) / <alpha-value>)",
    foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
  },
  accent: {
    DEFAULT: "hsl(var(--accent) / <alpha-value>)",
    foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
  },
  popover: {
    DEFAULT: "hsl(var(--popover) / <alpha-value>)",
    foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
  },
  card: {
    DEFAULT: "hsl(var(--card) / <alpha-value>)",
    foreground: "hsl(var(--card-foreground) / <alpha-value>)",
  },
},
borderRadius: {
  lg: "var(--radius)",
  md: "calc(var(--radius) - 2px)",
  sm: "calc(var(--radius) - 4px)",
},
```

### Examples

```tsx
<div className="rounded-lg border border-border bg-card text-card-foreground" />
<button className="bg-primary text-primary-foreground" />
```

Use Tailwind semantic utilities for normal UI. Use `ThemeColors.css()` / `ThemeColors.hsl()` for SVG, canvas and libraries requiring CSS color strings.

## Color decisions

The shipped light and dark palettes are **initial CAOS defaults**, not a final brand palette. Change variables in `globals.css` to evolve the product identity without rewriting components. Use the `.dark` class on an ancestor (typically `<html>`) to activate dark theme.

## Typography

Body: Inter. Headings: Plus Jakarta Sans. Fonts are requested from Google Fonts via CSS; for a production Next.js deployment, consider `next/font/google` to avoid a runtime network dependency.

## Layout and motion

The default HTML/body sizing supports full-height application workspaces. The CSS intentionally does **not** force `body { overflow: hidden }`, because that must be determined by `WorkspaceChrome` or individual routes. It preserves `crawler-globe-spin` and `animate-result-enter` and respects reduced-motion preferences.

## Validation

Before adopting these files, check `tailwind.config`, installed Tailwind major version, theme provider's dark-mode strategy and component styling. Run type-check, focused tests, and a light/dark visual inspection. This package is not a claim that it has been verified against the current working repository.
