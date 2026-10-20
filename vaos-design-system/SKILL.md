---
name: CAOS-design-system
description: Design, implement, refactor, or review CAOS frontend interfaces using existing shared components, shadcn/ui, Radix primitives, Tailwind semantic tokens, Lucide icons, and accessibility conventions. Use for React/Next.js UI work, forms, navigation, dialogs, notifications, and visual consistency reviews.
compatibility: opencode
---

# CAOS Design System

Use this skill when building or reviewing frontend UI in CAOS.

## Source of truth

1. Read the repository's `DESIGN_SYSTEM.md` for visual and accessibility standards, if present.
2. Read `ui-widget-registry.md` before changing workflow tool widgets, dynamic forms, bindings, or serialization.
3. Inspect existing implementations before selecting a new component or abstraction.
4. Use the configured shadcn MCP when component APIs, installation, or registry options need verification.

## Implementation workflow

1. **Locate the feature** and identify its existing component API, tests, routing, data flow, and state ownership.
2. **Reuse first:** search `src/components/ui/` and `src/shared/components/` for the needed primitive or shared component.
3. **Choose semantics:** prefer native HTML for ordinary text and structure; use shadcn/Radix for interactive primitives.
4. **Apply CAOS tokens:** use Tailwind semantic colors (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, `text-destructive`) and consistent spacing.
5. **Use Lucide icons:** pass `LucideIcon` components to icon props when appropriate; mark decorative icons `aria-hidden="true"`.
6. **Preserve contracts:** do not change props, business logic, hooks, Redux state, API payloads, permissions, routing, or workflow serialization unless the task requires it.
7. **Verify accessibility:** labels, keyboard controls, focus visibility, tooltip behavior, semantic links/buttons, disabled actions, form errors, overlay focus management, and reduced motion.
8. **Validate narrowly:** run TypeScript and relevant tests; lint and format touched files. Report checks actually run and any outstanding failures.

## Established component locations

- `src/components/ui/`: shadcn primitives; inspect before editing or installing.
- `src/shared/components/`: application-level reusable UI, including `IconActionButton`, `InfoTooltipButton`, `ResourceCard`, `SidebarRow`, `PageHeader`, `Eyebrow`, `StatusLine`, and other established abstractions.
- Feature/route-local components: keep feature-specific behavior alongside its feature.

## Component decisions

- Buttons: shadcn `Button`; set `type="button"` for non-submit actions.
- Navigation: Next.js `Link`, not a button used to mimic a link.
- Typography: semantic `h1`–`h6`, `p`, `span`, and `label`.
- Icons: `lucide-react`.
- Forms: use existing React Hook Form and Zod patterns; keep validation and field state consistent.
- Confirmation of destructive actions: prefer `AlertDialog` with accessible focus management.
- Tooltips: shadcn Tooltip; keep action naming separate from explanatory help.
- Toasts: use the existing notification infrastructure; do not create a parallel system.
- Layout: preserve responsive behavior, container scrolling, and keyboard reachability.

## Guardrails

- Do not install a shadcn component before verifying it is missing.
- Do not overwrite locally customized shadcn components without inspection.
- Do not duplicate an existing shared component.
- Do not introduce a new design system or arbitrary hardcoded brand colors.
- Do not conflate visual cleanup with unrelated architectural changes.
- Do not claim tests or visual verification succeeded unless run.

## Completion response

Summarize which components changed, whether public behavior or APIs changed, which checks passed, and any known accessibility or integration limitations. Keep the summary concise.
