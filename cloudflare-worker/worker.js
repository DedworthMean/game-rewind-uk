const MAX_TITLE_LENGTH = 160;
const UPSTREAM_TIMEOUT_MS = 8000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders
    }
  });
}

function normaliseTitle(value) {
  return value.trim().replace(/\s+/g, " ");
}

function escapeIgdbSearch(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return jsonResponse(
        { error: "Method not allowed" },
        405,
        { Allow: "GET, OPTIONS" }
      );
    }

    const url = new URL(request.url);
    const title = normaliseTitle(url.searchParams.get("title") || "");
    if (!title) return jsonResponse({ error: "Missing ?title=" }, 400);
    if (title.length > MAX_TITLE_LENGTH) {
      return jsonResponse({ error: "Title is too long" }, 400);
    }

    const cacheUrl = new URL(url.origin + url.pathname);
    cacheUrl.searchParams.set("title", title);
    const cacheKey = new Request(cacheUrl, { method: "GET" });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      const tokenUrl = new URL("https://id.twitch.tv/oauth2/token");
      tokenUrl.searchParams.set("client_id", env.TWITCH_CLIENT_ID);
      tokenUrl.searchParams.set("client_secret", env.TWITCH_CLIENT_SECRET);
      tokenUrl.searchParams.set("grant_type", "client_credentials");

      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      });
      if (!tokenRes.ok) throw new Error("Token request failed");

      const tokenJson = await tokenRes.json();
      if (typeof tokenJson?.access_token !== "string" || !tokenJson.access_token) {
        throw new Error("Token response was invalid");
      }

      const igdbQuery = `search "${escapeIgdbSearch(title)}"; fields name, cover.image_id; limit 1;`;
      const igdbRes = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": env.TWITCH_CLIENT_ID,
          Authorization: `Bearer ${tokenJson.access_token}`,
          "Content-Type": "text/plain"
        },
        body: igdbQuery,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
      });
      if (!igdbRes.ok) throw new Error("IGDB query failed");

      const igdbJson = await igdbRes.json();
      if (!Array.isArray(igdbJson)) throw new Error("IGDB response was invalid");

      const imageId = igdbJson[0]?.cover?.image_id;
      const coverUrl = typeof imageId === "string" && /^[A-Za-z0-9_-]+$/.test(imageId)
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
        : null;
      const response = jsonResponse(
        { title, coverUrl },
        200,
        { "Cache-Control": "public, max-age=604800" }
      );

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      console.error("Cover lookup failed", error);
      return jsonResponse({ error: "Cover lookup unavailable" }, 502);
    }
  }
};
