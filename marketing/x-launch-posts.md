# Stereo — X.com Launch Posts

Account: **@leap21ai**

---

## 1. Launch Thread (5 tweets)

### Tweet 1 — Hook
**Post Monday 10am ET**

> Your runbooks are lying to you. 60% go stale within 3 months. The code examples don't match prod. The curl commands have the wrong endpoints. What if your docs just... ran themselves?

---

### Tweet 2 — Reveal
**Post Monday 10am ET (thread)**

> We built Stereo — a VS Code extension that makes markdown executable.
>
> Write \`\`\`tsx run in any .md file. Get live dashboards, API health checks, charts. All inline in your editor.
>
> Your markdown runs now.

[IMAGE] Screen recording GIF: opening a .md file in VS Code, typing a tsx run block, and seeing a live metric card render in the preview pane.

---

### Tweet 3 — How It Works
**Post Monday 10am ET (thread)**

> How it works:
>
> 1. Write markdown like you always do
> 2. Add \`\`\`tsx run to any code block
> 3. Open the preview pane — it runs
>
> Built-in components for MetricCard, Sparkline, StatusBadge. Or bring your own React. No config files, no build step.

[IMAGE] Side-by-side screenshot: raw markdown on the left, rendered dashboard with live metrics on the right.

---

### Tweet 4 — Differentiation
**Post Monday 10am ET (thread)**

> Moment.dev built a whole new editor to solve this. We built a VS Code extension.
>
> Same insight — executable markdown is the right interface. Zero lock-in. Your files stay .md. They render on GitHub. They diff in PRs. They work without Stereo installed.

---

### Tweet 5 — CTA
**Post Monday 10am ET (thread)**

> Stereo is free, open source, MIT licensed.
>
> Install: https://marketplace.visualstudio.com/items?itemName=leap21.stereo
>
> Star/fork: https://gitlab.leap21llc.com/leap21/stereo
>
> Docs: https://stereo.leap21llc.com
>
> We're shipping fast — come build with us.

---

## 2. Standalone Posts (drip across the week)

### Post A — Secret Injection
**Post Tuesday 11am ET**

> Stereo has a Rust sidecar that proxies HTTP calls and injects secrets from .env files. Your API keys never touch the JavaScript runtime.
>
> Executable markdown with actual security guarantees, not just "trust me bro."

---

### Post B — Built-in Components
**Post Wednesday 10am ET**

> Stereo ships with built-in components: MetricCard, Sparkline, StatusBadge, DataTable.
>
> Drop them into any \`\`\`tsx run block. No npm install, no imports. They just work.

[IMAGE] Screenshot showing a dashboard with 4 MetricCards across the top, a Sparkline chart, and a DataTable — all rendered from a single .md file.

---

### Post C — Auto-Refresh
**Post Thursday 11am ET**

> Add refresh=30s to a code block in Stereo and it polls your API every 30 seconds. Live dashboards from a markdown file. No WebSocket server. No Grafana instance. Just .md.

---

### Post D — Zero Lock-in
**Post Friday 10am ET**

> Stereo files are just .md. Open them on GitHub — they render as normal markdown. Open them in Vim — they're normal markdown. Delete the extension — still normal markdown.
>
> Your docs should outlive your tools.

---

### Post E — Visual / Demo
**Post Saturday 12pm ET**

> One .md file. Four API health checks. Two charts. Live metrics. No Grafana, no Notion, no Jupyter.
>
> This is Stereo.

[IMAGE] Full-screen screenshot of a polished dashboard built entirely in a single markdown file — multiple MetricCards, a Sparkline, and a status table showing green/red API endpoints.

---

## 3. Engagement Bait Posts

### Post F — Hot Take
**Post Tuesday 3pm ET**

> Jupyter notebooks were a mistake for documentation.
>
> Cell metadata pollutes the file. Git diffs are unreadable. You need a running kernel to read the doc. Markdown was right there the whole time — it just needed to be executable.

---

### Post G — Poll
**Post Wednesday 3pm ET**

> Where do you build internal dashboards?
>
> - Grafana
> - Notion + embedded iframes
> - Custom React app
> - A markdown file (seriously)

[POLL] Use X poll feature with the 4 options above.

---

### Post H — Question
**Post Thursday 3pm ET**

> What's in your runbook right now that should be executable?
>
> Incident response? Deployment checklists? API health checks? On-call handoff?
>
> Genuinely curious — we're building Stereo around real workflows.
