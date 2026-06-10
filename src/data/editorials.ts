// LeetCode-style editorials: a structured, beginner-friendly walkthrough of how
// to approach and solve each problem. Authored incrementally — problems without
// an editorial show a "coming soon" state in the UI.

export interface EditorialCallout {
  /** tip = helpful pointer, warning = common mistake, analogy = plain-English
   *  comparison, note = define a jargon term. */
  kind: "tip" | "warning" | "analogy" | "note";
  text: string;
}

export interface EditorialTable {
  headers: string[];
  rows: string[][];
}

export interface EditorialSection {
  heading: string;
  /** Paragraphs of prose. */
  body?: string[];
  /** Bullet points. */
  bullets?: string[];
  /** Comparison table — much clearer than bullets for trade-offs. */
  table?: EditorialTable;
  /** Highlighted callout boxes (tips, common mistakes, analogies, jargon). */
  callouts?: EditorialCallout[];
  /** Optional monospace block (API sketch, schema, formula). */
  code?: string;
}

export interface Editorial {
  /** One-paragraph, plain-English intuition — the key insight. */
  summary: string;
  sections: EditorialSection[];
}

export const EDITORIALS: Record<string, Editorial> = {
  "url-shortener": {
    summary:
      "When someone clicks a short link, they must be bounced to the original URL in well under a tenth of a second — and there are roughly 100 clicks for every link created. So the whole design comes down to two things: making short, unique codes, and serving redirects from a cache so the database is barely touched.",
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Think of a coat check. You hand in a long coat (the URL) and get a small numbered tag (the short code). Later you show the tag and get your coat back instantly. The hard parts: making sure no two coats get the same tag, and finding the right coat fast when thousands of people show tags at once.",
          },
        ],
        bullets: [
          "What it must do: turn a long URL into a short code, redirect that code to the original, support custom aliases, expiry, and click analytics.",
          "How well: ~100 reads per write, redirects under 100ms, always available (a dead redirect breaks every link ever shared), codes must be short and not guessable.",
        ],
      },
      {
        heading: "2. Estimate the scale",
        body: [
          "Rough numbers tell you what has to scale. Reads beat writes 100-to-1, which is the single most important fact in this design — it's why caching dominates.",
        ],
        code: "writes ≈ 1k/sec  → ~86 million new links/day\nreads  ≈ 100k/sec → must be served from cache, not the DB\ncode length: 62^7 ≈ 3.5 trillion combos (7 characters is plenty)",
        callouts: [
          {
            kind: "note",
            text: "base62 = writing a number using 0-9, a-z, and A-Z (62 symbols). It packs a big number into very few characters — that's how you get a 7-character code.",
          },
          {
            kind: "note",
            text: "p99 latency = the slowest 1% of requests. \"p99 < 100ms\" means 99 out of 100 redirects finish within 100ms.",
          },
        ],
      },
      {
        heading: "3. API design",
        body: ["Two endpoints do the real work. Keep the redirect as simple as possible — it's the hot path."],
        code: "POST /api/urls   { longUrl, customAlias?, ttl? }  → { shortUrl }\nGET  /{code}      → 302 redirect to the long URL\nGET  /api/urls/{code}/stats → click analytics",
      },
      {
        heading: "4. Data model",
        body: ["One small mapping table is the core. Analytics is kept separate so it never slows redirects down."],
        code: "urls:   code (key) | long_url | owner | created_at | expires_at\nclicks: code | timestamp | country | referrer   (append-only)",
      },
      {
        heading: "5. The architecture, piece by piece",
        body: ["Follow one request through the diagram above and justify each box."],
        bullets: [
          "Load Balancer → App Servers: spread traffic so you can add more stateless servers as you grow.",
          "Cache (Redis) in front of the database: the redirect checks the cache first. With 100:1 reads, a warm cache answers almost everything in ~1ms and protects the DB.",
          "Database (NoSQL or sharded SQL): stores the code→URL mapping — a simple key lookup at huge volume.",
          "Rate Limiter: stops abuse of the create endpoint.",
          "Message Queue: click events go here and are processed later, so analytics never blocks a redirect.",
        ],
      },
      {
        heading: "6. The key decision: generating codes",
        body: ["This is what interviewers push on. Three common approaches:"],
        table: {
          headers: ["Approach", "How it works", "Trade-off"],
          rows: [
            ["Hash the URL", "Hash it, take the first 7 chars", "Simple, but collisions need retries; the same URL always makes the same code"],
            ["Counter + base62", "One global counter, encoded to base62", "Always unique and short, but codes are sequential and guessable"],
            ["Key Generation Service", "Pre-make random unused codes, hand them out", "No collision checks at write time — the strongest answer at scale"],
          ],
        },
      },
      {
        heading: "7. Trade-offs to mention",
        table: {
          headers: ["Redirect type", "Browser caches it?", "You see the click?"],
          rows: [
            ["301 Permanent", "Yes — faster, fewer hits on you", "No — analytics goes blind"],
            ["302 Found", "No — every click reaches you", "Yes — full click data"],
          ],
        },
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: using a 301 redirect because it's \"more correct\", then wondering why click analytics stopped working. Most shorteners deliberately use 302 to keep counting clicks.",
          },
          {
            kind: "tip",
            text: "The whole answer in one sentence: cache-first redirects plus a collision-free code strategy (a Key Generation Service).",
          },
        ],
      },
    ],
  },

  "rate-limiter": {
    summary:
      "A rate limiter makes a tiny yes/no decision (allow or block) on the busiest path in your system, so it must be extremely fast and agree across many servers at once. The design is about which counting method you use and how you share the count without races.",
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Picture a bouncer at a club who must remember how many times each guest has entered in the last minute — across several doors at once. The challenge isn't the counting; it's that all the doors must share one accurate tally instantly, without slowing the line down.",
          },
        ],
        bullets: [
          "What it must do: given a key (user / IP / API key), decide allow or block; return HTTP 429 with how long to wait and how much quota is left.",
          "How well: sub-millisecond decisions (it must not become the bottleneck it's preventing), accurate across many servers, and graceful when the counter store is down.",
        ],
      },
      {
        heading: "2. Where it sits",
        body: ["Rate limiting runs before any business logic — usually in an API Gateway or a dedicated service in front of the app servers. Every request pays this cost, which is why speed matters so much."],
        code: "request → API Gateway / Rate Limiter → App Servers\n                      │\n                      └── Redis (the shared counter)",
      },
      {
        heading: "3. The core: which counting algorithm?",
        body: ["This comparison is the heart of the answer."],
        table: {
          headers: ["Algorithm", "Accuracy", "Memory", "Bursts"],
          rows: [
            ["Fixed window", "Low", "Tiny", "Allows 2× spikes at window edges"],
            ["Sliding log", "Exact", "High", "Smooth, but stores every timestamp"],
            ["Sliding counter", "High", "Low", "Smooth — the usual production pick"],
            ["Token bucket", "High", "Low", "Allows controlled short bursts"],
          ],
        },
        callouts: [
          {
            kind: "note",
            text: "Token bucket: tokens refill at a steady rate and each request spends one. If tokens are saved up, a short burst is allowed — handy when you want to tolerate spikes.",
          },
        ],
      },
      {
        heading: "4. Deep dive: sharing the count safely",
        body: [
          "Many limiter instances must agree, so the counter lives in a shared store (Redis). The catch is doing \"read the count, add one, check the limit\" as one indivisible step.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: read the counter, then write it back in a separate step. Two servers can read the same value at the same time and both allow the request — the limit leaks. Make the increment atomic.",
          },
        ],
        code: "-- one atomic round trip (a Redis Lua script)\nlocal n = redis.call('INCR', key)\nif n == 1 then redis.call('EXPIRE', key, window) end\nreturn n",
      },
      {
        heading: "5. Trade-offs to mention",
        table: {
          headers: ["If Redis is down…", "Behavior", "Protects"],
          rows: [
            ["Fail open", "Allow all traffic", "Availability (users)"],
            ["Fail closed", "Block all traffic", "The backend"],
          ],
        },
        callouts: [
          {
            kind: "tip",
            text: "Senior touch: keep a fast local counter on each server and sync to Redis periodically. It cuts Redis round-trips ~90% while staying accurate within a small margin.",
          },
        ],
      },
    ],
  },

  "parking-lot": {
    summary:
      "A smart parking lot hides two hard problems: keeping availability accurate in real time, and never letting two drivers book the same spot. The trick is to treat 'availability' and 'reservations' as two different problems with two different consistency needs.",
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "It's like booking a seat for a movie. The seat map can be a moment out of date and nobody minds — but the actual booking must be rock-solid: two people can never end up holding the same seat.",
          },
        ],
        bullets: [
          "What it must do: track entry/exit, show real-time availability, reserve a spot for a time slot, dynamic pricing, payments, a multi-lot dashboard.",
          "How well: availability fresh within ~2s of a sensor event; never double-book; reservations and payments must be exactly correct (money is involved).",
        ],
      },
      {
        heading: "2. Data model",
        body: ["Model the physical layout, then layer reservations and payments on top."],
        code: "lots → floors → zones → spots(type, status)\nreservations: id | spot_id | user_id | start | end | status\npayments:     id | user_id | amount | method | status",
      },
      {
        heading: "3. The architecture, piece by piece",
        bullets: [
          "Load Balancer → App Servers: standard scalable front end.",
          "Cache (Redis) for availability counts: the live map reads these constantly, so serve them from memory and update on each event.",
          "SQL database for reservations & payments: these need real transactions — exactly what a relational DB gives you.",
          "Message Queue for sensor events: cars entering/leaving publish events; a worker updates the cache and DB. This absorbs bursty sensor traffic.",
          "WebSocket Server: pushes availability changes to the app so the map updates live, without constant polling.",
        ],
      },
      {
        heading: "4. The two-speed insight",
        body: ["The cleanest answer splits the data by how consistent it needs to be:"],
        table: {
          headers: ["Data", "Consistency", "Why"],
          rows: [
            ["Spot availability (the map count)", "Eventual (cached)", "A slightly stale number is fine; it's refreshed from sensor events"],
            ["A reservation or payment", "Strong (transaction)", "Must never double-book or double-charge"],
          ],
        },
      },
      {
        heading: "5. Deep dive: don't double-book",
        body: ["The classic bug is checking availability when the user picks a spot, then writing the booking later. Two users can both pass the check. Decide at write time, not pick time."],
        callouts: [
          {
            kind: "note",
            text: "Optimistic locking = let both users try to book, but the database checks a version/uniqueness rule at the moment of writing. The first write wins; the second fails and is told to pick again.",
          },
          {
            kind: "tip",
            text: "Enforce it in the database: a unique constraint on (spot_id, time_slot) means the second booking simply fails with a 409 Conflict. The displayed count can lag; the reservation row is the source of truth.",
          },
        ],
      },
    ],
  },
};

export function getEditorial(id: string): Editorial | undefined {
  return EDITORIALS[id];
}
