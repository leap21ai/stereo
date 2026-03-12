# Stereo — Brochure Content Decisions

## Product & Audience

- **Product**: Stereo — open-source VS Code extension for executable markdown
- **Target audience**: Platform/DevOps engineers, developer advocates, engineering managers
- **Category**: Developer tools / Executable documentation

## Headline Formula

**Outcome-first** formula chosen: "Your Markdown Runs Now." (4 words)

Rationale: Stereo is a productivity tool that gives an existing format (markdown) new capability. The outcome-first formula ("desirable outcome without old painful way") fits perfectly. The emphasized word is "Runs" — the single capability Stereo adds.

## Stats with Sources

| Stat | Source | URL |
|------|--------|-----|
| 73% of developers use VS Code | Stack Overflow Developer Survey 2024 | https://survey.stackoverflow.co/2024/ |
| 60% of runbooks go stale within 3 months | PagerDuty 2023 State of Operations | https://www.pagerduty.com/resources/reports/state-of-operations/ |
| $0 to start — MIT licensed | stereo.dev | https://stereo.dev |

## Color Assignment

| Team Card | Icon Class | Semantic | Hue | Rationale |
|-----------|-----------|----------|-----|-----------|
| Parser | ic-exec | info | H=250 | Analytical — reads and extracts data from files |
| Renderer | ic-sync | sync | H=200 | Real-time — renders live output |
| Sandbox | ic-safety | danger | H=40 | Safety/isolation — restricted execution environment |
| Sidecar | ic-voice | ai | H=300 | Automation — proxies and injects without user action |
| Components | ic-field | success | H=160 | Operational — the UI building blocks you ship with |

| Benefit | Icon Class | Semantic |
|---------|-----------|----------|
| Zero Lock-in | ic-exec | info |
| Live Dashboards | ic-sync | sync |
| Secret Injection | ic-safety | danger |
| Auto-Refresh | ic-field | success |
| VS Code Native | ic-voice | ai |
| Open Source | ic-exec | info |

## Words-to-Avoid Scan

Source: `.agents/product-marketing-context.md`

Banned words: revolutionary, leverage, seamless, robust, cutting-edge, game-changing, disruptive, next-generation, best-in-class, world-class, synergy, empower, delightful, blazing-fast, magical

**Scan result**: Zero violations in all brochure text.

## Template Deviations

- **Team cards**: 5 cards (vs. 6 in template) — Stereo has 5 architectural modules
- **Results**: 3 cards (vs. 4 in template) — 3 concrete metrics available
- **Team section header**: "Under the Hood" instead of "Your Digital Team" — more appropriate for a developer tool describing architecture modules
- **No step 4 or step-time**: Stereo setup is instant (VS Code install), so 3 steps suffice and time estimates are unnecessary
- **Logo icon**: Lucide `zap` — represents execution/running, matches the "runs" theme
