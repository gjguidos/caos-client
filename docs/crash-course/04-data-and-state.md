# 04 — Data & state

Three transports, three kinds of state. Knowing which is which is most of the battle.

| Concern                          | Mechanism                           |
| -------------------------------- | ----------------------------------- |
| Who am I                         | React context (`SessionProvider`)   |
| Reference data (tools, roles, …) | Redux registries, bootstrapped once |
| Fetch an agent / workflow / list | `fetchData` server action → REST    |
| Talk to an agent, run a workflow | WebSocket                           |
| One screen's local UI            | `useState` in the component         |

## REST: the envelope, and the one funnel

The backend wraps **every** sub-400 response in an envelope, applied globally by its
`ResponseFormatMiddleware`:

```json
{ "success": true, "statusCode": 200, "message": "...", "data": <payload> }
```

`shared/api/envelope.ts` is the only place that models this. Use `unwrapData<T>(body)` or
`unwrapDataArray<T>(body)`. There is one nuance the file calls out: the middleware **omits `data`
entirely for a falsy body**, so an empty list arrives with no `data` key at all — `unwrapDataArray`
maps that to `[]`.

> Do not reintroduce defensive `Array.isArray(body) ? body : body.items ?? body.data` fallbacks.
> Reading `?.data` is always correct, and the scattered fallbacks are what this module exists to
> delete.

Callers live in `shared/api/` (`fetch_agents`, `fetch_workflows`, `fetch_registries`, `fetch_souls`,
`update_agent`, `delete_agents`, `upload_file`) plus a few route-owned ones under `_api/` folders.
They all follow the same three lines: get the base with `getPublicApiBase()`, throw if it is
missing, call `fetchData({ path, method })`.

`fetchData` itself is the server action described in chapter 03 — bearer token, bounded timeout,
origin allowlist.

## Redux: what is actually in the store

`store/index.ts`:

```ts
(tools, souls, roles, agentTypes, rulepacks); // registries — reference data
toolForm; // the live tool UI form (chapter 05)
workflowRun; // live workflow run state (chapter 06)
uploadedFiles; // files attached in the current session
toast; // notification queue
```

Note `makeStore()` is a **factory**, called once per `ReduxProvider` mount. A module-level singleton
would be shared across concurrent server renders — the same class of bug the session provider
avoids.

### Registries

Five registries describe what the platform can do: tools, personalities (souls), roles, rule packs
and agent types. `RegistryBootstrap.tsx` fetches all five in parallel the first time an
authenticated user lands on a workspace route, and dispatches them into their slices. Failure is not
fatal — it logs and dispatches empty lists so the app still renders.

Every entry shares `RegistryEntry`: `{ key, name, description?, version?, metadata? }`.

> **`key` is identity. `name` is display. Never match on `name`.** Agent payloads, form values and
> the `@<tool>` token all store keys.

`registryEntry.ts` gives you `findByKey`, `labelForKey` and `withValidKeys` — the last one guards
the boundary by dropping entries the backend sent without a `key`, because a missing key would
poison React keys, lookups and token generation alike.

Read registries through the hooks in `store/selectors.ts` — `useToolRegistry()`,
`useSoulRegistry()`, `useRoleRegistry()`, `useAgentTypeRegistry()`, `useRulePackRegistry()`,
`useToasts()`. They use `shallowEqual` so a re-dispatch of an identical list does not re-render
every consumer.

`ToolDefinition` is the richest of them; the parts you will care about:

- `ui` — the render contract (chapter 05).
- `outputs: ToolOutput[]` — the typed values downstream workflow steps can bind to
  (`${outputs.<step>.<key>}`).
- `supports.files` — max count/size, accepted mimes, and named `slots` a workflow can bind images
  into.
- `execution_mode` — `pure` (the tool writes the final answer itself) or `context_only` (the tool
  shapes the request and the agent's LLM writes the reply). Not to be confused with a workflow
  definition's `execution_mode` (`dag` / `sequential`), which is an unrelated field.

A tool has no typed config: the listing is a fixed projection of the backend's `ToolSpec`, so there
is no `config`, `config_schema` or `parameters_schema` to render a settings form from — `ui` is the
only form description. An agent still stores its tool references as `{key, config}`, and the backend
merges that `config` into the tool's CLI flags as defaults, so its keys are flag names (minus the
leading `--`), not a schema of their own.

