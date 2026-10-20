export type StructuredSoul = Record<string, any>;

function buildFromSchema(schema: any): Record<string, any> {
  function resolve(ref: string) {
    return ref
      .replace(/^#\//, "")
      .split("/")
      .reduce<any>((n, seg) => n[seg], schema);
  }

  function construct(node: any): any {
    if (node.$ref) node = resolve(node.$ref);

    if (node.type === "object" && node.properties) {
      return Object.fromEntries(
        Object.entries<any>(node.properties).map(([k, v]) => [k, construct(v)])
      );
    }
    if (node.default !== undefined) return node.default;
    if (node.type === "array") return [];
    if (node.type === "number" || node.type === "integer") return 0;
    if (node.type === "boolean") return false;
    return null;
  }

  return construct(schema);
}

function deepMerge(
  base: Record<string, any>,
  patch: Record<string, any>
): Record<string, any> {
  const out: Record<string, any> = Array.isArray(base)
    ? [...base]
    : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(out[k] || {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Merge a (possibly partial) soul onto a template built from the soul-protocol
 * schema, so every category/field the schema defines is present for display.
 */
export function structureSoul(partialSoul: any, schema: any): StructuredSoul {
  const template = buildFromSchema(schema);
  const full = deepMerge(template, partialSoul);
  if (partialSoul.basic_profile?.name) {
    full.basic_profile.name = partialSoul.basic_profile.name;
  }
  return full;
}
