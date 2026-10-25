# Genesis 0.2 V2 conversation workspace

This opt-in workspace is `/v2/conversations`. A reusable link is
`/v2/conversations?conversation=<id>`. The current checkout uses Next.js 16.3.7 App Router (the
requested Next.js 15 architecture still applies). V1 chat, routes, hooks and socket helpers are
unchanged.

## Setup

Run the **current caos-api sources**, including
`src/domains/agentverse/interfaces/api/v2/communication.py`, with the existing Genesis enablement,
durable session store, UTU policy, approved Adam definition and `chat.context` grants. No grants,
membership, agent IDs or credentials are installed by this UI or its tests. Existing Genesis local
login/logout configuration must already work. Use a provisioned Adam ID supplied by your
administrator.

Set these server-only client variables and restart `npm run dev` when needed:

```dotenv
GENESIS_COMMUNICATION_URL=http://127.0.0.1:8001/api/v2/agentverse/communication
# Optional browser-reachable origin when the HTTP upstream is container-internal:
GENESIS_WEBSOCKET_URL=ws://127.0.0.1:8001
```

With HTTPS use `wss://` for the browser socket. Neither URL may contain credentials.
`NEXT_SERVER_BASE_URL`, when configured, must be the actual **client origin**; the existing auth
base-URL helper uses it for redirects and same-origin checks. Without the communication variable, V2
controls are disabled. There is no V1 navigation switch or automatic socket connection. Open the V2
URL explicitly, sign in, enter authorized participants, create or open an ID, and click Connect.

## Contracts and ownership

- `POST /api/caos/v2/ticket` retains the exact bearer on the Next server and returns only ticket
  fields. The socket authenticates in a frame, never a URL.
- `POST /api/caos/v2/conversations` forwards participant IDs only. The API derives creator/tenant
  and enforces UTU. Creating participation never grants execution.
- `GET /api/caos/v2/conversations/:id` performs fresh backend authorization and returns only the ID
  and participant agent IDs. Both direct route payloads and the real API middleware's
  `{success, data, ...}` HTTP envelope are supported.
- `GET /api/caos/v2/session` returns an opaque session ownership hash, with no-store. It contains no
  API bearer. The root layout also removes the retained local bearer from the SessionProvider's
  browser payload.
- One root provider owns one `CaosV2Client` for the signed-in session across routes, conversations
  and agents. It connects only on explicit user action. It disposes on logout navigation, session
  replacement, unmount and pagehide. Backend policy closure clears private workspace content; a
  five-second browser-session check catches logout in another tab and cookie expiry. Network failure
  disconnects.
- Send selects up to four existing participants. Each turn shows its event ID, correlated terminal
  status/error and one labeled contribution per agent. `chat.context` displays raw context, hints
  and usage metadata as deterministic output, explicitly **not an LLM answer**. There is no
  coordination or delegation.
- Cancel uses `event.cancel` with the original event ID. A cancellation racing completed work does
  not erase a completed response. Reconnect obtains a new single-use ticket and never
  retries/replays an indeterminate message.
- Text and serialized frame limits are checked before sending (8 KiB text, 16 KiB frame). Existing
  transport backpressure remains enforced.

## Persistence limitations

The backend has create and open-by-ID, but no list or transcript/history endpoint. The sidebar is
explicitly **recent IDs on this browser**, bounded to 20 and scoped by user; it is not a backend
listing or proof of current access. Every reopen rechecks authorization. Only IDs enter
localStorage, never messages or tickets. They remain available to the same user after another login.
Save/copy the URL if browser storage is disabled. Conversation IDs are durable on the backend;
rendered messages are memory-only and disappear on refresh, workspace unmount, logout or session
replacement. The current context capability receives empty history. No transcript is fabricated.

## Verification

```bash
npm run type-check
npx vitest run src/app/v2 src/shared/communication-v2 \
  src/shared/websocket/caosV2.test.ts \
  src/shared/auth/lib/genesis-communication.test.ts
npm run lint
npx playwright install chromium
CAOS_E2E_AGENT_ID=<already-authorized-adam-id> npm run test:e2e
# Or use an installed Google Chrome without a browser download:
CAOS_E2E_CHANNEL=chrome CAOS_E2E_AGENT_ID=<already-authorized-adam-id> npm run test:e2e
```

