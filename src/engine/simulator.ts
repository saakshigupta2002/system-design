import type { Node, Edge } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";
import type { NodeMetrics, NodeStatus, SimulationResult } from "@/types/simulation";
import { roleOf, SPLITTER_ROLES, OFF_PATH_ROLES, STORAGE_ROLES } from "@/data/roles";
import {
  UTILIZATION_WARNING,
  UTILIZATION_CRITICAL,
  LATENCY_SPIKE_THRESHOLD,
  LATENCY_SPIKE_MULTIPLIER,
  CACHE_HIT_RATE,
} from "./constants";

/** A component splits (routes) traffic across children — sending each request
 *  down ONE branch — when its canonical role is a balancer/router. Resolved via
 *  the role layer so brand variants (Nginx, Envoy, ELB…) behave correctly too. */
export function isSplitterComponent(componentId: string): boolean {
  return SPLITTER_ROLES.has(roleOf(componentId));
}

/** A component is out-of-band for user-facing request latency when its role is
 *  observability (monitoring) or an async hand-off (queue / pub-sub). */
function isOffPathComponent(componentId: string): boolean {
  return OFF_PATH_ROLES.has(roleOf(componentId));
}

function getStatus(utilization: number): NodeStatus {
  if (utilization > UTILIZATION_CRITICAL) return "critical";
  if (utilization > UTILIZATION_WARNING) return "warning";
  return "healthy";
}

function computeLatency(baseLatency: number, utilization: number): number {
  if (utilization > LATENCY_SPIKE_THRESHOLD) {
    return baseLatency * (1 + Math.max(0, utilization - LATENCY_SPIKE_THRESHOLD) * LATENCY_SPIKE_MULTIPLIER);
  }
  return baseLatency;
}

