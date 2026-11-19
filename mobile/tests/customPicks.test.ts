import test from "node:test";
import assert from "node:assert/strict";
import { customIdeaError, makeCustomNumbers } from "../src/customPicks";

test("custom numbers keep the start, ending and lucky digits", () => {
  for (let i = 0; i < 50; i++) {
    const out = makeCustomNumbers({ start: "4", ending: "1508", lucky: "7", count: 5 });
    assert.ok(out.length >= 1);
    for (const n of out) {
      assert.match(n, /^4\d1508$/);
      assert.ok(n.includes("7"), `${n} misses 7`);
    }
  }
  for (const n of makeCustomNumbers({ lucky: "379", count: 10 })) {
    assert.match(n, /^\d{6}$/);
    for (const d of "379") assert.ok(n.includes(d), `${n} misses ${d}`);
  }
});
test("custom numbers are unique and capped by the free places", () => {
  const out = makeCustomNumbers({ ending: "12345", count: 20 });
  assert.equal(out.length, 10);
  assert.equal(new Set(out).size, out.length);
  assert.deepEqual(makeCustomNumbers({ start: "12", ending: "3456" }), ["123456"]);
});
test("custom ideas reject impossible input", () => {
  assert.ok(customIdeaError({ start: "1234", ending: "567" }));
  assert.ok(customIdeaError({ ending: "12a" }));
  assert.ok(customIdeaError({ ending: "12345", lucky: "78" }));
  assert.equal(customIdeaError({ ending: "12345", lucky: "7" }), null);
  assert.deepEqual(makeCustomNumbers({ start: "1234", ending: "567" }), []);
});
