/**
 * 8gent Jr Service Worker
 * Offline-first PWA for AAC use — children must be able to communicate without internet.
 *
 * Cache strategies:
 *   - App shell routes  → cache-first (pre-cached on install)
 *   - ARASAAC images    → cache-first, 90-day max (pictograms never change)
 *   - /api/tts          → network only (audio, never cache)
 *   - API routes        → network-first, cache fallback
 *   - Everything else   → network-first, cache fallback
 */

const CACHE_NAME = "8gentjr-v1";

// App shell: pre-cache these on install
const APP_SHELL = [
  "/",
  "/talk",
  "/schedule",
  "/stories",
  "/settings",
];

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // Take over immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Claim all open clients so the new SW controls them without reload
  self.clients.claim();
});

// ─── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET requests (POST, auth, etc.)
  if (request.method !== "GET") return;

  // TTS audio — always go to network, never cache
  if (url.pathname.startsWith("/api/tts")) {
    return; // fall through to network
  }

  // ARASAAC pictograms — cache-first, 90-day max
  if (url.hostname === "static.arasaac.org") {
    event.respondWith(cacheFirstArasaac(request));
    return;
  }

  // Other API routes — network-first, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Everything else (app shell, static assets, fonts) — network-first, cache fallback
  event.respondWith(networkFirstWithCache(request));
});

// ─── Strategy: Cache-First (ARASAAC) ────────────────────────────────────────

async function cacheFirstArasaac(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Clone before consuming — responses can only be read once
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // No cached version and network failed — return 504
    return new Response(null, { status: 504, statusText: "Offline - pictogram unavailable" });
  }
}

// ─── Strategy: Network-First with Cache Fallback ─────────────────────────────

async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — return cached version if we have one
    const cached = await cache.match(request);
    if (cached) return cached;

    // Nothing cached — return a minimal offline fallback for navigation
    if (request.mode === "navigate") {
      const shell = await cache.match("/");
      if (shell) return shell;
    }

    return new Response(null, { status: 503, statusText: "Offline" });
  }
}
