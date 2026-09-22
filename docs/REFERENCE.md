# api-diff-watch — implementation reference

Source revision: `efc00a00457e390bdb3ed023f272ab97e5efba34`. This reference records source declarations; it is not a transcript of a successful run.

## Entrypoint and runtime

[package.json](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/package.json) declares `index.js`. Node.js `>=18` and npm.

Executable mapping: `api-diff-watch` → `./index.js`, `adw` → `./index.js`.

## Supported workflow

JSON-path selection; ignored fields and schema-only mode; request headers and timeouts; optional change log.

Baselines persist locally and can include response data. --on-change launches a command using space-split arguments, not a shell. Polling observes snapshots and can miss changes between requests.

## Command reference

The commands below use the installed executable name. From the pinned checkout, replace it with the `node` entrypoint shown above. Options and command branches were cross-checked against captured source; examples are not execution transcripts.

| Flag | Default | Description |
|------|---------|-------------|
| `--interval <sec>` | See mismatch below | Explicit seconds, converted to milliseconds |
| `--header <Name: value>` | — | Add a request header; `$ENV_VAR` references are resolved silently |
| `--method <METHOD>` | `GET` | HTTP method |
| `--body <json>` | — | Request body for POST / PUT |
| `--jq <path>` | — | Watch a specific JSON path (e.g. `.data.users`) |
| `--ignore <fields>` | — | Comma-separated fields to skip (e.g. `.timestamp,.id`) |
| `--schema-only` | `false` | Alert only on structural changes, not value changes |
| `--timeout <ms>` | `10000` | Per-request timeout |
| `--on-change <cmd>` | — | Run a command when a change is detected (space-split arguments; no shell) |
| `--log <file>` | — | Append all changes to a JSON file |
| `--once` | `false` | Fetch once, compare to baseline, exit 0 / 1 |

## Polling-default defect

The help text advertises 30 seconds, but the parser initializes `interval` to `30` and passes it directly to `setTimeout` in milliseconds. Omitting the flag therefore schedules roughly 30 ms between completed checks. Pass `--interval 30` explicitly for a 30-second delay, or use `--once` for one comparison. This mismatch needs a code fix and regression test before unattended polling.

## Package scripts

| Script | Exact command |
| --- | --- |
| `test` | `node --test` |

## Implementation sources

[index.js](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/index.js).

## Verification boundary

No repository code, tests, network operation, hook installer or migration was executed for this review. Source inspection supports the documented interface; runtime correctness and external-service compatibility remain unverified.
