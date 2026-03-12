# API Health Dashboard

Check the Stereo billing API status in real-time.

```tsx run refresh=30s
const res = await fetch("https://stereo-billing.leap21.workers.dev/api/health");
const data = await res.json();

return (
  <DashGrid cols={2}>
    <MetricCard
      label="Status"
      value={data.status === "ok" ? "Healthy" : "Down"}
      status={data.status === "ok" ? "success" : "danger"}
    />
    <MetricCard
      label="Version"
      value={data.version}
      status="neutral"
    />
  </DashGrid>
);
```

## License Validation Test

```tsx run
const res = await fetch("https://stereo-billing.leap21.workers.dev/api/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ licenseKey: "test-free-user" }),
});
const data = await res.json();

return (
  <DashGrid cols={3}>
    <MetricCard
      label="Valid"
      value={data.valid ? "Yes" : "No"}
      status={data.valid ? "success" : "caution"}
    />
    <MetricCard
      label="Tier"
      value={data.tier}
      status="neutral"
    />
    <MetricCard
      label="Features"
      value={String(data.features.length)}
      subtitle={data.features.join(", ")}
      status="neutral"
    />
  </DashGrid>
);
```

## System Status

```tsx run refresh=10s
const endpoints = [
  { name: "Health", url: "https://stereo-billing.leap21.workers.dev/api/health" },
  { name: "Landing", url: "https://stereo.leap21llc.com" },
  { name: "GitHub", url: "https://github.com/leap21ai/stereo" },
];

const results = await Promise.all(
  endpoints.map(async (ep) => {
    try {
      const start = Date.now();
      const res = await fetch(ep.url, { method: "HEAD" });
      return { name: ep.name, status: res.ok ? "ok" : "error", latency: Date.now() - start };
    } catch {
      return { name: ep.name, status: "error", latency: 0 };
    }
  })
);

return (
  <StatusTable
    headers={["Endpoint", "Status", "Latency"]}
    rows={results.map((r) => ({
      cells: [r.name, r.status === "ok" ? "Online" : "Offline", `${r.latency}ms`],
      status: r.status === "ok" ? "success" : "danger",
    }))}
  />
);
```
