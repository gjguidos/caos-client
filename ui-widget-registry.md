# UI Widget Registry — Developer Spec

Joint BE ↔ FE contract for tool UI rendering. Use this when adding new render paths, new widgets, or
registering a new tool.

---

## 1. How It Works

The BE sends a `ui` block with each tool definition. The FE reads it and renders the correct widgets
in the correct locations — with no hardcoded tool knowledge in the UI.

```
BE ToolDefinition.ui
  └── config.chat_input        ← dedicated first-class chat input config (or absent)
  └── config.group_label_map   ← display labels for panel sections
  └── components: UIComponent[] ← composable slot widgets (PillGroup, ResponseActionBar, panel fields)
```

The FE resolves each `UIComponent` to a render location via `render_paths`, then dispatches it to
the correct widget. Form values are managed centrally in Redux (`toolFormSlice`).

---

## 2. UIComponent Schema

```typescript
interface UIComponent {
  id: string; // unique param id — used as the form state key
  type: FieldType; // data type: "select" | "text" | "number" | "multiselect"
  // ("free_text" exists in the union but is unused — treat as reserved)
  widget: WidgetType; // which widget to render (see section 4)
  group: string | null; // properties panel group key; null = not panel-rendered
  groupLabel?: string; // overrides group_label_map for this group's section header
  flag_config?: {
    flag: string; // "--name" = named CLI param (the mode pill uses "--mode")
    required: boolean; // must be filled to enable submit
  };
  render_paths: string[]; // where to render (see section 3)
  slot_order: number | null; // ordering within slot; null = append after ordered items
  props: Record<string, unknown>; // widget-specific config (labels, options, placeholders, etc.)
  file_upload?: boolean; // panel TextArea only — enables file attachment in the properties panel
}
```

> **`ChatInput` is not a `UIComponent`.** The chat input is configured via `ui.config.chat_input`
> (see section 4.3). The `components` array contains only composable slot widgets.
>
> **`file_upload` on `UIComponent`** applies exclusively to `TextArea` panel widgets via
> `FieldRenderer`. For the main chat input, use `chat_input.file_upload` in `ui.config` instead.

---

## 3. Render Paths

A `render_paths` entry tells the FE where to mount the widget. Each FE location subscribes to
exactly one path via `useRenderPath(path, components)`.

| Path string                                                   | FE location                               | Rendered by                             |
| ------------------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| `"workspace.conversationArea.inputSection.toolMode"`          | Mode pill strip above input               | `ToolChatBar` via `SLOT_WIDGET_MAP`     |
| `"workspace.conversationArea.inputSection.inputActionBar"`    | Left side of input action bar             | `ToolChatBar` via `SLOT_WIDGET_MAP`     |
| `"workspace.conversationArea.responseCard.responseActionBar"` | Action strip on response cards            | `ResponseBubble` (direct)               |
| `"propertiesPanel.<group>"`                                   | Right sidebar panel, grouped by `<group>` | `DynamicFormRenderer` → `FieldRenderer` |

> **`propertiesPanel` matching** — `useRenderPath("propertiesPanel", components)` matches any
> component whose path _starts with_ `"propertiesPanel"`. The group sub-path (e.g.
> `"propertiesPanel.tone"`) is used only for grouping inside `DynamicFormRenderer`.

---

## 4. Widget Registries

There are **two separate registries** — one for chat-area slots, one for the properties panel.

### 4.1 Slot Widget Registry (`SLOT_WIDGET_MAP` in `ToolChatBar.tsx`)

Handles `toolMode` and `inputActionBar` render paths. Rendering is performed inline in `ToolChatBar`
via the `renderSlotComponents` helper and the module-level `SLOT_WIDGET_MAP` constant. Each widget
receives:

```typescript
{ component: UIComponent, value: string, onChange: (value: string) => void }
```

| `widget` value        | Component           | Typical render path           |
| --------------------- | ------------------- | ----------------------------- |
| `"PillGroup"`         | `PillGroup`         | `inputSection.toolMode`       |
| `"ResponseActionBar"` | `ResponseActionBar` | `inputSection.inputActionBar` |

> **`ResponseActionBar` on `responseCard.responseActionBar`** is a documented exception.
> `ResponseBubble` uses `useRenderPath` to get those components but renders `ResponseActionBar`
> directly (not via `SLOT_WIDGET_MAP`), because its `onChange` must cross-link two values: setting
> the mode field and pre-filling the chat input with the response text. This cannot be expressed
> through the generic `renderSlotComponents` helper.

