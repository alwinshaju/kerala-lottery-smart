import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReminder } from "../src/dailyReminder";
import type { Draw } from "../../lib/types";

const empty = { first: [], second: [], third: [], consolation: [], fourth: [], fifth: [], sixth: [], seventh: [], eighth: [], ninth: [] };
const mk = (i: number, ending: string): Draw =>
  ({ id: "DL" + i, code: "DL", name: "Dhanalekshmi", drawNo: "DL-" + i, date: `2026-10-${String(10 + i).padStart(2, "0")}`,
    verified: true, sourceStatus: "matched", prizes: { ...empty, fifth: [ending] } }) as unknown as Draw;

test("reminder fires at 9 AM India time and names that day's lottery", () => {
  // 2026-11-18 is a Wednesday (Dhanalekshmi). 08:00 IST = 02:30 UTC.
  const r = buildReminder([], new Date("2026-11-18T02:30:00Z"));
  assert.equal(r.fireAt.toISOString(), "2026-11-18T03:30:00.000Z");
  assert.equal(r.code, "DL");
  assert.match(r.title, /Dhanalekshmi/);
});
test("after 9 AM the next reminder is for tomorrow", () => {
  const r = buildReminder([], new Date("2026-11-18T05:00:00Z")); // 10:30 IST
  assert.equal(r.fireAt.toISOString(), "2026-11-19T03:30:00.000Z");
  assert.equal(r.code, "KN");
});
test("hot ending needs enough history and is framed as a statistic", () => {
  assert.doesNotMatch(buildReminder([mk(1, "1234")], new Date("2026-11-18T02:30:00Z")).body, /Hot pick/);
  const many = [1, 2, 3, 4, 5, 6].map((i) => mk(i, i < 5 ? "4821" : "1111"));
  const r = buildReminder(many, new Date("2026-11-18T02:30:00Z"));
  assert.match(r.body, /Hot pick ending 4821, seen in 4 of 6/);
  assert.match(r.body, /equal odds/);
});
