import test from "node:test";
import assert from "node:assert/strict";
import { verifyAccessJwt } from "../src/access";

const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
async function make(payload: object, kid = "k1") {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"]);
  const jwk = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as any;
  const head = enc({ alg: "RS256", kid });
  const body = enc(payload);
  const sig = Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(`${head}.${body}`))).toString("base64url");
  return { token: `${head}.${body}.${sig}`, keys: [{ ...jwk, kid }] };
}
const base = { iss: "https://team.cloudflareaccess.com", aud: ["AUD1"], email: "me@example.com", exp: 2_000_000_000 };
const opts = { teamDomain: "team.cloudflareaccess.com", aud: "AUD1", now: 1_900_000_000 };

test("accepts a valid token", async () => {
  const { token, keys } = await make(base);
  assert.deepEqual(await verifyAccessJwt(token, { ...opts, keys }), { email: "me@example.com" });
});
test("rejects wrong audience, expired, other issuer, tampering, no setup", async () => {
  const { token, keys } = await make(base);
  assert.equal(await verifyAccessJwt(token, { ...opts, aud: "OTHER", keys }), null);
  assert.equal(await verifyAccessJwt(token, { ...opts, now: 2_100_000_000, keys }), null);
  assert.equal(await verifyAccessJwt(token, { ...opts, teamDomain: "evil.example.com", keys }), null);
  const bad = token.slice(0, -4) + "AAAA";
  assert.equal(await verifyAccessJwt(bad, { ...opts, keys }), null);
  assert.equal(await verifyAccessJwt(token, { teamDomain: "", aud: "", keys }), null);
  assert.equal(await verifyAccessJwt(null, { ...opts, keys }), null);
});
