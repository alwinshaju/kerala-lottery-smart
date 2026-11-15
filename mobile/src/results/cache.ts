import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ResultsPayload } from "../../../lib/types";
import { validatePayload } from "../domain";
import { mergeResults } from "./sources";
import { packDraws } from "./archive";
import { historySeed } from "./seed";
export const RESULTS_CACHE_KEY = "lottery.public-results.v3";
interface Generation {
  id: string;
  count: number;
}
interface Manifest {
  generation: Generation;
  previous?: Generation;
  updatedAt: string;
  warnings?: string[];
}
const chunkKey = (g: Generation, i: number) =>
  `${RESULTS_CACHE_KEY}.${g.id}.${i}`;
export async function readResultsCache(): Promise<ResultsPayload | null> {
  const raw = await AsyncStorage.getItem(RESULTS_CACHE_KEY);
  if (!raw) {
    const old = await AsyncStorage.getItem("lottery.public-results.v2");
    return mergeResults(
      old ? validatePayload(JSON.parse(old)) : null,
      validatePayload(historySeed.payload),
    );
  }
  const manifest = JSON.parse(raw) as Manifest;
  if (
    !manifest.generation ||
    !Number.isSafeInteger(manifest.generation.count) ||
    manifest.generation.count < 0
  )
    throw new Error("Invalid result cache.");
  const chunks = await AsyncStorage.multiGet(
    Array.from({ length: manifest.generation.count }, (_, i) =>
      chunkKey(manifest.generation, i),
    ),
  );
  const draws = chunks.flatMap(([, body]) => {
    if (body === null) throw new Error("Incomplete result cache.");
    return JSON.parse(body);
  });
  return validatePayload({
    draws,
    source: "public",
    updatedAt: manifest.updatedAt,
    warnings: manifest.warnings,
  });
}
let queue: Promise<unknown> = Promise.resolve();
export function saveResultsCache(
  next: ResultsPayload,
): Promise<ResultsPayload> {
  const operation = queue
    .catch(() => {})
    .then(async () => {
      let old: ResultsPayload | null = null;
      try {
        old = await readResultsCache();
      } catch {}
      const merged = mergeResults(old, next),
        chunks = packDraws(merged.draws);
      const previousRaw = await AsyncStorage.getItem(RESULTS_CACHE_KEY);
      const previous = previousRaw
        ? (JSON.parse(previousRaw) as Manifest)
        : null;
      const generation = {
        id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
        count: chunks.length,
      };
      await AsyncStorage.multiSet(
        chunks.map((body, i) => [chunkKey(generation, i), body]),
      );
      await AsyncStorage.setItem(
        RESULTS_CACHE_KEY,
        JSON.stringify({
          generation,
          previous: previous?.generation,
          updatedAt: merged.updatedAt,
          warnings: merged.warnings,
        } satisfies Manifest),
      );
      if (previous?.previous)
        await AsyncStorage.multiRemove(
          Array.from({ length: previous.previous.count }, (_, i) =>
            chunkKey(previous.previous!, i),
          ),
        ).catch(() => {});
      return merged;
    });
  queue = operation;
  return operation;
}
