const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
const CATEGORIES = new Set([
  "Kotlovnice",
  "Klimatizacija",
  "Kupaonice",
  "Uređaj protiv kamenca",
  "Ostalo",
]);

let keySetCache;
let keySetCacheExpires = 0;

function response(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: { "X-Content-Type-Options": "nosniff", ...headers },
  });
}

function json(body, status = 200, headers = {}) {
  return response(JSON.stringify(body), status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
}

async function accessKeySet(teamDomain) {
  if (!keySetCache || Date.now() >= keySetCacheExpires) {
    const url = `https://${teamDomain}/cdn-cgi/access/certs`;
    const result = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!result.ok) throw new Error("Could not load Access signing keys");
    keySetCache = await result.json();
    keySetCacheExpires = Date.now() + 5 * 60 * 1000;
  }
  return keySetCache.keys || [];
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function authenticate(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ADMIN_EMAIL) return null;
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return null;

  try {
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) return null;
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(headerPart)));
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart)));
    const now = Math.floor(Date.now() / 1000);
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (header.alg !== "RS256" || claims.iss !== issuer || !audiences.includes(env.ACCESS_AUD)) return null;
    if (typeof claims.exp !== "number" || claims.exp <= now || (claims.nbf && claims.nbf > now)) return null;
    if (String(claims.email || "").toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) return null;

    const signingKey = (await accessKeySet(env.ACCESS_TEAM_DOMAIN)).find((key) => key.kid === header.kid);
    if (!signingKey) return null;
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      signingKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      decodeBase64Url(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );
    return valid ? claims : null;
  } catch {
    return null;
  }
}

function safeText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function handleUpload(request, env) {
  const form = await request.formData();
  const file = form.get("image");
  const title = safeText(form.get("title"), 120);
  const description = safeText(form.get("description"), 500);
  const category = safeText(form.get("category"), 60);

  if (!(file instanceof File) || !title || !CATEGORIES.has(category)) {
    return json({ error: "Odaberite sliku, unesite naslov i odaberite kategoriju." }, 400);
  }
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) return json({ error: "Podržani su JPG, PNG, WebP i AVIF formati." }, 415);
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return json({ error: "Slika mora biti manja od 12 MB." }, 413);
  }

  const key = `photos/${crypto.randomUUID()}.${extension}`;
  await env.GALLERY.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { title, description, category, createdAt: new Date().toISOString() },
  });
  return json({ ok: true, key });
}

async function handleDelete(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Neispravan zahtjev." }, 400);
  }
  const key = typeof body.key === "string" ? body.key : "";
  if (!/^photos\/[a-f0-9-]{36}\.(jpg|png|webp|avif)$/.test(key)) {
    return json({ error: "Neispravna slika." }, 400);
  }
  await env.GALLERY.delete(key);
  return json({ ok: true });
}

async function listPhotos(env) {
  const photos = [];
  let cursor;
  do {
    const page = await env.GALLERY.list({ prefix: "photos/", cursor, limit: 1000, include: ["customMetadata"] });
    for (const object of page.objects) {
      const metadata = object.customMetadata || {};
      if (!metadata.title || !CATEGORIES.has(metadata.category)) continue;
      photos.push({
        key: object.key,
        url: `/uploads/${object.key.slice("photos/".length)}`,
        title: metadata.title,
        description: metadata.description || "",
        category: metadata.category,
        createdAt: metadata.createdAt || object.uploaded.toISOString(),
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return photos;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS" && path.startsWith("/api/admin/")) {
      return response(null, 204, { Allow: "GET, POST, DELETE, OPTIONS" });
    }

    if (path === "/gallery-data.json" && request.method === "GET") {
      try {
        return json(await listPhotos(env), 200, { "Cache-Control": "no-store" });
      } catch {
        return json({ error: "Galerija trenutačno nije dostupna." }, 503);
      }
    }

    if (path.startsWith("/uploads/") && request.method === "GET") {
      const filename = path.slice("/uploads/".length);
      if (!/^[a-f0-9-]{36}\.(jpg|png|webp|avif)$/.test(filename)) return response("Not found", 404);
      const object = await env.GALLERY.get(`photos/${filename}`);
      if (!object) return response("Not found", 404);
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("ETag", object.httpEtag);
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(object.body, { headers });
    }

    if (path.startsWith("/api/admin/")) {
      if (request.headers.get("Origin") !== env.SITE_ORIGIN) return json({ error: "Zahtjev nije dopušten." }, 403);
      const claims = await authenticate(request, env);
      if (!claims) return json({ error: "Prijava nije valjana. Osvježite stranicu i prijavite se ponovno." }, 401);

      if (path === "/api/admin/photos" && request.method === "GET") {
        return json(await listPhotos(env), 200, { "Cache-Control": "no-store" });
      }
      if (path === "/api/admin/photos" && request.method === "POST") return handleUpload(request, env);
      if (path === "/api/admin/photos" && request.method === "DELETE") return handleDelete(request, env);
      return json({ error: "Nepoznata adresa." }, 404);
    }

    return response("Not found", 404);
  },
};
