import test from "node:test";
import assert from "node:assert/strict";
import {
  budgetState,
  daysLeftInMonth,
  overspendWarning,
  spentOn,
} from "../src/budget";

const rows = [
  { date: "2026-11-02", spent: 100 },
  { date: "2026-11-18", spent: 150 },
  { date: "2026-10-30", spent: 999 },
];
test("spending is summed per day and per month only", () => {
  assert.equal(spentOn(rows, "2026-11"), 250);
  assert.equal(spentOn(rows, "2026-11-18"), 150);
  assert.equal(spentOn(rows, "2026-12"), 0);
});
test("budget state warns at 80% and stops at 100%", () => {
  assert.equal(budgetState(500, 0), "none");
  assert.equal(budgetState(79, 100), "ok");
  assert.equal(budgetState(80, 100), "near");
  assert.equal(budgetState(100, 100), "reached");
  assert.equal(budgetState(150, 100), "reached");
});
test("a new spend is checked against the daily and monthly limits", () => {
  assert.equal(overspendWarning(rows, "2026-11-18", 50, 0, 0), null);
  assert.equal(overspendWarning(rows, "2026-11-18", 50, 300, 200), null);
  assert.match(overspendWarning(rows, "2026-11-18", 60, 300, 200) ?? "", /daily limit/);
  assert.match(overspendWarning(rows, "2026-11-18", 60, 300, 0) ?? "", /monthly budget/);
  assert.match(
    overspendWarning(rows, "2026-11-18", 100, 300, 200) ?? "",
    /daily limit and monthly budget/,
  );
});
test("days left in the month include today", () => {
  assert.equal(daysLeftInMonth("2026-11-18"), 13);
  assert.equal(daysLeftInMonth("2026-11-30"), 1);
  assert.equal(daysLeftInMonth("2028-02-01"), 29);
});
