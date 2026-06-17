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
];
