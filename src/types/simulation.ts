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
  totalLatencyMs: number;
  bottleneckNodes: string[];
  throughput: number;
  timestamp: number;
  warnings: string[];
}

export interface SimulationConfig {
  requestsPerSec: number;
}
