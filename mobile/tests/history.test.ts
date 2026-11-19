import { test } from "node:test";
import assert from "node:assert/strict";
import row from "./fixtures/public-draw.json";
import { parseApiDraw, mergeResults } from "../src/results/sources";
import { fetchArchivePage, packDraws } from "../src/results/archive";
import { summarizeHistory, generateHistoryIdeas } from "../src/historyIdeas";
import { matches } from "../../lib/generator";
import type { Draw, ResultsPayload } from "../../lib/types";
const base = parseApiDraw(row, new Date("2026-11-16T06:00Z"))!;
const payload = (draws: Draw[]): ResultsPayload => ({
  draws,
  source: "public",
  updatedAt: "2026-11-16T06:00:00Z",
});
function draws(count: number): Draw[] {
  return Array.from({ length: count }, (_, i) => ({
    ...base,
    id: "test-" + i,
    date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
    sourceRecords: undefined,
  }));
}
test("history retention has no 180-draw cap and serializes into bounded cache rows", () => {
  const all = draws(240);
  const result = mergeResults(
    payload(all.slice(0, 200)),
    payload(all.slice(180)),
  );
  assert.equal(result.draws.length, 240);
  const chunks = packDraws(result.draws, 15000);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= 15000));
  assert.equal(chunks.flatMap((c) => JSON.parse(c)).length, 240);
});
test("history counts each ending once per draw; conflicts and duplicate IDs do not inflate it", () => {
  const data = draws(25);
  data.push({ ...data[0] });
  data.push({ ...data[1], id: "conflict", sourceStatus: "conflict" });
  const summary = summarizeHistory(data);
  assert.equal(summary.drawCount, 25);
  assert.equal(
    summary.endings.find(
      (x) => x.ending === base.prizes.first[0].ticket.slice(-4),
    )?.drawCount,
    25,
  );
});
test("history ideas use the whole dataset and obey parity/sum filters without claiming probabilities", () => {
  const summary = summarizeHistory(draws(230));
  const options = {
    sumMin: 25,
    sumMax: 30,
    balances: ["3:3"] as "3:3"[],
    requireRepeat: false,
    count: 3,
  };
  let seed = 12345;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const ideas = generateHistoryIdeas(summary, options, random);
  assert.equal(ideas.length, 3);
  for (const idea of ideas) {
    assert.equal(idea.datasetDraws, 230);
    assert.ok(matches(idea.number, options));
    assert.ok(summary.endings.some((e) => e.ending === idea.ending));
  }
  assert.throws(() =>
    generateHistoryIdeas(summarizeHistory(draws(19)), options),
  );
});
test("source evidence survives separate archive pages and only genuine agreement clears a conflict", () => {
  const api = structuredClone(base);
  const feed: Draw = {
    ...structuredClone(base),
    sources: [
      { name: "KeralaLotteries.net", url: "https://www.keralalotteries.net/" },
    ],
    sourceRecords: undefined,
  };
  feed.prizes.ninth[0] = "0000";
  feed.sourceRecords = {
    feed: {
      drawNo: feed.drawNo,
      prizes: feed.prizes,
      amounts: feed.amounts,
      url: "https://www.keralalotteries.net/",
      fetchedAt: "2026-11-16T06:00Z",
    },
  };
  const conflicted = mergeResults(payload([api]), payload([feed]));
  assert.equal(conflicted.draws[0].sourceStatus, "conflict");
  const still = mergeResults(conflicted, payload([feed]));
  assert.equal(still.draws[0].sourceStatus, "conflict");
  const corrected = structuredClone(api);
  corrected.prizes = structuredClone(feed.prizes);
  corrected.sourceRecords!.api!.prizes = corrected.prizes;
  assert.equal(
    mergeResults(still, payload([corrected])).draws[0].sourceStatus,
    "matched",
  );
});
test("archive requests follow provider pagination and preserve failed cursors", async () => {
  const urls: string[] = [];
  const result = await fetchArchivePage(
    "api",
    100,
    async (url) => {
      urls.push(url);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ total: 426, items: [row] }),
      };
    },
    new Date("2026-11-16T06:00Z"),
  );
  assert.ok(urls[0].includes("offset=100"));
  assert.equal(result.nextOffset, 101);
  assert.equal(result.done, false);
  assert.equal(result.draws.length, 1);
  await assert.rejects(() =>
    fetchArchivePage("api", 100, async () => ({
      ok: false,
      status: 503,
      text: async () => "",
    })),
  );
  assert.equal(result.offset, 100);
});

test("amount-only disagreement keeps the result usable and drops only the disputed amount", () => {
  const api = structuredClone(base);
  const feed: Draw = { ...structuredClone(base), sourceRecords: undefined };
  feed.amounts = { ...feed.amounts, third: 123 };
  feed.sourceRecords = {
    feed: {
      drawNo: feed.drawNo,
      prizes: feed.prizes,
      amounts: feed.amounts,
      url: "https://www.keralalotteries.net/",
      fetchedAt: "2026-11-16T06:00Z",
    },
  };
  const result = mergeResults(payload([api]), payload([feed])).draws[0];
  assert.equal(result.sourceStatus, "matched");
  assert.equal(result.numbersAgree, true);
  assert.equal(result.amounts?.third, undefined);
  assert.equal(result.amounts?.first, base.amounts?.first);
  assert.equal(summarizeHistory([result]).drawCount, 1);
});
