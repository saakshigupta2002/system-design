/**
 * Spot the Flaw — concept-practice challenges. Each shows a small, plausible
 * architecture with exactly one key design flaw. The learner reads the diagram
 * and the workload, then picks what's wrong. Designs reuse the same
 * { componentId, x, y } / { source, target } shape as reference solutions, so
 * they render with the shared ComponentDiagram. The correct option is authored
 * at `correctIndex`; the dialog shuffles options before display.
 */

export interface FlawChallenge {
  id: string;
  concept: string; // short topic tag shown to the learner
  scenario: string; // workload + what the diagram shows
  /** The question asked. Defaults to "What's the most serious flaw?" when omitted. */
  prompt?: string;
  nodes: Array<{ componentId: string; x: number; y: number }>;
  edges: Array<{ source: string; target: string }>;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const SPOT_THE_FLAW: FlawChallenge[] = [
  {
    id: "no-cache-read-heavy",
    concept: "Caching · read-heavy design",
    scenario:
      "A URL-shortener-style service gets 100 reads for every write. Below is the proposed design.",
    nodes: [
      { componentId: "dns", x: 80, y: 150 },
      { componentId: "load-balancer", x: 260, y: 150 },
      { componentId: "app-server", x: 440, y: 150 },
      { componentId: "sql-db", x: 620, y: 150 },
    ],
    edges: [
      { source: "dns", target: "load-balancer" },
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "Every read hits the database — with no cache, a read-heavy load will overwhelm it",
      "There are too many app servers for this workload",
      "The load balancer is unnecessary and adds latency",
      "DNS should be removed to simplify the path",
    ],
    correctIndex: 0,
    explanation:
      "When reads outnumber writes 100:1, sending every read to the database makes it the bottleneck. Put a cache in front of the DB so repeated lookups are served from memory and the database only sees misses and writes.",
  },
  {
    id: "single-app-server",
    concept: "Horizontal scaling · single point of failure",
    scenario: "A growing web app is deployed as shown. Traffic is climbing steadily.",
    nodes: [
      { componentId: "dns", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "sql-db", x: 480, y: 150 },
    ],
    edges: [
      { source: "dns", target: "app-server" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "A single app server with no load balancer is a single point of failure and can't scale out",
      "The database should be replaced with NoSQL",
      "DNS is misconfigured for this topology",
      "There is too much redundancy in this design",
    ],
    correctIndex: 0,
    explanation:
      "One app server means if it dies, the whole service is down, and you can't add capacity by adding machines. Put a load balancer in front and run multiple stateless app servers behind it.",
  },
  {
    id: "sync-email-in-request",
    concept: "Async processing · decoupling",
    scenario:
      "On signup, the app server calls the notification service to send a welcome email before it responds to the user.",
    nodes: [
      { componentId: "load-balancer", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "sql-db", x: 480, y: 80 },
      { componentId: "notification-service", x: 480, y: 230 },
    ],
    edges: [
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
      { source: "app-server", target: "notification-service" },
    ],
    options: [
      "Sending the email synchronously blocks the response — push it to a queue and send it async",
      "The database should be sharded immediately",
      "The load balancer should be removed",
      "Signup should skip writing to the database",
    ],
    correctIndex: 0,
    explanation:
      "A slow or down email provider shouldn't make signups slow or fail. Emit an event to a message queue and let a worker send the email asynchronously, so the user gets a fast response and the side-effect is retried independently.",
  },
  {
    id: "media-no-cdn",
    concept: "CDN · media delivery",
    scenario:
      "A global image service streams full-size images to users directly through its app servers.",
    nodes: [
      { componentId: "dns", x: 80, y: 150 },
      { componentId: "load-balancer", x: 260, y: 150 },
      { componentId: "app-server", x: 440, y: 150 },
      { componentId: "object-storage", x: 620, y: 150 },
    ],
    edges: [
      { source: "dns", target: "load-balancer" },
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "object-storage" },
    ],
    options: [
      "Images are served through the app servers — use a CDN to cache them at the edge near users",
      "Object storage should be swapped for a SQL database",
      "The app servers need a rate limiter for images",
      "DNS should resolve directly to object storage with no caching",
    ],
    correctIndex: 0,
    explanation:
      "Streaming large media through app servers wastes their bandwidth and adds latency for distant users. Serve images via a CDN so bytes come from an edge location near the viewer; the app/origin only handles cache misses and uploads.",
  },
  {
    id: "single-counter-hotspot",
    concept: "Write-heavy · hot-key / sharded counters",
    scenario:
      "Likes are stored as one counter row that's updated on every like. A post goes viral and receives 30,000 likes/sec.",
    nodes: [
      { componentId: "load-balancer", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "sql-db", x: 480, y: 150 },
    ],
    edges: [
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "A single counter row is a write hot spot — shard the counter or buffer increments through a queue",
      "The app servers are simply too slow and need faster CPUs",
      "DNS can't handle the request volume",
      "The load balancer needs to terminate SSL",
    ],
    correctIndex: 0,
    explanation:
      "All those writes contend on one row, serializing updates and overwhelming it. Split the count into many shard rows (summed on read), and/or buffer increments through a queue so a burst becomes batched updates. Display can be eventually consistent.",
  },
  {
    id: "search-on-sql-like",
    concept: "Search index",
    scenario:
      "Product search runs SQL `LIKE '%term%'` queries over a table with tens of millions of rows.",
    nodes: [
      { componentId: "load-balancer", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "sql-db", x: 480, y: 150 },
    ],
    edges: [
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "Leading-wildcard LIKE scans can't use an index and won't scale — use a dedicated search index",
      "The fix is simply adding more DNS records",
      "Use a smaller load balancer to reduce cost",
      "Remove the app servers and query the DB directly from clients",
    ],
    correctIndex: 0,
    explanation:
      "`LIKE '%term%'` forces a full scan because a leading wildcard can't use a B-tree index. For real text search, feed the data into a search engine that builds an inverted index, and keep it updated via change data capture.",
  },
  {
    id: "no-rate-limiter",
    concept: "Rate limiting · abuse protection",
    scenario:
      "A public write API has no protection in front of it. A single misbehaving client can send unlimited requests.",
    nodes: [
      { componentId: "dns", x: 80, y: 150 },
      { componentId: "api-gateway", x: 260, y: 150 },
      { componentId: "app-server", x: 440, y: 150 },
      { componentId: "nosql-db", x: 620, y: 150 },
    ],
    edges: [
      { source: "dns", target: "api-gateway" },
      { source: "api-gateway", target: "app-server" },
      { source: "app-server", target: "nosql-db" },
    ],
    options: [
      "There's no rate limiter — one client can flood the API and starve everyone else",
      "A second DNS provider is the missing piece",
      "A CDN in front of the write API would fix it",
      "The database disk simply needs to be larger",
    ],
    correctIndex: 0,
    explanation:
      "Without rate limiting, one abusive or buggy client can exhaust capacity and degrade the service for everyone. Add a rate limiter (e.g. token bucket per API key/IP) at the gateway to cap request rates and shed excess load early.",
  },
  {
    id: "sync-fanout-write",
    concept: "Async fan-out · coupling & reliability",
    scenario:
      "On each order the app server synchronously writes to the database, updates the search index, sends a notification, and warms the cache — all before responding.",
    nodes: [
      { componentId: "app-server", x: 80, y: 160 },
      { componentId: "sql-db", x: 320, y: 40 },
      { componentId: "search", x: 320, y: 130 },
      { componentId: "notification-service", x: 320, y: 220 },
      { componentId: "cache", x: 320, y: 310 },
    ],
    edges: [
      { source: "app-server", target: "sql-db" },
      { source: "app-server", target: "search" },
      { source: "app-server", target: "notification-service" },
      { source: "app-server", target: "cache" },
    ],
    options: [
      "Too many synchronous downstream calls — if any is slow or down the order fails; emit an event and update the rest async",
      "The order should not be written to the database at all",
      "The cache should be the source of truth instead of the DB",
      "The app server needs a second load balancer",
    ],
    correctIndex: 0,
    explanation:
      "Chaining four synchronous calls means the slowest one sets your latency and any one failure fails the whole order. Commit the order to the DB, then publish an event; let separate consumers update search, send notifications, and warm the cache independently.",
  },
  {
    id: "in-memory-sessions",
    concept: "Stateless services",
    scenario:
      "User sessions are kept in each app server's local memory, behind a round-robin load balancer. Users report being randomly logged out.",
    nodes: [
      { componentId: "load-balancer", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "sql-db", x: 480, y: 150 },
    ],
    edges: [
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "Sessions live in app-server memory — the next request hits a different server that doesn't have them; move sessions to a shared store",
      "The database is too small for the user table",
      "The DNS TTL is set too high",
      "The load balancer needs more CPU",
    ],
    correctIndex: 0,
    explanation:
      "With round-robin routing, consecutive requests land on different servers, and an in-memory session only exists on one of them. Keep app servers stateless by storing sessions in a shared cache or database so any server can serve any request.",
  },
  {
    id: "missing-auth",
    concept: "Authentication & authorization",
    scenario:
      "A notes API stores private per-user data. Every request goes straight to the app server and database with no identity check.",
    nodes: [
      { componentId: "load-balancer", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "sql-db", x: 480, y: 150 },
    ],
    edges: [
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "There's no authentication/authorization — anyone could read or modify another user's private notes",
      "The design is missing a CDN for the notes",
      "A message queue is required before the database",
      "A second load balancer is needed for safety",
    ],
    correctIndex: 0,
    explanation:
      "Private, per-user data must verify who is calling and that they're allowed to touch that record. Add authentication (verify identity, e.g. a token) and enforce authorization on every request so users can only access their own data.",
  },

  // ── Type: over-engineering (the flaw is too much, not too little) ──
  {
    id: "over-engineered-internal-tool",
    concept: "Right-sizing · avoid over-engineering",
    scenario:
      "An internal admin tool used by about 50 employees a day. Here is the proposed architecture.",
    prompt: "What's over-engineered for this workload?",
    nodes: [
      { componentId: "dns", x: 60, y: 160 },
      { componentId: "load-balancer", x: 240, y: 160 },
      { componentId: "app-server", x: 420, y: 160 },
      { componentId: "sql-db", x: 600, y: 60 },
      { componentId: "message-queue", x: 600, y: 260 },
      { componentId: "stream-processor", x: 780, y: 260 },
      { componentId: "data-warehouse", x: 960, y: 260 },
    ],
    edges: [
      { source: "dns", target: "load-balancer" },
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
      { source: "app-server", target: "message-queue" },
      { source: "message-queue", target: "stream-processor" },
      { source: "stream-processor", target: "data-warehouse" },
    ],
    options: [
      "A streaming + warehouse pipeline is needless complexity for 50 users — start with just app servers and a database",
      "It's missing a CDN to serve the admin pages",
      "The database must be sharded for this load",
      "It needs a second load balancer for redundancy",
    ],
    correctIndex: 0,
    explanation:
      "Match complexity to scale. For ~50 users a single app server and a database is plenty; a queue, stream processor, and data warehouse add cost, failure modes, and maintenance with no benefit. Add that machinery only when real scale or analytics needs demand it.",
  },

  // ── Type: capacity / bottleneck reasoning ──
  {
    id: "bottleneck-single-db",
    concept: "Bottlenecks · capacity planning",
    scenario:
      "Capacities: app tier ~80k req/s, DNS and load balancer far higher, and the single SQL database ~12k req/s. Live traffic is ~60k req/s, almost all reads, and the app queries the database directly.",
    prompt: "Under this load, which component is the bottleneck?",
    nodes: [
      { componentId: "dns", x: 80, y: 150 },
      { componentId: "load-balancer", x: 260, y: 150 },
      { componentId: "app-server", x: 440, y: 150 },
      { componentId: "sql-db", x: 620, y: 150 },
    ],
    edges: [
      { source: "dns", target: "load-balancer" },
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "The database — ~12k req/s is far below the 60k read load; put a cache in front so most reads never reach it",
      "The load balancer — it can't route 60k req/s",
      "DNS — it becomes the bottleneck at this scale",
      "The app tier — 80k capacity is the limiting factor",
    ],
    correctIndex: 0,
    explanation:
      "The bottleneck is the lowest-capacity component on the request path — here the database at 12k req/s, well under the 60k read load. Since the load is read-heavy, a cache absorbs most reads so the database only handles misses and writes.",
  },

  // ── Type: failure blast radius ──
  {
    id: "cache-stampede",
    concept: "Failure modes · cache stampede",
    scenario:
      "A very read-heavy service serves almost everything from the cache and reads the database only on a miss. The cache cluster restarts and is momentarily empty.",
    prompt: "When the cache goes cold, what happens?",
    nodes: [
      { componentId: "dns", x: 80, y: 150 },
      { componentId: "load-balancer", x: 260, y: 150 },
      { componentId: "app-server", x: 440, y: 150 },
      { componentId: "cache", x: 620, y: 60 },
      { componentId: "sql-db", x: 620, y: 240 },
    ],
    edges: [
      { source: "dns", target: "load-balancer" },
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "cache" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "Every read misses at once and falls through to the database, which can be overwhelmed (a cache stampede) and bring the site down",
      "Nothing — the database comfortably handles full traffic",
      "Only writes fail; reads are unaffected",
      "Users see an error page until the cache warms, with no database impact",
    ],
    correctIndex: 0,
    explanation:
      "If the cache normally absorbs most reads, losing it sends 100% of reads to a database that was never sized for them — a 'cache stampede' / thundering herd. Mitigate with request coalescing (one DB fetch per key), gradual cache warming, and serving stale-while-revalidate.",
  },

  // ── Type: pick the right fix ──
  {
    id: "cascading-timeouts",
    concept: "Resilience · circuit breaker",
    scenario:
      "The app server calls a downstream search service on every request. When search gets slow, the app's threads pile up waiting on it, the app stops responding too, and the failure cascades.",
    prompt: "What's the best fix?",
    nodes: [
      { componentId: "load-balancer", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "search", x: 480, y: 60 },
      { componentId: "sql-db", x: 480, y: 240 },
    ],
    edges: [
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "search" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "Add a circuit breaker (with timeouts) so calls to the failing dependency fail fast and fall back, instead of piling up and exhausting threads",
      "Add more DNS records",
      "Increase the database connection pool size",
      "Remove the load balancer to reduce hops",
    ],
    correctIndex: 0,
    explanation:
      "When a dependency slows down, unbounded waiting exhausts the caller's threads and the outage spreads. A circuit breaker trips after repeated failures and returns a fast fallback, giving the dependency room to recover. Pair it with strict timeouts and bulkheads to isolate the damage.",
  },

  // ── Type: data-store mismatch ──
  {
    id: "graph-on-sql",
    concept: "Choosing a data store",
    scenario:
      "A social network needs 'friends of friends' and shortest-path-between-people queries over billions of relationships. It stores everything in a relational database with a friendship join table.",
    prompt: "What's the data-store mismatch?",
    nodes: [
      { componentId: "load-balancer", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "sql-db", x: 480, y: 150 },
    ],
    edges: [
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "Deep relationship traversals turn into many expensive self-joins in SQL — a graph database is built for exactly this",
      "The app tier simply needs more servers",
      "It's missing a CDN for profile pages",
      "DNS is misconfigured for this topology",
    ],
    correctIndex: 0,
    explanation:
      "Each extra hop in 'friends of friends' adds another self-join, and join cost explodes with depth over billions of rows. A graph database stores relationships as first-class edges, making multi-hop traversals fast — the right tool for connected data.",
  },

  // ── Type: correctness / stale data ──
  {
    id: "cache-invalidation",
    concept: "Cache invalidation",
    scenario:
      "On a write, the app updates the database but leaves the cache untouched. Reads check the cache first and only fall back to the database on a miss.",
    prompt: "Why do users see stale data after an update?",
    nodes: [
      { componentId: "load-balancer", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "cache", x: 480, y: 60 },
      { componentId: "sql-db", x: 480, y: 240 },
    ],
    edges: [
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "cache" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "The write updates the DB but not the cache, so reads keep returning the old cached value — invalidate or update the cache on every write",
      "The cache serves no purpose and should be removed",
      "The database needs more read replicas",
      "The load balancer is routing writes to the wrong server",
    ],
    correctIndex: 0,
    explanation:
      "A cache is only correct if writes keep it consistent. With cache-aside, delete (or update) the key on every write so the next read re-populates it from the database; with write-through, write to cache and DB together. Leaving stale entries is the classic cache-invalidation bug.",
  },

  // ── Type: data-tier reliability ──
  {
    id: "no-db-replica",
    concept: "Replication · data-tier reliability",
    scenario:
      "A payment service runs several app servers behind a load balancer for redundancy, but writes to a single primary database with no replica.",
    prompt: "What's the reliability risk?",
    nodes: [
      { componentId: "load-balancer", x: 80, y: 150 },
      { componentId: "app-server", x: 280, y: 150 },
      { componentId: "sql-db", x: 480, y: 150 },
      { componentId: "monitoring", x: 480, y: 30 },
    ],
    edges: [
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "sql-db" },
      { source: "app-server", target: "monitoring" },
    ],
    options: [
      "The single database has no replica — if it fails you lose availability and risk data loss; add a replica with automatic failover",
      "There are too many app servers for this service",
      "Monitoring is unnecessary and adds load",
      "It needs a CDN in front of the database",
    ],
    correctIndex: 0,
    explanation:
      "Redundant app servers don't help if the one database dies — it's still a single point of failure, and for payments, potential data loss. Replicate the database (primary + standby) with automatic failover, and ensure writes are durable before acknowledging.",
  },

