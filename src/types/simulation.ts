export type NodeStatus = "healthy" | "warning" | "critical" | "idle" | "down";

export interface NodeMetrics {
  nodeId: string;
  incomingQPS: number;
  effectiveQPS: number;
  utilization: number;
  latencyMs: number;
  status: NodeStatus;
  isBottleneck: boolean;
}

export interface SimulationResult {
  nodeMetrics: Map<string, NodeMetrics>;
  /** QPS flowing along each connection, keyed by `${source}→${target}`. */
  edgeFlows: Map<string, number>;
  /** Median critical-path latency (kept as the headline figure). */
  totalLatencyMs: number;
  /** Same as totalLatencyMs, named for clarity alongside p99. */
  p50LatencyMs: number;
  /** Tail (p99) critical-path latency — grows sharply as components saturate. */
  p99LatencyMs: number;
  bottleneckNodes: string[];
  throughput: number;
  /** Storage modeling (set when a required volume is supplied). */
  storageRequiredGB?: number;
  storageCapacityGB?: number;
  storageOk?: boolean;
  timestamp: number;
  warnings: string[];
}

export interface SimulationConfig {
  requestsPerSec: number;
}
