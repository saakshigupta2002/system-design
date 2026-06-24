/**
 * Component role layer.
 *
 * The palette ships 100+ components — generic boxes ("Cache", "SQL DB"),
 * cloud-branded ones ("AWS ElastiCache", "DynamoDB"), and real products
 * ("Redis", "Kafka", "Nginx", "PostgreSQL"). The simulator and the scorer must
 * reason about what a component *does*, not which icon it is — otherwise a
 * realistic, brand-accurate design (DNS → Cloudflare → Nginx → Redis → Postgres)
 * scores worse than five generic gray boxes, because none of the brand ids match
 * the literal strings the rules look for.
 *
 * `roleOf(componentId)` collapses every component to a small set of canonical
 * roles. The engine and scoring rules key off the role, so Redis earns cache
 * credit, Kafka earns queue credit, Nginx earns load-balancer credit, and so on.
 * Anything unmapped (e.g. a user's custom component) falls back to its own id,
 * preserving today's behaviour.
 */

export type ComponentRole =
  | "client"
  | "dns"
  | "cdn"
  | "load-balancer"
  | "reverse-proxy"
  | "api-gateway"
  | "rate-limiter"
  | "origin-shield"
  | "app-server"
  | "auth-service"
  | "websocket-server"
  | "worker"
  | "task-scheduler"
  | "stream-processor"
  | "notification-service"
  | "cache"
  | "sql-db"
  | "nosql-db"
  | "object-storage"
  | "file-store"
  | "search"
  | "graph-db"
  | "timeseries-db"
  | "data-warehouse"
  | "vector-db"
  | "geospatial-index"
  | "message-queue"
  | "pub-sub"
  | "monitoring"
  | "service-mesh"
  | "service-discovery"
  | "coordination-service"
  | "config-service"
  | "distributed-lock"
  | "circuit-breaker"
  | "id-generator"
  | "sharded-counter"
  | "llm"
  | "embedding-model"
  | "model-server"
  | "agent-orchestrator"
  | "mcp-server"
  | "guardrails"
  | "custom";

/**
 * Explicit map from concrete component id → canonical role.
 *
 * Generic components map to the role of the same name (kept explicit so the map
 * doubles as the authoritative list of "known" ids). Brand / cloud variants map
 * to the generic role they play in an architecture.
 */