### 4.2 Properties Panel Registry (`FieldRenderer.tsx`)

Handles all `propertiesPanel.*` render paths via `DynamicFormRenderer` → `FieldRenderer`.

| `widget` value         | Component            | `type`          |
| ---------------------- | -------------------- | --------------- |
| `"TextField"`          | `TextField`          | `"text"`        |
| `"TextArea"`           | `TextareaField`      | `"text"`        |
| `"NumberField"`        | `NumberField`        | `"number"`      |
| `"SelectField"`        | `SelectField`        | `"select"`      |
| `"CheckboxGroupField"` | `CheckboxGroupField` | `"multiselect"` |

### 4.3 Chat Input Config (`ui.config.chat_input`)

The chat input is a **first-class config field**, not a `UIComponent`. It is always rendered by
`ToolChatBar` directly, never through `SLOT_WIDGET_MAP`.

```typescript
interface ChatInputConfig {
  id: string; // form state key (e.g. "chat_input")
  placeholder?: string; // placeholder text shown when the input is empty
  file_upload?: boolean; // enables file-attachment button (default: false)
  flag: string; // CLI flag (e.g. "--text")
  required: boolean; // must be non-empty to enable submit
}
```

**Absent / null** = no chat input → `ToolChatBar` falls back to normal free-text mode (no tool form
serialization, no CLI flag mapping).

---

## 5. Form State

All widget values are stored in Redux under `toolFormSlice`. Use the `useToolForm()` hook:

```typescript
const { values, setValue, uiComponents, groupLabelMap, chatInputConfig } = useToolForm();

// Read a value
const currentMode = values["mode"] as string;
const inputText = values[chatInputConfig?.id ?? ""] as string;

// Write a value
setValue("mode", "write");
setValue(chatInputConfig.id, "some text");
```

`values` is keyed by `UIComponent.id` **and** `chatInputConfig.id`.

**Tool change** — when the selected tool changes, `initToolForm` fires and resets all values
(including mode) to their initial state.

**Post-submit** — only the chat input is cleared; mode and panel fields are preserved. See "Submit
behavior" in §8.

---

## 6. How to Add a New Render Path

**Step 1 — Add the path string to the type system** (`toolForm.types.ts`):

```typescript
export type RenderPath =
  | "workspace.conversationArea.inputSection.toolMode"
  | "workspace.conversationArea.responseCard.responseActionBar"
  | "workspace.conversationArea.inputSection.inputActionBar"
  | `propertiesPanel.${string}`
  | "your.new.render.path" // ← add here
  | string;
```

**Step 2 — Subscribe to the path in the FE render location**:

```typescript
// In your component:
const components = useRenderPath("your.new.render.path", uiComponents);
// components is UIComponent[] sorted by slot_order
```

If the new path needs slot-style rendering (widgets from `SLOT_WIDGET_MAP`), add the widget to
`SLOT_WIDGET_MAP` in `ToolChatBar.tsx` and call `renderSlotComponents(components, values, setValue)`
inline in JSX.

**Step 3 — Tell the BE** the path string so they can register components against it.

---

## 7. How to Add a New Widget

### To an existing slot path (chat area)

**Step 1** — Build the React component. It must accept:

```typescript
interface MyWidgetProps {
  component: UIComponent;
  value: string;
  onChange: (value: string) => void;
}
```

**Step 2** — Add it to `SLOT_WIDGET_MAP` in `ToolChatBar.tsx`:

```typescript
const SLOT_WIDGET_MAP = {
  PillGroup,
  ResponseActionBar,
  MyWidget, // ← add here
} as const;
```

**Step 3** — Add `"MyWidget"` to the `WidgetType` union in `toolForm.types.ts`:

```typescript
export type WidgetType =
  | "PillGroup"
  | "ResponseActionBar"
  | "TextField"
  | "TextArea"
  | "NumberField"
  | "SelectField"
  | "CheckboxGroupField"
  | "MyWidget"; // ← add here
```

**Step 4** — Tell the BE the `widget` string so they can emit it in the spec.

### To the properties panel

**Step 1** — Build the React component following the existing `FieldProps` pattern.

**Step 2** — Add a `case` in `FieldRenderer.tsx` and a branch in `uiComponentToFieldConfig` in
`DynamicFormRenderer.tsx`.

