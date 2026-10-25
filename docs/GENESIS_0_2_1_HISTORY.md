# Genesis 0.2.1 workspace history

The V2 workspace now renders the canonical backend transcript through the existing server credential
proxy. `GET /api/caos/v2/conversations/{id}/history` forwards only validated cursor/limit to the
configured Genesis communication upstream. The backend checks current UTU membership and per-message
visibility; the browser receives only whitelisted attributed message fields. All reads use no-store.

`Transcript.tsx` loads on reopen, refresh and turn completion. Load more follows opaque backend
cursors, merges IDs and preserves server sequence. Stale/aborted requests cannot overwrite the
current conversation; denial clears transcript rows. The workspace is reset on session-owner change.
Recent conversation IDs remain in localStorage, but message contents do not. Local
pending/indeterminate requests and status are transient; WebSocket context responses never generate
transcript rows.

User messages, agent conversational responses and deterministic capability contributions have
distinct labels. `chat.context` is context and hints, never an LLM answer. Older Genesis 0.2
conversations have empty history unless actual 0.2.1 messages were committed; there is no fabricated
backfill from event journals. Cancelled/denied/failed turns stay in the backend journal without
transcript batches.

Backend architecture, exact Redis keys, bounds, commit semantics and cognitive contract decisions
are documented in caos-api/docs/GENESIS_0_2_1_HISTORY.md. The existing 0.2 journal remains bounded
at 256 admitted turns per conversation.

Validation: workspace and transcript component tests, proxy tests, V2 communication regressions and
TypeScript. The real browser E2E suite requires an already provisioned CAOS_E2E_AGENT_ID and an API
running this backend change; it installs no grants. Its reload assertion now requires the actual
persisted message to reappear.
