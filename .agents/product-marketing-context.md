# Stereo — Product Marketing Context

## Product

**Stereo** is an open-source VS Code extension that makes markdown executable. Write standard `.md` files, annotate code blocks with ` ```tsx run `, and they execute inline with live output — dashboards, API monitors, runbooks, all inside your editor.

A Rust sidecar proxies HTTP calls and injects secrets from `.env` files so credentials never touch the JavaScript runtime.

## Positioning

**Category**: Developer tools / Executable documentation
**Tagline**: "Your markdown runs now."
**Elevator pitch**: Stereo turns any `.md` file into a live dashboard. No new editor, no lock-in — just VS Code and the files you already have.

### vs. Moment.dev
Moment built a whole new desktop app. Stereo ships as a VS Code extension. Same insight (markdown + executable code = best agent interface), zero lock-in. Your files stay `.md`.

### vs. Jupyter Notebooks
Notebooks pollute files with cell metadata and force a cell-based workflow. Stereo keeps raw markdown intact — the extension provides a rich rendered view alongside the normal text editor.

### vs. Observable / Grafana
Those are standalone platforms. Stereo lives where you code. No context switching, no new tab.

## Target Audience

### Primary: Platform & DevOps Engineers
- Run API health dashboards from their runbooks
- Want executable documentation that lives next to the code
- Already use VS Code + markdown daily

### Secondary: Developer Advocates / Technical Writers
- Create interactive tutorials and docs
- Need live code examples that actually run
- Publish to GitHub/GitLab as standard `.md`

### Tertiary: Engineering Managers
- Team dashboards from shared markdown files
- Want to reduce tool sprawl (Grafana + Notion + Jupyter → one `.md` file)

## Key Messages

1. **"Your markdown runs now"** — The simplest possible framing. No new tool to learn.
2. **"Dashboards in your editor"** — Concrete use case that resonates immediately.
3. **"Zero lock-in, standard files"** — Files stay `.md`. No proprietary format. Works with git.
4. **"Secrets never touch JS"** — The Rust sidecar security story for enterprise buyers.

## Value Propositions

| For | Pain | Stereo Fix |
|-----|------|-----------|
| Platform engineers | Runbooks rot because they're static | Runbooks execute and show live data |
| DevOps | Context switching between editor, Grafana, terminal | Dashboard lives in the same tab as code |
| Tech writers | Code examples go stale | Examples run inline, errors caught immediately |
| Teams | Tool sprawl (5+ tools for docs + dashboards) | One `.md` file replaces Notion + Grafana + notebooks |

## Proof Points & Stats

- **73% of developers use VS Code** — Stack Overflow Developer Survey 2024
- **Markdown is the #1 documentation format** in open-source (GitHub)
- **$0 to start** — open source, MIT licensed, VS Code Marketplace
- **60% of runbooks are out of date within 3 months** — PagerDuty 2023 State of Operations

## Pricing Model

| Tier | Price | Includes |
|------|-------|---------|
| **Open Source** | Free | Extension, parser, components, Rust sidecar, local execution |
| **Stereo Pro** | $12/user/mo | Team sync, shared secrets vault, real-time collaboration |
| **Stereo Enterprise** | Custom | SSO, audit logs, self-hosted sidecar fleet, SLA |

## Words to Avoid

revolutionary, leverage, seamless, robust, cutting-edge, game-changing, disruptive, next-generation, best-in-class, world-class, synergy, empower, delightful, blazing-fast, magical

## Brand Voice

Technical but not dry. Confident but not arrogant. Show, don't tell. Lead with the problem, not the product. Use developer vocabulary — "sidecar," "SSR," "runtime" — without explaining basics. The audience knows what VS Code is.

## Call to Action

- **Primary**: Install from VS Code Marketplace
- **Secondary**: Star on GitLab / GitHub
- **URL**: `stereo.dev` (future) / `marketplace.visualstudio.com`
