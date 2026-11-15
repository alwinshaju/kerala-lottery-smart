import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractTickets,
  ticketOutcome,
  validDate,
  validatePayload,
  csvCell,
} from "../src/domain";
import type { Draw } from "../../lib/types";
const draw: Draw = {
  id: "KR-1",
  code: "KR",
  name: "Karunya",
  drawNo: "KR-1",
  date: "2026-11-14",
  verified: true,
  prizes: {
    first: [{ ticket: "KA 123456" }],
    second: [],
    third: [],
    consolation: [],
    fourth: ["3456"],
    fifth: [],
    sixth: [],
    seventh: [],
    eighth: [],
    ninth: [],
  },
};
test("OCR and barcode candidates preserve leading zeros and require review", () => {
  assert.deepEqual(extractTickets("Ticket PA 0 0 1 6 9 2\nPA 001692"), [
    "PA 001692",
  ]);
  assert.deepEqual(extractTickets("https://example.com?t=KA%20123456"), [
    "KA 123456",
  ]);
  assert.deepEqual(extractTickets("1234567890123"), []);
  assert.deepEqual(extractTickets("KA O12345"), []);
});
test("full series required; provisional and sample never reported as confirmed", () => {
  assert.equal(ticketOutcome(draw, "123456").state, "incomplete");
  assert.equal(ticketOutcome(draw, "KA 123456").state, "won");
  assert.equal(
    ticketOutcome(draw, "KB 123456").wins.some((w) => w.tier === "first"),
    false,
  );
  assert.equal(
    ticketOutcome({ ...draw, verified: false }, "KA 123456").state,
    "provisional",
  );
  assert.equal(ticketOutcome(draw, "KA 123456", true).state, "sample");
  assert.equal(ticketOutcome(undefined, "KA 123456").state, "pending");
});
test("reject malformed backend responses and impossible dates", () => {
  assert.throws(() =>
    validatePayload({ draws: [{}], source: "supabase", updatedAt: "now" }),
  );
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
});
test("exported notes are safe CSV cells", () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '\"\'=HYPERLINK(\"\"x\"\")\"');
});
