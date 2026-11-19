import test from "node:test";
import assert from "node:assert/strict";
import { applyUploads, parseUploads } from "../src/results/sources";
import type { Draw, ResultsPayload } from "../../lib/types";

const tier = (n: number, f: (i: number) => string) =>
  Array.from({ length: n }, (_, i) => f(i));
const four = (n: number, base: number) => tier(n, (i) => String(base + i * 7).padStart(4, "0"));
const draw = (first: string): Draw => ({
  id: "DL-2026-11-18",
  code: "DL",
  name: "Dhanalekshmi",
  drawNo: "DL-78",
  date: "2026-11-18",
  verified: false,
  prizes: {
    first: [{ ticket: first, district: "KOTTAYAM" }],
    second: [{ ticket: "DX 475747", district: "CHITTUR" }],
    third: [{ ticket: "DU 475774", district: "CHITTUR" }],
    consolation: tier(11, (i) => `D${"NPRSTUVWXYZ"[i]} 359523`).map((t) => ({ ticket: t })),
    fourth: four(19, 1000),
    fifth: four(6, 2000),
    sixth: four(25, 3000),
    seventh: four(76, 4000),
    eighth: four(96, 5000),
    ninth: four(138, 6000),
  },
});
const payload = (d: Draw): ResultsPayload => ({ draws: [d], source: "public", updatedAt: "x" });

test("official PDF that agrees is marked matched", () => {
  const out = applyUploads(payload(draw("DO 359523")), [draw("DO 359523")]);
  assert.equal(out.draws[0].officialCheck, "matched");
  assert.equal(out.draws[0].source, "official_pdf");
});
test("official PDF that differs wins and is marked corrected", () => {
  const out = applyUploads(payload(draw("DO 111111")), [draw("DO 359523")]);
  assert.equal(out.draws[0].officialCheck, "corrected");
  assert.equal(out.draws[0].prizes.first[0].ticket, "DO 359523");
});
test("incomplete uploads are ignored", () => {
  const bad = draw("DO 359523");
  bad.prizes.eighth = [];
  assert.equal(parseUploads(JSON.stringify({ draws: [bad] })).length, 0);
});
