export function isEnvelope(x: any): boolean {
  return (
    !!x &&
    typeof x === "object" &&
    ("renderables" in x || "raw" in x || "success" in x || "answer" in x)
  );
}

export function pickPayloadFromWS(json: any): any {
  const r = json?.response ?? json;
  if (isEnvelope(r?.message)) return r.message;
  if (isEnvelope(r?.result)) return r.result;
  if (isEnvelope(r?.data)) return r.data;
  if (isEnvelope(r)) return r;
  return r?.message ?? r?.result ?? r?.data ?? r;
}

/**
 * The line a renderable contributes to the flattened reply, or null when it
 * carries nothing renderable.
 *
 * Two wire shapes are accepted per kind: the payload under `value` and the
 * older per-kind field (`text`, `markdown`, `href`, `src`). An `image`'s
 * `value.url` is always directly renderable - an HTTP URL or a `data:` URI,
 * never raw base64 - so it goes into the text stream and `MessageBubble` picks
 * it up as an image line.
 */
function renderableLine(r: any): string | null {
  if (!r || typeof r !== "object") return null;
  const value = r.value;

  switch (r.kind) {
    case "image": {
      const url = typeof value === "object" ? value?.url : value;
      if (typeof url === "string") return url;
      return typeof r.src === "string" ? r.src : null;
    }
    case "text":
      if (typeof value === "string") return value;
      return typeof r.text === "string" ? r.text : null;
    case "markdown":
      if (typeof value === "string") return value;
      return typeof r.markdown === "string" ? r.markdown : null;
    case "link":
      if (typeof value === "string") return value;
      return typeof r.href === "string" ? r.href : null;
    default:
      return null;
  }
}

/** The value of the payload's first `json` renderable, if it has one. */
function jsonRenderableValue(payload: any): any {
  return Array.isArray(payload?.renderables)
    ? payload.renderables.find((r: any) => r?.kind === "json")?.value
    : undefined;
}

export function extractReplyText(payload: any): string | null {
  if (payload == null) return null;

  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    "status" in payload &&
    "session_id" in payload
  ) {
    return extractReplyText(payload.message);
  }
  if (typeof payload === "string") return payload;

  if (
    typeof payload === "object" &&
    ("renderables" in payload || "message" in payload || "raw" in payload)
  ) {
    if (typeof payload.message === "string" && payload.message.trim())
      return payload.message;

    if (Array.isArray(payload.renderables)) {
      const lines: string[] = [];
      for (const r of payload.renderables) {
        const line = renderableLine(r);
        if (line !== null) lines.push(line);
      }
      if (lines.length) return lines.join("\n");
      for (const r of payload.renderables) {
        if (r?.kind === "json" && r?.value && typeof r.value === "object") {
          const inner = r.value?.result ?? r.value?.data ?? r.value;
          const rec = extractReplyText(inner);
          if (rec) return rec;
        }
      }
    }

    if (payload.raw) {
      const rec = extractReplyText(
        payload.raw?.result ?? payload.raw?.data ?? payload.raw
      );
      if (rec) return rec;
    }
  }

  if (
    typeof payload === "object" &&
    "kind" in payload &&
    payload.kind === "combined" &&
    payload.content
  ) {
    return extractReplyText(payload.content);
  }

  if (typeof payload === "object" && Array.isArray(payload.images)) {
    const urls: string[] = [];
    for (const it of payload.images) {
      if (typeof it === "string") urls.push(it);
      else if (it && typeof it === "object") {
        const u = (it as any).url;
        if (typeof u === "string") urls.push(u);
        else if (Array.isArray(u)) {
          for (const uu of u) if (typeof uu === "string") urls.push(uu);
        }
      }
    }
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    const parts = text ? [text, ...urls] : urls;
    if (parts.length) return parts.join("\n");
  }

  if (typeof payload === "object") {
    for (const k of [
      "formatted_local",
      "formatted",
      "answer",
      "text",
      "content",
      "summary",
      "message",
    ]) {
      if (typeof (payload as any)[k] === "string" && (payload as any)[k].trim())
        return (payload as any)[k];
    }
    // A tool result nests everything non-`answer` under `data`, so a value the
    // chain above names (e.g. `summary`) is one level down.
    if ((payload as any).result || (payload as any).data) {
      const rec = extractReplyText(
        (payload as any).result ?? (payload as any).data
      );
      if (rec) return rec;
    }
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }

  try {
    return String(payload);
  } catch {
    return null;
  }
}

/**
 * The widget a tool result asks for, if any.
 *
 * Takes the payload `pickPayloadFromWS` already resolved, so the envelope shape
 * stays that function's business alone. A tool's structured payload sits under
 * `result.data`; the older payload-level `data` and the `json` renderable are
 * probed too, so a backend that emits either still resolves.
 */
export function extractWidgetData(
  payload: any
): { type: string; data: unknown } | null {
  for (const data of [
    payload?.result?.data,
    payload?.data,
    jsonRenderableValue(payload),
  ]) {
    if (data && typeof data.widget_type === "string") {
      return { type: data.widget_type, data };
    }
  }

  return null;
}
