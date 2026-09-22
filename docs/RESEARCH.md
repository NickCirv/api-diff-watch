# api-diff-watch — documentation research

Reviewed 21 September 2026. Public GitHub source only.

## Revision and scope

- Commit: [`efc00a00457e390bdb3ed023f272ab97e5efba34`](https://github.com/NickCirv/api-diff-watch/commit/efc00a00457e390bdb3ed023f272ab97e5efba34).
- Tree: `e3d79ac2d48436c466d60283a1bece62685804ba`; truncated: `false`.
- Capture: 6 of 6 eligible text files; all eligible text files.
- Method: package and entrypoint inspection, implementation-interface review, targeted behavior/limitation inspection, and test-source review. This is not an exhaustive correctness or security audit.
- Commands run against repository code: **none**. External services, deployment and npm publication were not verified.

## Claim and evidence map

| Documentation claim | Pinned evidence | Assessment |
| --- | --- | --- |
| Runtime, executable and development commands | [package.json](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/package.json) | Source declaration inspected; runtime unverified |
| Polls an HTTP endpoint and compares responses against a saved baseline. | [index.js](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/index.js) | Implementation interfaces inspected; behavior not executed |
| JSON-path selection; ignored fields and schema-only mode; request headers and timeouts; optional change log. | [index.js](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/index.js) | Source-backed scope, not a test result |
| Baselines persist locally and can include response data. --on-change launches a command using space-split arguments, not a shell. Polling observes snapshots and can miss changes between requests. | [index.js](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/index.js) | Material limits documented; service compatibility remains open |
| Existing checks | [test/smoke.test.js](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/test/smoke.test.js) | Test source read; no passing-run claim |

## Documentation inventory and disposition

| Existing document | Decision |
| --- | --- |
| [README.md](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/README.md) | Rewritten with source-specific purpose, direct checkout setup, limitations and verification status. Old section fragments retained where practical. |

Added `docs/REFERENCE.md` for the observed implementation and command surface, and this research record. Protected license and attribution files remain in their original locations without edits. No source or product UI was changed.

## Quality dimensions

| Dimension | Status | Evidence / next step |
| --- | --- | --- |
| Pinned provenance | Verified | Captured commit, tree and per-file hashes recorded below |
| Interface documentation | Partially verified | Source inspection only; run clean-checkout quickstart |
| Runtime behavior | Unverified | No repository execution in this review |
| Test results | Unverified | Existing tests were not run |
| Deployment / package availability | Unverified | No remote publish or live-service check |
| Visual / link checks | Unverified | Portfolio renderer and independent QA are separate from this authoring step |

## Editorial follow-up

Follow-up source inspection found an interval mismatch: default 30 is consumed as milliseconds, while explicit --interval values are converted from seconds. Documented explicit interval or --once; no code change made.

## Unresolved issues

Baselines persist locally and can include response data. --on-change launches a command using space-split arguments, not a shell. Polling observes snapshots and can miss changes between requests.

## Captured source inventory

This lists captured provenance, not a claim that every line received a full audit. Binary/generated/excluded files are outside the eligible text capture.

| File | SHA-256 | Bytes |
| --- | --- | --- |
| [LICENSE](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/LICENSE) | `68729cab364d82364078b08d8580ccfa51dc69c81a7d64e8d8d47a1da6c9349d` | 1072 |
| [README.md](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/README.md) | `26239994202f49ab791c409c446c48e5bc37953066a0d506e19d00f5db69016f` | 2845 |
| [package.json](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/package.json) | `fc2063198a56351b8347ad5e0af0917dff5d2cb535b0a50a69e6291c942976ea` | 846 |
| [.github/workflows/ci.yml](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/.github/workflows/ci.yml) | `433fbf65635a767ef5cd787147104c248d0cea6bbd6523c6c862f915e0e3206a` | 384 |
| [index.js](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/index.js) | `2b7ac2e7e5d303cb9dce2e913ebf6de1fb27b7457118dfffdaaef7fff0092c23` | 16702 |
| [test/smoke.test.js](https://github.com/NickCirv/api-diff-watch/blob/efc00a00457e390bdb3ed023f272ab97e5efba34/test/smoke.test.js) | `4e107fe059a90eaaa70dc98e0563d1c6f6e66e9e692b7525f16ce8dcb3755ffa` | 453 |
