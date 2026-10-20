export function sanitizeCollectionName(input: string): string {
  // Replace all invalid characters with underscore
  let name = input.trim().replace(/[^a-zA-Z0-9._-]/g, "_");

  // Collapse multiple underscores
  name = name.replace(/_+/g, "_");

  // Trim to 512 chars max
  name = name.slice(0, 512);

  // Ensure it starts and ends with [a-zA-Z0-9]
  name = name.replace(/^[_\.\-]+/, ""); // remove invalid leading chars
  name = name.replace(/[_\.\-]+$/, ""); // remove invalid trailing chars

  // Ensure at least 3 characters
  if (name.length < 3) name = name.padEnd(3, "_");

  return name;
}
