/** Verifies the sign-in token Cloudflare Access adds to every request it lets through. */
interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string }

const b64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const text = (s: string) => JSON.parse(new TextDecoder().decode(b64(s)));

export async function verifyAccessJwt(
  token: string | null,
  opts: { teamDomain: string; aud: string; keys?: Jwk[]; now?: number },
): Promise<{ email: string } | null> {
  if (!token || !opts.teamDomain || !opts.aud) return null; // not set up: refuse everything
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = text(parts[0]);
    const payload = text(parts[1]);
    if (header.alg !== "RS256") return null;
    const issuer = `https://${opts.teamDomain}`;
    if (payload.iss !== issuer) return null;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(opts.aud)) return null;
    const now = opts.now ?? Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (typeof payload.nbf === "number" && payload.nbf > now + 60) return null;
    const keys =
      opts.keys ??
      ((await (await fetch(`${issuer}/cdn-cgi/access/certs`)).json()) as { keys: Jwk[] }).keys;
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    return ok && typeof payload.email === "string" ? { email: payload.email } : null;
  } catch {
    return null;
  }
}
