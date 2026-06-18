/**
 * Concept Practice — topic-organized study notes + practice questions.
 *
 * Each topic has a short "study" section (the key things to understand) and a
 * set of questions. Questions are multiple-choice; some include a small
 * architecture diagram (nodes/edges, same shape as reference solutions) and
 * render via the shared ComponentDiagram, others are pure concept questions.
 *
 * Content is built from well-established distributed-systems fundamentals.
 */

import { SPOT_THE_FLAW } from "./spotTheFlaw";

export interface PracticeQuestion {
  id: string;
  prompt: string;
  /** Optional context shown above the options. */
  scenario?: string;
  /** Optional diagram. A node may carry an `id` (so a component can repeat,
   *  e.g. a primary + replica) and a `label` override; edges reference id
   *  (or componentId when no id is given). */
  nodes?: Array<{ componentId: string; x: number; y: number; id?: string; label?: string }>;
  edges?: Array<{ source: string; target: string }>;
  /** Short per-node role text shown under the box (keyed by node id/componentId). */
  captions?: Record<string, string>;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PracticeTopic {
  id: string;
  title: string;
  blurb: string;
  /** "Study the topic" — concise key points to read before practising. */
  study: string[];
  questions: PracticeQuestion[];
}

const TOPICS: PracticeTopic[] = [
  // ───────────────────────────── Scaling ─────────────────────────────
  {
    id: "scaling",
    title: "Scaling & Statelessness",
    blurb: "Scale up vs out, and why stateless servers are the key to growth.",
    study: [
      "Vertical scaling (scale up) = a bigger machine. Simple, but there's a hard ceiling and it stays a single point of failure.",
      "Horizontal scaling (scale out) = more machines behind a load balancer. Near-limitless, the standard answer for web scale.",
      "Horizontal scaling requires stateless app servers: no session or user data in local memory, so any instance can serve any request.",
      "Keep state in shared stores (database, cache). Push sessions out of the app tier.",
      "Autoscaling adds/removes instances by load (CPU, queue depth). Design for instances that appear and vanish at any time.",
      "Scaling out introduces coordination concerns: consistency, more failure points, and harder debugging.",
    ],
    questions: [
      {
        id: "scaling-1",
        prompt: "What best describes horizontal scaling?",
        scenario: "The architecture below grows by adding identical app servers behind a load balancer.",
        nodes: [
          { componentId: "load-balancer", x: 80, y: 160 },
          { componentId: "app-server", id: "app1", label: "App 1", x: 320, y: 40 },
          { componentId: "app-server", id: "app2", label: "App 2", x: 320, y: 160 },
          { componentId: "app-server", id: "app3", label: "App 3", x: 320, y: 280 },
          { componentId: "sql-db", x: 560, y: 160 },
        ],
        edges: [
          { source: "load-balancer", target: "app1" },
          { source: "load-balancer", target: "app2" },
          { source: "load-balancer", target: "app3" },
          { source: "app1", target: "sql-db" },
          { source: "app2", target: "sql-db" },
          { source: "app3", target: "sql-db" },
        ],
        captions: {
          "load-balancer": "spreads requests",
          app1: "identical, stateless",
          app2: "identical, stateless",
          app3: "add more to grow",
          "sql-db": "shared state",
        },
        options: [
          "Adding more machines and distributing load across them",
          "Upgrading one machine with more CPU and RAM",
          "Compressing data so it takes less disk",
          "Adding a cache to reduce latency",
        ],
        correctIndex: 0,
        explanation:
          "Horizontal scaling means scaling OUT — more nodes behind a load balancer (like App 1/2/3 above). Vertical scaling (scale UP) means a bigger single box, which has a ceiling and remains a single point of failure.",
      },
      {
        id: "scaling-2",
        prompt: "Why must app servers be stateless to scale horizontally?",
        scenario: "Two app servers sit behind a load balancer. Where should a user's session live?",
        nodes: [
          { componentId: "load-balancer", x: 80, y: 150 },
          { componentId: "app-server", id: "appA", label: "App A", x: 320, y: 60 },
          { componentId: "app-server", id: "appB", label: "App B", x: 320, y: 240 },
          { componentId: "cache", label: "Session Store", x: 560, y: 150 },
        ],
        edges: [
          { source: "load-balancer", target: "appA" },
          { source: "load-balancer", target: "appB" },
          { source: "appA", target: "cache" },
          { source: "appB", target: "cache" },
        ],
        captions: {
          "load-balancer": "may route to either",
          appA: "holds no session",
          appB: "holds no session",
          cache: "shared sessions",
        },
        options: [
          "So any instance can serve any request — state lives in a shared store, not local memory",
          "So each server can keep its own private copy of every session",
          "Because stateless servers consume less electricity",
          "So the database can be removed entirely",
        ],
        correctIndex: 0,
        explanation:
          "Behind a load balancer, consecutive requests from one user may hit different servers. If state lives in a server's memory, the next server won't have it. Keep sessions/state in a shared cache or database.",
      },
      {
        id: "scaling-3",
        prompt:
          "A service runs fine on one large server, but a single failure causes downtime. What's the better direction?",
        scenario: "Today everything runs on one big box. The diagram shows the redundant alternative.",
        nodes: [
          { componentId: "load-balancer", x: 80, y: 150 },
          { componentId: "app-server", id: "n1", label: "Node 1", x: 320, y: 40 },
          { componentId: "app-server", id: "n2", label: "Node 2", x: 320, y: 150 },
          { componentId: "app-server", id: "n3", label: "Node 3", x: 320, y: 260 },
        ],
        edges: [
          { source: "load-balancer", target: "n1" },
          { source: "load-balancer", target: "n2" },
          { source: "load-balancer", target: "n3" },
        ],
        captions: {
          "load-balancer": "routes around failures",
          n1: "if one dies…",
          n2: "…the others",
          n3: "…keep serving",
        },
        options: [
          "Run several smaller instances behind a load balancer for redundancy",
          "Buy an even bigger single server",
          "Remove the load balancer to cut a hop",
          "Store sessions on the server's local disk",
        ],
        correctIndex: 0,
        explanation:
          "Scaling up keeps a single point of failure. Scaling out adds redundancy: if one instance dies, the load balancer routes around it and the service stays up.",
      },
      {
        id: "scaling-4",
        prompt: "Why can 'sticky sessions' (always routing a user to the same server) make scaling harder?",
        scenario: "A user is pinned to App 1, which holds their session in memory.",
        nodes: [
          { componentId: "load-balancer", label: "LB (sticky)", x: 80, y: 150 },
          { componentId: "app-server", id: "app1", label: "App 1", x: 320, y: 60 },
          { componentId: "app-server", id: "app2", label: "App 2", x: 320, y: 240 },
        ],
        edges: [
          { source: "load-balancer", target: "app1" },
        ],
        captions: {
          "load-balancer": "always → App 1",
          app1: "holds the session",
          app2: "idle / can't help",
        },
        options: [
          "Load becomes uneven and a server's failure loses its users' sessions",
          "They make the database run faster",
          "They remove the need for a load balancer",
          "They automatically encrypt all traffic",
        ],
        correctIndex: 0,
        explanation:
          "Stickiness pins users to nodes, so load skews and a node failure drops its users' sessions. Prefer stateless servers with a shared session store; use stickiness only as a last resort.",
      },
      {
        id: "scaling-5",
        prompt: "With autoscaling, instances start and stop automatically. What must your app handle?",
        scenario: "An autoscaler adds App 3 during a spike and will remove it when load drops.",
        nodes: [
          { componentId: "load-balancer", x: 80, y: 160 },
          { componentId: "app-server", id: "app1", label: "App 1", x: 320, y: 50 },
          { componentId: "app-server", id: "app2", label: "App 2", x: 320, y: 160 },
          { componentId: "app-server", id: "app3", label: "App 3 (new)", x: 320, y: 270 },
        ],
        edges: [
          { source: "load-balancer", target: "app1" },
          { source: "load-balancer", target: "app2" },
          { source: "load-balancer", target: "app3" },
        ],
        captions: {
          app1: "steady",
          app2: "steady",
          app3: "appears/vanishes by load",
        },
        options: [
          "Instances terminating at any time — externalize state, drain connections, start fast",
          "A fixed, never-changing server count",
          "Storing critical data only on the instance being shut down",
          "Manually restarting servers for every traffic change",
        ],
        correctIndex: 0,
        explanation:
          "Autoscaled instances are ephemeral. Don't keep important state on them, drain in-flight requests on shutdown, and keep startup quick so new capacity arrives in time.",
      },
    ],
  },

  // ───────────────────────────── Load balancing ─────────────────────────────
  {
    id: "load-balancing",
    title: "Load Balancing",
    blurb: "Spreading traffic across servers: algorithms, layers, and health checks.",
    study: [
      "A load balancer spreads requests across many servers so no one is overloaded, and routes around failed ones.",
      "L4 (transport) balancing routes by IP/port — fast, protocol-agnostic. L7 (application) balancing reads HTTP — can route by path/header/cookie.",
      "Common algorithms: round robin (simple), least connections (good for varying request durations), and hashing (same key → same server).",
      "Health checks let the balancer stop sending traffic to unhealthy instances automatically.",
      "The load balancer itself must not be a single point of failure — run it redundantly (active-passive or multiple with DNS/anycast).",
    ],
    questions: [
      {
        id: "lb-1",
        prompt: "What is the core job of the highlighted component?",
        nodes: [
          { componentId: "load-balancer", x: 80, y: 160 },
          { componentId: "app-server", id: "s1", label: "Server 1", x: 320, y: 50 },
          { componentId: "app-server", id: "s2", label: "Server 2", x: 320, y: 160 },
          { componentId: "app-server", id: "s3", label: "Server 3", x: 320, y: 270 },
        ],
        edges: [
          { source: "load-balancer", target: "s1" },
          { source: "load-balancer", target: "s2" },
          { source: "load-balancer", target: "s3" },
        ],
        captions: {
          "load-balancer": "the entry point",
          s1: "healthy",
          s2: "healthy",
          s3: "skipped if down",
        },
        options: [
          "Distribute incoming requests across multiple servers and avoid dead ones",
          "Store the application's data durably",
          "Encrypt data at rest in the database",
          "Generate unique IDs for records",
        ],
        correctIndex: 0,
        explanation:
          "A load balancer fans traffic out across healthy servers, enabling horizontal scaling and masking individual server failures.",
      },
      {
        id: "lb-2",
        prompt: "Requests have very different durations (some quick, some slow). Which algorithm balances best?",
        options: [
          "Least connections — send the next request to the server with the fewest active ones",
          "Round robin — strictly rotate through servers",
          "Random with no feedback",
          "Always the first server until it dies",
        ],
        correctIndex: 0,
        explanation:
          "Round robin ignores how busy each server is, so long requests pile up unevenly. Least-connections accounts for in-flight work, balancing far better when request times vary.",
      },
      {
        id: "lb-3",
        prompt: "What's the difference between L4 and L7 load balancing?",
        options: [
          "L4 routes by IP/port (protocol-agnostic, fast); L7 understands HTTP and can route by path, header, or cookie",
          "L4 is always slower than L7",
          "L7 cannot terminate TLS",
          "L4 can read request bodies; L7 cannot",
        ],
        correctIndex: 0,
        explanation:
          "L4 operates at the transport layer (fast, but it only sees connections). L7 parses application data, enabling content-based routing, sticky sessions, and per-route rules — at a bit more cost.",
      },
      {
        id: "lb-4",
        prompt: "Why does a load balancer run health checks against its backends?",
        options: [
          "To stop routing traffic to instances that are down or unhealthy",
          "To increase the database's storage",
          "To generate analytics dashboards",
          "To compress responses",
        ],
        correctIndex: 0,
        explanation:
          "Health checks let the balancer detect failed/overloaded instances and remove them from rotation automatically, so users aren't sent to broken servers.",
      },
      {
        id: "lb-5",
        prompt: "You add a load balancer in front of your servers. What new risk must you address?",
        scenario: "All traffic now funnels through a single load balancer.",
        nodes: [
          { componentId: "dns", x: 60, y: 150 },
          { componentId: "load-balancer", label: "LB (only one)", x: 280, y: 150 },
          { componentId: "app-server", id: "a1", label: "App 1", x: 520, y: 60 },
          { componentId: "app-server", id: "a2", label: "App 2", x: 520, y: 240 },
        ],
        edges: [
          { source: "dns", target: "load-balancer" },
          { source: "load-balancer", target: "a1" },
          { source: "load-balancer", target: "a2" },
        ],
        captions: {
          "load-balancer": "every request passes here",
          a1: "fine, but unreachable…",
          a2: "…if the LB dies",
        },
        options: [
          "The load balancer itself is now a single point of failure — make it redundant",
          "The servers can no longer share a database",
          "DNS becomes unnecessary",
          "TLS can no longer be used",
        ],
        correctIndex: 0,
        explanation:
          "Funneling all traffic through one balancer creates a new SPOF. Run it redundantly (active-passive failover, or multiple balancers via DNS/anycast) so the entry point isn't fragile.",
      },
    ],
  },

  // ───────────────────────────── Caching ─────────────────────────────
  {
    id: "caching",
    title: "Caching",
    blurb: "Serving hot data from memory: strategies, invalidation, and failure modes.",
    study: [
      "A cache stores recent/hot results in fast memory so repeated reads skip slower storage. It shines on read-heavy workloads.",
      "Cache-aside (lazy): app checks cache, on miss reads the DB and populates the cache. Most common.",
      "Write-through: write to cache and DB together (consistent, slightly slower writes). Write-back: write to cache, flush to DB later (fast, risk of loss).",
      "Invalidation is the hard part: on a write, update or delete the cached value or reads go stale.",
      "Eviction policies (LRU/LFU/TTL) decide what to drop when full. Set TTLs so data doesn't live forever.",
      "Failure modes: a cold or down cache can send all reads to the DB at once (cache stampede / thundering herd).",
    ],
    questions: [
      {
        id: "cache-1",
        prompt: "Which workload benefits most from a cache?",
        options: [
          "Read-heavy with repeated lookups of the same data",
          "Write-only logging with no reads",
          "Each request reads a unique, never-repeated value",
          "Workloads that need every read to be perfectly fresh",
        ],
        correctIndex: 0,
        explanation:
          "Caches pay off when the same data is read many times. If every read is unique or must be perfectly fresh, the cache hit rate (or correctness) collapses.",
      },
      {
        id: "cache-2",
        prompt: "In the cache-aside (lazy loading) pattern, what happens on a cache miss?",
        scenario: "The app checks the cache first, and only reads the database when the cache doesn't have the value.",
        nodes: [
          { componentId: "app-server", x: 80, y: 150 },
          { componentId: "cache", label: "Cache (1st)", x: 320, y: 60 },
          { componentId: "sql-db", label: "DB (on miss)", x: 320, y: 240 },
        ],
        edges: [
          { source: "app-server", target: "cache" },
          { source: "app-server", target: "sql-db" },
        ],
        captions: {
          "app-server": "read path",
          cache: "checked first",
          "sql-db": "only on miss, then cache it",
        },
        options: [
          "The app reads from the database, returns it, and stores it in the cache for next time",
          "The request fails until the cache is manually warmed",
          "The cache writes the value to the database",
          "The database is bypassed entirely",
        ],
        correctIndex: 0,
        explanation:
          "Cache-aside: check cache → on miss, read DB → populate cache → return. The cache fills lazily with data that's actually requested.",
      },
      {
        id: "cache-3",
        prompt:
          "On a write you update the database but not the cache. Reads check the cache first. What goes wrong?",
        options: [
          "Reads keep returning the old cached value (stale) — invalidate/update the cache on write",
          "Writes become impossible",
          "The database loses data",
          "The cache automatically stays correct",
        ],
        correctIndex: 0,
        explanation:
          "This is the classic cache-invalidation bug. Either delete the key on write (cache-aside) so it's re-read fresh, or write through to both cache and DB.",
      },
      {
        id: "cache-4",
        prompt: "A cache that fronts almost all reads suddenly restarts empty. What's the danger?",
        scenario: "Normally the cache absorbs ~95% of reads. It just restarted cold.",
        nodes: [
          { componentId: "load-balancer", x: 60, y: 150 },
          { componentId: "app-server", x: 280, y: 150 },
          { componentId: "cache", label: "Cache (empty)", x: 520, y: 60 },
          { componentId: "sql-db", x: 520, y: 240 },
        ],
        edges: [
          { source: "load-balancer", target: "app-server" },
          { source: "app-server", target: "cache" },
          { source: "app-server", target: "sql-db" },
        ],
        captions: {
          cache: "0% hit rate now",
          "sql-db": "suddenly gets 100% of reads",
        },
        options: [
          "Every read misses at once and stampedes the database, which may collapse",
          "Nothing — the database is always sized for full load",
          "Only writes are affected",
          "The cache can never recover",
        ],
        correctIndex: 0,
        explanation:
          "A 'cache stampede' / thundering herd: 100% of reads suddenly hit a DB sized only for misses. Mitigate with request coalescing (one fetch per key), gradual warming, and stale-while-revalidate.",
      },
      {
        id: "cache-5",
        prompt: "A cache is full. An LRU eviction policy will drop which entry?",
        options: [
          "The least recently used item",
          "The most recently used item",
          "The largest item by size",
          "A random item every time regardless of use",
        ],
        correctIndex: 0,
        explanation:
          "LRU = Least Recently Used: evict whatever hasn't been touched for the longest, assuming recently used data is likely to be used again.",
      },
    ],
  },

  // ───────────────────────────── CDN ─────────────────────────────
  {
    id: "cdn",
    title: "CDN & Content Delivery",
    blurb: "Serving static and media content fast from the edge.",
    study: [
      "A CDN caches content at edge servers around the world, so bytes come from a location near the user — cutting latency and origin load.",
      "Pull CDN: edge fetches from the origin on first request, then caches it. Push CDN: you upload content to the edge ahead of time.",
      "CDNs are ideal for static assets and media (images, video, JS/CSS). Don't route uncacheable, per-user dynamic data through a CDN cache.",
      "The origin is the source of truth the CDN pulls from on a cache miss; design it to survive only miss traffic.",
      "Cache-control headers and TTLs govern how long edges keep content; cache busting (versioned URLs) forces refresh.",
    ],
    questions: [
      {
        id: "cdn-1",
        prompt: "Why does a CDN reduce latency for global users?",
        scenario: "A user requests an image; the CDN edge serves it instead of the distant origin.",
        nodes: [
          { componentId: "dns", label: "User", x: 60, y: 150 },
          { componentId: "cdn", label: "CDN edge", x: 300, y: 150 },
          { componentId: "object-storage", label: "Origin", x: 540, y: 150 },
        ],
        edges: [
          { source: "dns", target: "cdn" },
          { source: "cdn", target: "object-storage" },
        ],
        captions: {
          dns: "in Tokyo",
          cdn: "nearby cached copy",
          "object-storage": "far away, only on miss",
        },
        options: [
          "It serves cached content from an edge server geographically near the user",
          "It makes the origin server's CPU faster",
          "It compresses the database",
          "It replaces the need for DNS",
        ],
        correctIndex: 0,
        explanation:
          "Distance adds latency. A CDN keeps copies at edge locations worldwide, so a user in Tokyo is served from Tokyo instead of crossing oceans to the origin.",
      },
      {
        id: "cdn-2",
        prompt: "Which content is the BEST fit to serve via a CDN?",
        options: [
          "Static assets and media: images, video, JS, CSS",
          "A user's private, always-changing account balance",
          "A one-time POST that mutates the database",
          "A real-time bidding decision unique to each request",
        ],
        correctIndex: 0,
        explanation:
          "CDNs cache content that's the same for many users and changes slowly. Per-user, per-request dynamic data isn't cacheable at the edge (though edge compute can help).",
      },
      {
        id: "cdn-3",
        prompt: "In a pull-based CDN, what happens on the first request for an object?",
        options: [
          "The edge fetches it from the origin, caches it, then serves later requests locally",
          "The request fails until you manually upload the object",
          "The origin is never contacted",
          "The object is written back to the database",
        ],
        correctIndex: 0,
        explanation:
          "Pull CDNs populate lazily: first request is a miss that fetches from origin and caches; subsequent requests are edge hits. Push CDNs require you to pre-upload content.",
      },
      {
        id: "cdn-4",
        prompt: "An image service streams full-size images to users through its app servers. What should change?",
        scenario: "Global audience; the same images are viewed many times.",
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
          "Serve images through a CDN backed by object storage, not through the app servers",
          "Move the images into the SQL database",
          "Add a rate limiter in front of the images",
          "Resolve DNS straight to object storage with no caching",
        ],
        correctIndex: 0,
        explanation:
          "Streaming media through app servers wastes their bandwidth and adds latency for distant users. Put a CDN in front of object storage; the origin only handles cache misses and uploads.",
      },
      {
        id: "cdn-5",
        prompt: "You deploy new CSS but users still load the old version for hours. Why?",
        options: [
          "The CDN/browser is serving a cached copy until its TTL expires — use versioned/cache-busting URLs",
          "The origin server crashed",
          "DNS stopped resolving",
          "The database wasn't migrated",
        ],
        correctIndex: 0,
        explanation:
          "Edge and browser caches honor TTLs. To force an immediate refresh, change the URL (e.g. app.v2.css or a content hash) so it's treated as a new object.",
      },
    ],
  },

