import type { ProblemInterviewData } from "./interviewData";

/**
 * Answer keys for the problems not covered by the original INTERVIEW_DATA set.
 * Same shape as the base data (requirements, follow-ups, reference APIs, data
 * model, estimation hints); merged into INTERVIEW_DATA at module load so every
 * built-in problem has a key for Advanced mode, the drills, and the interviewer.
 */
export const INTERVIEW_DATA_EXTRA: ProblemInterviewData[] = [
  // ───────────────────────── Netflix ─────────────────────────
  {
    problemId: "netflix",
    requirements: [
      { id: "r1", text: "Stream video on demand at multiple bitrates (adaptive)", category: "functional", importance: "critical" },
      { id: "r2", text: "Browse/search a catalog with personalized recommendations", category: "functional", importance: "critical" },
      { id: "r3", text: "Resume playback across devices; track watch history", category: "functional", importance: "important" },
      { id: "r4", text: "Global low-latency start time (< 100ms to first byte from edge)", category: "non-functional", importance: "critical" },
      { id: "r5", text: "Read-heavy (~60:1); 2 PB+ of encoded video", category: "non-functional", importance: "critical" },
      { id: "r6", text: "99.99% availability for playback", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you deliver multi-petabyte video globally with low start time?", category: "optimization", hint: "Edge caching + adaptive bitrate", answer: "Pre-push popular encodes to CDN/ISP edge caches (Open Connect), serve manifests that let the client adaptively switch bitrate, and keep the origin (object storage) only for cache misses and the long tail." },
      { id: "q2", question: "How do you transcode efficiently for many devices?", category: "scale", hint: "Async pipeline, chunked", answer: "On upload, split the master into chunks and fan them out to a transcoding worker pool via a queue, producing each rendition in parallel; store outputs in object storage and invalidate CDN." },
      { id: "q3", question: "How are recommendations served at read scale?", category: "scale", hint: "Precompute offline", answer: "Precompute per-user rankings in batch/stream jobs, write them to a fast store (cache/NoSQL), and serve them read-only at request time rather than computing on the hot path." },
      { id: "q4", question: "What happens when an edge cache is cold or down?", category: "failure", hint: "Fallback hierarchy", answer: "Fall back to a regional cache, then origin shield, then object-storage origin. Playback degrades to a lower bitrate rather than failing." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/titles/{id}/manifest", description: "Adaptive-bitrate playback manifest (HLS/DASH)", response: "{ manifestUrl, bitrates[], drmToken }" },
      { method: "GET", path: "/api/v1/home", description: "Personalized home rows for the user", response: "{ rows: [{ title, items[] }] }" },
      { method: "POST", path: "/api/v1/playback/heartbeat", description: "Report playback position for resume", requestBody: "{ titleId, positionMs }", response: "{ ok: true }" },
      { method: "GET", path: "/api/v1/search", description: "Search the catalog", response: "{ results[] }" },
    ],
    dataModel: [
      { name: "titles", type: "nosql", fields: [{ name: "title_id", type: "string", note: "PK" }, { name: "metadata", type: "json" }, { name: "encodings", type: "json", note: "rendition → object-storage URLs" }], partitionKey: "title_id" },
      { name: "watch_history", type: "nosql", fields: [{ name: "user_id", type: "string", note: "PK" }, { name: "title_id", type: "string" }, { name: "position_ms", type: "int" }, { name: "updated_at", type: "datetime" }], partitionKey: "user_id" },
      { name: "recommendations", type: "cache", fields: [{ name: "user_id", type: "string", note: "key" }, { name: "ranked_title_ids", type: "list" }] },
    ],
    estimationHints: {
      dailyActiveUsers: "325M subscribers, ~5 streams/session ≈ hundreds of millions of plays/day",
      readWriteRatio: "~60:1 read-heavy — playback/browse vastly exceed uploads",
      storagePerItem: "~1.5 GB per title across all renditions; catalog totals 2 PB+",
      peakMultiplier: "3x during evening prime time, staggered by timezone",
    },
  },

  // ───────────────────────── Tinder ─────────────────────────
  {
    problemId: "tinder",
    requirements: [
      { id: "r1", text: "Recommend nearby profiles; swipe left/right", category: "functional", importance: "critical" },
      { id: "r2", text: "Create a match when two users mutually like", category: "functional", importance: "critical" },
      { id: "r3", text: "Chat once matched", category: "functional", importance: "important" },
      { id: "r4", text: "Geospatial + preference filtering at low latency", category: "non-functional", importance: "critical" },
      { id: "r5", text: "Write-heavy swipes (~50K/s)", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you find nearby candidates fast?", category: "optimization", hint: "Geohash / quadtree", answer: "Index profiles by geohash (or an S2/quadtree) in a geospatial store; query the user's cell plus neighbors, then filter by preferences in the app tier." },
      { id: "q2", question: "How do you detect a match without races?", category: "consistency", hint: "Store likes, check reverse", answer: "On a like, write (liker→likee) and check for the reverse edge; if present, atomically create a match. A single-key conditional write or a lock avoids double-creating." },
      { id: "q3", question: "How do you absorb 50K swipes/sec?", category: "scale", hint: "Queue + NoSQL", answer: "Append swipes to a partitioned NoSQL store keyed by user; buffer match/notification processing through a queue so the write path stays fast." },
      { id: "q4", question: "How do you avoid showing the same profile repeatedly?", category: "optimization", hint: "Seen set", answer: "Keep a per-user 'seen' set (cache/bloom filter) and exclude already-swiped ids from recommendations." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/recommendations", description: "Nearby candidate profiles", response: "{ profiles[] }" },
      { method: "POST", path: "/api/v1/swipe", description: "Record a like/pass", requestBody: "{ targetId, direction: 'like'|'pass' }", response: "{ matched: boolean, matchId? }" },
      { method: "GET", path: "/api/v1/matches", description: "List the user's matches", response: "{ matches[] }" },
    ],
    dataModel: [
      { name: "profiles", type: "nosql", fields: [{ name: "user_id", type: "string", note: "PK" }, { name: "geohash", type: "string", note: "indexed" }, { name: "prefs", type: "json" }], partitionKey: "geohash", indexes: ["geohash"] },
      { name: "swipes", type: "nosql", fields: [{ name: "user_id", type: "string", note: "PK" }, { name: "target_id", type: "string" }, { name: "direction", type: "string" }], partitionKey: "user_id" },
      { name: "matches", type: "nosql", fields: [{ name: "match_id", type: "string", note: "PK" }, { name: "user_a", type: "string" }, { name: "user_b", type: "string" }], partitionKey: "match_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "75M MAU; ~10M DAU each swiping ~100/day",
      readWriteRatio: "~2:1 — recommendations read vs. swipe writes",
      storagePerItem: "~1 KB per swipe; billions of swipes ≈ 100 TB",
      peakMultiplier: "3x in the evening",
    },
  },

  // ───────────────────────── Google Maps ─────────────────────────
  {
    problemId: "google-maps",
    requirements: [
      { id: "r1", text: "Render map tiles and compute routes (ETA, turn-by-turn)", category: "functional", importance: "critical" },
      { id: "r2", text: "Incorporate live traffic into routing", category: "functional", importance: "critical" },
      { id: "r3", text: "Search places / geocoding", category: "functional", importance: "important" },
      { id: "r4", text: "Massive read scale (1B DAU) at low latency", category: "non-functional", importance: "critical" },
      { id: "r5", text: "Ingest high-volume GPS probes for traffic", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you serve map tiles at this scale?", category: "optimization", hint: "Static + CDN", answer: "Pre-render tiles per zoom level as immutable objects and serve them from a CDN; only dynamic overlays (traffic) hit the backend." },
      { id: "q2", question: "How is routing computed quickly over a huge graph?", category: "optimization", hint: "Precomputed contraction hierarchies", answer: "Partition the road graph and precompute shortcuts (contraction hierarchies / transit nodes) so queries explore far fewer edges; cache popular routes." },
      { id: "q3", question: "How do you fold in live traffic?", category: "scale", hint: "Stream GPS probes", answer: "Stream anonymized GPS probes into a stream processor that updates per-edge speed estimates in a time-series store; routing reads current edge weights." },
      { id: "q4", question: "How do you keep ETAs fresh without recomputing everything?", category: "optimization", hint: "Edge-weight deltas", answer: "Update only edges whose speed changed and invalidate affected cached routes; most of the graph is static between updates." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/tiles/{z}/{x}/{y}", description: "Map tile", response: "image/png (CDN-cached)" },
      { method: "GET", path: "/api/v1/route", description: "Route + ETA between points", requestBody: "{ from, to, mode }", response: "{ polyline, etaSec, steps[] }" },
      { method: "GET", path: "/api/v1/geocode", description: "Place search / geocoding", response: "{ results[] }" },
    ],
    dataModel: [
      { name: "road_graph", type: "nosql", fields: [{ name: "edge_id", type: "string", note: "PK" }, { name: "from_node", type: "string" }, { name: "to_node", type: "string" }, { name: "base_cost", type: "float" }], partitionKey: "edge_id" },
      { name: "edge_speeds", type: "nosql", fields: [{ name: "edge_id", type: "string", note: "PK" }, { name: "current_speed", type: "float" }, { name: "ts", type: "datetime" }], partitionKey: "edge_id", note: "time-series of live speeds" },
      { name: "places", type: "search", fields: [{ name: "place_id", type: "string" }, { name: "name", type: "string" }, { name: "geo", type: "geo" }] },
    ],
    estimationHints: {
      dailyActiveUsers: "1B DAU; routing + tile reads dominate",
      readWriteRatio: "~5:1 reads to probe writes",
      storagePerItem: "Map/imagery data totals petabytes; per-edge speed ~100 bytes",
      peakMultiplier: "4x at commute hours",
    },
  },

  // ───────────────────────── Zoom ─────────────────────────
  {
    problemId: "zoom",
    requirements: [
      { id: "r1", text: "Real-time audio/video conferencing for many participants", category: "functional", importance: "critical" },
      { id: "r2", text: "Join via meeting id; presence and signaling", category: "functional", importance: "critical" },
      { id: "r3", text: "Optional cloud recording", category: "functional", importance: "important" },
      { id: "r4", text: "Ultra-low media latency (< 50ms region-local)", category: "non-functional", importance: "critical" },
      { id: "r5", text: "Scale to large meetings without N² streams", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you avoid N² media streams in big meetings?", category: "scale", hint: "SFU vs mesh", answer: "Use a Selective Forwarding Unit (media server): each client sends one upstream and the SFU forwards the needed downstreams, instead of a full mesh between every pair." },
      { id: "q2", question: "What protocol for media vs signaling?", category: "optimization", hint: "UDP for media", answer: "WebRTC over UDP/SRTP for media (loss-tolerant, low latency); a WebSocket/signaling channel for join, ICE, and control messages." },
      { id: "q3", question: "How do you keep latency low globally?", category: "optimization", hint: "Region-local media servers", answer: "Route participants to the nearest media server region and interconnect regions only when participants span them; pick servers via geo-aware routing." },
      { id: "q4", question: "How is recording handled without hurting the live call?", category: "failure", hint: "Off-path", answer: "A separate recording worker subscribes to the SFU streams, composites and writes to object storage asynchronously — it never blocks live forwarding." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/meetings", description: "Create a meeting", response: "{ meetingId, joinUrl }" },
      { method: "GET", path: "/api/v1/meetings/{id}/join", description: "Get media server + ICE config to join", response: "{ sfuEndpoint, iceServers[], token }" },
      { method: "WS", path: "/ws/signaling/{meetingId}", description: "Signaling channel (offer/answer/ICE, presence)" },
    ],
    dataModel: [
      { name: "meetings", type: "nosql", fields: [{ name: "meeting_id", type: "string", note: "PK" }, { name: "host_id", type: "string" }, { name: "settings", type: "json" }], partitionKey: "meeting_id" },
      { name: "participants", type: "cache", fields: [{ name: "meeting_id", type: "string", note: "key" }, { name: "participant_id", type: "string" }, { name: "sfu_node", type: "string" }] },
      { name: "recordings", type: "nosql", fields: [{ name: "meeting_id", type: "string", note: "PK" }, { name: "object_url", type: "string", note: "object storage" }], partitionKey: "meeting_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "300M daily participants; concurrency is the real driver",
      readWriteRatio: "~1:1 — media is symmetric send/receive",
      storagePerItem: "Recording ~1 GB/hour; signaling state is tiny",
      peakMultiplier: "3-4x during business hours",
    },
  },

  // ───────────────────────── DoorDash ─────────────────────────
  {
    problemId: "food-delivery",
    requirements: [
      { id: "r1", text: "Browse restaurants/menus; place orders", category: "functional", importance: "critical" },
      { id: "r2", text: "Match orders to nearby drivers; live tracking", category: "functional", importance: "critical" },
      { id: "r3", text: "Payments and order state machine", category: "functional", importance: "critical" },
      { id: "r4", text: "Low-latency browse; reliable order writes", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you match an order to a driver?", category: "optimization", hint: "Geospatial + scoring", answer: "Query drivers within the delivery radius (geohash index), score by ETA/load/rating, and assign via a dispatch service; retry/expand radius if none accept." },
      { id: "q2", question: "How is live driver location tracked?", category: "scale", hint: "Stream + cache", answer: "Drivers push location updates into a stream; the latest position lands in a cache for instant reads, with a time-series store for history." },
      { id: "q3", question: "How do you keep order/payment state consistent?", category: "consistency", hint: "State machine + SQL", answer: "Model the order as a state machine in a transactional (SQL) store; use idempotency keys for payment and a queue for side effects (notifications, receipts)." },
      { id: "q4", question: "What happens if the assigned driver cancels?", category: "failure", hint: "Reassign", answer: "Move the order back to 'searching', exclude that driver, and re-run dispatch; surface delay to the customer." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/restaurants", description: "Browse nearby restaurants", response: "{ restaurants[] }" },
      { method: "POST", path: "/api/v1/orders", description: "Place an order", requestBody: "{ restaurantId, items[], address }", response: "{ orderId, status }" },
      { method: "GET", path: "/api/v1/orders/{id}/track", description: "Live order + driver location", response: "{ status, driverLocation }" },
    ],
    dataModel: [
      { name: "orders", type: "sql", fields: [{ name: "order_id", type: "uuid", note: "PK" }, { name: "user_id", type: "string" }, { name: "restaurant_id", type: "string" }, { name: "status", type: "enum" }, { name: "total", type: "decimal" }], partitionKey: "order_id" },
      { name: "driver_locations", type: "cache", fields: [{ name: "driver_id", type: "string", note: "key" }, { name: "geo", type: "geo" }, { name: "ts", type: "datetime" }] },
      { name: "restaurants", type: "nosql", fields: [{ name: "restaurant_id", type: "string", note: "PK" }, { name: "geohash", type: "string" }, { name: "menu", type: "json" }], partitionKey: "geohash" },
    ],
    estimationHints: {
      dailyActiveUsers: "46M MAU; browse vastly exceeds orders",
      readWriteRatio: "~2:1 browse reads to order writes",
      storagePerItem: "~2 KB per order; menus larger but few",
      peakMultiplier: "4x at lunch and dinner",
    },
  },

  // ───────────────────────── Reddit ─────────────────────────
  {
    problemId: "reddit",
    requirements: [
      { id: "r1", text: "Post links/text to subreddits; nested comments", category: "functional", importance: "critical" },
      { id: "r2", text: "Vote on posts/comments; ranked feeds (hot/top/new)", category: "functional", importance: "critical" },
      { id: "r3", text: "Search posts and subreddits", category: "functional", importance: "important" },
      { id: "r4", text: "Read-heavy (~10:1); ranking must feel fresh", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you compute hot ranking efficiently?", category: "optimization", hint: "Precompute, decay", answer: "Compute a time-decayed score on vote events via a stream/worker and keep sorted feeds per subreddit in a cache; reads just page the precomputed list." },
      { id: "q2", question: "How do you store deeply nested comments?", category: "optimization", hint: "Materialized path", answer: "Store a materialized path or closure table so a subtree loads in one query; paginate large threads and lazy-load deep replies." },
      { id: "q3", question: "How do you handle vote spikes on a viral post?", category: "scale", hint: "Buffer counts", answer: "Aggregate votes through a queue/sharded counter and update the score periodically rather than a row update per vote (hot-key problem)." },
      { id: "q4", question: "How do you keep counts roughly consistent?", category: "consistency", hint: "Eventual", answer: "Vote counts are eventually consistent — approximate counts are fine; the durable record is the vote events, reconciled in the background." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/r/{sub}/posts", description: "Create a post", requestBody: "{ title, body|url }", response: "{ postId }" },
      { method: "GET", path: "/api/v1/r/{sub}/hot", description: "Hot feed for a subreddit", response: "{ posts[], cursor }" },
      { method: "POST", path: "/api/v1/posts/{id}/vote", description: "Up/down vote", requestBody: "{ dir: 1|-1 }", response: "{ ok: true }" },
      { method: "GET", path: "/api/v1/comments/{postId}", description: "Comment tree", response: "{ comments[] }" },
    ],
    dataModel: [
      { name: "posts", type: "nosql", fields: [{ name: "post_id", type: "string", note: "PK" }, { name: "sub", type: "string" }, { name: "author", type: "string" }, { name: "score", type: "int" }, { name: "created_at", type: "datetime" }], partitionKey: "sub", indexes: ["sub,score"] },
      { name: "comments", type: "sql", fields: [{ name: "comment_id", type: "uuid", note: "PK" }, { name: "post_id", type: "string" }, { name: "path", type: "string", note: "materialized path" }], partitionKey: "post_id" },
      { name: "feed_cache", type: "cache", fields: [{ name: "sub:hot", type: "string", note: "key" }, { name: "ranked_post_ids", type: "list" }] },
    ],
    estimationHints: {
      dailyActiveUsers: "97M DAU; mostly lurkers reading feeds",
      readWriteRatio: "~10:1 read-heavy",
      storagePerItem: "~1-2 KB per post/comment",
      peakMultiplier: "3x during peak hours / viral events",
    },
  },

  // ───────────────────────── Airbnb ─────────────────────────
  {
    problemId: "airbnb",
    requirements: [
      { id: "r1", text: "Search listings by location/dates/filters", category: "functional", importance: "critical" },
      { id: "r2", text: "Book a listing without double-booking", category: "functional", importance: "critical" },
      { id: "r3", text: "Reviews, messaging, payments", category: "functional", importance: "important" },
      { id: "r4", text: "Strong consistency on availability/booking", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you prevent double-booking?", category: "consistency", hint: "Transaction + lock", answer: "Hold availability in a transactional store; book with a conditional update/lock on the (listing, date-range) so only one reservation can win, inside a DB transaction." },
      { id: "q2", question: "How do you make search fast with many filters?", category: "optimization", hint: "Search index + geo", answer: "Index listings in a search engine with geo + faceted filters; the SQL store remains source of truth for availability/booking." },
      { id: "q3", question: "How do you handle the booking → payment flow reliably?", category: "failure", hint: "Saga / idempotency", answer: "Use a saga: reserve availability, charge payment (idempotent), confirm; compensate (release hold) if payment fails. A queue drives the steps." },
      { id: "q4", question: "How do you keep the search index in sync with listings?", category: "consistency", hint: "CDC / events", answer: "Emit change events on listing/availability writes and update the search index asynchronously (eventually consistent search is acceptable)." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/search", description: "Search listings", requestBody: "{ location, checkIn, checkOut, filters }", response: "{ listings[] }" },
      { method: "GET", path: "/api/v1/listings/{id}/availability", description: "Calendar availability", response: "{ dates[] }" },
      { method: "POST", path: "/api/v1/bookings", description: "Book a listing", requestBody: "{ listingId, checkIn, checkOut }", response: "{ bookingId, status }" },
    ],
    dataModel: [
      { name: "listings", type: "sql", fields: [{ name: "listing_id", type: "uuid", note: "PK" }, { name: "host_id", type: "string" }, { name: "geo", type: "geo" }, { name: "price", type: "decimal" }], partitionKey: "listing_id" },
      { name: "bookings", type: "sql", fields: [{ name: "booking_id", type: "uuid", note: "PK" }, { name: "listing_id", type: "string" }, { name: "date_range", type: "daterange", note: "exclusion constraint" }, { name: "status", type: "enum" }], partitionKey: "listing_id" },
      { name: "listing_search", type: "search", fields: [{ name: "listing_id", type: "string" }, { name: "geo", type: "geo" }, { name: "facets", type: "json" }] },
    ],
    estimationHints: {
      dailyActiveUsers: "50M DAU; search dominates, bookings are rare",
      readWriteRatio: "~10:1 search reads to booking writes",
      storagePerItem: "~5 KB per listing incl. photos metadata",
      peakMultiplier: "3x in travel-planning season",
    },
  },

  // ───────────────────────── WhatsApp ─────────────────────────
  {
    problemId: "whatsapp",
    requirements: [
      { id: "r1", text: "1:1 and group messaging with delivery/read receipts", category: "functional", importance: "critical" },
      { id: "r2", text: "Online/last-seen presence", category: "functional", importance: "important" },
      { id: "r3", text: "Offline delivery when recipient reconnects", category: "functional", importance: "critical" },
      { id: "r4", text: "Extremely write-heavy (~1M msgs/s); < 50ms delivery", category: "non-functional", importance: "critical" },
      { id: "r5", text: "End-to-end ordering per conversation", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you absorb 1M messages/sec of writes?", category: "scale", hint: "Partition by conversation", answer: "Persist messages to a wide-column NoSQL store partitioned by conversation id (sequential within a conversation), and fan out delivery through a queue — never a single relational primary." },
      { id: "q2", question: "How are online vs offline users handled?", category: "failure", hint: "Connection registry + store", answer: "A WebSocket gateway tracks which server holds each connection; deliver in real time if online, else persist to the user's inbox and push on reconnect." },
      { id: "q3", question: "How do you guarantee per-conversation ordering?", category: "consistency", hint: "Sequence numbers", answer: "Assign a monotonically increasing sequence per conversation; clients sort and request gaps. Cross-conversation ordering isn't required." },
      { id: "q4", question: "How do group messages scale (fan-out)?", category: "optimization", hint: "Server-side fan-out", answer: "Write once to the group log and fan out to members' inboxes server-side; for huge groups, deliver on read to avoid write amplification." },
    ],
    referenceAPIs: [
      { method: "WS", path: "/ws/connect", description: "Persistent connection for send/receive + presence" },
      { method: "POST", path: "/api/v1/messages", description: "Send a message (fallback/REST)", requestBody: "{ conversationId, body }", response: "{ messageId, seq }" },
      { method: "GET", path: "/api/v1/conversations/{id}/messages", description: "Fetch history / missed messages", response: "{ messages[], cursor }" },
    ],
    dataModel: [
      { name: "messages", type: "nosql", fields: [{ name: "conversation_id", type: "string", note: "PK" }, { name: "seq", type: "int", note: "clustering key" }, { name: "sender", type: "string" }, { name: "body", type: "blob" }], partitionKey: "conversation_id" },
      { name: "inbox", type: "nosql", fields: [{ name: "user_id", type: "string", note: "PK" }, { name: "undelivered", type: "list" }], partitionKey: "user_id" },
      { name: "connections", type: "cache", fields: [{ name: "user_id", type: "string", note: "key" }, { name: "gateway_node", type: "string" }] },
    ],
    estimationHints: {
      dailyActiveUsers: "3B MAU; ~100B messages/day",
      readWriteRatio: "write-heavy — sends far exceed history reads",
      storagePerItem: "~200 bytes per message (often deleted after delivery)",
      peakMultiplier: "2x evenings; spikes on holidays",
    },
  },

  // ───────────────────────── Search Engine ─────────────────────────
  {
    problemId: "search-engine",
    requirements: [
      { id: "r1", text: "Crawl and index the web", category: "functional", importance: "critical" },
      { id: "r2", text: "Serve ranked results for a query in < 200ms", category: "functional", importance: "critical" },
      { id: "r3", text: "Spelling/autocomplete; freshness for news", category: "functional", importance: "important" },
      { id: "r4", text: "Petabyte-scale index; huge read QPS", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How is the inverted index served at low latency?", category: "optimization", hint: "Shard + scatter-gather", answer: "Shard the inverted index by document range across many nodes; a query scatters to shards, each returns top-k, and a merger gathers and re-ranks. Cache popular queries." },
      { id: "q2", question: "How do you keep the index fresh?", category: "scale", hint: "Crawl + incremental", answer: "Crawlers stream new/changed docs through a pipeline that updates segments incrementally; a separate fresh tier handles news with low-latency indexing." },
      { id: "q3", question: "How do you rank?", category: "optimization", hint: "Multi-stage", answer: "Cheap retrieval (term match/BM25) to get candidates, then expensive ML re-ranking on the top few hundred — keeps cost bounded." },
      { id: "q4", question: "How do you handle a hot/viral query?", category: "scale", hint: "Cache + replicas", answer: "Serve from a results cache and replicate hot shards; the long tail of unique queries hits the index directly." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/search", description: "Ranked results for a query", requestBody: "{ q, page }", response: "{ results[], total }" },
      { method: "GET", path: "/api/v1/autocomplete", description: "Query suggestions", response: "{ suggestions[] }" },
    ],
    dataModel: [
      { name: "inverted_index", type: "search", fields: [{ name: "term", type: "string", note: "shard key" }, { name: "postings", type: "list", note: "doc ids + positions" }], partitionKey: "term" },
      { name: "doc_store", type: "nosql", fields: [{ name: "doc_id", type: "string", note: "PK" }, { name: "url", type: "string" }, { name: "snippet", type: "string" }], partitionKey: "doc_id" },
      { name: "query_cache", type: "cache", fields: [{ name: "query", type: "string", note: "key" }, { name: "results", type: "json" }] },
    ],
    estimationHints: {
      dailyActiveUsers: "8.5B queries/day ≈ ~100K QPS average",
      readWriteRatio: "~10:1 query reads vs index writes",
      storagePerItem: "Index is petabytes; per-doc metadata ~few KB",
      peakMultiplier: "3x at peak; news spikes are bursty",
    },
  },

  // ───────────────────────── Yelp / Location ─────────────────────────
  {
    problemId: "location-service",
    requirements: [
      { id: "r1", text: "Find businesses near a location with filters", category: "functional", importance: "critical" },
      { id: "r2", text: "Business details, photos, reviews/ratings", category: "functional", importance: "critical" },
      { id: "r3", text: "Proximity search ranked by distance + rating", category: "functional", importance: "important" },
      { id: "r4", text: "Read-heavy; low-latency geo queries", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you do proximity search efficiently?", category: "optimization", hint: "Geohash / quadtree", answer: "Index businesses by geohash or a quadtree; query the cell + neighbors and rank by distance and rating. A search engine handles text + geo + facets." },
      { id: "q2", question: "How do you serve a read-heavy workload?", category: "scale", hint: "Cache hot areas", answer: "Cache results for popular areas/queries and business detail pages; the search index and NoSQL store back cache misses." },
      { id: "q3", question: "How do ratings stay correct under many reviews?", category: "consistency", hint: "Aggregate async", answer: "Store individual reviews durably; recompute/aggregate the average via a worker so the rating is eventually consistent without contention." },
      { id: "q4", question: "How do you keep the index updated when businesses change?", category: "consistency", hint: "Events", answer: "Emit change events on business/review writes; update the search index asynchronously." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/search", description: "Nearby businesses", requestBody: "{ lat, lng, radius, filters }", response: "{ businesses[] }" },
      { method: "GET", path: "/api/v1/businesses/{id}", description: "Business detail + reviews", response: "{ business, reviews[] }" },
      { method: "POST", path: "/api/v1/businesses/{id}/reviews", description: "Add a review", requestBody: "{ rating, text }", response: "{ reviewId }" },
    ],
    dataModel: [
      { name: "businesses", type: "search", fields: [{ name: "business_id", type: "string" }, { name: "geo", type: "geo", note: "indexed" }, { name: "categories", type: "list" }, { name: "rating", type: "float" }] },
      { name: "reviews", type: "nosql", fields: [{ name: "business_id", type: "string", note: "PK" }, { name: "review_id", type: "string" }, { name: "rating", type: "int" }], partitionKey: "business_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "33M monthly uniques; search-dominated",
      readWriteRatio: "~20:1 reads to review writes",
      storagePerItem: "~3 KB per business; photos in object storage",
      peakMultiplier: "3x around meal times",
    },
  },

  // ───────────────────────── TikTok ─────────────────────────
  {
    problemId: "tiktok",
    requirements: [
      { id: "r1", text: "Upload short videos; infinite personalized feed", category: "functional", importance: "critical" },
      { id: "r2", text: "Likes/comments/shares; follow graph", category: "functional", importance: "important" },
      { id: "r3", text: "Instant video start; aggressive prefetch", category: "non-functional", importance: "critical" },
      { id: "r4", text: "Recommendation quality drives everything", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How does the For-You feed scale?", category: "scale", hint: "Precompute candidates + rank", answer: "A stream pipeline generates candidate videos per user from engagement signals; rank with an ML model and cache the next-N so the feed is instant and prefetchable." },
      { id: "q2", question: "How do you make playback start instantly?", category: "optimization", hint: "CDN + prefetch", answer: "Serve encodes from CDN edges and prefetch the next few videos while the current one plays; adaptive bitrate for varying networks." },
      { id: "q3", question: "How do you process uploads at scale?", category: "scale", hint: "Async transcode", answer: "Queue uploads to a transcoding worker pool producing multiple renditions to object storage, then publish to the candidate pool — the user's upload returns immediately." },
      { id: "q4", question: "How do engagement counts stay fast under virality?", category: "optimization", hint: "Sharded counters", answer: "Aggregate likes/views via sharded counters / stream processing rather than per-event row updates (hot-key avoidance)." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/feed", description: "Personalized For-You feed", response: "{ videos[], cursor }" },
      { method: "POST", path: "/api/v1/videos", description: "Upload a video", requestBody: "{ file, caption }", response: "{ videoId, status }" },
      { method: "POST", path: "/api/v1/videos/{id}/like", description: "Like a video", response: "{ ok: true }" },
    ],
    dataModel: [
      { name: "videos", type: "nosql", fields: [{ name: "video_id", type: "string", note: "PK" }, { name: "author", type: "string" }, { name: "encodings", type: "json", note: "object-storage URLs" }, { name: "stats", type: "json" }], partitionKey: "video_id" },
      { name: "feed_candidates", type: "cache", fields: [{ name: "user_id", type: "string", note: "key" }, { name: "ranked_video_ids", type: "list" }] },
      { name: "engagement", type: "nosql", fields: [{ name: "video_id", type: "string", note: "PK" }, { name: "likes", type: "counter" }, { name: "views", type: "counter" }], partitionKey: "video_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "1.5B MAU; very high feed read volume",
      readWriteRatio: "~10:1 feed reads to uploads/engagement",
      storagePerItem: "~5-10 MB per short video across renditions; 5 PB total",
      peakMultiplier: "3x in the evening",
    },
  },

  // ───────────────────────── Distributed Message Queue ─────────────────────────
  {
    problemId: "message-queue-design",
    requirements: [
      { id: "r1", text: "Publish/subscribe to topics with partitions", category: "functional", importance: "critical" },
      { id: "r2", text: "Durable, ordered log per partition; consumer offsets", category: "functional", importance: "critical" },
      { id: "r3", text: "At-least-once delivery; replay from offset", category: "functional", importance: "critical" },
      { id: "r4", text: "Very high throughput (~1M msgs/s) at low latency", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you get both high throughput and ordering?", category: "scale", hint: "Partitioned log", answer: "Order within a partition only; parallelize across partitions. Append-only segment files with sequential I/O and zero-copy reads give huge throughput." },
      { id: "q2", question: "How is durability achieved without losing throughput?", category: "failure", hint: "Replication + ISR", answer: "Replicate each partition to N brokers; a write is acked once the in-sync replica set persists it. Leader election (via a coordination service) handles broker failure." },
      { id: "q3", question: "How do consumers track progress?", category: "consistency", hint: "Offsets", answer: "Consumers commit offsets per partition; on restart they resume from the committed offset. At-least-once means consumers must be idempotent." },
      { id: "q4", question: "How do you rebalance consumers in a group?", category: "scale", hint: "Coordination service", answer: "A coordinator assigns partitions to group members and triggers a rebalance when membership changes; only one consumer in a group reads a given partition." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/topics/{topic}/produce", description: "Append records to a partition", requestBody: "{ key, value }", response: "{ partition, offset }" },
      { method: "GET", path: "/topics/{topic}/consume", description: "Fetch records from an offset", requestBody: "{ partition, offset, maxBytes }", response: "{ records[] }" },
      { method: "POST", path: "/groups/{group}/commit", description: "Commit consumer offset", requestBody: "{ partition, offset }", response: "{ ok: true }" },
    ],
    dataModel: [
      { name: "partition_log", type: "nosql", fields: [{ name: "topic_partition", type: "string", note: "PK" }, { name: "offset", type: "long", note: "clustering" }, { name: "record", type: "blob" }], partitionKey: "topic_partition", note: "append-only segments" },
      { name: "offsets", type: "nosql", fields: [{ name: "group_partition", type: "string", note: "PK" }, { name: "committed_offset", type: "long" }], partitionKey: "group_partition" },
    ],
    estimationHints: {
      dailyActiveUsers: "Infrastructure — measured in messages, not users",
      readWriteRatio: "~1:1 (consumers ≈ producers, often fan-out >1)",
      storagePerItem: "~1 KB per record; retention drives storage (500 TB+)",
      peakMultiplier: "2-3x during batch/peak windows",
    },
  },

  // ───────────────────────── Digital Wallet / UPI ─────────────────────────
  {
    problemId: "digital-wallet",
    requirements: [
      { id: "r1", text: "Transfer money between accounts (debit + credit)", category: "functional", importance: "critical" },
      { id: "r2", text: "Maintain accurate balances; transaction history", category: "functional", importance: "critical" },
      { id: "r3", text: "Idempotent, exactly-once financial effects", category: "functional", importance: "critical" },
      { id: "r4", text: "Strong consistency; no lost/duplicate money", category: "non-functional", importance: "critical" },
      { id: "r5", text: "Fraud/abuse protection and auth", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you guarantee no double-spend?", category: "consistency", hint: "ACID + idempotency", answer: "Run the debit+credit in a single ACID transaction (or a 2-phase/saga across accounts) with a distributed lock on the payer; an idempotency key makes retries safe." },
      { id: "q2", question: "Why a ledger instead of mutable balances?", category: "consistency", hint: "Double-entry", answer: "Append immutable double-entry ledger entries; balance is derived (or a cached materialized value). This gives auditability and makes reconciliation possible." },
      { id: "q3", question: "How do you handle a failure mid-transfer?", category: "failure", hint: "Saga / compensation", answer: "Use a saga with compensating entries: if the credit leg fails after the debit, reverse the debit. Each step is idempotent and recorded." },
      { id: "q4", question: "How do you stop fraud/abuse?", category: "security", hint: "Auth + rate limit + rules", answer: "Strong auth, rate limiting, and a rules/ML engine on the transaction stream to flag anomalies before settlement." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/transfers", description: "Transfer money (idempotent)", requestBody: "{ idempotencyKey, from, to, amount }", response: "{ transferId, status }" },
      { method: "GET", path: "/api/v1/accounts/{id}/balance", description: "Current balance", response: "{ balance, currency }" },
      { method: "GET", path: "/api/v1/accounts/{id}/transactions", description: "History", response: "{ transactions[], cursor }" },
    ],
    dataModel: [
      { name: "ledger_entries", type: "sql", fields: [{ name: "entry_id", type: "uuid", note: "PK" }, { name: "account_id", type: "string" }, { name: "amount", type: "decimal", note: "+credit/-debit" }, { name: "transfer_id", type: "string" }], partitionKey: "account_id" },
      { name: "transfers", type: "sql", fields: [{ name: "transfer_id", type: "uuid", note: "PK" }, { name: "idempotency_key", type: "string", note: "unique" }, { name: "status", type: "enum" }], partitionKey: "transfer_id", indexes: ["idempotency_key"] },
      { name: "balances", type: "cache", fields: [{ name: "account_id", type: "string", note: "key" }, { name: "balance", type: "decimal" }] },
    ],
    estimationHints: {
      dailyActiveUsers: "100M DAU; tens of thousands of transfers/sec",
      readWriteRatio: "~1.5:1 balance/history reads to transfer writes",
      storagePerItem: "~300 bytes per ledger entry; retained for years",
      peakMultiplier: "5x at salary day / festivals",
    },
  },

  // ───────────────────────── Online Code Editor ─────────────────────────
  {
    problemId: "code-editor",
    requirements: [
      { id: "r1", text: "Edit code in the browser; save projects", category: "functional", importance: "critical" },
      { id: "r2", text: "Run/compile code in a sandbox", category: "functional", importance: "critical" },
      { id: "r3", text: "Real-time collaboration (optional)", category: "functional", importance: "important" },
      { id: "r4", text: "Fast, isolated, secure execution", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you run untrusted code safely?", category: "security", hint: "Sandbox isolation", answer: "Execute in isolated, ephemeral sandboxes (containers/microVMs) with no network, CPU/memory/time limits, and a read-only base image; tear down after each run." },
      { id: "q2", question: "How do you scale execution under bursty load?", category: "scale", hint: "Queue + worker pool", answer: "Queue run requests to a pool of warm sandbox workers; autoscale by queue depth. Keep a pool of pre-warmed sandboxes to cut cold-start latency." },
      { id: "q3", question: "How does real-time collaboration work?", category: "consistency", hint: "OT/CRDT over WebSocket", answer: "Sync edits via WebSockets using operational transforms or CRDTs so concurrent edits converge without conflicts." },
      { id: "q4", question: "Where do project files live?", category: "optimization", hint: "Object storage + metadata", answer: "Store file blobs in object storage and project/file metadata in NoSQL; cache open files for fast access." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/projects/{id}", description: "Load a project tree", response: "{ files[] }" },
      { method: "PUT", path: "/api/v1/projects/{id}/files/{path}", description: "Save a file", requestBody: "{ content }", response: "{ ok: true }" },
      { method: "POST", path: "/api/v1/run", description: "Execute code in a sandbox", requestBody: "{ projectId, cmd }", response: "{ runId }" },
      { method: "WS", path: "/ws/collab/{projectId}", description: "Collaborative editing channel" },
    ],
    dataModel: [
      { name: "projects", type: "nosql", fields: [{ name: "project_id", type: "string", note: "PK" }, { name: "owner", type: "string" }, { name: "file_index", type: "json" }], partitionKey: "project_id" },
      { name: "files", type: "nosql", fields: [{ name: "project_id", type: "string", note: "PK" }, { name: "path", type: "string" }, { name: "blob_url", type: "string", note: "object storage" }], partitionKey: "project_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "10M DAU; edits frequent, runs less so",
      readWriteRatio: "~1.5:1 reads to writes",
      storagePerItem: "~10-100 KB per file; projects small",
      peakMultiplier: "3x during classes / hackathons",
    },
  },

  // ───────────────────────── CI/CD Pipeline ─────────────────────────
  {
    problemId: "cicd-pipeline",
    requirements: [
      { id: "r1", text: "Trigger builds on commit/PR (webhooks)", category: "functional", importance: "critical" },
      { id: "r2", text: "Run pipeline stages as a DAG; store artifacts/logs", category: "functional", importance: "critical" },
      { id: "r3", text: "Parallel jobs; caching of dependencies", category: "functional", importance: "important" },
      { id: "r4", text: "Reliable, isolated, reproducible builds", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you schedule a DAG of jobs across runners?", category: "scale", hint: "Queue + scheduler", answer: "A scheduler resolves the DAG and enqueues ready jobs; a pool of runners pulls jobs, respecting dependencies and concurrency limits. Autoscale runners by queue depth." },
      { id: "q2", question: "How do you isolate and reproduce builds?", category: "security", hint: "Ephemeral containers", answer: "Each job runs in a fresh container/VM with pinned images and cached dependencies restored from object storage; tear down after." },
      { id: "q3", question: "How do you handle artifacts and large logs?", category: "optimization", hint: "Object storage", answer: "Stream logs to object storage and index metadata in SQL; artifacts are content-addressed blobs in object storage with TTLs." },
      { id: "q4", question: "What if a runner dies mid-job?", category: "failure", hint: "Retry + idempotent", answer: "Mark the job failed/stale via heartbeat timeout and re-enqueue it on another runner; jobs must be idempotent/restartable." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/webhooks/git", description: "Receive a commit/PR event", requestBody: "{ repo, ref, sha }", response: "{ runId }" },
      { method: "GET", path: "/api/v1/runs/{id}", description: "Pipeline run status + stages", response: "{ status, jobs[] }" },
      { method: "GET", path: "/api/v1/runs/{id}/logs", description: "Stream/download logs", response: "text/event-stream" },
    ],
    dataModel: [
      { name: "runs", type: "sql", fields: [{ name: "run_id", type: "uuid", note: "PK" }, { name: "repo", type: "string" }, { name: "sha", type: "string" }, { name: "status", type: "enum" }], partitionKey: "run_id" },
      { name: "jobs", type: "sql", fields: [{ name: "job_id", type: "uuid", note: "PK" }, { name: "run_id", type: "string" }, { name: "depends_on", type: "list" }, { name: "status", type: "enum" }], partitionKey: "run_id" },
      { name: "artifacts", type: "nosql", fields: [{ name: "run_id", type: "string", note: "PK" }, { name: "name", type: "string" }, { name: "blob_url", type: "string" }], partitionKey: "run_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "5M DAU; bursty build traffic",
      readWriteRatio: "~2:1 status/log reads to build writes",
      storagePerItem: "Artifacts/logs dominate — hundreds of MB per run",
      peakMultiplier: "5x during working hours",
    },
  },

  // ───────────────────────── Distributed ID Generator ─────────────────────────
  {
    problemId: "id-generator-service",
    requirements: [
      { id: "r1", text: "Generate globally unique 64-bit IDs", category: "functional", importance: "critical" },
      { id: "r2", text: "Roughly time-sortable IDs", category: "functional", importance: "important" },
      { id: "r3", text: "Very high write throughput (~1M/s), low latency", category: "non-functional", importance: "critical" },
      { id: "r4", text: "No single point of failure / coordination on hot path", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "Why not a single DB auto-increment?", category: "scale", hint: "Bottleneck/SPOF", answer: "A single sequence can't sustain 1M/s and is a SPOF. Snowflake-style IDs (timestamp + machine id + per-ms sequence) generate locally with no coordination per ID." },
      { id: "q2", question: "How do nodes get unique machine ids?", category: "consistency", hint: "Coordination service", answer: "Allocate worker/machine ids via a coordination service (e.g. ZooKeeper/etcd) at startup; each node then mints IDs independently." },
      { id: "q3", question: "How do you handle clock skew / NTP going backwards?", category: "failure", hint: "Monotonic clock", answer: "Refuse to mint (or wait) if the clock moves backward; use a monotonic component and a per-ms sequence to avoid collisions within a node." },
      { id: "q4", question: "Alternative if you don't want clock dependence?", category: "optimization", hint: "Range allocation", answer: "Hand out ID ranges (segments) from a central allocator; each node serves IDs from its range and fetches a new range when it runs low — amortizes coordination." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/id", description: "Get a single unique id", response: "{ id: 1234567890123 }" },
      { method: "POST", path: "/api/v1/ids", description: "Batch-allocate ids", requestBody: "{ count }", response: "{ ids[] }" },
    ],
    dataModel: [
      { name: "id_segments", type: "sql", fields: [{ name: "service", type: "string", note: "PK" }, { name: "max_allocated", type: "long" }], partitionKey: "service", note: "only for range-allocation mode" },
      { name: "worker_registry", type: "nosql", fields: [{ name: "worker_id", type: "int", note: "PK" }, { name: "host", type: "string" }, { name: "lease_expiry", type: "datetime" }], partitionKey: "worker_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "Internal service — measured in IDs/sec",
      readWriteRatio: "Effectively all writes (~1M IDs/s)",
      storagePerItem: "Stateless to mint; segment/registry state is tiny",
      peakMultiplier: "2x with platform-wide traffic spikes",
    },
  },

  // ───────────────────────── Gaming Leaderboard ─────────────────────────
  {
    problemId: "leaderboard",
    requirements: [
      { id: "r1", text: "Submit scores; show top-N and a player's rank", category: "functional", importance: "critical" },
      { id: "r2", text: "Per-game, per-time-window leaderboards", category: "functional", importance: "important" },
      { id: "r3", text: "Real-time rank updates at high write rate", category: "non-functional", importance: "critical" },
      { id: "r4", text: "Low-latency rank queries", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you get top-N and rank in O(log n)?", category: "optimization", hint: "Sorted set", answer: "Use a Redis sorted set (skip list) per leaderboard: ZADD on score, ZREVRANGE for top-N, ZREVRANK for a player's rank — all logarithmic." },
      { id: "q2", question: "How do you scale beyond one node's memory?", category: "scale", hint: "Shard + merge", answer: "Shard by game/region; for a global board, merge per-shard top-Ns. Approximate global rank via percentile sketches if exactness isn't required." },
      { id: "q3", question: "How do you absorb 100K score writes/sec?", category: "scale", hint: "Buffer + stream", answer: "Funnel score events through a queue/stream and batch-apply to the sorted set; keep durable history in NoSQL." },
      { id: "q4", question: "How do time windows (daily/weekly) work?", category: "optimization", hint: "Keyed sets + TTL", answer: "Use a separate sorted set per window key (e.g. board:daily:2026-06-26) with a TTL; old windows expire automatically." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/scores", description: "Submit a score", requestBody: "{ gameId, userId, score }", response: "{ rank }" },
      { method: "GET", path: "/api/v1/leaderboards/{gameId}/top", description: "Top-N players", response: "{ entries[] }" },
      { method: "GET", path: "/api/v1/leaderboards/{gameId}/rank/{userId}", description: "A player's rank", response: "{ rank, score }" },
    ],
    dataModel: [
      { name: "leaderboard", type: "cache", fields: [{ name: "board_key", type: "string", note: "sorted-set key" }, { name: "member", type: "string", note: "userId" }, { name: "score", type: "float" }] },
      { name: "score_history", type: "nosql", fields: [{ name: "user_id", type: "string", note: "PK" }, { name: "game_id", type: "string" }, { name: "score", type: "int" }, { name: "ts", type: "datetime" }], partitionKey: "user_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "50M players; reads dominate (everyone checks rank)",
      readWriteRatio: "~5:1 rank reads to score writes",
      storagePerItem: "~50 bytes per leaderboard entry; small overall",
      peakMultiplier: "4x during events/tournaments",
    },
  },

  // ───────────────────────── Distributed Job Scheduler ─────────────────────────
  {
    problemId: "job-scheduler",
    requirements: [
      { id: "r1", text: "Schedule one-off and recurring (cron) jobs", category: "functional", importance: "critical" },
      { id: "r2", text: "Execute at/after the scheduled time, exactly/at-least once", category: "functional", importance: "critical" },
      { id: "r3", text: "Retries with backoff; dead-letter on repeated failure", category: "functional", importance: "important" },
      { id: "r4", text: "Reliable at 10M jobs/day; no missed/duplicate runs", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you find jobs that are due efficiently?", category: "optimization", hint: "Time-bucketed index", answer: "Index jobs by next-run time (sorted/bucketed by minute); a poller scans the due bucket and enqueues those jobs rather than scanning everything." },
      { id: "q2", question: "How do you avoid two workers running the same job?", category: "consistency", hint: "Lease / lock", answer: "Claim a due job with an atomic conditional update or a distributed lock (lease); only the claimant runs it, and the lease expires if the worker dies." },
      { id: "q3", question: "How do you handle worker failure mid-job?", category: "failure", hint: "Lease expiry + retry", answer: "When the lease expires without completion, another worker re-claims and retries with backoff; idempotency keys keep effects safe." },
      { id: "q4", question: "How do recurring jobs reschedule?", category: "optimization", hint: "Compute next run", answer: "On completion, compute the next fire time from the cron expression and write the new next-run; the poller picks it up in the right bucket." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/jobs", description: "Schedule a job", requestBody: "{ runAt|cron, payload }", response: "{ jobId }" },
      { method: "DELETE", path: "/api/v1/jobs/{id}", description: "Cancel a job", response: "{ ok: true }" },
      { method: "GET", path: "/api/v1/jobs/{id}", description: "Job status/history", response: "{ status, attempts[] }" },
    ],
    dataModel: [
      { name: "jobs", type: "nosql", fields: [{ name: "job_id", type: "string", note: "PK" }, { name: "next_run", type: "datetime", note: "indexed/bucketed" }, { name: "cron", type: "string" }, { name: "status", type: "enum" }, { name: "lease_owner", type: "string" }], partitionKey: "job_id", indexes: ["next_run"] },
    ],
    estimationHints: {
      dailyActiveUsers: "10M jobs/day ≈ ~115 due/sec average",
      readWriteRatio: "~1:1 (poll/claim reads vs status writes)",
      storagePerItem: "~1 KB per job definition + history",
      peakMultiplier: "10x at the top of the hour (cron alignment)",
    },
  },

  // ───────────────────────── Ad Click Aggregator ─────────────────────────
  {
    problemId: "ad-click-aggregator",
    requirements: [
      { id: "r1", text: "Ingest ad click/impression events at massive scale", category: "functional", importance: "critical" },
      { id: "r2", text: "Aggregate metrics by ad/campaign over time windows", category: "functional", importance: "critical" },
      { id: "r3", text: "Near-real-time dashboards + accurate billing", category: "functional", importance: "critical" },
      { id: "r4", text: "Write-heavy (~1M clicks/s); de-dupe and handle late events", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you absorb 1M clicks/sec?", category: "scale", hint: "Stream ingestion", answer: "Write raw events to a partitioned log (stream) immediately; a stream processor consumes and aggregates. The ingestion path never touches a slow DB." },
      { id: "q2", question: "Real-time vs accurate — how do you get both?", category: "optimization", hint: "Lambda/kappa", answer: "A streaming layer gives fast approximate counts for dashboards; a batch re-aggregation over the raw log in the warehouse produces the accurate numbers used for billing." },
      { id: "q3", question: "How do you handle duplicate / late events?", category: "consistency", hint: "Idempotency + windows", answer: "Dedupe by event id (idempotent aggregation); use watermarks and allowed-lateness so late events update the correct time window." },
      { id: "q4", question: "How do you prevent click fraud from skewing billing?", category: "security", hint: "Filtering stage", answer: "A fraud-filtering stage in the stream drops bot/duplicate clicks before they reach billable aggregates." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/track/click", description: "Record a click event (fire-and-forget)", requestBody: "{ adId, userId, ts }", response: "204" },
      { method: "GET", path: "/api/v1/campaigns/{id}/metrics", description: "Aggregated metrics by window", requestBody: "{ from, to, granularity }", response: "{ buckets[] }" },
    ],
    dataModel: [
      { name: "raw_events", type: "nosql", fields: [{ name: "event_id", type: "string", note: "PK / dedupe" }, { name: "ad_id", type: "string" }, { name: "ts", type: "datetime" }], partitionKey: "ad_id", note: "also archived to object storage / warehouse" },
      { name: "aggregates", type: "nosql", fields: [{ name: "ad_id_window", type: "string", note: "PK" }, { name: "clicks", type: "counter" }, { name: "impressions", type: "counter" }], partitionKey: "ad_id_window" },
    ],
    estimationHints: {
      dailyActiveUsers: "10B clicks/day ≈ ~115K/s average, bursts far higher",
      readWriteRatio: "write-heavy — ingestion ≫ dashboard reads",
      storagePerItem: "~100 bytes per event; raw retained in warehouse",
      peakMultiplier: "5-10x during major campaigns",
    },
  },

  // ───────────────────────── Distributed Key-Value Store ─────────────────────────
  {
    problemId: "key-value-store",
    requirements: [
      { id: "r1", text: "Get/Put/Delete by key at very low latency", category: "functional", importance: "critical" },
      { id: "r2", text: "Horizontal scale; automatic partitioning + rebalancing", category: "functional", importance: "critical" },
      { id: "r3", text: "Replication for durability/availability; tunable consistency", category: "functional", importance: "critical" },
      { id: "r4", text: "1M reads/s, 500K writes/s; < 10ms", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you partition keys and rebalance?", category: "scale", hint: "Consistent hashing", answer: "Consistent hashing with virtual nodes spreads keys evenly and limits data movement when nodes join/leave; a coordination service tracks the ring." },
      { id: "q2", question: "How do you replicate and tune consistency?", category: "consistency", hint: "Quorums (N/R/W)", answer: "Replicate each key to N nodes; tune R + W vs N (R+W>N for strong reads, lower for availability). Hinted handoff and read-repair heal divergence." },
      { id: "q3", question: "How do you resolve conflicting concurrent writes?", category: "consistency", hint: "Vector clocks / LWW", answer: "Use version vectors to detect conflicts (resolve at read) or last-write-wins with synchronized clocks for simplicity, depending on the use case." },
      { id: "q4", question: "How do you detect and route around node failure?", category: "failure", hint: "Gossip + health", answer: "Nodes gossip membership/health; clients (or a coordinator) route to live replicas and use hinted handoff until a node recovers." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/kv/{key}", description: "Read a value", response: "{ value, version }" },
      { method: "PUT", path: "/kv/{key}", description: "Write a value", requestBody: "{ value }", response: "{ version }" },
      { method: "DELETE", path: "/kv/{key}", description: "Delete a key", response: "{ ok: true }" },
    ],
    dataModel: [
      { name: "kv_partition", type: "nosql", fields: [{ name: "key", type: "string", note: "PK, consistent-hashed" }, { name: "value", type: "blob" }, { name: "version", type: "vector_clock" }], partitionKey: "key" },
      { name: "ring_metadata", type: "nosql", fields: [{ name: "token", type: "long", note: "PK" }, { name: "node", type: "string" }], partitionKey: "token", note: "in coordination service" },
    ],
    estimationHints: {
      dailyActiveUsers: "Multi-tenant platform — measured in ops/sec",
      readWriteRatio: "~2:1 reads to writes",
      storagePerItem: "Values ~1 KB avg; 100 TB across the cluster",
      peakMultiplier: "2-3x with tenant traffic spikes",
    },
  },

  // ───────────────────────── Pastebin ─────────────────────────
  {
    problemId: "pastebin",
    requirements: [
      { id: "r1", text: "Create a paste, get a short shareable URL", category: "functional", importance: "critical" },
      { id: "r2", text: "View a paste by id; optional expiry/visibility", category: "functional", importance: "critical" },
      { id: "r3", text: "Read-heavy (~50:1); large text blobs", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "Where do you store the paste content?", category: "optimization", hint: "Blob vs row", answer: "Keep small metadata (id, owner, expiry) in NoSQL and the (potentially large) content blob in object storage; serve hot pastes through a cache/CDN." },
      { id: "q2", question: "How do you generate the short id?", category: "optimization", hint: "base62", answer: "Base62-encode a counter or hash; check/avoid collisions. Same trade-offs as the URL shortener." },
      { id: "q3", question: "How do you handle expiry?", category: "consistency", hint: "Lazy + TTL", answer: "Check expiry on read (return 404 if expired) and let object-storage/DB TTLs reclaim space in the background." },
      { id: "q4", question: "How do you serve a read-heavy load cheaply?", category: "scale", hint: "Cache/CDN", answer: "Cache popular pastes and serve via CDN; the origin only handles misses and writes." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/pastes", description: "Create a paste", requestBody: "{ content, expiresIn?, visibility? }", response: "{ id, url }" },
      { method: "GET", path: "/{id}", description: "Fetch a paste", response: "{ content, createdAt, expiresAt }" },
    ],
    dataModel: [
      { name: "pastes", type: "nosql", fields: [{ name: "paste_id", type: "string", note: "PK, base62" }, { name: "blob_url", type: "string", note: "object storage" }, { name: "expires_at", type: "datetime" }], partitionKey: "paste_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "10M DAU; reads vastly exceed writes",
      readWriteRatio: "~50:1 read-heavy",
      storagePerItem: "~10 KB per paste (text)",
      peakMultiplier: "2x during work hours",
    },
  },

  // ───────────────────────── Image Hosting ─────────────────────────
  {
    problemId: "image-hosting",
    requirements: [
      { id: "r1", text: "Upload images; serve them fast globally", category: "functional", importance: "critical" },
      { id: "r2", text: "Generate thumbnails / multiple sizes", category: "functional", importance: "important" },
      { id: "r3", text: "Read-heavy (~50:1); durable storage", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you serve images with low latency globally?", category: "optimization", hint: "CDN", answer: "Store originals in object storage and serve all reads via a CDN; the origin is hit only on cache miss." },
      { id: "q2", question: "How do you create thumbnails without blocking upload?", category: "scale", hint: "Async resize", answer: "On upload, enqueue a resize job; workers generate sizes and write them to object storage. The upload returns as soon as the original is stored." },
      { id: "q3", question: "How do you upload large files efficiently?", category: "optimization", hint: "Presigned + direct", answer: "Issue a presigned URL so the client uploads directly to object storage, bypassing the app servers; the app only records metadata." },
      { id: "q4", question: "How is metadata stored?", category: "optimization", hint: "NoSQL", answer: "Image metadata (id, owner, sizes, dimensions) in NoSQL keyed by image id; blobs live in object storage." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/images/upload-url", description: "Get a presigned upload URL", response: "{ uploadUrl, imageId }" },
      { method: "GET", path: "/api/v1/images/{id}", description: "Image metadata + URLs", response: "{ original, thumbnails[] }" },
      { method: "GET", path: "/i/{id}", description: "Serve the image (CDN)", response: "image bytes" },
    ],
    dataModel: [
      { name: "images", type: "nosql", fields: [{ name: "image_id", type: "string", note: "PK" }, { name: "owner", type: "string" }, { name: "sizes", type: "json", note: "size → object URL" }], partitionKey: "image_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "50M DAU; views ≫ uploads",
      readWriteRatio: "~50:1 read-heavy",
      storagePerItem: "~2 MB per image incl. thumbnails; 50 TB total",
      peakMultiplier: "3x during peak hours",
    },
  },

  // ───────────────────────── View / Like Counter ─────────────────────────
  {
    problemId: "view-counter",
    requirements: [
      { id: "r1", text: "Increment view/like counts at very high rate", category: "functional", importance: "critical" },
      { id: "r2", text: "Read approximate counts with low latency", category: "functional", importance: "critical" },
      { id: "r3", text: "Write-heavy (~1B events/day); avoid hot-key contention", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "Why not increment a single row per view?", category: "scale", hint: "Hot key", answer: "A viral item becomes a hot key — every write contends on one row. Use sharded counters (split the count across N keys, sum on read) or aggregate via a stream." },
      { id: "q2", question: "How do you make reads cheap?", category: "optimization", hint: "Cache approximate", answer: "Serve the current count from cache; refresh it periodically from the aggregated shards. Approximate is fine for views/likes." },
      { id: "q3", question: "How do you avoid double-counting from one user?", category: "consistency", hint: "Dedupe window", answer: "Dedupe with a per-(user,item) marker in a short-TTL cache or a bloom filter so rapid repeats don't all count." },
      { id: "q4", question: "How is the durable total kept?", category: "failure", hint: "Periodic flush", answer: "Buffer increments through a queue and periodically flush aggregated deltas to NoSQL; the durable store survives cache loss." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/items/{id}/view", description: "Record a view", response: "204" },
      { method: "GET", path: "/api/v1/items/{id}/counts", description: "Get approximate counts", response: "{ views, likes }" },
    ],
    dataModel: [
      { name: "counter_shards", type: "cache", fields: [{ name: "item_id:shard", type: "string", note: "key" }, { name: "count", type: "counter" }] },
      { name: "counts", type: "nosql", fields: [{ name: "item_id", type: "string", note: "PK" }, { name: "views", type: "long" }, { name: "likes", type: "long" }], partitionKey: "item_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "1B events/day ≈ ~12K/s average, far higher peaks",
      readWriteRatio: "write-heavy — increments dominate",
      storagePerItem: "~16 bytes per counter; tiny overall",
      peakMultiplier: "10x on viral content",
    },
  },

  // ───────────────────────── To-Do / Notes App ─────────────────────────
  {
    problemId: "todo-app",
    requirements: [
      { id: "r1", text: "CRUD tasks/notes per user; lists and due dates", category: "functional", importance: "critical" },
      { id: "r2", text: "Auth; sync across a user's devices", category: "functional", importance: "important" },
      { id: "r3", text: "Simple, reliable, modest scale", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "What datastore fits this best?", category: "optimization", hint: "Relational is fine", answer: "A relational DB (with read replicas + a cache) is a great fit — modest scale, clear relations (user → lists → tasks), and transactional updates. Don't over-engineer." },
      { id: "q2", question: "How do you sync across devices?", category: "consistency", hint: "Updated-at / versioning", answer: "Track updated_at per item; clients pull changes since their last sync token. Last-write-wins or a version field resolves simple conflicts." },
      { id: "q3", question: "How do you scale reads if it grows?", category: "scale", hint: "Cache + replicas", answer: "Cache a user's task list and add read replicas; partition by user_id only if it ever truly outgrows a single primary." },
      { id: "q4", question: "How is auth handled?", category: "security", hint: "Token + scoping", answer: "Authenticate with tokens (JWT/session) and scope every query to the authenticated user_id." },
    ],
    referenceAPIs: [
      { method: "GET", path: "/api/v1/tasks", description: "List the user's tasks (since cursor)", response: "{ tasks[], cursor }" },
      { method: "POST", path: "/api/v1/tasks", description: "Create a task", requestBody: "{ title, dueDate?, listId? }", response: "{ taskId }" },
      { method: "PATCH", path: "/api/v1/tasks/{id}", description: "Update/complete a task", requestBody: "{ done?, title? }", response: "{ ok: true }" },
    ],
    dataModel: [
      { name: "tasks", type: "sql", fields: [{ name: "task_id", type: "uuid", note: "PK" }, { name: "user_id", type: "string", note: "indexed" }, { name: "title", type: "string" }, { name: "done", type: "bool" }, { name: "updated_at", type: "datetime" }], partitionKey: "user_id", indexes: ["user_id,updated_at"] },
    ],
    estimationHints: {
      dailyActiveUsers: "5M DAU; light per-user load",
      readWriteRatio: "~4:1 reads to writes",
      storagePerItem: "~300 bytes per task",
      peakMultiplier: "2x in the morning",
    },
  },

  // ───────────────────────── RAG Knowledge Assistant ─────────────────────────
  {
    problemId: "rag-assistant",
    requirements: [
      { id: "r1", text: "Answer questions grounded in a private document corpus", category: "functional", importance: "critical" },
      { id: "r2", text: "Ingest/embed documents; semantic retrieval", category: "functional", importance: "critical" },
      { id: "r3", text: "Cite sources; safety/guardrails on output", category: "functional", importance: "important" },
      { id: "r4", text: "Acceptable latency (~3s); control LLM cost", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "What's the retrieval pipeline?", category: "optimization", hint: "Embed → vector search → prompt", answer: "Embed the query, vector-search the corpus for top-k chunks, build a prompt with those chunks as context, call the LLM, and return the answer with citations." },
      { id: "q2", question: "How do you keep the vector index fresh?", category: "scale", hint: "Async ingestion", answer: "An ingestion worker chunks documents, embeds them, and upserts into the vector DB; document blobs live in object storage. Re-embed on document change." },
      { id: "q3", question: "How do you control cost and latency?", category: "optimization", hint: "Cache + small models", answer: "Cache embeddings and frequent answers, retrieve only top-k chunks, use a smaller/cheaper model where quality allows, and stream tokens to cut perceived latency." },
      { id: "q4", question: "How do you reduce hallucination / unsafe output?", category: "security", hint: "Grounding + guardrails", answer: "Force answers to cite retrieved context (and say 'I don't know' when none is relevant), and run a guardrails layer for moderation/PII before returning." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/ask", description: "Ask a grounded question", requestBody: "{ query, conversationId? }", response: "{ answer, citations[] }" },
      { method: "POST", path: "/api/v1/documents", description: "Ingest a document", requestBody: "{ file }", response: "{ docId, status }" },
    ],
    dataModel: [
      { name: "chunks", type: "nosql", fields: [{ name: "chunk_id", type: "string", note: "PK" }, { name: "doc_id", type: "string" }, { name: "embedding", type: "vector", note: "in vector DB" }, { name: "text", type: "text" }], partitionKey: "doc_id", note: "vector index for ANN search" },
      { name: "documents", type: "nosql", fields: [{ name: "doc_id", type: "string", note: "PK" }, { name: "blob_url", type: "string" }, { name: "status", type: "enum" }], partitionKey: "doc_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "100k enterprise users; modest QPS, heavy per-call cost",
      readWriteRatio: "~25:1 queries to document ingests",
      storagePerItem: "~1-2 KB per chunk embedding; corpus in object storage",
      peakMultiplier: "3x during work hours",
    },
  },

  // ───────────────────────── AI Agent Platform ─────────────────────────
  {
    problemId: "ai-agent-platform",
    requirements: [
      { id: "r1", text: "Run multi-step agents: plan → call tools → observe → repeat", category: "functional", importance: "critical" },
      { id: "r2", text: "Expose tools/data via MCP servers", category: "functional", importance: "critical" },
      { id: "r3", text: "Long-running, resumable tasks with memory", category: "functional", importance: "critical" },
      { id: "r4", text: "Sandbox tool execution; guardrails", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you run long agent tasks (minutes+) reliably?", category: "failure", hint: "Durable workflow", answer: "Model the agent loop as a durable, checkpointed workflow on worker processes; persist each step's state so a crash resumes from the last checkpoint, not the start." },
      { id: "q2", question: "How are tools exposed and called safely?", category: "security", hint: "MCP + sandbox", answer: "Tools are MCP servers behind a uniform interface; the orchestrator calls them in a sandbox with scoped permissions and timeouts, and guardrails screen inputs/outputs." },
      { id: "q3", question: "How does the agent remember context across steps?", category: "optimization", hint: "Memory store", answer: "Keep working memory in a store (NoSQL + vector DB for semantic recall); summarize/compress history to stay within the LLM context window." },
      { id: "q4", question: "How do you control runaway loops/cost?", category: "optimization", hint: "Budgets", answer: "Enforce per-task step/time/token budgets and stop conditions; cache tool results and LLM calls where deterministic." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/tasks", description: "Start an agent task", requestBody: "{ goal, tools[] }", response: "{ taskId }" },
      { method: "GET", path: "/api/v1/tasks/{id}", description: "Task status + trace", response: "{ status, steps[] }" },
      { method: "GET", path: "/api/v1/tools", description: "List available MCP tools", response: "{ tools[] }" },
    ],
    dataModel: [
      { name: "tasks", type: "nosql", fields: [{ name: "task_id", type: "string", note: "PK" }, { name: "goal", type: "text" }, { name: "status", type: "enum" }, { name: "checkpoint", type: "json" }], partitionKey: "task_id" },
      { name: "memory", type: "nosql", fields: [{ name: "task_id", type: "string", note: "PK" }, { name: "step", type: "int" }, { name: "embedding", type: "vector", note: "vector DB for recall" }, { name: "content", type: "text" }], partitionKey: "task_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "Long-running tasks — concurrency, not QPS, is the limit",
      readWriteRatio: "~2:1 status reads to step writes",
      storagePerItem: "~2-5 KB per step (state + memory)",
      peakMultiplier: "3x during work hours",
    },
  },

  // ───────────────────────── LLM Chatbot at Scale ─────────────────────────
  {
    problemId: "llm-chatbot",
    requirements: [
      { id: "r1", text: "Conversational chat with streamed responses", category: "functional", importance: "critical" },
      { id: "r2", text: "Per-user conversation history/context", category: "functional", importance: "critical" },
      { id: "r3", text: "Serve LLM inference at scale; rate limit; guardrails", category: "functional", importance: "critical" },
      { id: "r4", text: "Manage GPU cost; acceptable first-token latency", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you serve GPU inference efficiently?", category: "optimization", hint: "Batching + KV cache", answer: "A model server batches concurrent requests and uses a KV cache; autoscale GPU workers by queue depth. Stream tokens so users see output immediately." },
      { id: "q2", question: "How do you keep first-token latency low under load?", category: "scale", hint: "Queue + autoscale", answer: "Admit requests through a queue with priorities; keep warm GPU capacity for headroom and shed/slow low-priority traffic rather than failing." },
      { id: "q3", question: "How do you manage conversation context cost?", category: "optimization", hint: "Truncate/summarize + cache", answer: "Store history in NoSQL, but send only a truncated/summarized window to the model; cache repeated prompts/responses." },
      { id: "q4", question: "How do you handle safety and abuse?", category: "security", hint: "Guardrails + rate limit", answer: "Rate-limit per user/key, and run input/output through a guardrails layer (moderation, prompt-injection, PII) before and after the model." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/chat", description: "Send a message, stream the reply", requestBody: "{ conversationId, message }", response: "text/event-stream (tokens)" },
      { method: "GET", path: "/api/v1/conversations/{id}", description: "Conversation history", response: "{ messages[] }" },
    ],
    dataModel: [
      { name: "conversations", type: "nosql", fields: [{ name: "conversation_id", type: "string", note: "PK" }, { name: "user_id", type: "string" }, { name: "messages", type: "list" }], partitionKey: "conversation_id" },
      { name: "prompt_cache", type: "cache", fields: [{ name: "prompt_hash", type: "string", note: "key" }, { name: "response", type: "text" }] },
    ],
    estimationHints: {
      dailyActiveUsers: "10M DAU; inference cost dominates",
      readWriteRatio: "~1:1 — each turn reads history and writes a reply",
      storagePerItem: "~2 KB per message turn",
      peakMultiplier: "3x during peak hours",
    },
  },

  // ───────────────────────── AI Image Generation ─────────────────────────
  {
    problemId: "ai-image-generation",
    requirements: [
      { id: "r1", text: "Generate images from text prompts", category: "functional", importance: "critical" },
      { id: "r2", text: "Async jobs (generation takes seconds); deliver results", category: "functional", importance: "critical" },
      { id: "r3", text: "Rate limit; guardrails on prompts/outputs", category: "functional", importance: "important" },
      { id: "r4", text: "Manage expensive GPU capacity; serve images fast", category: "non-functional", importance: "critical" },
    ],
    followUpQuestions: [
      { id: "q1", question: "Why make generation asynchronous?", category: "scale", hint: "Long jobs", answer: "Generation takes seconds and GPUs are scarce — enqueue jobs and let GPU workers pull them; the API returns a job id immediately and the client polls or gets notified." },
      { id: "q2", question: "How do you manage GPU cost under bursty demand?", category: "optimization", hint: "Queue + autoscale + batch", answer: "Autoscale the worker pool by queue depth, batch compatible requests, and keep a small warm pool; shed or delay free-tier traffic during spikes." },
      { id: "q3", question: "How are generated images delivered?", category: "optimization", hint: "Object storage + CDN", answer: "Workers write outputs to object storage; serve them via CDN. Metadata (job → image URL) lives in NoSQL." },
      { id: "q4", question: "How do you keep content safe?", category: "security", hint: "Guardrails both ends", answer: "Screen prompts before generation and outputs after (NSFW/abuse filters) via a guardrails layer; block and log violations." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/generations", description: "Submit a generation job", requestBody: "{ prompt, size, n }", response: "{ jobId, status: 'queued' }" },
      { method: "GET", path: "/api/v1/generations/{id}", description: "Poll job status / results", response: "{ status, images[] }" },
    ],
    dataModel: [
      { name: "generations", type: "nosql", fields: [{ name: "job_id", type: "string", note: "PK" }, { name: "user_id", type: "string" }, { name: "prompt", type: "text" }, { name: "status", type: "enum" }, { name: "image_urls", type: "list", note: "object storage" }], partitionKey: "job_id" },
    ],
    estimationHints: {
      dailyActiveUsers: "5M users; throughput limited by GPU supply",
      readWriteRatio: "~10:1 status polls to generation submissions",
      storagePerItem: "~2-5 MB per generated image; 100 TB total",
      peakMultiplier: "4x during viral moments",
    },
  },

  // ───────────────────────── AI Coding Assistant ─────────────────────────
  {
    problemId: "ai-coding-assistant",
    requirements: [
      { id: "r1", text: "Inline code completions as the developer types", category: "functional", importance: "critical" },
      { id: "r2", text: "Context-aware suggestions using repo context (RAG)", category: "functional", importance: "critical" },
      { id: "r3", text: "Very low latency (< 400ms) to feel instant", category: "non-functional", importance: "critical" },
      { id: "r4", text: "High read QPS; manage inference cost", category: "non-functional", importance: "important" },
    ],
    followUpQuestions: [
      { id: "q1", question: "How do you hit sub-400ms completions?", category: "optimization", hint: "Small model + cache + debounce", answer: "Use a fast/small completion model on a GPU server with batching, cache recent prompts/completions, debounce keystrokes, and stream the first tokens." },
      { id: "q2", question: "How do you give the model repo context?", category: "optimization", hint: "Embed + retrieve", answer: "Embed the repository's files into a vector DB; at completion time retrieve the most relevant snippets and include them in the prompt (RAG)." },
      { id: "q3", question: "How do you serve high QPS cost-effectively?", category: "scale", hint: "Batch + autoscale + rate limit", answer: "Batch requests on the model server, autoscale GPU workers, rate-limit per user, and drop stale in-flight requests when newer keystrokes arrive." },
      { id: "q4", question: "How do you keep private code secure?", category: "security", hint: "Isolation + scoping", answer: "Isolate each tenant's embeddings/context, never train on private code without consent, and scope retrieval to the user's authorized repos." },
    ],
    referenceAPIs: [
      { method: "POST", path: "/api/v1/complete", description: "Get a code completion", requestBody: "{ prefix, suffix, filePath, repoId }", response: "{ completion }" },
      { method: "POST", path: "/api/v1/repos/{id}/index", description: "Index a repo for context", response: "{ status }" },
    ],
    dataModel: [
      { name: "repo_chunks", type: "nosql", fields: [{ name: "chunk_id", type: "string", note: "PK" }, { name: "repo_id", type: "string" }, { name: "embedding", type: "vector", note: "vector DB" }, { name: "code", type: "text" }], partitionKey: "repo_id" },
      { name: "completion_cache", type: "cache", fields: [{ name: "prefix_hash", type: "string", note: "key" }, { name: "completion", type: "text" }] },
    ],
    estimationHints: {
      dailyActiveUsers: "2M developers; completions fire on most keystrokes",
      readWriteRatio: "very read-heavy — completions ≫ repo indexing",
      storagePerItem: "~1-2 KB per code chunk embedding",
      peakMultiplier: "5x during working hours",
    },
  },
];
