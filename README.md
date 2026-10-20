# CAOS — Vision Agent Operative System

CAOS is a Next.js client for working with AI agents, workflows, and their execution results. It builds on the earlier AgentVerse client, with a simplified **local-development session** and a UI built on **shadcn/ui, Radix UI, Tailwind CSS, and Lucide React**.

The client connects to a FastAPI backend. Agent and workflow data, tool execution, delivery artifacts, and real-time events are managed through the application's existing API, state, and WebSocket integrations.

> **Current scope:** Local-first development. The local JWT/session is a development convenience, **not a production authentication system**. Do not expose a mock-token configuration in a publicly accessible deployment.

## What you can do

- Browse agents and open their chat or orchestration workspaces.
- Create and configure agents, subject to the permissions exposed by the session.
- Explore, build, and edit workflows.
- Monitor workflow execution and inspect tool results.
- Download delivered resources and artifacts.
- Use a shared UI for navigation, forms, feedback, and resource management.

## Technology

- **Next.js 16** with App Router (verify the installed version in `package.json` after dependency changes)
- **React 19**, **TypeScript**, **Node.js 20+**
- **shadcn/ui** and **Radix UI** for UI primitives
- **Tailwind CSS** with semantic design tokens; **Lucide React** for icons
- **Redux Toolkit** for application and tool-form state
- **React Hook Form** and **Zod** for form handling and validation
- **Vitest**, **Testing Library**, **jsdom**, and **MSW** for tests
- **ESLint** and **Prettier** for quality checks
- **Sonner** for toast presentation, integrated with the existing Redux toast queue where applicable

## Getting started

### Prerequisites

