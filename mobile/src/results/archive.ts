import type { Draw } from "../../../lib/types";
import {
  parseApiHistory,
  parseFeed,
  RESULT_SOURCES,
  type SourceFetch,
} from "./sources";
export type ArchiveSource = "api" | "feed";
export interface ArchivePage {
  source: ArchiveSource;
  offset: number;
  nextOffset: number;
  total: number;
  received: number;
  draws: Draw[];
  done: boolean;
}
export async function fetchArchivePage(
  source: ArchiveSource,
  offset: number,
  fetcher: SourceFetch = fetch,
  now = new Date(),
): Promise<ArchivePage> {
  if (!Number.isInteger(offset) || offset < 0)
    throw new Error("Invalid archive cursor.");
  const size = source === "api" ? 100 : 40;
  const url =
    source === "api"
      ? `https://indialotteryapi.com/wp-json/klr/v1/history?limit=${size}&offset=${offset}`
      : `${RESULT_SOURCES.feed.endpoint}&start-index=${offset + 1}`;
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        `${RESULT_SOURCES[source].name}: HTTP ${response.status}`,
      );
    const text = await response.text();
    if (text.length > 6000000) throw new Error("Archive page is too large.");
    const value = JSON.parse(text);
    const entries =
      source === "api" ? value?.items : (value?.feed?.entry ?? []);
    if (!Array.isArray(entries)) throw new Error("Invalid archive response.");
    const advertised = Number(
      source === "api" ? value.total : value?.feed?.openSearch$totalResults?.$t,
    );
    if (
      !Number.isSafeInteger(advertised) ||
      advertised < 0 ||
      advertised > 100000
    )
      throw new Error("Invalid archive total.");
    const draws =
      source === "api" ? parseApiHistory(value, now) : parseFeed(value, now);
    const received = entries.length,
      nextOffset = offset + received;
    return {
      source,
      offset,
      nextOffset,
      total: advertised,
      received,
      draws,
      done: received === 0 || nextOffset >= advertised,
    };
  } finally {
    clearTimeout(timeout);
  }
}
/** Keep each AsyncStorage value well below Android's per-row cursor limit. */
export function packDraws(draws: Draw[], maxCharacters = 150000): string[] {
  const chunks: string[] = [];
  let rows: string[] = [],
    length = 2;
  for (const draw of draws) {
    const row = JSON.stringify(draw);
    if (row.length + 2 > maxCharacters)
      throw new Error("A result is too large to cache safely.");
    if (rows.length && length + row.length + 1 > maxCharacters) {
      chunks.push("[" + rows.join(",") + "]");
      rows = [];
      length = 2;
    }
    rows.push(row);
    length += row.length + 1;
  }
  if (rows.length) chunks.push("[" + rows.join(",") + "]");
  return chunks;
}
