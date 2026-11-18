import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchArchivePage, type ArchiveSource } from "../src/results/archive";
import { mergeResults, fetchPublicResults } from "../src/results/sources";
import type { ResultsPayload } from "../../lib/types";

// Build a factual, dated offline snapshot. Provider prediction/guess lists are never imported.
async function main() {
  let payload: ResultsPayload = {
    draws: [],
    source: "public",
    updatedAt: new Date().toISOString(),
  };
  const progress = {
    api: { offset: 0, total: 0, done: false },
    feed: { offset: 0, total: 0, done: false },
    received: 0,
    accepted: 0,
    startedAt: new Date().toISOString(),
    completedAt: undefined as string | undefined,
    error: undefined as string | undefined,
  };
  for (const source of ["api", "feed"] as ArchiveSource[]) {
    while (!progress[source].done) {
      try {
        const page = await fetchArchivePage(source, progress[source].offset);
        payload = mergeResults(payload, {
          draws: page.draws,
          source: "public",
          updatedAt: new Date().toISOString(),
        });
        progress[source] = {
          offset: page.nextOffset,
          total: page.total,
          done: page.done,
        };
        progress.received += page.received;
        progress.accepted += page.draws.length;
        console.log(
          JSON.stringify({
            source,
            offset: page.nextOffset,
            total: page.total,
            unique: payload.draws.length,
            usable: payload.draws.filter((d) => d.sourceStatus !== "conflict")
              .length,
          }),
        );
        if (!page.done)
          await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (e) {
        progress.error = String(e);
        console.error(progress.error);
        break;
      }
    }
  }
  try {
    payload = mergeResults(payload, await fetchPublicResults());
  } catch {}
  if (progress.api.done && progress.feed.done)
    progress.completedAt = new Date().toISOString();
  const usable = payload.draws.filter(
    (d) => d.sourceStatus !== "conflict",
  ).length;
  if (usable < 20)
    throw new Error("Not enough validated history to publish a seed.");
  const directory = resolve("assets") + "/";
  await mkdir(directory, { recursive: true });
  await writeFile(
    directory + "history-seed.json",
    JSON.stringify({ payload, progress }),
  );
  console.log(
    JSON.stringify({
      complete: !!progress.completedAt,
      unique: payload.draws.length,
      usable,
      received: progress.received,
      accepted: progress.accepted,
      from: payload.draws.at(-1)?.date,
      to: payload.draws[0]?.date,
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
