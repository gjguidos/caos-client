# 01 — React & Next.js primer

Only the concepts this codebase actually leans on. If you already know React 19 and the Next.js App
Router, skim the two "in this repo" boxes and move to chapter 02.

## React in ten minutes

### Components are functions that return markup

```tsx
function AgentCard({ name }: { name: string }) {
  return <div className="rounded border p-4">{name}</div>;
}
```

That `<div>` syntax is **JSX** — it compiles to function calls. `className` instead of `class`,
`onClick` instead of `onclick`, and `{}` escapes back into JavaScript. A component name must start
with a capital letter, or React treats it as an HTML tag.

Components compose: `<AgentCard />` inside another component's return value. Data flows **down**
through props; nothing flows back up except through callbacks you pass down (`onSelect={...}`).

### State: the value that makes it re-render

```tsx
const [showSetup, setShowSetup] = useState(false);
```

`useState` returns the current value and a setter. Calling the setter tells React "this component's
output is out of date" and React re-runs the function and updates the DOM. **Assigning to a plain
variable does nothing** — React never sees it.

Re-running the function body on every render is the mental model to hold. Anything you write at the
top level of a component runs again, every time.

### Effects: talking to the outside world

```tsx
useEffect(() => {
  fetchAgent();
}, [agentId]);
```

`useEffect` runs _after_ render, and re-runs whenever a value in the dependency array changes. It is
for things outside React: network calls, WebSockets, timers, `localStorage`, scrolling. The optional
returned function is the cleanup, run before the next execution and on unmount — that is how sockets
get closed and timers cleared.

Getting the dependency array wrong is the #1 source of bugs in this codebase's neighbourhood: too
few deps gives you stale values, too many gives you an infinite reconnect loop. You will see a
recurring defence against this in `useAgentWebSocket.ts` and `useToolFormSync.ts`:

```tsx
const onMessageRef = useRef(onMessage);
useEffect(() => {
  onMessageRef.current = onMessage;
}, [onMessage]);
```

A **ref** (`useRef`) is a mutable box whose changes do _not_ trigger a re-render. Stashing a
callback in a ref lets an effect always call the newest version without listing it as a dependency,
which would otherwise tear down and rebuild the socket on every render. When you see this pattern,
that is what it is for.

### Memoisation: `useMemo`, `useCallback`

```tsx
const enrichedTools = useMemo(() => /* expensive derive */, [agentData?.tools, toolRegs]);
const send = useCallback((payload) => { ... }, [ws, agentId]);
```

Both cache a value between renders until a dependency changes. `useMemo` caches a computed value;
`useCallback` caches a function identity. In this repo they are used less for speed and more for
**stability** — a function that keeps the same identity does not retrigger the effects that depend
on it.

### Context: passing a value past the props

`useState` is local. Props are explicit but tedious across ten levels. **Context** lets an ancestor
publish a value that any descendant can read:

```tsx
<SessionProvider session={session}>{children}</SessionProvider>;
// ...much deeper:
const session = useSession();
```

This repo uses context for the session (`SessionProvider.tsx`), the theme, tooltips, React Flow, and
run artifacts. It uses Redux for genuinely shared _application_ state — see chapter 04 for why the
session deliberately is not in Redux.

### Custom hooks

Any function whose name starts with `use` and which calls other hooks. It is just extraction: pull
stateful logic out of a component so the component stays a description of the screen. This codebase
does this aggressively — `useAgentChat`, `useWorkflowRun`, `useToolForm`, `useAgentData`. When you
open a page component and it reads as mostly JSX, that is why.

> **Rules of hooks.** Hooks must be called unconditionally, in the same order, at the top level of a
> component or another hook. No hooks inside `if`, loops, or after an early `return`. React matches
> hook state by call order.

## Next.js in ten minutes

Next.js is a React framework that adds routing, a server, and a build pipeline. This repo uses the
**App Router** (`src/app/`), Next.js 16.

### The filesystem is the router

Inside `src/app/`, folders become URL segments and a `page.tsx` makes a segment routable.

