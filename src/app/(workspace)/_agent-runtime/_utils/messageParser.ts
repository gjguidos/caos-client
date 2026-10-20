
import type {
  DeliveredResource,
  DeliveryDescriptor,
} from "@/app/(workspace)/_types/chat.types";

export function isEnvelope(x: any): boolean {
  return (
    !!x &&
    typeof x === "object" &&
    ("renderables" in x || "raw" in x || "success" in x)
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
        if (!r || typeof r !== "object") continue;
        if (r.kind === "image" && typeof r.src === "string") lines.push(r.src);
        else if (r.kind === "text" && typeof r.text === "string")
          lines.push(r.text);
        else if (r.kind === "markdown" && typeof r.markdown === "string")
          lines.push(r.markdown);
        else if (r.kind === "link" && typeof r.href === "string")
          lines.push(r.href);
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

export function extractWidgetData(
  raw: any
): { type: string; data: unknown } | null {
  const data = raw?.response?.message?.data;

  if (data && typeof data.widget_type === "string") {
    return {
      type: data.widget_type,
      data: data,
    };
  }

  return null;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isDeliveryDescriptor(
  value: unknown
): value is DeliveryDescriptor {
  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    value.url.length > 0
  );
}

export function extractDeliveries(
  value: unknown
): DeliveredResource[] {
  const deliveries: DeliveredResource[] = [];
  const seenUrls = new Set<string>();

  function visit(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      return;
    }

    if (!isRecord(node)) {
      return;
    }

    if (isDeliveryDescriptor(node.delivery)) {
      const delivery = node.delivery;

      // The crawler currently exposes the same references through
      // report_refs, manifest.artifacts and artifacts. Render once.
      if (!seenUrls.has(delivery.url)) {
        seenUrls.add(delivery.url);

        deliveries.push({
          ...(typeof node.id === "string"
            ? { id: node.id }
            : {}),
          ...(typeof node.name === "string"
            ? { name: node.name }
            : {}),
          ...(typeof node.label === "string"
            ? { label: node.label }
            : {}),
          delivery,
        });
      }
    }

    for (const [key, child] of Object.entries(node)) {
      if (key === "delivery") {
        continue;
      }

      visit(child);
    }
  }

  visit(value);

  return deliveries;
}