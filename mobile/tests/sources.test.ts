import { test } from "node:test";
import assert from "node:assert/strict";
import row from "./fixtures/public-draw.json";
import {
  parseApiDraw,
  parseApiHistory,
  parseFeed,
  parseRupees,
  parseOfficialCatalog,
  combineSources,
  mergeResults,
  sameNumbers,
} from "../src/results/sources";
import { ticketOutcome } from "../src/domain";
const NOW = new Date("2026-11-16T06:00:00Z");
function feed() {
  const order = [
    "1st",
    "consolation",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
  ] as const;
  const prizes = row.prizes as unknown as Record<string, string[]>;
  const amounts = row.prizes.amounts as Record<string, string>;
  return {
    feed: {
      entry: [
        {
          title: { $t: "Kerala Lottery Result 15-11-2026 Samrudhi SM-81" },
          content: {
            $t: order
              .map(
                (t) =>
                  `<div>${t === "consolation" ? "Consolation" : t} Prize Rs.${parseRupees(amounts[t])}/-<br>${t === "1st" ? row.first_ticket : prizes[t].join(" ")}</div>`,
              )
              .join(""),
          },
          link: [
            {
              rel: "alternate",
              href: "https://www.keralalotteries.net/test-result.html",
            },
          ],
        },
      ],
    },
  };
}
test("normalizes API and HTML feed without losing leading zeros or rupee amounts", () => {
  const api = parseApiDraw(row, NOW);
  const html = parseFeed(feed(), NOW)[0];
  assert.ok(api);
  assert.ok(html);
  assert.equal(sameNumbers(api, html), true);
  assert.ok(api.prizes.sixth.includes("0046"));
  assert.equal(api.amounts?.fourth, 5000);
  assert.equal(api.verified, false);
  assert.equal(parseRupees("5.000/-"), 5000);
  assert.equal(parseRupees("₹1,00,00,000/-"), 10000000);
  assert.equal(parseRupees("5.00"), undefined);
});
test("rejects partial results, missing amounts, impossible dates, future draws and duplicates", () => {
  const missing = structuredClone(row);
  missing.prizes.consolation = [];
  assert.equal(parseApiDraw(missing, NOW), null);
  const partial = structuredClone(row);
  partial.prizes["7th"] = partial.prizes["7th"].slice(0, 50);
  assert.equal(parseApiDraw(partial, NOW), null);
  const duplicate = structuredClone(row);
  duplicate.prizes["4th"][0] = duplicate.prizes["4th"][1];
  assert.equal(parseApiDraw(duplicate, NOW), null);
  const badDate = { ...row, draw_date: "2026-02-30" };
  assert.equal(parseApiDraw(badDate, NOW), null);
  assert.equal(parseApiDraw(row, new Date("2026-11-14T09:00Z")), null);
  assert.equal(parseApiDraw(row, new Date("2026-11-15T06:00Z")), null);
  assert.throws(() => parseApiHistory({ items: "bad" }, NOW));
  assert.throws(() => parseFeed({}, NOW));
});
test("source agreement never promotes a public result to official", () => {
  const api = parseApiDraw(row, NOW)!;
  const result = combineSources([api], parseFeed(feed(), NOW), [
    { name: "Samrudhi", code: "SM", drawNo: "SM-81", date: "2026-11-15" },
  ]);
  assert.equal(result.draws[0].sourceStatus, "matched");
  assert.equal(result.draws[0].verified, false);
  assert.equal(result.source, "public");
  assert.equal(
    ticketOutcome(result.draws[0], row.first_ticket).state,
    "provisional",
  );
});
test("one different number blocks checking but keeps agreed numbers; amount-only differences do not; identity mismatch blocks", () => {
  const api = parseApiDraw(row, NOW)!;
  const other = structuredClone(api);
  other.prizes.ninth[0] = "0000";
  const result = combineSources([api], [other], []);
  assert.equal(result.draws[0].sourceStatus, "conflict");
  assert.deepEqual(ticketOutcome(result.draws[0], row.first_ticket), {
    state: "conflict",
    wins: [],
  });
  assert.deepEqual(result.draws[0].disputed, { ninth: 1 });
  assert.equal(result.draws[0].prizes.ninth.length, api.prizes.ninth.length - 1);
  assert.deepEqual(result.draws[0].prizes.first, api.prizes.first);
  const wrongAmount = structuredClone(api);
  wrongAmount.amounts!.third = 1;
  const amountOnly = combineSources([api], [wrongAmount], []).draws[0];
  assert.equal(amountOnly.sourceStatus, "matched");
  assert.equal(amountOnly.amounts?.third, undefined);
  assert.equal(
    combineSources(
      [api],
      [],
      [{ name: "Samrudhi", code: "SM", drawNo: "SM-999", date: "2026-11-15" }],
    ).draws[0].sourceStatus,
    "conflict",
  );
});
test("a source outage cannot clear a previously detected disagreement", () => {
  const draw = parseApiDraw(row, NOW)!;
  const conflict = combineSources(
    [{ ...draw, sourceStatus: "conflict" }],
    [],
    [],
  );
  const next = combineSources([draw], [], []);
  assert.equal(mergeResults(conflict, next).draws[0].sourceStatus, "conflict");
  const matched = combineSources([draw], [draw], []);
  assert.equal(
    mergeResults(conflict, matched).draws[0].sourceStatus,
    "matched",
  );
});
test("official catalogue parses identity only and does not manufacture gated PDF URLs", () => {
  const rows = parseOfficialCatalog(
    '<td>KARUNYA-10/11/2025 (KR-776)</td><td>14-11-2026</td><td><a href="#" data-item-id="private-download-id">Download</a></td>',
  );
  assert.deepEqual(rows, [
    { name: "Karunya", code: "KR", drawNo: "KR-776", date: "2026-11-14" },
  ]);
  assert.equal("pdfUrl" in rows[0], false);
});
test("official catalogue reads the live portal row layout", () => {
  const rows = parseOfficialCatalog(`<td>
                1
                </td>
                <td>STHREE-SAKTHI-10/11/2025 (SS-546)</td>
                <td>17-11-2026</td>
                <td><a class="btn" href="#" data-item-id="x" onclick="captchaverificationaction(this);">Download</a></td>`);
  assert.deepEqual(rows, [
    { name: "Sthree Sakthi", code: "SS", drawNo: "SS-546", date: "2026-11-17" },
  ]);
});
test("merge keeps the previous official catalogue when a refresh returns none", () => {
  const prev = combineSources([], [], [
    { name: "Karunya", code: "KR", drawNo: "KR-776", date: "2026-11-14" },
  ]);
  const next = combineSources([], [], []);
  assert.equal(mergeResults(prev, next).officialCatalog?.length, 1);
});
