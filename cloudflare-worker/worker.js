const MAX_TITLE_LENGTH = 160;
const UPSTREAM_TIMEOUT_MS = 8000;
const TWITCH_TOKEN_MAX_CACHE_MS = 60 * 60 * 1000;
const TWITCH_TOKEN_EXPIRY_SKEW_MS = 60 * 1000;
const COVER_LOOKUP_RATE_LIMIT_KEY = "igdb-cover-lookup";

let cachedTwitchToken = null;

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

async function getTwitchAccessToken(env) {
  const now = Date.now();
  if (
    cachedTwitchToken?.clientId === env.TWITCH_CLIENT_ID &&
    cachedTwitchToken.expiresAt > now
  ) {
    return cachedTwitchToken.accessToken;
  }

  const tokenBody = new URLSearchParams({
    client_id: env.TWITCH_CLIENT_ID,
    client_secret: env.TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials"
  });
  const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenBody.toString(),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
  if (!tokenRes.ok) throw new Error("Token request failed");

  const tokenJson = await tokenRes.json();
  if (typeof tokenJson?.access_token !== "string" || !tokenJson.access_token) {
    throw new Error("Token response was invalid");
  }

  const expiresInMs = Number(tokenJson.expires_in) * 1000;
  if (Number.isFinite(expiresInMs) && expiresInMs > TWITCH_TOKEN_EXPIRY_SKEW_MS) {
    cachedTwitchToken = {
      accessToken: tokenJson.access_token,
      clientId: env.TWITCH_CLIENT_ID,
      expiresAt: now + Math.min(
        expiresInMs - TWITCH_TOKEN_EXPIRY_SKEW_MS,
        TWITCH_TOKEN_MAX_CACHE_MS
      )
    };
  } else {
    cachedTwitchToken = null;
  }

  return tokenJson.access_token;
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
      const rateLimit = await env.COVER_RATE_LIMITER.limit({
        key: COVER_LOOKUP_RATE_LIMIT_KEY
      });
      if (!rateLimit.success) {
        return jsonResponse(
          { error: "Cover lookup rate limit exceeded" },
          429,
          { "Retry-After": "60" }
        );
      }

      const accessToken = await getTwitchAccessToken(env);
      const igdbQuery = `search "${escapeIgdbSearch(title)}"; fields name, cover.image_id; limit 1;`;
      const igdbRes = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": env.TWITCH_CLIENT_ID,
          Authorization: `Bearer ${accessToken}`,
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
      const cacheMaxAge = coverUrl ? 604800 : 3600;
      const response = jsonResponse(
        { title, coverUrl },
        200,
        { "Cache-Control": `public, max-age=${cacheMaxAge}` }
      );

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      console.error("Cover lookup failed", error);
      return jsonResponse({ error: "Cover lookup unavailable" }, 502);
    }
  }
};