`shared/lib/toolKeys.ts` holds the handful of keys the UI genuinely special-cases (`rag`, `writer`,
`green_claim`, `workflow`) so a backend rename has one grep target. It also maps a role key to the
tool pre-selected when a chat opens.

### Typed hooks

Always `useAppDispatch()` / `useAppSelector()` from `store/hooks.ts`, never the raw react-redux ones
— they carry `RootState` and `AppDispatch` types.

## WebSockets

The transport is two small generic hooks in `shared/websocket/`, and every socket in the app is
built on them.

**`useWebSocketConnection({ url, onMessage, onOpen, onClose, onError })`**

- Opens the socket when `url` becomes non-null; tears it down on cleanup or when `url` changes.
  Setting `url` to `null` is how you disconnect.
- Keeps every callback in a ref so changing a handler does not reopen the socket.
- `closeSilently` detaches the handlers _before_ closing, so a teardown we initiated never looks
  like a dropped connection to the reconnect logic.
- Normalises `string` / `Blob` / `ArrayBuffer` frames into text before calling `onMessage`.

**`useWebSocketReconnect({ maxAttempts, baseDelayMs, maxDelayMs, ... })`**

Exponential backoff (1s doubling, capped at 30s, 10 attempts), skipping reconnect on a clean 1000
close. `resetAttempts()` on a successful open.

**`wsTokenFetcher.ts`** obtains a socket credential through the current token adapter. Inspect the configured endpoint and local token behavior; do not assume a sign-in-era route exists.

### The three sockets

| Socket         | Endpoint                         | Owner                                 |
| -------------- | -------------------------------- | ------------------------------------- |
| Agent chat     | `/ws/api/v1/agent/<system_name>` | `chat/_hooks/useAgentWebSocket`       |
| Workflow run   | same endpoint, same hook         | `orchestration/_hooks/useWorkflowRun` |
| Agent creation | `/ws/api/v1/Joshu-A`             | `agents/_hooks/useAgentCreation`      |

The first two share `useAgentWebSocket`, which adds the agent communication framing on top of the generic
transport: it fetches a token, builds the URL, wires reconnect, and classifies incoming frames.

### The message envelope

Outgoing, from both chat and orchestration:

```ts
{
  event: "<agent_system_name>.comm",
  user_id, agent_id, agent_system_name, agent_name,
  data: { message: "@writer --mode=rewrite --text=…", tool_kwargs: {}, files?: FileRef[] }
}
```

The **entire instruction is the `message` string.** Tool invocations, workflow starts, workflow
resumes — all of them are CLI-shaped text in that one field. This is the design decision that ties
the whole client together, and it is why `_tool-form/lib/uiComponentSerializer.ts` and
`shared/lib/workflow/workflowCommand.ts` matter so much.

Incoming, `useAgentWebSocket.handleMessage` sorts frames three ways:

- `type === "log"` → narration, routed to `onLog`.
- `event` ending in `.comm` → a chat/run response; `pickPayloadFromWS` digs the payload out of the
  envelope and `extractReplyText` finds the text.
- anything else → passed through as `type: "other"`.

Chat and orchestration then interpret the same frames differently: chat looks for reply text and
widget data, orchestration looks for `workflow.step` events and `workflow.run` snapshots.

## File uploads

`shared/api/upload_file.ts` posts to the backend and returns a `FileRef` (`{ id, name, ... }`). Two
distinct flows exist in chat and they are easy to confuse:

- **Extracted** — a PDF is parsed _in the browser_ (`shared/lib/pdfTextExtractor.ts`, pdfjs) and its
  text becomes the message. Only the filename pill is shown.
- **Ref** — the file is uploaded to blob storage and a `FileRef` rides alongside the user's message
  in `data.files`.

`ChatAttachment` in `chat.types.ts` is the discriminated union that keeps them apart.

## Logging and toasts

`shared/lib/logger.ts` is gated on `NEXT_PUBLIC_ENABLE_LOGGING` — use it rather than bare
`console.*`. Toasts go through `useToast()` → `toastSlice` → the `ToastContainer` mounted in the
root layout.

---

Next: [05 — Chat & the tool UI contract](05-chat-and-tool-ui.md)