- Node.js 20 or later
- npm (use the package manager corresponding to the repository's lockfile)
- A running CAOS/AgentVerse-compatible FastAPI backend, when testing connected functionality

### Install

```bash
npm install
```

If the repository has a committed `package-lock.json`, prefer `npm ci` for reproducible installs, especially in CI.

### Configure local environment

Create `.env.local` with the environment values supported by your current configuration:

```dotenv
APP_ENV=local
NEXT_PUBLIC_API_BASE=http://localhost:8000/api
NEXT_PUBLIC_ENABLE_LOGGING=true
```

Server-side backend routing may also require `NEXT_SERVER_BASE_URL`, depending on the environment and `next.config.mjs`. Check the current config before adding it: it should point at the **backend server**, not the Next.js frontend.

**Local session:** Follow the existing `local-session.ts` / `local-token.ts` / `get-api-token.ts` implementation (or their actual filenames in this checkout). Configure any signing secret, user identity, or roles using the variables read by that code. Do not invent or reuse old `ENTRA_*`, `MSAL_*`, or login callback variables.

Never commit secrets or actual JWTs to Git.

### Run

```bash
npm run dev
```

The development server has historically been configured for **http://localhost:4000**. Confirm the current port in `package.json` if it differs.

## Common commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start built application
npm run type-check   # TypeScript validation
npm test             # Run Vitest tests
npm run lint         # ESLint
npm run lint:ci      # Strict lint (if present)
npm run format       # Prettier formatting
npm run quality      # Combined checks (if present)
```

Run a specific test:

```bash
npx vitest run path/to/component.test.tsx
npx vitest run -t "test name"
```

**Important:** `next.config.mjs` has previously used `typescript.ignoreBuildErrors: true`. Check whether this is still enabled. Until verified otherwise, **run `npm run type-check` separately**; a passing production build does not prove the TypeScript code is valid.

If repository-wide lint or format checks fail, inspect the current baseline rather than assuming old error counts are still accurate. For focused migration work:

```bash
npx eslint path/to/changed-file.tsx
npx prettier --check path/to/changed-file.tsx
```

## UI and design system

CAOS is using **shadcn/ui, Radix, Tailwind, and Lucide**.

- Reuse components already available in `src/components/ui/` before installing new ones.
- Reuse shared application components in `src/shared/components/` (for example, `ResourceCard`, `SidebarRow`, `PageHeader`, `StatusLine`, and `IconActionButton`).
- Use semantic Tailwind tokens such as `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, and `text-destructive`.
- Use Lucide React icons, not SKAPA SSR icon paths.
- Use semantic HTML for headings and text; preserve accessible names, focus behavior, keyboard support, and tooltip descriptions.
- During UI migrations, preserve props, business logic, navigation, API calls, Redux data flow, and tests unless a change is explicitly required.

### Adding shadcn components

Use the package manager and existing shadcn configuration for this repository:

```bash
npx shadcn@latest add button
```

OpenCode can use the shadcn MCP server to inspect available components. Treat local `src/components/ui/` implementations as authoritative: some may have been customized.

## Local authentication and permissions

The previous client used Microsoft Entra ID / MSAL with server-side PKCE. **That flow is being removed for CAOS's initial local-development configuration.**

- The frontend uses a **mocked local JWT/session** in place of an interactive sign-in flow.
- Existing `useAuth()` consumers continue to receive identity and permission information.
- Components should not redirect users to `/api/auth/login` or recreate Entra login screens.
- Roles/permissions remain meaningful for UI behavior such as who may create agents; the backend must independently enforce authorization wherever needed.
- Do not assume a mock JWT provides real user authentication or production security.

The exact token claims, signing configuration, and API-token forwarding path are defined by the code in `src/shared/auth/` and the server-side API helpers. Check those before changing authorization behavior.

## Repository structure

The earlier README described folders that no longer matched the actual app. The following is the current **high-level organization reported for the client**; individual routes may change over time:

```text
src/
├── app/
│   ├── (workspace)/       # Workspace routes and feature-local components/hooks
│   ├── admin/             # Administrative routes, where retained
│   ├── api/               # Next.js route handlers
│   ├── layout.tsx         # Root layout
│   └── RegistryBootstrap.tsx
├── components/
│   └── ui/                # shadcn/ui primitives
├── shared/
│   ├── api/               # API clients and fetch helpers
│   ├── auth/              # Session and permission utilities
│   ├── components/        # Shared app UI
│   ├── hooks/
│   └── lib/               # Workspace and workflow helpers
├── design-system/         # Existing design-system utilities, if retained
├── store/                 # Redux slices, hooks, selectors
├── providers/             # Application providers
├── mocks/                 # MSW handlers
├── test-utils/            # Test helpers
├── types/
└── proxy.ts               # Next.js proxy entrypoint
```

The project uses the `@/*` path alias for `src/*`.

**Route protection:** Check `src/shared/auth/middleware` and `src/proxy.ts` before changing routing or session behavior. Do not blindly rename `proxy.ts` to `middleware.ts`.

## Workflow and tool UI contracts

Before modifying workflow form rendering or tool configuration, consult **`ui-widget-registry.md`**, where present. The existing contract includes:

- `UIComponent`, `WidgetType`, and the widget registry / render paths
- `SLOT_WIDGET_MAP`, `FieldRenderer`, and `DynamicFormRenderer`
- `chatInputConfig` and CLI serialization
- `--snake_case` CLI flags
- `toolFormSlice` / `useToolForm()` as the owner of shared tool-form state

Maintain the existing behavior that submit clears the chat input while leaving mode and panel fields intact, unless deliberately changing that contract.

## Backend connectivity and runtime configuration

- `NEXT_PUBLIC_*` values can be embedded in the browser bundle at build time.
- Some deployments also generate `public/env.js` at container startup using `entrypoint.sh`; inspect the current implementation before assuming every variable supports runtime overrides.
- Keep credentials and internal addresses out of browser-visible configuration.
- The backend API URL and server-side rewrite behavior are environment-specific. Check `next.config.mjs`, `getApiClient`, and related server actions before changing their defaults.
- WebSocket authentication for local sessions should use the new local-token flow where implemented; do not assume legacy MSAL token exchange still exists.

## Docker

Use the repository's Docker Compose file, if present:

```bash
docker compose up --build
```

To stop:

```bash
docker compose down
```

The older AgentVerse compose setup exposed the client through **host port 8080 mapped to container port 4000** and used an `agentverse_net` network. Confirm the **current** service name, port mapping, and network in `docker-compose.yml` before relying on those values.

For standalone builds:

```bash
docker build -t CAOS-client:local .
docker run --rm -p 4000:4000 --env-file .env.local CAOS-client:local
```

This assumes the current Dockerfile exposes port 4000 and supports the configured runtime variables. The local mock-session setup must not be used as public production authentication.

## Testing

Tests use Vitest, Testing Library, jsdom, and MSW. Global setup has historically mocked Next.js navigation, image handling, authentication hooks, and some API helpers.

- Prefer `src/test-utils/test-utils` for shared `render` and mock helpers.
- Add MSW request overrides per test instead of globally mutating handlers.
- For shadcn/Radix UI tests, verify hover, keyboard focus, tooltip content, and accessibility attributes.
- For focusable disabled actions, distinguish `aria-disabled` from the native `disabled` attribute when the component intentionally preserves tooltip accessibility.
- Run tests relevant to changed files, then the entire suite before merging.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| UI cannot reach the API | `NEXT_PUBLIC_API_BASE`, backend availability, CORS, server-side API URL |
| Local session has no identity | Local token/session generation, expected claims, `useAuth()` |
| API requests return 401/403 | Bearer token forwarding, API roles, backend validation |
| WebSocket cannot connect | Backend URL, token construction, WebSocket route and handshake |
| Tooltip tests fail | `TooltipProvider`, Radix trigger forwarding, focus behavior |
| Port 4000 is occupied | `package.json` dev command and local port conflicts |
| CI fails while local build succeeds | Run `npm run type-check` and `npm test` separately |

## Development conventions

- Keep `AGENTS.md` as the operational guide for OpenCode and other coding agents.
- Preserve existing hooks, stores, registries, and workflow contracts during UI-only migrations.
- Use Conventional Commits if the current repository still enforces them.
- Verify old AgentVerse release configuration (`.releaserc.json`, CI workflows, repository URLs) before publishing under the CAOS name.

## Migration status

CAOS is a fork/evolution of the AgentVerse client, and migration may be ongoing. Legacy names, routes, dependencies, or configuration may still exist. This README describes the **target direction** where migration is incomplete; the checked-in code and configuration remain authoritative for exact runtime behavior.