  // ───────────────────────────── SQL vs NoSQL ─────────────────────────────
  {
    id: "databases",
    title: "SQL vs NoSQL & Data Modeling",
    blurb: "Choosing the right store and modeling data for how you query it.",
    study: [
      "Relational (SQL): structured schema, ACID transactions, flexible joins and ad-hoc queries. Great when relationships and consistency matter.",
      "NoSQL families: key-value, document, wide-column, graph. Each trades flexible querying for scale or a specific access pattern.",
      "Wide-column/document stores scale writes horizontally and favor denormalization — model data around your queries, duplicating where needed.",
      "Graph databases store relationships as first-class edges — ideal for deep traversals (friends-of-friends, shortest path).",
      "Pick by access pattern: many-to-many joins + transactions → SQL; massive simple key lookups → key-value/wide-column; connected data → graph; full-text → search engine.",
      "Indexes speed reads but slow writes and cost storage; a leading-wildcard LIKE can't use a B-tree index.",
    ],
    questions: [
      {
        id: "db-1",
        prompt: "You need multi-row transactions, joins across many tables, and ad-hoc queries. Which store fits?",
        options: [
          "A relational (SQL) database",
          "A key-value store",
          "A search index used as the primary store",
          "A data warehouse for live transactions",
        ],
        correctIndex: 0,
        explanation:
          "Joins, ad-hoc queries, and ACID transactions are exactly what relational databases are built for. NoSQL stores trade these away for scale or a specific access pattern.",
      },
      {
        id: "db-2",
        prompt:
          "A social graph needs 'friends of friends' and shortest-path queries over billions of relationships. Best store?",
        scenario: "Pick the store for deeply connected, traversal-heavy data.",
        nodes: [
          { componentId: "app-server", x: 100, y: 150 },
          { componentId: "graph-db", x: 360, y: 150 },
        ],
        edges: [{ source: "app-server", target: "graph-db" }],
        captions: {
          "graph-db": "edges are first-class → fast traversals",
        },
        options: [
          "A graph database",
          "A single relational table with self-joins",
          "A key-value cache",
          "A data warehouse",
        ],
        correctIndex: 0,
        explanation:
          "Each extra hop becomes another expensive self-join in SQL. Graph databases store edges as first-class citizens, making multi-hop traversals fast.",
      },
      {
        id: "db-3",
        prompt: "What's a core idea when modeling data for a wide-column NoSQL store like Cassandra?",
        options: [
          "Denormalize and shape tables around your queries, duplicating data as needed",
          "Always fully normalize to third normal form",
          "Rely on cross-table joins at read time",
          "Use foreign keys to enforce relationships",
        ],
        correctIndex: 0,
        explanation:
          "Wide-column stores don't do joins well. You design a table per query pattern and accept duplication — storage is cheap, and it keeps reads to a single partition.",
      },
      {
        id: "db-4",
        prompt: "Why does adding many indexes to a write-heavy table hurt?",
        options: [
          "Every write must also update each index, slowing writes and using more storage",
          "Indexes make reads slower",
          "Indexes prevent the table from being queried",
          "Indexes disable transactions",
        ],
        correctIndex: 0,
        explanation:
          "Indexes speed reads but each one is extra work on every insert/update/delete, plus storage. Index for the queries you actually run — no more.",
      },
      {
        id: "db-5",
        prompt: "Search runs SQL LIKE '%term%' over millions of rows and is slow. Why, and what fixes it?",
        options: [
          "A leading wildcard can't use an index, forcing a full scan — use a dedicated search index",
          "The table needs fewer columns",
          "Switching to a key-value store fixes text search",
          "Adding more app servers fixes it",
        ],
        correctIndex: 0,
        explanation:
          "'%term%' defeats B-tree indexes because it doesn't anchor on a prefix. Real text search needs an inverted index (a search engine), kept updated via change data capture.",
      },
    ],
  },

