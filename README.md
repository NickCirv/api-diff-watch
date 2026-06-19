<div align="center">

# api-diff-watch

**Watch API endpoints and get alerted the moment responses change — structured JSON diffs, zero dependencies.**

[![License: MIT](https://img.shields.io/badge/License-MIT-0B0A09?style=flat-square&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Node >=18](https://img.shields.io/badge/Node-%3E%3D18-0B0A09?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)

</div>

## Install

```bash
# Run directly — no install needed
npx github:NickCirv/api-diff-watch <url> [options]

# Or install globally
npm install -g github:NickCirv/api-diff-watch
```

## Usage

```bash
# Watch an endpoint every 30 s (default)
adw https://api.example.com/users

# Watch every 60 s, with an auth header read from env
adw https://api.example.com/me --interval 60 --header "Authorization: Bearer $API_TOKEN"

# Alert only when the JSON schema changes (new / removed fields)
adw https://api.example.com/data --schema-only

# Watch a specific JSON path and ignore noisy timestamp fields
adw https://api.example.com/feed --jq ".data.items" --ignore ".timestamp,.requestId"

# One-shot CI check: exit 0 = no change, exit 1 = changed
adw https://api.example.com/schema --once --schema-only
```

| Flag | Default | Description |
|------|---------|-------------|
| `--interval <sec>` | `30` | Poll interval in seconds |
| `--header <Name: value>` | — | Add a request header; `$ENV_VAR` references are resolved silently |
| `--method <METHOD>` | `GET` | HTTP method |
| `--body <json>` | — | Request body for POST / PUT |
| `--jq <path>` | — | Watch a specific JSON path (e.g. `.data.users`) |
| `--ignore <fields>` | — | Comma-separated fields to skip (e.g. `.timestamp,.id`) |
| `--schema-only` | `false` | Alert only on structural changes, not value changes |
| `--timeout <ms>` | `10000` | Per-request timeout |
| `--on-change <cmd>` | — | Run a command when a change is detected (no shell, safe from injection) |
| `--log <file>` | — | Append all changes to a JSON file |
| `--once` | `false` | Fetch once, compare to baseline, exit 0 / 1 |

## What it does

On first run, `api-diff-watch` fetches the endpoint and saves a baseline (MD5 hash + pretty JSON) to `.adw-baseline/`. On every subsequent poll it compares the live response to that baseline and prints a structured diff only when something changes — coloured by type (yellow = changed, green = added, red = removed). Non-JSON responses get a unified text diff. The `--once` flag makes it useful in CI pipelines: exit code 1 signals a regression.

```
⚡ Change detected at 14:32:05
  ~ /data/users/0/email: "old@email.com" → "new@email.com"
  + /data/meta/updatedAt (new field)
  - /data/legacy/token (removed)
```

---
<sub>Zero dependencies · Node >=18 · MIT · by <a href="https://github.com/NickCirv">NickCirv</a></sub>
