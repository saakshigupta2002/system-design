export interface LearningTier {
  name: string;
  description: string;
  problemIds: string[];
}

export const LEARNING_PATH: LearningTier[] = [
  {
    name: "Foundations",
    description: "Master the basic building blocks",
    problemIds: [
      "url-shortener",
      "todo-app",
      "rate-limiter",
      "pastebin",
      "image-hosting",
      "parking-lot",
      "view-counter",
      "id-generator-service",
    ],
  },
  {
    name: "Intermediate",
    description: "Combine multiple systems",
    problemIds: [
      "notification-system",
      "typeahead-autocomplete",
      "distributed-cache",
      "instagram",
      "music-streaming",
      "location-service",
      "tinder",
      "reddit",
      "code-editor",
      "cicd-pipeline",
      "leaderboard",
    ],
  },
  {
    name: "Advanced",
    description: "Complex distributed systems",
    problemIds: [
      "twitter-feed",
      "chat-system",
      "web-crawler",
      "file-storage",
      "ecommerce",
      "whatsapp",
      "netflix",
      "airbnb",
      "food-delivery",
      "zoom",
      "job-scheduler",
    ],
  },
  {
    name: "Expert",
    description: "Multi-concern architectures",
    problemIds: [
      "ride-sharing",
      "video-streaming",
      "payment-system",
      "ticket-booking",
      "collaborative-editor",
      "team-messaging",
      "metrics-monitoring",
      "google-maps",
      "search-engine",
      "tiktok",
      "digital-wallet",
      "message-queue-design",
      "ad-click-aggregator",
      "key-value-store",
    ],
  },
  {
    name: "AI Applications",
    description: "Design modern LLM, RAG, and agent systems",
    problemIds: [
      "rag-assistant",
      "llm-chatbot",
      "ai-image-generation",
      "ai-coding-assistant",
      "ai-agent-platform",
    ],
  },
];

export interface ConceptPrerequisite {
  problemId: string;
  concepts: string[];
  prerequisites: string[];
}