**Step 3** — Add the `WidgetType` entry (same as above).

---

## 8. BE Tool Spec — How to Register a Tool

The BE registers a tool's UI by populating `ToolSpec.metadata.ui`:

```json
{
  "ui": {
    "config": {
      "chat_input": {
        "id": "chat_input",
        "placeholder": "What would you like to write?",
        "file_upload": false,
        "flag": "--text",
        "required": true
      },
      "group_label_map": {
        "generation": "Generation Settings",
        "tone": "Tone & Style"
      }
    },
    "components": [
      {
        "id": "mode",
        "type": "select",
        "widget": "PillGroup",
        "group": null,
        "flag_config": { "flag": "--mode", "required": true },
        "render_paths": ["workspace.conversationArea.inputSection.toolMode"],
        "slot_order": 0,
        "props": {
          "options": [
            { "value": "write", "label": "Write", "requiresInput": true },
            { "value": "rewrite", "label": "Rewrite", "requiresInput": false }
          ]
        }
      },
      {
        "id": "tone_of_voice",
        "type": "multiselect",
        "widget": "CheckboxGroupField",
        "group": "tone",
        "flag_config": { "flag": "--tone_of_voice", "required": false },
        "render_paths": ["propertiesPanel.tone"],
        "slot_order": 0,
        "props": {
          "label": "Tone of voice",
          "options": [
            { "value": "clear", "label": "Clear" },
            { "value": "bold", "label": "Bold" }
          ]
        }
      }
    ]
  }
}
```

### Key rules

- **`id`** must be unique within the tool. It is the key in form state and in CLI serialization.
- **`group: null`** for any widget that is NOT in the properties panel.
- **The mode pill (PillGroup)** is identified by its render path
  (`workspace.conversationArea.inputSection.toolMode`), not by a special flag. It serializes like
  any other component, through `flag_config.flag` (`--mode`). Only one per tool. The tool itself is
  invoked by the `@<toolKey>` token (see CLI serialization below), which is unrelated to the mode
  value.
- **`required: true`** blocks submit until the field has a value.
- **`slot_order`** controls ordering within a render path. Use `null` to append after numbered
  items.
- A single component can appear in **multiple** `render_paths` (e.g. `PillGroup` and
  `ResponseActionBar` sharing `id: "mode"` is intentional — same state, different UI surfaces).
- **`groupLabel`** on any component overrides `group_label_map` for that group's accordion header.
- **`chat_input: absent / null`** in `config` → tool has no custom chat input → free-text mode.

### CLI serialization

When the user submits, `serializeUIComponents(values, components, chatInputConfig, toolKey)`
converts form state into a CLI-style string sent to the agent:

```
@writer --mode=rewrite --tone_of_voice=clear,bold --text="Hello world"
```

A tool fires **only** when the message contains its canonical key prefixed with `@` (the
`@<toolKey>` token, e.g. `@writer`). There are no trigger-word aliases and no backend
auto-selection.

Order: the `@<toolKey>` token comes first; then each component's `--name=value` flag in component
order (so `--mode` leads only because the mode pill sits first); then the `chatInputConfig` flag
last. The backend parses by flag name, so flag order is for readability only. Flags marked
`required: false` are omitted when empty.

`--mode` is an **opaque pass-through** — the backend resolves it (explicit `--mode` → tool's
`default_mode`), and an unknown value silently falls back to the default rather than erroring. Send
the values straight from the mode component's `options[].value`.

**Flag naming convention:** always use `--snake_case` (e.g. `--tone_of_voice`, not
`--tone-of-voice`).

### Submit behavior

After a successful submit the form is partially reset:

| Field                   | Behavior                                                             |
| ----------------------- | -------------------------------------------------------------------- |
| `chatInputConfig` value | **Cleared** — the textarea is wiped so the next message starts blank |
| Mode pill (`--mode`)    | **Preserved** — users rarely change mode between messages            |
| Properties panel fields | **Preserved** — same reason                                          |

This policy is implemented in `createPostSubmitValues()` in `uiComponentSerializer.ts`.

### Mode display

When a tool form is active, `ToolChatBar` shows an inline `@<toolKey>` prefix inside the textarea
(e.g. `@writer`) — the actual trigger token that gets sent. The selected mode is surfaced separately
by the mode `PillGroup` and serialized as `--mode=<value>`.