`CAOS_E2E_BASE_URL` optionally changes the client origin (default localhost:4000). The E2E suite
uses actual login, HTTP proxies, WebSocket and backend logout; it has no network mocks, token
injection, fixture memberships or policy bypass. It is intended for the configured local Genesis
login, not interactive Entra login. It creates persistent test conversations/turns under that
signed-in test user; there is no public deletion endpoint. Traces are disabled so tickets are not
recorded; screenshots/reports are gitignored and may contain conversation text. Deterministic
context usually completes before a browser can cancel it, so cancel races are covered by focused
component/transport tests rather than artificially delaying the real backend.

The browser suite checks create, session.ready, correlated Adam context and metadata, ID reuse after
reload, no transcript fabrication, explicit reconnect without replay, logout revocation from another
tab, denied participants/open and V1 Adam rendering without a V2 socket. It does not invoke the V1
LLM or install new permissions.

## Files

- `src/app/v2/conversations/`: route, workspace, participant UI and model/tests.
- `src/shared/communication-v2/`: root session owner, connection provider and tests.
- `src/app/api/caos/v2/`: existing ticket/create proxies, new open and session routes.
- `src/shared/auth/lib/genesis-communication.ts` and tests: proxy hardening and real HTTP envelope
  handling.
- `src/shared/websocket/caosV2.ts` and tests: status, disconnect/handshake cleanup, frame bound; the
  existing correlation/cancel/ticket transport is reused.
- `src/app/layout.tsx`: session owner integration and bearer-free browser session.
- `e2e/conversations-v2.spec.ts`, `playwright.config.ts`, `package*.json`, `vitest.config.ts`,
  `.gitignore`: browser test tooling and artifact exclusions.

## Verified results — 25 October 2026

- All **32 focused V2 tests passed** (six test files).
- Full TypeScript check and targeted ESLint with zero warnings passed.
- **3/3 real browser E2E tests passed** using installed Google Chrome against the actual Next
  development server on port 4000 and the actual current-source FastAPI app on port 8002. Tests used
  Redis, UTU, lifecycle, CPBX and Adam's deterministic context provider; no HTTP/WebSocket mocks or
  permission overrides.
- Full frontend suite: **1296 passed, 34 failed**, with three runtime errors, across 124 files. An
  untouched committed-HEAD copy using the same dependencies reproduced all 34 identical failing
  tests and all three runtime errors (1264 passed, 34 failed). Failures include existing workflow
  binding/pointer-capture mocks, ToolSelector selectors, crawler adapter, RunBar, SummaryPanel and
  logo assertions. No new failing test was introduced.
- Full repository ESLint: **9 errors, 152 warnings**, exactly reproduced on untouched committed
  HEAD. Touched/new code passes targeted lint without warnings.
- V1 browser smoke rendered Adam and opened no V2 socket. The unchanged V1 chat component/hook
  suites ran in the full suite; its four existing ToolSelector failures also reproduced on HEAD. No
  V1 LLM request was made.

The pre-existing API service on port 8001 did not expose V2 communication routes. For verification,
a temporary second container reused its existing configured services and mounted the current API
sources read-only on port 8002. Only the client's communication target was temporarily changed;
original environment bytes were restored, the manual test session logged out, and the temporary
container removed. The original API service was not restarted or edited. To enable this workspace
normally, deploy/run the current V2 API and set the documented variables. Test-created
conversations/turns remain durable because there is no deletion API. No commit was created.

### Exact implementation file manifest

Modified existing files (including the V2 transport/proxy files already present and untracked at the
start of this task):

- `.env.example`
- `.gitignore`
- `README.md`
- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `src/app/layout.tsx`
- `src/shared/auth/lib/genesis-communication.ts`
- `src/shared/auth/lib/genesis-communication.test.ts`
- `src/shared/websocket/caosV2.ts`
- `src/shared/websocket/caosV2.test.ts`

Added:

- `docs/V2_CONVERSATIONS.md`
- `playwright.config.ts`
- `e2e/conversations-v2.spec.ts`
- `src/app/api/caos/v2/conversations/[conversationId]/route.ts`
- `src/app/api/caos/v2/session/route.ts`
- `src/app/v2/conversations/page.tsx`
- `src/app/v2/conversations/_components/Workspace.tsx`
- `src/app/v2/conversations/_components/Workspace.test.tsx`
- `src/app/v2/conversations/_components/ParticipantMessage.tsx`
- `src/app/v2/conversations/_components/model.ts`
- `src/app/v2/conversations/_components/model.test.ts`
- `src/shared/communication-v2/Provider.tsx`
- `src/shared/communication-v2/Provider.test.tsx`
- `src/shared/communication-v2/session-owner.ts`
- `src/shared/communication-v2/session-owner.test.ts`

The existing ticket/create route files are reused without changes. API sources were inspected and
exercised but not edited by this task.