export function runSimulation(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  requestsPerSec: number,
  failedNodeIds: Set<string> = new Set()
): SimulationResult {
  const warnings: string[] = [];
  const nodeMetrics = new Map<string, NodeMetrics>();
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Parallel wires between the same pair (drawn via different sides) would
  // double-count traffic — treat them as one connection.
  const seenPairs = new Set<string>();
  const uniqueEdges = edges.filter((e) => {
    const key = `${e.source}→${e.target}`;
    if (seenPairs.has(key)) return false;
    seenPairs.add(key);
    return true;
  });

  // Build adjacency list and in-degree map
  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  // Optional per-edge traffic share, used by splitters (relative weights).
  const weightByPair = new Map<string, number>();
  for (const edge of uniqueEdges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    const w = (edge.data as { weight?: number } | undefined)?.weight;
    if (typeof w === "number" && w > 0) {
      weightByPair.set(`${edge.source}→${edge.target}`, w);
    }
  }

  // QPS recorded per connection, for display on the canvas edges.
  const edgeFlows = new Map<string, number>();

  // Find entry nodes: no inbound edges AND at least one outbound edge.
  // Isolated nodes (no edges at all) are NOT entry points — otherwise they'd
  // siphon a share of the incoming traffic away from the real entry points.
  // They fall through to the idle-node handling below.
  const entryNodes = nodes.filter(
    (n) => (inDegree.get(n.id) ?? 0) === 0 && (adjacency.get(n.id)?.length ?? 0) > 0
  );

  if (nodes.length > 0 && edges.length > 0 && entryNodes.length === 0) {
    warnings.push(
      "No traffic entry point found — traffic enters at a component with outgoing wires but no incoming ones. Check your arrow directions: right now every connected component has an inbound wire (or is part of a loop), so no traffic flows."
    );
  }

  // Initialize incoming QPS for entry nodes
  const incomingQPS = new Map<string, number>();
  const qpsPerEntry = entryNodes.length > 0 ? requestsPerSec / entryNodes.length : 0;
  for (const entry of entryNodes) {
    incomingQPS.set(entry.id, qpsPerEntry);
  }

  // Build node lookup map for O(1) access
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // --- Kahn's algorithm for topological-order QPS propagation ---
  // Clone inDegree so we can decrement without corrupting the original
  const remaining = new Map(inDegree);
  const queue: string[] = [];
  const bottleneckNodes: string[] = [];
  const processed = new Set<string>();

  // Seed queue with all zero-indegree nodes
  for (const entry of entryNodes) {
    queue.push(entry.id);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (processed.has(nodeId)) continue;
    processed.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const data = node.data;
    const isFailed = failedNodeIds.has(nodeId);
    const incoming = incomingQPS.get(nodeId) ?? 0;
    const replicas = data.replicas ?? 1; // Fix #6: nullish coalescing
    // A failed component has zero serving capacity — it can't process or
    // forward traffic, so its whole downstream subtree starves.
    const effectiveQPS = isFailed ? 0 : data.maxQPS * replicas;
    // Fix #9: guard against 0/0 NaN
    const utilization = effectiveQPS === 0 || effectiveQPS === Infinity
      ? 0
      : incoming / effectiveQPS;
    const latency = computeLatency(data.latencyMs, utilization);
    const status: NodeStatus = isFailed ? "down" : getStatus(utilization);
    const isBottleneck = !isFailed && utilization > UTILIZATION_CRITICAL;

    if (isBottleneck) bottleneckNodes.push(nodeId);

    nodeMetrics.set(nodeId, {
      nodeId,
      incomingQPS: incoming,
      effectiveQPS,
      utilization: Math.min(utilization, 2), // cap at 200% for display
      latencyMs: latency,
      status,
      isBottleneck,
    });

    // Propagate to children
    const children = adjacency.get(nodeId) ?? [];
    // A failed node forwards nothing; otherwise output is capped by capacity.
    const outputQPS = isFailed ? 0 : Math.min(incoming, effectiveQPS);

    // Routers/balancers split traffic; everything else fans out.
    // Split shares honor per-edge weights when set (relative; default 1 each).
    const isSplitter = isSplitterComponent(data.componentId);
    // Failed children are excluded from a splitter's distribution, so a load
    // balancer / gateway reroutes their share onto the survivors — which is
    // exactly what surfaces a new bottleneck when a node dies.
    const childWeights = children.map((childId) =>
      failedNodeIds.has(childId) ? 0 : weightByPair.get(`${nodeId}→${childId}`) ?? 1
    );
    const totalWeight = childWeights.reduce((sum, w) => sum + w, 0);

    // Cache model: a cache absorbs its hit rate of lookups, so only misses
    // flow past it. Two shapes are supported:
    //   chained:  app → cache → db   (traffic out of a cache = misses only)
    //   parallel: app → cache, app → db  (storage siblings of a cache get
    //             misses only — the app checks the cache first)
    const isCache = roleOf(data.componentId) === "cache";
    const hitRateOf = (d: ComponentNodeData | undefined) =>
      Math.min(0.99, Math.max(0, d?.cacheHitRate ?? CACHE_HIT_RATE));
    const cacheChild = children
      .map((id) => nodeMap.get(id))
      .find((n) => n && roleOf(n.data.componentId) === "cache");

    children.forEach((childId, i) => {
      let qpsToChild =
        isSplitter && totalWeight > 0
          ? (outputQPS * childWeights[i]) / totalWeight
          : outputQPS; // fan-out: full traffic to each child
      const childData = nodeMap.get(childId)?.data;
      const childRole = childData ? roleOf(childData.componentId) : undefined;
      if (isCache) {
        qpsToChild *= 1 - hitRateOf(data);
      } else if (
        cacheChild &&
        childRole &&
        STORAGE_ROLES.has(childRole) &&
        childRole !== "cache"
      ) {
        qpsToChild *= 1 - hitRateOf(cacheChild.data);
      }
      const flowKey = `${nodeId}→${childId}`;
      edgeFlows.set(flowKey, (edgeFlows.get(flowKey) ?? 0) + qpsToChild);
      const existing = incomingQPS.get(childId) ?? 0;
      incomingQPS.set(childId, existing + qpsToChild);

      // Decrement in-degree; enqueue when all predecessors processed
      const newDeg = (remaining.get(childId) ?? 1) - 1;
      remaining.set(childId, newDeg);
      if (newDeg === 0) {
        queue.push(childId);
      }
    });
  }

  // Fix #8: Detect cycles — nodes with remaining inDegree > 0 that weren't processed
  const cycleNodes: string[] = [];
  for (const node of nodes) {
    if (!processed.has(node.id) && (inDegree.get(node.id) ?? 0) > 0) {
      cycleNodes.push(node.id);
    }
  }

  if (cycleNodes.length > 0) {
    warnings.push(
      `Cycle detected involving node(s): ${cycleNodes.join(", ")}. Processing with accumulated QPS.`
    );
    // Process cycle nodes with whatever QPS they've accumulated
    for (const nodeId of cycleNodes) {
      if (nodeMetrics.has(nodeId)) continue;
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const data = node.data;
      const incoming = incomingQPS.get(nodeId) ?? 0;
      const replicas = data.replicas ?? 1;
      const effectiveQPS = data.maxQPS * replicas;
      const utilization = effectiveQPS === 0 || effectiveQPS === Infinity
        ? 0
        : incoming / effectiveQPS;
      const latency = computeLatency(data.latencyMs, utilization);
      const status = getStatus(utilization);
      const isBottleneck = utilization > UTILIZATION_CRITICAL;

      if (isBottleneck) bottleneckNodes.push(nodeId);

      nodeMetrics.set(nodeId, {
        nodeId,
        incomingQPS: incoming,
        effectiveQPS,
        utilization: Math.min(utilization, 2),
        latencyMs: latency,
        status,
        isBottleneck,
      });
    }
  }

  // Fix #7: Disconnected/idle nodes get their base latency, not 0
  for (const node of nodes) {
    if (!nodeMetrics.has(node.id)) {
      const replicas = node.data.replicas ?? 1;
      nodeMetrics.set(node.id, {
        nodeId: node.id,
        incomingQPS: 0,
        effectiveQPS: node.data.maxQPS * replicas,
        utilization: 0,
        latencyMs: node.data.latencyMs, // base latency, not 0
        status: "idle",
        isBottleneck: false,
      });
    }
  }

  // Chaos blast radius: a non-failed component that lost ALL its inbound
  // traffic because of an upstream failure is effectively offline too.
  if (failedNodeIds.size > 0) {
    const starved: string[] = [];
    for (const node of nodes) {
      if (failedNodeIds.has(node.id)) continue;
      const m = nodeMetrics.get(node.id);
      if (m && (inDegree.get(node.id) ?? 0) > 0 && m.incomingQPS === 0) {
        m.status = "down";
        starved.push(node.data.label);
      }
    }
    const downLabels = nodes.filter((n) => failedNodeIds.has(n.id)).map((n) => n.data.label);
    warnings.push(
      `Chaos: ${downLabels.join(", ")} offline.` +
        (starved.length
          ? ` Downstream starved (requests fail): ${starved.join(", ")}.`
          : " No downstream impact — the rest of the system stayed up.")
    );
  }

  const totalLatencyMs = computeLongestPathLatency(nodes, uniqueEdges, nodeMap, nodeMetrics);

  // Throughput is capped by bottlenecks on the request path. Monitoring is
  // observability — an overloaded monitoring stack doesn't reduce how many
  // user requests the system serves.
  const pathBottlenecks = bottleneckNodes.filter((id) => {
    const cid = nodeMap.get(id)?.data.componentId;
    return cid ? roleOf(cid) !== "monitoring" : true;
  });
  const throughput = nodes.length === 0
    ? 0
    : pathBottlenecks.length > 0
      ? Math.min(...pathBottlenecks.map((id) => nodeMetrics.get(id)!.effectiveQPS))
      : requestsPerSec;

  return {
    nodeMetrics,
    edgeFlows,
    totalLatencyMs,
    bottleneckNodes,
    throughput,
    timestamp: Date.now(),
    warnings,
  };
}