  // ───────────────────────────── Replication ─────────────────────────────
  {
    id: "replication",
    title: "Replication & Read Scaling",
    blurb: "Copies of data for read scale and failover — and the lag that comes with it.",
    study: [
      "Replication keeps copies of data on multiple nodes — for durability, failover, and serving reads from replicas.",
      "Primary-replica (leader-follower): writes go to the primary, reads can be spread across replicas. Scales reads, not writes.",
      "Replication lag means a replica can be slightly behind the primary — a read right after a write may be stale.",
      "Read-your-writes: route a user's reads to the primary (or a synced replica) right after they write, to avoid showing them stale data.",
      "Failover: if the primary dies, promote a replica. Synchronous replication avoids data loss but adds write latency; async is faster but can lose recent writes.",
      "Multi-leader / leaderless setups allow writes in multiple places but must resolve conflicts.",
    ],
    questions: [
      {
        id: "repl-1",
        prompt: "In primary-replica replication, what does adding read replicas scale?",
        scenario: "Writes go to the primary; reads are spread across replicas that copy from it.",
        nodes: [
          { componentId: "app-server", x: 80, y: 150 },
          { componentId: "sql-db", id: "primary", label: "Primary", x: 320, y: 150 },
          { componentId: "sql-db", id: "rep1", label: "Replica 1", x: 560, y: 50 },
          { componentId: "sql-db", id: "rep2", label: "Replica 2", x: 560, y: 250 },
        ],
        edges: [
          { source: "app-server", target: "primary" },
          { source: "primary", target: "rep1" },
          { source: "primary", target: "rep2" },
        ],
        captions: {
          primary: "all writes",
          rep1: "serves reads",
          rep2: "serves reads",
        },
        options: [
          "Read capacity — reads spread across replicas; writes still go to the primary",
          "Write capacity, because writes split across replicas",
          "Storage only, not throughput",
          "Nothing; it's purely for backup",
        ],
        correctIndex: 0,
        explanation:
          "Replicas serve reads, so read-heavy workloads scale by adding them. Writes still funnel through the single primary — to scale writes you need sharding.",
      },
      {
        id: "repl-2",
        prompt: "A user updates their profile, then immediately sees the old value. Most likely cause?",
        options: [
          "Replication lag — the read hit a replica that hadn't received the write yet",
          "The write was never sent",
          "The cache was removed",
          "The load balancer is broken",
        ],
        correctIndex: 0,
        explanation:
          "Async replicas trail the primary by a small delay. Reading from a lagging replica right after a write returns stale data.",
      },
      {
        id: "repl-3",
        prompt: "How do you give a user 'read-your-writes' consistency after they save something?",
        options: [
          "Route their immediate reads to the primary (or a replica known to be caught up)",
          "Disable replication entirely",
          "Always read from the most lagging replica",
          "Cache the old value longer",
        ],
        correctIndex: 0,
        explanation:
          "Read-your-writes means a user always sees their own latest change. Pin their post-write reads to the primary or a synced replica for a short window.",
      },
      {
        id: "repl-4",
        prompt: "What's the trade-off between synchronous and asynchronous replication?",
        options: [
          "Sync avoids data loss but adds write latency; async is faster but can lose recent writes on failover",
          "Async is always safer than sync",
          "Sync removes the need for a primary",
          "There's no difference in durability",
        ],
        correctIndex: 0,
        explanation:
          "Synchronous waits for replicas to confirm before acking the write (durable, slower). Asynchronous acks immediately (fast) but unreplicated writes can be lost if the primary dies.",
      },
      {
        id: "repl-5",
        prompt: "A payment service has redundant app servers but a single database with no replica. The risk?",
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
          "The single DB is a SPOF with data-loss risk — add a replica with automatic failover",
          "There are too many app servers",
          "The load balancer is redundant",
          "It needs a CDN in front of the DB",
        ],
        correctIndex: 0,
        explanation:
          "App redundancy doesn't help if the one database dies. Replicate it (primary + standby) with automatic failover, and prefer synchronous replication for money so no acknowledged write is lost.",
      },
    ],
  },

  // ───────────────────────────── Sharding ─────────────────────────────
  {
    id: "sharding",
    title: "Sharding & Partitioning",
    blurb: "Splitting data across nodes to scale writes — and the pitfalls.",
    study: [
      "Sharding (horizontal partitioning) splits one dataset across many nodes so writes and storage scale beyond one machine.",
      "The shard key decides which node holds a row. A good key spreads load evenly and keeps common queries on one shard.",
      "Hash sharding spreads evenly but breaks range scans. Range sharding keeps ranges together but risks hot shards (e.g. recent timestamps).",
      "Hot spots: a poorly chosen key (or a celebrity row) sends disproportionate traffic to one shard.",
      "Cross-shard queries and transactions are expensive — design so most operations touch a single shard.",
      "Rebalancing when adding nodes is painful with naive hashing; consistent hashing minimizes data movement.",
    ],
    questions: [
      {
        id: "shard-1",
        prompt: "What does sharding primarily let you scale that read replicas don't?",
        scenario: "The dataset is split across shards by a shard key; each shard owns part of the data and its writes.",
        nodes: [
          { componentId: "app-server", label: "Router", x: 80, y: 160 },
          { componentId: "sql-db", id: "sh1", label: "Shard A", x: 340, y: 40 },
          { componentId: "sql-db", id: "sh2", label: "Shard B", x: 340, y: 160 },
          { componentId: "sql-db", id: "sh3", label: "Shard C", x: 340, y: 280 },
        ],
        edges: [
          { source: "app-server", target: "sh1" },
          { source: "app-server", target: "sh2" },
          { source: "app-server", target: "sh3" },
        ],
        captions: {
          "app-server": "routes by shard key",
          sh1: "keys A–H",
          sh2: "keys I–P",
          sh3: "keys Q–Z",
        },
        options: [
          "Write throughput and total storage, by splitting data across nodes",
          "Only read throughput",
          "Cache hit rate",
          "DNS resolution speed",
        ],
        correctIndex: 0,
        explanation:
          "Replicas scale reads but every write still hits one primary. Sharding partitions the data so different nodes own different writes — scaling writes and storage.",
      },
      {
        id: "shard-2",
        prompt: "What makes a good shard key?",
        options: [
          "High cardinality that spreads load evenly and keeps common queries on one shard",
          "A value almost every row shares",
          "Always the current timestamp",
          "A column that's frequently NULL",
        ],
        correctIndex: 0,
        explanation:
          "A good key distributes data and traffic uniformly and aligns with access patterns so queries hit a single shard. Low-cardinality or time-based keys cause hot spots.",
      },
      {
        id: "shard-3",
        prompt: "You shard by 'created_at' timestamp. What problem appears?",
        scenario: "Shards hold time ranges. All of today's traffic lands on the newest shard.",
        nodes: [
          { componentId: "app-server", label: "Router", x: 80, y: 160 },
          { componentId: "sql-db", id: "old1", label: "Jan", x: 340, y: 40 },
          { componentId: "sql-db", id: "old2", label: "Feb", x: 340, y: 160 },
          { componentId: "sql-db", id: "hot", label: "Today (hot)", x: 340, y: 280 },
        ],
        edges: [
          { source: "app-server", target: "hot" },
        ],
        captions: {
          old1: "idle",
          old2: "idle",
          hot: "all writes pile up here",
        },
        options: [
          "All new writes hit the newest shard — a hot spot — while old shards sit idle",
          "Reads become impossible",
          "Storage is used twice",
          "Every query must scan all shards equally",
        ],
        correctIndex: 0,
        explanation:
          "Time-based keys funnel all current traffic to one shard (the 'latest' range). Use a high-cardinality key (e.g. user_id hash) so writes spread across shards.",
      },
      {
        id: "shard-4",
        prompt: "Why are cross-shard transactions discouraged?",
        options: [
          "They require coordination across nodes, which is slow and complex (often needs 2PC or sagas)",
          "They are faster than single-shard ones",
          "They make indexes unnecessary",
          "Databases forbid them entirely",
        ],
        correctIndex: 0,
        explanation:
          "A transaction spanning shards needs a distributed protocol (two-phase commit) or a saga to stay correct — costly and failure-prone. Model data so most operations stay within one shard.",
      },
      {
        id: "shard-5",
        prompt: "Naive hash-mod-N sharding makes adding a node painful. What helps?",
        options: [
          "Consistent hashing — adding/removing a node moves only a small slice of keys",
          "Storing all data on one node",
          "Switching to a CDN",
          "Using larger machines only",
        ],
        correctIndex: 0,
        explanation:
          "With hash mod N, changing N reshuffles almost everything. Consistent hashing places nodes/keys on a ring so a change only moves the affected arc — minimal data movement.",
      },
    ],
  },

  // ───────────────────────────── Consistency / CAP ─────────────────────────────
  {
    id: "consistency",
    title: "Consistency & CAP",
    blurb: "The fundamental trade-offs between consistency, availability, and partitions.",
    study: [
      "CAP: during a network partition you can keep Consistency or Availability, not both. Without a partition you can have both.",
      "Strong consistency: every read sees the latest write. Eventual consistency: replicas converge over time; reads can be briefly stale.",
      "CP systems refuse some requests during a partition to stay consistent; AP systems stay available and reconcile later.",
      "PACELC extends CAP: Else (no partition), you still trade Latency vs Consistency.",
      "Quorums tune it per request: with N replicas, R + W > N gives read-your-writes consistency; lower R/W favors availability and latency.",
      "Pick by need: money/inventory often want strong consistency; likes/feeds/presence tolerate eventual.",
    ],
    questions: [
      {
        id: "cap-1",
        prompt: "What does the CAP theorem actually force you to choose between during a network partition?",
        options: [
          "Consistency or Availability",
          "Cost or Performance",
          "Caching or Persistence",
          "Latency or Throughput",
        ],
        correctIndex: 0,
        explanation:
          "When the network splits, a node either refuses to answer (preserving consistency) or answers possibly-stale data (preserving availability). You can't have both during the partition.",
      },
      {
        id: "cap-2",
        prompt: "Which use case most needs STRONG consistency?",
        scenario: "Reads may be served by a replica that lags slightly behind the primary.",
        nodes: [
          { componentId: "app-server", x: 80, y: 150 },
          { componentId: "sql-db", id: "primary", label: "Primary", x: 320, y: 60 },
          { componentId: "sql-db", id: "replica", label: "Replica", x: 320, y: 240 },
        ],
        edges: [
          { source: "app-server", target: "primary" },
          { source: "primary", target: "replica" },
          { source: "app-server", target: "replica" },
        ],
        captions: {
          primary: "latest write",
          replica: "may be stale (lag)",
        },
        options: [
          "An account balance / inventory count where being wrong causes real harm",
          "A 'likes' counter on a post",
          "A user's presence (online/offline) indicator",
          "A view count on a video",
        ],
        correctIndex: 0,
        explanation:
          "Money and inventory can't tolerate showing stale or conflicting values (double-spend, overselling). Likes, presence, and view counts tolerate eventual consistency.",
      },
      {
        id: "cap-3",
        prompt: "With N=3 replicas, what does choosing R=2 and W=2 (R + W > N) give you?",
        options: [
          "Overlapping read/write sets, so reads see the latest write (read-your-writes)",
          "Maximum availability with the weakest consistency",
          "Writes that never need acknowledgement",
          "A guarantee of zero latency",
        ],
        correctIndex: 0,
        explanation:
          "If R + W > N, the read quorum and write quorum overlap on at least one up-to-date replica, so reads observe the latest acknowledged write.",
      },
      {
        id: "cap-4",
        prompt: "What does 'eventual consistency' mean in practice?",
        options: [
          "Replicas may briefly disagree but converge to the same value if writes stop",
          "Data is never consistent",
          "Every read always returns the newest write instantly",
          "Writes are silently discarded",
        ],
        correctIndex: 0,
        explanation:
          "Eventual consistency allows temporary divergence for availability/latency; given no new writes, all replicas eventually reflect the same state.",
      },
      {
        id: "cap-5",
        prompt: "PACELC adds what idea beyond CAP?",
        options: [
          "Even without a partition (Else), you trade Latency vs Consistency",
          "Partitions never actually happen",
          "Consistency is always free",
          "Availability is impossible in distributed systems",
        ],
        correctIndex: 0,
        explanation:
          "PACELC: if Partition, choose Availability or Consistency; Else (normal operation), choose Latency or Consistency. Strong consistency usually costs extra latency even with a healthy network.",
      },
    ],
  },

  // ───────────────────────────── Message queues ─────────────────────────────
  {
    id: "messaging",
    title: "Message Queues & Async",
    blurb: "Decoupling services, absorbing bursts, and delivery guarantees.",
    study: [
      "A message queue decouples producers from consumers: the producer drops a message and moves on; consumers process at their own pace.",
      "Benefits: smooths bursts (buffering/backpressure), isolates failures, and enables async work so requests return fast.",
      "Work queue (competing consumers): each message handled by exactly one consumer — good for tasks. Pub/sub: each subscriber gets its own copy — good for fan-out events.",
      "Delivery semantics: at-most-once (may drop), at-least-once (may duplicate — make consumers idempotent), exactly-once (hard, usually emulated).",
      "Visibility timeout: a consumer 'leases' a message; if it doesn't ack in time (crash), the message reappears for another consumer.",
      "A dead-letter queue holds messages that repeatedly fail so they don't block the queue.",
    ],
    questions: [
      {
        id: "mq-1",
        prompt: "What's the main benefit of putting a queue between a producer and a slow consumer?",
        scenario: "A bursty producer writes to a queue; a slower worker drains it at its own pace.",
        nodes: [
          { componentId: "app-server", label: "Producer", x: 80, y: 150 },
          { componentId: "message-queue", label: "Queue", x: 320, y: 150 },
          { componentId: "stream-processor", label: "Worker", x: 560, y: 150 },
        ],
        edges: [
          { source: "app-server", target: "message-queue" },
          { source: "message-queue", target: "stream-processor" },
        ],
        captions: {
          "app-server": "bursty, fast",
          "message-queue": "buffers the spike",
          "stream-processor": "steady, slower",
        },
        options: [
          "It absorbs bursts and lets the consumer work at its own pace (backpressure)",
          "It makes the database schema simpler",
          "It removes the need for the consumer",
          "It guarantees the consumer never fails",
        ],
        correctIndex: 0,
        explanation:
          "A queue is a shock absorber: spikes are buffered instead of overwhelming the consumer, which drains the backlog at a sustainable rate.",
      },
      {
        id: "mq-2",
        prompt: "On signup the app sends a welcome email synchronously before responding. Better design?",
        nodes: [
          { componentId: "load-balancer", x: 80, y: 150 },
          { componentId: "app-server", x: 280, y: 150 },
          { componentId: "sql-db", x: 480, y: 60 },
          { componentId: "notification-service", x: 480, y: 240 },
        ],
        edges: [
          { source: "load-balancer", target: "app-server" },
          { source: "app-server", target: "sql-db" },
          { source: "app-server", target: "notification-service" },
        ],
        options: [
          "Publish an event to a queue and send the email asynchronously via a worker",
          "Shard the database immediately",
          "Remove the load balancer",
          "Skip writing the user to the database",
        ],
        correctIndex: 0,
        explanation:
          "A slow/down email provider shouldn't slow or fail signups. Emit an event to a queue; a worker sends the email asynchronously and retries on its own.",
      },
      {
        id: "mq-3",
        prompt: "What's the difference between a work queue and pub/sub?",
        options: [
          "Work queue: one consumer handles each message. Pub/sub: every subscriber gets its own copy",
          "They are identical",
          "Pub/sub guarantees exactly-once; work queues can't deliver at all",
          "Work queues are only for images",
        ],
        correctIndex: 0,
        explanation:
          "Competing consumers on a work queue split the load (each message done once). Pub/sub fans an event out so multiple independent subscribers each react to it.",
      },
      {
        id: "mq-4",
        prompt: "Your queue guarantees at-least-once delivery. What must consumers be?",
        options: [
          "Idempotent — processing the same message twice has no extra effect",
          "Stateful, storing each message in memory",
          "Single-threaded only",
          "Able to reject all duplicates at the network layer",
        ],
        correctIndex: 0,
        explanation:
          "At-least-once means duplicates can happen (e.g. a crash before ack). Make handlers idempotent (dedupe by message/idempotency key) so re-delivery is safe.",
      },
      {
        id: "mq-5",
        prompt: "A worker pulls a message, then crashes before finishing. With a visibility timeout, what happens?",
        options: [
          "The message becomes visible again after the timeout and another worker picks it up",
          "The message is lost forever",
          "The whole queue is deleted",
          "All consumers stop permanently",
        ],
        correctIndex: 0,
        explanation:
          "The message is leased, not deleted, until acked. If the worker doesn't ack before the visibility timeout, the message reappears for redelivery — that's how crashes are tolerated.",
      },
    ],
  },

  // ───────────────────────────── Rate limiting ─────────────────────────────
  {
    id: "rate-limiting",
    title: "Rate Limiting",
    blurb: "Protecting systems from abuse and overload with request caps.",
    study: [
      "Rate limiting caps how many requests a client can make in a window — protecting against abuse, runaway clients, and overload.",
      "Token bucket: tokens refill at a steady rate; each request spends one. Allows controlled bursts up to the bucket size.",
      "Leaky bucket: processes at a fixed rate, smoothing bursts into a steady stream.",
      "Fixed window counter: simple, but allows a 2x burst at the window boundary. Sliding window log/counter fixes that at higher cost.",
      "In a distributed setup, limits must be shared across instances — usually via a central store (e.g. Redis counters).",
      "Apply limits early (at the gateway) and return 429 with a Retry-After so clients back off.",
    ],
    questions: [
      {
        id: "rl-1",
        prompt: "What's the primary purpose of the highlighted component?",
        scenario: "It sits at the edge, in front of the app servers.",
        nodes: [
          { componentId: "dns", label: "Clients", x: 60, y: 150 },
          { componentId: "rate-limiter", x: 280, y: 150 },
          { componentId: "app-server", x: 500, y: 150 },
          { componentId: "nosql-db", x: 700, y: 150 },
        ],
        edges: [
          { source: "dns", target: "rate-limiter" },
          { source: "rate-limiter", target: "app-server" },
          { source: "app-server", target: "nosql-db" },
        ],
        captions: {
          "rate-limiter": "caps requests per client",
          "app-server": "protected from floods",
        },
        options: [
          "Cap request rates to prevent abuse and protect the system from overload",
          "Encrypt requests in transit",
          "Cache responses for reuse",
          "Generate unique IDs",
        ],
        correctIndex: 0,
        explanation:
          "Rate limiting stops a single client from flooding the service (intentionally or via a bug) and sheds excess load so everyone else stays served.",
      },
      {
        id: "rl-2",
        prompt: "Which algorithm naturally allows short bursts while enforcing an average rate?",
        options: [
          "Token bucket",
          "A strict per-second hard cap with no allowance",
          "Random dropping",
          "Round robin",
        ],
        correctIndex: 0,
        explanation:
          "Token bucket refills tokens at the average rate but lets a client spend a saved-up burst (up to the bucket size), tolerating spiky-but-bounded traffic.",
      },
      {
        id: "rl-3",
        prompt: "Why can a fixed-window counter allow nearly double the limit briefly?",
        options: [
          "A client can send a full window's worth at the end of one window and again at the start of the next",
          "It never actually limits anything",
          "It counts requests twice",
          "It resets randomly",
        ],
        correctIndex: 0,
        explanation:
          "Two bursts straddling the window boundary both 'fit' in their respective windows, briefly doubling the effective rate. Sliding-window approaches smooth this out.",
      },
      {
        id: "rl-4",
        prompt: "You run many API instances. How do you enforce one global limit per user?",
        options: [
          "Track counters in a shared store (e.g. Redis) all instances read/update",
          "Let each instance keep its own private counter",
          "Limit only the first instance",
          "Disable limits when scaled out",
        ],
        correctIndex: 0,
        explanation:
          "Per-instance counters let a user multiply their allowance by the number of servers. A shared, atomic counter store enforces a single cluster-wide limit.",
      },
      {
        id: "rl-5",
        prompt: "When a client exceeds the limit, what's the best response?",
        options: [
          "HTTP 429 Too Many Requests with a Retry-After hint",
          "Silently drop the connection",
          "HTTP 200 with empty body",
          "HTTP 500 Internal Server Error",
        ],
        correctIndex: 0,
        explanation:
          "429 clearly signals rate limiting, and Retry-After tells well-behaved clients exactly when to try again, encouraging proper backoff.",
      },
    ],
  },

  // ───────────────────────────── Consistent hashing ─────────────────────────────
  {
    id: "consistent-hashing",
    title: "Consistent Hashing",
    blurb: "Distributing keys so adding/removing nodes barely disturbs the cluster.",
    study: [
      "Plain hash-mod-N maps key→node, but changing N (adding/removing a node) remaps almost every key — catastrophic for caches and shards.",
      "Consistent hashing places both nodes and keys on a ring; a key belongs to the next node clockwise.",
      "Adding or removing a node only moves the keys in its neighboring arc — roughly 1/N of the data, not all of it.",
      "Virtual nodes (many ring points per physical node) even out load and spread a failed node's keys across many peers.",
      "It's the backbone of distributed caches and Dynamo-style stores for partitioning with minimal reshuffling.",
    ],
    questions: [
      {
        id: "ch-1",
        prompt: "Why is plain 'hash(key) mod N' bad when the number of nodes changes?",
        scenario: "Keys are distributed across cache nodes by a hash of the key.",
        nodes: [
          { componentId: "app-server", label: "Router", x: 80, y: 160 },
          { componentId: "cache", id: "n1", label: "Node 1", x: 340, y: 40 },
          { componentId: "cache", id: "n2", label: "Node 2", x: 340, y: 160 },
          { componentId: "cache", id: "n3", label: "Node 3", x: 340, y: 280 },
        ],
        edges: [
          { source: "app-server", target: "n1" },
          { source: "app-server", target: "n2" },
          { source: "app-server", target: "n3" },
        ],
        captions: {
          "app-server": "key → which node?",
          n2: "add/remove a node…",
          n3: "…and mod N remaps most keys",
        },
        options: [
          "Changing N remaps almost every key to a different node",
          "It can only hash strings",
          "It requires a load balancer",
          "It always sends keys to one node",
        ],
        correctIndex: 0,
        explanation:
          "With mod N, incrementing N changes the result for nearly all keys, so a cache loses almost everything and a sharded DB must move almost all data.",
      },
      {
        id: "ch-2",
        prompt: "In consistent hashing, which node owns a key?",
        options: [
          "The first node found going clockwise from the key's position on the ring",
          "Always the node with the most memory",
          "A randomly chosen node each request",
          "The node that was added most recently",
        ],
        correctIndex: 0,
        explanation:
          "Keys and nodes are hashed onto a ring; a key is owned by the next node clockwise. This makes placement deterministic and stable across membership changes.",
      },
      {
        id: "ch-3",
        prompt: "When you add a node to a consistent-hashing ring, how much data moves?",
        options: [
          "Only the keys in the new node's arc — roughly 1/N of the data",
          "All of the data",
          "Exactly half the data",
          "None — the new node stays empty",
        ],
        correctIndex: 0,
        explanation:
          "A new node takes over only the arc between it and its predecessor, so just its share of keys relocate — the whole point of consistent hashing.",
      },
      {
        id: "ch-4",
        prompt: "What problem do virtual nodes solve?",
        options: [
          "Uneven load — they give each physical node many ring points so data spreads evenly",
          "They encrypt the keys",
          "They remove the need for replication",
          "They make hashing slower on purpose",
        ],
        correctIndex: 0,
        explanation:
          "With few points, arcs are uneven and one node can be overloaded. Many virtual points per node smooth the distribution and spread a failed node's load across many peers.",
      },
      {
        id: "ch-5",
        prompt: "Which systems most rely on consistent hashing?",
        options: [
          "Distributed caches and Dynamo-style key-value stores",
          "Single-node relational databases",
          "Static file servers",
          "DNS resolvers",
        ],
        correctIndex: 0,
        explanation:
          "Anything that partitions data across a changing set of nodes (distributed caches, Cassandra/Dynamo) uses consistent hashing to minimize reshuffling on membership changes.",
      },
    ],
  },

  // ───────────────────────────── Resilience ─────────────────────────────
  {
    id: "resilience",
    title: "Resilience & Fault Tolerance",
    blurb: "Circuit breakers, retries, idempotency, timeouts, and graceful failure.",
    study: [
      "Timeouts: never wait forever on a dependency — a slow call holds a thread and spreads failure.",
      "Retries with exponential backoff + jitter handle transient errors, but blind retries can cause a retry storm.",
      "Circuit breaker: after repeated failures, 'open' the circuit and fail fast (with a fallback) so a sick dependency doesn't drag you down; periodically test if it recovered.",
      "Idempotency: design operations so repeats are safe (idempotency keys), because retries and at-least-once delivery cause duplicates.",
      "Bulkheads: isolate resources per dependency so one slow downstream can't exhaust all threads.",
      "Graceful degradation: serve a reduced experience (cached/partial data) instead of a hard failure.",
    ],
    questions: [
      {
        id: "res-1",
        prompt: "A downstream service slows down and the caller's threads pile up waiting, cascading the outage. Best fix?",
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
          "Add a circuit breaker (with timeouts) so calls fail fast and fall back instead of piling up",
          "Add more DNS records",
          "Increase the DB connection pool only",
          "Remove the load balancer",
        ],
        correctIndex: 0,
        explanation:
          "Unbounded waiting on a sick dependency exhausts threads and spreads the failure. A circuit breaker trips after repeated failures and returns fast fallbacks, giving the dependency room to recover.",
      },
      {
        id: "res-2",
        prompt: "Why add jitter (randomness) to exponential backoff on retries?",
        options: [
          "To stop many clients retrying in sync and hammering the service at the same instants",
          "To make retries slower for no reason",
          "To encrypt the retry",
          "Because backoff doesn't work without it at all",
        ],
        correctIndex: 0,
        explanation:
          "Without jitter, clients that failed together retry together, creating synchronized 'retry storms'. Random jitter spreads retries out so the recovering service isn't re-overwhelmed.",
      },
      {
        id: "res-3",
        prompt: "A payment endpoint can be called twice due to client retries. How do you prevent a double charge?",
        options: [
          "Require an idempotency key; ignore duplicates of the same key",
          "Hope the second request fails",
          "Switch the database to NoSQL",
          "Add more app servers",
        ],
        correctIndex: 0,
        explanation:
          "Retries are inevitable, so side-effecting operations must be idempotent. The client sends a unique key; the server records it and returns the original result on a repeat instead of charging again.",
      },
      {
        id: "res-4",
        prompt: "What does the bulkhead pattern protect against?",
        options: [
          "One slow dependency exhausting all shared threads/connections and taking everything down",
          "Data being stored in the wrong format",
          "Cache entries expiring too soon",
          "DNS resolution failures",
        ],
        correctIndex: 0,
        explanation:
          "Like watertight compartments in a ship, bulkheads give each dependency its own isolated pool. If one floods (slows), the others keep working.",
      },
      {
        id: "res-5",
        prompt: "What is 'graceful degradation'?",
        options: [
          "Serving a reduced but working experience (e.g. cached/partial data) when a dependency fails",
          "Shutting the whole system down on any error",
          "Retrying forever until it works",
          "Logging the error and returning a 500",
        ],
        correctIndex: 0,
        explanation:
          "Rather than a hard failure, degrade: show stale data, hide a non-critical feature, or return partial results. Users get a usable service even when something is broken.",
      },
    ],
  },

  // ───────────────────────────── Microservices ─────────────────────────────
  {
    id: "microservices",
    title: "Microservices & API Gateway",
    blurb: "Splitting a system into services, and the glue that ties them together.",
    study: [
      "Microservices split a system into independently deployable services owning their own data — enabling team autonomy and independent scaling.",
      "Costs: network calls between services, distributed debugging, data consistency across services, and operational overhead. Don't start here for a small app.",
      "An API gateway is a single entry point: routing, auth, rate limiting, and request aggregation, so clients don't talk to every service.",
      "Each service should own its data (no shared database) to stay decoupled; cross-service data is shared via APIs or events.",
      "Service discovery lets services find each other's changing addresses; a service mesh handles cross-cutting concerns (retries, mTLS, observability) via sidecars.",
      "Prefer async events between services where possible to reduce tight coupling and cascading failures.",
    ],
    questions: [
      {
        id: "ms-1",
        prompt: "What is a key benefit of microservices over a monolith?",
        options: [
          "Independent deployment and scaling of each service by separate teams",
          "Zero network latency between modules",
          "No need for monitoring",
          "Guaranteed strong consistency everywhere",
        ],
        correctIndex: 0,
        explanation:
          "Services can be built, deployed, and scaled independently. The trade-off is network calls, distributed data, and more operational complexity — so they suit larger orgs/systems.",
      },
      {
        id: "ms-2",
        prompt: "What does the highlighted component (the single entry point) typically handle?",
        scenario: "Clients hit one entry point that fans out to several backend services.",
        nodes: [
          { componentId: "api-gateway", x: 80, y: 160 },
          { componentId: "app-server", id: "svc1", label: "Users svc", x: 340, y: 40 },
          { componentId: "app-server", id: "svc2", label: "Orders svc", x: 340, y: 160 },
          { componentId: "app-server", id: "svc3", label: "Payments svc", x: 340, y: 280 },
        ],
        edges: [
          { source: "api-gateway", target: "svc1" },
          { source: "api-gateway", target: "svc2" },
          { source: "api-gateway", target: "svc3" },
        ],
        captions: {
          "api-gateway": "auth, routing, rate limit",
          svc1: "own data",
          svc2: "own data",
          svc3: "own data",
        },
        options: [
          "Routing, authentication, rate limiting, and aggregating calls behind one entry point",
          "Storing the primary copy of all data",
          "Running the machine-learning models",
          "Replacing every microservice",
        ],
        correctIndex: 0,
        explanation:
          "The gateway centralizes cross-cutting concerns and gives clients one endpoint, so they don't need to know about or call each internal service directly.",
      },
      {
        id: "ms-3",
        prompt: "Why should each microservice own its own database rather than share one?",
        options: [
          "Shared databases tightly couple services — a schema change or load in one breaks others",
          "Sharing a database is impossible technically",
          "It doubles storage cost for no reason",
          "Databases can't handle more than one client",
        ],
        correctIndex: 0,
        explanation:
          "A shared database recreates the monolith's coupling: services can't evolve schemas independently and contend for the same resource. Each owns its data and exposes it via API/events.",
      },
      {
        id: "ms-4",
        prompt: "What problem does service discovery solve?",
        options: [
          "Finding the current network addresses of services that scale and move around",
          "Encrypting data at rest",
          "Caching HTTP responses",
          "Generating unique IDs",
        ],
        correctIndex: 0,
        explanation:
          "Instances come and go and change IPs. A service registry/discovery mechanism lets callers resolve a service name to a healthy instance instead of hardcoding addresses.",
      },
      {
        id: "ms-5",
        prompt: "A team splits a simple CRUD app for ~50 internal users into 12 microservices. What's the likely issue?",
        options: [
          "Over-engineering — the operational and network overhead outweighs any benefit at this scale",
          "Too few services for the load",
          "Microservices are always wrong",
          "They need a CDN",
        ],
        correctIndex: 0,
        explanation:
          "Microservices pay off at scale and with many teams. For a small app they add network hops, distributed-data headaches, and ops burden with little upside — a monolith is fine.",
      },
    ],
  },

  // ───────────────────────────── Search ─────────────────────────────
  {
    id: "search",
    title: "Search & Indexing",
    blurb: "How full-text search works and why a database isn't enough.",
    study: [
      "An inverted index maps each term → the list of documents containing it — the core structure that makes search fast.",
      "A SQL LIKE '%term%' can't use a B-tree index (leading wildcard) and scans every row — fine for small data, hopeless at scale.",
      "Search engines also handle tokenization, stemming, stop words, and relevance ranking (e.g. TF-IDF/BM25).",
      "Keep the search index in sync with the source of truth using change data capture (stream DB changes into the index).",
      "The database stays the source of truth; the search index is a derived, rebuildable read model.",
      "Vector search (embeddings + ANN) powers semantic/'similar to' queries beyond exact keywords.",
    ],
    questions: [
      {
        id: "se-1",
        prompt: "What data structure makes full-text search fast?",
        scenario: "Search queries go to a dedicated engine; the database stays the source of truth.",
        nodes: [
          { componentId: "app-server", x: 80, y: 150 },
          { componentId: "search", label: "Search index", x: 320, y: 60 },
          { componentId: "sql-db", label: "Source of truth", x: 320, y: 240 },
        ],
        edges: [
          { source: "app-server", target: "search" },
          { source: "sql-db", target: "search" },
        ],
        captions: {
          search: "inverted index: term → docs",
          "sql-db": "streams changes to the index",
        },
        options: [
          "An inverted index (term → documents containing it)",
          "A single B-tree on the primary key",
          "A linked list of all rows",
          "A hash of the entire table",
        ],
        correctIndex: 0,
        explanation:
          "An inverted index lets you jump straight from a search term to the documents that contain it, instead of scanning every document.",
      },
      {
        id: "se-2",
        prompt: "Why is SQL LIKE '%term%' a poor way to do search at scale?",
        options: [
          "The leading wildcard prevents index use, forcing a full table scan",
          "SQL can't store text",
          "It returns wrong results",
          "It locks the whole database forever",
        ],
        correctIndex: 0,
        explanation:
          "B-tree indexes need a known prefix; '%term%' has none, so the engine scans every row. Use a dedicated search engine with an inverted index instead.",
      },
      {
        id: "se-3",
        prompt: "How do you keep a search index consistent with the database that owns the data?",
        options: [
          "Stream database changes into the index via change data capture (CDC)",
          "Manually re-type entries into the index",
          "Make the search index the only store",
          "Never update it after the first load",
        ],
        correctIndex: 0,
        explanation:
          "CDC tails the DB's change log and applies inserts/updates/deletes to the index in near real time, keeping the derived index in sync with the source of truth.",
      },
      {
        id: "se-4",
        prompt: "What does the search index represent relative to the primary database?",
        options: [
          "A derived, rebuildable read model — the DB remains the source of truth",
          "The single source of truth for all data",
          "A backup of the database",
          "A cache of DNS records",
        ],
        correctIndex: 0,
        explanation:
          "If the index is lost, you can rebuild it from the database. Treating it as a derived read model keeps responsibilities clear and recovery simple.",
      },
      {
        id: "se-5",
        prompt: "You need 'find documents similar in meaning' (not exact keywords). What helps?",
        options: [
          "Vector search: embeddings + approximate nearest-neighbor lookup",
          "A bigger B-tree index",
          "More CDN edges",
          "A stricter rate limiter",
        ],
        correctIndex: 0,
        explanation:
          "Semantic similarity uses vector embeddings; an ANN index over those vectors finds nearest neighbors quickly, enabling 'similar to' and natural-language search.",
      },
    ],
  },

  // ───────────────────────────── Observability ─────────────────────────────
  {
    id: "observability",
    title: "Observability",
    blurb: "Logs, metrics, and traces — knowing what your system is doing.",
    study: [
      "Three pillars: logs (discrete events), metrics (aggregated numbers over time), and traces (a request's path across services).",
      "Metrics are cheap to store and great for dashboards/alerts; logs are detailed but voluminous; traces show where latency goes.",
      "RED method for services: Rate (throughput), Errors, Duration (latency). USE method for resources: Utilization, Saturation, Errors.",
      "Distributed tracing propagates a trace ID across service calls so you can reconstruct one request end-to-end.",
      "Alert on symptoms users feel (error rate, p99 latency), not every internal blip, to avoid alert fatigue.",
      "Track percentiles (p95/p99), not just averages — averages hide the slow tail real users hit.",
    ],
    questions: [
      {
        id: "obs-1",
        prompt: "What are the three pillars of observability?",
        scenario: "Services emit signals to an observability stack.",
        nodes: [
          { componentId: "app-server", label: "Services", x: 80, y: 150 },
          { componentId: "monitoring", x: 340, y: 60 },
          { componentId: "timeseries-db", label: "Metrics store", x: 340, y: 240 },
        ],
        edges: [
          { source: "app-server", target: "monitoring" },
          { source: "app-server", target: "timeseries-db" },
        ],
        captions: {
          "app-server": "emits logs, metrics, traces",
          monitoring: "dashboards & alerts",
        },
        options: [
          "Logs, metrics, and traces",
          "Cache, queue, and database",
          "CPU, RAM, and disk",
          "DNS, CDN, and load balancer",
        ],
        correctIndex: 0,
        explanation:
          "Logs (events), metrics (aggregated time series), and traces (request paths) together let you understand and debug a running system.",
      },
      {
        id: "obs-2",
        prompt: "Why track p99 latency rather than only the average?",
        options: [
          "Averages hide the slow tail — p99 shows what your unluckiest 1% of users actually experience",
          "p99 is cheaper to compute",
          "Averages are always wrong",
          "p99 ignores outliers entirely",
        ],
        correctIndex: 0,
        explanation:
          "A good average can still hide many slow requests. Percentiles expose the tail latency that frustrates real users and often reveals contention or GC pauses.",
      },
      {
        id: "obs-3",
        prompt: "What does the RED method tell you to monitor for each service?",
        options: [
          "Rate (throughput), Errors, and Duration (latency)",
          "Reads, Encryption, Deployments",
          "RAM, Errors, Disk",
          "Requests, Endpoints, Databases",
        ],
        correctIndex: 0,
        explanation:
          "RED — Rate, Errors, Duration — is a simple, high-signal set of service metrics that surfaces most user-facing problems quickly.",
      },
      {
        id: "obs-4",
        prompt: "How does distributed tracing follow one request across many services?",
        options: [
          "It propagates a shared trace ID through every call so spans can be stitched together",
          "It reads the database transaction log",
          "It pings each service randomly",
          "It relies on the CDN cache",
        ],
        correctIndex: 0,
        explanation:
          "A trace ID is generated at the edge and passed along each downstream call. Each service records timed spans tagged with that ID, reconstructing the full path and latency breakdown.",
      },
      {
        id: "obs-5",
        prompt: "What's a good principle for alerting?",
        options: [
          "Alert on user-facing symptoms (error rate, p99) rather than every internal metric blip",
          "Alert on every log line",
          "Never alert; check dashboards manually",
          "Alert only after users complain",
        ],
        correctIndex: 0,
        explanation:
          "Symptom-based alerts (does it hurt users?) catch real problems without drowning on-call in noise. Cause-based metrics are for diagnosis, not paging.",
      },
    ],
  },

  // ───────────────────────────── Concurrency / locks ─────────────────────────────
  {
    id: "concurrency",
    title: "Concurrency & Locking",
    blurb: "Coordinating access so simultaneous operations stay correct.",
    study: [
      "Race conditions happen when concurrent operations interleave and corrupt shared state (e.g. two buyers grab the last seat).",
      "Pessimistic locking takes a lock before acting (safe, but blocks others and risks deadlock). Optimistic locking checks for conflicts at commit (e.g. version numbers).",
      "Optimistic concurrency (compare-and-set on a version) shines when conflicts are rare — no locking on the happy path.",
      "A distributed lock coordinates across machines (via Redis/ZooKeeper/etcd) but must handle lease expiry and the holder dying.",
      "Atomic operations (INCR, compare-and-set) avoid read-modify-write races without explicit locks.",
      "Prefer the least coordination that's correct — locks limit throughput and add failure modes.",
    ],
    questions: [
      {
        id: "conc-1",
        prompt: "Two users book the last seat at the same time and both succeed. What happened?",
        scenario: "Both buyers read '1 seat left', then both write a booking.",
        nodes: [
          { componentId: "app-server", id: "a", label: "Buyer A", x: 80, y: 60 },
          { componentId: "app-server", id: "b", label: "Buyer B", x: 80, y: 240 },
          { componentId: "sql-db", label: "1 seat left", x: 360, y: 150 },
        ],
        edges: [
          { source: "a", target: "sql-db" },
          { source: "b", target: "sql-db" },
        ],
        captions: {
          a: "reads 1, writes",
          b: "reads 1, writes",
          "sql-db": "no lock → both win",
        },
        options: [
          "A race condition — concurrent read-modify-write without proper locking/atomicity",
          "The database ran out of storage",
          "The CDN cached the seat",
          "DNS resolved twice",
        ],
        correctIndex: 0,
        explanation:
          "Both read '1 seat left', both decrement, both commit — a classic race. Prevent it with a lock, an atomic conditional update, or optimistic concurrency on a version.",
      },
      {
        id: "conc-2",
        prompt: "When is optimistic locking a good choice?",
        options: [
          "When conflicts are rare — check a version at commit and retry on the occasional clash",
          "When almost every transaction conflicts",
          "When you never write data",
          "When you want to hold locks for a long time",
        ],
        correctIndex: 0,
        explanation:
          "Optimistic concurrency avoids locking on the happy path and only pays a cost (a retry) when a rare conflict is detected via a version mismatch. Heavy contention favors pessimistic locks.",
      },
      {
        id: "conc-3",
        prompt: "What's a key risk with a distributed lock held in something like Redis?",
        options: [
          "The holder can crash or the lease can expire mid-work, so another node may act concurrently",
          "It makes all reads strongly consistent automatically",
          "It removes the need for retries",
          "It can never be released",
        ],
        correctIndex: 0,
        explanation:
          "Distributed locks need leases (TTLs) so a dead holder doesn't block forever — but if work outlives the lease, two nodes can hold it at once. Use fencing tokens and keep critical sections short.",
      },
      {
        id: "conc-4",
        prompt: "How can you safely increment a shared counter without an explicit lock?",
        options: [
          "Use an atomic operation (e.g. INCR / compare-and-set) provided by the store",
          "Read, add in the app, then write back",
          "Cache the value and never persist it",
          "Let each server keep its own copy",
        ],
        correctIndex: 0,
        explanation:
          "A non-atomic read-modify-write races under concurrency. Atomic INCR/CAS performs the update as one indivisible step, so concurrent increments don't clobber each other.",
      },
      {
        id: "conc-5",
        prompt: "What's the downside of pessimistic locking under high contention?",
        options: [
          "It serializes access and can deadlock, hurting throughput",
          "It guarantees higher throughput than anything else",
          "It removes all consistency guarantees",
          "It only works on a single thread",
        ],
        correctIndex: 0,
        explanation:
          "Holding locks forces operations to wait their turn and risks deadlock when locks are taken in different orders. It's safe but limits concurrency — use the lightest coordination that stays correct.",
      },
    ],
  },

  // ─────────────── System Design Challenges (complex, constraint-based) ───────────────
  {
    id: "system-challenges",
    title: "System Design Challenges",
    blurb: "Bigger architectures — read the constraints, find the weak point, pick the fix.",
    study: [
      "Start from the requirements, not the boxes: is it read-heavy or write-heavy? Global? Bursty? Latency-sensitive? Money-critical? The right design follows from these.",
      "Trace a single request end-to-end through the diagram and ask what breaks first under the stated load.",
      "Find the lowest-capacity component on the hot path — that's usually the bottleneck.",
      "Check for the classics: missing cache on read-heavy paths, no CDN for global media, synchronous side-effects on the write path, single points of failure, and missing protection (rate limiting, auth, idempotency).",
      "Match the data store to the access pattern: time-series → TSDB, proximity → geospatial index, full-text → search engine, relationships → graph DB.",
      "Pick the change with the highest impact for the stated constraints — not just any valid improvement.",
    ],
    questions: [
      {
        id: "chal-feed-cache",
        prompt: "Given these constraints, what's the single most important change?",
        scenario:
          "Social timeline service. Constraints: 50M daily users, read:write ≈ 100:1, timeline must load in < 150ms (p99). Today every timeline read goes straight to the database.",
        nodes: [
          { componentId: "dns", x: 60, y: 150 },
          { componentId: "load-balancer", x: 240, y: 150 },
          { componentId: "app-server", x: 430, y: 150 },
          { componentId: "sql-db", x: 640, y: 150 },
          { componentId: "monitoring", x: 430, y: 30 },
        ],
        edges: [
          { source: "dns", target: "load-balancer" },
          { source: "load-balancer", target: "app-server" },
          { source: "app-server", target: "sql-db" },
          { source: "app-server", target: "monitoring" },
        ],
        captions: {
          "sql-db": "takes 100% of reads",
        },
        options: [
          "Add a cache for timelines so the 100:1 reads don't all hit the database",
          "Shard the database to scale writes",
          "Put a CDN in front of the JSON API responses",
          "Replace the load balancer with DNS round-robin",
        ],
        correctIndex: 0,
        explanation:
          "With a 100:1 read ratio and a tight p99, the database is the obvious bottleneck. A cache absorbs the vast majority of reads (low ms latency) and protects the DB. Sharding helps writes — but writes aren't the problem here.",
      },
      {
        id: "chal-chat-backplane",
        prompt: "Two users in the same room are on different servers and don't see each other's messages. Why, and what fixes it?",
        scenario:
          "Group chat. Clients open WebSockets to whichever server the load balancer picks. Each server writes messages to the shared database, but delivery to other connected users is missing across servers.",
        nodes: [
          { componentId: "load-balancer", x: 80, y: 150 },
          { componentId: "websocket-server", id: "ws1", label: "WS Server 1", x: 320, y: 50 },
          { componentId: "websocket-server", id: "ws2", label: "WS Server 2", x: 320, y: 260 },
          { componentId: "nosql-db", x: 600, y: 150 },
        ],
        edges: [
          { source: "load-balancer", target: "ws1" },
          { source: "load-balancer", target: "ws2" },
          { source: "ws1", target: "nosql-db" },
          { source: "ws2", target: "nosql-db" },
        ],
        captions: {
          ws1: "holds User A",
          ws2: "holds User B",
          "nosql-db": "stores, but doesn't notify",
        },
        options: [
          "There's no backplane between servers — add pub/sub (e.g. Redis Pub/Sub or a queue) so a message fans out to every server holding a room member",
          "WebSockets can't be load balanced — switch all clients to 1-second polling",
          "The database needs more read replicas",
          "Put a CDN in front of the WebSocket servers",
        ],
        correctIndex: 0,
        explanation:
          "A user's connection lives on one server, so a message must be broadcast to the other servers holding members of that room. A pub/sub backplane (plus a connection registry mapping user → server) delivers messages across the fleet. Persisting to the DB alone doesn't notify anyone.",
      },
      {
        id: "chal-checkout-async",
        prompt: "During flash sales, checkouts hang or fail. What's the core issue?",
        scenario:
          "E-commerce checkout. On each order the app server, in one synchronous request, writes the order, updates the search index, warms the cache, and sends a confirmation — then responds. Flash sales bring big bursts.",
        nodes: [
          { componentId: "api-gateway", x: 60, y: 160 },
          { componentId: "app-server", x: 280, y: 160 },
          { componentId: "sql-db", id: "order", label: "Order DB", x: 520, y: 30 },
          { componentId: "search", x: 520, y: 130 },
          { componentId: "cache", x: 520, y: 230 },
          { componentId: "notification-service", x: 520, y: 330 },
        ],
        edges: [
          { source: "api-gateway", target: "app-server" },
          { source: "app-server", target: "order" },
          { source: "app-server", target: "search" },
          { source: "app-server", target: "cache" },
          { source: "app-server", target: "notification-service" },
        ],
        captions: {
          "app-server": "does it all inline",
          search: "slow? order fails",
          "notification-service": "slow? order fails",
        },
        options: [
          "Too many synchronous side-effects on the write path — commit the order, then publish an event and update search/cache/email asynchronously",
          "The API gateway is the bottleneck and should be removed",
          "The order database should be switched to NoSQL",
          "Add more DNS records to handle the burst",
        ],
        correctIndex: 0,
        explanation:
          "Chaining four synchronous calls makes the slowest one set checkout latency, and any single failure fails the order. Commit the order durably, then emit an event; separate consumers update search, warm the cache, and send the confirmation — so checkout is fast and resilient.",
      },
      {
        id: "chal-metrics-tsdb",
        prompt: "Why won't this scale, and what store fits the workload?",
        scenario:
          "Monitoring platform ingesting ~1,000,000 metric points/sec. The team stores them in a relational database and runs dashboard roll-ups with SQL GROUP BY over huge tables.",
        nodes: [
          { componentId: "load-balancer", x: 80, y: 150 },
          { componentId: "app-server", label: "Ingest", x: 300, y: 150 },
          { componentId: "sql-db", x: 540, y: 150 },
        ],
        edges: [
          { source: "load-balancer", target: "app-server" },
          { source: "app-server", target: "sql-db" },
        ],
        captions: {
          "sql-db": "1M writes/sec? can't keep up",
        },
        options: [
          "A relational DB can't take 1M time-series writes/sec — use a time-series database, with a stream processor pre-aggregating roll-ups",
          "Add a cache in front of the SQL database",
          "Serve the dashboards through a CDN",
          "Switch to a graph database",
        ],
        correctIndex: 0,
        explanation:
          "Metrics are append-heavy time-series data. A purpose-built time-series database handles the write volume and time-bucketed queries; a stream processor can downsample/aggregate on the way in so dashboards read cheap pre-rolled data. A cache or CDN doesn't fix a write-throughput problem.",
      },
      {
        id: "chal-geo-index",
        prompt: "Matching is slow at city scale. What's the right fix?",
        scenario:
          "Ride-sharing. To find drivers near a rider, the app runs a SQL query over the whole drivers table computing distance to every driver on each request. p99 is seconds, not milliseconds.",
        nodes: [
          { componentId: "load-balancer", x: 80, y: 150 },
          { componentId: "app-server", x: 300, y: 150 },
          { componentId: "sql-db", label: "drivers (full scan)", x: 560, y: 150 },
        ],
        edges: [
          { source: "load-balancer", target: "app-server" },
          { source: "app-server", target: "sql-db" },
        ],
        captions: {
          "sql-db": "distance math on every row",
        },
        options: [
          "Use a geospatial index (geohash / quadtree) so 'drivers near me' is a fast bounded lookup, not a full-table scan",
          "Add more app servers to parallelize the scan",
          "Cache the entire drivers table in memory",
          "Shard the drivers table by driver name",
        ],
        correctIndex: 0,
        explanation:
          "Computing distance to every driver is O(N) per request. A geospatial index buckets drivers by location (geohash/quadtree/H3) so you only examine drivers in nearby cells — turning proximity search into a fast bounded lookup.",
      },
      {
        id: "chal-payment-idempotency",
        prompt: "Identify the most serious risk to fix first.",
        scenario:
          "Payment service with a replicated database and redundant app servers. Clients frequently retry on timeout. The charge endpoint has no idempotency key, and money must never be lost or double-charged.",
        nodes: [
          { componentId: "api-gateway", x: 100, y: 150 },
          { componentId: "app-server", x: 340, y: 150 },
          { componentId: "sql-db", label: "Primary + replica", x: 580, y: 150 },
        ],
        edges: [
          { source: "api-gateway", target: "app-server" },
          { source: "app-server", target: "sql-db" },
        ],
        captions: {
          "app-server": "no idempotency key",
          "sql-db": "already replicated",
        },
        options: [
          "No idempotency — a client retry can charge the customer twice; dedupe by a client-supplied idempotency key",
          "The database needs another replica",
          "The API gateway is a single point of failure",
          "The app tier should scale vertically instead",
        ],
        correctIndex: 0,
        explanation:
          "The DB is already replicated and the app tier is redundant, so the glaring gap is idempotency: with frequent retries and a side-effecting charge, the same request can run twice and double-charge. A recorded idempotency key makes repeats safe.",
      },
      {
        id: "chal-vod-cdn",
        prompt: "Global users complain video is slow to start and buffers. What's the highest-impact fix?",
        scenario:
          "Video-on-demand with a worldwide audience and multi-GB files. Players currently fetch video segments directly from object storage in a single region, through the app servers.",
        nodes: [
          { componentId: "dns", x: 60, y: 150 },
          { componentId: "load-balancer", x: 240, y: 150 },
          { componentId: "app-server", x: 430, y: 150 },
          { componentId: "object-storage", label: "Origin (1 region)", x: 660, y: 150 },
        ],
        edges: [
          { source: "dns", target: "load-balancer" },
          { source: "load-balancer", target: "app-server" },
          { source: "app-server", target: "object-storage" },
        ],
        captions: {
          "app-server": "proxies every byte",
          "object-storage": "far from most users",
        },
        options: [
          "Serve video segments via a CDN so bytes come from an edge near each viewer; the origin only handles cache misses",
          "Add more app servers in the same region",
          "Store the video files in a relational database",
          "Increase the object storage bucket size",
        ],
        correctIndex: 0,
        explanation:
          "For global, large-file media, distance and origin bandwidth dominate. A CDN caches segments at edge locations worldwide so playback starts fast and the single-region origin only serves misses — exactly the pattern behind real streaming platforms.",
      },
    ],
  },
];