export const COMPONENT_ROLE: Record<string, ComponentRole> = {
  // ── Generic core (role === id) ──
  client: "client",
  dns: "dns",
  cdn: "cdn",
  "load-balancer": "load-balancer",
  "api-gateway": "api-gateway",
  "rate-limiter": "rate-limiter",
  "reverse-proxy": "reverse-proxy",
  "origin-shield": "origin-shield",
  "app-server": "app-server",
  "auth-service": "auth-service",
  "websocket-server": "websocket-server",
  worker: "worker",
  "task-scheduler": "task-scheduler",
  "stream-processor": "stream-processor",
  "notification-service": "notification-service",
  cache: "cache",
  "sql-db": "sql-db",
  "nosql-db": "nosql-db",
  "object-storage": "object-storage",
  "file-store": "file-store",
  search: "search",
  "graph-db": "graph-db",
  "timeseries-db": "timeseries-db",
  "data-warehouse": "data-warehouse",
  "vector-db": "vector-db",
  "geospatial-index": "geospatial-index",
  "message-queue": "message-queue",
  "pub-sub": "pub-sub",
  monitoring: "monitoring",
  "service-mesh": "service-mesh",
  "service-discovery": "service-discovery",
  "coordination-service": "coordination-service",
  "config-service": "config-service",
  "distributed-lock": "distributed-lock",
  "circuit-breaker": "circuit-breaker",
  "id-generator": "id-generator",
  "sharded-counter": "sharded-counter",
  llm: "llm",
  "embedding-model": "embedding-model",
  "model-server": "model-server",
  "agent-orchestrator": "agent-orchestrator",
  "mcp-server": "mcp-server",
  guardrails: "guardrails",
  custom: "custom",

  // ── AWS ──
  "aws-route53": "dns",
  "aws-cloudfront": "cdn",
  "aws-elb": "load-balancer",
  "aws-api-gateway": "api-gateway",
  "aws-ec2": "app-server",
  "aws-lambda": "app-server",
  "aws-s3": "object-storage",
  "aws-rds": "sql-db",
  "aws-dynamodb": "nosql-db",
  "aws-elasticache": "cache",
  "aws-sqs": "message-queue",
  "aws-sns": "pub-sub",
  "aws-kinesis": "message-queue",
  "aws-opensearch": "search",

  // ── GCP ──
  "gcp-gce": "app-server",
  "gcp-gke": "app-server",
  "gcp-bigquery": "data-warehouse",
  "gcp-gcs": "object-storage",
  "gcp-firestore": "nosql-db",
  "gcp-pubsub": "pub-sub",

  // ── Databases / stores ──
  postgresql: "sql-db",
  mysql: "sql-db",
  mariadb: "sql-db",
  cockroachdb: "sql-db",
  sqlite: "sql-db",
  mongodb: "nosql-db",
  cassandra: "nosql-db",
  redis: "cache",
  elasticsearch: "search",
  clickhouse: "data-warehouse",
  influxdb: "timeseries-db",
  neo4j: "graph-db",
  snowflake: "data-warehouse",

  // ── Messaging ──
  kafka: "message-queue",
  rabbitmq: "message-queue",
  nats: "message-queue",
  pulsar: "message-queue",
  rocketmq: "message-queue",

  // ── Networking / proxies / gateways ──
  nginx: "load-balancer",
  kong: "api-gateway",
  envoy: "reverse-proxy",
  istio: "service-mesh",
  graphql: "api-gateway",

  // ── Edge / CDN / hosting ──
  cloudflare: "cdn",
  "cloudflare-workers": "app-server",
  fastly: "cdn",
  akamai: "cdn",
  vercel: "cdn",
  netlify: "cdn",

  // ── Coordination / config / infra ──
  consul: "service-discovery",
  vault: "config-service",
  etcd: "coordination-service",
  docker: "app-server",
  kubernetes: "service-discovery",
  terraform: "config-service",

  // ── Runtimes ──
  nodejs: "app-server",

  // ── Observability ──
  prometheus: "monitoring",
  grafana: "monitoring",
  datadog: "monitoring",
  sentry: "monitoring",
  jaeger: "monitoring",

  // ── AI providers / building blocks ──
  "ai-anthropic": "llm",
  "ai-openai": "llm",
  "ai-huggingface": "model-server",
  "ai-ollama": "llm",
  "ai-langchain": "agent-orchestrator",
  "ai-vectordb": "vector-db",

  // ── SaaS / APIs ──
  "saas-stripe": "app-server",
  "saas-auth0": "auth-service",
  "saas-okta": "auth-service",
  "saas-supabase": "sql-db",
  "saas-twilio": "notification-service",
  "saas-sendgrid": "notification-service",
  "saas-github": "app-server",
  "saas-gitlab": "app-server",
};

/** Roles whose components ROUTE (split) traffic across children rather than
 *  duplicating it — one request goes down one branch. */
export const SPLITTER_ROLES = new Set<ComponentRole>([
  "load-balancer",
  "api-gateway",
  "dns",
  "reverse-proxy",
  "origin-shield",
]);

/** Roles that take work off the synchronous request path: observability and
 *  async hand-offs don't add to user-facing latency. */
export const OFF_PATH_ROLES = new Set<ComponentRole>([
  "monitoring",
  "message-queue",
  "pub-sub",
]);

/** Storage roles, for polyglot-persistence and storage-sizing checks. */
export const STORAGE_ROLES = new Set<ComponentRole>([
  "cache",
  "sql-db",
  "nosql-db",
  "object-storage",
  "file-store",
  "search",
  "graph-db",
  "timeseries-db",
  "data-warehouse",
  "vector-db",
  "geospatial-index",
]);

/** Relational vs non-relational primary datastores, for DB-scaling checks. */
export const DATABASE_ROLES = new Set<ComponentRole>(["sql-db", "nosql-db"]);

/** Canonical role for a component id. Unknown ids (e.g. custom components) fall
 *  back to their own id cast as a role, preserving prior literal-id behaviour. */
export function roleOf(componentId: string): ComponentRole {
  return COMPONENT_ROLE[componentId] ?? (componentId as ComponentRole);
}

/** True when `componentId` plays `role` (or any of the given roles). */
export function hasRole(componentId: string, role: ComponentRole): boolean {
  return roleOf(componentId) === role;
}

/** Build the set of roles present in a list of component ids. */
export function rolesPresent(componentIds: Iterable<string>): Set<ComponentRole> {
  const set = new Set<ComponentRole>();
  for (const id of componentIds) set.add(roleOf(id));
  return set;
}
