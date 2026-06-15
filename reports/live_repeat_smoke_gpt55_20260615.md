# Live GPT-5.5 Repeat Smoke: Gate 0 + Cache-Aware Accounting

Date: 2026-06-15

Artifact root: `data/ContextLedger/live-repeat-gpt55-20260615-smoke/`

Model lane: OpenCode native `openai` provider, `openai/gpt-5.5`, variant `high`.

Scope: one noisy compaction scenario (`payment-retry`) with two post-compaction continuation repeats per condition.

## Why this run exists

This run refreshes the live evidence with durable in-repo artifacts and exercises the failure mode found during continuation testing: imported compacted sessions could persist the correct current GPT-5.5 answer while `opencode run --session --format json` emitted an older imported assistant handoff line as the final scored text.

Gate 0 is now:

- non-interactive JSON output exits deterministically;
- stdout text comes from the assistant answer created by the current prompt;
- stale imported assistant text is not replayed into scored stdout;
- persisted session exports and stdout agree on the current continuation answer.

## CLI fix

`opencode run --format json` now uses the persisted session state as the settlement source for assistant parts. It keeps the event stream for run completion and errors, but does not score old streamed `message.part.updated` events as current JSON text.

Selection now prefers the assistant message created after the pre-run message snapshot, with parentage to a new user message when available. This avoids trusting stale `session.prompt` return values from imported sessions whose older compacted assistant messages may sort later than the current turn.

Focused regression coverage:

- JSON output remains parseable.
- Missing stream text and idle events are recovered from persisted messages.
- Older stored assistant text is not replayed after the current prompt.

## Live compaction result

Report: `data/ContextLedger/live-repeat-gpt55-20260615-smoke/live/live-report.json`

| Lane | Claim recall | Claim precision | Unsupported | Stale | Summary tokens | Prompt tokens | Input | Cache read |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline OpenCode | 1.00 | 1.00 | 0.00 | 0.00 | 340 | 3,845 | 517 | 3,328 |
| ContextLedger precision replacement | 1.00 | 1.00 | 0.00 | 0.00 | 249 | 719 | 719 | 0 |

Paired delta:

- Claim recall delta: `0`
- Claim precision delta: `0`
- Summary token delta: `-91`
- Prompt-token delta: `-3,126`
- ContextLedger prompt tokens were `18.7%` of baseline for this compaction call.

Use `promptTokens = input + cacheRead` for this lane. Raw `input` alone is misleading because OpenAI prompt-cache reads can move most of the submitted context out of the `input` field.

## Live continuation result

Report: `data/ContextLedger/live-repeat-gpt55-20260615-smoke/continuation/report.json`

Prompt: answer from retained conversation context only, no tools, exact field format.

Expected fields:

`marker=NOISY_LEDGER_ALPHA_20260615;header=x-context-ledger-noisy-id;file=src/payments/retry.ts;test=tests/payments/retry.test.ts::keeps_idempotency;attempts=2;symbol=computeRetryPlan`

| Lane | Runs | Answer pass rate | Mean prompt tokens | Mean input | Mean cache read | Mean output | Mean reasoning |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline OpenCode | 2 | 1.00 | 43,406 | 10,894 | 32,512 | 456 | 362.5 |
| ContextLedger precision replacement | 2 | 1.00 | 40,106 | 5,290 | 34,816 | 368 | 77 |

Paired continuation delta:

- Answer-pass delta: `0`
- Mean prompt-token delta: `-3,300`
- Mean output-token delta: `-88`
- Mean reasoning-token delta: `-285.5`

Stdout check:

- All four continuation stdout files contain the current `marker=NOISY_LEDGER_ALPHA_20260615` answer.
- None contain `Ready for handoff after compaction`.

## Interpretation

This is a successful Gate 0 and repeat-smoke result, not a broad "beats OpenCode" result.

Defensible claim:

> On one durable live GPT-5.5 noisy-compaction scenario, ContextLedger precision replacement preserved all scored compaction claims and matched baseline continuation answer correctness across two repeats, while using fewer cache-aware prompt tokens in both compaction and continuation.

Current evidence does not yet support:

- broad OpenCode solve-rate improvement;
- real patch-generation improvement;
- robustness across repositories;
- robustness across many task types;
- repeated-compaction behavior;
- total end-to-end cost advantage across full coding sessions.

## Validation

Commands:

```text
/tmp/opencode-bun-1.3.14/bin/bun test test/cli/run/run-process.test.ts
/tmp/opencode-bun-1.3.14/bin/bun test test/session-context-ledger-benchmark.test.ts
```

Result:

- `test/cli/run/run-process.test.ts`: 6 pass, 0 fail
- `test/session-context-ledger-benchmark.test.ts`: 81 pass, 0 fail

