import type { Node, Edge } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";
import type { CategoryScore, ScoreContext } from "@/types/scoring";
import { roleOf, rolesPresent, DATABASE_ROLES } from "@/data/roles";
import { simHasTraffic, fmt } from "../ruleHelpers";

export function scoreScalability(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  ctx?: ScoreContext
): CategoryScore {
  const feedback: string[] = [];
  const passed: string[] = [];
  let score = 0;

  const componentIds = nodes.map((n) => n.data.componentId);
  const roles = rolesPresent(componentIds);
  const hasLB = roles.has("load-balancer");
  const hasCache = roles.has("cache");
  const hasQueue = roles.has("message-queue") || roles.has("pub-sub");
  const hasCDN = roles.has("cdn");
  const hasScalableCompute = nodes.some(
    (n) => n.data.category === "compute" && n.data.scalable
  );
  const hasDBScaling = nodes.some(
    (n) => DATABASE_ROLES.has(roleOf(n.data.componentId)) && (n.data.replicas || 1) > 1
  );

  // Check load balancer (3 pts)
  if (hasLB) {
    score += 3;
    passed.push("Load balancer distributes traffic across servers, enabling horizontal scaling");
  } else {
    feedback.push(
      "Add a Load Balancer (e.g., AWS ALB, Nginx) to distribute traffic across multiple servers. Without one, a single server handles all requests and becomes a bottleneck — you can't scale horizontally."
    );
  }

  // Check horizontal scaling (3 pts)
  if (hasScalableCompute) {
    score += 3;
    passed.push("Horizontally scalable compute layer allows adding capacity on demand");
  } else {
    feedback.push(
      "Add stateless App Servers that can scale horizontally behind the load balancer. Stateless servers let you spin up new instances in seconds during traffic spikes, handling 10x load by simply adding more machines."
    );
  }

  // Check caching (3 pts)
  if (hasCache) {
    score += 3;
    passed.push("Caching layer (Redis/Memcached) absorbs read traffic and reduces backend load");
  } else {
    feedback.push(
      "Add a caching layer (Redis/Memcached) between your App Servers and Database. This can reduce DB load by 80-90% for read-heavy workloads by serving frequently accessed data from memory (~1ms) instead of disk (~5-10ms)."
    );
  }

  // Check async processing (3 pts)
  if (hasQueue) {
    score += 3;
    passed.push("Message queue enables async processing and absorbs traffic spikes");
  } else {
    feedback.push(
      "Add a Message Queue (Kafka, SQS, RabbitMQ) for asynchronous processing. Queues decouple producers from consumers, letting you buffer traffic spikes and process heavy tasks (email, transcoding, analytics) in the background without blocking user requests."
    );
  }

  // Capacity (3 pts). When a problem is selected we simulate at its required
  // load and check the design actually sustains it — otherwise fall back to the
  // DB-read-scaling heuristic.
  if (ctx?.sim && ctx.requiredLoad && simHasTraffic(ctx.sim)) {
    const { throughput } = ctx.sim;
    const required = ctx.requiredLoad;
    if (throughput >= required * 0.999) {
      score += 3;
      passed.push(
        `Sustains the required ~${fmt(required)} req/s (simulated throughput ${fmt(throughput)} req/s) with no critical bottleneck`
      );
    } else {
      const worst = ctx.sim.bottleneckNodes
        .map((id) => nodes.find((n) => n.id === id)?.data.label)
        .filter(Boolean)
        .slice(0, 2);
      feedback.push(
        `Simulated throughput is only ~${fmt(throughput)} req/s against a required ${fmt(required)} req/s${
          worst.length ? ` — bottleneck at ${worst.join(", ")}` : ""
        }. Add replicas to the bottleneck, shard the datastore, or put a cache in front to shed read load.`
      );
    }
  } else if (hasDBScaling) {
    score += 3;
    passed.push("Database layer supports read scaling via NoSQL or read replicas");
  } else {
    feedback.push(
      "Scale your database layer — use a NoSQL database (DynamoDB, Cassandra) for automatic horizontal scaling, or add SQL read replicas to distribute query load. A single SQL primary becomes a bottleneck beyond ~10K QPS."
    );
  }

  // Check CDN for static content offloading (3 pts)
  if (hasCDN) {
    score += 3;
    passed.push("CDN offloads static content delivery from origin servers");
  } else {
    feedback.push(
      "Add a CDN (CloudFront, Cloudflare) to offload static content delivery from your origin servers. CDNs serve cached content from 200+ edge locations worldwide, reducing origin load by 60-80% and cutting latency for global users from 200ms+ to under 20ms."
    );
  }

  // Check LB→compute connectivity (2 pts)
  const lbToCompute = hasLB && hasScalableCompute && edges.some((e) => {
    const sourceNode = nodes.find((n) => n.id === e.source);
    const targetNode = nodes.find((n) => n.id === e.target);
    const sourceRole = sourceNode ? roleOf(sourceNode.data.componentId) : undefined;
    const targetRole = targetNode ? roleOf(targetNode.data.componentId) : undefined;
    return (
      (sourceRole === "load-balancer" && targetNode?.data.category === "compute") ||
      (sourceRole === "load-balancer" &&
        (targetRole === "api-gateway" || targetRole === "rate-limiter"))
    );
  });
  if (lbToCompute) {
    score += 2;
    passed.push("Load balancer is properly connected to compute layer");
  } else if (hasLB && hasScalableCompute) {
    feedback.push(
      "Connect your Load Balancer to your App Servers (directly or via an API Gateway). Without this connection, the LB can't distribute traffic to your compute layer — it's like having a highway on-ramp that leads nowhere."
    );
  }

  return { category: "Scalability", score, maxScore: 20, feedback, passed };
}
