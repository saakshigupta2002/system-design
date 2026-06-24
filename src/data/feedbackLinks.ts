import { TRADEOFF_CARDS } from "./tradeoffCards";

/**
 * Just-in-time learning: map a piece of score feedback to the most relevant
 * trade-off reference card, so the score report can offer a "Learn more →" link
 * that opens the card explaining the concept the feedback is about.
 *
 * Matching is keyword-based and ordered — the first rule whose keyword appears
 * in the feedback wins. Keep the most specific concepts first.
 */
interface FeedbackRule {
  /** Lowercase substrings; any match triggers this card. */
  keywords: string[];
  cardId: string;
}

const RULES: FeedbackRule[] = [
  { keywords: ["sql", "nosql", "polyglot", "storage technolog", "relational"], cardId: "sql-vs-nosql" },
  { keywords: ["cache-aside", "write-through", "cache hit"], cardId: "cache-aside-vs-write-through" },
  { keywords: ["rate limit", "rate-limiter", "rate limiter", "token bucket"], cardId: "token-bucket-vs-sliding-window" },
  { keywords: ["cdn"], cardId: "cdn-push-vs-pull" },
  { keywords: ["websocket", "polling", "long poll"], cardId: "polling-vs-websocket" },
  { keywords: ["shard", "partition"], cardId: "hash-vs-range-partitioning" },
  { keywords: ["rest", "grpc"], cardId: "rest-vs-grpc" },
  { keywords: ["fan-out", "fanout", "timeline", "news feed"], cardId: "push-vs-pull" },
  { keywords: ["exactly-once", "at-least-once", "delivery guarantee", "message retention"], cardId: "at-least-once-vs-exactly-once" },
  { keywords: ["replica", "replication", "leader", "failover"], cardId: "single-vs-multi-leader" },
  { keywords: ["microservice", "monolith"], cardId: "monolith-vs-microservices" },
  { keywords: ["eventual consistency", "strong consistency", "consistency"], cardId: "strong-vs-eventual" },
  { keywords: ["queue", "async", "asynchronous", "decouple"], cardId: "sync-vs-async" },
  { keywords: ["horizontal", "vertical scal", "add more machines", "scale out"], cardId: "vertical-vs-horizontal" },
];

const CARD_IDS = new Set(TRADEOFF_CARDS.map((c) => c.id));

/** The trade-off card id most relevant to a feedback string, or null. */
export function tradeoffCardForFeedback(feedback: string): string | null {
  const text = feedback.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k)) && CARD_IDS.has(rule.cardId)) {
      return rule.cardId;
    }
  }
  return null;
}

/** Human title for a card id (for the link label / tooltip). */
export function tradeoffCardTitle(cardId: string): string | undefined {
  return TRADEOFF_CARDS.find((c) => c.id === cardId)?.title;
}
