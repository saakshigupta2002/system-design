export type ComponentCategory =
  | "client"
  | "networking"
  | "compute"
  | "storage"
  | "messaging"
  | "infrastructure"
  | "aws"
  | "gcp"
  | "ai"
  | "saas";

export interface SystemComponent {
  id: string;
  label: string;
  category: ComponentCategory;
  icon: string; // lucide icon name
  maxQPS: number;
  latencyMs: number;
  scalable: boolean;
  stateful: boolean;
  /** Illustrative relative infrastructure cost, USD per instance per month. */
  monthlyCost?: number;
  description: string;
}
