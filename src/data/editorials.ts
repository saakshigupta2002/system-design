// LeetCode-style editorials: a structured, beginner-friendly walkthrough of how
// to approach and solve each problem. Authored incrementally — problems without
// an editorial show a "coming soon" state in the UI.

export interface EditorialSection {
  heading: string;
  /** Paragraphs of prose. */
  body?: string[];
  /** Bullet points. */
  bullets?: string[];
  /** Optional monospace block (API sketch, schema, formula). */
  code?: string;
}

export interface Editorial {
  /** One-paragraph intuition — the key insight for this problem. */
  summary: string;
  sections: EditorialSection[];
}

export const EDITORIALS: Record<string, Editorial> = {
  "url-shortener": {
    summary:
      "A URL shortener is a read-heavy key→value lookup at scale. Two decisions carry the design: how you generate short, unique, non-guessable keys, and how you cache redirects so the 100:1 read traffic never melts the database.",
    sections: [
      {
        heading: "1. Clarify the requirements",
        body: ["Separate what the system must do from how well it must do it."],
        bullets: [
          "Functional: shorten a long URL, redirect a short URL to the original, optional custom alias, expiry (TTL), click analytics.",
          "Non-functional: ~100:1 read:write ratio, p99 redirect latency < 100ms, highly available (a dead redirect breaks every link ever shared), keys must be short and not guessable.",
          "Out of scope to state explicitly: editing URLs, user accounts beyond an API key.",
        ],
      },
      {
        heading: "2. Estimate the scale",
        body: [
          "Back-of-envelope numbers tell you which parts must scale. With ~1,000 writes/sec you create ~86M URLs/day (~31B over the 5-year TTL). At ~100,000 reads/sec, reads dominate by 100x — caching is mandatory, not optional.",
        ],
        code: "writes ≈ 1k/s  → ~86M URLs/day\nreads  ≈ 100k/s → cache-first design\nkeyspace: 62^7 ≈ 3.5 trillion (7 base62 chars is plenty)\nstorage: ~500 bytes/record × 31B ≈ ~15 TB over 5 years",
      },
      {
        heading: "3. API design",
        body: ["Two endpoints cover the core. Keep the redirect dead-simple — it's the hot path."],
        code: "POST /api/urls        { longUrl, customAlias?, ttl? } → { shortUrl }\nGET  /{slug}          → 302 redirect to longUrl\nGET  /api/urls/{slug}/stats → click analytics",
      },
      {
        heading: "4. Data model",
        body: [
          "The core is a single mapping. Analytics is a separate, append-only stream so it never slows redirects.",
        ],
        code: "urls:  slug (PK) | long_url | owner_id | created_at | expires_at\nclicks (append-only): slug | ts | country | referrer",
      },
      {
        heading: "5. High-level design — and why each piece",
        body: ["Trace a request through the architecture and justify every box."],
        bullets: [
          "DNS → Load Balancer: spread traffic across stateless app servers so you can scale out horizontally.",
          "App Servers (stateless): handle create + redirect logic; add replicas to grow capacity.",
          "Cache (Redis) in front of the DB: the redirect path checks the cache first. With a 100:1 read ratio, a warm cache serves the vast majority of redirects in ~1ms and shields the database.",
          "NoSQL DB (or sharded SQL): the slug→URL mapping is a simple key lookup with huge volume — partition by slug hash for write scaling.",
          "Rate Limiter: stops abuse of the create endpoint (e.g. 100 URLs/min per API key).",
          "Message Queue: click events are enqueued and processed asynchronously so analytics never blocks the redirect.",
        ],
      },
      {
        heading: "6. Deep dive: generating the key",
        body: [
          "This is the part interviewers push on. Three common approaches:",
        ],
        bullets: [
          "Hash the URL (e.g. MD5) and take the first N chars — simple, but collisions need a check-and-retry, and identical URLs collide by design.",
          "Auto-increment counter + base62 encode it — guaranteed unique and short, but sequential keys are guessable and leak volume. Add a distributed ID generator (e.g. Snowflake) so multiple servers don't clash.",
          "Key Generation Service (KGS): pre-generate random unused keys offline into a table; servers hand them out and mark them used atomically. Removes collision checks from the write path entirely — the strongest answer.",
        ],
      },
      {
        heading: "7. Trade-offs & summary",
        bullets: [
          "301 (permanent) vs 302 (temporary) redirect: 301 is cached by browsers (fewer hits, faster) but kills your click analytics; 302 keeps every click flowing through you. Most shorteners pick 302.",
          "NoSQL vs sharded SQL: NoSQL scales writes effortlessly; SQL is fine if you shard by slug and don't need joins.",
          "The one-liner: cache-first redirects + a collision-free key strategy (KGS) is the heart of a good answer.",
        ],
      },
    ],
  },

  "rate-limiter": {
    summary:
      "A rate limiter is a tiny decision (allow / deny) that sits on the hottest path in your system, so it must be fast and consistent across many instances at once. The design comes down to which counting algorithm you use and how you share counters atomically.",
    sections: [
      {
        heading: "1. Clarify the requirements",
        bullets: [
          "Functional: given a key (user / IP / API key) decide allow or deny; return HTTP 429 with Retry-After and remaining quota; support per-client, per-endpoint, and global limits.",
          "Non-functional: sub-millisecond decision latency (it must not become the bottleneck it's protecting against), accurate across many instances, and resilient when the counter store is down.",
        ],
      },
      {
        heading: "2. Where it lives",
        body: [
          "Rate limiting runs before business logic — typically in an API Gateway or a dedicated rate-limiter service in front of the app servers. Every request pays this cost, which is why latency matters so much.",
        ],
        code: "client → API Gateway / Rate Limiter → App Servers\n                     │\n                     └─ Redis (shared counters)",
      },
      {
        heading: "3. The algorithms (the core of the answer)",
        bullets: [
          "Fixed window: count requests per key per time bucket (e.g. per minute). Simplest, but allows 2x bursts at window edges.",
          "Sliding window log: store a timestamp per request and count those in the last N seconds. Most accurate, most memory.",
          "Sliding window counter: blend the current and previous fixed windows by weight — near-perfect accuracy at a fraction of the memory. The usual production pick.",
          "Token bucket: refill tokens at a steady rate, each request spends one; naturally allows short bursts up to the bucket size. Great when you want burst tolerance.",
        ],
      },
      {
        heading: "4. Deep dive: distributed counting",
        body: [
          "Multiple limiter instances must agree on the count, so the counter lives in a shared store (Redis). The trick is doing the read-modify-write atomically.",
        ],
        bullets: [
          "Use Redis INCR + EXPIRE, wrapped in a Lua script so the check-and-increment is a single atomic operation (no race between instances).",
          "Two-tier optimization: keep a local in-memory counter for the hot path and sync to Redis periodically. This cuts Redis round-trips ~90% while staying accurate within a small margin — the answer that shows seniority.",
        ],
        code: "-- atomic: increment and read in one round trip\nlocal n = redis.call('INCR', key)\nif n == 1 then redis.call('EXPIRE', key, window) end\nreturn n",
      },
      {
        heading: "5. Trade-offs & summary",
        bullets: [
          "Fail open vs fail closed: if Redis is down, do you allow all traffic (protect availability) or block it (protect the backend)? Make it configurable per rule.",
          "Accuracy vs cost: sliding-window-log is exact but heavy; sliding-window-counter is the pragmatic default.",
          "The one-liner: an atomic shared counter (Redis + Lua) with a sliding-window-counter algorithm, optionally fronted by local counters for speed.",
        ],
      },
    ],
  },

  "parking-lot": {
    summary:
      "A smart parking lot looks simple but hides two hard problems: keeping availability accurate in real time across IoT sensors and apps, and preventing two drivers from booking the same spot at the same time. Treat 'availability' (eventually consistent, cached) and 'reservations' (strongly consistent, transactional) as two different problems.",
    sections: [
      {
        heading: "1. Clarify the requirements",
        bullets: [
          "Functional: track entry/exit, show real-time availability, reserve a spot for a time slot, dynamic pricing, payments, multi-lot dashboard.",
          "Non-functional: availability fresh within ~2s of a sensor event; never double-book a spot; reservations and payments must be correct (money is involved).",
        ],
      },
      {
        heading: "2. Data model",
        body: ["Model the physical hierarchy, then layer reservations and events on top."],
        code: "lots → floors → zones → spots(type, status)\nreservations: id | spot_id | user_id | start | end | status\npayments:     id | user_id | amount | method | status",
      },
      {
        heading: "3. API design",
        code: "GET  /lots/{id}/availability        → counts by type\nPOST /reservations { spotId, start, end } → 201 or 409 conflict\nPOST /events  { spotId, type: enter|exit } (from IoT)\nPOST /payments { reservationId, method }",
      },
      {
        heading: "4. High-level design — and why each piece",
        bullets: [
          "Load Balancer → App Servers (stateless): standard scalable front end.",
          "Cache (Redis) for availability counts per lot/floor/type: availability is read constantly by the map view; serve it from memory and update on each event.",
          "SQL DB for reservations & payments: these need transactions and strong consistency — exactly what a relational DB gives you.",
          "Message Queue for IoT events: sensors publish enter/exit events; a worker updates the cache + DB. Decouples bursty sensor traffic from the request path.",
          "WebSocket Server: push availability changes to the mobile app so the live map updates without polling.",
          "(Optional) a payment/notification service for receipts and pass management.",
        ],
      },
      {
        heading: "5. Deep dive: don't double-book",
        body: [
          "The classic bug is checking availability when the user selects a spot, then writing later — two users can both pass the check. Decide at commit time, not selection time.",
        ],
        bullets: [
          "Use the database to enforce it: a transaction with optimistic locking (version check) or a unique constraint on (spot_id, time_slot) so the second writer fails with a 409.",
          "Availability counts (the cached number) can be eventually consistent — a slightly stale count is fine. The reservation write is the source of truth.",
        ],
      },
      {
        heading: "6. Trade-offs & summary",
        bullets: [
          "Two consistency models on purpose: strong for reservations/payments, eventual for displayed availability — mixing them is the key insight.",
          "Event-driven updates (queue → cache + DB → websocket) keep the live map fresh without hammering the database on every read.",
          "The one-liner: transactional reservations to prevent double-booking, plus a cached, event-updated availability layer for real-time reads.",
        ],
      },
    ],
  },
};

export function getEditorial(id: string): Editorial | undefined {
  return EDITORIALS[id];
}
