# Stereo Demo

This is a live executable markdown document. Code blocks annotated with `run` execute inline.

---

## Dashboard Metrics

```tsx run title="API Health" refresh=30s
<DashGrid cols={3}>
  <MetricCard label="Requests / sec" value="1,247" status="success" subtitle="↑ 12% from yesterday" />
  <MetricCard label="Error Rate" value="0.3%" status="success" subtitle="Below 1% threshold" />
  <MetricCard label="P95 Latency" value="142ms" status="caution" subtitle="Target: <100ms" />
</DashGrid>
```

## Response Time Sparkline

```tsx run title="Response Times (24h)"
<Sparkline
  label="P95 Response Time (ms)"
  data={[45, 52, 48, 67, 89, 72, 55, 43, 38, 92, 78, 65, 45, 52, 48, 67, 89, 72, 55, 43]}
  thresholds={{ warn: 70, err: 90 }}
/>
```

## Service Status

```tsx run title="Services"
<StatusTable
  headers={["Service", "Region", "Status", "Uptime"]}
  rows={[
    { cells: ["api-gateway", "us-east-1", "Healthy", "99.99%"], status: "ok" },
    { cells: ["auth-service", "us-east-1", "Healthy", "99.97%"], status: "ok" },
    { cells: ["search-index", "eu-west-1", "Degraded", "99.12%"], status: "warn" },
    { cells: ["ml-pipeline", "us-west-2", "Down", "98.50%"], status: "err" },
  ]}
/>
```

## Simple Output

```tsx run
const now = new Date().toISOString();
console.log(`Executed at: ${now}`);
`<p>Current time: <code>${now}</code></p>`;
```

## Regular Code Block (not executable)

```ts
// This is just a regular code block — no "run" keyword
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
};
```