  // ── Type: idempotency / retry bug ──
  {
    id: "double-charge",
    concept: "Idempotency",
    scenario:
      "A payment API charges the customer's card. On a timeout the client retries the same request. Nothing prevents the server from processing it twice.",
    prompt: "What bug can a retry cause here?",
    nodes: [
      { componentId: "api-gateway", x: 100, y: 150 },
      { componentId: "app-server", x: 320, y: 150 },
      { componentId: "sql-db", x: 540, y: 150 },
    ],
    edges: [
      { source: "api-gateway", target: "app-server" },
      { source: "app-server", target: "sql-db" },
    ],
    options: [
      "The customer gets charged twice — accept a client-supplied idempotency key and ignore duplicates of the same key",
      "The API gateway becomes a single point of failure",
      "The database should be switched to NoSQL",
      "The response is just slower; there's no correctness issue",
    ],
    correctIndex: 0,
    explanation:
      "Retries are normal, so any operation with side effects must be idempotent. Have the client send a unique idempotency key with the request; the server records it and, if it sees the same key again, returns the original result instead of charging again.",
  },

  // ── Type: efficiency / polling vs push ──
  {
    id: "polling-not-push",
    concept: "Real-time delivery · push vs poll",
    scenario:
      "A chat UI shows new messages by having every connected client poll the server once per second asking 'anything new?'.",
    prompt: "Why is this real-time approach inefficient?",
    nodes: [
      { componentId: "dns", x: 80, y: 150 },
      { componentId: "load-balancer", x: 260, y: 150 },
      { componentId: "app-server", x: 440, y: 150 },
      { componentId: "nosql-db", x: 620, y: 150 },
    ],
    edges: [
      { source: "dns", target: "load-balancer" },
      { source: "load-balancer", target: "app-server" },
      { source: "app-server", target: "nosql-db" },
    ],
    options: [
      "Constant polling wastes huge resources (mostly empty responses) and still lags — push updates over a persistent connection like WebSockets",
      "The database should be relational instead of NoSQL",
      "It needs a data warehouse for the messages",
      "DNS should resolve directly to the database",
    ],
    correctIndex: 0,
    explanation:
      "With N clients polling every second, the server handles N requests/second that are almost all 'nothing new', yet messages can still be up to a second late. A persistent connection (WebSocket) lets the server push a message the instant it arrives — far less load and truly real-time.",
  },

  // ── Type: backpressure / buffering ──
  {
    id: "no-buffer-queue",
    concept: "Buffering · backpressure",
    scenario:
      "An order service writes directly into a downstream inventory store that processes updates slowly. During a flash sale the burst of orders overwhelms inventory and requests start failing.",
    prompt: "What's missing to protect the slow consumer?",
    nodes: [
      { componentId: "api-gateway", x: 100, y: 150 },
      { componentId: "app-server", x: 320, y: 150 },
      { componentId: "nosql-db", x: 540, y: 150 },
    ],
    edges: [
      { source: "api-gateway", target: "app-server" },
      { source: "app-server", target: "nosql-db" },
    ],
    options: [
      "There's no buffer between the bursty producer and the slow consumer — put a message queue in between to absorb spikes and let inventory work at its own pace",
      "The order service just needs more DNS records",
      "Remove the API gateway to cut latency",
      "Switch the order store to a relational database",
    ],
    correctIndex: 0,
    explanation:
      "Coupling a bursty producer directly to a slow consumer means spikes are passed straight through and overwhelm it. A message queue acts as a shock absorber: orders are accepted instantly and enqueued, and inventory drains the queue at a sustainable rate (backpressure) without dropping work.",
  },
];
