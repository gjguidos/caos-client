# 08 — Testing & day-to-day workflow

## Commands

```bash
npm run dev            # dev server on port 4000 (-H 0.0.0.0)
npm test               # Vitest (runs once and exits in v4 CI mode)
npm run type-check     # tsc --noEmit — MUST be run separately, see below
npm run lint           # ESLint 9 flat config
npm run format         # Prettier

npx vitest run path/to/file.test.ts    # one file
npx vitest run -t "test name"          # one test
```

### Validate the current quality gates

Check the current CI workflows for **type-check**, **unit-tests**, and other required jobs. Confirm the current CAOS workflow before treating those as the only required checks.

At minimum, run:

```bash
npm run type-check && npm test
```

> **`npm run build` does not catch TypeScript errors.** `next.config.mjs` sets
> `typescript.ignoreBuildErrors: true`. Run `type-check` yourself.

### Existing lint and formatting baselines

If a lint or formatting check fails on files you did not touch, first establish the current repository baseline. Check current lint/format status and compare with an unmodified branch before attributing failures to a change.

For focused validation:

```bash
npx prettier --check path/to/changed-file.tsx
npx eslint path/to/changed-file.tsx
```

Review current Husky / lint-staged configuration before relying on pre-commit automation.

## Testing

**Stack:** Vitest + jsdom + Testing Library + MSW. Tests live beside their subject
(`useAgentChat.test.tsx` next to `useAgentChat.ts`).

### Always render through the custom helper

```ts
import { render, screen, userEvent, waitFor } from "@/test-utils/test-utils";
```

It wraps the component in the Redux provider and the rest of the app's providers, and it lets you
override the global mocks per test:

```ts
render(<MyComponent />, {
  navigation: { params: { agent_id: "123" }, pathname: "/chat/x/123" },
  auth: { userId: null, session: null, isAuthLoading: false },
});
```

`src/test-utils/README.md` has the full option list. There are also `workflow-fixtures.ts` and
`websocket-test-utils.ts` for the two heaviest subsystems.

### What `vitest.setup.ts` does for you globally

Mocked: `next/image`, `next/navigation` (params, searchParams, router),
`@/shared/auth/hooks/useAuth`, `@/shared/api/fetch_agents`, `@/shared/lib/getApiClient`.

Polyfilled for jsdom: `Blob.prototype.text`, `matchMedia` (for responsive UI tests),
`URL.createObjectURL`, `ResizeObserver` (Radix Checkbox/Switch need it),
`Element.prototype.scrollIntoView`.

MSW's server starts and stops around the suite, and **all mocks reset after every test**. Add
per-test HTTP handlers with `server.use(...)`; the defaults live in `src/mocks/handlers.ts`.

### What is worth testing here

Look at what the repo already tests heavily and you will see the intended shape:

- **Pure logic gets the real tests.** `workflowRunSlice`, `workflowGraph`, `references`,
  `resolveStepInputs`, `uiComponentSerializer`, `parseToolCommand`, `route-config`,
  `workspaceResolver`. These are where the bugs actually are.
- **Components get behavioural tests** — render, interact with `userEvent`, assert on what a user
  would see. Not snapshots.
- Assert on **sets and outcomes**, not coordinates or implementation details. `workflowGraph`'s
  tests deliberately never assert on positions.

If you are about to write logic that is hard to test because it is tangled with React, that is the
signal to pull it into a `_lib/` module. That is why those folders exist.

## Conventions to follow

**Comments explain _why_, not _what_.** Read almost any file header in `shared/lib/workflow/` or
`store/slices/workflowRun/` — the comments justify a decision or warn about a trap. Match that. Do
not narrate what the code already says, and never describe previous behaviour in a comment when it
is no longer relevant.

**Colocate until it is shared.** New code goes in the route's `_lib` / `_hooks` / `_components`. It
moves to `shared/` when a second route needs it.

**Registration over branching.** Widget maps, `SLOT_WIDGET_MAP`, `widgetRegistry`,
`toolConfigComponentMap`, `WORKSPACE_TABLE`, `ROUTE_PROTECTIONS`. When you need behaviour to vary,
add a table entry.

**Use the CAOS design system.** Prefer shared application components, shadcn/ui, Radix primitives, Tailwind semantic tokens, and Lucide. Read `DESIGN_SYSTEM.md` and use the `CAOS-design-system` skill when available.

**Redux for tool-form state.** Never keep tool-form values in component state — see chapter 05.

**Never use em-dashes in code or comments; use `-`.**

## Commits & releases

Conventional Commits are enforced by commitlint (`.github/config/commitlint.config.js`): types
`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`, lower case, subject required, header
≤100 chars.

semantic-release runs on `master` (stable) and `alpha` (prerelease). `chore:` does not trigger a
release; everything else does.

## Traps that cost a day

| Trap                                                | Reality                                                 |
| --------------------------------------------------- | ------------------------------------------------------- |
| `npm run build` passed, so types are fine           | No. `ignoreBuildErrors: true`. Run `type-check`.        |
| `npm run quality` fails, so my change broke something | First compare with the current unmodified baseline. |
| Renaming `proxy.ts` to `middleware.ts`              | Intentional. Edit `shared/auth/middleware.ts` instead.  |
| Assuming a documentation folder tree is exact         | Verify current paths in the working repository.     |
| Assuming `NEXT_PUBLIC_*` covers prod runtime config | Prod reads `public/env.js`, written at container start. |
| Relying on the `/api/:path*` rewrite in prod        | It only exists when `NEXT_SERVER_BASE_URL` is unset.    |
| Adding a tool widget in one place                   | Update `WidgetType` **and** the relevant registry.      |
| UI primitives diverge across features                 | Reuse existing shared components and local shadcn UI. |

---

## How to explain this codebase to someone else

Five sentences, in this order:

1. It is a Next.js App Router client for an AI agent platform; the backend does all the thinking and
   this app is the interface to it.
2. CAOS uses a local development identity and token adapter; verify the security boundary for each REST and WebSocket integration before adding authentication behavior.
3. There are four surfaces — chat, orchestration canvas, agent builder, workflow builder — and which
   workspace an agent opens into is decided by one resolver keyed off the agent's type.
4. The tool UI is fully backend-driven: a tool ships a `ui` block of components with render paths,
   the client mounts them via `useRenderPath`, holds their values in one Redux slice, and serialises
   them back into an `@tool --flag=value` command string sent over a WebSocket.
5. Workflow runs are reconstructed from two streams — fast incremental step events and authoritative
   snapshots, with the snapshot always winning — so the canvas self-heals when a frame is lost.

Then point at [`ui-widget-registry.md`](../../ui-widget-registry.md) and say "and that is the
contract everything hangs off".
