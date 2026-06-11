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
  /** Plain "why is this here" line per componentId, shown as a diagram legend. */
  componentNotes?: Record<string, string>;
  sections: EditorialSection[];
}

export const EDITORIALS: Record<string, Editorial> = {
  "url-shortener": {
    summary:
      "When someone clicks a short link, they must be bounced to the original URL in well under a tenth of a second — and there are roughly 100 clicks for every link created. So the whole design comes down to two things: making short, unique codes, and serving redirects from a cache so the database is barely touched.",
    componentNotes: {
      dns: "Turns the domain name into a server address — the first stop for every request.",
      cdn: "Serves unchanging content from servers near the user so it loads fast.",
      "load-balancer": "Spreads incoming traffic evenly across the app servers.",
      "rate-limiter": "Caps how many links one client can create, to stop abuse.",
      "app-server": "Runs the logic — creates short codes and resolves redirects.",
      cache: "Keeps recent code→URL lookups in memory so redirects return in ~1ms.",
      "nosql-db": "Stores every code→URL mapping; built to handle billions of rows.",
      monitoring: "Watches system health and fires alerts when something breaks.",
    },
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
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Spreads incoming traffic across instances.",
      "rate-limiter": "The star here — decides allow/block before any real work happens.",
      "api-gateway": "The single front door, and a natural place to run the limit check.",
      "app-server": "Runs the actual business logic for requests that are allowed through.",
      cache: "Redis holds the shared per-client counters every instance reads and updates atomically.",
      monitoring: "Tracks rejection rates and latency so you can tune the limits.",
    },
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
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Spreads incoming traffic across app servers.",
      "api-gateway": "Single entry point for the app and partner integrations.",
      "app-server": "Runs reservations, pricing, and availability logic.",
      cache: "Redis holds live availability counts so the map loads instantly.",
      "message-queue": "Buffers bursty IoT entry/exit events for a worker to process.",
      "sql-db": "Stores reservations and payments with real transactions — the no-double-booking guarantee.",
      monitoring: "Tracks occupancy, revenue, and overall system health.",
    },
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
  "notification-system": {
    summary:
      "A notification system fans one event out to millions of people across email, SMS, and push — channels that fail and rate-limit in different ways. The design is a pipeline: accept the request instantly, queue it, then let per-channel workers deliver and retry without ever blocking the caller.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Spreads incoming send-requests across app servers.",
      "api-gateway": "Single front door where auth and rate limits are applied.",
      "app-server": "Validates a notification request and drops it onto the queue — then returns immediately.",
      "message-queue": "The heart of the design — buffers notifications so spikes don't overwhelm delivery, and enables retries.",
      cache: "Holds user preferences and de-duplication keys for fast lookups.",
      "nosql-db": "Stores delivery status and notification history at high volume.",
      "sql-db": "Holds user contact details and channel preferences.",
      "rate-limiter": "Stops one source from flooding users (and respects provider limits).",
      monitoring: "Tracks delivery and bounce rates per channel.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Think of a mailroom. People drop off letters (requests) and walk away instantly. Inside, sorters route each letter to the right courier (email / SMS / push), and if a courier is busy they try again later. The sender never waits for delivery.",
          },
        ],
        bullets: [
          "What it must do: accept a notification, pick the right channel(s), respect user preferences and quiet hours, deliver reliably with retries, and de-duplicate.",
          "How well: huge write volume, delivery within seconds (not milliseconds), and no lost messages.",
        ],
      },
      {
        heading: "2. The pipeline",
        body: ["The golden rule: never deliver synchronously. Accept → enqueue → return; workers do the slow part."],
        code: "API → validate → enqueue → 202 Accepted\nqueue → channel workers (email | sms | push) → provider\n         └─ failed? retry with backoff, then dead-letter",
      },
      {
        heading: "3. Deep dive: reliability",
        bullets: [
          "Retries with exponential backoff for transient provider failures; a dead-letter queue catches the rest for inspection.",
          "Idempotency: every notification carries a unique key so a retry never sends the same message twice.",
          "Fan-out: one 'order shipped' event can create email + SMS + push — each is its own queued job.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: calling the email/SMS provider directly from the request handler. One slow provider then stalls your whole API. Always go through the queue.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: an async, queue-backed pipeline with per-channel workers, idempotency keys, and retry + dead-letter handling.",
          },
        ],
      },
    ],
  },

  "typeahead-autocomplete": {
    summary:
      "Autocomplete must return suggestions in a few milliseconds while you type, for billions of queries a day. The trick is to precompute the top suggestions for each prefix ahead of time and serve them from memory — you never run a live search on the keystroke path.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Caches popular prefix results at the edge, close to users.",
      "load-balancer": "Spreads query traffic across app servers.",
      "app-server": "Looks up suggestions for the typed prefix and returns them.",
      cache: "Holds the precomputed top suggestions per prefix in memory for ~1ms reads.",
      "message-queue": "Carries the raw query log to the offline pipeline that rebuilds rankings.",
      "nosql-db": "Stores the suggestion data and counts durably.",
      search: "Builds and serves the prefix index (e.g. a trie / inverted index).",
      monitoring: "Tracks query latency and cache hit rate.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "It's like a phone's predictive keyboard. It doesn't 'think' about every possible word as you type — it has already learned the most likely next words and just looks them up instantly.",
          },
        ],
        bullets: [
          "What it must do: as the user types a prefix, return the top few completions ranked by popularity.",
          "How well: sub-50ms responses, read-dominated, slightly stale rankings are fine.",
        ],
      },
      {
        heading: "2. The key idea: precompute, don't search live",
        body: [
          "Build a trie (prefix tree) where each node stores the top-k completions for that prefix. On a keystroke you walk to the prefix node and return its cached list — no ranking at request time.",
        ],
        code: "offline:  query logs → count & rank → top-k per prefix → cache/trie\nonline:   prefix → look up node → return top-k  (~1ms)",
      },
      {
        heading: "3. Keeping it fresh",
        bullets: [
          "An offline pipeline (fed by the query-log queue) recomputes rankings periodically — hourly or daily — and reloads the trie.",
          "Cache + CDN absorb the popular prefixes; rare prefixes fall through to the index.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: running a full search query on every keystroke. At 200k QPS that melts any database — the whole point is to precompute.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        table: {
          headers: ["Choice", "Faster / fresher?", "Cost"],
          rows: [
            ["Precomputed top-k (trie)", "Fastest reads", "Slightly stale rankings"],
            ["Live search per keystroke", "Always fresh", "Far too slow & expensive at scale"],
          ],
        },
        callouts: [
          {
            kind: "tip",
            text: "In one line: precompute top-k completions per prefix offline, serve from an in-memory trie + cache.",
          },
        ],
      },
    ],
  },

  "distributed-cache": {
    summary:
      "A distributed cache spreads key→value data across many nodes so it can hold more than one machine's memory and survive failures. The two decisions that define it: how you map keys to nodes (consistent hashing) and what happens to data when a node dies (replication).",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Routes clients to a cache coordinator / node.",
      "app-server": "The cache client/coordinator that routes a key to the right node.",
      cache: "The cache nodes themselves — each owns a slice of the keyspace in memory.",
      "nosql-db": "The backing store the cache sits in front of (the source of truth).",
      "service-mesh": "Handles node-to-node discovery, health checks, and routing inside the cluster.",
      monitoring: "Tracks hit rate, evictions, and node health.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Imagine a coat check too big for one counter, so you split it across many counters by the first letter of the name. Everyone knows which counter holds which names, so lookups are instant — and if a counter closes, a backup counter has copies.",
          },
        ],
        bullets: [
          "What it must do: get/set/delete keys with ~1-2ms latency, scale beyond one machine, and survive node failures.",
          "How well: extreme read + write volume, in-memory speed.",
        ],
      },
      {
        heading: "2. Mapping keys to nodes",
        body: [
          "The naive approach — hash(key) % N — remaps almost everything when N changes (a node joins or dies), wiping the cache. Consistent hashing fixes this: keys and nodes sit on a ring, and a key belongs to the next node clockwise. Adding/removing a node only moves the keys near it.",
        ],
        callouts: [
          {
            kind: "note",
            text: "Consistent hashing = placing nodes and keys on a circle so that adding or removing one node only reshuffles a small slice of keys, not all of them.",
          },
          {
            kind: "warning",
            text: "Common mistake: using hash(key) % N. The day you add a server, almost every key moves and the cache effectively empties — a 'thundering herd' hits your database.",
          },
        ],
      },
      {
        heading: "3. Surviving failures & evictions",
        bullets: [
          "Replicate each key to the next 1-2 nodes on the ring so a single death doesn't lose data.",
          "Use an eviction policy (LRU is the default) so memory stays bounded.",
          "Pick a write policy: write-through (safe, slower) vs write-back (fast, risk of loss).",
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: consistent hashing to place keys, replication for durability, LRU eviction, and a chosen write policy.",
          },
        ],
      },
    ],
  },

  instagram: {
    summary:
      "Instagram is a read-heavy photo feed. Two things dominate: storing and serving images cheaply through a CDN, and building each user's home feed fast. The classic answer is fan-out-on-write (precompute feeds) for normal users, with a fallback for accounts that have millions of followers.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves photos from edge locations near users — most of the traffic.",
      "load-balancer": "Spreads requests across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Logs users in and verifies tokens.",
      "app-server": "Runs feed, upload, and profile logic.",
      cache: "Holds precomputed feeds and hot metadata for fast reads.",
      "message-queue": "Carries upload events to fan-out and media-processing workers.",
      "object-storage": "Stores the actual image files cheaply and durably (S3-style).",
      "nosql-db": "Stores posts, follows, and feed entries at scale.",
      search: "Powers hashtag and user search.",
      monitoring: "Tracks latency and error rates.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Think of a personalized newspaper printed for each subscriber. Rather than assembling your paper the moment you open it, the presses pre-print each person's edition as news comes in — so opening it is instant.",
          },
        ],
        bullets: [
          "What it must do: upload photos, follow people, and load a personalized home feed.",
          "How well: reads >> writes, feed loads under ~200ms, images served globally and fast.",
        ],
      },
      {
        heading: "2. Storing images",
        bullets: [
          "Never store image bytes in the database — put them in object storage and keep only the URL + metadata in the DB.",
          "Generate multiple sizes (thumbnail, feed, full) and serve them through the CDN.",
        ],
      },
      {
        heading: "3. The key decision: building the feed",
        table: {
          headers: ["Strategy", "How", "Best for"],
          rows: [
            ["Fan-out on write", "When you post, push it into every follower's precomputed feed", "Normal users — feeds load instantly"],
            ["Fan-out on read", "Build the feed by merging who-you-follow at read time", "Celebrities — avoids writing to millions of feeds"],
            ["Hybrid", "Fan-out-on-write for most, on-read for huge accounts", "Real systems — best of both"],
          ],
        },
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: fan-out-on-write for everyone. A celebrity with 50M followers triggers 50M feed writes per post — a 'write amplification storm'. Treat big accounts differently.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: images in object storage + CDN, and a hybrid fan-out feed precomputed in cache.",
          },
        ],
      },
    ],
  },

  "music-streaming": {
    summary:
      "Music streaming is about delivering audio smoothly to millions while recommending what to play next. Audio files live in object storage and stream through a CDN; the interesting logic is playlists, the play-event stream, and recommendations.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Streams audio chunks from edge servers near the listener.",
      "load-balancer": "Spreads API traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Handles login and subscription checks.",
      "app-server": "Runs playback, library, and playlist logic.",
      cache: "Holds hot metadata (tracks, playlists) and session state.",
      "message-queue": "Carries play events to analytics and recommendation pipelines.",
      "object-storage": "Stores the audio files (in multiple bitrates) durably.",
      "nosql-db": "Stores the music catalog, playlists, and listening history.",
      search: "Powers song/artist/album search.",
      monitoring: "Tracks streaming errors and latency.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a global radio network with a personal DJ. The songs are stored centrally but broadcast from towers near you (the CDN), and a DJ quietly learns your taste from what you play.",
          },
        ],
        bullets: [
          "What it must do: stream audio without buffering, manage playlists, and recommend tracks.",
          "How well: reads dominate, playback starts fast, smooth on flaky networks.",
        ],
      },
      {
        heading: "2. Streaming audio",
        bullets: [
          "Store each track in several bitrates; the client adapts to network speed (adaptive bitrate).",
          "Serve audio in small chunks via the CDN so playback starts immediately and survives hiccups.",
        ],
      },
      {
        heading: "3. Recommendations from the play stream",
        body: [
          "Every play/skip/like is an event. Stream those into an offline pipeline that builds 'Discover Weekly'-style recommendations — never compute them on the playback path.",
        ],
        callouts: [
          {
            kind: "tip",
            text: "In one line: audio in object storage streamed via CDN with adaptive bitrate, metadata in cache, and recommendations built offline from the play-event stream.",
          },
        ],
      },
    ],
  },

  "twitter-feed": {
    summary:
      "Twitter's hard problem is fan-out: when someone posts, it must appear in all their followers' timelines fast. Precompute timelines for normal users (fan-out on write), but handle celebrities with millions of followers differently (fan-out on read) to avoid write storms.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves media (images/video) from the edge.",
      "load-balancer": "Spreads traffic across app servers.",
      "api-gateway": "Single front door with routing and auth.",
      "auth-service": "Logs users in and verifies tokens.",
      "app-server": "Runs tweet, timeline, and follow logic.",
      cache: "Holds precomputed timelines and hot tweets for instant reads.",
      "message-queue": "Carries new-tweet events to fan-out workers.",
      "sql-db": "Stores the social graph (who follows whom).",
      "nosql-db": "Stores tweets and timeline entries at massive scale.",
      "object-storage": "Stores uploaded media.",
      search: "Powers full-text tweet search.",
      monitoring: "Tracks latency and fan-out lag.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a personalized newspaper per reader. For most authors you can pre-insert their story into each subscriber's edition. But a globally-famous columnist with 50 million subscribers would jam the presses — so their column is merged in only when each reader opens their paper.",
          },
        ],
        bullets: [
          "What it must do: post tweets, follow people, and show a ranked home timeline.",
          "How well: reads >> writes, timeline fresh within seconds, survive celebrity posts.",
        ],
      },
      {
        heading: "2. The key decision: fan-out",
        table: {
          headers: ["Strategy", "How", "Best for"],
          rows: [
            ["Fan-out on write", "Push each tweet into every follower's cached timeline", "Normal users — instant reads"],
            ["Fan-out on read", "Merge followed users' tweets at read time", "Celebrities — no write storm"],
            ["Hybrid", "Write for most, read-merge for big accounts", "What real Twitter does"],
          ],
        },
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: pure fan-out-on-write. One celebrity tweet = tens of millions of timeline writes. Set a follower threshold and switch big accounts to read-time merging.",
          },
        ],
      },
      {
        heading: "3. Putting it together",
        bullets: [
          "Post a tweet → store it, enqueue a fan-out job → workers push it into followers' cached timelines.",
          "Read timeline → return the precomputed list from cache, then merge in any followed celebrities at read time.",
        ],
        callouts: [
          {
            kind: "tip",
            text: "In one line: hybrid fan-out — precompute timelines in cache for normal users, merge celebrities at read time.",
          },
        ],
      },
    ],
  },

  "chat-system": {
    summary:
      "A chat system needs instant, two-way delivery, which HTTP request/response can't do well. The backbone is persistent WebSocket connections plus a way to route a message to whichever server holds the recipient's connection.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Spreads connections across the WebSocket servers.",
      "websocket-server": "Holds each user's live connection for real-time push — the core of chat.",
      "api-gateway": "Front door for non-realtime calls (history, profiles).",
      "auth-service": "Authenticates the connection on handshake.",
      "app-server": "Runs message, group, and presence logic.",
      cache: "Maps user → which server holds their connection, plus presence status.",
      "message-queue": "Routes messages between servers and buffers for offline users.",
      "nosql-db": "Stores message history at very high write volume.",
      "rate-limiter": "Stops spam and abuse.",
      monitoring: "Tracks connection counts and delivery latency.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "A regular API call is like mailing a letter and waiting for a reply. Chat needs an open phone line (a WebSocket) so either side can talk the instant they want to — no redialing.",
          },
        ],
        bullets: [
          "What it must do: 1:1 and group messages, delivery/read receipts, presence (online/offline), and offline delivery.",
          "How well: writes are heavy, delivery feels instant (<50ms), nothing is lost.",
        ],
      },
      {
        heading: "2. The routing problem",
        body: [
          "Users connect to different WebSocket servers. To deliver a message you must find which server holds the recipient. Keep a user→server map in a fast store (Redis); the sender's server publishes the message (often via a queue/pub-sub) to the recipient's server, which pushes it down the socket.",
        ],
        code: "A's server → look up B in Redis → publish to B's server → push over B's socket\nB offline? → store in queue/DB, deliver on reconnect",
      },
      {
        heading: "3. Deep dive: reliability & scale",
        bullets: [
          "Persist every message before acking, so nothing is lost if a server dies.",
          "For groups, fan the message out to each member's connection (or their offline store).",
          "WebSocket servers are stateful — use sticky routing and store the connection map externally so any server can find any user.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: keeping the user→connection map only in one server's memory. When you scale to many servers, they can't find each other's users. Put the map in a shared store.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: WebSocket servers for live delivery, a shared user→server map, a queue/pub-sub to route between servers, and durable message storage.",
          },
        ],
      },
    ],
  },

  "web-crawler": {
    summary:
      "A web crawler is a giant, polite, never-ending loop: pull a URL from a queue, download the page, extract new links, repeat — without re-crawling the same page, without hammering any one site, and without getting stuck in traps.",
    componentNotes: {
      "message-queue": "The frontier — the queue of URLs waiting to be crawled. The heart of the system.",
      "app-server": "The worker/fetcher that downloads pages and extracts links.",
      cache: "Holds the 'seen URLs' set so pages aren't crawled twice.",
      "rate-limiter": "Enforces politeness — limits requests per domain so you don't overload sites.",
      "nosql-db": "Stores page metadata and the URL-seen set durably.",
      "object-storage": "Stores the raw downloaded pages (HTML/blobs).",
      search: "Indexes crawled content so it can be searched.",
      monitoring: "Tracks crawl rate, errors, and queue depth.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like exploring a huge maze by leaving a trail. You keep a to-do list of corridors (URLs), mark rooms you've already visited so you don't loop forever, and avoid knocking on any one door too often.",
          },
        ],
        bullets: [
          "What it must do: fetch pages, extract and enqueue new links, store content, and avoid duplicates.",
          "How well: massive write volume, be polite per-domain, and resilient to bad/looping pages.",
        ],
      },
      {
        heading: "2. The crawl loop",
        code: "dequeue URL → already seen? skip\n            → fetch page (respect robots.txt + per-domain rate limit)\n            → store raw page, index content\n            → extract links → mark seen → enqueue new ones",
      },
      {
        heading: "3. The hard parts",
        bullets: [
          "Deduplication: a fast 'seen' set (cache + durable store) prevents re-crawling and infinite loops.",
          "Politeness: rate-limit per domain so you don't accidentally DDoS a site; obey robots.txt.",
          "Traps: cap crawl depth and detect near-duplicate/auto-generated pages.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: crawling without a per-domain rate limit. You'll overwhelm sites, get IP-banned, and look like an attack.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: a URL-frontier queue + stateless fetchers, a dedup 'seen' set, per-domain politeness, and raw pages in object storage.",
          },
        ],
      },
    ],
  },

  "file-storage": {
    summary:
      "Dropbox-style storage is about syncing files across a user's devices efficiently. The wins come from chunking files into blocks, only transferring the blocks that changed, and deduplicating identical blocks across all users.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Speeds up downloads of popular/shared files.",
      "load-balancer": "Spreads API traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Handles login and sharing permissions.",
      "app-server": "Runs sync, metadata, and sharing logic.",
      cache: "Holds hot file metadata for fast listing.",
      "message-queue": "Notifies a user's other devices that something changed.",
      "object-storage": "Stores the actual file blocks cheaply and durably — the bulk of storage.",
      "sql-db": "Stores the file/folder tree and sharing permissions (needs consistency).",
      "nosql-db": "Stores the block index and per-device sync state.",
      monitoring: "Tracks sync latency and storage usage.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Editing a shared document: instead of re-sending the whole book every time you fix a typo, you only send the changed page. Files are split into 'pages' (blocks) and only changed blocks move.",
          },
        ],
        bullets: [
          "What it must do: upload/download files, sync across devices, and share folders.",
          "How well: huge storage, efficient transfers, conflicts handled sanely.",
        ],
      },
      {
        heading: "2. The key idea: chunking + dedup",
        bullets: [
          "Split each file into fixed-size blocks; identify each block by a hash of its contents.",
          "On change, upload only blocks whose hash is new — unchanged blocks are skipped.",
          "Deduplicate: if a block's hash already exists (even from another user), don't store it again.",
        ],
        callouts: [
          {
            kind: "note",
            text: "Content-addressed storage = naming each block by the hash of its bytes, so identical content automatically shares one copy.",
          },
        ],
      },
      {
        heading: "3. Metadata vs blocks",
        body: [
          "Separate the two: file/folder structure and permissions go in a consistent SQL store (small, must be correct); the heavy block data goes in object storage. A device syncs by comparing block hashes and fetching only what it's missing.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: re-uploading the whole file on every save. For large files on slow connections that's unusable — diff at the block level.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: chunk files into hashed blocks, dedup and transfer only changes, keep metadata in SQL and blocks in object storage.",
          },
        ],
      },
    ],
  },

  ecommerce: {
    summary:
      "An e-commerce platform is many systems in one, but the make-or-break piece is inventory and checkout: never sell the same last item twice, and keep the catalog fast to browse. Browse paths are read-heavy and cacheable; checkout is write-heavy and must be correct.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves product images and static pages.",
      "load-balancer": "Spreads traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Handles user login and sessions.",
      "rate-limiter": "Protects checkout and APIs from abuse and bots.",
      "app-server": "Runs catalog, cart, order, and checkout logic.",
      cache: "Holds product details and inventory counts for fast browsing.",
      "message-queue": "Decouples order processing, emails, and shipping.",
      "sql-db": "Stores orders, payments, and inventory with transactions — the source of truth.",
      "nosql-db": "Stores the product catalog and carts at scale.",
      search: "Powers product search and filtering.",
      "object-storage": "Stores product images and assets.",
      monitoring: "Tracks checkout success and latency.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "A massive shop: the showroom (browsing) can show slightly old signs and that's fine, but the cash register (checkout) must be exact — two customers can never both buy the last unit.",
          },
        ],
        bullets: [
          "What it must do: browse/search products, manage a cart, check out, and track orders.",
          "How well: browsing is read-heavy and cacheable; checkout must be strongly consistent.",
        ],
      },
      {
        heading: "2. Split the two worlds",
        table: {
          headers: ["Path", "Consistency", "Why"],
          rows: [
            ["Browse / search", "Eventual (cached)", "A slightly stale price or stock badge is acceptable for speed"],
            ["Checkout / inventory", "Strong (transaction)", "Must never oversell or double-charge"],
          ],
        },
      },
      {
        heading: "3. Deep dive: don't oversell",
        body: [
          "At checkout, decrement stock inside a database transaction (or reserve it with a short hold). The displayed 'in stock' count can lag; the authoritative decrement happens at purchase time.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: checking stock when the item is added to the cart, then trusting it at payment. Two shoppers can both pass that check — decide at the transactional decrement, not at add-to-cart.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: cache the read-heavy catalog, run checkout/inventory in SQL transactions, and decouple post-order work via a queue.",
          },
        ],
      },
    ],
  },

  "ride-sharing": {
    summary:
      "Uber's core problem is matching: constantly track drivers' locations and, when a rider requests, find nearby drivers in milliseconds. That means a geospatial index for 'who's near here' and a stream of location updates flooding in.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Spreads traffic across app servers.",
      "rate-limiter": "Protects APIs from abuse.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Logs riders and drivers in.",
      "app-server": "Runs matching, trip, and pricing logic.",
      cache: "Holds live driver locations and the geo-index for instant nearby lookups.",
      "message-queue": "Decouples trip events, notifications, and billing.",
      "stream-processor": "Ingests the firehose of GPS pings and updates the geo-index in real time.",
      "nosql-db": "Stores live location and trip data at high write volume.",
      "sql-db": "Stores trips, payments, and receipts (needs consistency).",
      monitoring: "Tracks match times and trip success.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a taxi dispatcher with a live map full of moving pins. When you call, they glance at the pins near you and send the closest cab — they don't scan the whole city.",
          },
        ],
        bullets: [
          "What it must do: track drivers in real time, match a rider to nearby drivers, run the trip, and bill it.",
          "How well: write-heavy (constant GPS pings), matches in well under a second.",
        ],
      },
      {
        heading: "2. The key idea: a geospatial index",
        body: [
          "You can't scan every driver to find nearby ones. Divide the map into cells (geohash / quadtree / H3) and index drivers by cell. 'Find nearby' then means 'look at this cell and its neighbors' — a handful of cells instead of millions of drivers.",
        ],
        callouts: [
          {
            kind: "note",
            text: "Geohash / H3 = ways to chop the world into grid cells with short ids, so 'who's near me' becomes a fast lookup by cell.",
          },
        ],
      },
      {
        heading: "3. Handling the location firehose",
        bullets: [
          "Drivers ping their GPS every few seconds — millions of writes. Feed these through a stream processor that updates the in-memory geo-index, not a slow disk DB on every ping.",
          "Keep current locations in cache; persist trip records (which need consistency) in SQL.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: writing every GPS ping straight to a relational DB. The write volume crushes it — keep live location in memory and stream-process it.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: a cell-based geospatial index in memory, fed by a location stream, with trips/payments in SQL.",
          },
        ],
      },
    ],
  },

  "video-streaming": {
    summary:
      "YouTube is two systems: a heavy offline pipeline that ingests and transcodes uploads into many formats, and a massive read path that streams those videos worldwide through a CDN. The CDN does most of the work; your servers mostly serve metadata.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Streams video chunks from edge servers near viewers — the bulk of all traffic.",
      "load-balancer": "Spreads API traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Handles login and access control.",
      "rate-limiter": "Protects APIs and uploads from abuse.",
      "app-server": "Serves video metadata, comments, and the watch page.",
      cache: "Holds hot video metadata and view counts.",
      "message-queue": "Carries uploads into the transcoding pipeline.",
      "stream-processor": "Aggregates views/watch-time for trending and recommendations.",
      "object-storage": "Stores the raw and transcoded video files durably.",
      "sql-db": "Stores video and channel metadata.",
      search: "Powers video search.",
      monitoring: "Tracks playback errors and rebuffering.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a film studio plus a global cinema chain. Uploading is the studio: the master is processed into many formats. Watching is the cinemas: copies are pre-shipped to theaters (CDN edges) near every audience.",
          },
        ],
        bullets: [
          "What it must do: upload + process videos, then stream them smoothly to billions.",
          "How well: reads massively dominate writes, playback starts fast and adapts to bandwidth.",
        ],
      },
      {
        heading: "2. Upload & transcode (offline)",
        code: "upload → object storage → queue → transcode workers →\n   many resolutions/bitrates (240p…4K) split into chunks → CDN",
        body: ["Transcoding is slow and bursty, so it's fully asynchronous — the uploader gets a 'processing' status and the workers grind through it."],
      },
      {
        heading: "3. Playback (online)",
        bullets: [
          "Videos are pre-split into short chunks at multiple bitrates; the player switches bitrate as the network changes (adaptive streaming).",
          "The CDN serves chunks from the edge; your app servers only return metadata and the manifest.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: streaming video from your origin servers. Bandwidth costs and latency explode — the CDN must serve the bytes.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: async transcode into chunked multi-bitrate files in object storage, served via CDN with adaptive bitrate; servers handle only metadata.",
          },
        ],
      },
    ],
  },

  "payment-system": {
    summary:
      "A payment system's prime directive is correctness: never lose money, never double-charge, and survive crashes mid-transaction. That means idempotency on every request, careful state machines for each payment, and an audit trail you can replay.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Spreads traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Authenticates merchants and users.",
      "rate-limiter": "Protects against abuse and fraud bursts.",
      "app-server": "Runs the payment state machine and orchestration.",
      cache: "Holds idempotency keys and hot lookups.",
      "distributed-lock": "Ensures a single payment isn't processed twice concurrently.",
      "message-queue": "Drives async steps (capture, settlement, webhooks) reliably.",
      "sql-db": "The ledger — stores transactions with ACID guarantees. The source of truth.",
      "nosql-db": "Stores high-volume audit logs and events.",
      monitoring: "Tracks success rates and flags anomalies.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a bank teller with a strict logbook. Every move is written down before it happens, and if the teller faints mid-transaction, the next teller reads the log and finishes it exactly once — never twice.",
          },
        ],
        bullets: [
          "What it must do: charge, capture, refund, and settle payments across providers.",
          "How well: correct above all, strongly consistent, fully auditable.",
        ],
      },
      {
        heading: "2. The key idea: idempotency",
        body: [
          "Networks retry. Without protection, a retried 'charge' bills the customer twice. Every payment request carries a unique idempotency key; the first time you process it you record the result, and any repeat with the same key returns that stored result instead of charging again.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: treating a payment as a single update. It's a state machine (created → authorized → captured → settled/refunded); persist each transition so a crash can resume safely.",
          },
        ],
      },
      {
        heading: "3. Consistency & async steps",
        bullets: [
          "Keep the money ledger in an ACID SQL database — this is the one place strong consistency is non-negotiable.",
          "Use a distributed lock so the same payment can't be processed by two workers at once.",
          "Drive slow downstream steps (settlement, webhooks) through a durable queue with retries.",
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: idempotency keys + a per-payment state machine on an ACID ledger, with locks and durable queues for safe async steps.",
          },
        ],
      },
    ],
  },

  "ticket-booking": {
    summary:
      "Ticketmaster's nightmare is the on-sale spike: millions rush the same few thousand seats at once. You must never double-sell a seat, hold seats briefly while people pay, and keep the site standing under a thundering herd — often with a virtual waiting room.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves the static event pages to absorb the browse surge.",
      "load-balancer": "Spreads traffic across app servers.",
      "rate-limiter": "Throttles the rush and blocks bots.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Handles login.",
      "websocket-server": "Powers the live waiting-room / queue position updates.",
      "app-server": "Runs seat selection, holds, and booking logic.",
      cache: "Holds seat availability and active holds for fast checks.",
      "distributed-lock": "Guarantees only one buyer can grab a given seat at a time.",
      "message-queue": "Smooths the booking surge and drives confirmation/payment steps.",
      "sql-db": "Stores confirmed bookings and payments with transactions.",
      "nosql-db": "Stores seat maps and high-volume event data.",
      monitoring: "Tracks queue length and booking success.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like the doors opening for a blockbuster concert: a crowd sprints for the same seats. You need a bouncer (waiting room), a way to put a 'reserved' sticker on a seat while someone pays, and an ironclad rule that one seat = one buyer.",
          },
        ],
        bullets: [
          "What it must do: browse seats, temporarily hold a seat during checkout, and confirm the booking.",
          "How well: survive enormous spikes, never double-sell, release abandoned holds.",
        ],
      },
      {
        heading: "2. The key idea: hold-then-confirm",
        body: [
          "Selecting a seat places a short-lived hold (e.g. 5-10 minutes) backed by a lock, so no one else can take it. If payment completes, the hold becomes a booking; if it expires, the seat is released automatically.",
        ],
        code: "select seat → acquire lock + hold (TTL 8m) → pay →\n   success: convert to booking (SQL transaction)\n   timeout: hold expires → seat back on sale",
      },
      {
        heading: "3. Surviving the surge",
        bullets: [
          "A virtual waiting room (with live position over WebSocket) admits users in controlled batches instead of letting everyone hit the DB at once.",
          "Cache seat availability and absorb static browsing on the CDN; only the actual hold/booking touches the strongly-consistent path.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: no seat hold — just 'check then book'. Two users pass the check and both pay for seat 14A. Hold the seat with a lock the moment it's selected.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: locked hold-then-confirm for seats, a waiting room to tame the surge, and confirmed bookings in SQL transactions.",
          },
        ],
      },
    ],
  },

  "collaborative-editor": {
    summary:
      "Google Docs lets many people type in the same document at once without clobbering each other. The hard part is merging concurrent edits into one consistent result — solved with OT (Operational Transformation) or CRDTs — delivered live over WebSockets.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves the static editor app.",
      "load-balancer": "Spreads traffic across servers.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Handles login and document permissions.",
      "websocket-server": "Streams each keystroke/edit to all collaborators in real time.",
      "app-server": "Runs the merge logic (OT/CRDT) and document sessions.",
      cache: "Holds the live document state and presence (who's editing).",
      "message-queue": "Broadcasts edits between servers and to async savers.",
      "sql-db": "Stores document metadata and permissions.",
      "nosql-db": "Stores the document content and edit history.",
      "object-storage": "Stores large attachments/images and version snapshots.",
      monitoring: "Tracks sync latency and conflicts.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Two people writing on the same whiteboard at once. If both insert a word at position 5 simultaneously, you need a rule that lands both edits sensibly instead of overwriting one — and everyone must end up seeing the exact same board.",
          },
        ],
        bullets: [
          "What it must do: real-time multi-user editing, live cursors/presence, and consistent merged state.",
          "How well: edits feel instant (<100ms), everyone converges to the same document.",
        ],
      },
      {
        heading: "2. The key idea: merging concurrent edits",
        table: {
          headers: ["Approach", "Idea", "Trade-off"],
          rows: [
            ["OT (Operational Transformation)", "Transform each edit against others so positions stay correct", "Proven (Google Docs), but tricky server logic"],
            ["CRDT", "Data types that mathematically merge in any order", "Simpler conflict handling, more memory/metadata"],
          ],
        },
        callouts: [
          {
            kind: "note",
            text: "The goal of both is 'convergence': no matter what order edits arrive, every client ends up with the identical document.",
          },
        ],
      },
      {
        heading: "3. Delivering it live",
        bullets: [
          "Each client streams its edits over a WebSocket; the server merges and rebroadcasts to everyone.",
          "Keep the live document in cache for speed; persist edits/snapshots asynchronously so a crash doesn't lose work.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: last-write-wins on the whole document. Two simultaneous edits and one person's work silently vanishes. You need OT/CRDT merging, not overwrite.",
          },
        ],
      },
      {
        heading: "4. Trade-offs & summary",
        callouts: [
          {
            kind: "tip",
            text: "In one line: OT or CRDT to merge concurrent edits, streamed over WebSockets, with live state in cache and async persistence.",
          },
        ],
      },
    ],
  },

  "team-messaging": {
    summary:
      "Slack is chat organized around channels and workspaces, with heavy history search and integrations. It blends real-time delivery (WebSockets) with a strong need to store, organize, and search large message archives.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves the static app and shared files.",
      "load-balancer": "Spreads connections and API calls.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Handles login and workspace membership.",
      "websocket-server": "Delivers messages and typing/presence in real time.",
      "app-server": "Runs channel, message, and integration logic.",
      cache: "Holds recent channel messages and presence for instant loads.",
      "message-queue": "Fans messages out to members and drives integrations/webhooks.",
      "nosql-db": "Stores the large message history at scale.",
      "object-storage": "Stores uploaded files and images.",
      search: "Indexes all messages for fast history search.",
      "rate-limiter": "Protects APIs and integrations.",
      monitoring: "Tracks delivery latency and errors.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a building of meeting rooms (channels). People come and go; conversations are recorded; and months later someone needs to find 'that message about the budget' — so the archive and its search matter as much as live chat.",
          },
        ],
        bullets: [
          "What it must do: channels/workspaces, real-time messages, threads, file sharing, and full-history search.",
          "How well: instant delivery, durable searchable history, integrations.",
        ],
      },
      {
        heading: "2. Real-time + durable history",
        bullets: [
          "WebSockets deliver new messages live; every message is also persisted and indexed for later.",
          "Fan a channel message out to all connected members (via queue/pub-sub), and store it for those offline.",
          "Recent messages live in cache for instant channel switching; older ones load from the store on scroll.",
        ],
      },
      {
        heading: "3. Search is a first-class feature",
        body: [
          "Unlike ephemeral chat, Slack's value is the searchable archive. Index every message in a search engine so users can filter by channel, person, and date instantly.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: querying the primary database with LIKE '%term%' for search. It's painfully slow at scale — use a dedicated search index.",
          },
          {
            kind: "tip",
            text: "In one line: WebSocket delivery + queue fan-out for live chat, durable message storage, and a search index over the full history.",
          },
        ],
      },
    ],
  },

  "metrics-monitoring": {
    summary:
      "A monitoring system swallows a torrent of time-stamped numbers from thousands of servers, stores them efficiently, and answers dashboard queries and alerts fast. The core is a time-series database plus aggressive downsampling so old data stays cheap.",
    componentNotes: {
      "load-balancer": "Spreads the metric-ingest traffic across collectors.",
      "api-gateway": "Front door for queries and the agents pushing metrics.",
      "app-server": "Collectors that receive metrics and the query service that serves dashboards.",
      "message-queue": "Buffers the incoming metric firehose so spikes don't drop data.",
      cache: "Caches recent/hot query results for snappy dashboards.",
      "timeseries-db": "The heart — stores time-stamped metrics with downsampling and retention.",
      "sql-db": "Stores alert rules and dashboard config.",
      search: "Indexes logs/labels for fast filtering.",
      "auth-service": "Controls who can see which dashboards.",
      monitoring: "(meta) the system also watches itself.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like the flight recorders of a whole fleet streaming readings nonstop. You keep every second of the last hour, but for last year you only need a reading per minute — so you compress the past instead of storing it all at full detail.",
          },
        ],
        bullets: [
          "What it must do: ingest metrics from many sources, store them, power dashboards, and fire alerts.",
          "How well: write-dominated (far more writes than reads), fast range queries, cheap long-term retention.",
        ],
      },
      {
        heading: "2. The key idea: time-series storage + downsampling",
        body: [
          "Time-series databases store (metric, timestamp, value) far more compactly than a general DB. Downsampling rolls old high-resolution data into coarser summaries (1s → 1m → 1h) so storage and queries stay cheap as data ages.",
        ],
        callouts: [
          {
            kind: "note",
            text: "Downsampling = keeping fine detail recently and progressively coarser averages for older data, under a retention policy.",
          },
        ],
      },
      {
        heading: "3. Ingest & query paths",
        bullets: [
          "Buffer the incoming firehose through a queue so a spike (or a slow DB) never drops metrics.",
          "Cache hot dashboard queries; evaluate alert rules on the stream so problems fire within seconds.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: storing metrics in a regular relational DB. The write volume and time-range scans overwhelm it — use a purpose-built time-series store.",
          },
          {
            kind: "tip",
            text: "In one line: queue-buffered ingest into a time-series DB with downsampling/retention, cached queries, and stream-based alerting.",
          },
        ],
      },
    ],
  },

  netflix: {
    summary:
      "Netflix is a streaming platform where the CDN is the product: pre-positioned copies of each title sit close to viewers so playback starts instantly. Your services handle catalog, profiles, and recommendations; the bytes come from the edge.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Streams video from edge caches near viewers — the overwhelming majority of traffic.",
      "load-balancer": "Spreads API traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Handles login and subscription/profile checks.",
      "app-server": "Serves the catalog, playback manifests, and watch state.",
      cache: "Holds hot metadata and 'continue watching' state.",
      "message-queue": "Carries view events to analytics and recommendation pipelines.",
      "nosql-db": "Stores catalog, profiles, and viewing history at scale.",
      "object-storage": "Stores the master and transcoded video files.",
      search: "Powers title search.",
      "stream-processor": "Aggregates viewing data for recommendations and trending.",
      monitoring: "Tracks playback quality and errors.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a cinema chain that ships copies of every film to theaters near you before opening night. When you press play, the reel is already next door — no waiting for it to travel from headquarters.",
          },
        ],
        bullets: [
          "What it must do: browse a catalog, stream video smoothly, resume across devices, and recommend titles.",
          "How well: reads dominate, playback starts in well under a second, adapts to bandwidth.",
        ],
      },
      {
        heading: "2. The key idea: pre-position content at the edge",
        body: [
          "Netflix pushes popular titles to CDN/edge caches ahead of demand. Playback pulls chunked, multi-bitrate video from the nearest edge; your origin servers only hand out metadata and the manifest.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: serving video bytes from your own data center. The bandwidth bill and latency are unworkable at this scale — the CDN must serve playback.",
          },
        ],
      },
      {
        heading: "3. Recommendations",
        body: ["View/skip/rating events stream into an offline pipeline that builds personalized rows. This never runs on the playback path."],
        callouts: [
          {
            kind: "tip",
            text: "In one line: chunked multi-bitrate video pre-positioned on the CDN, metadata services behind it, recommendations built offline from the view stream.",
          },
        ],
      },
    ],
  },

  tinder: {
    summary:
      "Tinder is location-based matching plus the swipe. The two interesting pieces: find nearby candidate profiles fast (a geospatial index), and detect a mutual like ('match') the instant both people swipe right.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves profile photos from the edge.",
      "load-balancer": "Spreads traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "app-server": "Runs recommendation, swipe, and match logic.",
      cache: "Holds the deck of candidates and recent swipes for fast access.",
      "nosql-db": "Stores profiles, swipes, and matches at scale.",
      "object-storage": "Stores profile photos.",
      "message-queue": "Notifies users of matches and messages asynchronously.",
      "stream-processor": "Processes swipe events for ranking and match detection.",
      monitoring: "Tracks match rates and latency.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a deck of cards dealt from people standing near you. You flip through (swipe), and if two people both keep each other's card, they're introduced.",
          },
        ],
        bullets: [
          "What it must do: show nearby profiles, record swipes, and detect mutual likes (matches).",
          "How well: fast candidate loading, match notification feels instant.",
        ],
      },
      {
        heading: "2. Finding nearby people",
        body: [
          "Use a geospatial index (geohash/quadtree) keyed by location so 'profiles within N km' is a quick cell lookup, not a full scan. Precompute and cache each user's candidate deck so swiping is instant.",
        ],
      },
      {
        heading: "3. Detecting a match",
        bullets: [
          "Store swipes as (from → to, like/pass). On a right-swipe, check whether the other person already liked you; if so, it's a match.",
          "A reverse-lookup in cache makes this O(1) instead of scanning swipe history.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: scanning the swipes table to detect matches. Keep a fast 'who liked whom' lookup so a match is detected on the spot.",
          },
          {
            kind: "tip",
            text: "In one line: a geospatial index for nearby candidates, a cached deck for swiping, and a reverse like-lookup for instant matches.",
          },
        ],
      },
    ],
  },

  "google-maps": {
    summary:
      "Maps has two giant jobs: render the map (tiles served from a CDN) and compute routes across a road graph with live traffic. The clever parts are precomputed map tiles and shortest-path algorithms that work on continent-sized graphs.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves precomputed map image tiles from the edge.",
      "load-balancer": "Spreads routing/search traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "app-server": "Runs routing, search, and tile-serving logic.",
      cache: "Holds hot tiles and popular routes.",
      "nosql-db": "Stores map data and places at huge scale.",
      "object-storage": "Stores the rendered tile images.",
      "stream-processor": "Ingests live GPS/traffic data to update travel times.",
      "timeseries-db": "Stores traffic-speed history per road segment.",
      monitoring: "Tracks routing latency and errors.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Two products in one: a printed atlas (pre-drawn map tiles you just fetch) and a GPS routing brain (find the fastest road path, adjusting for current traffic).",
          },
        ],
        bullets: [
          "What it must do: display the map, search places, and compute routes with live traffic.",
          "How well: huge read volume, fast routes, traffic reasonably fresh.",
        ],
      },
      {
        heading: "2. Map tiles",
        body: [
          "The world is pre-rendered into image tiles at many zoom levels. Panning just fetches tiles from the CDN — no live rendering per request.",
        ],
      },
      {
        heading: "3. Routing on a giant graph",
        bullets: [
          "Model roads as a weighted graph (edges = segments, weights = travel time). Plain Dijkstra is too slow continent-wide, so precompute shortcuts (contraction hierarchies) to answer routes in milliseconds.",
          "Live GPS/traffic streams update edge weights so routes reflect current conditions.",
        ],
        callouts: [
          {
            kind: "note",
            text: "Contraction hierarchies = precomputing shortcut edges so long routes can skip over many small roads, turning a slow search into a fast one.",
          },
          {
            kind: "tip",
            text: "In one line: pre-rendered tiles via CDN, plus shortest-path on a precomputed road graph whose weights are updated by a live traffic stream.",
          },
        ],
      },
    ],
  },

  zoom: {
    summary:
      "Video conferencing is a real-time media problem. The key choice is the topology — how audio/video streams flow between participants. Small calls can be peer-to-peer; larger calls route through a media server (SFU) so each person uploads once.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Assigns meetings to media servers and spreads API traffic.",
      "api-gateway": "Single front door with auth and routing.",
      "websocket-server": "Carries signaling (join/leave, negotiation) and chat.",
      "app-server": "Runs meeting lifecycle and participant management.",
      cache: "Holds active meeting and participant state.",
      "nosql-db": "Stores meeting metadata and chat.",
      "object-storage": "Stores cloud recordings.",
      "message-queue": "Drives recording, transcription, and notifications.",
      monitoring: "Tracks call quality (jitter, packet loss).",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "A group phone call with video. If everyone sends their video to everyone directly, a big call drowns in connections. So a 'switchboard' (media server) takes each person's single feed and relays it to the rest.",
          },
        ],
        bullets: [
          "What it must do: real-time audio/video for many participants, screen share, chat, and recording.",
          "How well: very low latency (<50ms feel), graceful on poor networks.",
        ],
      },
      {
        heading: "2. The key decision: media topology",
        table: {
          headers: ["Topology", "How", "Best for"],
          rows: [
            ["P2P mesh", "Everyone sends to everyone", "Tiny calls (2-3 people)"],
            ["SFU (selective forwarding)", "Each sends once to a server that forwards", "Most group calls — scales well"],
            ["MCU (mixing)", "Server mixes into one stream", "Very constrained clients, but CPU-heavy"],
          ],
        },
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: peer-to-peer mesh for large meetings. With N people each uploads N-1 streams — it collapses fast. Route through an SFU.",
          },
        ],
      },
      {
        heading: "3. Signaling vs media",
        body: [
          "Separate the two: lightweight signaling (who's joining, negotiation) goes over WebSockets; the heavy audio/video flows over UDP/WebRTC through the media servers. Recordings are processed asynchronously and stored as blobs.",
        ],
        callouts: [
          {
            kind: "tip",
            text: "In one line: WebSocket signaling + SFU media servers for real-time streams, with async recording to object storage.",
          },
        ],
      },
    ],
  },

  "food-delivery": {
    summary:
      "Food delivery is a three-sided, real-time logistics problem: customers, restaurants, and couriers. The hard parts are matching orders to nearby drivers and tracking everyone live on a map — much like ride-sharing, plus the restaurant step.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves restaurant images and the static app.",
      "load-balancer": "Spreads traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "app-server": "Runs ordering, matching, and tracking logic.",
      cache: "Holds live courier locations and restaurant menus.",
      "message-queue": "Coordinates order state across customer, restaurant, and courier.",
      "nosql-db": "Stores live order/location data at high write volume.",
      "sql-db": "Stores orders and payments (needs consistency).",
      "stream-processor": "Processes courier GPS and ETA updates in real time.",
      monitoring: "Tracks delivery times and order success.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a dispatcher juggling three groups at once: diners placing orders, kitchens cooking them, and drivers on a live map. The job is to keep all three in sync and pick the best driver for each order.",
          },
        ],
        bullets: [
          "What it must do: browse/order food, route the order to the restaurant, match a courier, and track delivery live.",
          "How well: real-time location, accurate ETAs, order state always consistent.",
        ],
      },
      {
        heading: "2. Matching & tracking",
        bullets: [
          "Use a geospatial index to find couriers near the restaurant when an order is ready (same idea as ride-sharing).",
          "Stream courier GPS to update locations and ETAs live; keep current positions in cache, not on disk per ping.",
        ],
      },
      {
        heading: "3. Order state machine",
        body: [
          "An order moves placed → accepted → preparing → picked-up → delivered. Drive these transitions through a queue so the three parties stay coordinated, and keep the order/payment record consistent in SQL.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: writing every GPS ping to the orders database. Separate hot location data (cache/stream) from the consistent order record.",
          },
          {
            kind: "tip",
            text: "In one line: geospatial courier matching + live location streaming, with an order state machine coordinated via a queue and stored in SQL.",
          },
        ],
      },
    ],
  },

  reddit: {
    summary:
      "Reddit is communities of posts with nested comment trees and ranking. The interesting bits are computing 'hot' rankings efficiently and storing/rendering deeply nested comment threads without slow recursive queries.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves images and the static app.",
      "load-balancer": "Spreads traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "app-server": "Runs feed, post, comment, and voting logic.",
      cache: "Holds hot listings and precomputed rankings for fast loads.",
      "nosql-db": "Stores posts and comment trees at scale.",
      "sql-db": "Stores users, subreddits, and relationships.",
      search: "Powers post and comment search.",
      "message-queue": "Processes votes and ranking updates asynchronously.",
      monitoring: "Tracks latency and error rates.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like thousands of community bulletin boards. Each board ranks notes by a mix of votes and freshness, and notes grow branching threads of replies underneath them.",
          },
        ],
        bullets: [
          "What it must do: communities, posts, nested comments, voting, and ranked feeds.",
          "How well: read-heavy, hot rankings fresh enough, deep comment trees load fast.",
        ],
      },
      {
        heading: "2. Ranking",
        body: [
          "'Hot' combines votes and time via a scoring formula. Don't recompute it per request — update scores as votes arrive (through the queue) and cache the ranked listings.",
        ],
      },
      {
        heading: "3. Nested comments",
        bullets: [
          "Recursively querying a parent→child table is slow for deep threads. Store a materialized path (or closure table) so a whole subtree loads in one query.",
          "Cache the rendered top of popular threads.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: fetching comments with a recursive query per level. Deep threads cause N round-trips — use a path/closure model to load the tree at once.",
          },
          {
            kind: "tip",
            text: "In one line: precomputed cached rankings updated from a vote queue, and comment trees stored with materialized paths.",
          },
        ],
      },
    ],
  },

  airbnb: {
    summary:
      "Airbnb is search-and-book over listings. The two hard parts: rich geo + availability search (find places in an area, for these dates, matching filters), and booking without double-reserving the same dates.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves listing photos and the static app.",
      "load-balancer": "Spreads traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "app-server": "Runs search, listing, and booking logic.",
      cache: "Holds hot search results and listing details.",
      "sql-db": "Stores bookings and payments with transactions — prevents double-booking.",
      "nosql-db": "Stores listings and host data at scale.",
      search: "Powers geo + filter + availability search.",
      "object-storage": "Stores listing photos.",
      "message-queue": "Drives notifications and post-booking workflows.",
      monitoring: "Tracks search latency and booking success.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a hotel-booking desk for millions of independent rooms: you filter by area, dates, and amenities, then reserve specific dates — and no two guests can hold the same room for overlapping nights.",
          },
        ],
        bullets: [
          "What it must do: search listings by location/dates/filters, view details, and book.",
          "How well: rich search is fast, bookings never overlap.",
        ],
      },
      {
        heading: "2. Search",
        body: [
          "Combine geo filtering with attributes and availability in a search engine, not raw SQL — users filter by map area, price, dates, and amenities and expect instant results. Cache popular searches.",
        ],
      },
      {
        heading: "3. Booking without overlaps",
        bullets: [
          "Store bookings as date ranges per listing; a new booking must not overlap an existing one.",
          "Enforce it transactionally (a range/exclusion check at commit), so two guests can't grab the same nights.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: checking availability on the listing page, then booking later. Availability can change in between — validate and reserve the dates inside the booking transaction.",
          },
          {
            kind: "tip",
            text: "In one line: a geo+filter search index for discovery, and transactional date-range reservations to prevent overlaps.",
          },
        ],
      },
    ],
  },

  whatsapp: {
    summary:
      "WhatsApp is messaging at planet scale (billions of users, a million writes/sec). It's chat distilled: persistent connections, a user→server routing layer, store-and-forward for offline users, and very lean per-message storage.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Spreads the enormous connection load across servers.",
      "websocket-server": "Holds each user's persistent connection for instant delivery.",
      "app-server": "Runs messaging, group, and presence logic.",
      cache: "Maps user → connection server, and holds presence.",
      "message-queue": "Routes messages between servers and stores for offline delivery.",
      "nosql-db": "Stores undelivered messages and metadata at extreme write volume.",
      "object-storage": "Stores media (photos/voice/video) separately from messages.",
      monitoring: "Tracks delivery latency and connection health.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "A global post office where most letters are delivered the instant they're sent (recipient online), and the rest are held at the local branch until the recipient comes back (offline). The key is finding which branch holds each person.",
          },
        ],
        bullets: [
          "What it must do: 1:1 + group messaging, delivery/read receipts, offline delivery, media.",
          "How well: extreme write volume, near-instant delivery, minimal storage per message.",
        ],
      },
      {
        heading: "2. Delivery & routing",
        body: [
          "Each user holds a persistent connection to some server. To deliver, look up the recipient's server in a fast map and forward the message; if they're offline, store it and push on reconnect (store-and-forward).",
        ],
        code: "send → look up recipient's server → online? push over socket\n                                  offline? queue/store → deliver on reconnect",
      },
      {
        heading: "3. Lean storage at scale",
        bullets: [
          "Classic WhatsApp deletes messages from the server once delivered — keeping storage tiny despite the volume.",
          "Media goes to object storage; the message just carries a reference, not the bytes.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: storing full chat history server-side forever and embedding media in messages. At a million writes/sec that's ruinous — store-and-forward, keep media separate.",
          },
          {
            kind: "tip",
            text: "In one line: persistent connections + a user→server map, store-and-forward for offline users, and lean message storage with media in object storage.",
          },
        ],
      },
    ],
  },

  "search-engine": {
    summary:
      "A web search engine has two halves: an offline pipeline that crawls and builds an inverted index of the whole web, and an online path that answers a query in ~200ms by looking up that index and ranking results. The inverted index is the core idea.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves the static results page assets.",
      "load-balancer": "Spreads query traffic across app servers.",
      "api-gateway": "Single front door with routing.",
      "app-server": "Parses the query, fans out to index shards, and merges/ranks results.",
      cache: "Caches results for popular queries.",
      "nosql-db": "Stores crawled documents and metadata.",
      search: "The inverted index — maps each word to the documents containing it.",
      "message-queue": "Carries crawled pages into the indexing pipeline.",
      "object-storage": "Stores raw crawled pages.",
      "stream-processor": "Builds and updates the index from the crawl stream.",
      monitoring: "Tracks query latency and index freshness.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like the index at the back of a giant library's worth of books. Instead of reading every book when you ask a question, you flip to the index that says 'this word appears in books 3, 17, 92' and jump straight there.",
          },
        ],
        bullets: [
          "What it must do: crawl the web, index it, and return ranked results for a query fast.",
          "How well: huge corpus, query latency ~200ms, results reasonably fresh and well-ranked.",
        ],
      },
      {
        heading: "2. The key idea: the inverted index",
        body: [
          "An inverted index maps each term → the list of documents containing it (a 'posting list'). A query intersects the posting lists for its words. Built offline from the crawl, it's sharded across many machines because it's enormous.",
        ],
        callouts: [
          {
            kind: "note",
            text: "Inverted index = word → list of documents that contain it. It's what makes 'find pages with these words' fast instead of scanning everything.",
          },
        ],
      },
      {
        heading: "3. Query path & ranking",
        bullets: [
          "Fan the query out to all index shards in parallel, gather candidate docs, then rank them (relevance + popularity signals like PageRank).",
          "Cache popular queries; most search traffic is repeated.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: scanning documents at query time. You must precompute the inverted index offline — live scanning can't hit 200ms over the web.",
          },
          {
            kind: "tip",
            text: "In one line: crawl → build a sharded inverted index offline; at query time, intersect posting lists across shards, rank, and cache.",
          },
        ],
      },
    ],
  },

  "location-service": {
    summary:
      "Yelp-style 'what's near me' is a geospatial search problem: given a location and filters (cuisine, rating, open-now), return nearby businesses fast. The core is indexing places by location so proximity queries don't scan everything.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves business photos and the static app.",
      "load-balancer": "Spreads traffic across app servers.",
      "api-gateway": "Single front door with routing and auth.",
      "app-server": "Runs nearby-search and business logic.",
      cache: "Holds popular area results and hot business details.",
      "nosql-db": "Stores businesses and reviews at scale.",
      search: "Geospatial + attribute index for fast 'nearby + filtered' queries.",
      "object-storage": "Stores business photos.",
      monitoring: "Tracks search latency.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like asking a local 'good coffee near here, open now?'. They don't list every café in the city — they think of the few blocks around you and filter from there.",
          },
        ],
        bullets: [
          "What it must do: search businesses by location + filters, view details and reviews.",
          "How well: read-heavy, sub-200ms nearby search.",
        ],
      },
      {
        heading: "2. The key idea: geospatial indexing",
        body: [
          "Index businesses by location using geohash/quadtree cells, combined with attributes (category, rating, hours). 'Nearby + filtered' becomes a lookup over a few cells plus a filter — not a full table scan with distance math on every row.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: computing distance to every business per query. At scale that's far too slow — index by geo cell first, then filter.",
          },
          {
            kind: "tip",
            text: "In one line: a geospatial + attribute search index for fast nearby-filtered queries, with hot areas cached.",
          },
        ],
      },
    ],
  },

  tiktok: {
    summary:
      "TikTok is a recommendation-first short-video feed: the 'For You' feed must serve an endless stream of clips the user will love. Video delivery is CDN-based (like other streaming apps), but the differentiator is the real-time recommendation pipeline.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Streams short clips from the edge — most of the traffic.",
      "load-balancer": "Spreads API traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "app-server": "Serves the feed, uploads, and interactions.",
      cache: "Holds each user's precomputed candidate feed for instant scrolling.",
      "message-queue": "Carries upload + interaction events to processing pipelines.",
      "nosql-db": "Stores videos, users, and interaction data at scale.",
      "object-storage": "Stores the video files.",
      search: "Powers hashtag/sound/user search.",
      "stream-processor": "Turns the interaction firehose into fresh recommendations in near-real-time.",
      monitoring: "Tracks playback quality and feed latency.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a TV channel that rewrites its lineup for you every few seconds based on what you just watched, lingered on, or skipped — and the next clip is always ready to play instantly.",
          },
        ],
        bullets: [
          "What it must do: upload short videos and serve an endless personalized 'For You' feed.",
          "How well: instant playback, recommendations adapt almost immediately to behavior.",
        ],
      },
      {
        heading: "2. The key idea: a real-time recommendation feed",
        body: [
          "Every watch/skip/like/replay is an event. A streaming pipeline turns these into a continuously updated candidate set per user; the app serves a precomputed deck from cache so scrolling never waits on a model.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: ranking the whole catalog live on each swipe. Precompute a candidate feed and refresh it from the interaction stream instead.",
          },
        ],
      },
      {
        heading: "3. Video delivery",
        body: ["Clips are short and replayed heavily, so the CDN caches them extremely effectively; the next few clips are prefetched so playback is instant."],
        callouts: [
          {
            kind: "tip",
            text: "In one line: CDN-served prefetched clips, plus a streaming recommendation pipeline feeding a cached per-user candidate deck.",
          },
        ],
      },
    ],
  },

  "message-queue-design": {
    summary:
      "Building Kafka means designing the queue itself: an append-only, partitioned commit log that durably stores a firehose of messages and lets many consumers read at their own pace. Partitioning gives scale; the append-only log gives speed and replayability.",
    componentNotes: {
      "load-balancer": "Routes producers/consumers to the right brokers.",
      "app-server": "The brokers — they own partitions and serve reads/writes.",
      "nosql-db": "Backs durable log segment storage and offsets.",
      "distributed-lock": "Coordinates leader election for each partition.",
      "service-discovery": "Lets producers/consumers find brokers and partition leaders.",
      monitoring: "Tracks throughput, lag, and broker health.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a long paper tape where every message is written in order, one after another. Writers only ever append to the end; readers each keep a bookmark and move it forward at their own speed — and can rewind to re-read.",
          },
        ],
        bullets: [
          "What it must do: accept messages from producers, store them durably, and let multiple consumer groups read independently.",
          "How well: million/sec throughput, low latency, no data loss, replayable.",
        ],
      },
      {
        heading: "2. The key idea: partitioned append-only log",
        bullets: [
          "Each topic is split into partitions; each partition is an ordered, append-only log. Appending sequentially is extremely fast (no random writes).",
          "Partitioning across brokers is how you scale throughput horizontally.",
          "Consumers track their own offset (bookmark), so they read at their pace and can replay from any point.",
        ],
        callouts: [
          {
            kind: "note",
            text: "Offset = a consumer's bookmark into a partition. Because messages aren't deleted on read, consumers can rewind and reprocess.",
          },
        ],
      },
      {
        heading: "3. Durability & ordering",
        bullets: [
          "Replicate each partition to several brokers; one is the leader, others are followers ready to take over.",
          "Order is guaranteed within a partition (not across partitions) — pick a partition key for messages that must stay ordered together.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: expecting global ordering across the whole topic. Ordering holds per partition only — route related messages to the same partition.",
          },
          {
            kind: "tip",
            text: "In one line: partitioned append-only logs replicated across brokers, with per-consumer offsets for independent, replayable reads.",
          },
        ],
      },
    ],
  },

  "digital-wallet": {
    summary:
      "A digital wallet / UPI moves money between accounts, so correctness is everything: balances must always add up, transfers are atomic (both sides succeed or neither), and retries never double-spend. It's a payment system centered on a strict ledger.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      "load-balancer": "Spreads traffic across app servers.",
      "api-gateway": "Single front door with auth and routing.",
      "auth-service": "Strongly authenticates users (money is involved).",
      "rate-limiter": "Throttles abuse and fraud attempts.",
      "app-server": "Runs the transfer logic and orchestration.",
      cache: "Holds idempotency keys and hot balance reads.",
      "distributed-lock": "Prevents concurrent transfers from corrupting a balance.",
      "message-queue": "Drives async settlement, notifications, and reconciliation.",
      "sql-db": "The ledger — double-entry, ACID transactions. The source of truth.",
      "nosql-db": "Stores the high-volume transaction audit log.",
      monitoring: "Tracks success rates and flags anomalies.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a bank ledger where every transfer is two entries — money out of one account, into another — recorded together. If only half is written, the books don't balance, so both must commit as one.",
          },
        ],
        bullets: [
          "What it must do: hold balances and transfer money between accounts reliably.",
          "How well: strongly consistent, atomic transfers, idempotent, fully auditable.",
        ],
      },
      {
        heading: "2. The key ideas: atomic + idempotent",
        bullets: [
          "Use double-entry bookkeeping in an ACID transaction: debit and credit commit together or not at all.",
          "Every transfer carries an idempotency key so a network retry returns the original result instead of moving money twice.",
          "Lock the accounts involved so two concurrent transfers can't both read the same balance and overspend.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: debit one account, then credit the other as two separate updates. A crash in between loses money. They must be one atomic transaction.",
          },
        ],
      },
      {
        heading: "3. Scale without losing correctness",
        body: [
          "Keep the ledger in a strongly-consistent SQL store; push slow steps (notifications, bank settlement, reconciliation) onto a durable queue. Reconcile continuously to catch any drift.",
        ],
        callouts: [
          {
            kind: "tip",
            text: "In one line: double-entry ACID ledger + idempotency keys + account locks, with async settlement via a durable queue.",
          },
        ],
      },
    ],
  },

  "code-editor": {
    summary:
      "An online code editor (Replit-style) combines a collaborative text editor with running untrusted code safely. Two challenges: real-time co-editing (like Google Docs) and sandboxed execution so user code can't harm your servers.",
    componentNotes: {
      dns: "Turns the domain name into a server address.",
      cdn: "Serves the heavy editor front-end app.",
      "load-balancer": "Spreads traffic across servers.",
      "api-gateway": "Single front door with auth and routing.",
      "websocket-server": "Streams edits, cursors, and program output in real time.",
      "app-server": "Runs project logic and orchestrates execution sandboxes.",
      cache: "Holds live document state and sessions.",
      "message-queue": "Queues build/run jobs for sandbox workers.",
      "nosql-db": "Stores projects and files.",
      "object-storage": "Stores larger files and build artifacts.",
      monitoring: "Tracks editor latency and sandbox health.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "A shared whiteboard you can also press 'run' on. Several people edit together, and the code runs in a sealed glass box so that whatever it does, it can't reach out and damage the room.",
          },
        ],
        bullets: [
          "What it must do: collaborative editing, file management, and running user code with live output.",
          "How well: edits feel instant, execution is isolated and resource-limited.",
        ],
      },
      {
        heading: "2. Real-time editing",
        body: [
          "Same as a collaborative editor: stream edits over WebSockets and merge concurrent changes (OT/CRDT) so everyone converges. Keep live state in cache, persist asynchronously.",
        ],
      },
      {
        heading: "3. The key risk: running untrusted code",
        bullets: [
          "Execute each run in an isolated sandbox (container/microVM) with no access to your network or other users.",
          "Enforce strict CPU, memory, and time limits, and tear the sandbox down after the run.",
          "Stream stdout/stderr back over the WebSocket so output appears live.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: running user code directly on the app server. It's a remote-code-execution hole — always sandbox with hard resource limits.",
          },
          {
            kind: "tip",
            text: "In one line: OT/CRDT collaborative editing over WebSockets, plus sandboxed, resource-limited execution with streamed output.",
          },
        ],
      },
    ],
  },

  "cicd-pipeline": {
    summary:
      "A CI/CD system runs builds and tests on every code push and deploys the results. It's a distributed job system: queue incoming jobs, run them on a pool of isolated workers, stream logs live, and store artifacts — with stages that gate one another.",
    componentNotes: {
      "load-balancer": "Spreads webhook/API traffic across servers.",
      "api-gateway": "Receives Git webhooks and API calls.",
      "app-server": "Orchestrates pipelines and assigns jobs to workers.",
      cache: "Caches dependencies and build layers to speed up runs.",
      "message-queue": "The job queue — buffers builds for the worker pool.",
      "sql-db": "Stores pipeline definitions, run history, and status.",
      "object-storage": "Stores build artifacts and logs.",
      "task-scheduler": "Runs scheduled/cron pipelines and retries.",
      monitoring: "Tracks build times, queue depth, and failures.",
    },
    sections: [
      {
        heading: "1. Understand the problem",
        callouts: [
          {
            kind: "analogy",
            text:
              "Like a factory assembly line triggered whenever new parts arrive (a code push). Each item moves through stations — build, test, deploy — and only advances if the previous station passed.",
          },
        ],
        bullets: [
          "What it must do: trigger on push, run build/test/deploy stages on isolated workers, show live logs, store artifacts.",
          "How well: handle bursty job spikes, isolate jobs, retry flaky steps.",
        ],
      },
      {
        heading: "2. The key idea: a distributed job queue",
        body: [
          "A push creates a job that goes onto a queue; a pool of workers pulls jobs and runs them in clean, isolated environments. Workers scale with demand so a spike (everyone pushes before lunch) just lengthens the queue rather than failing.",
        ],
        code: "git push → webhook → enqueue pipeline →\n   worker pulls job → build → test → deploy (each stage gates the next)\n   stream logs live · store artifacts",
      },
      {
        heading: "3. Stages, isolation & speed",
        bullets: [
          "Each run uses a fresh isolated environment (container) so builds can't contaminate each other.",
          "Cache dependencies/layers to make repeat builds fast.",
          "Stages gate progression; a failed test stops the deploy.",
        ],
        callouts: [
          {
            kind: "warning",
            text: "Common mistake: running builds on shared, long-lived machines. State leaks between builds and causes flaky, unreproducible results — use clean isolated workers.",
          },
          {
            kind: "tip",
            text: "In one line: webhook-triggered jobs on a queue, run by an autoscaling pool of isolated workers, with cached deps, gated stages, live logs, and artifacts in object storage.",
          },
        ],
      },
    ],
  },

};

export function getEditorial(id: string): Editorial | undefined {
  return EDITORIALS[id];
}
