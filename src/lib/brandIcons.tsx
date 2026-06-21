/**
 * Brand/technology logos via Simple Icons (https://simpleicons.org).
 *
 * Each icon renders as an SVG in its official brand color. Very dark logos
 * (e.g. Kafka, GitHub) are nudged to a light color so they stay visible on the
 * app's dark surfaces. Keyed by friendly names used in a component's `icon`
 * field, then merged into ICON_MAP alongside the generic lucide icons.
 */
import {
  // databases / storage
  siPostgresql,
  siMysql,
  siMongodb,
  siApachecassandra,
  siElasticsearch,
  siMariadb,
  siSqlite,
  siNeo4j,
  siClickhouse,
  siCockroachlabs,
  siRedis,
  siInfluxdb,
  siSnowflake,
  // messaging / streaming
  siApachekafka,
  siRabbitmq,
  siNatsdotio,
  siApachepulsar,
  siApacherocketmq,
  // infrastructure / proxies / observability / IaC
  siNginx,
  siKong,
  siEnvoyproxy,
  siIstio,
  siConsul,
  siVault,
  siEtcd,
  siDocker,
  siKubernetes,
  siTerraform,
  siPrometheus,
  siGrafana,
  siDatadog,
  siSentry,
  siJaeger,
  // networking / CDN / edge
  siCloudflare,
  siCloudflareworkers,
  siFastly,
  siAkamai,
  siVercel,
  siNetlify,
  // compute / API
  siNodedotjs,
  siGraphql,
  // Google Cloud
  siGooglecloud,
  siGooglebigquery,
  siGooglecloudstorage,
  siFirebase,
  // AI
  siAnthropic,
  siHuggingface,
  siOllama,
  siLangchain,
  // SaaS / auth / dev
  siStripe,
  siAuth0,
  siOkta,
  siSupabase,
  siGithub,
  siGitlab,
} from "simple-icons";

interface RawIcon {
  title: string;
  hex: string;
  path: string;
}

/** Relative luminance of a #RRGGBB hex (0 = black, 1 = white). */
function luminance(hex: string): number {
  const n = parseInt(hex, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function makeBrandIcon(icon: RawIcon) {
  // Keep near-black logos visible on dark surfaces.
  const fill = luminance(icon.hex) < 0.22 ? "#e4e4e7" : `#${icon.hex}`;
  function BrandIcon({ className }: { className?: string }) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill={fill}
        role="img"
        aria-label={icon.title}
      >
        <path d={icon.path} />
      </svg>
    );
  }
  BrandIcon.displayName = `Brand(${icon.title})`;
  return BrandIcon;
}

export const BRAND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PostgreSQL: makeBrandIcon(siPostgresql),
  MySQL: makeBrandIcon(siMysql),
  MongoDB: makeBrandIcon(siMongodb),
  Cassandra: makeBrandIcon(siApachecassandra),
  Elasticsearch: makeBrandIcon(siElasticsearch),
  MariaDB: makeBrandIcon(siMariadb),
  SQLite: makeBrandIcon(siSqlite),
  Neo4j: makeBrandIcon(siNeo4j),
  ClickHouse: makeBrandIcon(siClickhouse),
  CockroachDB: makeBrandIcon(siCockroachlabs),
  Redis: makeBrandIcon(siRedis),
  InfluxDB: makeBrandIcon(siInfluxdb),
  Snowflake: makeBrandIcon(siSnowflake),

  Kafka: makeBrandIcon(siApachekafka),
  RabbitMQ: makeBrandIcon(siRabbitmq),
  NATS: makeBrandIcon(siNatsdotio),
  Pulsar: makeBrandIcon(siApachepulsar),
  RocketMQ: makeBrandIcon(siApacherocketmq),

  Nginx: makeBrandIcon(siNginx),
  Kong: makeBrandIcon(siKong),
  Envoy: makeBrandIcon(siEnvoyproxy),
  Istio: makeBrandIcon(siIstio),
  Consul: makeBrandIcon(siConsul),
  Vault: makeBrandIcon(siVault),
  etcd: makeBrandIcon(siEtcd),
  Docker: makeBrandIcon(siDocker),
  Kubernetes: makeBrandIcon(siKubernetes),
  Terraform: makeBrandIcon(siTerraform),
  Prometheus: makeBrandIcon(siPrometheus),
  Grafana: makeBrandIcon(siGrafana),
  Datadog: makeBrandIcon(siDatadog),
  Sentry: makeBrandIcon(siSentry),
  Jaeger: makeBrandIcon(siJaeger),

  Cloudflare: makeBrandIcon(siCloudflare),
  CloudflareWorkers: makeBrandIcon(siCloudflareworkers),
  Fastly: makeBrandIcon(siFastly),
  Akamai: makeBrandIcon(siAkamai),
  Vercel: makeBrandIcon(siVercel),
  Netlify: makeBrandIcon(siNetlify),

  NodeJS: makeBrandIcon(siNodedotjs),
  GraphQL: makeBrandIcon(siGraphql),

  GoogleCloud: makeBrandIcon(siGooglecloud),
  BigQuery: makeBrandIcon(siGooglebigquery),
  CloudStorage: makeBrandIcon(siGooglecloudstorage),
  Firebase: makeBrandIcon(siFirebase),

  Anthropic: makeBrandIcon(siAnthropic),
  HuggingFace: makeBrandIcon(siHuggingface),
  Ollama: makeBrandIcon(siOllama),
  LangChain: makeBrandIcon(siLangchain),

  Stripe: makeBrandIcon(siStripe),
  Auth0: makeBrandIcon(siAuth0),
  Okta: makeBrandIcon(siOkta),
  Supabase: makeBrandIcon(siSupabase),
  GitHub: makeBrandIcon(siGithub),
  GitLab: makeBrandIcon(siGitlab),
};
