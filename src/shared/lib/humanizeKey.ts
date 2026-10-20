/**
 * A machine key read out as words: `crop-size` becomes `Crop size`,
 * `wait_event` becomes `Wait event`.
 *
 * For the places an id has to stand in for a label nobody supplied. The exact
 * key always stays reachable next to it - on a `title`, or in the raw command -
 * so nothing is lost by reading it out.
 */
export function humanizeKey(key: string): string {
  const spaced = key.replaceAll("_", " ").replaceAll("-", " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
