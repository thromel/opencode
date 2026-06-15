# Live Post-Compaction Continuation A/B: OpenAI GPT-5.5 High

Date: 2026-06-15

Command path: `--opencode-run-manifest`

Model lane: OpenCode native `openai` provider, `openai/gpt-5.5`, variant `high`.

Source compaction artifact root: `/tmp/ctxledger-noisy-live-gpt55-20260615130746/`

Fresh continuation DB: `/tmp/ctxledger-noisy-live-gpt55-20260615130746/continuation-fresh/opencode-continuation.db`

Continuation report: `/tmp/ctxledger-noisy-live-gpt55-20260615130746/continuation-fresh/report.json`

## Gate 0 Fix

The earlier live continuation attempt exposed a non-interactive CLI reliability issue: `opencode run --session ... --format json` could complete a GPT-5.5 answer and persist it in the DB while stdout emitted no JSON and the process stayed alive.

The run path now:

- polls `session.status()` after the prompt call settles instead of relying only on streamed `session.status: idle`;
- tracks emitted part IDs;
- flushes persisted assistant parts from `session.messages()` when stream events are missed;
- keeps JSON output de-duplicated.

Focused regression: `test/cli/run/run-process.test.ts` now drops `message.part.updated` and `session.status` events under a test-only hook and asserts that `--format json` exits and recovers the persisted assistant text.

## Setup

- Reused the six compacted live exports from the noisy compaction A/B.
- Imported those exports into a fresh `OPENCODE_DB` to avoid contamination from prior debug continuation attempts.
- Ran the three baseline and three ContextLedger precision-replace continuation prompts.
- Allowed the local OpenAI/ChatGPT OAuth-backed provider path; no `OPENCODE_AUTH_CONTENT` override.
- Scored exact answer fields from JSON stdout.

## Result

| Scenario | Baseline answer | Precision answer | Baseline input | Precision input | Input delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| payment retry | pass | pass | 20056 | 16919 | -3137 |
| cache invalidation | pass | pass | 20186 | 16986 | -3200 |
| parser fallback | pass | pass | 20300 | 16962 | -3338 |

Aggregate:

- Baseline answer pass rate: 3/3
- Precision answer pass rate: 3/3
- Baseline mean continuation input tokens: 20180.7
- Precision mean continuation input tokens: 16955.7
- Mean continuation input delta: -3225
- Precision continuation input was about 84.0% of baseline continuation input.
- Baseline mean output tokens: 415.7
- Precision mean output tokens: 350.7
- Baseline mean reasoning tokens: 167
- Precision mean reasoning tokens: 83.3

## Interpretation

This is the first live post-compaction continuation evidence for the project. On the three noisy scenarios, ContextLedger precision replacement matched baseline OpenCode answer correctness while using fewer continuation input tokens.

The claim is still bounded:

- It supports controlled continuation correctness, not real coding solve-rate.
- It has only three scenarios and one live repeat per lane.
- It uses exact field-answer prompts, not patch generation or tool-use continuation.
- It does not yet measure precision, unsupported claims, stale claims, or hallucination.

Defensible claim:

> On this three-scenario live GPT-5.5 continuation fixture, ContextLedger precision replacement matched baseline answer pass rate and reduced mean continuation input tokens by 3,225 tokens.

