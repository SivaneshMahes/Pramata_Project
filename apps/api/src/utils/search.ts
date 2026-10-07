/**
 * Builds edge n-gram tokens so search-as-you-type ("hon" → "Honda City") can be
 * served from a multikey index instead of an unindexed regex scan.
 */
const MIN_TOKEN = 2;
const MAX_TOKEN = 15;

export function normaliseSearchText(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= MIN_TOKEN);
}

export function buildSearchTokens(...fields: string[]): string[] {
  const tokens = new Set<string>();
  for (const word of normaliseSearchText(fields.join(' '))) {
    const limit = Math.min(word.length, MAX_TOKEN);
    for (let length = MIN_TOKEN; length <= limit; length++) tokens.add(word.slice(0, length));
  }
  return [...tokens];
}

/** Query terms are truncated to the longest indexed prefix. */
export function toQueryTokens(search: string): string[] {
  return [...new Set(normaliseSearchText(search).map((word) => word.slice(0, MAX_TOKEN)))];
}

export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
