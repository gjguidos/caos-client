export function slugifyString(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-");
}