// Fold the existing diagram challenges in as a 'Spot the Flaw' topic so nothing
// is lost and they get study context alongside the new concept topics.
const spotTheFlawTopic: PracticeTopic = {
  id: "spot-the-flaw",
  title: "Spot the Flaw (diagrams)",
  blurb: "Diagnose a real architecture: each diagram hides one key design flaw.",
  study: [
    "Read the workload first (read-heavy? write-heavy? global? bursty?) — the right design follows from the requirements.",
    "Trace one request through the diagram and ask what breaks under load or failure.",
    "Look for the usual suspects: single points of failure, a missing cache on read-heavy paths, synchronous work that should be async, and missing protection (rate limiting, auth).",
    "Also watch for over-engineering — sometimes the flaw is a component that shouldn't be there at all.",
  ],
  questions: SPOT_THE_FLAW.map((c) => ({
    id: c.id,
    prompt: c.prompt ?? "What's the most serious flaw?",
    scenario: c.scenario,
    nodes: c.nodes,
    edges: c.edges,
    options: c.options,
    correctIndex: c.correctIndex,
    explanation: c.explanation,
  })),
};

export const PRACTICE_TOPICS: PracticeTopic[] = [...TOPICS, spotTheFlawTopic];

/** Total number of practice questions across all topics. */
export const PRACTICE_QUESTION_COUNT = PRACTICE_TOPICS.reduce(
  (n, t) => n + t.questions.length,
  0
);