export const PROBLEM_CONCEPTS: ConceptPrerequisite[] = [
  {
    problemId: "url-shortener",
    concepts: ["caching", "hashing", "read-heavy-design"],
    prerequisites: [],
  },
  {
    problemId: "rate-limiter",
    concepts: ["rate-limiting", "sliding-window", "token-bucket"],
    prerequisites: [],
  },
  {
    problemId: "parking-lot",
    concepts: ["object-modeling", "state-management", "concurrency"],
    prerequisites: [],
  },
  {
    problemId: "notification-system",
    concepts: ["async-processing", "message-queue", "priority-queue"],
    prerequisites: ["rate-limiting"],
  },
  {
    problemId: "typeahead-autocomplete",
    concepts: ["trie", "prefix-search", "ranking"],
    prerequisites: ["caching", "read-heavy-design"],
  },
  {
    problemId: "distributed-cache",
    concepts: ["consistent-hashing", "cache-eviction", "replication"],
    prerequisites: ["caching", "hashing"],
  },
  {
    problemId: "instagram",
    concepts: ["media-storage", "feed-generation", "cdn"],
    prerequisites: ["caching", "async-processing"],
  },
  {
    problemId: "music-streaming",
    concepts: ["streaming-protocol", "content-delivery", "recommendation"],
    prerequisites: ["caching", "cdn"],
  },
  {
    problemId: "twitter-feed",
    concepts: ["fan-out", "timeline", "hybrid-approach"],
    prerequisites: ["caching", "async-processing", "feed-generation"],
  },
  {
    problemId: "chat-system",
    concepts: ["websocket", "presence", "message-ordering"],
    prerequisites: ["async-processing", "message-queue"],
  },
  {
    problemId: "web-crawler",
    concepts: ["crawling", "url-frontier", "politeness"],
    prerequisites: ["hashing", "async-processing", "rate-limiting"],
  },
  {
    problemId: "file-storage",
    concepts: ["chunking", "deduplication", "metadata-db"],
    prerequisites: ["consistent-hashing", "replication"],
  },
  {
    problemId: "ecommerce",
    concepts: ["inventory-management", "search-indexing", "payment-flow"],
    prerequisites: ["caching", "async-processing", "message-queue"],
  },
  {
    problemId: "ride-sharing",
    concepts: ["geospatial-indexing", "matching-algorithm", "real-time-tracking"],
    prerequisites: ["websocket", "async-processing", "consistent-hashing"],
  },
  {
    problemId: "video-streaming",
    concepts: ["adaptive-bitrate", "transcoding", "edge-caching"],
    prerequisites: ["cdn", "streaming-protocol", "async-processing"],
  },
  {
    problemId: "payment-system",
    concepts: ["idempotency", "saga-pattern", "ledger"],
    prerequisites: ["async-processing", "message-queue", "state-management"],
  },
  {
    problemId: "ticket-booking",
    concepts: ["distributed-locking", "seat-reservation", "optimistic-concurrency"],
    prerequisites: ["concurrency", "caching", "async-processing"],
  },
  {
    problemId: "collaborative-editor",
    concepts: ["crdt", "operational-transform", "conflict-resolution"],
    prerequisites: ["websocket", "message-ordering", "replication"],
  },
  {
    problemId: "team-messaging",
    concepts: ["channel-model", "search", "notification-routing"],
    prerequisites: ["websocket", "message-queue", "async-processing"],
  },
  {
    problemId: "metrics-monitoring",
    concepts: ["time-series-db", "aggregation-pipeline", "alerting"],
    prerequisites: ["streaming-protocol", "async-processing", "message-queue"],
  },
  {
    problemId: "location-service",
    concepts: ["geospatial-indexing", "proximity-search", "caching"],
    prerequisites: ["caching", "read-heavy-design"],
  },
  {
    problemId: "tinder",
    concepts: ["geospatial-indexing", "matching-algorithm", "swipe-deck"],
    prerequisites: ["caching", "async-processing"],
  },
  {
    problemId: "reddit",
    concepts: ["ranking", "nested-comments", "voting"],
    prerequisites: ["caching", "async-processing"],
  },
  {
    problemId: "code-editor",
    concepts: ["sandboxing", "operational-transform", "websocket"],
    prerequisites: ["websocket", "async-processing"],
  },
  {
    problemId: "cicd-pipeline",
    concepts: ["job-queue", "worker-pool", "artifact-storage"],
    prerequisites: ["message-queue", "async-processing"],
  },
  {
    problemId: "whatsapp",
    concepts: ["store-and-forward", "connection-routing", "websocket"],
    prerequisites: ["websocket", "message-queue", "presence"],
  },
  {
    problemId: "netflix",
    concepts: ["edge-caching", "adaptive-bitrate", "recommendation"],
    prerequisites: ["cdn", "streaming-protocol"],
  },
  {
    problemId: "airbnb",
    concepts: ["geo-search", "date-range-booking", "search-indexing"],
    prerequisites: ["search-indexing", "caching", "concurrency"],
  },
  {
    problemId: "food-delivery",
    concepts: ["geospatial-indexing", "order-state-machine", "real-time-tracking"],
    prerequisites: ["geospatial-indexing", "message-queue"],
  },
  {
    problemId: "zoom",
    concepts: ["sfu-topology", "webrtc", "signaling"],
    prerequisites: ["websocket", "streaming-protocol"],
  },
  {
    problemId: "google-maps",
    concepts: ["map-tiles", "shortest-path", "traffic-streams"],
    prerequisites: ["cdn", "geospatial-indexing", "time-series-db"],
  },
  {
    problemId: "search-engine",
    concepts: ["inverted-index", "crawling", "ranking"],
    prerequisites: ["crawling", "sharding", "caching"],
  },
  {
    problemId: "tiktok",
    concepts: ["recommendation-pipeline", "edge-caching", "stream-processing"],
    prerequisites: ["cdn", "message-queue", "recommendation"],
  },
  {
    problemId: "digital-wallet",
    concepts: ["double-entry-ledger", "idempotency", "atomic-transfer"],
    prerequisites: ["idempotency", "ledger", "distributed-locking"],
  },
  {
    problemId: "message-queue-design",
    concepts: ["append-only-log", "partitioning", "consumer-offsets"],
    prerequisites: ["replication", "consistent-hashing", "message-queue"],
  },
  {
    problemId: "id-generator-service",
    concepts: ["snowflake-id", "coordination", "clock-skew"],
    prerequisites: ["hashing"],
  },
  {
    problemId: "todo-app",
    concepts: ["crud", "authentication", "stateless-services"],
    prerequisites: [],
  },
  {
    problemId: "pastebin",
    concepts: ["object-storage", "caching", "read-heavy-design"],
    prerequisites: [],
  },
  {
    problemId: "image-hosting",
    concepts: ["object-storage", "cdn", "media-storage"],
    prerequisites: ["caching"],
  },
  {
    problemId: "view-counter",
    concepts: ["sharded-counter", "write-heavy-design", "eventual-consistency"],
    prerequisites: ["caching"],
  },
  {
    problemId: "leaderboard",
    concepts: ["sorted-set", "ranking", "real-time-aggregation"],
    prerequisites: ["caching", "async-processing"],
  },
  {
    problemId: "job-scheduler",
    concepts: ["leader-election", "visibility-timeout", "at-least-once"],
    prerequisites: ["message-queue", "distributed-locking", "async-processing"],
  },
  {
    problemId: "ad-click-aggregator",
    concepts: ["lambda-architecture", "stream-processing", "idempotency"],
    prerequisites: ["message-queue", "stream-processing", "idempotency"],
  },
  {
    problemId: "key-value-store",
    concepts: ["consistent-hashing", "quorum", "gossip-membership"],
    prerequisites: ["consistent-hashing", "replication", "hashing"],
  },
  {
    problemId: "rag-assistant",
    concepts: ["rag", "embeddings", "vector-search"],
    prerequisites: ["caching", "object-storage"],
  },
  {
    problemId: "llm-chatbot",
    concepts: ["llm-inference", "token-streaming", "context-window"],
    prerequisites: ["caching", "rate-limiting", "async-processing"],
  },
  {
    problemId: "ai-image-generation",
    concepts: ["async-jobs", "gpu-workers", "moderation"],
    prerequisites: ["message-queue", "cdn", "object-storage"],
  },
  {
    problemId: "ai-coding-assistant",
    concepts: ["low-latency-inference", "code-retrieval", "caching"],
    prerequisites: ["rag", "caching", "vector-search"],
  },
  {
    problemId: "ai-agent-platform",
    concepts: ["agent-loop", "mcp-tools", "agent-memory", "sandboxing"],
    prerequisites: ["rag", "message-queue", "async-processing"],
  },
];
