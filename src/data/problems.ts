import type { Problem } from "@/types/problem";
import { useCustomProblemsStore } from "@/store/customProblemsStore";

export const PROBLEMS: Problem[] = [
  {
    id: "url-shortener",
    title: "URL Shortener",
    difficulty: "Easy",
    description:
      "Design a URL shortening service like Bitly or TinyURL. Users submit long URLs and receive short, unique aliases that redirect to the original destination. The system is heavily read-biased — for every URL created, expect 100x more redirect lookups. Real-world services like Bitly handle billions of redirects per month with sub-100ms latency, making caching strategy the key design decision.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 1000,
      storageGB: 500,
      latencyMs: 100,
      users: "100M DAU",
    },
    constraints: [
      "Short URLs should be unique and non-predictable (base62 or base58 encoding)",
      "Redirect latency < 100ms at p99 — users should not notice any delay",
      "System should handle 100:1 read/write ratio",
      "URLs should expire after a configurable TTL (default 5 years)",
      "Analytics tracking for click counts, geographic distribution, and referrer data",
      "Custom alias support — users can choose their own short URL slug",
      "Rate limiting to prevent abuse (e.g., max 100 URLs/min per API key)",
    ],
    hints: [
      {
        title: "Start with the basics",
        content:
          "Consider DNS → Load Balancer → App Server → Database as your starting flow.",
      },
      {
        title: "Think about reads",
        content:
          "Most requests are reads (redirects). A cache layer can dramatically reduce DB load.",
      },
      {
        title: "Scaling writes",
        content:
          "Use a NoSQL database or partition your SQL database by key hash for write scaling.",
      },
      {
        title: "Advanced: Key generation",
        content:
          "Pre-generate keys in a separate Key Generation Service (KGS) to avoid collision checks at write time. Store unused keys in a dedicated table and move them to a 'used' table atomically.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 100, y: 250 },
        { componentId: "cdn", x: 300, y: 100 },
        { componentId: "load-balancer", x: 300, y: 250 },
        { componentId: "rate-limiter", x: 300, y: 400 },
        { componentId: "app-server", x: 500, y: 250 },
        { componentId: "cache", x: 500, y: 100 },
        { componentId: "nosql-db", x: 700, y: 250 },
        { componentId: "monitoring", x: 700, y: 100 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "dns", target: "cdn" },
        { source: "load-balancer", target: "rate-limiter" },
        { source: "rate-limiter", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Storage", "Caching", "Hashing"],
    alternatives: [
      {
        name: "Counter + base62",
        note: "Encode a distributed counter (or range-allocated IDs) in base62 — no collision checks, but IDs become sequential/guessable and need a coordination service.",
        solution: {
          nodes: [
            { componentId: "client", x: 0, y: 120 },
            { componentId: "dns", x: 180, y: 120 },
            { componentId: "load-balancer", x: 360, y: 120 },
            { componentId: "app-server", x: 540, y: 120 },
            { componentId: "id-generator", x: 540, y: 0 },
            { componentId: "cache", x: 740, y: 50 },
            { componentId: "nosql-db", x: 740, y: 190 },
          ],
          edges: [
            { source: "client", target: "dns" },
            { source: "dns", target: "load-balancer" },
            { source: "load-balancer", target: "app-server" },
            { source: "app-server", target: "id-generator" },
            { source: "app-server", target: "cache" },
            { source: "app-server", target: "nosql-db" },
            { source: "cache", target: "nosql-db" },
          ],
        },
      },
      { name: "Hash + collision check", note: "Hash the URL and take a prefix, retrying on collision. Simple and stateless, but each write pays a read to check for collisions at scale." },
      { name: "Key Generation Service", note: "Pre-generate unique keys offline into an 'unused' table and hand them out. Zero write-time collisions, at the cost of an extra service to operate." },
    ],
  },
  {
    id: "twitter-feed",
    title: "Twitter / News Feed",
    difficulty: "Hard",
    description:
      "Design a social media feed like Twitter (X). Users can post tweets, follow others, and see a personalized timeline ranked by relevance. The core challenge is fan-out: when a celebrity with 50M followers posts a tweet, how do you deliver it to all their followers' timelines without melting your infrastructure? Real systems like Twitter use a hybrid approach — pre-computing timelines for most users while handling high-follower accounts differently.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 1000,
      storageGB: 500000,
      latencyMs: 200,
      users: "250M DAU",
    },
    constraints: [
      "Timeline should be eventually consistent within 5 seconds of a new post",
      "Support users with millions of followers (celebrities) without write amplification storms",
      "Feed should rank by relevance using signals like recency, engagement, and relationship strength",
      "Media uploads (images/videos up to 512MB) must be supported with async processing",
      "Real-time notifications for mentions, likes, retweets, and DMs",
      "Full-text search across all public tweets with sub-second response time",
      "Graceful degradation — serve stale timelines rather than showing errors during peak load",
    ],
    hints: [
      {
        title: "Fan-out strategy",
        content:
          "Consider fan-out-on-write for normal users and fan-out-on-read for celebrities.",
      },
      {
        title: "Caching the timeline",
        content:
          "Pre-compute and cache each user's timeline in Redis. Update on new posts.",
      },
      {
        title: "Media handling",
        content:
          "Use object storage (S3) for media with a CDN for global delivery.",
      },
      {
        title: "Advanced: Hybrid fan-out",
        content:
          "Set a follower threshold (e.g., 10K). Below it, fan-out-on-write pushes to followers' cached timelines. Above it, fan-out-on-read merges celebrity tweets at read time. This gives you the best of both approaches.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 420 },
        { componentId: "app-server", x: 500, y: 200 },
        { componentId: "cache", x: 500, y: 50 },
        { componentId: "message-queue", x: 500, y: 380 },
        { componentId: "sql-db", x: 700, y: 200 },
        { componentId: "nosql-db", x: 700, y: 380 },
        { componentId: "object-storage", x: 350, y: 80 },
        { componentId: "search", x: 700, y: 50 },
        { componentId: "monitoring", x: 850, y: 200 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "sql-db" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "search" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Fan-out", "Cache", "Timeline"],
    alternatives: [
      { name: "Fan-out on write", note: "Push each tweet into followers' precomputed timelines. Reads are instant, but celebrities with millions of followers cause write storms." },
      {
        name: "Fan-out on read",
        note: "Build the timeline at read time by pulling from followees. Cheap writes, but reads are heavy and slow for users following many accounts.",
        solution: {
          nodes: [
            { componentId: "client", x: 0, y: 120 },
            { componentId: "dns", x: 180, y: 120 },
            { componentId: "load-balancer", x: 360, y: 120 },
            { componentId: "app-server", x: 540, y: 120 },
            { componentId: "cache", x: 740, y: 50 },
            { componentId: "nosql-db", x: 740, y: 190 },
          ],
          edges: [
            { source: "client", target: "dns" },
            { source: "dns", target: "load-balancer" },
            { source: "load-balancer", target: "app-server" },
            { source: "app-server", target: "cache" },
            { source: "app-server", target: "nosql-db" },
            { source: "cache", target: "nosql-db" },
          ],
        },
      },
      { name: "Hybrid", note: "Fan-out on write for normal users, fan-out on read for celebrities, merged at read time. Best of both — the common production answer — but the most complex." },
    ],
  },
  {
    id: "chat-system",
    title: "Chat System",
    difficulty: "Hard",
    description:
      "Design a real-time chat application like WhatsApp, Slack, or Discord. Support 1:1 messaging, group chats with up to 1000 members, read receipts, typing indicators, and online presence. Messages must be delivered reliably and in order, even when users switch between devices. WhatsApp processes over 100 billion messages per day — the key challenges are maintaining persistent connections at scale and guaranteeing exactly-once delivery.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 100000,
      storageGB: 50000,
      latencyMs: 50,
      users: "500M DAU",
    },
    constraints: [
      "Messages delivered in under 50ms for online users via persistent WebSocket connections",
      "Guaranteed message ordering within a conversation using sequence numbers",
      "Offline message delivery when user comes back online (store-and-forward pattern)",
      "Support group chats with up to 1000 members with efficient fan-out",
      "End-to-end encryption for 1:1 chats (server should never see plaintext)",
      "Read receipts and typing indicators with minimal overhead (no DB writes for ephemeral events)",
      "Multi-device sync — messages appear on all logged-in devices simultaneously",
    ],
    hints: [
      {
        title: "WebSocket connections",
        content:
          "Use persistent WebSocket connections for real-time delivery. Need a connection gateway.",
      },
      {
        title: "Message ordering",
        content:
          "Use a message queue with per-conversation partitioning to guarantee ordering.",
      },
      {
        title: "Presence system",
        content:
          "Use Redis with TTL keys for online/offline status. Heartbeat every 30 seconds.",
      },
      {
        title: "Advanced: Connection management",
        content:
          "Use a dedicated WebSocket gateway layer that maintains millions of persistent connections. Store connection-to-server mappings in Redis so any app server can route a message to the correct gateway holding the recipient's connection.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "websocket-server", x: 200, y: 100 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 100 },
        { componentId: "app-server", x: 500, y: 180 },
        { componentId: "cache", x: 500, y: 50 },
        { componentId: "message-queue", x: 500, y: 350 },
        { componentId: "nosql-db", x: 700, y: 250 },
        { componentId: "monitoring", x: 700, y: 50 },
        { componentId: "rate-limiter", x: 50, y: 100 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "rate-limiter" },
        { source: "load-balancer", target: "websocket-server" },
        { source: "websocket-server", target: "app-server" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["WebSocket", "Messaging", "Real-time"],
    alternatives: [
      { name: "Persistent WebSockets", note: "Clients hold a long-lived WebSocket to a gateway. Lowest latency for active chats, but you must track connection→server mapping and handle reconnects." },
      { name: "Long polling", note: "Clients repeatedly poll for new messages. Simple and firewall-friendly, but higher latency and wasted requests when idle." },
      { name: "Hybrid push + pull", note: "WebSocket/push for online users, store-and-pull on reconnect for offline delivery. Robust, but needs both an online path and a durable message store." },
    ],
  },
  {
    id: "ride-sharing",
    title: "Uber / Ride Sharing",
    difficulty: "Hard",
    description:
      "Design a ride-sharing platform like Uber or Lyft. Match riders with nearby drivers in real-time, track live location updates, calculate accurate ETAs, and handle dynamic surge pricing. The system must ingest millions of location updates per second from active drivers while simultaneously running proximity queries to match riders. Uber processes over 1 million location updates per second during peak hours, making geospatial indexing and real-time stream processing the central design challenges.",
    requirements: {
      readsPerSec: 80000,
      writesPerSec: 300000,
      storageGB: 1000,
      latencyMs: 100,
      users: "50M DAU",
    },
    constraints: [
      "Driver matching within 5 seconds using geospatial proximity search",
      "Location updates every 4 seconds from all active drivers (~1M concurrent drivers)",
      "ETA accuracy within 20% of actual using real-time traffic and historical data",
      "Surge pricing computed in real-time per geo zone based on supply/demand ratios",
      "Trip history and receipts stored permanently for regulatory compliance",
      "Payment processing with idempotent charge guarantees (no double-charging)",
      "Graceful handling of driver/rider disconnections mid-trip without data loss",
    ],
    hints: [
      {
        title: "Geo-spatial indexing",
        content:
          "Use geohashing or a spatial index to efficiently find nearby drivers.",
      },
      {
        title: "Location ingestion",
        content:
          "High-frequency location updates need a message queue to buffer writes.",
      },
      {
        title: "Matching service",
        content:
          "A dedicated matching service queries the spatial index and assigns the optimal driver.",
      },
      {
        title: "Advanced: Geohash sharding",
        content:
          "Partition your driver location data by geohash prefix so each shard handles a geographic region. This lets proximity queries hit a single shard instead of scanning globally. Use Redis Geo commands (GEOADD/GEOSEARCH) for O(log N) nearest-neighbor lookups.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "rate-limiter", x: 350, y: 120 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 400 },
        { componentId: "app-server", x: 500, y: 250 },
        { componentId: "cache", x: 500, y: 120 },
        { componentId: "message-queue", x: 500, y: 400 },
        { componentId: "stream-processor", x: 650, y: 400 },
        { componentId: "nosql-db", x: 700, y: 250 },
        { componentId: "sql-db", x: 700, y: 120 },
        { componentId: "monitoring", x: 850, y: 250 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "rate-limiter" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "stream-processor" },
        { source: "stream-processor", target: "nosql-db" },
        { source: "app-server", target: "sql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Geo-spatial", "Real-time", "Matching"],
  },
  {
    id: "video-streaming",
    title: "YouTube / Video Streaming",
    difficulty: "Hard",
    description:
      "Design a video streaming platform like YouTube or Netflix. Support video upload, transcoding into multiple formats and resolutions, globally distributed storage, and adaptive bitrate streaming to millions of concurrent viewers. YouTube serves over 1 billion hours of video daily — the key challenges are building an efficient upload-transcode-serve pipeline, leveraging CDN edge caching for popular content, and separating the fast metadata path from the slow video delivery path.",
    requirements: {
      readsPerSec: 200000,
      writesPerSec: 5000,
      storageGB: 1000000,
      latencyMs: 200,
      users: "2.7B MAU",
    },
    constraints: [
      "Videos transcoded into multiple resolutions (360p, 720p, 1080p, 4K) and codecs (H.264, VP9, AV1)",
      "Adaptive bitrate streaming (HLS/DASH) adjusts quality based on real-time bandwidth",
      "Global delivery with < 200ms video start time for 95th percentile of users",
      "Support live streaming with < 5s glass-to-glass latency",
      "Recommendations engine producing personalized feeds from billions of videos",
      "Upload processing pipeline handles videos up to 256GB with resumable uploads",
      "Copyright detection (Content ID) must scan uploaded content before it goes live",
    ],
    hints: [
      {
        title: "Upload pipeline",
        content:
          "Upload to object storage, then use a message queue to trigger async transcoding workers.",
      },
      {
        title: "CDN is critical",
        content:
          "A CDN is essential for serving video content globally. Cache popular videos at the edge.",
      },
      {
        title: "Metadata vs video",
        content:
          "Separate video metadata (SQL/NoSQL) from video content (object storage + CDN).",
      },
      {
        title: "Advanced: Tiered storage",
        content:
          "Use hot/warm/cold storage tiers. Popular videos stay on CDN edge and fast object storage. Videos older than 30 days with low views move to cheaper infrequent-access storage (S3 IA / Glacier). This can cut storage costs by 60-70% without affecting user experience.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 100 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 420 },
        { componentId: "rate-limiter", x: 350, y: 100 },
        { componentId: "app-server", x: 500, y: 250 },
        { componentId: "cache", x: 500, y: 100 },
        { componentId: "message-queue", x: 500, y: 400 },
        { componentId: "stream-processor", x: 600, y: 400 },
        { componentId: "object-storage", x: 700, y: 100 },
        { componentId: "sql-db", x: 700, y: 250 },
        { componentId: "search", x: 700, y: 400 },
        { componentId: "monitoring", x: 850, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "rate-limiter" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "sql-db" },
        { source: "message-queue", target: "stream-processor" },
        { source: "stream-processor", target: "object-storage" },
        { source: "app-server", target: "search" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Streaming", "CDN", "Transcoding"],
    alternatives: [
      { name: "Pre-transcode all renditions", note: "Transcode every quality level on upload. Fast, consistent playback start, but high storage cost for rarely-watched videos." },
      { name: "Just-in-time transcoding", note: "Transcode renditions on first request and cache them. Saves storage on the long tail, but adds latency and compute on cold views." },
      { name: "Tiered (popular vs long-tail)", note: "Pre-transcode popular uploads, JIT the rest. Balances cost and latency, at the price of a popularity-tracking pipeline." },
    ],
  },
  {
    id: "rate-limiter",
    title: "Rate Limiter",
    difficulty: "Easy",
    description:
      "Design a distributed rate limiting service that throttles API requests per client, IP, or API key. Real systems like Cloudflare and AWS WAF use token bucket or sliding window algorithms backed by distributed counters in Redis. The key challenge is achieving consistency across multiple rate limiter instances without adding significant latency to the request path — Stripe processes hundreds of millions of API calls per day while enforcing per-key rate limits with sub-millisecond overhead.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 50000,
      storageGB: 10,
      latencyMs: 5,
      users: "50M DAU",
    },
    constraints: [
      "Sub-millisecond decision latency — rate limiting must not become a bottleneck itself",
      "Support multiple limiting algorithms: token bucket, sliding window log, sliding window counter",
      "Distributed counting across multiple instances using Redis with atomic operations (INCR + EXPIRE)",
      "Per-client, per-endpoint, and global rate limits with configurable thresholds",
      "Graceful handling of Redis failures — fail open vs fail closed configurable per rule",
      "Return standard HTTP 429 with Retry-After header and remaining quota in response headers",
      "Support burst allowance — allow short traffic spikes above the sustained rate limit",
    ],
    hints: [
      {
        title: "Start simple",
        content:
          "Begin with an API Gateway fronting app servers. Rate limit checks happen before business logic.",
      },
      {
        title: "Distributed counters",
        content:
          "Use Redis with INCR + EXPIRE for atomic counter updates across all instances. Lua scripts ensure atomicity.",
      },
      {
        title: "Sliding window",
        content:
          "A sliding window counter using two fixed windows with weighted counts gives accuracy without the memory cost of a full log.",
      },
      {
        title: "Advanced: Local + global",
        content:
          "Use a two-tier approach: local in-memory counters for hot-path speed with periodic sync to Redis for global consistency. This reduces Redis round-trips by 90% while keeping limits accurate within a small margin.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "rate-limiter", x: 350, y: 250 },
        { componentId: "api-gateway", x: 500, y: 250 },
        { componentId: "app-server", x: 650, y: 250 },
        { componentId: "cache", x: 350, y: 100 },
        { componentId: "monitoring", x: 650, y: 100 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "rate-limiter" },
        { source: "rate-limiter", target: "api-gateway" },
        { source: "rate-limiter", target: "cache" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Distributed", "Algorithm", "Redis"],
    alternatives: [
      { name: "Token bucket", note: "Refill tokens at a fixed rate; allow a request if a token is available. Smooth, allows bursts up to the bucket size — the common default." },
      { name: "Sliding window log", note: "Keep timestamps of recent requests and count those in the window. Exact, but memory grows with request rate." },
      { name: "Sliding window counter", note: "Approximate the sliding window with two fixed buckets — cheap and good enough; slight edge inaccuracy at window boundaries." },
    ],
  },
  {
    id: "notification-system",
    title: "Notification System",
    difficulty: "Medium",
    description:
      "Design a scalable notification service like Firebase Cloud Messaging or AWS SNS that delivers push notifications, emails, and SMS to hundreds of millions of users. The system must handle priority-based routing, template rendering, delivery tracking, and retry logic across multiple channels. Firebase Cloud Messaging delivers over 1 trillion push notifications per year — the key challenges are fan-out at scale, rate limiting per channel, and maintaining delivery guarantees without overwhelming downstream providers.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 100000,
      storageGB: 2000,
      latencyMs: 500,
      users: "500M DAU",
    },
    constraints: [
      "Support push (iOS/Android/Web), email, and SMS delivery channels with pluggable providers",
      "Priority queue system — critical alerts (security, payments) jump ahead of marketing notifications",
      "Template engine with variable substitution and localization (100+ languages)",
      "At-least-once delivery with deduplication to prevent duplicate notifications to users",
      "Per-user notification preferences and opt-out management across all channels",
      "Delivery tracking with read receipts, bounce handling, and delivery status webhooks",
      "Rate limiting per provider to avoid being throttled by APNS, FCM, email gateways, or SMS providers",
    ],
    hints: [
      {
        title: "Event-driven architecture",
        content:
          "Use a message queue to decouple notification producers from the delivery pipeline. Events trigger notification creation.",
      },
      {
        title: "Priority queues",
        content:
          "Use separate message queues or priority lanes for critical vs marketing notifications to prevent backlog delays.",
      },
      {
        title: "Template and preferences",
        content:
          "Store templates and user preferences in a cache layer for fast lookup during high-volume sends.",
      },
      {
        title: "Advanced: Fan-out workers",
        content:
          "Use a worker pool pattern: a dispatcher reads from the priority queue, resolves user preferences, renders templates, then fans out to channel-specific workers (push worker, email worker, SMS worker). Each worker handles retries and provider-specific rate limits independently.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 500, y: 200 },
        { componentId: "message-queue", x: 500, y: 380 },
        { componentId: "cache", x: 500, y: 60 },
        { componentId: "nosql-db", x: 700, y: 200 },
        { componentId: "sql-db", x: 700, y: 380 },
        { componentId: "monitoring", x: 850, y: 200 },
        { componentId: "rate-limiter", x: 350, y: 100 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "sql-db" },
        { source: "app-server", target: "monitoring" },
        { source: "api-gateway", target: "rate-limiter" },
      ],
    },
    tags: ["Push", "Queue", "Fanout"],
  },
  {
    id: "typeahead-autocomplete",
    title: "Typeahead / Autocomplete",
    difficulty: "Medium",
    description:
      "Design a search autocomplete system like Google's search suggestions or Algolia's instant search. As users type each character, the system returns the top 5-10 matching suggestions ranked by popularity, personalization, and recency within 100ms. Google processes over 8.5 billion searches per day with autocomplete triggering on every keystroke — the core challenges are building an efficient prefix-matching data structure (trie) and keeping suggestions fresh as search trends change in real-time.",
    requirements: {
      readsPerSec: 200000,
      writesPerSec: 5000,
      storageGB: 100,
      latencyMs: 50,
      users: "17B queries/day",
    },
    constraints: [
      "Response time under 50ms at p99 — suggestions must appear as the user types each character",
      "Top-K results ranked by query frequency, recency, and optional personalization signals",
      "Support prefix matching and fuzzy matching (handle typos with edit distance ≤ 2)",
      "Real-time trend updates — breaking news or viral topics should appear within minutes",
      "Multi-language support with proper Unicode handling and transliteration",
      "Filter offensive or inappropriate suggestions before returning results",
      "Personalized suggestions based on user search history when available",
    ],
    hints: [
      {
        title: "Trie data structure",
        content:
          "Use a trie (prefix tree) to efficiently store and query prefix matches. Each node stores the top-K suggestions for that prefix.",
      },
      {
        title: "Caching is critical",
        content:
          "Cache the most popular prefixes (1-3 characters) aggressively — they account for the majority of queries.",
      },
      {
        title: "Offline aggregation",
        content:
          "Use a message queue to collect search logs, then batch-process to update suggestion rankings periodically.",
      },
      {
        title: "Advanced: Two-tier approach",
        content:
          "Serve from an in-memory trie on the app servers for ultra-low latency, backed by a distributed cache (Redis) for longer prefixes. Use a background pipeline that aggregates search logs, computes new rankings, and rebuilds the trie every 15 minutes.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 100 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "app-server", x: 400, y: 250 },
        { componentId: "cache", x: 400, y: 100 },
        { componentId: "message-queue", x: 400, y: 400 },
        { componentId: "nosql-db", x: 600, y: 250 },
        { componentId: "search", x: 600, y: 100 },
        { componentId: "monitoring", x: 800, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "search" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Trie", "Search", "Caching"],
  },
  {
    id: "web-crawler",
    title: "Web Crawler",
    difficulty: "Medium",
    description:
      "Design a distributed web crawler like Googlebot that can crawl billions of web pages efficiently. The crawler must manage a URL frontier, respect robots.txt politeness policies, deduplicate content, and handle the enormous variety of web page structures. Google's crawler discovers and indexes trillions of URLs and maintains an index of over 400 billion pages — the key design decisions involve URL prioritization, politeness (not overwhelming any single domain), and distributed coordination to avoid redundant crawls.",
    requirements: {
      readsPerSec: 10000,
      writesPerSec: 50000,
      storageGB: 50000,
      latencyMs: 1000,
      users: "N/A (internal system)",
    },
    constraints: [
      "Crawl rate of 1000+ pages per second across the entire cluster",
      "Respect robots.txt and per-domain crawl delays — never overwhelm a single website",
      "URL deduplication using content hashing (SimHash/MinHash) to detect near-duplicate pages",
      "URL frontier with priority queue — prioritize important/fresh pages over deep/stale ones",
      "Handle DNS resolution caching to avoid repeated lookups for the same domain",
      "Graceful handling of spider traps (infinite URL generation, redirect loops, soft 404s)",
      "Incremental re-crawling based on page change frequency (adaptive crawl scheduling)",
    ],
    hints: [
      {
        title: "URL frontier design",
        content:
          "Use a message queue as your URL frontier with priority levels. Separate front queues (priority) from back queues (politeness/per-host).",
      },
      {
        title: "Deduplication",
        content:
          "Use a Bloom filter or content hash stored in a NoSQL database to quickly check if a URL or page content has been seen before.",
      },
      {
        title: "Distributed workers",
        content:
          "Multiple crawler workers pull URLs from the frontier, fetch pages, extract links, and push new URLs back. Partition by domain for politeness.",
      },
      {
        title: "Advanced: DNS cache + politeness",
        content:
          "Maintain a local DNS cache (TTL-based) on each crawler worker to reduce DNS overhead. Implement per-domain rate limiters in Redis — each worker checks the domain's last crawl timestamp before fetching. This prevents any single domain from being overwhelmed even with hundreds of workers.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "message-queue", x: 100, y: 250 },
        { componentId: "app-server", x: 300, y: 250 },
        { componentId: "cache", x: 300, y: 100 },
        { componentId: "rate-limiter", x: 300, y: 400 },
        { componentId: "nosql-db", x: 550, y: 250 },
        { componentId: "object-storage", x: 550, y: 100 },
        { componentId: "search", x: 550, y: 400 },
        { componentId: "monitoring", x: 750, y: 250 },
      ],
      edges: [
        { source: "message-queue", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "rate-limiter" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "object-storage" },
        { source: "nosql-db", target: "search" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Distributed", "Queue", "Storage"],
  },
  {
    id: "distributed-cache",
    title: "Distributed Cache",
    difficulty: "Medium",
    description:
      "Design a distributed in-memory caching system like Redis or Memcached. The system must support key-value storage with sub-millisecond reads, consistent hashing for data distribution, multiple eviction policies, and replication for fault tolerance. Redis can serve hundreds of thousands to over 1 million requests per second per node on optimized hardware — the key challenges are maintaining cache coherence across nodes, handling hot keys that receive disproportionate traffic, and designing a partition strategy that minimizes data movement during scaling events.",
    requirements: {
      readsPerSec: 500000,
      writesPerSec: 100000,
      storageGB: 500,
      latencyMs: 2,
      users: "N/A (infrastructure)",
    },
    constraints: [
      "Sub-millisecond read latency at p99 with support for 1M+ ops/sec per node",
      "Consistent hashing with virtual nodes for even data distribution and minimal remapping on scale events",
      "Multiple eviction policies: LRU, LFU, TTL-based, and random eviction",
      "Primary-replica replication with configurable consistency (async for speed, sync for safety)",
      "Hot key detection and mitigation — replicate hot keys across multiple nodes",
      "Support for data structures beyond key-value: lists, sets, sorted sets, hash maps",
      "Cluster health monitoring with automatic failover when a primary node goes down",
    ],
    hints: [
      {
        title: "Consistent hashing",
        content:
          "Use consistent hashing with virtual nodes to map keys to cache servers. This minimizes key redistribution when adding/removing nodes.",
      },
      {
        title: "Replication",
        content:
          "Each primary node replicates to 1-2 replicas. On primary failure, promote a replica using leader election.",
      },
      {
        title: "Eviction policies",
        content:
          "Implement LRU using a doubly-linked list + hash map for O(1) eviction. Support configurable policies per cache namespace.",
      },
      {
        title: "Advanced: Hot key handling",
        content:
          "Detect hot keys by sampling access patterns. When a key exceeds a threshold (e.g., 1000 QPS), automatically replicate it to all nodes and route reads using client-side random selection. This distributes the load of celebrity-profile-style hot keys.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "app-server", x: 400, y: 250 },
        { componentId: "cache", x: 600, y: 150 },
        { componentId: "nosql-db", x: 600, y: 350 },
        { componentId: "monitoring", x: 800, y: 250 },
        { componentId: "service-mesh", x: 400, y: 100 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "service-mesh" },
        { source: "service-mesh", target: "cache" },
        { source: "cache", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Hashing", "Replication", "Memory"],
  },
  {
    id: "payment-system",
    title: "Payment System",
    difficulty: "Hard",
    description:
      "Design a payment processing platform like Stripe or PayPal. The system handles payment authorization, capture, settlement, refunds, and ledger management with strict financial consistency guarantees. Stripe processes nearly $2 trillion annually — the core challenges are ensuring exactly-once payment execution through idempotency keys, maintaining a double-entry accounting ledger, and handling the complex state machine of payment lifecycles across multiple payment processors and methods.",
    requirements: {
      readsPerSec: 30000,
      writesPerSec: 10000,
      storageGB: 5000,
      latencyMs: 200,
      users: "10M merchants",
    },
    constraints: [
      "Exactly-once payment execution using idempotency keys — no double-charges under any failure scenario",
      "Double-entry accounting ledger — every transaction creates balanced debit and credit entries",
      "Support multiple payment methods: credit cards, bank transfers, digital wallets, crypto",
      "PCI DSS compliance — card numbers must be tokenized and never stored in plaintext",
      "Reconciliation system that matches internal records with bank settlement files daily",
      "Dispute/chargeback handling workflow with evidence submission and deadline tracking",
      "Multi-currency support with real-time exchange rates and proper rounding (banker's rounding)",
    ],
    hints: [
      {
        title: "Idempotency is everything",
        content:
          "Every payment API call must include an idempotency key. Store the key and result so retries return the same response without re-executing.",
      },
      {
        title: "Payment state machine",
        content:
          "Model payments as a state machine: created → authorized → captured → settled (or refunded). Store every state transition.",
      },
      {
        title: "Ledger design",
        content:
          "Use a SQL database with ACID transactions for the ledger. Every operation creates two rows: a debit and a credit that sum to zero.",
      },
      {
        title: "Advanced: Saga pattern",
        content:
          "Use the saga pattern for multi-step payments (authorize → fraud check → capture → settle). Each step has a compensating action (e.g., void authorization). A message queue coordinates steps, and failed steps trigger compensating transactions in reverse order.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 100 },
        { componentId: "rate-limiter", x: 350, y: 420 },
        { componentId: "app-server", x: 500, y: 250 },
        { componentId: "cache", x: 500, y: 100 },
        { componentId: "distributed-lock", x: 500, y: 420 },
        { componentId: "message-queue", x: 650, y: 420 },
        { componentId: "sql-db", x: 700, y: 200 },
        { componentId: "nosql-db", x: 700, y: 100 },
        { componentId: "monitoring", x: 850, y: 250 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "rate-limiter" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "distributed-lock" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "sql-db" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["ACID", "Idempotent", "Ledger"],
  },
  {
    id: "ticket-booking",
    title: "Ticket Booking (Ticketmaster)",
    difficulty: "Hard",
    description:
      "Design a ticket booking platform like Ticketmaster or BookMyShow for concerts, sports events, and shows. The system must handle massive traffic spikes when popular events go on sale (Taylor Swift's Eras Tour saw 14 million users hit the site simultaneously), manage seat inventory with optimistic locking to prevent double-booking, and implement a virtual waiting room queue. The central challenges are handling extreme concurrency on hot inventory, seat hold/release lifecycle management, and preventing bots from buying tickets.",
    requirements: {
      readsPerSec: 200000,
      writesPerSec: 50000,
      storageGB: 1000,
      latencyMs: 200,
      users: "100M DAU",
    },
    constraints: [
      "No double-booking — optimistic locking or distributed locks must prevent two users from booking the same seat",
      "Virtual waiting room queue that activates when traffic exceeds system capacity (fairness guarantee)",
      "Seat hold with TTL — selected seats are reserved for 10 minutes during checkout, then auto-released",
      "Bot detection and mitigation using CAPTCHA, device fingerprinting, and behavioral analysis",
      "Support interactive seat maps with real-time availability updates via WebSocket/SSE",
      "Payment timeout handling — if payment fails after seat selection, seats must be released back to inventory",
      "Surge pricing and dynamic pricing tiers based on demand signals and remaining inventory",
    ],
    hints: [
      {
        title: "Virtual queue",
        content:
          "When traffic spikes, put users in a Redis-backed FIFO queue. Release them in batches to the booking flow at a controlled rate.",
      },
      {
        title: "Inventory locking",
        content:
          "Use Redis distributed locks (SETNX with TTL) for seat holds. This prevents double-booking while allowing auto-release on timeout.",
      },
      {
        title: "Event-driven updates",
        content:
          "Use a message queue to broadcast seat availability changes to all connected clients in real-time.",
      },
      {
        title: "Advanced: Two-phase booking",
        content:
          "Phase 1: Optimistically reserve the seat in Redis (SETNX with 10-min TTL). Phase 2: On payment success, persist to SQL database and remove the Redis hold. On payment failure or timeout, the Redis key auto-expires and the seat becomes available. This gives you both speed and durability.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "rate-limiter", x: 350, y: 100 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 420 },
        { componentId: "websocket-server", x: 530, y: 420 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 100 },
        { componentId: "distributed-lock", x: 720, y: 100 },
        { componentId: "message-queue", x: 720, y: 420 },
        { componentId: "sql-db", x: 720, y: 250 },
        { componentId: "nosql-db", x: 880, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "rate-limiter" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "websocket-server" },
        { source: "websocket-server", target: "app-server" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "distributed-lock" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "sql-db" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Concurrency", "Inventory", "Booking"],
  },
  {
    id: "collaborative-editor",
    title: "Google Docs / Collaborative Editor",
    difficulty: "Hard",
    description:
      "Design a real-time collaborative document editor like Google Docs or Notion where multiple users can simultaneously edit the same document with changes appearing instantly for all participants. Google Docs supports up to 100 concurrent editors on a single document — the core challenges are conflict resolution when two users edit the same paragraph simultaneously (using Operational Transformation or CRDTs), maintaining cursor positions and selections across participants, and ensuring document state eventually converges to the same result regardless of network delays.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 30000,
      storageGB: 5000,
      latencyMs: 100,
      users: "100M DAU",
    },
    constraints: [
      "Real-time collaboration with changes visible to all editors within 200ms",
      "Conflict resolution using OT (Operational Transformation) or CRDTs for concurrent edits",
      "Cursor presence — show each collaborator's cursor position and selection in real-time",
      "Full version history with point-in-time restore and diff between any two versions",
      "Offline editing support with automatic merge when reconnecting",
      "Rich text formatting, tables, images, and embedded content",
      "Document-level and block-level permissions (view, comment, edit) with sharing controls",
    ],
    hints: [
      {
        title: "WebSocket for real-time",
        content:
          "Use persistent WebSocket connections for bidirectional real-time updates between clients and the collaboration server.",
      },
      {
        title: "OT vs CRDT",
        content:
          "OT transforms operations against concurrent edits (used by Google Docs). Figma uses a custom server-authoritative approach inspired by CRDTs. OT is simpler; CRDTs are more robust offline.",
      },
      {
        title: "Version history",
        content:
          "Store document snapshots periodically and individual operations between snapshots. Reconstruct any version by applying ops to the nearest snapshot.",
      },
      {
        title: "Advanced: Collaboration server",
        content:
          "Run a dedicated collaboration server per document that receives all client operations, transforms them against concurrent ops (OT), applies them to the authoritative document state, and broadcasts the transformed ops to all other clients. Use Redis Pub/Sub to coordinate when a document's collaboration server moves between instances.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 420 },
        { componentId: "websocket-server", x: 530, y: 420 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "message-queue", x: 720, y: 420 },
        { componentId: "sql-db", x: 720, y: 200 },
        { componentId: "nosql-db", x: 720, y: 80 },
        { componentId: "object-storage", x: 880, y: 200 },
        { componentId: "monitoring", x: 880, y: 370 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "websocket-server" },
        { source: "websocket-server", target: "app-server" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "sql-db" },
        { source: "message-queue", target: "nosql-db" },
        { source: "cdn", target: "object-storage" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["CRDT", "WebSocket", "Collaboration"],
  },
  {
    id: "file-storage",
    title: "Dropbox / File Storage",
    difficulty: "Hard",
    description:
      "Design a cloud file storage and synchronization service like Dropbox or Google Drive. Users upload files that sync across all their devices, with support for file versioning, sharing, and conflict resolution. Dropbox syncs over 1.2 billion files daily — the key engineering challenges are efficient delta sync (only uploading changed blocks instead of entire files), deduplication across users to save storage, and handling conflicts when the same file is edited on multiple devices while offline.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 20000,
      storageGB: 1000000,
      latencyMs: 500,
      users: "700M registered users",
    },
    constraints: [
      "Block-level chunking (4MB blocks) with content-addressable storage for deduplication",
      "Delta sync — only upload changed blocks, not the entire file, reducing bandwidth by 80%+",
      "File versioning with configurable retention (default 30 days) and point-in-time restore",
      "Conflict resolution for simultaneous edits — create conflict copies with user resolution UI",
      "Real-time sync notifications to all devices when a file changes on any device",
      "Sharing with granular permissions (view, edit, comment) and shareable links with expiration",
      "Resumable uploads for large files — handle network interruptions without restarting",
    ],
    hints: [
      {
        title: "Block-level storage",
        content:
          "Split files into fixed-size blocks, hash each block, and store blocks in object storage. The metadata DB maps files to ordered lists of block hashes.",
      },
      {
        title: "Deduplication",
        content:
          "Use content-addressable storage — if a block hash already exists, don't store it again. This saves massive storage when users share similar files.",
      },
      {
        title: "Sync protocol",
        content:
          "When a file changes, compute the new block list, diff against the stored block list, and only upload new/changed blocks. Notify other devices via a message queue.",
      },
      {
        title: "Advanced: Delta sync with rolling hash",
        content:
          "Use rolling hash (Rabin fingerprint) to detect block boundaries in modified files. This enables variable-size chunking that minimizes the number of changed blocks even when content is inserted in the middle of a file. Combine with a message queue for real-time sync notifications to all connected devices.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 100 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 100 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "object-storage", x: 720, y: 100 },
        { componentId: "sql-db", x: 720, y: 250 },
        { componentId: "nosql-db", x: 720, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "object-storage" },
        { source: "app-server", target: "sql-db" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Chunking", "Sync", "Dedup"],
  },
  {
    id: "parking-lot",
    title: "Parking Lot System",
    difficulty: "Easy",
    description:
      "Design a smart parking lot management system that tracks vehicle entry/exit, manages spot availability in real-time, handles reservations, and processes payments. Modern smart parking systems like ParkMobile and SpotHero serve hundreds of millions of annual transactions — the key challenges are maintaining accurate real-time availability across multiple lots, handling concurrent reservation requests for the same spot, and integrating with IoT sensors for automatic occupancy detection.",
    requirements: {
      readsPerSec: 5000,
      writesPerSec: 2000,
      storageGB: 100,
      latencyMs: 200,
      users: "10M DAU",
    },
    constraints: [
      "Real-time spot availability updated within 2 seconds of vehicle entry/exit via IoT sensors",
      "Reservation system with time slots — prevent double-booking of the same spot at the same time",
      "Dynamic pricing based on demand, time of day, event proximity, and lot occupancy percentage",
      "Support multiple vehicle types: compact, regular, handicapped, EV charging, motorcycle",
      "Automatic license plate recognition (LPR) for ticketless entry and exit",
      "Payment processing with support for hourly, daily, and monthly passes",
      "Multi-lot management dashboard with analytics (peak hours, revenue, utilization trends)",
    ],
    hints: [
      {
        title: "Data model",
        content:
          "Model parking lots with floors, zones, and individual spots. Each spot has a type, status, and optional reservation.",
      },
      {
        title: "Real-time availability",
        content:
          "Use Redis to cache current availability counts per lot/floor/type. Update on every entry/exit event for instant queries.",
      },
      {
        title: "Reservation locking",
        content:
          "Use optimistic locking in the database for reservations — check availability at commit time, not at selection time.",
      },
      {
        title: "Advanced: Event-driven updates",
        content:
          "IoT sensors publish entry/exit events to a message queue. A processor updates the cache (Redis) and database, and broadcasts availability changes to the mobile app via WebSocket for real-time map updates.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 500, y: 250 },
        { componentId: "cache", x: 500, y: 100 },
        { componentId: "message-queue", x: 500, y: 400 },
        { componentId: "sql-db", x: 700, y: 250 },
        { componentId: "monitoring", x: 700, y: 100 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "sql-db" },
        { source: "message-queue", target: "sql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["IoT", "Real-time", "Booking"],
  },
  {
    id: "instagram",
    title: "Instagram / Photo Sharing",
    difficulty: "Medium",
    description:
      "Design a photo and short-video sharing platform like Instagram. Users upload photos that are processed (resized, filtered, compressed), stored across a CDN, and displayed in a personalized feed. Instagram serves over 3 billion monthly active users and processes 100+ million photo uploads daily — the key challenges are building an efficient media processing pipeline, generating a ranked feed from thousands of candidate posts, and serving media globally with minimal latency using edge caching.",
    requirements: {
      readsPerSec: 150000,
      writesPerSec: 20000,
      storageGB: 500000,
      latencyMs: 200,
      users: "500M DAU",
    },
    constraints: [
      "Photo upload processing pipeline: resize to multiple resolutions, apply optional filters, strip EXIF data",
      "Stories (24h ephemeral content) and Reels (short video) alongside permanent posts",
      "Ranked feed using signals: relationship strength, post engagement, recency, content type preferences",
      "Image/video CDN with edge caching — serve media from the nearest POP to the user",
      "Social graph storage for followers/following with efficient fan-out for feed generation",
      "Real-time engagement (likes, comments, shares) with optimistic UI updates",
      "Content moderation pipeline — automated detection of policy-violating content before publication",
    ],
    hints: [
      {
        title: "Media pipeline",
        content:
          "Upload original to object storage, push a processing job to a message queue, workers generate thumbnails and resized versions, then update CDN.",
      },
      {
        title: "Feed generation",
        content:
          "Pre-compute feeds for most users (fan-out-on-write). For high-follower accounts, merge their posts at read time (fan-out-on-read).",
      },
      {
        title: "CDN strategy",
        content:
          "Serve all media through a CDN with aggressive caching. Use image-specific CDNs (like Cloudinary or Imgix) for on-the-fly resizing.",
      },
      {
        title: "Advanced: Two-tier storage",
        content:
          "Recent photos (< 30 days) stay on fast SSD-backed object storage with CDN caching. Older photos migrate to cheaper archival storage (S3 Infrequent Access). When an old photo is accessed, the CDN fetches from archival storage and caches it at the edge, hiding the higher latency from users.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 420 },
        { componentId: "app-server", x: 530, y: 200 },
        { componentId: "cache", x: 530, y: 60 },
        { componentId: "message-queue", x: 530, y: 380 },
        { componentId: "object-storage", x: 720, y: 80 },
        { componentId: "nosql-db", x: 720, y: 250 },
        { componentId: "search", x: 720, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "object-storage" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "search" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["CDN", "Media", "Feed"],
  },
  {
    id: "music-streaming",
    title: "Spotify / Music Streaming",
    difficulty: "Medium",
    description:
      "Design a music streaming platform like Spotify that serves audio content to millions of concurrent listeners, manages a catalog of 100M+ tracks, generates personalized playlists, and supports offline downloads. Spotify streams billions of minutes of audio daily — the key challenges are optimizing audio delivery with adaptive bitrate streaming, building a recommendation engine from listening history, and managing music licensing and royalty tracking for artists.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 10000,
      storageGB: 500000,
      latencyMs: 200,
      users: "250M DAU",
    },
    constraints: [
      "Adaptive bitrate audio streaming (96kbps, 160kbps, 320kbps) based on network conditions",
      "Gapless playback with audio pre-buffering — next track starts loading before current track ends",
      "Personalized recommendations: Discover Weekly, Release Radar, daily mixes using collaborative filtering",
      "Offline mode with encrypted local storage — downloaded tracks work without internet",
      "Social features: collaborative playlists, friend activity, sharing to external platforms",
      "Real-time play count tracking and royalty calculation per stream for rights holders",
      "Search across 100M+ tracks by title, artist, album, lyrics with fuzzy matching",
    ],
    hints: [
      {
        title: "Audio delivery",
        content:
          "Store audio files in object storage at multiple bitrates. Use a CDN with edge caching for popular tracks — top 1% of tracks account for 80% of streams.",
      },
      {
        title: "Recommendation engine",
        content:
          "Combine collaborative filtering (users who liked X also liked Y) with content-based features (audio analysis, genre, mood). Process listening events through a message queue.",
      },
      {
        title: "Catalog and search",
        content:
          "Store the music catalog in a NoSQL database. Use Elasticsearch for full-text search across titles, artists, and lyrics.",
      },
      {
        title: "Advanced: Pre-fetch pipeline",
        content:
          "When a user is 30 seconds from the end of a track, predict the next track (based on queue, playlist, or auto-play) and start streaming it to the client. Cache frequently co-listened tracks on the same CDN edge node to reduce origin fetches.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 420 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "object-storage", x: 720, y: 80 },
        { componentId: "nosql-db", x: 720, y: 250 },
        { componentId: "search", x: 720, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "search" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Streaming", "CDN", "Recommendations"],
  },
  {
    id: "ecommerce",
    title: "Amazon / E-Commerce",
    difficulty: "Hard",
    description:
      "Design a large-scale e-commerce platform like Amazon. The system handles product catalog management with millions of SKUs, shopping cart persistence, inventory tracking across warehouses, order processing, and personalized recommendations. Amazon processes over 300 million active customer accounts and handles millions of orders per hour during peak events like Prime Day — the central challenges are maintaining inventory consistency across concurrent purchases, building a low-latency product search, and orchestrating the complex order fulfillment pipeline.",
    requirements: {
      readsPerSec: 200000,
      writesPerSec: 50000,
      storageGB: 20000,
      latencyMs: 200,
      users: "300M active accounts",
    },
    constraints: [
      "Product catalog with 100M+ SKUs, each with variants (size, color), pricing tiers, and seller information",
      "Real-time inventory tracking across multiple warehouses — prevent overselling on concurrent purchases",
      "Shopping cart persistence — carts survive browser closure, device switching, and user sign-in/out",
      "Order processing pipeline: payment → inventory reservation → warehouse assignment → shipping → delivery tracking",
      "Product search with filters (category, price, rating, availability) and typo tolerance",
      "Personalized recommendations on homepage, product pages, and cart (frequently bought together)",
      "Flash sale / Prime Day handling — 100× normal traffic spikes with fair inventory allocation",
    ],
    hints: [
      {
        title: "Microservice split",
        content:
          "Separate services for catalog, cart, inventory, orders, payments, and search. Each scales independently based on its traffic pattern.",
      },
      {
        title: "Inventory management",
        content:
          "Use optimistic locking with version numbers for inventory updates. Reserve stock at checkout, deduct on payment confirmation, release on timeout.",
      },
      {
        title: "Cart design",
        content:
          "Store carts in a NoSQL database (DynamoDB) with the user ID as the key. Merge anonymous carts with user carts on sign-in.",
      },
      {
        title: "Advanced: Event sourcing for orders",
        content:
          "Model orders as a stream of events (created → paid → picked → packed → shipped → delivered). Each event is appended to a message queue. Consumers update projections (order status, inventory, analytics) independently. This gives you full auditability, replay capability, and decoupled services.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 100 },
        { componentId: "rate-limiter", x: 350, y: 420 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 100 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "sql-db", x: 720, y: 200 },
        { componentId: "nosql-db", x: 720, y: 350 },
        { componentId: "search", x: 880, y: 200 },
        { componentId: "object-storage", x: 880, y: 350 },
        { componentId: "monitoring", x: 880, y: 80 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "rate-limiter" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "sql-db" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "search" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Catalog", "Cart", "Inventory"],
  },
  {
    id: "team-messaging",
    title: "Slack / Team Messaging",
    difficulty: "Hard",
    description:
      "Design a workspace-based team messaging platform like Slack or Microsoft Teams. The system supports organized channels, threaded conversations, direct messages, file sharing, search across message history, and integrations with third-party services. Slack handles tens of millions of daily active users across hundreds of thousands of workspaces — the key challenges are maintaining message ordering and delivery guarantees across channels, building a fast full-text search index over billions of messages, and managing the complex permission model of workspaces, channels, and threads.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 30000,
      storageGB: 10000,
      latencyMs: 100,
      users: "100M DAU",
    },
    constraints: [
      "Workspace isolation — data from one workspace must never leak to another (multi-tenant security)",
      "Channel types: public (discoverable), private (invite-only), DMs (1:1 and group)",
      "Threaded conversations with reply counts, last-reply timestamps, and thread-follow notifications",
      "Real-time message delivery via WebSocket with offline message queuing for disconnected clients",
      "Full-text search across all messages in a workspace with filters (channel, user, date range, has:file)",
      "File sharing with preview generation (images, PDFs, code snippets) and per-file access control",
      "Integration framework for bots and external services (webhooks, slash commands, OAuth apps)",
    ],
    hints: [
      {
        title: "Message storage",
        content:
          "Store messages in a NoSQL database partitioned by workspace + channel. Use channel-level sequence numbers for ordering.",
      },
      {
        title: "Real-time delivery",
        content:
          "Maintain WebSocket connections per user. Use Redis Pub/Sub to route messages — subscribe each connection to the user's active channels.",
      },
      {
        title: "Search architecture",
        content:
          "Index messages in Elasticsearch partitioned by workspace. Update the index asynchronously via a message queue to avoid slowing down message sends.",
      },
      {
        title: "Advanced: Connection gateway",
        content:
          "Deploy a dedicated WebSocket gateway layer that maintains persistent connections. App servers send messages to the gateway via an internal message bus. The gateway maps user IDs to connections. This separates the stateful connection layer from the stateless business logic, letting each scale independently.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 420 },
        { componentId: "websocket-server", x: 530, y: 380 },
        { componentId: "app-server", x: 530, y: 200 },
        { componentId: "cache", x: 530, y: 60 },
        { componentId: "message-queue", x: 720, y: 380 },
        { componentId: "nosql-db", x: 720, y: 200 },
        { componentId: "object-storage", x: 720, y: 60 },
        { componentId: "search", x: 880, y: 380 },
        { componentId: "monitoring", x: 880, y: 200 },
        { componentId: "rate-limiter", x: 200, y: 420 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "load-balancer", target: "rate-limiter" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "websocket-server" },
        { source: "websocket-server", target: "app-server" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "nosql-db" },
        { source: "message-queue", target: "search" },
        { source: "message-queue", target: "object-storage" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["WebSocket", "Search", "Workspace"],
  },
  {
    id: "metrics-monitoring",
    title: "Metrics / Monitoring System",
    difficulty: "Hard",
    description:
      "Design a metrics collection and monitoring system like Datadog, Prometheus, or New Relic. The system ingests millions of time-series data points per second from thousands of servers, stores them efficiently with configurable retention, supports real-time dashboarding, and triggers alerts based on complex threshold and anomaly detection rules. Datadog ingests trillions of data points daily — the core challenges are designing a storage engine optimized for time-series write patterns, supporting flexible aggregation queries at sub-second speed, and building a reliable alerting pipeline with low false-positive rates.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 500000,
      storageGB: 50000,
      latencyMs: 100,
      users: "N/A (infrastructure)",
    },
    constraints: [
      "Ingest 500K+ metrics data points per second with sub-second write latency",
      "Time-series storage with automatic downsampling: raw (7 days), 1-min avg (30 days), 1-hour avg (1 year)",
      "Flexible query language for aggregation: avg, sum, percentiles, rate, group-by across arbitrary tag dimensions",
      "Real-time dashboard rendering with auto-refresh and support for custom visualization widgets",
      "Alerting engine with threshold, anomaly detection, and composite alert conditions",
      "Alert routing with escalation policies, on-call schedules, and multi-channel delivery (PagerDuty, Slack, email)",
      "Tag-based metric organization with high-cardinality tag support (up to 10K unique values per tag)",
    ],
    hints: [
      {
        title: "Write-optimized ingestion",
        content:
          "Use a message queue to buffer incoming metrics. Batch writes to the time-series database for higher throughput.",
      },
      {
        title: "Time-series storage",
        content:
          "Use a specialized time-series database (or NoSQL with time-based partitioning). Compress adjacent data points using delta-of-delta encoding.",
      },
      {
        title: "Alerting pipeline",
        content:
          "Separate the alerting evaluation from ingestion. A dedicated service continuously evaluates alert rules against recent data and fires notifications.",
      },
      {
        title: "Advanced: Downsampling pipeline",
        content:
          "Run a background job that reads raw metrics older than 7 days, computes 1-minute aggregates (avg, min, max, count), writes them to a separate table, and deletes the raw data. Repeat at 30 days for 1-hour aggregates. This reduces storage by 100x while keeping historical queries fast.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "load-balancer", x: 100, y: 250 },
        { componentId: "api-gateway", x: 250, y: 250 },
        { componentId: "app-server", x: 420, y: 200 },
        { componentId: "message-queue", x: 420, y: 380 },
        { componentId: "cache", x: 420, y: 60 },
        { componentId: "timeseries-db", x: 620, y: 200 },
        { componentId: "sql-db", x: 620, y: 380 },
        { componentId: "search", x: 620, y: 60 },
        { componentId: "monitoring", x: 820, y: 200 },
        { componentId: "auth-service", x: 250, y: 100 },
      ],
      edges: [
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "timeseries-db" },
        { source: "app-server", target: "sql-db" },
        { source: "app-server", target: "search" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["TimeSeries", "Alerting", "Aggregation"],
  },
  {
    id: "netflix",
    title: "Netflix / Video Streaming Platform",
    difficulty: "Hard",
    description:
      "Design a video streaming platform like Netflix that serves personalized content to 325 million subscribers across 190+ countries. Netflix accounts for over 15% of global internet bandwidth during peak hours — the key challenges are building a content recommendation engine that drives 80% of watch time, implementing adaptive bitrate streaming (ABR) that adjusts quality frame-by-frame based on network conditions, and leveraging a global CDN (Open Connect) with ISP-embedded appliances to serve 17,000+ titles with sub-second start times.",
    requirements: {
      readsPerSec: 300000,
      writesPerSec: 5000,
      storageGB: 2000000,
      latencyMs: 100,
      users: "325M subscribers",
    },
    constraints: [
      "Adaptive bitrate streaming (ABR) using per-shot encoding — each scene encoded at optimal bitrate/resolution ladder",
      "Content recommendation engine processing billions of implicit signals (watch time, pauses, rewatches, abandons)",
      "Global CDN with ISP-embedded Open Connect Appliances (OCAs) caching popular content at the network edge",
      "DRM enforcement (Widevine, FairPlay, PlayReady) with license server handling 100K+ license requests/sec",
      "Multi-profile support per account with isolated recommendation models and viewing history",
      "Content ingestion pipeline: ingest mezzanine file → encode 1200+ variants (resolution × bitrate × codec) per title",
    ],
    hints: [
      {
        title: "Content delivery",
        content:
          "Use a CDN with ISP-embedded edge appliances for popular titles. Pre-position content during off-peak hours based on predicted regional demand.",
      },
      {
        title: "Recommendation engine",
        content:
          "Combine collaborative filtering with deep learning models trained on viewing patterns. Stream user events through a message queue for real-time signal processing.",
      },
      {
        title: "Encoding pipeline",
        content:
          "Use per-title and per-shot encoding optimization. Process through a message queue that triggers parallel transcoding workers to generate the full resolution/bitrate ladder.",
      },
      {
        title: "Advanced: Microservice architecture",
        content:
          "Netflix uses 1000+ microservices. Separate the control plane (API, auth, recommendations, search) from the data plane (video streaming via CDN). The API gateway (Zuul) handles routing, auth, and rate limiting. Use a cache (EVCache/Memcached) aggressively — Netflix caches billions of data points to achieve sub-100ms API responses.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 420 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "nosql-db", x: 720, y: 250 },
        { componentId: "object-storage", x: 720, y: 80 },
        { componentId: "search", x: 720, y: 420 },
        { componentId: "stream-processor", x: 880, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "search" },
        { source: "message-queue", target: "stream-processor" },
        { source: "message-queue", target: "object-storage" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Streaming", "CDN", "Recommendations", "DRM"],
  },
  {
    id: "tinder",
    title: "Tinder / Dating App",
    difficulty: "Medium",
    description:
      "Design a location-based dating application like Tinder that matches users based on geographic proximity, preferences, and compatibility signals. Tinder processes over 2 billion swipes per day with 75 million monthly active users — the key challenges are building an efficient geospatial index for proximity matching, a recommendation engine that surfaces relevant profiles while avoiding already-seen users, and handling the high write throughput of swipe events with real-time match notifications when two users swipe right on each other.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 50000,
      storageGB: 100000,
      latencyMs: 200,
      users: "75M MAU",
    },
    constraints: [
      "Geospatial proximity search using geohashing or R-tree index — find users within configurable radius (1-160 km)",
      "Recommendation engine that filters by preferences (age, gender, distance) and ranks by compatibility score",
      "Swipe deduplication — never show a user the same profile twice, even across sessions",
      "Real-time match detection — when both users swipe right, notify both instantly via push notification",
      "Photo storage and serving with face detection validation and content moderation pipeline",
      "ELO-like scoring system that adapts profile visibility based on desirability signals",
    ],
    hints: [
      {
        title: "Geospatial indexing",
        content:
          "Use geohashing to partition users by location. Store active user locations in Redis with GEOADD for O(log N) proximity queries within a radius.",
      },
      {
        title: "Recommendation pipeline",
        content:
          "Pre-compute a recommendation deck for each active user: filter by preferences, exclude already-swiped profiles, rank by compatibility score, and cache the top 100 candidates.",
      },
      {
        title: "Match detection",
        content:
          "On each right-swipe, check if the target user has already right-swiped the current user. Store swipes in a NoSQL database keyed by (swiper, swipee) for O(1) lookup.",
      },
      {
        title: "Advanced: Sharded recommendation",
        content:
          "Partition the user base by geohash prefix so each recommendation shard handles a geographic region. Within each shard, maintain a bloom filter of seen profiles per user to avoid re-showing. Pre-compute recommendation decks during off-peak hours using a stream processor that scores all eligible matches.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "nosql-db", x: 720, y: 200 },
        { componentId: "object-storage", x: 720, y: 80 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "stream-processor", x: 720, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "stream-processor" },
        { source: "stream-processor", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Geo-spatial", "Matching", "Recommendations", "Real-time"],
  },
  {
    id: "google-maps",
    title: "Google Maps / Navigation",
    difficulty: "Hard",
    description:
      "Design a mapping and navigation platform like Google Maps that serves map tiles, computes optimal routes, provides real-time traffic updates, and estimates accurate ETAs. Google Maps serves over 1 billion daily active users and processes 1 billion kilometers of driving directions daily — the core challenges are serving pre-rendered map tiles at multiple zoom levels from a multi-petabyte tile corpus, computing shortest paths on a road graph with hundreds of millions of edges using hierarchical algorithms (Contraction Hierarchies / A*), and ingesting real-time GPS probe data from millions of devices to update traffic conditions every 30 seconds.",
    requirements: {
      readsPerSec: 500000,
      writesPerSec: 100000,
      storageGB: 5000000,
      latencyMs: 200,
      users: "1B DAU",
    },
    constraints: [
      "Map tile serving at 20+ zoom levels — vector tiles for mobile, raster tiles for web, pre-rendered and cached at CDN edge",
      "Route computation using Contraction Hierarchies or A* on a graph with 500M+ road segments in under 200ms",
      "Real-time traffic layer updated every 30 seconds from GPS probe data aggregated across millions of active drivers",
      "ETA prediction combining historical patterns, live traffic, road type, and time-of-day with < 20% error",
      "Multi-modal routing: driving, walking, cycling, public transit with real-time schedule integration",
      "Geocoding and reverse geocoding with fuzzy address matching across 200+ countries and scripts",
    ],
    hints: [
      {
        title: "Map tile serving",
        content:
          "Pre-render tiles at each zoom level and store in object storage. Serve via CDN for instant loading. Use vector tiles on mobile to reduce bandwidth — the client renders them locally.",
      },
      {
        title: "Route computation",
        content:
          "Use Contraction Hierarchies (CH) to preprocess the road graph. CH reduces a cross-country route query from millions of edge relaxations to a few thousand, enabling sub-200ms responses.",
      },
      {
        title: "Real-time traffic",
        content:
          "Ingest GPS probes from active users into a stream processor. Aggregate speed per road segment over 30-second windows. Store in a time-series database and overlay on the pre-computed road graph.",
      },
      {
        title: "Advanced: Partitioned graph serving",
        content:
          "Partition the road graph geographically. Each partition server handles local routing. For cross-partition routes, use a two-level approach: a global overlay graph of inter-partition highways handles the macro route, then local servers compute the first-mile and last-mile segments. Cache popular origin-destination pairs for instant responses.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "nosql-db", x: 720, y: 200 },
        { componentId: "object-storage", x: 720, y: 80 },
        { componentId: "stream-processor", x: 530, y: 420 },
        { componentId: "timeseries-db", x: 720, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "stream-processor" },
        { source: "stream-processor", target: "timeseries-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Geo-spatial", "Graph", "Real-time", "CDN"],
  },
  {
    id: "zoom",
    title: "Zoom / Video Conferencing",
    difficulty: "Hard",
    description:
      "Design a real-time video conferencing platform like Zoom that supports meetings with up to 1000 participants, screen sharing, recording, and breakout rooms. Zoom handles over 300 million daily meeting participants with end-to-end latency under 150ms — the core challenges are building a Selective Forwarding Unit (SFU) architecture that routes video streams without transcoding to minimize latency, managing bandwidth allocation when dozens of participants have cameras enabled simultaneously, and providing reliable recording with server-side mixing for cloud playback.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 50000,
      storageGB: 500000,
      latencyMs: 50,
      users: "300M daily meeting participants",
    },
    constraints: [
      "End-to-end glass-to-glass latency under 150ms for real-time audio/video using WebRTC or custom UDP protocol",
      "SFU (Selective Forwarding Unit) architecture — server forwards streams without transcoding to minimize latency",
      "Simulcast: each sender encodes 3 quality layers (low/medium/high), SFU selects per-receiver based on bandwidth and layout",
      "Screen sharing at 1080p/30fps alongside camera feeds with independent bandwidth allocation",
      "Cloud recording with server-side mixing — composite multiple video streams into a single recording file",
      "Breakout rooms, waiting rooms, and host controls with real-time state synchronization across all participants",
    ],
    hints: [
      {
        title: "SFU over MCU",
        content:
          "Use a Selective Forwarding Unit (SFU) instead of a Multipoint Control Unit (MCU). SFU forwards packets without decoding/re-encoding, reducing latency and server CPU cost by 10x compared to MCU.",
      },
      {
        title: "Simulcast for bandwidth",
        content:
          "Each sender publishes 3 quality layers (e.g., 180p, 360p, 720p). The SFU dynamically selects the appropriate layer for each receiver based on their available bandwidth and visible tile size.",
      },
      {
        title: "Distributed media routing",
        content:
          "Deploy SFU servers in multiple regions. For cross-region meetings, cascade SFU servers over dedicated backbone links rather than sending each participant's stream across regions independently.",
      },
      {
        title: "Advanced: Geo-distributed SFU mesh",
        content:
          "For global meetings, deploy SFU nodes in each participant's nearest region. Connect SFU nodes via a server-to-server mesh over the provider's backbone network. Each SFU forwards only the active speaker and pinned streams across regions (not all participants), reducing cross-region bandwidth by 80%. Use SRTP for encryption and RTCP feedback for congestion control.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "websocket-server", x: 350, y: 420 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "nosql-db", x: 720, y: 200 },
        { componentId: "object-storage", x: 720, y: 80 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "load-balancer", target: "websocket-server" },
        { source: "api-gateway", target: "app-server" },
        { source: "websocket-server", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "object-storage" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["WebRTC", "Real-time", "Media", "SFU"],
  },
  {
    id: "food-delivery",
    title: "Doordash / Food Delivery",
    difficulty: "Hard",
    description:
      "Design a food delivery platform like DoorDash or Uber Eats that connects customers, restaurants, and delivery drivers in real-time. DoorDash processes over 750 million orders per quarter across 500,000+ merchant partners — the core challenges are building a real-time dispatch system that optimally matches orders to drivers (considering location, capacity, and estimated completion times), maintaining accurate ETAs that update as conditions change, and handling the three-sided marketplace where restaurant prep times, driver routes, and customer expectations must all be balanced simultaneously.",
    requirements: {
      readsPerSec: 80000,
      writesPerSec: 40000,
      storageGB: 50000,
      latencyMs: 200,
      users: "46M MAU",
    },
    constraints: [
      "Real-time order tracking with GPS updates every 5 seconds from active delivery drivers",
      "Driver dispatch algorithm optimizing for delivery time, driver earnings, and order batching (multi-pickup routes)",
      "Restaurant inventory and prep-time estimation — dynamically adjust menu availability based on kitchen capacity",
      "ETA prediction combining restaurant prep time, driver travel time, and real-time traffic conditions",
      "Payment splitting: customer charge, restaurant payout (minus commission), driver payout (base + tips + peak pay)",
      "Surge pricing and delivery fee calculation based on real-time demand/supply ratio per zone",
    ],
    hints: [
      {
        title: "Three-sided marketplace",
        content:
          "Model the system as three user types: customers (ordering), restaurants (preparing), and drivers (delivering). Each has separate real-time state that must be coordinated.",
      },
      {
        title: "Dispatch optimization",
        content:
          "Use a centralized dispatch service that runs a matching algorithm every few seconds, considering driver proximity to restaurant, current orders in progress, and restaurant prep time estimates.",
      },
      {
        title: "Real-time tracking",
        content:
          "Ingest driver GPS updates into a stream processor. Update ETAs in real-time and push to customers via WebSocket or server-sent events.",
      },
      {
        title: "Advanced: Order batching",
        content:
          "DoorDash groups multiple orders from nearby restaurants heading to nearby destinations into a single driver route. The dispatch algorithm runs a traveling-salesman heuristic (nearest-neighbor with 2-opt improvement) to minimize total delivery time while keeping each individual order within its promised ETA window.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "nosql-db", x: 720, y: 300 },
        { componentId: "sql-db", x: 720, y: 150 },
        { componentId: "stream-processor", x: 720, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "sql-db" },
        { source: "app-server", target: "nosql-db" },
        { source: "message-queue", target: "stream-processor" },
        { source: "stream-processor", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Geo-spatial", "Real-time", "Dispatch", "Marketplace"],
  },
  {
    id: "reddit",
    title: "Reddit / Social News",
    difficulty: "Medium",
    description:
      "Design a social news aggregation and discussion platform like Reddit. Users submit posts to topic-based communities (subreddits), vote content up or down, and engage in deeply nested comment threads. Reddit serves 97+ million daily active users across 100,000+ active communities — the key challenges are implementing a ranking algorithm (hot, top, controversial, best) that surfaces quality content across communities of vastly different sizes, efficiently storing and rendering deeply nested comment trees with thousands of replies, and building a moderation system that scales across volunteer moderators.",
    requirements: {
      readsPerSec: 200000,
      writesPerSec: 20000,
      storageGB: 200000,
      latencyMs: 200,
      users: "97M DAU",
    },
    constraints: [
      "Multiple ranking algorithms: hot (time-decayed score), top (by time window), controversial (balanced up/down), best (Wilson score)",
      "Nested comment trees with efficient rendering — load top-level comments first, lazy-load deep threads",
      "Subreddit isolation — each community has its own rules, moderators, CSS themes, and content policies",
      "Vote counting with anti-manipulation: rate limiting, vote fuzzing, and bot detection",
      "Cross-posting and content aggregation across subreddits with deduplication on /r/all",
      "Full-text search across posts and comments with subreddit and time-range filters",
    ],
    hints: [
      {
        title: "Ranking algorithm",
        content:
          "Reddit's hot ranking uses: score = log10(max(|ups - downs|, 1)) + sign(ups - downs) * (post_time - epoch) / 45000. Pre-compute rankings and cache the sorted feeds for each subreddit.",
      },
      {
        title: "Comment tree storage",
        content:
          "Store comments in a NoSQL database with parent_id for tree structure. Use materialized path (e.g., 'root/parent/child') for efficient subtree queries. Cache top-level comments aggressively.",
      },
      {
        title: "Vote processing",
        content:
          "Process votes through a message queue to decouple the fast vote acknowledgment from the slower ranking recalculation. Use Redis to cache current vote counts per post.",
      },
      {
        title: "Advanced: Hybrid feed computation",
        content:
          "For small subreddits (< 10K subscribers), compute rankings on the fly from cached vote counts. For large subreddits (> 100K), pre-compute ranked feeds every 30 seconds using a background job. For /r/all, use a stream processor that merges top posts from all subreddits with normalized scoring to prevent large communities from dominating.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "nosql-db", x: 720, y: 200 },
        { componentId: "sql-db", x: 720, y: 350 },
        { componentId: "search", x: 880, y: 200 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "monitoring", x: 880, y: 350 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "sql-db" },
        { source: "app-server", target: "search" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Ranking", "Comments", "Voting", "Community"],
  },
  {
    id: "airbnb",
    title: "Airbnb / Booking Platform",
    difficulty: "Hard",
    description:
      "Design a property rental and booking platform like Airbnb that connects hosts with guests for short-term stays. Airbnb has 7+ million active listings across 220 countries with billions of monthly searches — the core challenges are building a search system that handles complex multi-dimensional queries (location, dates, price, amenities, guest count), implementing a booking and reservation system that prevents double-booking across overlapping date ranges, and building a dynamic pricing algorithm that helps hosts optimize revenue based on seasonality, local events, and comparable listings.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 10000,
      storageGB: 100000,
      latencyMs: 200,
      users: "50M DAU",
    },
    constraints: [
      "Search with compound filters: location (geo-radius), date range availability, price range, guest count, amenities, property type",
      "Calendar-based availability management — hosts block dates, bookings reserve date ranges, no double-booking allowed",
      "Reservation system with hold-and-confirm pattern: temporarily hold dates during checkout flow (15-min TTL)",
      "Dynamic pricing suggestions using comparable listings, seasonality patterns, local event calendars, and demand forecasts",
      "Review system with bilateral reviews (host reviews guest, guest reviews host) revealed simultaneously after both submit",
      "Multi-currency pricing with real-time exchange rates, host payout in local currency, guest charges in their currency",
    ],
    hints: [
      {
        title: "Search architecture",
        content:
          "Use Elasticsearch with geo_point for location search, date range queries for availability, and filters for amenities/price. Pre-compute availability calendars as bitmaps for fast date-range intersection.",
      },
      {
        title: "Availability management",
        content:
          "Store each listing's availability as a calendar in a SQL database. Use row-level locking or optimistic concurrency to prevent double-booking when two guests try to book overlapping dates.",
      },
      {
        title: "Booking flow",
        content:
          "Phase 1: Hold the dates in a distributed lock (Redis SETNX with 15-min TTL). Phase 2: Process payment. Phase 3: Confirm booking in SQL and release the lock. On timeout, dates auto-release.",
      },
      {
        title: "Advanced: Search relevance",
        content:
          "Airbnb's search ranking combines 100+ features: price competitiveness, host response rate, listing quality score, guest-listing compatibility, and conversion probability. Use a two-stage ranking pipeline: a fast candidate retrieval phase (Elasticsearch with geo + date filters) followed by a machine-learned re-ranking model (gradient boosted trees) that scores the top 1000 candidates.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "sql-db", x: 720, y: 150 },
        { componentId: "nosql-db", x: 720, y: 300 },
        { componentId: "search", x: 880, y: 150 },
        { componentId: "object-storage", x: 880, y: 300 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "monitoring", x: 880, y: 420 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "sql-db" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "search" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Search", "Booking", "Geo-spatial", "Marketplace"],
  },
  {
    id: "whatsapp",
    title: "WhatsApp / Messaging",
    difficulty: "Hard",
    description:
      "Design an end-to-end encrypted messaging platform like WhatsApp that handles 100+ billion messages per day across 3 billion monthly active users. The server never sees plaintext message content — the core challenges are implementing the Signal Protocol for end-to-end encryption with perfect forward secrecy, reliably delivering messages to offline users (store-and-forward), efficiently fanning out messages in group chats (up to 1024 members), and synchronizing message state across multiple linked devices while maintaining encryption guarantees.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 1000000,
      storageGB: 500000,
      latencyMs: 50,
      users: "3B MAU",
    },
    constraints: [
      "End-to-end encryption using Signal Protocol — server stores only ciphertext, key exchange via X3DH (Extended Triple Diffie-Hellman)",
      "Offline message delivery with store-and-forward — messages queued on server until recipient reconnects, then delivered in order",
      "Group messaging up to 1024 members with Sender Keys protocol for efficient group encryption",
      "Media sharing with encrypted upload — media encrypted client-side, uploaded to object storage, decryption key sent in message",
      "Multi-device support (WhatsApp Web/Desktop) with message sync using companion device protocol",
      "Read receipts, typing indicators, and online presence as ephemeral signals (no persistent storage)",
    ],
    hints: [
      {
        title: "Connection management",
        content:
          "Maintain persistent WebSocket connections from each client to a connection gateway. Store the mapping of user ID → gateway server in Redis for message routing.",
      },
      {
        title: "Message delivery",
        content:
          "On send: encrypt client-side, send to server, server queues in recipient's inbox (NoSQL). When recipient is online, push immediately via their WebSocket connection. When offline, store and deliver on reconnect.",
      },
      {
        title: "Group messaging",
        content:
          "Use Sender Keys: the sender encrypts the message once with a shared group key, server fans out the ciphertext to all group members. This avoids N separate encryptions per message.",
      },
      {
        title: "Advanced: Multi-device sync",
        content:
          "WhatsApp's multi-device architecture treats each device as a separate Signal Protocol client. When sending to a user with 4 linked devices, the sender encrypts the message 4 times (once per device's public key). Each device maintains its own ratchet state. The server stores per-device message queues and delivers independently. This eliminates the need for a primary device to be online.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "websocket-server", x: 200, y: 100 },
        { componentId: "app-server", x: 400, y: 250 },
        { componentId: "cache", x: 400, y: 100 },
        { componentId: "message-queue", x: 400, y: 400 },
        { componentId: "nosql-db", x: 600, y: 250 },
        { componentId: "object-storage", x: 600, y: 100 },
        { componentId: "monitoring", x: 800, y: 250 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "websocket-server" },
        { source: "websocket-server", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "object-storage" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Encryption", "WebSocket", "Messaging", "Real-time"],
  },
  {
    id: "search-engine",
    title: "Google Search / Search Engine",
    difficulty: "Hard",
    description:
      "Design a web search engine like Google that crawls billions of web pages, builds an inverted index, ranks results by relevance, and returns the top results in under 200ms. Google processes over 8.5 billion searches per day across an index of hundreds of billions of pages (hundreds of petabytes) — the core challenges are building and maintaining a distributed inverted index that maps every word to the documents containing it, implementing a ranking algorithm (PageRank + hundreds of signals) that surfaces the most relevant results, and serving queries with sub-200ms latency by scattering the query across thousands of index shards in parallel.",
    requirements: {
      readsPerSec: 500000,
      writesPerSec: 50000,
      storageGB: 10000000,
      latencyMs: 200,
      users: "8.5B queries/day",
    },
    constraints: [
      "Distributed inverted index sharded across thousands of machines — each shard holds a portion of the web",
      "PageRank computation over a web graph of 100B+ nodes using iterative MapReduce (converges in 40-50 iterations)",
      "Query parsing with spell correction, synonym expansion, entity recognition, and intent classification",
      "Sub-200ms query latency by scatter-gather across index shards with aggressive timeouts (drop slow shards)",
      "Freshness: crawl and re-index high-priority pages (news sites) within minutes of changes",
      "Snippet generation — extract the most relevant text fragment from each result page to display in results",
    ],
    hints: [
      {
        title: "Inverted index",
        content:
          "Build an inverted index mapping each term to a sorted list of (docID, frequency, positions). Shard by document (each shard holds the full index for a subset of pages). At query time, scatter the query to all shards and merge results.",
      },
      {
        title: "Ranking signals",
        content:
          "Combine hundreds of signals: PageRank (link authority), BM25 (term relevance), freshness, page speed, mobile-friendliness, and user engagement metrics. Use a machine-learned model to weight signals.",
      },
      {
        title: "Crawl and index pipeline",
        content:
          "Web crawler discovers pages → message queue → parser extracts text and links → indexer updates inverted index → PageRank recomputes periodically on the link graph.",
      },
      {
        title: "Advanced: Two-phase ranking",
        content:
          "Phase 1 (retrieval): Use the inverted index to find candidate documents matching the query terms using BM25 scoring — returns top 1000 candidates per shard. Phase 2 (ranking): A machine-learned model re-ranks candidates using 200+ features (PageRank, click-through rate, query-document embedding similarity). This two-phase approach lets you apply expensive ranking only to promising candidates.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "nosql-db", x: 720, y: 150 },
        { componentId: "search", x: 720, y: 300 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "object-storage", x: 880, y: 150 },
        { componentId: "stream-processor", x: 720, y: 420 },
        { componentId: "monitoring", x: 880, y: 300 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "search" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "stream-processor" },
        { source: "stream-processor", target: "search" },
        { source: "app-server", target: "object-storage" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Search", "Indexing", "PageRank", "Distributed"],
  },
  {
    id: "location-service",
    title: "Yelp / Location-Based Service",
    difficulty: "Medium",
    description:
      "Design a location-based business discovery and review platform like Yelp or Google Places. Users search for businesses by category and proximity, browse photos and reviews, and contribute their own ratings. Yelp indexes over 330 million reviews for 7+ million businesses — the core challenges are building an efficient geospatial index (QuadTree or Geohash) that supports proximity search with category filters, aggregating review scores in real-time as new reviews come in, and serving business detail pages with rich media from a global CDN.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 5000,
      storageGB: 50000,
      latencyMs: 200,
      users: "33M monthly unique visitors",
    },
    constraints: [
      "Geospatial search using QuadTree or Geohash index — find businesses within radius sorted by relevance and distance",
      "Compound search: category + location + price range + rating + open-now with sub-200ms response",
      "Review aggregation with Bayesian average rating (accounts for review count, not just mean score)",
      "Photo storage with thumbnails, CDN serving, and user-uploaded content moderation",
      "Business profile pages with hours, menu (for restaurants), and real-time busy-times based on check-in data",
      "Autocomplete for business names and categories with typo tolerance and location-biased results",
    ],
    hints: [
      {
        title: "Geospatial indexing",
        content:
          "Use a QuadTree to partition geographic space. Each leaf node contains businesses within that area. Proximity queries traverse the tree to find nearby leaves, then filter by radius. Alternatively, use Geohash with prefix matching.",
      },
      {
        title: "Search with filters",
        content:
          "Use Elasticsearch with geo_distance queries for proximity search. Add filters for category, price range, and open hours. Pre-compute popular searches per geohash cell for instant results.",
      },
      {
        title: "Review aggregation",
        content:
          "Cache aggregate ratings in Redis. On new review, update the running average atomically. Use Bayesian average to prevent businesses with few 5-star reviews from outranking those with hundreds of 4.5-star reviews.",
      },
      {
        title: "Advanced: QuadTree sharding",
        content:
          "Build a distributed QuadTree where each server owns a geographic partition. Dense areas (Manhattan) get finer-grained partitions than rural areas. A routing layer maps the user's search center to the relevant partition servers. For boundary queries (search radius spans multiple partitions), query adjacent partitions in parallel and merge results.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "nosql-db", x: 720, y: 200 },
        { componentId: "search", x: 720, y: 350 },
        { componentId: "object-storage", x: 880, y: 200 },
        { componentId: "monitoring", x: 880, y: 350 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "search" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Geo-spatial", "Search", "Reviews", "QuadTree"],
  },
  {
    id: "tiktok",
    title: "TikTok / Short Video",
    difficulty: "Hard",
    description:
      "Design a short-form video platform like TikTok that serves personalized video feeds to over 1.5 billion monthly active users. TikTok's recommendation engine is its core competitive advantage — it builds interest graphs from watch-time signals (not just social graphs) to surface relevant content even for new users within minutes. The platform processes billions of video views per day with a multi-petabyte content library — the key challenges are building the For You Page (FYP) recommendation algorithm, a high-throughput video transcoding pipeline that processes millions of uploads daily, and a content moderation system that reviews content before publication.",
    requirements: {
      readsPerSec: 500000,
      writesPerSec: 50000,
      storageGB: 5000000,
      latencyMs: 100,
      users: "1.5B MAU",
    },
    constraints: [
      "For You Page recommendation combining collaborative filtering, content embeddings, and real-time engagement signals",
      "Video transcoding pipeline: ingest → content moderation → transcode (multiple resolutions/bitrates) → CDN distribution",
      "Content moderation at upload time — automated detection of policy violations (nudity, violence, misinformation) before publication",
      "Creator economy features: live gifting, creator fund payouts, branded content marketplace",
      "Duet and Stitch features requiring frame-accurate video composition on server or client",
      "Global CDN with regional content regulations — different content availability per country",
    ],
    hints: [
      {
        title: "Recommendation engine",
        content:
          "TikTok's FYP uses an interest graph built from watch-time signals (not social graph). Track: watch duration, replays, shares, comments, follows-from-video. Feed these signals into a real-time stream processor.",
      },
      {
        title: "Video pipeline",
        content:
          "Upload to object storage → push processing job to message queue → workers transcode to 360p/720p/1080p → push to CDN. Run content moderation in parallel with transcoding to minimize time-to-publish.",
      },
      {
        title: "Feed serving",
        content:
          "Pre-compute a ranked candidate pool per user. On each swipe, serve the next video from the pool. Refresh the pool every few minutes using the latest engagement signals.",
      },
      {
        title: "Advanced: Two-tower recommendation",
        content:
          "Use a two-tower neural network: one tower encodes user interests (watch history, engagement patterns), the other encodes video features (visual embeddings, audio, text, hashtags). Compute dot-product similarity to score candidates. Generate candidates from multiple sources: interest graph, trending, geographic, and following — then blend and re-rank using the two-tower model for the final feed.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "nosql-db", x: 720, y: 200 },
        { componentId: "object-storage", x: 720, y: 80 },
        { componentId: "search", x: 880, y: 80 },
        { componentId: "stream-processor", x: 720, y: 420 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "search" },
        { source: "message-queue", target: "stream-processor" },
        { source: "message-queue", target: "object-storage" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Recommendations", "CDN", "Streaming", "ML"],
  },
  {
    id: "message-queue-design",
    title: "Distributed Message Queue (Kafka)",
    difficulty: "Hard",
    description:
      "Design a distributed message queue system like Apache Kafka that provides durable, ordered, and high-throughput message delivery between services. Kafka processes trillions of messages per day at companies like LinkedIn, handling 1M+ messages/second per broker — the core challenges are designing a partitioned commit log that supports parallel consumption, implementing consumer group coordination with partition rebalancing, achieving exactly-once semantics through idempotent producers and transactional writes, and maintaining data durability through in-sync replica (ISR) sets with configurable acknowledgment levels.",
    requirements: {
      readsPerSec: 1000000,
      writesPerSec: 1000000,
      storageGB: 500000,
      latencyMs: 5,
      users: "N/A (infrastructure)",
    },
    constraints: [
      "Partitioned commit log — messages within a partition are strictly ordered and assigned monotonic offsets",
      "Consumer groups with automatic partition assignment — each partition consumed by exactly one consumer in the group",
      "In-Sync Replica (ISR) set — configurable replication factor (typically 3) with leader-based writes and follower replication",
      "Exactly-once semantics via idempotent producers (sequence numbers per partition) and transactional writes across partitions",
      "Log compaction — retain only the latest value per key for changelog/snapshot topics",
      "Configurable retention: time-based (7 days default) or size-based (per partition log segment cleanup)",
    ],
    hints: [
      {
        title: "Partitioned log",
        content:
          "Model each topic as N partitions. Each partition is an append-only log stored on disk. Producers hash the message key to determine the target partition. This enables parallel writes and ordered consumption per partition.",
      },
      {
        title: "Replication for durability",
        content:
          "Each partition has a leader and N-1 follower replicas. Producers write to the leader, followers pull and replicate. The ISR (In-Sync Replica) set tracks which followers are caught up. Configurable acks: 0 (fire-and-forget), 1 (leader only), all (all ISR replicas).",
      },
      {
        title: "Consumer groups",
        content:
          "A consumer group coordinator assigns partitions to consumers. When a consumer joins or leaves, trigger a rebalance. Store consumer offsets in an internal __consumer_offsets topic for durability.",
      },
      {
        title: "Advanced: Zero-copy and page cache",
        content:
          "Kafka achieves high throughput by leveraging the OS page cache for reads (no application-level cache needed) and zero-copy transfers (sendfile syscall) from disk to network socket. Sequential disk writes are faster than random memory access — Kafka's append-only log exploits this for 800MB/s+ write throughput per broker on commodity SSDs.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "load-balancer", x: 100, y: 250 },
        { componentId: "app-server", x: 300, y: 250 },
        { componentId: "nosql-db", x: 500, y: 150 },
        { componentId: "monitoring", x: 500, y: 350 },
        { componentId: "distributed-lock", x: 300, y: 100 },
        { componentId: "service-discovery", x: 300, y: 400 },
      ],
      edges: [
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "distributed-lock" },
        { source: "app-server", target: "service-discovery" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Queue", "Distributed", "Replication", "Streaming"],
  },
  {
    id: "digital-wallet",
    title: "Digital Wallet / UPI",
    difficulty: "Hard",
    description:
      "Design a digital wallet and P2P payment system like Google Pay, PayTM, or UPI (Unified Payments Interface). India's UPI network processes over 16 billion transactions per month across 600+ banks — the core challenges are maintaining strict financial consistency with double-entry bookkeeping, achieving exactly-once transaction execution through idempotency keys (critical when network timeouts cause retries), implementing distributed locks for concurrent balance updates, and meeting regulatory requirements for transaction audit trails, KYC compliance, and settlement reconciliation with banking partners.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 30000,
      storageGB: 10000,
      latencyMs: 200,
      users: "100M DAU",
    },
    constraints: [
      "Exactly-once transaction execution using idempotency keys — retries must return the same result without re-debiting",
      "Double-entry bookkeeping — every transfer creates a debit on sender and credit on receiver that sum to zero",
      "Distributed locks for balance updates — prevent race conditions when concurrent transactions hit the same wallet",
      "KYC (Know Your Customer) compliance with tiered wallet limits based on verification level",
      "Transaction history with complete audit trail — every state transition logged for regulatory reporting",
      "Bank settlement reconciliation — daily batch settlement with partner banks, handling discrepancies automatically",
    ],
    hints: [
      {
        title: "Idempotency first",
        content:
          "Every transaction API call must include an idempotency key. Before executing, check if this key was already processed. Store the key and result atomically with the transaction in the same database transaction.",
      },
      {
        title: "Balance management",
        content:
          "Use a SQL database with SERIALIZABLE isolation for wallet balances. Use SELECT FOR UPDATE or distributed locks to prevent concurrent transactions from creating negative balances.",
      },
      {
        title: "Transaction state machine",
        content:
          "Model each transaction as: initiated → debited → credited → completed (or failed → reversed). Use a message queue for reliable state transitions with compensating transactions on failure.",
      },
      {
        title: "Advanced: Saga with compensation",
        content:
          "For P2P transfers: Step 1: Debit sender's wallet (with distributed lock). Step 2: Credit receiver's wallet. If Step 2 fails, execute compensating action (re-credit sender). Use a message queue to orchestrate saga steps. Store the saga state so it can resume after any failure. This achieves eventual consistency while maintaining financial accuracy.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "auth-service", x: 350, y: 100 },
        { componentId: "rate-limiter", x: 350, y: 420 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 100 },
        { componentId: "distributed-lock", x: 530, y: 420 },
        { componentId: "message-queue", x: 720, y: 420 },
        { componentId: "sql-db", x: 720, y: 200 },
        { componentId: "nosql-db", x: 720, y: 100 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "auth-service" },
        { source: "api-gateway", target: "rate-limiter" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "distributed-lock" },
        { source: "app-server", target: "sql-db" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["ACID", "Idempotent", "Ledger", "Payments"],
  },
  {
    id: "code-editor",
    title: "Online Code Editor",
    difficulty: "Medium",
    description:
      "Design an online code editor and execution platform like Replit, CodeSandbox, or VS Code for the Web. The system supports real-time collaborative editing, sandboxed code execution in 50+ programming languages, and a virtual file system per project. Replit serves 20+ million developers — the core challenges are implementing real-time collaboration with conflict resolution (OT/CRDT) across multiple cursors, securely sandboxing user code execution in isolated containers with resource limits (CPU, memory, network), and providing Language Server Protocol (LSP) features (autocomplete, go-to-definition, error diagnostics) with low latency.",
    requirements: {
      readsPerSec: 30000,
      writesPerSec: 20000,
      storageGB: 50000,
      latencyMs: 100,
      users: "10M DAU",
    },
    constraints: [
      "Real-time collaborative editing using OT or CRDT with multi-cursor support and conflict resolution",
      "Sandboxed code execution in isolated containers (gVisor/Firecracker) with CPU, memory, and network resource limits",
      "Language Server Protocol (LSP) integration for autocomplete, diagnostics, go-to-definition across 50+ languages",
      "Virtual file system per project with version history and git integration",
      "Terminal emulation with PTY (pseudo-terminal) forwarding over WebSocket",
      "Instant project boot — sub-5-second cold start using pre-warmed container pools and filesystem snapshots",
    ],
    hints: [
      {
        title: "Collaboration layer",
        content:
          "Use a WebSocket server for real-time sync. Implement OT (Operational Transformation) or CRDT for conflict-free concurrent edits. Broadcast cursor positions and selections to all collaborators.",
      },
      {
        title: "Sandboxed execution",
        content:
          "Run user code in lightweight VMs (Firecracker) or sandboxed containers (gVisor). Pre-warm a pool of containers per language to minimize cold-start latency. Enforce strict resource limits and network isolation.",
      },
      {
        title: "File system design",
        content:
          "Use object storage for persistent project files with a NoSQL metadata database. Cache active project files in memory on the execution container for fast reads. Sync changes back to object storage on save.",
      },
      {
        title: "Advanced: Snapshot and restore",
        content:
          "Use filesystem snapshots (overlayfs) to create instant project forks. Pre-build base images for each language with common dependencies pre-installed. On project open, layer the user's files on top of the base image using an overlay filesystem — this gives sub-second project boot times instead of installing dependencies from scratch.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 50, y: 250 },
        { componentId: "cdn", x: 200, y: 80 },
        { componentId: "load-balancer", x: 200, y: 250 },
        { componentId: "api-gateway", x: 350, y: 250 },
        { componentId: "websocket-server", x: 350, y: 420 },
        { componentId: "app-server", x: 530, y: 250 },
        { componentId: "cache", x: 530, y: 80 },
        { componentId: "message-queue", x: 530, y: 420 },
        { componentId: "nosql-db", x: 720, y: 250 },
        { componentId: "object-storage", x: 720, y: 80 },
        { componentId: "monitoring", x: 880, y: 250 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "load-balancer", target: "websocket-server" },
        { source: "api-gateway", target: "app-server" },
        { source: "websocket-server", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "object-storage" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Collaboration", "Sandbox", "WebSocket", "LSP"],
  },
  {
    id: "cicd-pipeline",
    title: "CI/CD Pipeline",
    difficulty: "Medium",
    description:
      "Design a continuous integration and continuous deployment platform like GitHub Actions, GitLab CI, or Jenkins. The system orchestrates build pipelines triggered by code commits, runs tests in parallel across isolated environments, stores build artifacts, and deploys to production using strategies like blue-green or canary. GitHub Actions processes millions of workflow runs daily — the core challenges are efficiently scheduling and executing build jobs across a fleet of heterogeneous runners, managing artifact storage and caching for fast builds, and implementing reliable deployment orchestration with automatic rollback on failure detection.",
    requirements: {
      readsPerSec: 20000,
      writesPerSec: 10000,
      storageGB: 200000,
      latencyMs: 500,
      users: "5M DAU",
    },
    constraints: [
      "Pipeline orchestration: define workflows as DAGs (directed acyclic graphs) of jobs with dependency edges",
      "Parallel test execution across isolated runners — scale runner fleet dynamically based on queue depth",
      "Build caching: cache dependencies (node_modules, Maven repo) and Docker layers across runs for 3-10x speedup",
      "Artifact storage with retention policies — store build outputs, test reports, and coverage data",
      "Deployment strategies: blue-green (instant switch), canary (gradual rollout with health checks), rolling update",
      "Automatic rollback on deployment failure — detect health check failures and revert to the previous known-good version",
    ],
    hints: [
      {
        title: "Job scheduling",
        content:
          "Use a message queue with priority lanes for different job types. A scheduler service parses the workflow DAG, resolves dependencies, and enqueues jobs as their dependencies complete.",
      },
      {
        title: "Runner management",
        content:
          "Runners pull jobs from the queue, execute in isolated containers, and report results. Use auto-scaling (scale runners based on queue depth) with a minimum warm pool to avoid cold-start delays.",
      },
      {
        title: "Build caching",
        content:
          "Cache dependencies in object storage keyed by lock-file hash. On each build, check if a cache exists for the current dependency set. This can reduce build times by 3-10x for dependency-heavy projects.",
      },
      {
        title: "Advanced: Canary deployments",
        content:
          "Deploy the new version to 5% of traffic (canary). Monitor error rates, latency p99, and custom health metrics for 10 minutes. If metrics stay within thresholds, gradually increase to 25% → 50% → 100%. If any metric degrades, automatically roll back to the previous version and notify the team. Store deployment state in a SQL database for auditability.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "load-balancer", x: 100, y: 250 },
        { componentId: "api-gateway", x: 250, y: 250 },
        { componentId: "app-server", x: 420, y: 250 },
        { componentId: "cache", x: 420, y: 80 },
        { componentId: "message-queue", x: 420, y: 420 },
        { componentId: "sql-db", x: 620, y: 250 },
        { componentId: "object-storage", x: 620, y: 80 },
        { componentId: "task-scheduler", x: 620, y: 420 },
        { componentId: "monitoring", x: 820, y: 250 },
      ],
      edges: [
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "sql-db" },
        { source: "message-queue", target: "task-scheduler" },
        { source: "task-scheduler", target: "object-storage" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Pipeline", "Deployment", "Orchestration", "Caching"],
  },
  {
    id: "id-generator-service",
    title: "Distributed Unique ID Generator",
    difficulty: "Easy",
    description:
      "Design a service that generates unique, roughly time-ordered 64-bit IDs across many machines — the kind of system Twitter built with Snowflake. Every order, message, and event in a large system needs a unique identifier, and a single database auto-increment column can't keep up or survive a failover cleanly. The challenge is producing billions of collision-free IDs per day from independent nodes with no coordination on the hot path, while keeping them sortable by creation time.",
    requirements: {
      readsPerSec: 0,
      writesPerSec: 1000000,
      storageGB: 1,
      latencyMs: 10,
      users: "Internal platform service",
    },
    constraints: [
      "IDs must be globally unique with zero collisions, even across data centers",
      "IDs should be roughly sortable by creation time (k-sorted) for efficient indexing",
      "Generation must be fast (< 1ms) and not require a network call per ID",
      "The service must keep working if the coordination service is briefly unavailable",
      "Handle clock skew and NTP clock-rewind without producing duplicate IDs",
      "Fit in 64 bits so IDs stay compact as database keys and in URLs",
    ],
    hints: [
      {
        title: "Why not a database sequence?",
        content:
          "A single auto-increment is a bottleneck and a single point of failure. UUIDv4 is unique but random — it's 128 bits and destroys index locality. The goal is unique AND time-sortable AND compact.",
      },
      {
        title: "The Snowflake layout",
        content:
          "Pack a 64-bit integer as: timestamp (41 bits, ms since a custom epoch) + machine/worker ID (10 bits) + per-ms sequence counter (12 bits). Each node generates locally with no coordination per request.",
      },
      {
        title: "Assigning worker IDs",
        content:
          "Each node needs a unique worker ID at startup. Use a coordination service (ZooKeeper/etcd) to hand out and lease worker IDs so two nodes never share one.",
      },
      {
        title: "Advanced: Clock safety",
        content:
          "If the wall clock moves backwards (NTP correction), refuse to issue IDs until time catches up, or borrow from the sequence bits. Monitor clock drift across nodes and alert before it causes problems.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 100, y: 280 },
        { componentId: "load-balancer", x: 300, y: 280 },
        { componentId: "id-generator", x: 520, y: 280 },
        { componentId: "coordination-service", x: 760, y: 150 },
        { componentId: "config-service", x: 760, y: 280 },
        { componentId: "monitoring", x: 760, y: 410 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "id-generator" },
        { source: "id-generator", target: "coordination-service" },
        { source: "id-generator", target: "config-service" },
        { source: "id-generator", target: "monitoring" },
      ],
    },
    tags: ["Hashing", "Coordination", "Write-Heavy", "Distributed"],
  },
  {
    id: "leaderboard",
    title: "Gaming Leaderboard",
    difficulty: "Medium",
    description:
      "Design a real-time leaderboard for a game with tens of millions of players, like the ranking systems behind mobile games or competitive ladders. Players' scores change constantly, and the system must answer two questions fast: 'what is the global top 100?' and 'what is my rank and the players right around me?'. The hard part is computing a player's rank cheaply when scores update thousands of times per second — a naive COUNT query over millions of rows is far too slow.",
    requirements: {
      readsPerSec: 500000,
      writesPerSec: 100000,
      storageGB: 200,
      latencyMs: 100,
      users: "50M players",
    },
    constraints: [
      "Return the global top-N and a player's rank in < 100ms",
      "Support 'rank window' queries — the N players just above and below a given player",
      "Scores update in real time; a player's rank should reflect updates within seconds",
      "Handle write bursts during peak play and tournament finishes",
      "Support multiple leaderboards (daily, weekly, all-time, per-region)",
      "Durable scores — a cache restart must not lose player progress",
    ],
    hints: [
      {
        title: "The right data structure",
        content:
          "A Redis Sorted Set (ZSET) keeps members ordered by score and gives O(log N) rank and range queries. ZADD to update a score, ZREVRANK for rank, ZREVRANGE for top-N — this is the core of the design.",
      },
      {
        title: "Decouple writes",
        content:
          "Funnel score updates through a queue so write bursts don't overwhelm the store. A stream processor applies them to the sorted set and persists them durably.",
      },
      {
        title: "Durability behind the cache",
        content:
          "The sorted set is the fast serving layer, but persist authoritative scores in a database. You can rebuild the leaderboard from the DB if the cache is lost.",
      },
      {
        title: "Advanced: Sharding huge boards",
        content:
          "For hundreds of millions of entries, shard the sorted set by score range across nodes and merge results, or keep approximate ranks using bucketed counters for the long tail where exact rank doesn't matter.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 100, y: 280 },
        { componentId: "load-balancer", x: 300, y: 280 },
        { componentId: "app-server", x: 500, y: 280 },
        { componentId: "cache", x: 500, y: 130 },
        { componentId: "monitoring", x: 720, y: 130 },
        { componentId: "message-queue", x: 500, y: 430 },
        { componentId: "stream-processor", x: 720, y: 430 },
        { componentId: "nosql-db", x: 940, y: 360 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "message-queue" },
        { source: "app-server", target: "monitoring" },
        { source: "message-queue", target: "stream-processor" },
        { source: "stream-processor", target: "cache" },
        { source: "stream-processor", target: "nosql-db" },
      ],
    },
    tags: ["Caching", "Ranking", "Real-Time", "Write-Heavy"],
    alternatives: [
      { name: "Redis sorted set", note: "ZADD/ZREVRANK give top-N and a player's rank in O(log n) from memory. Simplest and fastest; shard by game when it outgrows one node." },
      { name: "Bucketed approximate ranks", note: "Group scores into buckets and track per-bucket counts for percentile-style ranks at huge scale — approximate, but cheap and horizontally scalable." },
    ],
  },
  {
    id: "job-scheduler",
    title: "Distributed Job Scheduler",
    difficulty: "Medium",
    description:
      "Design a system that runs millions of scheduled and recurring jobs reliably — think cron at scale, or the backend that fires 'your subscription renews tomorrow' emails and nightly report builds. Users submit jobs to run once at a future time or on a repeating schedule, and the system must execute each one close to its due time, exactly once, even as worker machines crash and restart. The interesting tension is between not missing a job, not running it twice, and scaling the dispatcher without it becoming a single point of failure.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 50000,
      storageGB: 5000,
      latencyMs: 1000,
      users: "10M jobs/day",
    },
    constraints: [
      "Jobs must run close to their scheduled time (within a few seconds)",
      "At-least-once execution by default, with idempotency keys to make effects exactly-once",
      "Support one-off jobs, recurring (cron) schedules, and delayed retries with backoff",
      "Survive worker crashes — an in-flight job must be picked up by another worker",
      "The dispatcher must scale horizontally without double-dispatching a job",
      "Query job status and history; cancel or reschedule pending jobs",
    ],
    hints: [
      {
        title: "Store jobs by due time",
        content:
          "Persist jobs in a database indexed on next_run_at. The scheduler repeatedly queries 'jobs due in the next window' rather than scanning everything.",
      },
      {
        title: "Don't dispatch twice",
        content:
          "Use a coordination service for leader election (or per-shard locks) so only one scheduler instance claims a given time bucket. Claim jobs with an atomic compare-and-set on their status.",
      },
      {
        title: "Decouple dispatch from execution",
        content:
          "The scheduler only enqueues due jobs into a message queue. A separate pool of stateless workers consumes the queue and runs the work, so you scale execution independently.",
      },
      {
        title: "Advanced: Visibility timeouts and retries",
        content:
          "When a worker picks up a job, give it a visibility timeout. If it doesn't ack before the timeout (it crashed), the job becomes visible again for another worker. Use exponential backoff and a dead-letter queue for repeatedly failing jobs.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 80, y: 280 },
        { componentId: "api-gateway", x: 280, y: 280 },
        { componentId: "nosql-db", x: 280, y: 430 },
        { componentId: "task-scheduler", x: 500, y: 280 },
        { componentId: "coordination-service", x: 500, y: 130 },
        { componentId: "message-queue", x: 720, y: 280 },
        { componentId: "app-server", x: 940, y: 280 },
        { componentId: "monitoring", x: 940, y: 130 },
      ],
      edges: [
        { source: "dns", target: "api-gateway" },
        { source: "api-gateway", target: "nosql-db" },
        { source: "task-scheduler", target: "nosql-db" },
        { source: "task-scheduler", target: "coordination-service" },
        { source: "task-scheduler", target: "message-queue" },
        { source: "message-queue", target: "app-server" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Scheduling", "Queues", "Coordination", "Reliability"],
  },
  {
    id: "ad-click-aggregator",
    title: "Ad Click Aggregator",
    difficulty: "Hard",
    description:
      "Design the analytics backend that counts ad clicks for an advertising platform handling billions of events a day. Advertisers need near-real-time dashboards ('how is my campaign doing right now?') and, separately, billing-grade accurate totals. Clicks arrive in enormous, bursty volume and some are duplicates or fraudulent. The core design decision is the classic lambda architecture: a fast streaming path for approximate live counts and a slower batch path that reprocesses raw events for correctness.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 1000000,
      storageGB: 100000,
      latencyMs: 1000,
      users: "10B clicks/day",
    },
    constraints: [
      "Ingest 1M+ click events/sec with bursts, without dropping events",
      "Real-time dashboards updated within seconds (approximate is acceptable)",
      "Billing-accurate aggregates computed by a reconciling batch job",
      "Deduplicate clicks and filter fraud (same user spamming a click)",
      "Aggregate along many dimensions: campaign, ad, region, device, time bucket",
      "Raw events retained for replay and recomputation if logic changes",
    ],
    hints: [
      {
        title: "Capture first, process later",
        content:
          "The ingestion service should do almost nothing but validate and write each click to a durable, partitioned log (Kafka). This absorbs bursts and decouples producers from consumers.",
      },
      {
        title: "Two paths from one log",
        content:
          "Speed layer: a stream processor reads the log and maintains rolling counts in a fast store for live dashboards. Batch layer: the same events land in object storage and a periodic job recomputes exact totals.",
      },
      {
        title: "Idempotent counting",
        content:
          "Network retries mean the same click can arrive twice. Attach a unique click ID and dedupe in the stream processor (e.g., a windowed set) so you don't double-count.",
      },
      {
        title: "Advanced: Reconciliation",
        content:
          "The batch layer's accurate aggregates overwrite the speed layer's approximate numbers for closed time windows. Serve 'recent = streaming, historical = batch' so dashboards are both fresh and eventually correct.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 80, y: 300 },
        { componentId: "load-balancer", x: 280, y: 300 },
        { componentId: "app-server", x: 480, y: 300 },
        { componentId: "monitoring", x: 480, y: 150 },
        { componentId: "message-queue", x: 480, y: 450 },
        { componentId: "stream-processor", x: 700, y: 450 },
        { componentId: "object-storage", x: 700, y: 150 },
        { componentId: "data-warehouse", x: 920, y: 150 },
        { componentId: "nosql-db", x: 920, y: 380 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "monitoring" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "stream-processor" },
        { source: "stream-processor", target: "nosql-db" },
        { source: "message-queue", target: "object-storage" },
        { source: "object-storage", target: "data-warehouse" },
        { source: "data-warehouse", target: "nosql-db" },
      ],
    },
    tags: ["Stream Processing", "Analytics", "Write-Heavy", "Big Data"],
  },
  {
    id: "key-value-store",
    title: "Distributed Key-Value Store",
    difficulty: "Hard",
    description:
      "Design a distributed key-value store that is highly available and horizontally scalable, in the spirit of Amazon Dynamo and Cassandra. It should stay writable even during network partitions and node failures, scale by simply adding machines, and spread data evenly with no hot spots. This problem is the canonical lens for the deepest distributed-systems trade-offs: consistent hashing for partitioning, replication with tunable quorums, and choosing availability over strong consistency.",
    requirements: {
      readsPerSec: 1000000,
      writesPerSec: 500000,
      storageGB: 100000,
      latencyMs: 10,
      users: "Multi-tenant platform",
    },
    constraints: [
      "Single-digit-millisecond reads and writes at p99",
      "Stay available for writes during node failures and network partitions (AP)",
      "Scale linearly — adding nodes rebalances data with minimal movement",
      "Even key distribution; no single node becomes a hot spot",
      "Tunable consistency via quorum (configurable N replicas, R reads, W writes)",
      "No single point of failure; decentralized membership and failure detection",
    ],
    hints: [
      {
        title: "Partition with consistent hashing",
        content:
          "Place nodes on a hash ring and route each key to the node clockwise from its hash. Adding/removing a node only moves the keys in its neighboring arc. Use virtual nodes to keep the load even.",
      },
      {
        title: "Replicate for durability",
        content:
          "Store each key on the next N nodes around the ring. A coordinator node handles the request and talks to the replicas — there's no special master.",
      },
      {
        title: "Quorum reads and writes",
        content:
          "With N replicas, require W acks to write and R responses to read. If R + W > N you get read-your-writes consistency; lowering them trades consistency for availability and latency.",
      },
      {
        title: "Advanced: Membership and anti-entropy",
        content:
          "Nodes learn the ring via a gossip protocol and detect failures without a central coordinator. Use hinted handoff so writes survive a temporarily-down replica, and Merkle trees to repair divergent replicas in the background.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 100, y: 280 },
        { componentId: "load-balancer", x: 300, y: 280 },
        { componentId: "app-server", x: 520, y: 280 },
        { componentId: "coordination-service", x: 520, y: 130 },
        { componentId: "config-service", x: 520, y: 430 },
        { componentId: "cache", x: 760, y: 130 },
        { componentId: "nosql-db", x: 760, y: 280 },
        { componentId: "monitoring", x: 760, y: 430 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "coordination-service" },
        { source: "app-server", target: "config-service" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Consistent Hashing", "Replication", "Quorum", "Distributed"],
    alternatives: [
      { name: "Leaderless + quorums (Dynamo)", note: "Any replica takes reads/writes; tune R+W vs N for consistency. Highly available, but you handle conflicts (vector clocks / read-repair)." },
      { name: "Leader-based per shard (Raft)", note: "Each shard has a leader that orders writes via consensus. Strong consistency and simpler reasoning, at some availability/latency cost on leader loss." },
    ],
  },
  {
    id: "pastebin",
    title: "Pastebin",
    difficulty: "Easy",
    description:
      "Design a service like Pastebin where users paste a block of text or code and get a short link others can open to read it. It's a close cousin of a URL shortener, but instead of storing a tiny URL you store an arbitrary chunk of content, so the key design question becomes where that content lives. Like most link-based services it's heavily read-biased — a paste is written once and read many times — and entries usually expire after a set time.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 1000,
      storageGB: 1000,
      latencyMs: 200,
      users: "10M DAU",
    },
    constraints: [
      "Each paste gets a unique, hard-to-guess short key (base62)",
      "Reads vastly outnumber writes — optimize the read path",
      "Pastes can expire after a TTL or be set to never expire",
      "Support large pastes (up to a few MB) without bloating the metadata store",
      "Optional privacy: unlisted pastes reachable only by direct link",
      "Basic abuse protection — rate limit creation and cap paste size",
    ],
    hints: [
      {
        title: "Split content from metadata",
        content:
          "Keep small metadata (key, created time, expiry, owner) in a fast database, but store the actual paste body in object storage. The DB row just points to the blob.",
      },
      {
        title: "Lean on caching",
        content:
          "Popular pastes are read repeatedly. A cache in front of storage absorbs most reads and keeps latency low.",
      },
      {
        title: "Generate keys like a URL shortener",
        content:
          "Use base62 over a counter or hash to mint short, unique keys. The same collision-avoidance ideas as a URL shortener apply here.",
      },
      {
        title: "Advanced: Expiry cleanup",
        content:
          "Use a TTL on the metadata and a background job to delete expired blobs from object storage, so storage doesn't grow forever.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 100, y: 280 },
        { componentId: "load-balancer", x: 300, y: 280 },
        { componentId: "app-server", x: 500, y: 280 },
        { componentId: "cache", x: 500, y: 130 },
        { componentId: "object-storage", x: 720, y: 130 },
        { componentId: "nosql-db", x: 720, y: 280 },
        { componentId: "monitoring", x: 720, y: 430 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "object-storage" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Storage", "Caching", "Read-Heavy"],
  },
  {
    id: "image-hosting",
    title: "Image Hosting Service",
    difficulty: "Easy",
    description:
      "Design a simple image hosting service like a basic Imgur: users upload images and get links that load fast anywhere in the world. This is the gentle introduction to the media-serving pattern that powers Instagram, e-commerce product photos, and avatars everywhere. The two core ideas are storing large binary files in object storage rather than a database, and serving them through a CDN so bytes come from a server near the viewer.",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 2000,
      storageGB: 50000,
      latencyMs: 150,
      users: "50M DAU",
    },
    constraints: [
      "Store and serve images up to ~20MB each",
      "Image loads should be fast worldwide (serve via CDN edge)",
      "Reads massively outnumber uploads",
      "Generate resized thumbnails for previews",
      "Each image has a stable, shareable URL",
      "Validate uploads (type, size) and rate limit to prevent abuse",
    ],
    hints: [
      {
        title: "Don't put blobs in the database",
        content:
          "Store image bytes in object storage and keep only metadata (id, owner, size, URL) in the database. Databases are bad at large binary blobs.",
      },
      {
        title: "Serve through a CDN",
        content:
          "Put a CDN in front of object storage so images are cached at edge locations close to users. The origin only sees cache misses.",
      },
      {
        title: "Generate thumbnails asynchronously",
        content:
          "After upload, create resized versions so feeds and previews load small images instead of the full-resolution original.",
      },
      {
        title: "Advanced: Direct-to-storage uploads",
        content:
          "Issue pre-signed URLs so clients upload straight to object storage, bypassing your app servers for the heavy byte transfer.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 100, y: 280 },
        { componentId: "cdn", x: 300, y: 130 },
        { componentId: "load-balancer", x: 300, y: 280 },
        { componentId: "app-server", x: 520, y: 280 },
        { componentId: "cache", x: 520, y: 430 },
        { componentId: "object-storage", x: 740, y: 130 },
        { componentId: "nosql-db", x: 740, y: 280 },
        { componentId: "monitoring", x: 740, y: 430 },
      ],
      edges: [
        { source: "dns", target: "cdn" },
        { source: "dns", target: "load-balancer" },
        { source: "cdn", target: "object-storage" },
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "object-storage" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Storage", "CDN", "Media", "Read-Heavy"],
  },
  {
    id: "view-counter",
    title: "View / Like Counter",
    difficulty: "Easy",
    description:
      "Design the service that counts how many views a video got or how many likes a post has, across a system with billions of events a day. It looks trivial — just increment a number — but a single hot row (a viral video) can receive tens of thousands of increments per second, far more than one database row can handle. This is a clean introduction to write-heavy design, sharded counters, and accepting eventual consistency for numbers that don't need to be exact to the millisecond.",
    requirements: {
      readsPerSec: 200000,
      writesPerSec: 500000,
      storageGB: 500,
      latencyMs: 100,
      users: "1B events/day",
    },
    constraints: [
      "Handle huge write bursts on a single hot item (viral content)",
      "Counts can be eventually consistent — a small display lag is fine",
      "Reads of the current count must be fast and cheap",
      "Never lose increments (durably persist counts)",
      "Avoid double-counting from client retries where it matters",
      "Support counting many item types (views, likes, shares)",
    ],
    hints: [
      {
        title: "One row can't take the load",
        content:
          "A single counter row becomes a write hot spot. Split it into many shard counters and sum them on read — this spreads writes across the store.",
      },
      {
        title: "Buffer the writes",
        content:
          "Send increments through a queue and aggregate them, so a burst becomes a steady stream of batched updates instead of hammering the database.",
      },
      {
        title: "Cache the read value",
        content:
          "Most reads just want the current total. Serve it from a cache that's refreshed periodically rather than recomputing the sum every time.",
      },
      {
        title: "Advanced: Approximate at extreme scale",
        content:
          "For counts where exactness doesn't matter (e.g. 'seen by ~2.3M'), probabilistic structures like HyperLogLog give huge memory savings for unique counts.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 100, y: 280 },
        { componentId: "load-balancer", x: 300, y: 280 },
        { componentId: "app-server", x: 500, y: 280 },
        { componentId: "sharded-counter", x: 500, y: 130 },
        { componentId: "message-queue", x: 500, y: 430 },
        { componentId: "cache", x: 720, y: 130 },
        { componentId: "nosql-db", x: 720, y: 280 },
        { componentId: "monitoring", x: 720, y: 430 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "sharded-counter" },
        { source: "sharded-counter", target: "nosql-db" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["Write-Heavy", "Counters", "Eventual Consistency"],
  },
  {
    id: "todo-app",
    title: "To-Do / Notes App",
    difficulty: "Easy",
    description:
      "Design the backend for a personal notes or to-do app like Google Keep or Todoist, where signed-in users create, edit, and organize their own items. It's the most approachable full-stack system design: the perfect first problem for seeing how the standard web stack fits together — load balancing, stateless app servers, authentication, a database for per-user data, and a cache for speed. The scale is modest, so the focus is correct structure and a clean read/write path rather than exotic distributed tricks.",
    requirements: {
      readsPerSec: 20000,
      writesPerSec: 5000,
      storageGB: 200,
      latencyMs: 200,
      users: "5M DAU",
    },
    constraints: [
      "Each user sees and edits only their own notes (authentication + authorization)",
      "Standard CRUD: create, read, update, delete, list with simple filters",
      "Edits should feel instant; recent notes load quickly",
      "Data must be durable — a user's notes are never silently lost",
      "Stateless app servers so any instance can serve any request",
      "Reasonable scaling as the user base grows (read replicas, caching)",
    ],
    hints: [
      {
        title: "The classic stateless stack",
        content:
          "Clients → load balancer → stateless app servers → database. Keeping app servers stateless lets you add or remove them freely behind the load balancer.",
      },
      {
        title: "Authenticate every request",
        content:
          "An auth service verifies the user (e.g. a token) so each request only touches that user's data. Sessions/tokens, not server memory, carry identity.",
      },
      {
        title: "A relational DB fits well",
        content:
          "Notes have clear structure and per-user ownership — a SQL database with an index on user_id handles this naturally. Add read replicas as reads grow.",
      },
      {
        title: "Advanced: Cache and offline sync",
        content:
          "Cache a user's recent notes for snappy loads, and add a sync protocol (last-write-wins or per-field merge) if you later support offline edits across devices.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "dns", x: 100, y: 280 },
        { componentId: "load-balancer", x: 300, y: 280 },
        { componentId: "app-server", x: 500, y: 280 },
        { componentId: "auth-service", x: 500, y: 130 },
        { componentId: "cache", x: 720, y: 130 },
        { componentId: "sql-db", x: 720, y: 280 },
        { componentId: "monitoring", x: 720, y: 430 },
      ],
      edges: [
        { source: "dns", target: "load-balancer" },
        { source: "load-balancer", target: "app-server" },
        { source: "app-server", target: "auth-service" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "sql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["CRUD", "Authentication", "Fundamentals"],
  },
  {
    id: "rag-assistant",
    title: "RAG Knowledge Assistant",
    difficulty: "Medium",
    description:
      "Design a Retrieval-Augmented Generation (RAG) assistant that answers questions over a company's private documents — the pattern behind tools like Glean, Notion AI, and 'chat with your docs'. The model itself doesn't know your data, so the system retrieves the most relevant chunks from a knowledge base and feeds them to the LLM as context. The core design splits into an offline ingestion pipeline (chunk → embed → index) and an online query path (embed question → retrieve → generate), with grounding and citations to reduce hallucinations.",
    requirements: {
      readsPerSec: 5000,
      writesPerSec: 200,
      storageGB: 2000,
      latencyMs: 3000,
      users: "100k enterprise users",
    },
    constraints: [
      "Answers must be grounded in retrieved documents, with citations",
      "Respect per-user document permissions (don't leak restricted content)",
      "Keep end-to-end latency acceptable despite slow LLM generation (stream tokens)",
      "Re-index documents as they change (near-real-time freshness)",
      "Control cost — LLM and embedding calls are the dominant expense",
      "Reduce hallucinations; say 'I don't know' when retrieval finds nothing relevant",
    ],
    hints: [
      {
        title: "Two pipelines, not one",
        content:
          "Offline: chunk documents, create embeddings, and upsert them into a vector database. Online: embed the user's question, retrieve the top-k similar chunks, and pass them to the LLM. Keep these separate.",
      },
      {
        title: "Retrieval quality is everything",
        content:
          "The answer is only as good as the retrieved context. Tune chunk size/overlap, use hybrid search (keyword + vector), and re-rank the top results before sending them to the LLM.",
      },
      {
        title: "Cache and stream",
        content:
          "Cache embeddings and frequent answers (semantic cache). Stream the LLM's tokens to the client so it feels fast even though generation takes seconds.",
      },
      {
        title: "Advanced: Permissions and grounding",
        content:
          "Filter retrieval by the user's access scope so they only see chunks they're allowed to. Require citations and add a guardrail that refuses to answer when retrieval confidence is low.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "client", x: 60, y: 300 },
        { componentId: "api-gateway", x: 250, y: 300 },
        { componentId: "guardrails", x: 250, y: 160 },
        { componentId: "app-server", x: 450, y: 300 },
        { componentId: "cache", x: 450, y: 160 },
        { componentId: "embedding-model", x: 660, y: 200 },
        { componentId: "vector-db", x: 870, y: 200 },
        { componentId: "llm", x: 660, y: 360 },
        { componentId: "object-storage", x: 250, y: 470 },
        { componentId: "worker", x: 450, y: 470 },
        { componentId: "monitoring", x: 870, y: 360 },
      ],
      edges: [
        { source: "client", target: "api-gateway" },
        { source: "api-gateway", target: "guardrails" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "embedding-model" },
        { source: "embedding-model", target: "vector-db" },
        { source: "app-server", target: "llm" },
        { source: "object-storage", target: "worker" },
        { source: "worker", target: "embedding-model" },
        { source: "worker", target: "vector-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["AI", "RAG", "Vector Search", "LLM"],
  },
  {
    id: "ai-agent-platform",
    title: "AI Agent Platform (Tools & MCP)",
    difficulty: "Hard",
    description:
      "Design an autonomous AI agent platform that plans multi-step tasks, calls external tools, uses memory, and can execute code — the architecture behind agentic assistants and coding agents. Unlike a single LLM call, an agent runs a loop: the model decides the next action, a tool runs, the result is fed back, and it repeats until done. Tools are exposed through the Model Context Protocol (MCP) so the agent can connect to many data sources and services through one standard interface, with sandboxing and guardrails for safety.",
    requirements: {
      readsPerSec: 2000,
      writesPerSec: 1000,
      storageGB: 5000,
      latencyMs: 30000,
      users: "Long-running agent tasks",
    },
    constraints: [
      "Run a plan → act → observe loop reliably, with a step/iteration cap",
      "Connect to many tools via MCP (search, databases, APIs, file systems)",
      "Persist run state so a task can resume after a crash and be audited",
      "Short-term (working) memory plus long-term memory via retrieval",
      "Execute model-generated code in an isolated sandbox (no host access)",
      "Guardrails: approve risky actions, prevent prompt-injection and data exfiltration",
    ],
    hints: [
      {
        title: "The agent loop",
        content:
          "An orchestrator drives the loop: send the state to the LLM, get the next action (a tool call or 'finish'), execute it, append the observation, repeat. Cap iterations to avoid runaway loops.",
      },
      {
        title: "Tools via MCP",
        content:
          "Expose tools/data through MCP servers so the agent talks to all of them through one protocol. Each MCP server wraps a capability (web search, SQL, internal API) with a typed schema.",
      },
      {
        title: "Memory: short and long",
        content:
          "Keep working memory (current task context) in a fast store, and long-term memory as embeddings in a vector DB the agent can retrieve from. Persist the run/step log durably.",
      },
      {
        title: "Advanced: Safety and isolation",
        content:
          "Run generated code in a sandbox (container/VM, no network or scoped network). Add a guardrail/approval step before destructive or external actions, and detect prompt-injection from tool outputs.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "client", x: 60, y: 300 },
        { componentId: "api-gateway", x: 250, y: 300 },
        { componentId: "agent-orchestrator", x: 460, y: 300 },
        { componentId: "llm", x: 460, y: 150 },
        { componentId: "mcp-server", x: 690, y: 150 },
        { componentId: "vector-db", x: 690, y: 300 },
        { componentId: "cache", x: 460, y: 450 },
        { componentId: "worker", x: 690, y: 450 },
        { componentId: "nosql-db", x: 900, y: 300 },
        { componentId: "guardrails", x: 250, y: 160 },
        { componentId: "monitoring", x: 900, y: 150 },
      ],
      edges: [
        { source: "client", target: "api-gateway" },
        { source: "api-gateway", target: "guardrails" },
        { source: "api-gateway", target: "agent-orchestrator" },
        { source: "agent-orchestrator", target: "llm" },
        { source: "agent-orchestrator", target: "mcp-server" },
        { source: "agent-orchestrator", target: "vector-db" },
        { source: "agent-orchestrator", target: "cache" },
        { source: "agent-orchestrator", target: "worker" },
        { source: "agent-orchestrator", target: "nosql-db" },
        { source: "agent-orchestrator", target: "monitoring" },
      ],
    },
    tags: ["AI", "Agents", "MCP", "Tools", "LLM"],
  },
  {
    id: "llm-chatbot",
    title: "LLM Chatbot at Scale",
    difficulty: "Hard",
    description:
      "Design a conversational AI application like ChatGPT or Claude.ai serving millions of users, with streaming responses and persistent conversation history. The defining challenges are serving slow, expensive LLM inference at scale (GPUs, batching, token streaming), managing the growing context of a conversation within the model's window, and keeping responses safe. It's a read/compute-heavy system where the model is the bottleneck and the dominant cost.",
    requirements: {
      readsPerSec: 50000,
      writesPerSec: 50000,
      storageGB: 20000,
      latencyMs: 2000,
      users: "10M DAU",
    },
    constraints: [
      "Stream tokens to the user (time-to-first-token matters more than total time)",
      "Persist and reload conversation history per user",
      "Fit history into the model's context window (truncate/summarize older turns)",
      "Moderate inputs and outputs for safety",
      "Rate limit and meter usage per user/tier; the LLM is the costliest resource",
      "Gracefully handle inference overload (queue, shed, or fall back to a smaller model)",
    ],
    hints: [
      {
        title: "Streaming, not request/response",
        content:
          "Use a streaming transport (SSE/WebSocket) so tokens appear as they're generated. Optimize time-to-first-token; users tolerate a long total response if it starts immediately.",
      },
      {
        title: "Manage the context window",
        content:
          "A conversation grows unbounded but the model's context is fixed. Keep recent turns verbatim and summarize or drop older ones; store the full history separately for reload.",
      },
      {
        title: "Serve inference efficiently",
        content:
          "GPU inference is the bottleneck. Batch concurrent requests, reuse the KV cache, and autoscale GPU workers by queue depth. Route simple queries to smaller/cheaper models.",
      },
      {
        title: "Advanced: Cost, safety, and overload",
        content:
          "Cache common prompts/answers, meter tokens per user, run moderation on both input and output, and under overload queue requests or fall back to a smaller model instead of failing.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "client", x: 60, y: 320 },
        { componentId: "load-balancer", x: 240, y: 320 },
        { componentId: "api-gateway", x: 430, y: 320 },
        { componentId: "rate-limiter", x: 430, y: 180 },
        { componentId: "guardrails", x: 630, y: 180 },
        { componentId: "app-server", x: 630, y: 320 },
        { componentId: "model-server", x: 840, y: 250 },
        { componentId: "cache", x: 630, y: 460 },
        { componentId: "nosql-db", x: 840, y: 400 },
        { componentId: "monitoring", x: 1030, y: 320 },
      ],
      edges: [
        { source: "client", target: "load-balancer" },
        { source: "load-balancer", target: "api-gateway" },
        { source: "api-gateway", target: "rate-limiter" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "guardrails" },
        { source: "app-server", target: "model-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["AI", "LLM", "Streaming", "Inference"],
    alternatives: [
      { name: "Self-hosted GPU inference", note: "Run your own model servers with batching + KV cache. Full control and lower marginal cost at scale, but you own capacity planning and ops." },
      { name: "Hosted LLM API", note: "Call a provider API. Zero inference ops and instant scale, but higher per-token cost, rate limits, and a hard external dependency." },
    ],
  },
  {
    id: "ai-image-generation",
    title: "AI Image Generation Service",
    difficulty: "Medium",
    description:
      "Design an image generation service like Midjourney, DALL·E, or a hosted Stable Diffusion. A user submits a text prompt and gets generated images back. Generation runs on GPUs and takes seconds to minutes, so the request can't be synchronous — it becomes an asynchronous job. The architecture is the classic queue + GPU worker pool pattern, plus prompt moderation, durable storage of results, and CDN delivery.",
    requirements: {
      readsPerSec: 20000,
      writesPerSec: 2000,
      storageGB: 100000,
      latencyMs: 30000,
      users: "5M users",
    },
    constraints: [
      "Generation is slow (GPU) — accept the job and return results asynchronously",
      "Absorb bursts without dropping jobs; let GPU workers drain at their pace",
      "Moderate prompts (and outputs) to block disallowed content",
      "Store generated images durably and serve them fast worldwide",
      "Show job status/progress; support retries on worker failure",
      "GPUs are the costly bottleneck — batch and autoscale by queue depth",
    ],
    hints: [
      {
        title: "Make it asynchronous",
        content:
          "The API validates and enqueues a job, returning a job id immediately. A pool of GPU workers consumes the queue and generates images — never block the request on generation.",
      },
      {
        title: "Queue absorbs the burst",
        content:
          "A message queue between the API and GPU workers smooths spikes and lets you autoscale workers by queue depth. Use visibility timeouts so a crashed worker's job is retried.",
      },
      {
        title: "Store and deliver",
        content:
          "Write images to object storage and serve them via a CDN. Keep job status in a fast store the client can poll or subscribe to.",
      },
      {
        title: "Advanced: Moderation and cost",
        content:
          "Screen prompts before generation and images after. Batch on the GPU, and scale the worker pool to zero when idle to control cost.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "client", x: 60, y: 300 },
        { componentId: "api-gateway", x: 250, y: 300 },
        { componentId: "rate-limiter", x: 250, y: 160 },
        { componentId: "guardrails", x: 450, y: 160 },
        { componentId: "app-server", x: 450, y: 300 },
        { componentId: "message-queue", x: 650, y: 300 },
        { componentId: "model-server", x: 850, y: 220 },
        { componentId: "object-storage", x: 1050, y: 220 },
        { componentId: "cdn", x: 1050, y: 360 },
        { componentId: "nosql-db", x: 650, y: 450 },
        { componentId: "monitoring", x: 850, y: 380 },
      ],
      edges: [
        { source: "client", target: "api-gateway" },
        { source: "api-gateway", target: "rate-limiter" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "guardrails" },
        { source: "app-server", target: "message-queue" },
        { source: "message-queue", target: "model-server" },
        { source: "model-server", target: "object-storage" },
        { source: "object-storage", target: "cdn" },
        { source: "app-server", target: "nosql-db" },
        { source: "model-server", target: "nosql-db" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["AI", "GPU", "Async", "Media"],
  },
  {
    id: "ai-coding-assistant",
    title: "AI Coding Assistant",
    difficulty: "Hard",
    description:
      "Design an AI coding assistant like GitHub Copilot or Cursor that suggests code completions inside the editor. The hard constraint is latency — suggestions must appear in a few hundred milliseconds as the developer types, which shapes everything. To suggest good code it needs context from the current file and the wider codebase, so it combines low-latency model inference with retrieval over an index of the repository (RAG for code).",
    requirements: {
      readsPerSec: 100000,
      writesPerSec: 5000,
      storageGB: 10000,
      latencyMs: 400,
      users: "2M developers",
    },
    constraints: [
      "Completions must return in a few hundred ms (p95) — latency is the product",
      "Use context: current file (fill-in-the-middle) plus relevant repo snippets",
      "Cancel/debounce in-flight requests as the user keeps typing",
      "Retrieve from a per-repository code index kept fresh as code changes",
      "Don't leak secrets or other users' private code; filter sensitive output",
      "Cache repeated completions; control inference cost at high request volume",
    ],
    hints: [
      {
        title: "Latency drives the design",
        content:
          "Aim for low time-to-first-token with a fast, smaller code model. Debounce keystrokes and cancel superseded requests so you only spend compute on the latest cursor position.",
      },
      {
        title: "Context = file + repo retrieval",
        content:
          "Send the surrounding code (fill-in-the-middle) plus snippets retrieved from an embedded index of the repository, so suggestions match the project's APIs and patterns.",
      },
      {
        title: "Cache aggressively",
        content:
          "Identical prefixes recur constantly. A completion cache keyed on the context hash cuts latency and cost dramatically.",
      },
      {
        title: "Advanced: Privacy and freshness",
        content:
          "Index each repo separately and scope retrieval to the user's access. Re-embed changed files incrementally, and filter completions for secrets/licensed code.",
      },
    ],
    referenceSolution: {
      nodes: [
        { componentId: "client", x: 60, y: 300 },
        { componentId: "api-gateway", x: 250, y: 300 },
        { componentId: "rate-limiter", x: 250, y: 160 },
        { componentId: "app-server", x: 450, y: 300 },
        { componentId: "cache", x: 450, y: 160 },
        { componentId: "embedding-model", x: 660, y: 180 },
        { componentId: "vector-db", x: 870, y: 180 },
        { componentId: "model-server", x: 660, y: 360 },
        { componentId: "guardrails", x: 450, y: 450 },
        { componentId: "monitoring", x: 870, y: 360 },
      ],
      edges: [
        { source: "client", target: "api-gateway" },
        { source: "api-gateway", target: "rate-limiter" },
        { source: "api-gateway", target: "app-server" },
        { source: "app-server", target: "cache" },
        { source: "app-server", target: "embedding-model" },
        { source: "embedding-model", target: "vector-db" },
        { source: "app-server", target: "model-server" },
        { source: "app-server", target: "guardrails" },
        { source: "app-server", target: "monitoring" },
      ],
    },
    tags: ["AI", "LLM", "RAG", "Low-Latency"],
  },
];

export function getProblemById(id: string): Problem | undefined {
  // Check predefined problems first
  const predefined = PROBLEMS.find((p) => p.id === id);
  if (predefined) return predefined;

  // Check custom problems
  if (id.startsWith("custom-")) {
    const custom = useCustomProblemsStore
      .getState()
      .problems.find((p) => p.id === id);
    if (custom) {
      // Return a Problem-compatible shape (no hints or reference solution)
      return {
        id: custom.id,
        title: custom.title,
        difficulty: custom.difficulty,
        description: custom.description,
        requirements: custom.requirements,
        constraints: custom.constraints,
        hints: [],
        referenceSolution: { nodes: [], edges: [] },
        tags: custom.tags,
      };
    }
  }

  return undefined;
}