| Path on disk                                                   | URL                    |
| -------------------------------------------------------------- | ---------------------- |
| `app/(workspace)/page.tsx`                                     | `/`                    |
| `app/agents/new/page.tsx`                                      | `/agents/new`          |
| `app/agents/[agentId]/edit/page.tsx`                           | `/agents/abc123/edit`  |
| `app/(workspace)/chat/[agent_system_name]/[agent_id]/page.tsx` | `/chat/joshu-a/abc123` |

Three folder conventions matter here:

- **`[param]`** — a dynamic segment. Read it in the component with `useParams()`.
- **`(group)`** — a _route group_. Parentheses mean "this folder does not appear in the URL". It
  exists to give a set of routes a shared `layout.tsx`. `(workspace)` is why `/chat/...` and `/`
  both get the workspace chrome while `/agents/...` does not.
- **`_folder`** — a _private folder_. A leading underscore opts the folder out of routing entirely.
  This repo uses it heavily to colocate code with the route that owns it: `_components`, `_hooks`,
  `_lib`, `_utils`, `_api`.

### Layouts wrap pages

A `layout.tsx` receives `children` and wraps every page beneath it. Layouts persist across
navigation — they do not re-mount when you move between sibling pages. The nesting here is:

```
app/layout.tsx                    root: <html>, providers, theme, local session
└── app/(workspace)/layout.tsx    registry bootstrap + WorkspaceChrome (rail, panels)
    └── page.tsx                  the actual screen
```

### Server Components vs Client Components

This is the concept that trips people up most.

In the App Router every component is a **Server Component** by default: it runs only on the server,
its code never ships to the browser, and it can be `async` and read secrets. It cannot use
`useState`, `useEffect`, or event handlers, because there is no browser to attach them to.

Putting `"use client"` at the top of a file marks it, and everything it imports, as a **Client
Component**: it is server-rendered once for the initial HTML, then _hydrated_ in the browser where
hooks and event handlers work.

> **In this repo:** almost everything is `"use client"`. An important server component is the
> root `app/layout.tsx`, which establishes providers and the server/client boundary.
> CAOS uses a configured local session rather than a browser sign-in flow; inspect the
> actual layout and session provider before assuming where the mock JWT is resolved.

### Route handlers

A `route.ts` file exports HTTP verb functions and becomes an API endpoint. Everything under
`src/app/api/` contains server endpoints and handlers used by the client, where required.
Do not assume a login/callback route exists. The exact handlers depend on the local session,
resource delivery, and backend connectivity configured in the repository.

### Server Actions

A file starting with `"use server"` exports functions the client can _call_ but which only ever
execute on the server. `src/shared/lib/server-actions.ts` is the one that matters: `fetchData()` is
the single funnel for every backend REST call, and it lives on the server so token handling and backend routing can remain on the server as configured. More in chapter 04.

### Middleware — but it is called `proxy.ts`

Next runs a function on every request before routing. Conventionally the file is `middleware.ts`;
**this repo uses `src/proxy.ts`**, which re-exports the real implementation from
`src/shared/auth/middleware.ts`. Don't rename it. Edit the logic in `shared/auth/middleware.ts`.

## The rest of the stack, one line each

- **TypeScript** — types everywhere; `@/*` is an alias for `src/*`.
- **Tailwind CSS** — utility classes in `className`. `cn()` in `shared/lib/utils.ts` merges them
  safely.
- **Redux Toolkit** — global state (registries, tool form, run state). Chapter 04.
- **shadcn/ui** — locally owned UI primitives in `src/components/ui/`; consult `DESIGN_SYSTEM.md`.
- **Radix UI** — accessible interaction primitives used by shadcn components.
- **Lucide React** — icons across shared components and feature UI.
- **`@xyflow/react`** (React Flow) — the node canvas for workflows, in both the run view and
  builder.
- **react-hook-form + zod** — the agent wizard's form layer.
- **Vitest + Testing Library + MSW** — tests. Chapter 08.

---

Next: [02 — Architecture & repo layout](02-architecture-and-layout.md)
