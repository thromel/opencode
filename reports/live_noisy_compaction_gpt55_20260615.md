# Live Noisy Compaction A/B: OpenAI GPT-5.5 High

Date: 2026-06-15

Command path: `--opencode-noisy-compaction-live-manifest`

Model lane: OpenCode native `openai` provider, `openai/gpt-5.5`, variant `high`.

Artifact root: `/tmp/ctxledger-noisy-live-gpt55-20260615130746/`

## Setup

- Generated all three noisy compaction scenarios with 32 distractor turns.
- Imported baseline and ContextLedger precision-replace sessions into a temporary `OPENCODE_DB`.
- Ran one local `opencode serve` process per lane with per-lane `OPENCODE_CONFIG_CONTENT`.
- Called `POST /session/:sessionID/summarize`, exported sessions, and scored actual compaction summaries.

## Result

| Scenario           | Baseline input | Precision input | Input delta | Baseline summary tokens | Precision summary tokens | Claim recall |
| ------------------ | -------------: | --------------: | ----------: | ----------------------: | -----------------------: | -----------: |
| payment retry      |           3834 |             719 |       -3115 |                     274 |                      249 |     both 6/6 |
| cache invalidation |           3889 |             715 |       -3174 |                     360 |                      330 |     both 6/6 |
| parser fallback    |           3899 |             710 |       -3189 |                     462 |                      318 |     both 6/6 |

Aggregate:

- Baseline mean input tokens: 3874
- Precision mean input tokens: 714.7
- Baseline mean summary tokens: 365.3
- Precision mean summary tokens: 299
- Total claim recall: baseline 18/18, precision 18/18

Interpretation: precision replacement preserved every scored claim while using about 18.4% of baseline compaction input on the harder noisy fixture.

## Boundary

This is a bounded live compaction-quality and token-efficiency result, not solve-rate evidence. The original follow-up continuation attempt exposed a CLI resume/reporting issue: `opencode run --session ... --format json` completed a GPT-5.5 answer and stored the correct text in the temp DB, but the process remained alive after `exiting loop` and emitted no JSON stdout before timeout.

Follow-up: `reports/live_continuation_gpt55_20260615.md` documents the Gate 0 CLI fix and the first successful six-row live post-compaction continuation A/B.
