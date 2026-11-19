import { test } from "node:test";
import assert from "node:assert/strict";
import { ticketWinAlerts } from "../src/ticketWins";
import type { Draw } from "../../lib/types";

const empty = { first: [], second: [], third: [], consolation: [], fourth: [], fifth: [], sixth: [], seventh: [], eighth: [], ninth: [] };
const draw = (verified: boolean, sourceStatus = "matched"): Draw =>
  ({
    id: "DL-2026-11-18", code: "DL", name: "Dhanalekshmi", drawNo: "DL-78", date: "2026-11-18",
    verified, sourceStatus, prizes: { ...empty, first: [{ ticket: "DO 359523" }] },
  }) as unknown as Draw;
const saved = [{ id: "t1", ticket: "DO 359523", date: "2026-11-18", code: "DL" }];

test("alerts once for a winning ticket on a verified draw", () => {
  const a = ticketWinAlerts(saved, [draw(true)], new Set());
  assert.equal(a.length, 1);
  assert.match(a[0].body, /1st prize/);
  assert.equal(ticketWinAlerts(saved, [draw(true)], new Set([a[0].key])).length, 0);
});
test("no alert for provisional, conflicting, losing or unmatched tickets", () => {
  assert.equal(ticketWinAlerts(saved, [draw(false)], new Set()).length, 0);
  assert.equal(ticketWinAlerts(saved, [draw(true, "conflict")], new Set()).length, 0);
  assert.equal(ticketWinAlerts([{ ...saved[0], ticket: "DO 111111" }], [draw(true)], new Set()).length, 0);
  assert.equal(ticketWinAlerts([{ ...saved[0], date: "2026-11-19" }], [draw(true)], new Set()).length, 0);
});