// Longest path over the user-facing request path only. Edges marked async and
// edges into off-path components (monitoring, message queue) hand work off
// out-of-band — they carry traffic, but don't add to response latency.
function computeLongestPathLatency(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  nodeMap: Map<string, Node<ComponentNodeData>>,
  metrics: Map<string, NodeMetrics>
): number {
  if (nodes.length === 0) return 0;

  const pathEdges = edges.filter((e) => {
    if ((e.data as { async?: boolean } | undefined)?.async === true) return false;
    const targetComponent = nodeMap.get(e.target)?.data.componentId ?? "";
    return !isOffPathComponent(targetComponent);
  });

  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of pathEdges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Clone inDegree so we can decrement
  const remaining = new Map(inDegree);

  const dist = new Map<string, number>();
  // Mirror runSimulation's entry definition: isolated nodes don't start a path.
  const entryNodes = nodes.filter(
    (n) => (inDegree.get(n.id) ?? 0) === 0 && (adjacency.get(n.id)?.length ?? 0) > 0
  );

  for (const entry of entryNodes) {
    dist.set(entry.id, metrics.get(entry.id)?.latencyMs ?? 0);
  }

  // Kahn's algorithm for longest-path
  const queue = [...entryNodes.map((n) => n.id)];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (processed.has(nodeId)) continue;
    processed.add(nodeId);

    const currentDist = dist.get(nodeId) ?? 0;
    const children = adjacency.get(nodeId) ?? [];

    for (const childId of children) {
      const childLatency = metrics.get(childId)?.latencyMs ?? 0;
      const newDist = currentDist + childLatency;
      if (newDist > (dist.get(childId) ?? 0)) {
        dist.set(childId, newDist);
      }

      // Decrement in-degree; enqueue only when all predecessors are processed
      const newDeg = (remaining.get(childId) ?? 1) - 1;
      remaining.set(childId, newDeg);
      if (newDeg === 0) {
        queue.push(childId);
      }
    }
  }

  return Math.max(0, ...dist.values());
}
