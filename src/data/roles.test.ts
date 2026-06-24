import { describe, it, expect } from "vitest";
import { roleOf, COMPONENT_ROLE, SPLITTER_ROLES, STORAGE_ROLES } from "./roles";
import { SYSTEM_COMPONENTS } from "./components";

describe("roleOf", () => {
  it("maps brand storage/cache components to their canonical role", () => {
    expect(roleOf("redis")).toBe("cache");
    expect(roleOf("aws-elasticache")).toBe("cache");
    expect(roleOf("postgresql")).toBe("sql-db");
    expect(roleOf("mysql")).toBe("sql-db");
    expect(roleOf("aws-rds")).toBe("sql-db");
    expect(roleOf("mongodb")).toBe("nosql-db");
    expect(roleOf("cassandra")).toBe("nosql-db");
    expect(roleOf("aws-dynamodb")).toBe("nosql-db");
    expect(roleOf("elasticsearch")).toBe("search");
    expect(roleOf("neo4j")).toBe("graph-db");
    expect(roleOf("influxdb")).toBe("timeseries-db");
  });

  it("maps brand messaging components to message-queue", () => {
    for (const id of ["kafka", "rabbitmq", "nats", "pulsar", "aws-sqs", "aws-kinesis"]) {
      expect(roleOf(id)).toBe("message-queue");
    }
  });

  it("maps brand proxies/edges to their routing role", () => {
    expect(roleOf("nginx")).toBe("load-balancer");
    expect(roleOf("aws-elb")).toBe("load-balancer");
    expect(roleOf("kong")).toBe("api-gateway");
    expect(roleOf("cloudflare")).toBe("cdn");
    expect(roleOf("fastly")).toBe("cdn");
  });

  it("maps brand observability components to monitoring", () => {
    for (const id of ["prometheus", "grafana", "datadog", "sentry", "jaeger"]) {
      expect(roleOf(id)).toBe("monitoring");
    }
  });

  it("falls back to the id itself for unknown (custom) components", () => {
    expect(roleOf("my-custom-thing")).toBe("my-custom-thing");
  });

  it("has a role for every component shipped in the palette", () => {
    const unmapped = SYSTEM_COMPONENTS.filter((c) => !(c.id in COMPONENT_ROLE));
    expect(unmapped.map((c) => c.id)).toEqual([]);
  });

  it("classifies splitter and storage role sets sanely", () => {
    expect(SPLITTER_ROLES.has("load-balancer")).toBe(true);
    expect(SPLITTER_ROLES.has("cache")).toBe(false);
    expect(STORAGE_ROLES.has("cache")).toBe(true);
    expect(STORAGE_ROLES.has("sql-db")).toBe(true);
    expect(STORAGE_ROLES.has("app-server")).toBe(false);
  });
});
