import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchArchivePage, type ArchiveSource } from "./archive";
import { saveResultsCache } from "./storage";
import type { ResultsPayload } from "../../../lib/types";
import { historySeed } from "./seed";
const KEY = "lottery.history-progress.v1";
interface Cursor {
  offset: number;
  total: number;
  done: boolean;
}
export interface HistoryProgress {
  api: Cursor;
  feed: Cursor;
  received: number;
  accepted: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}
const fresh = (): HistoryProgress => ({
  api: { offset: 0, total: 0, done: false },
  feed: { offset: 0, total: 0, done: false },
  received: 0,
  accepted: 0,
  startedAt: new Date().toISOString(),
});
export async function readHistoryProgress(): Promise<HistoryProgress> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw)
    return {
      ...historySeed.progress,
      api: { ...historySeed.progress.api },
      feed: { ...historySeed.progress.feed },
    };
  const p = JSON.parse(raw) as HistoryProgress;
  if (
    !p.api ||
    !p.feed ||
    !Number.isSafeInteger(p.api.offset) ||
    !Number.isSafeInteger(p.feed.offset)
  )
    return fresh();
  return p;
}
let running: Promise<{
  progress: HistoryProgress;
  payload?: ResultsPayload;
}> | null = null;
export function syncHistoryBatch() {
  if (running) return running;
  running = (async () => {
    let progress = await readHistoryProgress(),
      payload: ResultsPayload | undefined;
    if (
      progress.completedAt &&
      Date.now() - Date.parse(progress.completedAt) > 7 * 86400000
    )
      progress = fresh();
    for (const source of ["api", "feed"] as ArchiveSource[]) {
      if (progress[source].done) continue;
      try {
        const page = await fetchArchivePage(source, progress[source].offset);
        payload = await saveResultsCache({
          draws: page.draws,
          source: "public",
          updatedAt: new Date().toISOString(),
        });
        progress = {
          ...progress,
          [source]: {
            offset: page.nextOffset,
            total: page.total,
            done: page.done,
          },
          received: progress.received + page.received,
          accepted: progress.accepted + page.draws.length,
          error: undefined,
        };
        await AsyncStorage.setItem(KEY, JSON.stringify(progress));
      } catch (e) {
        progress = {
          ...progress,
          error:
            e instanceof Error
              ? e.message
              : "History source temporarily unavailable.",
        };
        await AsyncStorage.setItem(KEY, JSON.stringify(progress));
        break;
      }
    }
    if (progress.api.done && progress.feed.done) {
      progress.completedAt ??= new Date().toISOString();
      await AsyncStorage.setItem(KEY, JSON.stringify(progress));
    }
    return { progress, payload };
  })().finally(() => {
    running = null;
  });
  return running;
}
