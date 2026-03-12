# Welcome to Stereo

Your markdown runs now. Write ```tsx run in any code block and see live output inline.

## Quick Start

Try clicking **Run** on this block:

```tsx run
return (
  <MetricCard
    label="Hello"
    value="It works!"
    status="success"
    subtitle="Your first executable block"
  />
);
```

## Fetch Live Data

```tsx run
const res = await fetch("https://stereo-billing.leap21.workers.dev/api/health");
const data = await res.json();

return (
  <DashGrid cols={2}>
    <MetricCard label="API Status" value={data.status} status={data.status === "ok" ? "success" : "danger"} />
    <MetricCard label="Version" value={data.version} status="neutral" />
  </DashGrid>
);
```

## Auto-Refresh

Add `refresh=10s` to poll automatically:

```tsx run refresh=10s
const now = new Date().toLocaleTimeString();
return <MetricCard label="Current Time" value={now} status="success" subtitle="Refreshes every 10s" />;
```

## Built-in Components

| Component | Purpose |
|-----------|---------|
| `MetricCard` | Display a key metric with status color |
| `DashGrid` | CSS grid layout for cards |
| `Sparkline` | Bar chart with thresholds |
| `StatusTable` | Table with status indicators |

## Snippets

Type these in any `.md` file for quick templates:

- `stereo` — basic run block
- `stereo-metric` — MetricCard with fetch
- `stereo-dashboard` — full dashboard grid
- `stereo-status` — endpoint status table
- `stereo-sparkline` — sparkline chart

## Learn More

- [Documentation](https://stereo.leap21llc.com)
- [Source Code](https://github.com/leap21ai/stereo)
- [Report Issues](https://github.com/leap21ai/stereo/issues)
