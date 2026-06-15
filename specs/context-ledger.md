# ContextLedger OpenCode Experiment

## Goal

Add a provenance-preserving context layer to OpenCode that can be evaluated before spending model budget, then used during OpenCode compaction and long-session continuation.

## Benchmark Survey

| Benchmark | Use | Notes |
| --- | --- | --- |
| ContextBench | Primary context-retrieval benchmark | 1,136 issue-resolution tasks from 66 repositories across 8 languages, with expert gold contexts and trajectory-level file/block/line recall, precision, and F1. This remains the first external target because it directly measures whether OpenCode retrieved and retained the right context before patching. |
| SWE-Explore | Repository-exploration benchmark | Newly released 848-issue, 203-repository line-region benchmark. It asks explorers to return ranked source regions under a fixed line budget, so it maps directly to ContextLedger event ordering, span recall, line recall, and AUC-line metrics. |
| SWE-ContextBench | Cross-task experience-reuse benchmark | Current v3 scale is 1,476 tasks from 51 repositories across 9 languages, with 1,100 base tasks and 376 related tasks. Best second target after per-session selection is stable because it tests whether compact prior trajectories or summaries help related tasks without negative transfer. |
| Agent Retrieval Bench | Fast action-oriented retrieval smoke | 225 manually curated samples across `code2test`, `comment2context`, and `trace2code`. Useful before full trajectories because it isolates whether path priors and provenance packets can find files an agent should read before editing. |
| CORE-Bench | Repository-search stress benchmark | Recent requirement-driven repository-search benchmark with three levels: code understanding, issue-to-edit localization, and broader-context retrieval. Useful once public data is populated; as of June 14, 2026 the Hugging Face dataset page exists but reports no data files beyond README/metadata. |
| CodeScaleBench | Large-codebase context benchmark | Evaluates whether agents can use external context-retrieval tools on realistic large and enterprise-scale repositories. Useful later for testing ContextLedger outside SWE-bench-sized single repositories. |
| SWE-bench Verified | Final single-issue patch benchmark | Human-filtered 500-instance subset for reliable end-to-end solve rate. Use only after process metrics improve, because it hides whether a failure came from retrieval, retention, planning, or patch generation. |
| SWE-EVO | Long-horizon software-evolution benchmark | 48 release-level evolution tasks across 7 Python repositories, averaging 21 edited files and 874 tests per instance. Strong fit for evaluating whether ledger compaction helps sustained multi-file work. |
| SWE-Marathon | Ultra-long-horizon stress benchmark | 20 multi-hour software-engineering tasks with logged attempts averaging 27.2M tokens. Future stress target for artifact-backed memory, self-verification, and compaction durability rather than near-term selector tuning. |

Deep-search update on June 14, 2026:

- Primary sources refreshed: [ContextBench](https://arxiv.org/abs/2602.05892), [ContextBench code](https://github.com/EuniAI/ContextBench), [SWE-Explore](https://arxiv.org/abs/2606.07297), [SWE-ContextBench](https://arxiv.org/abs/2602.08316), and [Agent Retrieval Bench V1](https://agent-retrieval-bench.github.io/).
- ContextBench is the current implementation target, not just a reference benchmark. The in-fork adapter already exports `pred_steps`, `pred_files`, and `pred_spans`, invokes the official evaluator, and compares selector policies against official file/span/line utility.
- SWE-Explore is now a concrete second process benchmark because the released public JSONL has line-level core and optional regions. The in-fork adapter converts its public rows into ContextLedger cases with core regions as gold events and optional regions as competing context events; event cost is line-count based to match SWE-Explore's fixed line-budget framing.
- SWE-ContextBench is the next research-fit target because ContextLedger already has the right primitives for experience reuse: typed events, provenance handles, recoverability, compact summaries, and policy-based retrieval. The first ingestion bridge now turns public task rows into replay records; the remaining pieces are full relationship/parquet ingestion, a reusable experience store, and a task-sequence runner.
- Agent Retrieval Bench, CORE-Bench, and CodeScaleBench should shape retrieval design before another compaction-only tweak. Agent Retrieval Bench gives cheap path-prior probes, CORE-Bench gives requirement-driven repository-search labels for issue-to-edit and broader-context retrieval once its release data is actually available, and CodeScaleBench is the later large-codebase/external-context stress lane.
- SWE-bench Verified remains the final public single-issue patch gate. It should not be used alone for context-layer iteration because it is too coarse to distinguish retrieval gains from model/scaffold variance.
- SWE-EVO and SWE-Marathon are the right long-horizon ambition targets. They are not first-step benchmarks, but they make the architectural requirement concrete: the ledger must survive many edits, tests, summaries, and task pivots without losing the dependencies needed for later work.
- The generated benchmark registry is the machine-readable evidence-boundary map for this survey. It records which adapters are integrated, partial, or watchlisted and names the claims each lane can and cannot support before a report is treated as promotion evidence.

Current benchmark priority:

1. Finish ContextBench real OpenCode trajectory export and official evaluation.
2. Run SWE-Explore line-budget reports to stress ranked region ordering and AUC-line behavior on a released public dataset.
3. Finish public Agent Retrieval Bench V1 access or local corpus setup for action-specific retrieval-only regression tests.
4. Run SWE-ContextBench relationship-filtered replay reports to test summary and trajectory reuse.
5. Use SWE-bench Verified for end-to-end solve-rate smoke once process metrics move.
6. Treat SWE-EVO and SWE-Marathon as long-horizon validation for persistent ledger storage and compaction durability.

## First In-Fork Slice

The first OpenCode implementation is intentionally pure and testable:

1. Convert V2 `SessionMessage` history into typed ContextLedger events.
2. Score events with a deterministic `balanced-frontier` policy that protects constraints, test evidence, diffs, and low-recoverability context.
3. Add a `diverse-frontier` variant that greedily penalizes repeated event kinds and duplicate file coverage under tight budgets.
4. Add a `query-frontier` variant that uses non-budget task text, such as a ContextBench issue statement, as ranking evidence.
5. Add a `relevance-frontier` variant that uses BM25-style query scoring plus provenance/kind priors to favor precise code context over noisy shell/test/tool evidence, while neutralizing inferred active-test-file boosts for query-scored code context.
6. Add a `coherence-frontier` variant that starts from relevance scoring, then boosts neighboring code-context events from an already selected implementation file.
7. Add a structural path prior that distinguishes implementation, test, docs, generated, and fixture paths under query-scored code context.
8. Add a `file-frontier` variant that ranks file clusters before packing same-file spans, inspired by broader-context retrieval rather than isolated snippet retrieval.
9. Add an `adaptive-frontier` meta-policy that scores relevance, coherence, and file-cluster candidates with a budget-normalized quality objective.
10. Add a `fusion-frontier` variant that uses reciprocal-rank fusion across relevance, coherence, file-cluster, and frontier-selection ranks, then packs with a small same-file coherence bonus.
11. Add a `portfolio-frontier` variant that uses `file-frontier` for tight budgets and `fusion-frontier` for larger budgets, matching the broad fixed-policy envelope without learned rules.
12. Add a `robust-frontier` variant that uses the two-window stability report's maximin fixed policies: `adaptive-frontier` at 200/400/1200-style budgets and `file-frontier` around 800.
13. Add a `utility-frontier` variant that follows broad official-utility evidence: `file-frontier` through 1000 tokens and `coherence-frontier` above that.
14. Add a `target-balanced-frontier` variant that follows multi-target evidence: `file-frontier` through 1000 tokens and `fusion-frontier` above that.
15. Add an `official-frontier` candidate derived from current official-evaluator samples: `adaptive-frontier` at <=400 and >1000 tokens, `fusion-frontier` in the middle budget band.
16. Normalize ranking terms across prose and code identifiers by splitting camel/Pascal case and simple suffix variants.
17. Preserve precise file spans from completed read and grep tool structured output when constructing ledger events.
18. Render a provenance packet with message/part handles, file hints, and span hints.
19. Inject the packet into V2 and V1 default compaction prompts before raw serialized history.
20. Compare frontier policies against a recency baseline in a synthetic unit benchmark.
21. Keep the benchmark adapter close to ContextBench's unified prediction shape: `pred_steps`, `pred_files`, `pred_spans`, and `model_patch`.
22. Emit per-case policy diagnostics so selector changes can be driven by oracle gaps and regret rather than aggregate tables alone.
23. Emit cross-validated budget-router diagnostics so simple train-fold policy routing can be tested before adding production selector variants.
24. Emit cross-validated observable-feature router diagnostics so instance-specific routing can be evaluated before it affects compaction.
25. Emit reusable feature-router rule artifacts and held-out evaluations so learned routing can be tested without retraining on evaluation cases.
26. Emit multi-split promotion reports so a learned router is marked promotable only after frozen rules transfer across disjoint case windows.
27. Emit multi-split fixed-policy stability reports so deterministic policies can be judged by disjoint-window robustness rather than aggregate-only performance.
28. Emit multi-target fixed-policy comparison reports so event F1, span F1, line F1, and official utility tradeoffs are visible before promoting a selector.
29. Emit policy-portfolio reports so budget-to-policy maps can be derived from either a single target or multi-target minimax regret before they are encoded as runtime selectors.
30. Emit policy-portfolio stability reports so a budget-to-policy map derived on one split must transfer to held-out splits before being treated as a runtime candidate.
31. Promote `portfolio-frontier` as an earlier `DEFAULT_SELECTION_POLICY` candidate after the first multi-target fixed-policy max-loss report identified it as the stronger transfer candidate before test-id sanitization.
32. Emit paired default-relative official evaluator comparisons with confidence intervals so small mean gains are not mistaken for selector-promotion evidence.
33. Emit selection-delta reports that explain policy differences through gained/lost files, spans, and policy-only events for concrete benchmark cases.
34. Sanitize ContextBench test identifiers so only path-like test ids become file hints; bare test names remain evidence text instead of bogus file paths.
35. Promote `official-frontier` as `DEFAULT_SELECTION_POLICY` after sanitized official, proxy, and split-stability evidence all favored it over the previous `portfolio-frontier` default.
36. Add an `action-aware-frontier` experiment that keeps the `official-frontier` selected set but reorders code-context and diff events by inferred task intent, so rendered context can put likely target files earlier without changing retention recall.
37. Add local trajectory AUC coverage metrics to the in-process benchmark summary and target reports so ordering-only changes are visible before invoking the official evaluator.
38. Add a gated `intent-frontier` experiment that lets explicit structured task intent affect selection under tight budgets, not just rendered order. For `code2test`-style work with a `changed_file` signal it can trade implementation-file bias for related-test retention; for unstructured issue prose it falls back to `official-frontier`.
39. Add a SWE-Explore adapter that converts released public JSONL rows into line-budget ContextLedger cases. Core read regions become gold events; optional read regions become non-gold competing context; event token cost is the region line count so existing budgets can model SWE-Explore's fixed line budgets.
40. Add an experimental `exploration-frontier` selector for line-region exploration reports. It keeps `official-frontier` unchanged, but delegates to `coherence-frontier` after a capped full-public run showed `coherence-frontier` was the strongest fixed policy for both line-F1 and AUC-line across the measured SWE-Explore budgets.
41. Add SWE-Explore official-style JSONL and summary export for ContextLedger selections, using the released evaluator's metric family over ranked finite line regions: precision/recall/F1, hit/noise rates, weighted core coverage, context efficiency, nDCG@100/300/500, recall@100/300/500, and first useful hit.
42. Add a non-oracle SWE-Explore repository-candidate mode. Given local repo snapshots plus an issue map, the CLI chunks source files, lexically prefilters candidate chunks, converts them into ContextLedger `code-context` events, and marks gold IDs only by overlap with benchmark core regions. This avoids using core/optional trajectory regions as the candidate pool.
43. Add automatic SWE-Explore issue-text lookup for public rows. `--swe-explore-auto-issue-map` fetches issue statements from the matching SWE-bench-family source dataset with bounded retry for transient Hugging Face `429`/`5xx` responses, including the `instance_` prefix normalization needed by SWE-bench Pro ids.
44. Add a `candidate-rank-frontier` experiment for pre-ranked explorer candidates. It preserves the candidate order produced by the repository chunker under the token budget, giving a direct baseline for "how good is the upstream explorer/ranker?" before compaction-oriented heuristics reorder the packet.
45. Add `--swe-explore-prepare-repos` to materialize source-map rows into detached git checkouts under `--swe-explore-repos-root`. This makes non-oracle SWE-Explore repo-candidate runs reproducible from public rows plus source metadata instead of requiring manually prepared snapshots.
46. Add `--swe-explore-instance-ids` so real repo-candidate slices can name exact non-contiguous public instances. This avoids hand-written temporary JSONL files and makes small evidence slices reproducible.
47. Add `--swe-explore-chunk-sweep-output` with `--swe-explore-chunk-sweep-lines` so repo-candidate experiments can compare chunk granularities inside the benchmark harness instead of relying on external shell loops.
48. Add `--swe-explore-multiscale-chunk-lines` plus an experimental `budget-rank-frontier` selector. The repo-candidate generator can now emit multiple chunk sizes in one case, and the selector prefers 40-line chunks for tight budgets, 80-line chunks for medium budgets, and larger chunks only beyond the current measured range.
49. Rank repository files before chunking in SWE-Explore repo-candidate mode. The previous implementation truncated to the first `--swe-explore-max-repo-files` text files before scoring chunks, which dropped all gold candidates for large repositories such as scikit-learn and django. The new path prefilter uses normalized path/query terms to select files, while leaving chunk-content ranking on simpler text terms to avoid regressing the earlier xarray slice.
50. Add `--swe-explore-repo-ranker` as an explicit benchmark-only knob for repo-candidate chunk ordering. The first alternate ranker is `bm25`; it is useful for A/B diagnostics, but current evidence rejects it as a default because it regresses xarray high-budget region recall.
51. Add a capped `structural` repo ranker that keeps lexical chunk ranking as the base score, then adds small bounded bonuses for issue terms that match code identifiers and definition anchors. This tests symbol/class/function-style evidence without letting normalized full-text matching dominate the packet.
52. Promote `structural` as the default SWE-Explore repo-candidate ranker after a broader 12-repository prepared slice improved both `candidate-rank-frontier` and `budget-rank-frontier` at every measured budget. This is a benchmark generator default, not an OpenCode runtime compaction default.
53. Add `--swe-explore-ranker-sweep-output` so repo-ranker comparisons can be regenerated in one benchmark run across lexical, BM25, structural, and neighborhood rankers instead of stitched together from separate CLI invocations.
54. Add an experimental `structural-neighbor` repo ranker inspired by graph-guided localization work. It keeps the capped structural score as the base, then gives a bounded decaying bonus to chunks near same-file structural anchors. This is a lightweight neighborhood expansion, not a full parser-backed call/import graph.
55. Add an explicit `dependency-neighbor` repo ranker that infers parser-light import/path/definition relationships between files and applies a capped cross-file bonus from strong structural anchors. It is not part of the default ranker sweep because current evidence is mixed and it is more expensive than the stable rankers.
56. Add `--swe-explore-ranker-gate-transfer-output` so one-stump ranker gates can be trained on one saved ranker-sweep JSON and evaluated on other saved sweep splits without rerunning repository chunking. The sweep artifact now carries compact per-case baseline/candidate metrics as well as feature deltas, which makes cross-split transfer checks possible from JSON alone.
57. Add an experimental `anchored-neighbor` repo ranker. It keeps structural scoring as the base, then expands only from high-confidence same-file anchors with a shorter radius and lower bonus cap than `structural-neighbor`. The intent is to test confidence-filtered local expansion without parser-light dependency fanout.
58. Add an experimental `coverage-rank-frontier` selector. It keeps `budget-rank-frontier`'s chunk-scale preference, but suppresses near-complete duplicate line spans before falling back to candidate rank. It is a redundancy guard for multiscale candidate pools, not a runtime default.
59. Carry model variants through manual session summarization so live compaction probes can use the same `openai/gpt-5.5 --variant high` lane as normal prompts.
60. Add `--swe-explore-ranker-portfolio-output` so saved ranker-sweep JSON can derive a budget-to-ranker map without rerunning repository chunking. This is a benchmark-only report for explaining fixed ranker choices, not a runtime selector.
61. Add a `hybrid-rrf` SWE-Explore repo ranker. It applies reciprocal-rank fusion over lexical, BM25, structural, same-file neighborhood, anchored-neighborhood, and parser-light dependency-neighborhood rankings. This tests ensemble retrieval as a different paradigm from hand-picking one scorer. After bounded mixed dev/held-out calibration and the full verified broad50 transfer run, it is included in the default offline ranker sweep so future benchmark reports do not miss the strongest current high-budget final-retrieval candidate; it is still not a runtime default.
62. Add `--swe-explore-ranker-portfolio-stability-output` so a ranker portfolio learned on one saved SWE-Explore split can be frozen and evaluated on disjoint saved splits before any budget-to-ranker map is promoted.
63. Add an experimental `mmr-rank-frontier` selector inspired by maximal marginal relevance. It greedily keeps candidate rank and budget-scale pressure while penalizing duplicate spans and rewarding new files. The first transfer/remaining SWE-Explore runs reject it as a promotion candidate, which is still useful evidence about over-diversifying repo-candidate packets.
64. Add a benchmark-only experience-replay lane inspired by SWE-ContextBench. `--experience-replay-input` accepts prior-task records, ranks them by observable query/repo/task similarity, and injects bounded optional `experience` events into any existing case adapter before selection. This is an experience-reuse experiment surface, not a runtime memory store.
65. Add `--experience-replay-report-output` so the replay lane emits a paired base-vs-replay report across the selected budgets and policies. The report counts selected experience events and tokens, then records event/file/span/line/AUC/utility deltas per case and in grouped summaries.
66. Add an experimental `experience-frontier` selector for SWE-ContextBench-style replay. It falls back to `official-frontier` without experience events, but when replay is present it selects useful prior experience and boosts current code/diff events that overlap selected experience files or spans. This tests experience-conditioned context retention without using gold labels.
67. Verify the real OpenCode trajectory bridge with `openai/gpt-5.5 --variant high`: a live local-source run produced `ses_13b12ed6fffeJJnFrvEMUFZVgD`, `opencode export` emitted the session JSON, and `--opencode-export --prediction-output` converted the read trajectory into ContextBench-style `pred_files` and line spans.
68. Add `--prediction-eval-gold` plus `--prediction-eval-output` as a local scorer for prediction JSONL. It compares exported OpenCode or selector-generated predictions against ContextBench gold JSONL with file/span/line final metrics plus trajectory AUC, giving a cheap scored bridge before invoking the official Python evaluator.
69. Add `--opencode-export-manifest` so multiple exported OpenCode sessions can be converted and locally scored in one run. Each JSONL row maps a benchmark `instance_id` to an `export_path`, with relative paths resolved from the manifest directory, which creates the first batchable real-trajectory evidence lane.
70. Add `--opencode-run-manifest` as the disciplined live-run bridge. It executes `opencode run` for each manifest row, exports the resulting session, writes an export manifest, and converts the exported trajectories into prediction JSONL so live `openai/gpt-5.5 --variant high` probes have the same local scoring path as saved exports.
71. Add `--swe-explore-ranker-gate-report-output` and `--swe-explore-ranker-gate-epsilon` so saved SWE-Explore ranker sweeps can produce the research-plan artifact directly: a Markdown gated-ranker validation report with setup, aggregate/per-budget results, oracle headroom, gate rules, case comparisons, and a conservative promotion decision.
72. Add `--swe-explore-oracle-report-output` so repo-candidate runs can separate candidate-pool failures from ranking/packing failures. The report emits candidate file/region/line recall, failure classes, file-oracle headroom, and greedy budget-oracle headroom before more selector work is attempted.
73. Add `--compaction-survival-output` for direct compaction-pressure experiments. A JSONL case names serialized conversation context plus gold claims, and the report compares raw-tail retention, ContextLedger-only retention, and ContextLedger-plus-tail retention by claim category.
74. Add `--benchmark-registry-output` so the harness can emit a deterministic JSON map of benchmark support, primary sources, supported outputs, and evidence boundaries before selector or live-run reports are interpreted.
75. Add `--swe-explore-ranker-gate-repo-fold-output` so a single saved ranker-sweep artifact can be evaluated with deterministic repository-clustered folds. This is stricter than random or row-level leave-one-out because all examples from a repository move together into either train or held-out evaluation.
76. Add `--swe-explore-split-output` so broad dev/held-out SWE-Explore slices can be generated as deterministic repository-disjoint manifests before expensive repo preparation and ranker sweeps.
77. Add `--swe-explore-datasets` so public SWE-Explore experiments can be scoped to `verified`, `multilingual`, or `pro` before splitting, source-map lookup, repo preparation, and ranker sweeps.
78. Add an experimental `content-structural` SWE-Explore repo ranker. It pays a benchmark-only cost to score bounded file-content sketches before the top-file cutoff, then reuses the existing structural chunk scorer. This targets gold-file-absent failures where path-only prefiltering drops a relevant file before chunk ranking can see it.
79. Add an experimental `content-backfill` SWE-Explore repo ranker. It preserves the top structural file prefix, then backfills only the remaining file slots with positive bounded file-content sketch matches before reusing the structural chunk scorer. This tests whether content evidence can recover weak-path files without replacing the structural prefilter.
80. Add `--swe-explore-ranker-sweep-progress` so long repository-candidate sweeps report ranker start/completion plus per-case elapsed time, instance ID, and selected chunk count to stderr.
81. Restrict the benchmark-only definition extractor's Java/C-style type prefix regex to horizontal whitespace so content-aware rankers cannot accidentally scan across large newline spans while looking for definitions.
82. Add ranker packet-comparison features to SWE-Explore ranker sweeps: file Jaccard, retained baseline file share, candidate-new file share, event Jaccard, retained baseline event share, and candidate-new event share. These are non-gold diagnostics for measuring how much an experimental ranker churns the structural packet.
83. Add SWE-ContextBench task-row and relationship-row ingestion. `--swe-contextbench-experience-input` parses public SWE-bench-shaped task rows into `ExperienceRecord` JSONL, `--swe-contextbench-relationship-input` and `--swe-contextbench-related-instance-ids` restrict the prior pool to linked base tasks, and the resulting records can be emitted with `--swe-contextbench-experience-output` or used directly by `--experience-replay-report-output`.
84. Extend `--opencode-run-manifest` for reproducible live A/B runs. Manifest rows now support `run_id`, per-row `model`, `variant`, `extra_args`, `env`, and inline `config` via `OPENCODE_CONFIG_CONTENT`; `title` is forwarded into `opencode run`, and `run_id` prevents artifact collisions when the same benchmark instance is run under baseline and ContextLedger variants.
85. Add `--opencode-run-report-output` as the live A/B evidence artifact. It joins run metadata, export/session IDs, requested and exported model/variant, token totals, local prediction metrics, label summaries, and first-row-vs-candidate paired deltas so duplicate `instance_id` baseline/ContextLedger rows remain interpretable without manual artifact inspection.
86. Extend live run manifest rows with `prompts` for multi-turn sessions. The first prompt starts the OpenCode run, later prompts resume the same exported session with `--session`, and the report records turn count so continuation smokes can be audited before stronger compaction-pressure experiments.
87. Add final-answer assertions to live run reports. Manifest rows can specify `answer_contains` and `answer_regex`; the report extracts the last text part from run stdout, records pass/fail checks, emits `answerPassRate`, and includes answer deltas in paired baseline-vs-candidate comparisons.
88. Add `--opencode-compaction-summary-manifest` with `--compaction-summary-gold` / `--compaction-summary-output` so exported OpenCode manual or auto compaction summaries can be scored directly against gold claims. This closes the gap between pre-summary packet survival and live answer recall by measuring what the actual compaction assistant wrote.
89. Add `--swe-explore-ranker-sweep-merge-output` so saved ranker sweeps over the same instance set can be merged without rerunning expensive rankers. The merge deduplicates identical ranker summaries, recomputes summary-level `bestByBudget` and comparisons, and carries through compatible case-comparison/gate rows when baselines match.
90. Add an experimental `rank-portfolio-frontier` selector that uses candidate order at budgets up to 400 and `budget-rank-frontier` above that. The dev12 probe was positive, but the broad50 repository-held-out transfer check rejected promotion because the 400-budget heldout lane regressed.

Run:

```sh
bun run benchmark:context-ledger
```

from `packages/core`.

To run converted benchmark cases:

```sh
bun run benchmark:context-ledger -- --input cases.jsonl --budget 2500
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy balanced-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy file-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy adaptive-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy fusion-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy portfolio-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy robust-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy utility-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy target-balanced-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy official-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy exploration-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy action-aware-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy intent-frontier
bun run benchmark:context-ledger -- --input cases.jsonl --prediction-output predictions.jsonl --prediction-policy experience-frontier
bun run benchmark:context-ledger -- --benchmark-registry-output benchmark-registry.json
bun run benchmark:context-ledger -- --compaction-survival-input compaction-survival.jsonl --compaction-survival-output compaction-survival-report.json --compaction-survival-policy official-frontier --budget 800
```

The JSONL input shape is intentionally smaller than ContextBench's full trajectory format: each line needs `instance_id`, `gold_ids`, `gold_files`, and typed ledger `events`. The prediction output uses ContextBench's unified fields so it can be passed into a downstream evaluator once conversion from real OpenCode trajectories is added.

To sample real ContextBench rows without adding a parquet dependency:

```sh
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 20 --budget 800
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --budgets 200,400,800,1200
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --budgets 200,400,800,1200 --include-test-code-context
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 500 --contextbench-page-size 100 --budgets 200,400,800,1200 --include-test-code-context
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 20 --write-cases cases.jsonl
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 1 --budget 800 --prediction-output predictions.jsonl --gold-output gold.jsonl
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 1 --budget 800 --prediction-output predictions.jsonl --gold-output gold.jsonl --official-eval-output official-results.jsonl --official-eval-python /tmp/contextbench-venv/bin/python --official-eval-pythonpath /tmp/ContextBench --official-eval-cache /tmp/contextbench-repos
bun run benchmark:context-ledger -- --official-summary-input official-results.jsonl --official-summary-output official-summary.json
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 20 --budgets 200,400,800,1200 --official-policy-report-output official-policy-report.json --official-policy-report-policies adaptive-frontier,fusion-frontier,portfolio-frontier,official-frontier --official-eval-python /tmp/contextbench-venv/bin/python --official-eval-pythonpath /tmp/ContextBench --official-eval-cache /tmp/contextbench-repos
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 20 --budget 400 --selection-delta-output selection-delta.json --selection-delta-baseline portfolio-frontier --selection-delta-policy official-frontier --selection-delta-limit 20
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --budgets 200,400,800,1200 --include-test-code-context --analysis-output analysis.json
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --budgets 200,400,800,1200 --include-test-code-context --target-report-output targets.json
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --budgets 200,400,800,1200 --include-test-code-context --portfolio-report-output portfolio.json
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --budgets 200,400,800,1200 --include-test-code-context --portfolio-report-output portfolio-utility.json --portfolio-objective target-score --portfolio-target official-utility
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --budgets 200,400,800,1200 --include-test-code-context --router-output router.json
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --budgets 200,400,800,1200 --include-test-code-context --feature-router-output feature-router.json
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --budgets 200,400,800,1200 --include-test-code-context --feature-router-output feature-router.json --feature-router-target official-utility
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 500 --contextbench-page-size 100 --budgets 200,400,800,1200 --include-test-code-context --feature-router-rules-output feature-router-rules.json --feature-router-target official-utility --feature-router-validation-folds 5 --feature-router-min-validation-gain 0.005
bun run benchmark:context-ledger -- --contextbench --contextbench-offset 500 --contextbench-limit 100 --budgets 200,400,800,1200 --include-test-code-context --feature-router-rules-input feature-router-rules.json --feature-router-eval-output feature-router-heldout.json
bun run benchmark:context-ledger -- --contextbench --contextbench-limit 100 --include-test-code-context --write-cases cases-offset0.jsonl
bun run benchmark:context-ledger -- --contextbench --contextbench-offset 100 --contextbench-limit 100 --include-test-code-context --write-cases cases-offset100.jsonl
bun run benchmark:context-ledger -- --budgets 200,400,800,1200 --promotion-report-output promotion.json --promotion-split-inputs cases-offset0.jsonl,cases-offset100.jsonl --promotion-split-labels offset0,offset100 --feature-router-target event-f1 --feature-router-validation-folds 5 --feature-router-min-validation-gain 0.005 --promotion-min-heldout-gain 0
bun run benchmark:context-ledger -- --budgets 200,400,800,1200 --stability-report-output stability.json --stability-split-inputs cases-offset0.jsonl,cases-offset100.jsonl --stability-split-labels offset0,offset100 --stability-target event-f1
bun run benchmark:context-ledger -- --budgets 200,400,800,1200 --portfolio-stability-report-output portfolio-stability.json --portfolio-stability-split-inputs cases-offset0.jsonl,cases-offset100.jsonl --portfolio-stability-split-labels offset0,offset100
bun run benchmark:context-ledger -- --opencode-export session.json --instance-id owner__repo-1234 --prediction-output predictions.jsonl
bun run benchmark:context-ledger -- --opencode-export session.json --instance-id owner__repo-1234 --prediction-output predictions.jsonl --prediction-eval-gold gold.jsonl --prediction-eval-output prediction-eval.json
bun run benchmark:context-ledger -- --opencode-export-manifest exports.jsonl --prediction-output predictions.jsonl --prediction-eval-gold gold.jsonl --prediction-eval-output prediction-eval.json
bun run benchmark:context-ledger -- --opencode-messages messages.json --instance-id owner__repo-1234 --prediction-output predictions.jsonl
```

To convert and score Agent Retrieval Bench samples as retrieval-only ContextLedger cases:

```sh
bun run benchmark:context-ledger -- --agent-retrieval-bench-samples data/benchmark/v1/samples.jsonl --budgets 200,400,800,1200
bun run benchmark:context-ledger -- --agent-retrieval-bench-samples data/benchmark/v1/samples.jsonl --write-cases arb-cases.jsonl
bun run benchmark:context-ledger -- --agent-retrieval-bench-samples data/benchmark/v1/samples.jsonl --budgets 200,400,800,1200 --agent-retrieval-bench-ranking-output arb-ranking.json
bun run benchmark:context-ledger -- --agent-retrieval-bench-samples data/benchmark/v1/samples.jsonl --budgets 200,400,800,1200 --agent-retrieval-bench-ranking-output arb-ranking.json --target-report-output arb-targets.json --target-report-targets event-f1,auc-line
bun run benchmark:context-ledger -- --agent-retrieval-bench-samples data/benchmark/v1/samples.jsonl --budgets 200,400 --policies official-frontier,intent-frontier --agent-retrieval-bench-ranking-output arb-focused-ranking.json --target-report-output arb-focused-targets.json --target-report-targets event-f1,auc-line
bun run benchmark:context-ledger -- --agent-retrieval-bench-samples data/benchmark/v1/samples.jsonl --budgets 200,400,800,1200 --agent-retrieval-bench-ranking-strategy action-aware --agent-retrieval-bench-ranking-output arb-action-aware-ranking.json
bun run benchmark:context-ledger -- --agent-retrieval-bench-samples data/benchmark/v1/samples.jsonl --agent-retrieval-bench-chunks corpus-chunks.jsonl --agent-retrieval-bench-max-chunks 400 --budgets 200,400,800,1200
bun run benchmark:context-ledger -- --agent-retrieval-bench-samples data/benchmark/v1/samples.jsonl --agent-retrieval-bench-corpus-manifest data/corpus/v1/corpus_manifest.jsonl --agent-retrieval-bench-max-chunks 400 --budgets 200,400,800,1200 --agent-retrieval-bench-ranking-output arb-ranking.json
```

Without `--agent-retrieval-bench-chunks` or `--agent-retrieval-bench-corpus-manifest`, the adapter follows Agent Retrieval Bench's dry-run style and builds synthetic candidate chunks from root-cause files, related tests, supporting files, negative distractors, context files, and given files. With chunk JSONL, it filters chunks by repo/base commit, applies a deterministic lexical prefilter when `--agent-retrieval-bench-max-chunks` is set, and maps chunk paths and line metadata into ContextLedger `code-context` events. With `--agent-retrieval-bench-corpus-manifest`, it reads the public release's `corpus_manifest.jsonl` and loads only the chunk files needed by the requested samples; use `--agent-retrieval-bench-corpus-root` if manifest paths need a different base directory. `--agent-retrieval-bench-ranking-output` writes policy/budget summaries and per-case details with `MRR`, `Recall@5`, `Recall@10`, `Recall@20`, and `goldCoverageAt8k`-style metrics. It can be combined with `--target-report-output` and other selector reports in the same run, so ranking and final-F1/AUC evidence stay synchronized. Use `--policies` to restrict local ranking, target, portfolio, router, and feature-router reports to a focused policy subset; this is separate from `--official-policy-report-policies`, which controls official ContextBench evaluator runs. The default `packet-order` strategy scores the rendered packet order; `--agent-retrieval-bench-ranking-strategy action-aware` keeps `comment2context` packet order but reranks `code2test` selected files toward test paths and trace-style localization toward implementation paths.

To convert and score SWE-Explore public rows as line-budget ContextLedger cases:

```sh
huggingface-cli download SWE-Explore-Bench/SWE-Explore-Bench bench.final.public.jsonl --repo-type dataset --local-dir data/SWE-Explore-Bench
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --budgets 200,400,800,1200 --write-cases swe-explore-cases.jsonl
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids pydata__xarray-4629,pydata__xarray-4966,pydata__xarray-2905 --write-cases swe-explore-xarray3-cases.jsonl
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-max-optional-regions 20 --budgets 200,400,800,1200 --target-report-output swe-explore-targets.json --target-report-targets line-f1,auc-line
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --budgets 200,400 --policies official-frontier,exploration-frontier,action-aware-frontier,intent-frontier --target-report-output swe-explore-focused-targets.json --target-report-targets line-f1,auc-line
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-max-optional-regions 20 --budgets 200,400,800,1200 --policies official-frontier,exploration-frontier --swe-explore-official-output swe-explore-context-ledger.jsonl --swe-explore-official-summary-output swe-explore-context-ledger-summary.json
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-auto-source-map --swe-explore-source-map-output swe-explore-source-map.jsonl --budget 200 --policies official-frontier
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-auto-source-map --swe-explore-prepare-repos --swe-explore-prepare-repos-cache data/SWE-Explore-Bench/repo-cache --swe-explore-prepare-repos-output swe-explore-prepared-repos.json --swe-explore-repo-candidates --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-chunk-lines 80 --swe-explore-chunk-overlap 20 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 400 --budgets 200,400,800,1200 --policies official-frontier,exploration-frontier,candidate-rank-frontier --swe-explore-official-summary-output swe-explore-repo-candidates-summary.json
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids pydata__xarray-4629,pydata__xarray-4966,pydata__xarray-2905 --swe-explore-auto-source-map --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-chunk-sweep-output swe-explore-xarray3-chunk-sweep.json --swe-explore-chunk-sweep-lines 40,80,160 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 400 --budgets 200,400,800,1200 --policies candidate-rank-frontier
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids pydata__xarray-4629,pydata__xarray-4966,pydata__xarray-2905 --swe-explore-auto-source-map --swe-explore-repo-candidates --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --swe-explore-repo-ranker lexical --budgets 200,400,800,1200 --policies candidate-rank-frontier,budget-rank-frontier --swe-explore-official-summary-output swe-explore-xarray3-multiscale-summary.json
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids matplotlib__matplotlib-25287,scikit-learn__scikit-learn-9288,sphinx-doc__sphinx-8056,pytest-dev__pytest-8399,sympy__sympy-15976,django__django-11820 --swe-explore-auto-source-map --swe-explore-prepare-repos --swe-explore-prepare-repos-output swe-explore-transfer6-prepared.json --swe-explore-repo-candidates --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --budgets 200,400,800,1200 --policies candidate-rank-frontier,budget-rank-frontier --swe-explore-official-summary-output swe-explore-transfer6-multiscale-summary.json
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids matplotlib__matplotlib-25287,scikit-learn__scikit-learn-9288,sphinx-doc__sphinx-8056,pytest-dev__pytest-8399,sympy__sympy-15976,django__django-11820 --swe-explore-source-map swe-explore-transfer6-source-map.jsonl --swe-explore-repo-candidates --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --swe-explore-repo-ranker bm25 --budgets 200,400,800,1200 --policies candidate-rank-frontier,budget-rank-frontier --swe-explore-official-summary-output swe-explore-transfer6-bm25-summary.json
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids matplotlib__matplotlib-25287,scikit-learn__scikit-learn-9288,sphinx-doc__sphinx-8056,pytest-dev__pytest-8399,sympy__sympy-15976,django__django-11820 --swe-explore-source-map swe-explore-transfer6-source-map.jsonl --swe-explore-repo-candidates --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --swe-explore-repo-ranker structural --budgets 200,400,800,1200 --policies candidate-rank-frontier,budget-rank-frontier --swe-explore-official-summary-output swe-explore-transfer6-structural-summary.json
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids pydata__xarray-4629,matplotlib__matplotlib-25287,scikit-learn__scikit-learn-9288,sphinx-doc__sphinx-8056,pytest-dev__pytest-8399,sympy__sympy-15976,django__django-11820,astropy__astropy-13977,pallets__flask-5014,pylint-dev__pylint-4970,psf__requests-5414,mwaskom__seaborn-3187 --swe-explore-auto-source-map --swe-explore-prepare-repos --swe-explore-prepare-repos-output swe-explore-broad12-prepared.json --swe-explore-repo-candidates --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --budgets 200,400,800,1200 --policies candidate-rank-frontier,budget-rank-frontier --swe-explore-official-summary-output swe-explore-broad12-structural-summary.json
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids pydata__xarray-4629,matplotlib__matplotlib-25287,scikit-learn__scikit-learn-9288,sphinx-doc__sphinx-8056,pytest-dev__pytest-8399,sympy__sympy-15976,django__django-11820,astropy__astropy-13977,pallets__flask-5014,pylint-dev__pylint-4970,psf__requests-5414,mwaskom__seaborn-3187 --swe-explore-source-map swe-explore-broad12-source-map.jsonl --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-ranker-sweep-output swe-explore-broad12-ranker-sweep.json --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --budgets 200,400,800,1200 --policies candidate-rank-frontier,budget-rank-frontier
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids pydata__xarray-4629,matplotlib__matplotlib-25287,scikit-learn__scikit-learn-9288,sphinx-doc__sphinx-8056,pytest-dev__pytest-8399,sympy__sympy-15976,django__django-11820,astropy__astropy-13977,pallets__flask-5014,pylint-dev__pylint-4970,psf__requests-5414,mwaskom__seaborn-3187 --swe-explore-source-map swe-explore-broad12-source-map.jsonl --swe-explore-repo-candidates --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --swe-explore-repo-ranker structural --budgets 200,400,800,1200 --policies candidate-rank-frontier,budget-rank-frontier --swe-explore-oracle-report-output swe-explore-broad12-oracles.json
bun run benchmark:context-ledger -- --swe-explore-ranker-portfolio-output swe-explore-ranker-portfolio.json --swe-explore-ranker-portfolio-inputs swe-explore-broad12-ranker-sweep.json --swe-explore-ranker-portfolio-labels broad12 --swe-explore-ranker-portfolio-target f1
bun run benchmark:context-ledger -- --swe-explore-ranker-portfolio-stability-output swe-explore-ranker-portfolio-stability.json --swe-explore-ranker-portfolio-stability-inputs swe-explore-transfer6-ranker-sweep.json,swe-explore-remaining6-ranker-sweep.json --swe-explore-ranker-portfolio-stability-labels transfer6,remaining6 --swe-explore-ranker-portfolio-target f1-first-useful --swe-explore-ranker-portfolio-max-heldout-loss 0.01
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-source-map swe-explore-source-map.jsonl --swe-explore-split-output swe-explore-broad50-splits.json --swe-explore-split-labels broad50-dev,broad50-heldout --swe-explore-split-sizes 50,50 --swe-explore-split-seed contextledger-broad50-v1
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-datasets verified --swe-explore-split-output data/SWE-Explore-Bench/broad50-verified-splits.json --swe-explore-split-labels broad50-verified-dev,broad50-verified-heldout --swe-explore-split-sizes 50,50 --swe-explore-split-seed contextledger-verified-broad50-v1
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids "$(jq -r '[.splits[].instanceIDs[]] | join(\",\")' data/SWE-Explore-Bench/broad50-verified-splits.json)" --swe-explore-auto-source-map --swe-explore-source-map-output data/SWE-Explore-Bench/broad50-verified-source-map.jsonl --swe-explore-split-output data/SWE-Explore-Bench/broad50-verified-source-check.json --swe-explore-split-labels assigned --swe-explore-split-sizes 99 --swe-explore-split-seed contextledger-verified-broad50-v1
bun run benchmark:context-ledger -- --swe-explore-ranker-gate-transfer-output swe-explore-ranker-gate-transfer.json --swe-explore-ranker-gate-transfer-inputs swe-explore-transfer6-ranker-sweep.json,swe-explore-remaining6-ranker-sweep.json --swe-explore-ranker-gate-transfer-labels transfer6,remaining6
bun run benchmark:context-ledger -- --swe-explore-ranker-gate-repo-fold-output swe-explore-ranker-gate-repo-fold.json --swe-explore-ranker-gate-repo-fold-input swe-explore-broad50-dev-ranker-sweep.json --swe-explore-ranker-gate-repo-folds 5 --swe-explore-ranker-gate-epsilon 0.005
bun run benchmark:context-ledger -- --swe-explore-ranker-gate-report-output reports/gated_ranker_broad50.md --swe-explore-ranker-gate-report-inputs swe-explore-broad50-dev-ranker-sweep.json,swe-explore-broad50-heldout-ranker-sweep.json --swe-explore-ranker-gate-report-labels broad50-dev,broad50-heldout --swe-explore-ranker-gate-epsilon 0.005
bun run benchmark:context-ledger -- --opencode-run-manifest live-runs.jsonl --opencode-run-model openai/gpt-5.5 --opencode-run-variant high --opencode-run-extra-args-json '["--pure"]' --opencode-run-config-json '{"compaction":{"context_ledger":{"enabled":true,"policy":"official-frontier","budget":1200}}}' --opencode-run-output-dir live-runs --opencode-run-export-manifest-output live-runs/exports.jsonl --opencode-run-report-output live-runs/run-report.json --prediction-output live-runs/predictions.jsonl --prediction-eval-gold live-gold.jsonl --prediction-eval-output live-runs/prediction-eval.json
bun run benchmark:context-ledger -- --opencode-compaction-summary-manifest live-compactions/exports.jsonl --compaction-summary-gold live-compactions/gold.jsonl --compaction-summary-output live-compactions/summary-report.json
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids matplotlib__matplotlib-25287,scikit-learn__scikit-learn-9288,sphinx-doc__sphinx-8056,pytest-dev__pytest-8399,sympy__sympy-15976,django__django-11820 --swe-explore-source-map swe-explore-transfer6-source-map.jsonl --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-ranker-sweep-output swe-explore-anchored-transfer6-ranker-sweep.json --swe-explore-ranker-sweep-rankers structural,structural-neighbor,dependency-neighbor,anchored-neighbor --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --budgets 400,1200 --policies budget-rank-frontier
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids pydata__xarray-4629,matplotlib__matplotlib-25287,scikit-learn__scikit-learn-9288,sphinx-doc__sphinx-8056,pytest-dev__pytest-8399,sympy__sympy-15976,django__django-11820,astropy__astropy-13977,pallets__flask-5014,pylint-dev__pylint-4970,psf__requests-5414,mwaskom__seaborn-3187 --swe-explore-source-map swe-explore-broad12-source-map.jsonl --swe-explore-repo-candidates --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --swe-explore-repo-ranker structural --budgets 400,1200 --policies budget-rank-frontier,coverage-rank-frontier --swe-explore-official-summary-output swe-explore-coverage-broad12-summary.json
bun run benchmark:context-ledger -- --swe-explore data/SWE-Explore-Bench/bench.final.public.jsonl --swe-explore-instance-ids matplotlib__matplotlib-25287,scikit-learn__scikit-learn-9288,sphinx-doc__sphinx-8056,pytest-dev__pytest-8399,sympy__sympy-15976,django__django-11820 --swe-explore-source-map swe-explore-transfer6-source-map.jsonl --swe-explore-repo-candidates --swe-explore-repos-root data/SWE-Explore-Bench --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --swe-explore-repo-ranker hybrid-rrf --budgets 400,1200 --policies budget-rank-frontier,coverage-rank-frontier,mmr-rank-frontier --swe-explore-official-summary-output swe-explore-hybrid-mmr-summary.json
bun run benchmark:context-ledger -- --swe-contextbench-experience-input swe-contextbench-experience.jsonl --swe-contextbench-relationship-input swe-contextbench-relationship.jsonl --swe-contextbench-related-instance-ids related_id_a,related_id_b --swe-contextbench-experience-output swe-contextbench-experience-records.jsonl
bun run benchmark:context-ledger -- --input related-cases.jsonl --swe-contextbench-experience-input swe-contextbench-experience.jsonl --swe-contextbench-relationship-input swe-contextbench-relationship.jsonl --swe-contextbench-related-instance-ids related_id_a,related_id_b --experience-replay-k 3 --experience-replay-min-score 1 --budgets 400,1200 --policies official-frontier,relevance-frontier,experience-frontier --write-cases related-with-experience.jsonl --experience-replay-report-output swe-contextbench-replay-report.json
bun run benchmark:context-ledger -- --input contextbench-cases.jsonl --experience-replay-input prior-experience.jsonl --experience-replay-k 3 --experience-replay-min-score 1 --budgets 400,1200 --policies official-frontier,relevance-frontier,experience-frontier --write-cases contextbench-with-experience.jsonl --experience-replay-report-output experience-replay-report.json
```

The SWE-Explore adapter uses the public row shape: `ground_truth.read_core_regions` are gold line-span events, `ground_truth.read_optional_regions_map` are optional competing context events, and `read_step_info` supplies ordering when a trajectory read overlaps a region. Use `--swe-explore-core-only` to ignore optional regions, `--swe-explore-optional-models model_a,model_b` to restrict optional context to selected source models, `--swe-explore-instance-ids id_a,id_b` for named non-contiguous slices, `--swe-explore-limit`/`--swe-explore-offset` for deterministic contiguous slices, and `--swe-explore-max-optional-regions` to cap pathological rows with hundreds of optional regions. `--swe-explore-official-output` writes one JSONL row per case/policy/budget with `instance_id`, `explorer`, `regions`, `metrics`, and `num_regions`, matching the official runner's row convention; `--swe-explore-official-summary-output` writes grouped averages. Because the released public rows do not include issue text, trajectory-candidate mode evaluates ordering and retention over trajectory-grounded regions, not query understanding.

Use `--swe-explore-repo-candidates` to move toward a true explorer comparison. This mode requires `--swe-explore-repos-root` and should normally be paired with `--swe-explore-auto-source-map`, a local `--swe-explore-source-map`, `--swe-explore-auto-issue-map`, `--swe-explore-issue-map auto`, or a local `--swe-explore-issue-map`, because public rows do not include `problem_statement`. Auto lookup maps `verified` to `princeton-nlp/SWE-bench_Verified`, `multilingual` to `SWE-bench/SWE-bench_Multilingual`, and `pro` to `ScaleAI/SWE-bench_Pro`, all on the `default`/`test` split. It resolves each row's `repo_dir`, ranks files from issue text, chunks selected source files, and builds candidate `code-context` events without exposing core/optional trajectory regions to the selector. The default repo ranker is now `structural`; use `--swe-explore-repo-ranker lexical` or `--swe-explore-repo-ranker bm25` for baselines. The current chunker is intentionally simple; its purpose is to create a non-oracle evaluation lane for ContextLedger policies and later OpenCode/GPT trajectories, not to claim SoTA by itself.

Use `--swe-explore-auto-source-map` when repo snapshots are being prepared. It emits source records with `instance_id`, normalized `source_instance_id` when needed, source dataset label, GitHub `repo`, `base_commit`, and `problem_statement`. A local `--swe-explore-source-map` can then replace repeated network lookup, and it also supplies issue text to repo-candidate mode.

Use `--swe-explore-prepare-repos-cache` during broad repo preparation to create one shared bare blobless cache per clone URL and then materialize per-instance detached checkouts with `--reference-if-able`. This keeps broad50 verified preparation practical when many cases share xarray, scikit-learn, sphinx, pylint, flask, or seaborn histories.

Use `--swe-explore-prepare-repos` with `--swe-explore-repos-root` to clone or update each source-map repo and checkout the exact `base_commit` detached at the public row's `repo_dir`. `--swe-explore-prepare-repos-output` writes a JSON report with the requested source repo, target directory, base commit, and checked-out `HEAD`. The command is intentionally explicit about the root directory because it creates or updates git checkouts.

Use `--swe-explore-chunk-sweep-output` to rebuild repo candidates for several chunk granularities and emit grouped official-style summaries plus `bestByBudget`. If `--swe-explore-chunk-overlap` is omitted, sweep runs default to 25 percent overlap for each listed chunk size; otherwise the supplied overlap is reused for every size.

Use `--swe-explore-ranker-sweep-output` to rebuild the same repo-candidate slice for multiple rankers and emit grouped official-style summaries plus `bestByBudget`, `comparisons`, `caseComparisons`, and `gates`. `comparisons` reports per-policy/per-budget metric deltas against `structural` when it is present, otherwise against the first listed ranker, so ranker experiments no longer require ad hoc post-processing scripts. `caseComparisons` adds per-instance win/loss/tie deltas, compact baseline/candidate metrics, and observable ranker-packet features such as file count, total line cost, chunk-size mix, max file-cluster share, path mix, and query/candidate term overlap. These features are intentionally non-gold; gold labels only appear in the metric deltas. By default it runs `lexical`, `bm25`, `structural`, `structural-neighbor`, and `hybrid-rrf`; pass `--swe-explore-ranker-sweep-rankers structural,content-structural,content-backfill,structural-neighbor,dependency-neighbor,anchored-neighbor,hybrid-rrf` to include the slower content-prefilter, dependency, and anchored-neighbor diagnostics explicitly.

Use `--swe-explore-ranker-sweep-merge-output` with `--swe-explore-ranker-sweep-merge-inputs` to combine saved ranker-sweep JSON files for the same instance set. This is the cheap path after an expensive ranker such as `hybrid-rrf` has already run: rerun only the missing candidate rankers, then merge the compatible reports for portfolio and gate post-processing. Duplicate ranker summaries must match exactly, and case/gate evidence must share the same baseline ranker.

Use `--swe-explore-ranker-portfolio-output` with `--swe-explore-ranker-portfolio-inputs` to post-process one or more saved ranker-sweep JSON files into a budget-to-ranker map. The default target is `f1`; `recall`, `precision`, `first-useful-hit`, and the harmonic `f1-first-useful` target are also accepted. The report selects complete ranker/policy candidates across all supplied splits before partial candidates, emits per-split winners, and aggregates selected-ranker counts. Each budget row also emits a maximin `robustRanker`/`robustPolicy` chosen by worst split score, plus robust aggregate metrics, so average winners and split-stable winners are visible in the same artifact. Use this when the next step is deciding whether a fixed budget-specific ranker map is worth another held-out run.

Use `--swe-explore-ranker-portfolio-stability-output` with `--swe-explore-ranker-portfolio-stability-inputs` to derive a budget-to-ranker map on each saved ranker-sweep split, freeze that map, and evaluate it on every other supplied split. It reuses `--swe-explore-ranker-portfolio-target`; `--swe-explore-ranker-portfolio-max-heldout-loss` marks a train-split budget row unstable when held-out regret against the eval split's best fixed ranker exceeds the threshold. The report also emits all-split fixed candidates, including maximin robust rankers, so "aggregate robust winner" and "portfolio learned on one split transfers" are separate claims.

Use `--swe-explore-split-output` with `--swe-explore-split-labels`, `--swe-explore-split-sizes`, and `--swe-explore-split-seed` to generate deterministic repository-disjoint instance lists before building broad50-dev or held-out sweeps. The requested sizes are caps because whole repositories move together; rows that would exceed every cap are recorded under `unassigned`. The manifest prefers source-map `repo` metadata, falls back to row repo hints and SWE-style instance ids, and emits `instanceIDsCsv` for direct reuse with `--swe-explore-instance-ids`. This prevents accidental same-repository leakage between gate development and held-out reporting.

Use `--swe-explore-datasets` before split generation when the next experiment should stay inside one public SWE-Explore regime. The current near-term lane is verified-only: `data/SWE-Explore-Bench/broad50-verified-splits.json` assigns 49 dev cases across xarray and scikit-learn plus 50 held-out cases across seaborn, flask, pylint, and sphinx, while `data/SWE-Explore-Bench/broad50-verified-source-map.jsonl` has source metadata for all 99 assigned rows. This is the clean next target for repo preparation and ranker sweeps.

Use `--swe-explore-ranker-gate-transfer-output` with `--swe-explore-ranker-gate-transfer-inputs` to train each ranker gate on one saved sweep's `caseComparisons` and evaluate the frozen rule on every other saved split with the same baseline ranker, candidate ranker, policy, and budget. The report emits train/eval routed scores, routed choice counts, held-out routed delta versus the structural baseline, and held-out routed delta versus the better fixed ranker. This is stricter than the in-sweep `gates` leave-one-out score because repository chunking and case composition are already fixed before the transfer report runs.

Use `--swe-explore-ranker-gate-repo-fold-output` with `--swe-explore-ranker-gate-repo-fold-input` when only one larger saved sweep exists. It infers repository groups from SWE-style instance ids, assigns whole repositories to deterministic balanced folds, trains one-stump gates on the remaining repositories, and reports held-out deltas against both structural and the best fixed ranker plus worst-decile oracle regret. This is the right default for broad50-dev style screening because it prevents same-repository cases from appearing on both sides of the gate.

Use `--swe-explore-ranker-gate-epsilon` to make one-stump ranker gates conservative: a learned threshold must beat the structural baseline by at least epsilon before it routes to a candidate ranker. `--swe-explore-ranker-gate-report-output` consumes saved ranker-sweep JSON files through `--swe-explore-ranker-gate-report-inputs` and writes the human-readable validation artifact recommended by the research plan. The Markdown report includes setup, aggregate and per-budget F1, split coverage, oracle headroom, gate rules, biggest candidate wins/losses, and a promotion decision. This is still benchmark-only evidence; it should not change OpenCode runtime defaults without sealed held-out support.

Use `--swe-explore-oracle-report-output` on repo-candidate runs before adding another selector. It reports whether gold files and regions are present in the generated candidate pool at all, classifies failures as empty pool, gold-file absent, gold-region absent, or pool covered, and then compares the best current policy against two upper bounds: a file oracle that only packs candidates from gold files and a greedy budget oracle that picks candidate chunks by marginal core-line coverage. If candidate-pool recall is low, the next work belongs in repository preparation, file prefiltering, or chunking; if the budget oracle is high but policies lag, the next work belongs in ranking, packing, or gating.

Use `--compaction-survival-input` with `--compaction-survival-output` for LLM-free compaction pressure tests. Each JSONL row has `instance_id`, serialized `context` chunks, and `gold` claims with `id`, `category`, and optional required `text` and `file`. The report compares `raw-tail`, `context-ledger`, and `context-ledger-plus-tail` variants under the same token budget, reporting overall and per-category claim recall. This measures whether the provenance packet surfaces old constraints, latest test evidence, diff facts, decisions, and relevant files before asking a model to summarize them; it is not a solve-rate claim.

Use `--experience-replay-input` to inject compact prior-task records into any case source before policy selection. Each JSONL record has `id`, `summary`, `files`, optional `spans`, and optional `query`, `repo`, `benchmark`, and `task_type`. The transform excludes the current instance, ranks records by same-repo/task/benchmark and lexical query overlap, and adds the top `--experience-replay-k` records whose score is at least `--experience-replay-min-score` as non-preserved `experience` events. Add `--experience-replay-report-output` to write a paired report comparing original cases against replay-enriched cases for the selected budgets and policies. The report includes selected experience IDs, selected experience counts, mean selected experience tokens, and event/file/span/line/AUC/utility deltas. Add `experience-frontier` to the policy list when testing whether selected prior experience should bias current code/diff retention by file and span overlap. This creates a SWE-ContextBench-style experience-reuse pressure lane while keeping runtime compaction unchanged.

Use `--swe-contextbench-experience-input` for public SWE-ContextBench task-row JSONL exported from the Hugging Face parquet files. The adapter extracts changed files from `patch`, test files from `test_patch` and `FAIL_TO_PASS`, and emits ContextLedger `ExperienceRecord` rows with `benchmark="swe-contextbench"`. Add `--swe-contextbench-relationship-input` plus `--swe-contextbench-related-instance-ids` when only the base tasks linked to a related-task slice should be eligible for replay. `--swe-contextbench-experience-output` writes the generated prior-experience JSONL directly; if omitted, the generated records are used as the replay source for `--experience-replay-report-output`.

SWE-ContextBench real-source smoke on June 15, 2026: the Hugging Face dataset API confirmed the public `jiayuanz3/SWEContextBench` release has MIT license metadata, five parquet files (`Experience`, `Lite_Experience`, `Related`, `Related_Lite`, and `Relationship`), and the README describes 1,100 base tasks, 376 related tasks, and relationship rows. A five-row task sample from the dataset-server rows endpoint was written to `data/SWE-ContextBench/swe-contextbench-experience-first5.jsonl`; `--swe-contextbench-experience-input ... --swe-contextbench-experience-output data/SWE-ContextBench/swe-contextbench-experience-first5-records.jsonl` emitted five ContextLedger experience records with patch-derived touched files and fail-to-pass tests. This proves public-row ingestion, not official related-task solve-rate.

Verified broad50-dev ranker-gate run on June 14, 2026:

- Prepared 49 verified dev checkouts under `data/SWE-Explore-Bench/repos`, with shared bare caches for `pydata/xarray` and `scikit-learn/scikit-learn`.
- Saved repo-disjoint ranker sweeps:
  - `data/SWE-Explore-Bench/broad50-verified-dev-xarray-ranker-sweep.json` (18 xarray instances)
  - `data/SWE-Explore-Bench/broad50-verified-dev-sklearn-ranker-sweep.json` (31 scikit-learn instances)
- Saved transfer artifacts:
  - `data/SWE-Explore-Bench/broad50-verified-dev-ranker-gate-transfer.json`
  - `reports/gated_ranker_broad50.md`
- `xarray`: structural was best at budget 400 (F1 0.105); structural-neighbor was best at budget 1200 (F1 0.194).
- `scikit-learn`: structural-neighbor was best at budget 400 (F1 0.235); structural was best at budget 1200 (F1 0.336).
- Cross-repo one-stump transfer with epsilon 0.005 had mean held-out routed delta versus structural of -0.002 and mean held-out regret versus oracle of 0.007. Eight gates cleared the epsilon screen only when abstentions were counted; just one stable non-abstaining gate transferred, and it was a lexical pocket at budget 1200.
- Oracle diagnostics in `data/SWE-Explore-Bench/broad50-verified-dev-oracle-report.json` show candidate-pool mean file recall 0.912, region recall 0.815, and line recall 0.828. Failures were 28 pool-covered cases, 11 gold-file-absent cases, and 10 gold-region-absent cases. Budget-oracle F1 was 0.418 at budget 400 and 0.673 at budget 1200, while the best current policy reached only 0.187 and 0.282 respectively.

Decision: keep `structural` as the conservative baseline and treat `structural-neighbor` as a budget/repo-specific candidate. Do not promote the learned gate or dependency-neighbor to runtime. The next benchmark work should improve candidate-pool coverage for the 21 uncovered/partial cases and packing/ranking against the large budget-oracle gap before spending on a broader live OpenAI lane.

Content-aware file-prefilter experiment on June 14, 2026:

- Added `content-structural` as an explicit SWE-Explore repo ranker. It reads at most 96 KB from each candidate text file before the `--swe-explore-max-repo-files` cutoff, scores bounded lexical/identifier/definition overlap against the issue text, and then uses the same structural chunk scorer as `structural`.
- Added `content-backfill` as the conservative follow-up. It keeps 80 percent of the structural file slots intact, then fills the remaining slots from positive content-sketch matches before falling back to structural order.
- On the 11 verified-dev cases that the structural oracle had classified as `gold-file-absent`, `content-structural` improved candidate-pool mean file recall from 0.609 to 0.770, region recall from 0.553 to 0.709, and line recall from 0.756 to 0.817. Three of those 11 cases became pool-covered.
- On that targeted file-miss slice, fixed `content-structural` improved `budget-rank-frontier` F1 by +0.0039 at budget 400 and +0.0221 at budget 1200.
- On the full 49-case verified-dev split, fixed `content-structural` regressed `budget-rank-frontier` F1 by -0.0017 at budget 400 and -0.0021 at budget 1200, with large losses concentrated in a few scikit-learn cases.
- On the same 11-case file-miss slice, fixed `content-backfill` matched the intended mechanism: F1 improved by +0.0039 at budget 400 and +0.0222 at budget 1200 versus `structural`.
- On the full 49-case verified-dev split, fixed `content-backfill` was nearly neutral at budget 400 and mildly positive at budget 1200: F1 changed by -0.0003 at 400 and +0.0023 at 1200. The aggregate hides one large win on `scikit-learn__scikit-learn-12682` and three losses at the measured budgets, so it is not promotion evidence.
- The in-sweep threshold gate for `content-backfill` routed one of 49 cases and improved the apparent routed F1, but leave-one-out fell back to the structural score. Treat this as oracle-screening headroom, not as a validated gate.
- The repository-held-out gate screen in `data/SWE-Explore-Bench/broad50-verified-dev-content-backfill-repo-fold-gate.json` used epsilon 0.005 over two repo folds: `pydata__xarray` and `scikit-learn__scikit-learn`. Mean held-out routed delta versus `structural` was 0, mean held-out delta versus the best fixed ranker was -0.0009, mean routed regret versus oracle was 0.0023, and worst-decile routed regret was 0.0079. Three of four fold/budget gates abstained entirely to `structural`; the one non-abstaining gate routed one xarray budget-1200 case and was neutral on held-out.
- The full verified held-out sweep in `data/SWE-Explore-Bench/broad50-verified-heldout-content-backfill-ranker-sweep.json` used 50 repository-disjoint cases over `mwaskom/seaborn`, `pallets/flask`, `pylint-dev/pylint`, and `sphinx-doc/sphinx`. `structural` remained the best fixed ranker at both budgets: F1 0.1117 at budget 400 and 0.1423 at budget 1200.
- On that held-out split, fixed `content-backfill` regressed versus `structural` at both budgets: F1 delta -0.0025, recall delta -0.0026, precision delta -0.0021, and no first-useful-hit gain at budget 400; F1 delta -0.0100, recall delta -0.0113, precision delta -0.0125, and first-useful-hit delta +0.0107 at budget 1200.
- Case-level held-out outcomes confirm this is not a hidden aggregate win: budget 400 had 3 wins, 7 losses, and 40 ties; budget 1200 had 4 wins, 10 losses, and 36 ties. The largest regressions were Sphinx-heavy (`sphinx-doc__sphinx-8548`, `sphinx-doc__sphinx-10323`, and `sphinx-doc__sphinx-7910`), while the clearest wins were `sphinx-doc__sphinx-7440` and `pylint-dev__pylint-6528`.
- The first held-out attempt exposed two harness-quality issues before it produced evidence: standalone ranker sweeps were still doing redundant default-case work, and the content definition regex could scan across newline spans on large files. The current harness exits early for standalone sweep outputs, emits progress with `--swe-explore-ranker-sweep-progress`, and has a regression fixture for cross-line `public ` noise.
- The follow-up packet-churn diagnostics in `data/SWE-Explore-Bench/broad50-verified-dev-content-backfill-comparison-features-ranker-sweep.json` and `data/SWE-Explore-Bench/broad50-verified-heldout-content-backfill-comparison-features-ranker-sweep.json` add file/event overlap features without changing the ranker outputs. On verified-dev, the large `scikit-learn__scikit-learn-12682` win had extreme churn (`fileJaccard=0.164`, `candidateNewFileShare=0.566`, `eventJaccard=0.061`, `candidateNewEventShare=0.885`), while several losses sat in a moderate-churn band.
- The comparison-feature transfer gate in `data/SWE-Explore-Bench/broad50-verified-content-backfill-comparison-features-gate-transfer.json` used epsilon 0.005 across dev and held-out saved sweeps. It learned constant `structural` for the transfer checks, avoiding held-out losses but also giving up the small verified-dev budget-1200 fixed `content-backfill` gain. This confirms packet churn is useful failure-analysis evidence, not yet a validated routing signal.

Decision: keep both content-aware rankers benchmark-only. `content-backfill` avoids the full-split high-budget regression seen with `content-structural` on verified-dev, but the held-out split rejects it as a fixed selector. Do not promote content-aware ranking or a learned gate into runtime behavior until the candidate is conditioned on strong observable structural-pool weakness features and passes repository-disjoint held-out evaluation.

One-row live smokes on June 14, 2026 verified the automatic issue lookup for all three public SWE-Explore source families:

| Source row | Offset | Issue-text source | Result |
| --- | ---: | --- | --- |
| `pydata__xarray-4629` | 0 | `princeton-nlp/SWE-bench_Verified` | Resolved xarray merge attrs issue text |
| `astral-sh__ruff-15330` | 451 | `SWE-bench/SWE-bench_Multilingual` | Resolved Ruff inline script metadata issue text |
| `ansible__ansible-3db08adbb1cc6aa9941be5e0fc810132c6e1fa4b-vba6da65a0f3baefda7a058ebbd0a8dcafb8512f5` | 612 | `ScaleAI/SWE-bench_Pro` | Resolved Pro issue text after `instance_` id normalization |

The first real repository-candidate smoke used `pydata__xarray-4629`, source repo `pydata/xarray`, and base commit `a41edc7bf5302f2ea327943c0c48c532b12009bc` checked out under `/tmp/swe-explore-real-repos/repos/pydata__xarray-4629`. The later `--swe-explore-prepare-repos` smoke reproduced the same checkout and metrics from source metadata. This is a one-row sanity check, not a leaderboard result, but it demonstrates why `candidate-rank-frontier` is useful as a non-oracle explorer baseline:

| Budget | Policy | Recall | Precision | nDCG@300 | First hit |
| ---: | --- | ---: | ---: | ---: | ---: |
| 200 | `official-frontier` | 0.040 | 0.191 | 1.000 | 1.000 |
| 200 | `candidate-rank-frontier` | 0.188 | 0.994 | 1.000 | 1.000 |
| 400 | `official-frontier` | 0.040 | 0.096 | 1.000 | 1.000 |
| 400 | `candidate-rank-frontier` | 0.358 | 1.000 | 1.000 | 1.000 |
| 800 | `official-frontier` | 0.000 | 0.000 | 0.000 | 0.000 |
| 800 | `candidate-rank-frontier` | 0.695 | 1.000 | 1.000 | 1.000 |
| 1200 | `official-frontier` | 0.000 | 0.000 | 0.000 | 0.000 |
| 1200 | `candidate-rank-frontier` | 0.946 | 0.999 | 1.000 | 1.000 |

The next real slice used three named xarray rows, prepared from source metadata under `/tmp/swe-explore-real-repos`: `pydata__xarray-4629`, `pydata__xarray-4966`, and `pydata__xarray-2905`. On this small slice, `candidate-rank-frontier` beats the compaction-oriented selectors at every measured budget:

| Budget | Policy | Recall | Precision | F1 | First hit |
| ---: | --- | ---: | ---: | ---: | ---: |
| 400 | `relevance-frontier` | 0.092 | 0.099 | 0.091 | 0.667 |
| 400 | `file-frontier` | 0.284 | 0.307 | 0.295 | 0.333 |
| 400 | `candidate-rank-frontier` | 0.245 | 0.745 | 0.337 | 0.800 |
| 800 | `relevance-frontier` | 0.079 | 0.033 | 0.047 | 0.333 |
| 800 | `file-frontier` | 0.337 | 0.179 | 0.231 | 0.667 |
| 800 | `candidate-rank-frontier` | 0.596 | 0.800 | 0.591 | 0.900 |
| 1200 | `relevance-frontier` | 0.148 | 0.064 | 0.076 | 0.667 |
| 1200 | `file-frontier` | 0.337 | 0.119 | 0.174 | 0.667 |
| 1200 | `candidate-rank-frontier` | 0.754 | 0.777 | 0.667 | 0.933 |

The same xarray3 slice shows chunk granularity is now a first-order experimental variable. The built-in sweep command above reproduced the earlier manual loop: with `candidate-rank-frontier`, 40-line chunks win the tight 200/400 budgets and 80-line chunks win the larger 800/1200 budgets.

| Chunk lines | Budget 200 F1 | Budget 400 F1 | Budget 800 F1 | Budget 1200 F1 |
| ---: | ---: | ---: | ---: | ---: |
| 40 | 0.245 | 0.370 | 0.547 | 0.642 |
| 80 | 0.176 | 0.337 | 0.591 | 0.667 |
| 160 | 0.132 | 0.228 | 0.552 | 0.616 |

The generated `bestByBudget` section for this slice selects:

| Budget | Best chunk lines | Policy | F1 |
| ---: | ---: | --- | ---: |
| 200 | 40 | `candidate-rank-frontier` | 0.245 |
| 400 | 40 | `candidate-rank-frontier` | 0.370 |
| 800 | 80 | `candidate-rank-frontier` | 0.591 |
| 1200 | 80 | `candidate-rank-frontier` | 0.667 |

This points toward a budget-aware or multi-scale repository ranker as the next selector-level experiment, rather than another policy that reorders already-ranked chunks with generic compaction heuristics.

The first in-fork multiscale selector experiment used the same three xarray rows with 40-line and 80-line chunks emitted in the same candidate pool. When `--swe-explore-chunk-overlap` is omitted, multiscale mode uses a per-size default overlap of one quarter of each chunk length. `budget-rank-frontier` improves over the plain candidate-order baseline at every measured budget on this slice:

| Budget | Policy | Recall | Precision | F1 | First hit |
| ---: | --- | ---: | ---: | ---: | ---: |
| 200 | `candidate-rank-frontier` | 0.068 | 0.667 | 0.121 | 0.667 |
| 200 | `budget-rank-frontier` | 0.163 | 0.800 | 0.245 | 0.933 |
| 400 | `candidate-rank-frontier` | 0.231 | 0.745 | 0.321 | 0.800 |
| 400 | `budget-rank-frontier` | 0.285 | 0.775 | 0.370 | 0.967 |
| 800 | `candidate-rank-frontier` | 0.506 | 0.781 | 0.534 | 0.909 |
| 800 | `budget-rank-frontier` | 0.596 | 0.800 | 0.591 | 0.900 |
| 1200 | `candidate-rank-frontier` | 0.640 | 0.778 | 0.612 | 0.944 |
| 1200 | `budget-rank-frontier` | 0.748 | 0.750 | 0.650 | 0.933 |

This confirms the chunk-sweep hypothesis for 200/400/800 and nearly matches the best single-scale 1200 result (`0.650` versus `0.667`). A cap-sensitivity rerun with `--swe-explore-max-repo-chunks 1600` produced the same numbers, so the remaining 1200-budget gap is not explained by the mixed candidate pool being truncated at 800 chunks. It is still a small-slice result, so `budget-rank-frontier` stays experimental rather than becoming the compaction default.

The first cross-repository transfer slice used six non-xarray verified rows: `matplotlib__matplotlib-25287`, `scikit-learn__scikit-learn-9288`, `sphinx-doc__sphinx-8056`, `pytest-dev__pytest-8399`, `sympy__sympy-15976`, and `django__django-11820`. This exposed a generator failure rather than a selector failure: truncating repository files before ranking produced zero gold candidate chunks for scikit-learn and django. Path-ranked file prefiltering fixes that candidate-pool miss without changing the xarray3 scores above.

| Budget | Policy | Baseline F1 | Path-ranked F1 | Delta |
| ---: | --- | ---: | ---: | ---: |
| 200 | `candidate-rank-frontier` | 0.062 | 0.062 | +0.000 |
| 200 | `budget-rank-frontier` | 0.078 | 0.083 | +0.005 |
| 400 | `candidate-rank-frontier` | 0.085 | 0.106 | +0.021 |
| 400 | `budget-rank-frontier` | 0.105 | 0.117 | +0.012 |
| 800 | `candidate-rank-frontier` | 0.100 | 0.127 | +0.027 |
| 800 | `budget-rank-frontier` | 0.104 | 0.125 | +0.021 |
| 1200 | `candidate-rank-frontier` | 0.096 | 0.131 | +0.035 |
| 1200 | `budget-rank-frontier` | 0.099 | 0.134 | +0.035 |

Candidate coverage moved in the intended direction: scikit-learn went from `0` to `44` gold candidate chunks, django went from `0` to `64`, and sympy's first gold candidate moved from rank `62` to rank `21`. An attempted stronger variant that normalized terms for chunk text as well as file paths scored higher on this six-repo slice, but regressed xarray high-budget F1; that variant was rejected. The retained change limits normalization to file-path prefiltering and keeps chunk text ranking conservative.

The next ranker experiment tried BM25-style chunk scoring with stop-word filtering and length normalization, exposed via `--swe-explore-repo-ranker bm25`. It is not a default candidate. On the six-repo transfer slice it only helps `budget-rank-frontier` at 800/1200 and regresses the lower budgets; on xarray3 it regresses high-budget F1 sharply.

| Slice | Budget | Policy | Lexical F1 | BM25 F1 | Delta |
| --- | ---: | --- | ---: | ---: | ---: |
| transfer6 | 800 | `budget-rank-frontier` | 0.125 | 0.129 | +0.004 |
| transfer6 | 1200 | `budget-rank-frontier` | 0.134 | 0.137 | +0.004 |
| xarray3 | 800 | `budget-rank-frontier` | 0.591 | 0.278 | -0.313 |
| xarray3 | 1200 | `budget-rank-frontier` | 0.650 | 0.321 | -0.329 |

The likely issue is that BM25 downweights repeated generic context but over-rewards sparse issue terms in unrelated nearby code. The next ranker should use structure-aware evidence, such as symbol/class/function anchors and file-level query priors, rather than plain bag-of-words document ranking.

The capped structural ranker is a better direction. The first uncapped version overboosted generic identifier matches and regressed both transfer6 and xarray3, so the retained implementation caps identifier-term influence and gives only a small bonus for definition anchors. On the same prepared slices, it improves transfer6 and preserves the strongest xarray3 `budget-rank-frontier` high-budget scores:

| Slice | Budget | Policy | Lexical F1 | Structural F1 | Delta |
| --- | ---: | --- | ---: | ---: | ---: |
| transfer6 | 200 | `budget-rank-frontier` | 0.083 | 0.126 | +0.043 |
| transfer6 | 800 | `budget-rank-frontier` | 0.125 | 0.163 | +0.037 |
| transfer6 | 1200 | `budget-rank-frontier` | 0.134 | 0.191 | +0.058 |
| xarray3 | 200 | `budget-rank-frontier` | 0.245 | 0.300 | +0.055 |
| xarray3 | 800 | `budget-rank-frontier` | 0.591 | 0.591 | +0.000 |
| xarray3 | 1200 | `budget-rank-frontier` | 0.650 | 0.650 | +0.000 |

The broader promotion gate used 12 distinct verified repositories: xarray, matplotlib, scikit-learn, sphinx, pytest, sympy, django, astropy, flask, pylint, requests, and seaborn. Structural improved both repo-candidate policies at every measured budget:

| Budget | Policy | Lexical F1 | Structural F1 | Delta |
| ---: | --- | ---: | ---: | ---: |
| 200 | `candidate-rank-frontier` | 0.091 | 0.142 | +0.051 |
| 200 | `budget-rank-frontier` | 0.111 | 0.161 | +0.050 |
| 400 | `candidate-rank-frontier` | 0.158 | 0.184 | +0.027 |
| 400 | `budget-rank-frontier` | 0.197 | 0.204 | +0.007 |
| 800 | `candidate-rank-frontier` | 0.239 | 0.287 | +0.047 |
| 800 | `budget-rank-frontier` | 0.252 | 0.308 | +0.056 |
| 1200 | `candidate-rank-frontier` | 0.276 | 0.340 | +0.064 |
| 1200 | `budget-rank-frontier` | 0.314 | 0.350 | +0.036 |

At budget 1200 for `budget-rank-frontier`, structural had `7` per-instance wins, `1` small loss (`seaborn`, `-0.008` F1), and `4` ties. That is enough to promote `structural` as the default repo-candidate benchmark ranker while keeping `lexical` and `bm25` as explicit comparison options. This remains a process-metric improvement, not a SWE-Explore leaderboard or end-to-end OpenCode solve-rate claim.

The automated ranker sweep reproduces that promotion boundary from one JSON report and includes the rejected BM25 baseline. On the same broad12 slice, `structural` plus `budget-rank-frontier` is the `bestByBudget` choice at every measured budget:

| Budget | Lexical F1 | BM25 F1 | Structural F1 | Structural vs lexical | Structural vs BM25 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | 0.111 | 0.090 | 0.161 | +0.050 | +0.071 |
| 400 | 0.197 | 0.129 | 0.204 | +0.007 | +0.075 |
| 800 | 0.252 | 0.228 | 0.308 | +0.056 | +0.080 |
| 1200 | 0.314 | 0.259 | 0.350 | +0.036 | +0.091 |

This turns the ranker choice into a repeatable harness artifact rather than a manual comparison. It also strengthens the BM25 rejection: on broad12, BM25 underperforms both lexical and structural at all budgets for `budget-rank-frontier`.

The first graph-neighborhood experiment is useful but not yet clean enough to replace `structural` as the default. `structural-neighbor` ties or improves `budget-rank-frontier` at most broad12 budgets and becomes the best ranker at 400 and 1200, but it slightly hurts `candidate-rank-frontier` at 200. On transfer6 it improves the 400-budget lane, ties 200/800 for `budget-rank-frontier`, and has a small 1200 regression.

| Slice | Budget | Policy | Structural F1 | Structural-neighbor F1 | Delta |
| --- | ---: | --- | ---: | ---: | ---: |
| broad12 | 200 | `budget-rank-frontier` | 0.161 | 0.161 | +0.000 |
| broad12 | 400 | `budget-rank-frontier` | 0.204 | 0.211 | +0.007 |
| broad12 | 800 | `budget-rank-frontier` | 0.308 | 0.308 | +0.000 |
| broad12 | 1200 | `budget-rank-frontier` | 0.350 | 0.355 | +0.005 |
| transfer6 | 200 | `budget-rank-frontier` | 0.126 | 0.126 | +0.000 |
| transfer6 | 400 | `budget-rank-frontier` | 0.127 | 0.141 | +0.014 |
| transfer6 | 800 | `budget-rank-frontier` | 0.163 | 0.163 | +0.000 |
| transfer6 | 1200 | `budget-rank-frontier` | 0.191 | 0.189 | -0.003 |

This is positive evidence for structural neighborhood expansion as a paradigm, but not enough to promote it. The next graph-inspired step should be parser-backed dependency neighborhoods or a two-stage ranker that chooses between structural and neighborhood expansion by budget/file-density features.

The parser-light dependency experiment is also mixed. It improves the `budget-rank-frontier` broad12 400/800 rows slightly and matches the 1200 structural-neighbor score within rounding, but it weakens plain candidate order and does not beat structural at transfer6 1200. It remains an explicit experiment rather than a default candidate.

| Slice | Budget | Policy | Structural F1 | Structural-neighbor F1 | Dependency-neighbor F1 | Decision |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| broad12 | 400 | `budget-rank-frontier` | 0.204 | 0.211 | 0.212 | Useful |
| broad12 | 800 | `budget-rank-frontier` | 0.308 | 0.308 | 0.310 | Useful |
| broad12 | 1200 | `budget-rank-frontier` | 0.350 | 0.355 | 0.355 | Tie with neighbor |
| transfer6 | 400 | `budget-rank-frontier` | 0.127 | 0.141 | 0.140 | Useful but not best |
| transfer6 | 800 | `budget-rank-frontier` | 0.163 | 0.163 | 0.163 | Tie |
| transfer6 | 1200 | `budget-rank-frontier` | 0.191 | 0.189 | 0.188 | Regresses |

The important design lesson is that cross-file graph signals need a gate. A future ranker should decide when to use dependency expansion based on observable features such as import density, anchor strength, file fanout, and budget, rather than applying it uniformly.

A weak-anchor gated dependency variant was tested and discarded. The gate required direct relation evidence and tried to apply cross-file bonuses only to weakly anchored target files, but on transfer6 it produced the same rows as `dependency-neighbor`: useful at 400/800 and still regressing 1200. Keeping it would add code without adding a distinct experimental behavior. The next gate should be learned or report-derived from ranker-sweep features, not another hand threshold.

The ranker sweep now emits `caseComparisons` for exactly that next gate. On transfer6 with `budget-rank-frontier` at budgets 400 and 1200, the case-level report shows the 400-budget gain is concentrated in `pytest-dev__pytest-8399`, while the 1200 regression is concentrated in `matplotlib__matplotlib-25287` and, for dependency expansion, `django__django-11820`.

| Ranker | Budget | Wins | Losses | Ties | Mean F1 delta | Main signal |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `structural-neighbor` | 400 | 1 | 0 | 5 | +0.014 | `pytest-dev__pytest-8399` gain |
| `dependency-neighbor` | 400 | 1 | 1 | 4 | +0.013 | pytest gain, matplotlib loss |
| `structural-neighbor` | 1200 | 0 | 1 | 5 | -0.003 | matplotlib loss |
| `dependency-neighbor` | 1200 | 0 | 2 | 4 | -0.003 | matplotlib and django losses |

This makes `structural-neighbor` the safer graph-inspired variant on the current evidence: it captures the same pytest gain without dependency-neighbor's extra 400-budget loss. A future gate should learn from case-level features that distinguish pytest-like structural-neighborhood wins from matplotlib/django high-budget losses.

The feature-bearing rerun makes the next gate more concrete. In the non-tie transfer6 rows, the pytest gain occurs with only a small file-spread increase and stable query overlap, while the matplotlib/django losses tend to broaden file spread and keep high noisy-path share without improving query overlap. Those are now machine-readable in `caseComparisons.features`, so the next experiment can train or evaluate a ranker gate from observable packet features instead of hand-reading JSON.

The first one-stump ranker gate is now part of ranker-sweep output under `gates`. For every non-baseline ranker/policy/budget, it trains a single feature threshold over `caseComparisons.features`, then reports baseline, candidate, routed, leave-one-out routed, and per-case oracle scores. On transfer6 and broad12, the gate finds plausible in-sample rules over `baseline:averageChunkLines`, but leave-one-out falls back to the structural baseline. This is useful negative evidence: the current slices are too small for a learned ranker gate, and fixed `structural-neighbor`/`structural` budget choices remain safer. The saved sweep artifact now includes enough compact per-case metrics for the stricter next check: train a frozen gate on one split and evaluate it on a disjoint saved sweep with `--swe-explore-ranker-gate-transfer-output`.

| Slice | Ranker | Budget | Baseline F1 | Candidate F1 | Routed F1 | Leave-one-out F1 | Oracle F1 | Decision |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| transfer6 | `dependency-neighbor` | 400 | 0.127 | 0.140 | 0.141 | 0.126 | 0.141 | overfits |
| transfer6 | `structural-neighbor` | 400 | 0.127 | 0.141 | 0.141 | 0.127 | 0.141 | fixed candidate wins in-sample only |
| transfer6 | `dependency-neighbor` | 1200 | 0.191 | 0.188 | 0.191 | 0.191 | 0.191 | structural wins |
| broad12 | `dependency-neighbor` | 400 | 0.204 | 0.212 | 0.212 | 0.205 | 0.212 | overfits |
| broad12 | `dependency-neighbor` | 1200 | 0.350 | 0.355 | 0.356 | 0.350 | 0.356 | overfits |
| broad12 | `structural-neighbor` | 1200 | 0.350 | 0.355 | 0.356 | 0.349 | 0.356 | overfits |

The next serious gate needs more rows or stronger features, not a narrower hand-tuned threshold. For now, the best evidence-backed boundary remains: `structural` is the stable repo-candidate default, `structural-neighbor` is the safer graph-inspired experiment, and `dependency-neighbor` is opt-in diagnostics only.

The first disjoint split-transfer report strengthens that boundary. Fresh transfer6 and remaining6 sweeps were regenerated with compact per-case metrics, then `--swe-explore-ranker-gate-transfer-output` trained on one split and evaluated on the other. A 400-budget dependency rule transfers only because the dependency ranker itself is the better fixed candidate on both splits; it does not beat the better fixed choice. High-budget rules reverse and regress when transferred:

| Train split | Eval split | Ranker | Budget | Baseline F1 | Candidate F1 | Routed F1 | Routed vs best fixed | Decision |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| transfer6 | remaining6 | `dependency-neighbor` | 400 | 0.281 | 0.283 | 0.283 | +0.000 | fixed candidate transfers |
| remaining6 | transfer6 | `dependency-neighbor` | 400 | 0.127 | 0.140 | 0.140 | +0.000 | fixed candidate transfers |
| remaining6 | transfer6 | `structural-neighbor` | 400 | 0.127 | 0.141 | 0.127 | -0.014 | trained wrong fixed side |
| remaining6 | transfer6 | `dependency-neighbor` | 1200 | 0.191 | 0.188 | 0.188 | -0.003 | regresses |
| transfer6 | remaining6 | `dependency-neighbor` | 1200 | 0.509 | 0.521 | 0.509 | -0.012 | regresses |
| transfer6 | remaining6 | `structural-neighbor` | 1200 | 0.509 | 0.521 | 0.509 | -0.012 | regresses |

This says the next ranker step should not be a learned one-stump gate over the current features. The viable near-term options are a conservative fixed 400-budget dependency/neighbor experiment with explicit split evidence, or stronger features that measure graph quality before cross-file expansion is allowed.

The anchored local-expansion follow-up tested the conservative fixed 400-budget option without dependency fanout. On transfer6, `anchored-neighbor` matches the strongest 400-budget graph result and avoids dependency-neighbor's 400-budget matplotlib loss, but it still inherits the high-budget regression pattern. It is therefore useful evidence for budget-scoped neighborhood expansion, not a default ranker:

| Budget | Structural F1 | Structural-neighbor F1 | Dependency-neighbor F1 | Anchored-neighbor F1 | Decision |
| ---: | ---: | ---: | ---: | ---: | --- |
| 400 | 0.127 | 0.141 | 0.140 | 0.141 | Matches best graph result |
| 1200 | 0.191 | 0.189 | 0.188 | 0.188 | Regresses; do not promote |

The ranker portfolio post-processor turns the hand-read transfer6 budget map into a reproducible report. On the saved anchored transfer6 sweep, `--swe-explore-ranker-portfolio-target f1` selects `structural-neighbor` at budget `400` and `structural` at budget `1200`, both with `budget-rank-frontier`:

| Budget | Selected ranker | Selected policy | Selected F1 |
| ---: | --- | --- | ---: |
| 400 | `structural-neighbor` | `budget-rank-frontier` | 0.141 |
| 1200 | `structural` | `budget-rank-frontier` | 0.191 |

This report is useful because it makes the budget-specific fixed-ranker hypothesis explicit. It is not promotion evidence by itself: the broader/remaining saved sweep artifacts were not available in this local `/tmp` state, so the map still needs a disjoint-split portfolio run before any runtime or benchmark default changes.

The reciprocal-rank-fusion repo-ranker probe is positive but not yet safe to promote. On June 14, 2026, the public SWE-Explore JSONL was downloaded to `/tmp` from Hugging Face and `pydata__xarray-4629` was prepared at base commit `a41edc7bf5302f2ea327943c0c48c532b12009bc`. A non-oracle repo-candidate sweep over `structural`, `structural-neighbor`, `dependency-neighbor`, `anchored-neighbor`, and `hybrid-rrf` used `40,80` line chunks, `300` prefiltered files, `800` ranked chunks, budgets `400,1200`, and `budget-rank-frontier`:

```sh
bun run packages/core/script/context-ledger-benchmark.ts --swe-explore /tmp/swe-explore-bench.final.public.jsonl --swe-explore-instance-ids pydata__xarray-4629 --swe-explore-repos-root /tmp/swe-explore-single --swe-explore-source-map /tmp/swe-explore-single/source-map.jsonl --swe-explore-ranker-sweep-output /tmp/swe-explore-single/xarray-ranker-sweep-hybrid.json --swe-explore-ranker-sweep-rankers structural,structural-neighbor,dependency-neighbor,anchored-neighbor,hybrid-rrf --swe-explore-multiscale-chunk-lines 40,80 --swe-explore-max-repo-files 300 --swe-explore-max-repo-chunks 800 --budgets 400,1200 --policies budget-rank-frontier
```

| Budget | Best ranker | Structural F1 | Hybrid-RRF F1 | Delta |
| ---: | --- | ---: | ---: | ---: |
| 400 | `structural` | 0.539 | 0.539 | +0.000 |
| 1200 | `hybrid-rrf` | 0.922 | 0.984 | +0.063 |

The follow-up portfolio report selects `structural` at `400` and `hybrid-rrf` at `1200` for this one instance. Treat this as a promising probe for ensemble retrieval, not a default-setting result; it needs the same transfer6/broad12/remaining split treatment as the earlier neighborhood rankers.

After recovering the matplotlib checkout with `git config http.version HTTP/1.1`, the same sweep completed on the six-instance transfer slice. `hybrid-rrf` becomes the best F1 ranker at both budgets and the portfolio report selects it for both rows:

| Budget | Structural F1 | Structural-neighbor F1 | Anchored-neighbor F1 | Hybrid-RRF F1 | Hybrid delta vs structural | Hybrid first useful hit |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 400 | 0.127 | 0.141 | 0.141 | 0.192 | +0.065 | 0.417 |
| 1200 | 0.191 | 0.189 | 0.188 | 0.223 | +0.031 | 0.589 |

The tradeoff is visible in rank-order utility: first-useful-hit regresses versus structural at both budgets (`0.483` to `0.417` at 400, `0.678` to `0.589` at 1200). This makes `hybrid-rrf` the strongest F1 candidate in the current transfer6 repo-snapshot evidence, but not a runtime or benchmark-default promotion yet. The next gate should evaluate `hybrid-rrf` on broad12/remaining splits and include first-useful-hit or trajectory AUC as an explicit target, not only final F1.

The broad12 rerun strengthens the ensemble-ranker case. Using the same public SWE-Explore rows, source-map path, prepared repositories under `/tmp/swe-explore-transfer6-hybrid`, `40,80` line chunks, `300` prefiltered files, `800` ranked chunks, budgets `400,1200`, and `budget-rank-frontier`, `hybrid-rrf` is the best F1 ranker at both budgets:

| Slice | Budget | Structural F1 | Best non-hybrid F1 | Hybrid-RRF F1 | Hybrid first useful hit |
| --- | ---: | ---: | ---: | ---: | ---: |
| transfer6 | 400 | 0.127 | 0.141 | 0.192 | 0.417 |
| transfer6 | 1200 | 0.191 | 0.189 | 0.223 | 0.589 |
| broad12 | 400 | 0.204 | 0.212 | 0.236 | 0.683 |
| broad12 | 1200 | 0.350 | 0.355 | 0.375 | 0.772 |

The new `f1-first-useful` portfolio target computes the harmonic mean of final F1 and first-useful-hit. On the combined transfer6+broad12 reports, both plain `f1` and `f1-first-useful` select `hybrid-rrf` for budgets `400` and `1200`; pure `first-useful-hit` still selects neighborhood rankers (`anchored-neighbor` at 400 and `structural-neighbor` at 1200). This makes the promotion boundary clearer: `hybrid-rrf` is the current best final-retrieval ranker, while neighborhood rankers remain better if early first-hit latency is the primary objective.

The saved gate-transfer report over transfer6 and broad12 is also improved compared with the earlier dependency-neighbor gates. For `hybrid-rrf` at 400, a one-stump rule over `baseline:averageChunkLines` transfers in both directions and beats the better fixed choice on the held-out split by `+0.005` to `+0.010` F1. At 1200, the gate is not stable enough: training on transfer6 regresses the broad12 held-out split by `-0.006` F1 versus fixed `hybrid-rrf`. Keep the learned gate benchmark-only; fixed `hybrid-rrf` is the stronger candidate for the next held-out run.

The stricter disjoint transfer check uses transfer6 versus the remaining six broad-slice repos (`pydata__xarray-4629`, `astropy__astropy-13977`, `pallets__flask-5014`, `pylint-dev__pylint-4970`, `psf__requests-5414`, and `mwaskom__seaborn-3187`). On remaining6 alone, `dependency-neighbor` narrowly wins 400-budget F1 and `hybrid-rrf` wins 1200-budget F1:

| Split | Budget | Best ranker | Structural F1 | Dependency-neighbor F1 | Hybrid-RRF F1 | Hybrid first useful hit |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| transfer6 | 400 | `hybrid-rrf` | 0.127 | 0.140 | 0.192 | 0.417 |
| transfer6 | 1200 | `hybrid-rrf` | 0.191 | 0.188 | 0.223 | 0.589 |
| remaining6 | 400 | `dependency-neighbor` | 0.281 | 0.283 | 0.280 | 0.950 |
| remaining6 | 1200 | `hybrid-rrf` | 0.509 | 0.521 | 0.528 | 0.956 |

The combined transfer6+remaining6 portfolio still selects `hybrid-rrf` for both `f1` and `f1-first-useful` at 400 and 1200 because it avoids the large transfer6 regression that dependency-neighbor has. The updated portfolio report also emits a maximin `robustRanker` chosen by worst split score; for transfer6+remaining6, `hybrid-rrf` is both the mean-selected and robust-selected ranker at both budgets for `f1` and `f1-first-useful`:

| Target | Budget | Mean-selected ranker | Robust ranker | Robust min score |
| --- | ---: | --- | --- | ---: |
| `f1` | 400 | `hybrid-rrf` | `hybrid-rrf` | 0.192 |
| `f1` | 1200 | `hybrid-rrf` | `hybrid-rrf` | 0.223 |
| `f1-first-useful` | 400 | `hybrid-rrf` | `hybrid-rrf` | 0.263 |
| `f1-first-useful` | 1200 | `hybrid-rrf` | `hybrid-rrf` | 0.323 |

The ranker portfolio stability report is stricter than the combined fixed-candidate report. It derives a ranker/policy pair from one split and evaluates that frozen choice on the other split with `--swe-explore-ranker-portfolio-max-heldout-loss 0.01`. For `f1-first-useful`, transfer6-derived `hybrid-rrf` is stable at both budgets, but a remaining6-derived 400-budget map selects `dependency-neighbor` and loses too much on transfer6:

| Train split | Budget | Frozen ranker | Held-out max regret | Stable at 0.01 |
| --- | ---: | --- | ---: | --- |
| transfer6 | 400 | `hybrid-rrf` | 0.003 | Yes |
| transfer6 | 1200 | `hybrid-rrf` | 0.000 | Yes |
| remaining6 | 400 | `dependency-neighbor` | 0.045 | No |
| remaining6 | 1200 | `hybrid-rrf` | 0.000 | Yes |

Pure F1 produces the same stability boundary: remaining6-derived `dependency-neighbor` at budget 400 has held-out regret `0.052`, while `hybrid-rrf` is the all-split robust fixed ranker at 400 and 1200 with robust min F1 scores `0.192` and `0.223`. This keeps `hybrid-rrf` as the next fixed-ranker candidate, but blocks promoting a split-learned budget map as stable across the current disjoint slices.

Pure `first-useful-hit` selects `anchored-neighbor` at 400 and `structural-neighbor` at 1200, with robust minimum first-hit scores of `0.483` and `0.689`. The gate-transfer report confirms the same boundary: fixed `hybrid-rrf` is robust for final retrieval, but learned one-stump routing is still unsafe. Training on remaining6 at 400 routes to structural and loses `-0.065` F1 versus fixed `hybrid-rrf` on transfer6; at 1200, either training direction regresses the held-out split versus fixed `hybrid-rrf`.

The coverage-aware selector follow-up is neutral on the current real slices. The first version over-penalized overlap and regressed transfer6, so it was narrowed to near-duplicate suppression only. In that safer form it preserves `budget-rank-frontier` results exactly on transfer6 and broad12 at the measured 400/1200 budgets:

| Slice | Budget | Budget-rank F1 | Coverage-rank F1 | Decision |
| --- | ---: | ---: | ---: | --- |
| transfer6 | 400 | 0.10 | 0.10 | Tie |
| transfer6 | 1200 | 0.12 | 0.12 | Tie |
| broad12 | 400 | 0.14 | 0.14 | Tie |
| broad12 | 1200 | 0.18 | 0.18 | Tie |

This means duplicate suppression is a useful guardrail for pathological multiscale candidate pools, but it has no measured upside on the prepared SWE-Explore slices. It should stay non-default unless a later candidate generator creates real duplicate-span pressure.

The MMR-style selector follow-up tested whether stronger diversity pressure helps the current best `hybrid-rrf` repo ranker. `mmr-rank-frontier` greedily penalizes overlapping spans and same-file repetition while giving a modest reward to unseen files. On transfer6 and remaining6, that over-diversifies the packet: it sometimes improves file spread in the printed table, but final region F1 drops versus `budget-rank-frontier` on every measured row:

| Slice | Budget | Budget-rank F1 | MMR-rank F1 | Delta |
| --- | ---: | ---: | ---: | ---: |
| transfer6 | 400 | 0.192 | 0.149 | -0.043 |
| transfer6 | 1200 | 0.223 | 0.214 | -0.008 |
| remaining6 | 400 | 0.280 | 0.279 | -0.001 |
| remaining6 | 1200 | 0.528 | 0.386 | -0.141 |

This rejects MMR as currently tuned. The result is still informative: for SWE-Explore repo candidates, preserving high-confidence ranked neighborhoods matters more than maximizing file diversity after `hybrid-rrf` has already fused several retrieval signals.

The June 15, 2026 mixed-slice calibration reran the implemented repo rankers on 12 verified-dev cases (six xarray, six scikit-learn) and 12 repository-held-out cases (seaborn, flask, pylint, sphinx) using the same `40,80` multiscale chunks, 300 prefiltered files, 800 ranked chunks, budgets `400,1200`, and `budget-rank-frontier`. Artifacts are under `/tmp/ctxledger-ranker-calibration-20260615032258/` and `/tmp/ctxledger-ranker-calibration-20260615033123/`.

| Budget | Ranker | Dev12 F1 delta vs structural | Heldout12 F1 delta vs structural | Mean delta | Decision |
| ---: | --- | ---: | ---: | ---: | --- |
| 400 | `hybrid-rrf` | +0.008 | +0.001 | +0.004 | Include in default offline sweep |
| 400 | `dependency-neighbor` | -0.006 | +0.006 | -0.000 | Keep diagnostic |
| 1200 | `hybrid-rrf` | +0.014 | +0.049 | +0.032 | Strongest fixed candidate |
| 1200 | `bm25` | +0.016 | +0.023 | +0.019 | Already in default sweep |
| 1200 | `structural-neighbor` | +0.004 | +0.019 | +0.011 | Already in default sweep |

This is enough to make `hybrid-rrf` part of the default offline SWE-Explore ranker sweep so broad reports always include the best current ensemble candidate. It is not enough to make it a runtime default or to claim SOTA: the evidence is still official-style retrieval/packing quality on bounded repo slices, not live OpenCode solve rate.

The full verified broad50 structural-vs-hybrid run on June 15, 2026 gives the stronger transfer boundary. It reran both repository-disjoint splits with `structural,hybrid-rrf`, `40,80` multiscale chunks, 300 prefiltered files, 800 ranked chunks, budgets `400,1200`, and `budget-rank-frontier`. Artifacts are:

- `data/SWE-Explore-Bench/broad50-verified-dev-hybrid-rrf-ranker-sweep.json`
- `data/SWE-Explore-Bench/broad50-verified-heldout-hybrid-rrf-ranker-sweep.json`
- `data/SWE-Explore-Bench/broad50-verified-hybrid-rrf-portfolio-f1.json`
- `data/SWE-Explore-Bench/broad50-verified-hybrid-rrf-portfolio-f1-first-useful.json`
- `data/SWE-Explore-Bench/broad50-verified-hybrid-rrf-gate-transfer.json`
- `data/SWE-Explore-Bench/broad50-verified-dev-content-hybrid-merged-ranker-sweep.json`
- `data/SWE-Explore-Bench/broad50-verified-heldout-content-hybrid-merged-ranker-sweep.json`
- `data/SWE-Explore-Bench/broad50-verified-content-hybrid-merged-portfolio-f1-first-useful.json`

| Split | Budget | Best fixed ranker | Hybrid F1 delta vs structural | Hybrid first-useful delta | Decision |
| --- | ---: | --- | ---: | ---: | --- |
| broad50 verified dev | 400 | `hybrid-rrf` | +0.004 | -0.035 | F1-positive but first-hit negative |
| broad50 verified heldout | 400 | `structural` | -0.001 | -0.052 | Do not promote fixed hybrid at 400 |
| broad50 verified dev | 1200 | `hybrid-rrf` | +0.003 | +0.001 | Small positive |
| broad50 verified heldout | 1200 | `hybrid-rrf` | +0.015 | +0.004 | Transfers; strongest fixed candidate |

The portfolio reports make this explicit. Plain mean-F1 selects `hybrid-rrf` at both budgets, but the maximin robust choice is `structural` at 400 and `hybrid-rrf` at 1200. The `f1-first-useful` portfolio also selects `structural` at 400 and `hybrid-rrf` at 1200. Learned one-stump gates remain benchmark-only: a heldout-trained 1200 gate transfers with `+0.001` F1 over the best fixed dev choice, but the dev-trained 1200 gate regresses heldout by `-0.015` F1 versus fixed `hybrid-rrf`. The current evidence-backed rule is therefore: keep `structural` as the conservative low-budget ranker, include `hybrid-rrf` in offline sweeps, and treat fixed `hybrid-rrf` at larger budgets as the next live-candidate path.

The content-backfill plus hybrid merged reports reproduce the same decision while avoiding another slow hybrid rerun. On the merged dev report, `hybrid-rrf` beats both `structural` and `content-backfill` at budgets 400 and 1200. On the merged heldout report, `structural` still wins at 400 and `hybrid-rrf` wins at 1200. The merged `f1-first-useful` portfolio again selects `structural` at 400 and `hybrid-rrf` at 1200.

A follow-up dev12 selector calibration showed that a small development slice could make the low-budget issue look like a selector problem. A guarded structural-prefix ranker was tested and rejected because it reproduced the same 400-budget metrics as `hybrid-rrf` while adding expensive reranking work. The retained selector probe was `rank-portfolio-frontier`: use candidate order directly at budgets up to 400, then use the existing scale-aware `budget-rank-frontier` at larger budgets. On the 12 verified-dev cases in `data/SWE-Explore-Bench/hybrid-policy-dev12-ranker-sweep.json`, `hybrid-rrf` at budget 400 improved from F1 `0.1623` with `budget-rank-frontier` to F1 `0.1810` with `candidate-rank-frontier`; at budget 1200, `budget-rank-frontier` remained slightly better (`0.2517` vs `0.2504`). The new `data/SWE-Explore-Bench/rank-portfolio-hybrid-dev12-ranker-sweep.json` reproduced that budget map exactly: F1 `0.1810` at 400 and `0.2517` at 1200.

The repository-held-out transfer check rejected that selector promotion. In `data/SWE-Explore-Bench/broad50-verified-heldout-hybrid-rank-portfolio-ranker-sweep.json`, `rank-portfolio-frontier` matches `candidate-rank-frontier` at 400 and therefore regresses the safer `budget-rank-frontier` heldout lane: `hybrid-rrf` F1 drops from `0.1103` to `0.1003`, and `structural` F1 drops from `0.1117` to `0.1113`. At 1200, `rank-portfolio-frontier` simply matches `budget-rank-frontier` (`hybrid-rrf` F1 `0.1570`), while plain `candidate-rank-frontier` has slightly higher F1 (`0.1587`) but worse first-useful hit. The current broad50-backed selector boundary stays conservative: use `budget-rank-frontier` for hybrid ranker evaluation, do not promote `rank-portfolio-frontier`.

First public SWE-Explore smoke on the first 50 released rows, using all current policies and `--target-report-targets line-f1,auc-line`:

| Budget | Best line-F1 policy | Best line-F1 | Best AUC-line policy | Best AUC-line | `official-frontier` line-F1 |
| ---: | --- | ---: | --- | ---: | ---: |
| 200 | `adaptive-frontier` | 0.044 | `file-frontier` | 0.037 | 0.044 |
| 400 | `relevance-frontier` | 0.174 | `fusion-frontier` | 0.164 | 0.136 |
| 800 | `coherence-frontier` | 0.285 | `action-aware-frontier` | 0.284 | 0.285 |
| 1200 | `relevance-frontier` | 0.368 | `relevance-frontier` | 0.381 | 0.361 |

This is not enough evidence to change the default, but it justifies `exploration-frontier` as a separate policy candidate for line-budget exploration reports.

The stronger public run over all 848 rows with `--swe-explore-max-optional-regions 20` shows the smoke-derived relevance routing does not transfer, while `coherence-frontier` is the strongest fixed policy for both line-F1 and AUC-line across the measured budgets. The non-default `exploration-frontier` packages that result without changing `official-frontier`:

| Budget | `official-frontier` line-F1 | `exploration-frontier` line-F1 | `official-frontier` AUC-line | `exploration-frontier` AUC-line | Winner |
| ---: | ---: | ---: | ---: | ---: | --- |
| 200 | 0.097 | 0.101 | 0.065 | 0.068 | `exploration-frontier` |
| 400 | 0.179 | 0.213 | 0.152 | 0.182 | `exploration-frontier` |
| 800 | 0.285 | 0.309 | 0.284 | 0.305 | `exploration-frontier` |
| 1200 | 0.372 | 0.386 | 0.396 | 0.413 | `exploration-frontier` |

The current `exploration-frontier` therefore delegates to `coherence-frontier` for SWE-Explore-style line-region exploration. This keeps the default stable while exposing the stronger line-budget selector as an explicit experiment candidate.

Official-style SWE-Explore metric export is now wired in as a closer compatibility lane with the released `ExploreEvaluator` formulas for finite positive line ranges. The full public capped run wrote `6,784` rows (`848` cases x `2` policies x `4` budgets) and confirms the same candidate direction across the broader metric family:

| Budget | Policy | Precision | Recall | F1 | WCC | Efficiency | nDCG@300 | Recall@300 | First hit |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | `official-frontier` | 0.415 | 0.091 | 0.097 | 0.514 | 0.949 | 0.788 | 0.091 | 0.821 |
| 200 | `exploration-frontier` | 0.420 | 0.095 | 0.101 | 0.503 | 0.949 | 0.789 | 0.095 | 0.817 |
| 400 | `official-frontier` | 0.368 | 0.195 | 0.179 | 0.583 | 0.954 | 0.733 | 0.178 | 0.838 |
| 400 | `exploration-frontier` | 0.407 | 0.231 | 0.213 | 0.589 | 0.954 | 0.746 | 0.209 | 0.846 |
| 800 | `official-frontier` | 0.382 | 0.357 | 0.285 | 0.675 | 0.971 | 0.671 | 0.246 | 0.885 |
| 800 | `exploration-frontier` | 0.406 | 0.384 | 0.309 | 0.686 | 0.971 | 0.692 | 0.262 | 0.884 |
| 1200 | `official-frontier` | 0.406 | 0.493 | 0.372 | 0.752 | 0.978 | 0.661 | 0.282 | 0.899 |
| 1200 | `exploration-frontier` | 0.418 | 0.513 | 0.386 | 0.757 | 0.978 | 0.685 | 0.297 | 0.901 |

The compatibility caveat is important: the table above is not yet a SWE-Explore leaderboard run. It scores ContextLedger selections over trajectory-derived candidate regions. The new repository-candidate mode removes that candidate-pool leakage, but a true explorer comparison still needs complete repository snapshots plus issue text, then either a live OpenCode/GPT explorer or an OpenCode-to-ranked-region adapter that does not see optional/core labels.

The first action-aware smoke on the checked-in Agent Retrieval Bench `v0_1` fixture uses synthetic candidates, so it is not a public V1 leaderboard comparison. It is still useful as a controlled ranking experiment: at budget 400, `official-frontier` packet-order MRR is `0.386` overall, while action-aware MRR is `0.414`; the gain comes from `code2test` MRR improving from `0.088` to `0.147`, with `comment2context` unchanged at `0.750`. Recall@5 remains `0.429` because the selected file set is unchanged; only file order changes.

`action-aware-frontier` moves that result into the selector layer. It delegates to `official-frontier` for event selection, then reorders selected code-context and diff events before rendering. On the same `v0_1` fixture at budget 400, `action-aware-frontier` improves packet-order overall MRR from `0.386` to `0.429` versus `official-frontier`; `code2test` MRR improves from `0.088` to `0.176`, while `comment2context` stays `0.750` and Recall@5 stays `0.429`. The standard benchmark table now also exposes the ordering effect: final file/span/line F1 is unchanged at `0.30`, but local trajectory `auc line` improves from `0.39` to `0.43`. This is intentionally an experimental policy rather than the default: it can improve ranking-style retrieval metrics when the next action is clear, but it should be tested on the V1 corpus and ContextBench before changing default compaction behavior.

`intent-frontier` is the next selection-level experiment. It uses explicit structured task intent, currently `changed_file`/`changed_files`, before fitting events into the budget; without that signal it falls back to `official-frontier`. On the same checked-in Agent Retrieval Bench `v0_1` fixture with synthetic candidates, it materially improves `code2test` because related tests can be selected before implementation/supporting distractors:

| Budget | Policy | Overall MRR | Recall@5 | `code2test` MRR | `comment2context` MRR | Event/line F1 | AUC line |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | `official-frontier` | 0.257 | 0.257 | 0.000 | 0.562 | 0.25 | 0.26 |
| 200 | `intent-frontier` | 0.429 | 0.370 | 0.353 | 0.562 | 0.37 | 0.37 |
| 400 | `official-frontier` | 0.386 | 0.429 | 0.088 | 0.750 | 0.30 | 0.39 |
| 400 | `action-aware-frontier` | 0.429 | 0.429 | 0.176 | 0.750 | 0.30 | 0.43 |
| 400 | `intent-frontier` | 0.743 | 0.697 | 0.824 | 0.750 | 0.57 | 0.68 |

The guardrail now holds for unstructured issue prose. On a 20-row ContextBench proxy sample, gated `intent-frontier` matches `official-frontier` at 200 and 400 tokens because ContextBench issue statements do not carry the structured `changed_file` action signal. This keeps the ARB `code2test` gain without degrading current ContextBench proxy behavior. The remaining promotion bar is still higher: run public V1 Agent Retrieval Bench with real corpus chunks and an official ContextBench policy report before considering any runtime default change.

Attempted public V1 access on June 14, 2026 was blocked in this environment: `hf download` was killed by the process manager and direct HTTP fetches for `benchmark/v1/samples.jsonl`, `corpus/v1/corpus_manifest.jsonl`, and `reports/v1/model_leaderboard.json` returned `401` while `hf auth whoami` reported `Not logged in`. The manifest loader is ready for V1 once the dataset is available locally or HF authentication is configured.

This path fetches rows from the Hugging Face datasets server with bounded retry for transient 5xx/429 failures and converts `gold_context` spans into target context events. Failing and passing test identifiers become competing events. Only path-like test identifiers, such as `tests/test_config.py::test_empty_env`, contribute file hints; bare test descriptions such as `test_x (module.Class)` stay as evidence text. The task prompt is not charged to the retrieval budget by default; use `--include-problem` only when modeling compaction retention instead of ContextBench retrieval. `gold_files` are used for scoring, not as selector hints. The sampler reports event, file, span, and line F1 so local runs can be compared against ContextBench's official file/span/line evaluator shape before full trajectory scoring.

Use `--include-test-code-context` for a harder stress lane that adds related test files as non-gold `code-context` hard negatives. This does not change the official gold rows; it only makes the selector choose among more plausible retrieved-code candidates.

`--prediction-output` writes ContextBench-style `pred_steps`, `pred_files`, and `pred_spans`; `--gold-output` writes matching one-row-per-instance gold JSONL from the same fetched rows. Query-aware policies receive each case's issue statement during prediction export. If `--prediction-policy` is omitted, prediction export uses `SessionContextLedger.DEFAULT_SELECTION_POLICY`, currently `official-frontier`, so exported predictions match the runtime ledger default.

`--prediction-eval-output` writes a local prediction-vs-gold report using `--prediction-eval-gold`. It accepts the same ContextBench gold JSONL shape emitted by `--gold-output` and reports final file/span/line recall, precision, F1, plus trajectory AUC coverage. This is not the official evaluator, but it is the fastest scored check for `--opencode-export`, `--opencode-messages`, and selector-generated prediction JSONL before spending on the Python evaluator.

`--official-eval-output` runs the official ContextBench evaluator after prediction and gold JSONL have been written. It requires `--prediction-output` and `--gold-output`, accepts `--official-eval-python`, `--official-eval-module`, `--official-eval-pythonpath`, and `--official-eval-cache`, and fails the CLI if the evaluator exits non-zero. This keeps official evaluator scores separate from the in-process selector metrics. The equivalent direct evaluator path is:

```sh
PYTHONPATH=/tmp/ContextBench /tmp/contextbench-venv/bin/python -m contextbench.evaluate --gold gold.jsonl --pred predictions.jsonl --cache /tmp/contextbench-repos --out results.jsonl
```

`--official-summary-input` reads official ContextBench evaluator JSONL and emits an aggregate JSON summary. It reports row count, final file/symbol/span/line coverage, precision, F1, equal-weight file/span/line official utility, trajectory AUC coverage, and edit-localization recall/precision. Use this to summarize official evaluator output without mixing it with the in-process selector-pressure tables.

`--official-policy-report-output` runs the official ContextBench evaluator once per listed policy and budget, then writes a JSON report containing prediction row counts, official row counts, and the same official summary metrics per policy. It accepts either `--budget` or `--budgets`; single-budget runs preserve top-level `budget`, `policies`, `best`, and `comparisons` fields, while all runs include a `results` array keyed by budget. If `--gold-output` is not supplied, it can derive a temporary gold JSONL from `--contextbench`; evaluator options are shared with `--official-eval-output`. Use `--official-policy-report-policies` for a comma-separated policy list. This is the fastest path for checking whether a proxy-winning policy also survives the official evaluator; the `officialUtility` field is the report's equal-weight file/span/line F1 score, and `best` records the best policy for official utility, file F1, span F1, line F1, and AUC line coverage. `comparisons` reports paired per-instance deltas against `SessionContextLedger.DEFAULT_SELECTION_POLICY` when it is included in the policy list, otherwise the first listed policy. Each comparison includes mean delta, standard error, a normal-approximation 95% interval, win/loss/tie counts, and capped `topImprovements`/`topRegressions` examples with instance ids and scores.

`--selection-delta-output` writes a local selector-difference report for two policies across the requested budget or budgets. It defaults to `portfolio-frontier` as `--selection-delta-baseline` and `official-frontier` as `--selection-delta-policy`, with optional `--selection-delta-limit`. Each row includes metric deltas plus gained/lost files, gained/lost gold files, changed spans, and policy-only events. Use this after an official report identifies a promising or regressing instance; it explains what the selector changed before another algorithm tweak is made.

`--analysis-output` writes a JSON diagnostic report with per-budget oracle F1, policy win counts, average F1/span/line F1, and average regret against the per-case winner. Use this before adding new selector variants; aggregate tables can hide that one policy wins early budgets while another wins later budgets.

`--policies` accepts a comma-separated subset of selection policies for local reports. Use it for focused default-vs-candidate runs such as `--policies official-frontier,intent-frontier`; omit it when deriving aggregate portfolios or stability reports across the full policy set.

`--target-report-output` writes a JSON fixed-policy comparison report across `event-f1`, `span-f1`, `line-f1`, `auc-line`, and `official-utility`, unless a subset is supplied with `--target-report-targets`. `auc-file` and `auc-span` are also accepted for focused ordering analysis. For each budget, it reports the best fixed policy per target, per-policy regret against those target winners, regret against per-case target oracles, and Pareto-optimal policies. Use this before promoting aggregate-best policies: a selector can improve event F1 while losing span/line overlap, ordering quality, or official utility.

`--portfolio-report-output` writes a JSON budget-to-policy portfolio report. With `--portfolio-objective target-score`, it chooses the best fixed policy for `--portfolio-target` at each budget; with the default `--portfolio-objective minimax-regret`, it chooses the policy with the lowest worst regret across `event-f1`, `span-f1`, `line-f1`, `auc-line`, and `official-utility`, or a custom `--portfolio-targets` subset. Use this as the bridge between analysis and selector design: a hardcoded runtime frontier should be backed by a portfolio report rather than by eyeballing aggregate tables.

`--portfolio-stability-report-output` consumes multiple case JSONL splits via `--portfolio-stability-split-inputs`, derives a budget-to-policy portfolio on each split, and evaluates that frozen map on every other split. It uses the same `--portfolio-objective`, `--portfolio-target`, and `--portfolio-targets` options as `--portfolio-report-output`; `--portfolio-max-heldout-loss` controls how much held-out objective loss is tolerated before a train-split portfolio is marked unstable. This is stricter than the aggregate portfolio report because the evaluation split cannot influence the selected budget map.
The report also emits fixed-policy rows for each budget, including each policy's max held-out loss across splits, mean held-out loss, split wins, and a `robustPolicy` chosen by lowest max loss. This separates "the portfolio learned on a split transfers" from "a fixed policy is the best stable compromise across splits."

`--router-output` writes a cross-validated budget-router report. For each budget, it chooses the best fixed policy on training folds and evaluates that choice on held-out cases, reporting router F1, span/line F1, oracle F1, and regret versus both the per-case oracle and the best fixed policy. This is an experiment guardrail: a router that only wins in-sample should stay out of production.

`--feature-router-output` writes a cross-validated one-stump feature-router report. It trains on observable candidate/query features such as code event count, path shares, span volume, query-term overlap, file-cluster share, and per-policy selection features such as selected span volume, file count, fill ratio, path mix, and policy deltas; it does not use `gold_ids` or `gold_files` as features. Use `--feature-router-target event-f1|span-f1|line-f1|official-utility` to train against event recall/precision, span overlap, line overlap, or equal-weight file/span/line utility. The output is still benchmark-only until held-out gains are consistent enough to justify a production selector.

`--feature-router-rules-output` writes a reusable JSON rule artifact trained on all provided cases for the selected budgets, policies, and target. Use `--feature-router-validation-folds` and `--feature-router-min-validation-gain` to require internal fold validation before a learned stump is promoted; otherwise the artifact falls back to the training-sample best fixed policy for that budget. `--feature-router-rules-input` applies that exact artifact to another case set and writes held-out metrics with `--feature-router-eval-output`. This gives a stricter train/held-out path than cross-validation reports: once a rule artifact is written, held-out evaluation cannot silently retrain on the evaluation rows.

`--promotion-report-output` consumes multiple case JSONL splits via `--promotion-split-inputs` and trains a frozen feature-router artifact on each split, then evaluates it on every other split. A budget is promotable only when every training split emits a non-constant learned rule that passed internal validation and every held-out split clears `--promotion-min-heldout-gain`. This report is the current gate before any learned router can move into runtime `auto` behavior.

`--stability-report-output` consumes multiple case JSONL splits via `--stability-split-inputs` and evaluates every fixed policy on every split. It reports split wins, mean/min target score, worst delta from each split's best policy, and a maximin robust policy per budget. Use this before promoting a deterministic policy such as `portfolio-frontier`; aggregate-best and robust-best can differ.

`--opencode-export` converts `opencode export <sessionID>` JSON into ContextBench-style prediction JSONL. It extracts trajectory steps from file parts, completed tool inputs/attachments, read-tool line metadata, read-tool `<path>`/`<content>` output, and patch parts. This is the bridge for evaluating real OpenCode runs once a session is mapped to a ContextBench `instance_id`. A live `openai/gpt-5.5 --variant high` smoke now verifies the path end to end: run OpenCode, export the session, then convert and locally score the export with `--instance-id live__ctxledger-export --prediction-output predictions.jsonl --prediction-eval-gold gold.jsonl --prediction-eval-output prediction-eval.json`.

`--opencode-export-manifest` batch-converts exported OpenCode sessions. Each manifest JSONL row has `instance_id`, `export_path`, optional `session_id`, and optional `label`; relative `export_path` values resolve from the manifest file's directory. Pair it with `--prediction-eval-gold` and `--prediction-eval-output` to aggregate file/span/line/AUC scores across multiple live sessions before running the official evaluator.

`--opencode-run-manifest` runs live OpenCode tasks and immediately exports/scored their trajectories through the same prediction bridge. Each run manifest row has `instance_id`, `dir`, either `prompt` or `prompts`, and optional `run_id`, `title`, `model`, `variant`, `extra_args`, `env`, inline `config`, `answer_contains`, `answer_regex`, `file_checks`, and `command_checks`; relative `dir` values resolve from the manifest file's directory. A single `prompt` creates a one-turn run. A `prompts` array creates the session with the first prompt, resumes the same session with `--session` for later prompts, and exports the final session; `title` is only sent on the first turn. `run_id` controls artifact filenames while preserving `instance_id` for scoring, so the same benchmark case can be run under baseline and ContextLedger configs without collisions. Inline `config` is passed through `OPENCODE_CONFIG_CONTENT`, which lets live lanes toggle `compaction.context_ledger` without mutating global or project config. By default it runs `openai/gpt-5.5` with `--variant high` through the local OpenCode source command, but `--opencode-run-model`, `--opencode-run-variant`, `--opencode-run-command-json`, `--opencode-run-extra-args-json`, `--opencode-run-env-json`, and `--opencode-run-config-json` make the lane explicit and reproducible. Use the extra-args hook for fixed controls such as `["--pure"]`. `answer_contains` and `answer_regex` score the final text answer from run stdout, which is useful for live recall probes where trajectory file coverage alone is too weak. `file_checks` scores actual post-run files with per-file `contains`, `not_contains`, and `regex` assertions. `command_checks` runs explicit commands such as `["npm", "test"]` after the OpenCode run, captures stdout/stderr artifacts, and scores exit code plus `contains` / `not_contains` / `regex` assertions. Together these fields give live edit probes direct artifact- and test-based pass/fail results. The runner writes per-run run/export stdout and stderr under `--opencode-run-output-dir`, writes an export manifest with `--opencode-run-export-manifest-output`, optionally writes `--opencode-run-report-output`, and then emits prediction JSONL/evaluation if the usual `--prediction-*` options are supplied.

`--opencode-run-report-output` is the preferred live A/B summary. It preserves one row per run with `runID`, label/title, session ID, turn count, requested model, exported provider/model/variant, token totals, artifact paths, inline config, optional final-answer checks, optional file/command checks, and local metrics when `--prediction-eval-gold` is present. It also emits per-label metric summaries and paired comparisons that treat the first row for each `instance_id` as baseline and each later row as a candidate. This keeps baseline-vs-ContextLedger GPT-5.5 runs auditable even when both rows intentionally share the same benchmark `instance_id`.

`--opencode-compaction-summary-manifest` scores actual OpenCode compaction summaries after export. It reuses the export manifest shape from `--opencode-run-export-manifest-output`: each row supplies `instance_id`, `export_path`, and optional `session_id` / `label`. Pair it with `--compaction-summary-gold`, a JSONL file of `{ "instance_id": "...", "gold": [{ "id": "...", "category": "constraint|latest-test|diff|evidence|decision|file|other", "text": "...", "file": "..." }] }`, and `--compaction-summary-output`. The report extracts assistant messages marked as compaction summaries, prefers summaries attached to user messages with a `compaction` part when present, then reports claim recall, survived/missing IDs, summary token count, and category recall. This is the direct scorer for manual or auto-compaction exports; it does not itself trigger compaction.

`--opencode-noisy-compaction-live-manifest` turns the noisy fixture manifest into a repeatable live compaction A/B run. It imports each baseline and precision session into a temporary `OPENCODE_DB`, starts a local source `opencode serve` process per lane with the lane-specific `OPENCODE_CONFIG_CONTENT`, calls `POST /session/:sessionID/summarize`, exports the compacted sessions, scores them with the compaction-summary scorer, and writes `live-report.json`, `summary-report.json`, `exports.jsonl`, stdout/stderr, summarize responses, and exports under `--opencode-noisy-compaction-live-output-dir`. The default command uses the local source tree and the fixture's `openai/gpt-5.5` / `variant=high` summarize request; `--opencode-noisy-compaction-live-command-json` and `--opencode-noisy-compaction-live-env-json` make the source command and environment explicit.

`--opencode-messages` converts a JSON array of V2 `SessionMessage` records directly through ContextLedger into ContextBench-style prediction JSONL. This avoids depending on the external export shape when evaluating local session history from the V2 store.

The in-process ledger builder also extracts spans from V2 completed `read` and `grep` tool structured output. This keeps compaction packets, native-message conversion, and exported trajectory evaluation aligned: read pages retain their requested line offsets, full UTF-8 reads become whole-file spans, and grep matches become one-line spans.

The adapter accepts both strict JSON and Python-style single-quoted string lists for ContextBench `f2p`/`p2p` fields. The CLI paginates Hugging Face dataset-server requests with `--contextbench-page-size` so larger samples can be fetched without tripping the rows endpoint page-size limit.

Current verified-split sample evidence, using `--contextbench-limit 100 --budgets 200,400,800,1200`:

| Budget | Best recall | Best F1 | Note |
| ---: | ---: | ---: | --- |
| 200 | 0.37 | 0.35 | `diverse-frontier` has best recall; `file-frontier` has best F1 and precision. |
| 400 | 0.58 | 0.46 | `diverse-frontier` has best recall; `file-frontier` has best F1. |
| 800 | 0.81 | 0.48 | `balanced-frontier` and `diverse-frontier` tie recall; `file-frontier` has best F1. |
| 1200 | 0.90 | 0.50 | `balanced-frontier` has best recall; `relevance-frontier`, `coherence-frontier`, and `adaptive-frontier` tie best F1. |

Hard-negative stress evidence, using `--include-test-code-context` on the same 100-row sample:

| Budget | Query F1 | Relevance F1 | Coherence F1 | File F1 | Adaptive F1 | Recency F1 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | 0.29 | 0.35 | 0.36 | 0.36 | 0.35 | 0.01 |
| 400 | 0.39 | 0.45 | 0.45 | 0.47 | 0.46 | 0.11 |
| 800 | 0.42 | 0.45 | 0.45 | 0.46 | 0.45 | 0.27 |
| 1200 | 0.44 | 0.46 | 0.46 | 0.45 | 0.46 | 0.34 |

Offset hard-negative stress evidence, using `--contextbench-offset 100 --contextbench-limit 100 --include-test-code-context`:

| Budget | Query F1 | Relevance F1 | Coherence F1 | File F1 | Adaptive F1 | Adaptive span F1 | Recency F1 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | 0.27 | 0.33 | 0.33 | 0.32 | 0.34 | 0.51 | 0.05 |
| 400 | 0.35 | 0.40 | 0.41 | 0.40 | 0.41 | 0.60 | 0.21 |
| 800 | 0.45 | 0.49 | 0.50 | 0.48 | 0.51 | 0.72 | 0.33 |
| 1200 | 0.49 | 0.51 | 0.52 | 0.51 | 0.52 | 0.78 | 0.41 |

Broader hard-negative stress evidence, using `--contextbench-limit 500 --include-test-code-context`:

| Budget | Query F1 | Relevance F1 | Coherence F1 | File F1 | Adaptive F1 | Adaptive span F1 | Recency F1 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | 0.26 | 0.31 | 0.32 | 0.33 | 0.32 | 0.44 | 0.05 |
| 400 | 0.35 | 0.41 | 0.42 | 0.42 | 0.42 | 0.56 | 0.16 |
| 800 | 0.43 | 0.46 | 0.47 | 0.47 | 0.47 | 0.64 | 0.31 |
| 1200 | 0.45 | 0.47 | 0.48 | 0.48 | 0.48 | 0.69 | 0.38 |

Rank-fusion ablation on the same 500-row hard-negative lane:

| Budget | Best prior fixed policy | Best prior F1 | Fusion F1 | Fusion span F1 | Fusion line F1 | Fusion regret |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 200 | `file-frontier` | 0.327 | 0.324 | 0.448 | 0.254 | 0.028 |
| 400 | `file-frontier` | 0.420 | 0.419 | 0.559 | 0.390 | 0.038 |
| 800 | `coherence-frontier` | 0.473 | 0.475 | 0.645 | 0.527 | 0.025 |
| 1200 | `adaptive-frontier` | 0.480 | 0.481 | 0.685 | 0.593 | 0.018 |

`fusion-frontier` is not useful at tight budgets, but it becomes the best fixed event-F1 policy at 800 and 1200 tokens on the broad lane. It does not dominate span or line overlap, so it should be treated as a high-budget event-context candidate rather than a general replacement for `file-frontier` or `adaptive-frontier`.

Deterministic portfolio ablation on the same 500-row hard-negative lane:

| Budget | Portfolio choice | Portfolio F1 | Best fixed F1 | Portfolio regret | Span F1 | Line F1 |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 200 | `file-frontier` | 0.327 | 0.327 | 0.024 | 0.475 | 0.261 |
| 400 | `file-frontier` | 0.420 | 0.420 | 0.037 | 0.577 | 0.399 |
| 800 | `fusion-frontier` | 0.475 | 0.475 | 0.025 | 0.645 | 0.527 |
| 1200 | `fusion-frontier` | 0.481 | 0.481 | 0.018 | 0.685 | 0.593 |

`portfolio-frontier` matches the best broad fixed event-F1 policy at all tested budgets by using file clustering under tight budgets and rank fusion at larger budgets. It is deliberately deterministic and benchmark-derived; it should be treated as a candidate runtime policy only after more disjoint-window checks, because the offset-100 split still prefers `adaptive-frontier` at 200 and 400 tokens.

Two-window fixed-policy stability report, using offset `0:100` and `100:100` hard-negative case windows with target `event-f1`:

| Budget | Robust maximin policy | Best mean policy | `portfolio-frontier` mean F1 | `portfolio-frontier` min F1 | `portfolio-frontier` worst delta |
| ---: | --- | --- | ---: | ---: | ---: |
| 200 | `adaptive-frontier` | `fusion-frontier` | 0.340 | 0.317 | -0.019 |
| 400 | `adaptive-frontier` | `adaptive-frontier` | 0.430 | 0.395 | -0.016 |
| 800 | `file-frontier` | `adaptive-frontier` | 0.480 | 0.452 | -0.006 |
| 1200 | `adaptive-frontier` | `adaptive-frontier` | 0.488 | 0.460 | -0.004 |

This stability report weakens the runtime case for `portfolio-frontier`: it is the broad aggregate event-F1 envelope, but it is not the robust split-level policy on the two-window stress lane. The next deterministic selector should optimize worst-split behavior directly, or use more split windows before changing compaction defaults.

`robust-frontier` ablation, derived from the two-window maximin policy choices:

| Budget | Robust choice | 500-row robust F1 | 500-row best F1 | Two-window robust min F1 | Two-window portfolio min F1 |
| ---: | --- | ---: | ---: | ---: | ---: |
| 200 | `adaptive-frontier` | 0.317 | 0.327 | 0.337 | 0.317 |
| 400 | `adaptive-frontier` | 0.416 | 0.420 | 0.411 | 0.395 |
| 800 | `file-frontier` | 0.468 | 0.475 | 0.459 | 0.452 |
| 1200 | `adaptive-frontier` | 0.480 | 0.481 | 0.460 | 0.460 |

This is the mirror image of `portfolio-frontier`: it improves the two-window maximin score but gives up broad aggregate event-F1. Keep it as a stability experiment until more split windows show that the maximin objective is the right runtime objective.

Official-utility deterministic ablation, using equal-weight file/span/line F1:

| Budget | Broad best utility policy | `utility-frontier` utility | Broad best utility | Two-window robust utility policy | `utility-frontier` min utility |
| ---: | --- | ---: | ---: | --- | ---: |
| 200 | `file-frontier` | 0.407 | 0.407 | `coherence-frontier` | 0.424 |
| 400 | `file-frontier` | 0.490 | 0.490 | `relevance-frontier` | 0.516 |
| 800 | `file-frontier` | 0.557 | 0.557 | `file-frontier` | 0.559 |
| 1200 | `coherence-frontier` | 0.587 | 0.587 | `relevance-frontier` | 0.574 |

`utility-frontier` matches the broad 500-row official-utility envelope, but it is not the split-stable utility policy at 200, 400, or 1200. This confirms that the evaluation target matters: event-F1 favors `portfolio-frontier`/`fusion-frontier` at high budgets, broad official utility favors `utility-frontier`, and two-window official utility still favors relevance/coherence in several budgets.

Multi-target report smoke on the first 100-row hard-negative lane, using `--target-report-output`:

| Budget | Target winners | `target-balanced-frontier` result | Lowest worst target regret |
| ---: | --- | --- | --- |
| 200 | event/span/line/utility: `file-frontier` | wins all four targets by delegating to `file-frontier` | `file-frontier` |
| 400 | event/span/line/utility: `file-frontier` | wins all four targets by delegating to `file-frontier` | `file-frontier` |
| 800 | event/span/line/utility: `file-frontier` | wins all four targets by delegating to `file-frontier` | `file-frontier` |
| 1200 | event/span: `adaptive-frontier`; line/utility: `relevance-frontier` | Pareto-optimal, `0.005` worst target regret by delegating to `fusion-frontier` | `fusion-frontier` |

This is the first report that makes the target conflict explicit in one artifact. It supports a conservative near-term default: prefer file clustering at tight and mid budgets, and keep high-budget routing behind split/target evidence instead of assuming the broad event-F1 winner is also the official-utility winner.

`target-balanced-frontier` packages that conservative shape as one deterministic candidate: `file-frontier` through 1000 tokens, `fusion-frontier` above 1000 tokens. On the broader 500-row hard-negative target report, it wins all four targets at 200 and 400, wins span/line/official-utility at 800 while giving up `0.007` event-F1 to `fusion-frontier`, and wins event-F1 at 1200 while giving up `0.003` official utility to `coherence-frontier`. This makes it a balanced candidate for further split testing, not a universal replacement for `utility-frontier` or `robust-frontier`.

Policy-portfolio reports make this selector derivation reproducible. On the first 100-row and broader 500-row hard-negative lanes, the default minimax-regret portfolio selects `file-frontier` at 200, 400, and 800 tokens, then `fusion-frontier` at 1200 tokens, matching `target-balanced-frontier`'s current budget map. On the same 500-row lane, the single-target official-utility portfolio selects `coherence-frontier` at 1200 instead. That disagreement is useful: `target-balanced-frontier` is a multi-target regret compromise, while `utility-frontier` remains the better official-utility candidate at large budgets.

Portfolio-stability evidence across the `offset0` and `offset100` 100-row hard-negative splits is stricter. A portfolio derived on one split does not directly transfer to the other split:

| Budget | Offset0-derived policy | Offset100 held-out best | Held-out loss | Offset100-derived policy | Offset0 held-out best | Held-out loss |
| ---: | --- | --- | ---: | --- | --- | ---: |
| 200 | `file-frontier` | `adaptive-frontier` | 0.017 | `adaptive-frontier` | `file-frontier` | 0.040 |
| 400 | `file-frontier` | `fusion-frontier` | 0.012 | `fusion-frontier` | `file-frontier` | 0.020 |
| 800 | `file-frontier` | `adaptive-frontier` | 0.026 | `adaptive-frontier` | `file-frontier` | 0.024 |
| 1200 | `fusion-frontier` | `adaptive-frontier` | 0.000 | `adaptive-frontier` | `fusion-frontier` | 0.006 |

With the default strict zero-loss gate, no budget is stable across both directions. With `--portfolio-max-heldout-loss 0.01`, only 1200 tokens becomes stable. This blocks direct promotion of `target-balanced-frontier` as a final runtime default even though its aggregate evidence is good; the lower budgets need either more split windows, a stability-oriented policy, or an objective that explicitly tolerates small utility loss for stronger transfer.

The fixed-policy max-loss rows from the same report identify a different stable compromise:

| Budget | Robust fixed policy | Max held-out loss | Mean held-out loss | Best mean policy |
| ---: | --- | ---: | ---: | --- |
| 200 | `file-frontier` | 0.017 | 0.009 | `file-frontier` |
| 400 | `file-frontier` | 0.012 | 0.006 | `file-frontier` |
| 800 | `fusion-frontier` | 0.020 | 0.011 | `fusion-frontier` |
| 1200 | `fusion-frontier` | 0.000 | 0.000 | `fusion-frontier` |

This robust fixed-policy map matched the earlier `portfolio-frontier` candidate before test-id sanitization. After the adapter stopped treating bare test identifiers as files, a fresh two-window stability report shifted the evidence toward `official-frontier`/`adaptive-frontier`:

| Budget | Event robust policy | Official-utility robust policy | `official-frontier` event mean | `portfolio-frontier` event mean | `official-frontier` utility mean | `portfolio-frontier` utility mean | `official-frontier` max heldout loss | `portfolio-frontier` max heldout loss |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | `adaptive-frontier` | `adaptive-frontier` | 0.345 | 0.341 | 0.552 | 0.548 | 0.010 | 0.014 |
| 400 | `adaptive-frontier` | `diverse-frontier` | 0.441 | 0.426 | 0.676 | 0.661 | 0.000 | 0.016 |
| 800 | `file-frontier` | `relevance-frontier` | 0.493 | 0.493 | 0.799 | 0.799 | 0.003 | 0.003 |
| 1200 | `adaptive-frontier` | `relevance-frontier` | 0.520 | 0.516 | 0.867 | 0.864 | 0.000 | 0.008 |

Runtime default: `SessionContextLedger.DEFAULT_SELECTION_POLICY` is now `official-frontier`, so V2 and V1 default compaction packets use the sanitized benchmark-backed official policy unless a caller explicitly supplies another policy. Both compaction config paths now expose `compaction.context_ledger` with `enabled`, `policy`, `budget`, and `mode` so runtime sessions can A/B policy candidates and compaction input strategies without changing code defaults. The default `mode` is `augment`, which keeps existing raw old-history behavior and adds the ledger packet. Experimental `replace` mode sends the ledger packet instead of the raw selected old-history body. The experimental `precision-frontier` policy is designed for replacement mode: it keeps exact anchors such as paths, tests, decisions, constraints, and identifiers while explicitly demoting distractor/noise lines. This is a measured default change for context selection inside compaction, not an end-to-end solve-rate claim.

`official-frontier` is the current runtime default from the larger official-evaluator smoke plus sanitized split-stability evidence. After sanitizing non-path test identifiers, the 20-row multi-budget official policy report favors `adaptive-frontier` for final equal-weight file/span/line F1 at 200, 400, and 1200 tokens; the 800-token policies tie in this sample. The encoded selector uses `adaptive-frontier` at <=400 and >1000 tokens, with `fusion-frontier` in the middle. The same report still records slightly better AUC-line behavior for `fusion-frontier` at 1200, so this remains a context-selection default rather than a universal target winner:

| Budget | `official-frontier` official utility | File F1 | Span F1 | Line F1 | File coverage | Span coverage | Line coverage | AUC line coverage |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | 0.554 | 0.827 | 0.425 | 0.411 | 0.849 | 0.318 | 0.306 | 0.267 |
| 400 | 0.668 | 0.827 | 0.595 | 0.582 | 0.849 | 0.496 | 0.484 | 0.433 |
| 800 | 0.867 | 0.860 | 0.874 | 0.868 | 0.899 | 0.821 | 0.815 | 0.732 |
| 1200 | 0.928 | 0.885 | 0.949 | 0.950 | 0.947 | 0.922 | 0.923 | 0.828 |

The broader 500-row hard-negative proxy lane, after the same test-id sanitization, now favors `official-frontier` at 400 and 1200, ties it at 800, and still favors `file-frontier`/`portfolio-frontier` by a small event-F1 margin at 200:

| Budget | Proxy best fixed policy | `official-frontier` event F1 | `portfolio-frontier` event F1 | `official-frontier` span F1 | `official-frontier` line F1 | `official-frontier` regret |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 200 | `file-frontier` | 0.340 | 0.344 | 0.548 | 0.305 | 0.033 |
| 400 | `adaptive-frontier` | 0.434 | 0.428 | 0.681 | 0.473 | 0.040 |
| 800 | `adaptive-frontier` | 0.489 | 0.489 | 0.774 | 0.657 | 0.030 |
| 1200 | `adaptive-frontier` | 0.506 | 0.504 | 0.828 | 0.741 | 0.018 |

Paired official comparisons make this boundary sharper. On the same 20-row official sample at budget 400, with `portfolio-frontier` as the default baseline, `official-frontier` improves mean official utility by `+0.009`, but the 95% interval is `[-0.008, +0.026]` with `1` win, `0` losses, and `19` ties. The single remaining improvement after test-id sanitization is `SWE-Bench-Verified__python__maintenance__bugfix__e5a3bf2a` (`+0.173` official utility), with no regressions in this sample. Selection-delta inspection shows that `official-frontier` gains the gold implementation file `astropy/io/fits/diff.py` while dropping repeated `astropy/io/fits/tests/test_diff.py` evidence; the local selector-proxy delta on this case is `+0.217` official utility. The previously named `e97ac668` difference disappeared after bare test identifiers stopped being treated as files, confirming it was adapter noise rather than a selector signal.

The direct failing-test filename affinity ablation was rejected after it reduced the 100-row hard-negative span and line metrics. File clustering kept the useful same-file expansion effect without directly trusting test filenames as implementation names. The adaptive meta-policy is useful on the offset sample, while rank fusion improves the broader high-budget event-F1 lane. Neither dominates `file-frontier` on the first 100-row or 200-token broad stress lanes.

Per-case analysis on the broader 500-row hard-negative stress lane shows the remaining selector headroom:

| Budget | Oracle F1 | Best fixed policy | Best fixed F1 | Lowest fixed-policy regret |
| ---: | ---: | --- | ---: | ---: |
| 200 | 0.351 | `file-frontier` | 0.327 | 0.024 |
| 400 | 0.457 | `file-frontier` | 0.420 | 0.037 |
| 800 | 0.500 | `fusion-frontier` | 0.475 | 0.025 |
| 1200 | 0.499 | `fusion-frontier` | 0.481 | 0.018 |

A hardcoded budget-switch policy was not added in this slice because it would overfit the broad 500-row lane and regress the first 100-row hard-negative or offset lanes at some budgets. The better next target is a learned or feature-gated selector that predicts when file clustering versus coherence expansion is appropriate.

A hand-tuned gated selector was also tried and removed. On a 200-row hard-negative sample it produced no unique per-case event wins, tied `adaptive-frontier` at high budgets, and did not beat `file-frontier` span quality at 200 or 400 tokens. That result keeps the implementation on deterministic policy families until there is enough fold-based evidence for learned gating.

Cross-validated budget-router evidence, using `--contextbench-limit 200 --include-test-code-context --router-output` with five folds:

| Budget | Router F1 | Best fixed policy | Best fixed F1 | Oracle F1 | Router regret | Best fixed regret |
| ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 200 | 0.340 | `coherence-frontier` | 0.345 | 0.364 | 0.024 | 0.019 |
| 400 | 0.434 | `adaptive-frontier` | 0.434 | 0.471 | 0.036 | 0.036 |
| 800 | 0.477 | `adaptive-frontier` | 0.481 | 0.509 | 0.032 | 0.028 |
| 1200 | 0.488 | `adaptive-frontier` | 0.490 | 0.510 | 0.022 | 0.020 |

This rules out a simple budget-only router on this lane. The remaining oracle gap should be attacked with instance-level observable features from candidate selections, not with a global budget switch.

Cross-validated observable-feature router evidence on the same 200-row hard-negative lane:

| Budget | Feature router F1 | Budget router F1 | Best fixed F1 | Oracle F1 | Feature regret | Best fixed regret | Common learned features |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 200 | 0.344 | 0.340 | 0.345 | 0.364 | 0.020 | 0.019 | `eventCount`, `spanLineCount` |
| 400 | 0.435 | 0.434 | 0.434 | 0.471 | 0.036 | 0.036 | `codeEventCount` |
| 800 | 0.485 | 0.477 | 0.481 | 0.509 | 0.024 | 0.028 | `noisyPathShare`, `codeFileCount` |
| 1200 | 0.488 | 0.488 | 0.490 | 0.510 | 0.022 | 0.020 | `maxFileClusterShare`, `testPathShare` |

Offset feature-router evidence, using `--contextbench-offset 100 --contextbench-limit 100 --include-test-code-context`:

| Budget | Feature router F1 | Budget router F1 | Best fixed F1 | Oracle F1 | Feature regret | Best fixed regret | Common learned features |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 200 | 0.333 | 0.333 | 0.337 | 0.353 | 0.019 | 0.016 | `averageSpanLines`, `spanLineCount` |
| 400 | 0.420 | 0.407 | 0.411 | 0.453 | 0.034 | 0.042 | `evidenceEventCount`, `queryTermCount` |
| 800 | 0.515 | 0.513 | 0.513 | 0.531 | 0.016 | 0.018 | `implementationPathShare`, `testPathShare` |
| 1200 | 0.517 | 0.519 | 0.519 | 0.542 | 0.025 | 0.022 | `implementationPathShare`, `queryCodeTermOverlap` |

The first feature router had repeatable middle-budget signal at 400 and 800 tokens, but not enough high/low-budget consistency to promote into production compaction. That motivated adding features derived from each competing policy's selected packet, still without using gold labels.

Feature-router target ablation on the 200-row hard-negative lane:

| Target | Budget | Router target score | Best fixed target score | Oracle target score | Router regret | Best fixed regret |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `event-f1` | 400 | 0.435 | 0.434 | 0.471 | 0.036 | 0.036 |
| `event-f1` | 800 | 0.485 | 0.481 | 0.509 | 0.024 | 0.028 |
| `span-f1` | 400 | 0.628 | 0.613 | 0.668 | 0.040 | 0.055 |
| `span-f1` | 1200 | 0.733 | 0.729 | 0.758 | 0.026 | 0.029 |
| `line-f1` | 400 | 0.426 | 0.426 | 0.456 | 0.030 | 0.030 |
| `official-utility` | 400 | 0.529 | 0.529 | 0.570 | 0.041 | 0.041 |

Targeting `span-f1` creates a clearer span-overlap win at 400 and 1200 tokens, but it costs event F1 on the same runs. Targeting `official-utility` is too close to fixed-policy performance on both the 200-row lane and an offset 100-row lane; the offset official-utility run only improved at 400 tokens (`0.538` versus `0.536`) and regressed or tied elsewhere. This keeps target-aware routing as an analysis tool rather than a runtime policy.

Pre-fusion policy-selection feature expansion, rerunning the 200-row hard-negative lane with features from each candidate policy's selected packet:

| Target | Budget | Router target score | Best fixed target score | Oracle target score | Router regret | Best fixed regret | Common learned features |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `event-f1` | 200 | 0.352 | 0.345 | 0.364 | 0.012 | 0.019 | `file-frontier` span/line features, relevance-file deltas |
| `event-f1` | 400 | 0.445 | 0.434 | 0.471 | 0.025 | 0.036 | `selection:file-frontier:codeEventShare` |
| `event-f1` | 800 | 0.487 | 0.481 | 0.509 | 0.022 | 0.028 | coherence/file code-event deltas |
| `event-f1` | 1200 | 0.492 | 0.490 | 0.510 | 0.018 | 0.020 | coherence/file code-event deltas |
| `span-f1` | 200 | 0.527 | 0.518 | 0.547 | 0.021 | 0.029 | file-frontier span-length deltas |
| `official-utility` | 800 | 0.606 | 0.601 | 0.636 | 0.030 | 0.035 | span-line deltas |

Pre-fusion offset policy-selection feature evidence, using `--contextbench-offset 100 --contextbench-limit 100 --include-test-code-context`, is mixed:

| Target | Budget | Router target score | Best fixed target score | Oracle target score | Router regret | Best fixed regret |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `event-f1` | 200 | 0.336 | 0.337 | 0.353 | 0.017 | 0.016 |
| `event-f1` | 400 | 0.409 | 0.411 | 0.453 | 0.044 | 0.042 |
| `event-f1` | 800 | 0.515 | 0.513 | 0.531 | 0.016 | 0.018 |
| `event-f1` | 1200 | 0.526 | 0.519 | 0.542 | 0.016 | 0.022 |
| `official-utility` | 800 | 0.655 | 0.659 | 0.685 | 0.030 | 0.026 |
| `official-utility` | 1200 | 0.706 | 0.705 | 0.729 | 0.023 | 0.023 |

The stronger feature set is the first router variant to beat best fixed event F1 at all four budgets on the 200-row hard-negative lane, and it also improves event F1 at 800 and 1200 on the offset lane. It still regresses the offset low-budget cases and does not robustly improve official utility, so it remains benchmark-only. The next credible promotion path is either cross-fold training on a larger sample or a conservative runtime selector limited to budgets where multiple held-out lanes agree.

Pre-fusion broader 500-row policy-selection feature evidence, using `--contextbench-limit 500 --contextbench-page-size 100 --include-test-code-context`:

| Target | Budget | Router target score | Best fixed target score | Oracle target score | Router regret | Best fixed regret | Common learned features |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `event-f1` | 200 | 0.336 | 0.327 | 0.351 | 0.015 | 0.024 | file/adaptive span-length deltas |
| `event-f1` | 400 | 0.428 | 0.420 | 0.457 | 0.029 | 0.037 | coherence/file span-length deltas |
| `event-f1` | 800 | 0.479 | 0.473 | 0.500 | 0.020 | 0.027 | coherence/file evidence-share deltas |
| `event-f1` | 1200 | 0.488 | 0.480 | 0.499 | 0.010 | 0.019 | coherence/file code-event deltas |
| `official-utility` | 200 | 0.413 | 0.408 | 0.432 | 0.019 | 0.024 | relevance/file span-length deltas |
| `official-utility` | 400 | 0.501 | 0.488 | 0.528 | 0.027 | 0.040 | relevance/file span-line deltas |
| `official-utility` | 800 | 0.564 | 0.558 | 0.588 | 0.024 | 0.030 | relevance/file span-line deltas |
| `official-utility` | 1200 | 0.589 | 0.586 | 0.605 | 0.016 | 0.020 | relevance/file code-event/selection deltas |

The broader lane strengthens the evidence: event-F1 routing beats the best fixed policy at all tested budgets, and official-utility routing also improves all tested budgets on this lane. Because the offset lane still regresses low budgets, a production selector should not be promoted directly from the analysis router. The safer path is to either run a larger fold split that includes offset coverage, or expose a conservative runtime `auto` policy only for high budgets where both broad and offset lanes agree.

Frozen rule-artifact held-out smoke, using `--contextbench-limit 100 --include-test-code-context --feature-router-rules-output` for training and `--contextbench-offset 100 --contextbench-limit 100 --feature-router-rules-input` for evaluation:

| Target | Budget | Frozen router F1 | Held-out best fixed F1 | Delta | Learned feature |
| --- | ---: | ---: | ---: | ---: | --- |
| `event-f1` | 200 | 0.332 | 0.337 | -0.004 | `selection:file-frontier:averageSpanLines` |
| `event-f1` | 400 | 0.407 | 0.411 | -0.004 | `delta:relevance-frontier-file-frontier:maxFileClusterShare` |
| `event-f1` | 800 | 0.490 | 0.513 | -0.023 | `selection:file-frontier:codeEventShare` |
| `event-f1` | 1200 | 0.521 | 0.519 | +0.002 | `delta:relevance-frontier-file-frontier:codeEventShare` |

This stricter artifact path confirms the caution from the offset cross-validation lane: a router can look promising in fold reports and still fail to transfer at low and mid budgets when frozen. The next routing experiment should train on a larger, more diverse sample and evaluate on a disjoint offset before any runtime `auto` selector is considered.

Validation-gated frozen artifact smoke on the same first-100 train / offset-100 held-out lane:

| Minimum validation gain | Budget | Promoted learned rule | Internal validation delta | Held-out router F1 | Held-out best fixed F1 | Held-out delta |
| ---: | ---: | --- | ---: | ---: | ---: | ---: |
| 0.005 | 200 | yes | +0.006 | 0.332 | 0.337 | -0.004 |
| 0.005 | 400 | no | +0.001 | 0.395 | 0.411 | -0.016 |
| 0.005 | 800 | yes | +0.009 | 0.490 | 0.513 | -0.023 |
| 0.005 | 1200 | no | +0.004 | 0.519 | 0.519 | +0.000 |
| 0.010 | 200 | no | +0.006 | 0.317 | 0.337 | -0.019 |
| 0.010 | 400 | no | +0.001 | 0.395 | 0.411 | -0.016 |
| 0.010 | 800 | no | +0.009 | 0.483 | 0.513 | -0.030 |
| 0.010 | 1200 | no | +0.004 | 0.519 | 0.519 | +0.000 |

The validation gate prevents some in-sample stump overfitting, but it is not sufficient by itself: when it falls back to the training-sample best fixed policy, that fixed policy can still differ from the held-out best fixed policy. This shifts the promotion criterion from "positive fold delta" to "positive disjoint-offset delta after freezing." Any runtime selector needs a multi-split promotion report that proves transfer across offsets before it is enabled.

Two-split promotion report with `fusion-frontier` included, using offset `0:100` and `100:100` hard-negative case windows, `event-f1`, five validation folds, minimum validation gain `0.005`, and minimum held-out gain `0`:

| Budget | Overall promotable | Train split | Rule feature | Rule promoted | Held-out delta |
| ---: | --- | --- | --- | --- | ---: |
| 200 | no | `offset0` | `selection:file-frontier:averageSpanLines` | yes | -0.004 |
| 200 | no | `offset100` | `constant` | no | -0.016 |
| 400 | no | `offset0` | `constant` | no | -0.016 |
| 400 | no | `offset100` | `constant` | no | -0.009 |
| 800 | no | `offset0` | `selection:file-frontier:codeEventShare` | yes | -0.023 |
| 800 | no | `offset100` | `constant` | no | -0.009 |
| 1200 | no | `offset0` | `constant` | no | +0.000 |
| 1200 | no | `offset100` | `constant` | no | +0.000 |

No budget passes the two-way transfer gate. After adding `fusion-frontier`, the broader high-budget fixed-policy lane improves, but the learned router promotion path becomes even more conservative: 1200-token split training falls back to fixed policies in both directions. This is useful negative evidence: do not ship a learned runtime router yet; use the promotion report to search for features or paradigms that transfer both ways.

Earlier official evaluator policy-report smoke, five verified instances at budget `800`, using `--official-policy-report-output` with `/tmp/contextbench-venv/bin/python` and `--official-eval-pythonpath /tmp/ContextBench`:

| Policy | Rows | File coverage | File precision | Span coverage | Span precision | Line coverage | Line precision | AUC line coverage | Editloc recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `coherence-frontier` | 5 | 0.844 | 0.667 | 0.782 | 1.000 | 0.778 | 1.000 | 0.617 | 0.032 |
| `adaptive-frontier` | 5 | 0.844 | 0.667 | 0.782 | 1.000 | 0.778 | 1.000 | 0.617 | 0.032 |
| `file-frontier` | 5 | 0.844 | 0.667 | 0.741 | 1.000 | 0.736 | 1.000 | 0.607 | 0.032 |
| `fusion-frontier` | 5 | 0.844 | 0.667 | 0.782 | 1.000 | 0.778 | 1.000 | 0.617 | 0.032 |
| `portfolio-frontier` | 5 | 0.844 | 0.667 | 0.782 | 1.000 | 0.778 | 1.000 | 0.617 | 0.032 |
| `utility-frontier` | 5 | 0.844 | 0.667 | 0.741 | 1.000 | 0.736 | 1.000 | 0.607 | 0.032 |
| `target-balanced-frontier` | 5 | 0.844 | 0.667 | 0.741 | 1.000 | 0.736 | 1.000 | 0.607 | 0.032 |

This earlier smoke only proved evaluator compatibility on a tiny sample. The sanitized 20-row matrix above supersedes these numbers for selector decisions. Neither result is leaderboard evidence, because the current sampler selects among converted gold-context candidate events rather than running a full OpenCode trajectory over repositories.

Official evaluator CLI smoke, one verified instance at budget `800`, using `--official-eval-output` with `/tmp/contextbench-venv/bin/python` and `--official-eval-pythonpath /tmp/ContextBench`:

| Instance | Prediction rows | Gold rows | Official rows | Final file coverage | Final span coverage | Final line coverage | Editloc recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `SWE-Bench-Verified__python__maintenance__bugfix__deb49033` | 1 | 1 | 1 | 0.222 | 0.253 | 0.231 | 0.043 |

The same official JSONL summarized through `--official-summary-input` reports `rows=1`, final file coverage `0.222`, final span coverage `0.253`, final line coverage `0.231`, and edit-localization recall `0.043`. The summary derives edit-localization recall and precision from the evaluator's count fields, because the JSONL row can store a stale `editloc.recall` value even when `intersection`, `gold_size`, and the evaluator stdout show the correct count-based recall.

This proves the CLI can generate ContextBench-compatible prediction/gold JSONL and invoke the official evaluator successfully. It still does not prove end-to-end OpenCode trajectory quality or leaderboard position.

## Model Lane

Use OpenCode's native `openai` provider for live experiments. The active bounded lane is `openai/gpt-5.5 --variant high`, which maps to OpenCode's high reasoning effort variant for OpenAI models.

Live smoke on June 14, 2026 from `/tmp` with installed OpenCode `1.17.6` succeeded:

```sh
opencode run --pure --print-logs --log-level DEBUG --format json --title context-ledger-openai-smoke -m openai/gpt-5.5 --variant high "Reply with exactly: context-ledger-openai-smoke"
```

The run returned exactly `context-ledger-openai-smoke`; logs show `providerID=openai modelID=gpt-5.5`, and the final step reported `tokens.input=12358`, `tokens.output=13`, and `tokens.reasoning=142`. This proves the live OpenAI-provider lane is usable for bounded trajectory experiments.

Local-source smoke on the fork also succeeded with the same lane:

```sh
bun packages/opencode/src/index.ts run --pure --print-logs --log-level DEBUG --format json --title context-ledger-local-gpt55-smoke -m openai/gpt-5.5 --variant high "Reply with exactly: context-ledger-local-gpt55-smoke"
```

The run returned exactly `context-ledger-local-gpt55-smoke`; logs show `providerID=openai modelID=gpt-5.5` and `llm.runtime=ai-sdk`, with final step tokens `input=9704`, `output=15`, `reasoning=104`, and `cache.read=4608`.

Post-MMR live smokes on the fork also passed with the same `openai/gpt-5.5 --variant high` lane:

| Probe | Expected output | Result |
| --- | --- | --- |
| Prompt sentinel | `CONTEXTLEDGER_MMR_REJECTED_SMOKE` | exact match |
| Workspace file read | `CONTEXTLEDGER_FILE_READ_SMOKE` | exact match after the model used the `read` tool on `README.txt` |
| Experience replay follow-up | `CONTEXTLEDGER_EXPERIENCE_REPLAY_SMOKE` | exact match after the model used the `read` tool on `README.txt` |
| Export bridge | `CONTEXTLEDGER_EXPORT_BRIDGE` | exact match; exported `ses_13b12ed6fffeJJnFrvEMUFZVgD` converted to prediction JSONL with `src/target.ts:1-1` |
| Scored export bridge | `CONTEXTLEDGER_SCORED_EXPORT` | exact match; exported `ses_13b0a30abffehwR2mNTG7aqx10` scored against a tiny gold row with file-F1 `1.0`, line-F1 `1.0`, and AUC-line `1.0` |
| Batch export manifest | `CONTEXTLEDGER_BATCH_EXPORT_A`, `CONTEXTLEDGER_BATCH_EXPORT_B` | exact matches; exported `ses_13b0668b0ffejRONpmlKrhJpCp` and `ses_13b0637ddffeCvZ30e8hlMUMei`, then `--opencode-export-manifest` scored 2 cases with file-F1 `1.0`, line-F1 `1.0`, and AUC-line `1.0` |
| Dev gate smoke | `CONTEXTLEDGER_DEV_GATE_SMOKE` | exact match from local source; logs show `providerID=openai modelID=gpt-5.5`; final step tokens `input=14310`, `output=14`, `reasoning=50` |

Live A/B harness smoke on June 15, 2026 ran two local-source rows against the same tiny read task with `openai/gpt-5.5 --variant high`, using inline per-row config to disable and enable `compaction.context_ledger`:

| Variant | Session | Config evidence | Export evidence | Score |
| --- | --- | --- | --- | --- |
| baseline | `ses_13898d2d5ffeWYHbYhT0rVnHO5` | debug logs show `loaded custom config from OPENCODE_CONFIG_CONTENT`; title `ctxledger-ab-gpt55-baseline` | export info has `providerID: openai`, `id: gpt-5.5`, `variant: high`; total tokens `input=14242`, `output=84`, `reasoning=81`, `cache.read=26112` | file/span/line F1 `1.0`, AUC-line `1.0` |
| ContextLedger | `ses_138989de3ffextjMAX42RY3kag` | debug logs show `loaded custom config from OPENCODE_CONFIG_CONTENT`; title `ctxledger-ab-gpt55-contextledger` | export info has `providerID: openai`, `id: gpt-5.5`, `variant: high`; total tokens `input=15852`, `output=84`, `reasoning=107`, `cache.read=24576` | file/span/line F1 `1.0`, AUC-line `1.0` |

Artifacts were written under `/tmp/ctxledger-live-ab-gpt55-20260615003125/runs/`, including `exports.jsonl`, `predictions.jsonl`, and `prediction-eval.json`. This proves the reproducible live A/B run/export/score harness and OpenAI-provider routing. It does not prove a ContextLedger algorithmic win because the task is intentionally trivial and does not trigger meaningful compaction pressure.

Live A/B report smoke on June 15, 2026 reran the same bounded pattern with `--opencode-run-report-output` and `openai/gpt-5.5 --variant high`:

| Variant | Session | Exported model | Tokens | Score |
| --- | --- | --- | --- | --- |
| baseline | `ses_138901416ffeek8D8qM3yQ7PYs` | `openai/gpt-5.5`, variant `high` | `input=26591`, `output=86`, `reasoning=104`, `cache.read=13824` | line F1 `1.0`, AUC-line `1.0` |
| ContextLedger | `ses_1388fdd79ffeqX416P1AXH7JZB` | `openai/gpt-5.5`, variant `high` | `input=9760`, `output=87`, `reasoning=126`, `cache.read=30720` | line F1 `1.0`, AUC-line `1.0` |

The report at `/tmp/ctxledger-live-ab-report-gpt55-20260615004059/runs/run-report.json` contains two rows, two label summaries, and one paired comparison with zero metric delta on this trivial read task. This proves the live A/B report artifact, not a quality win.

Live multi-turn A/B smoke on June 15, 2026 used `prompts` to run two turns per row and verified OpenCode session resume with `openai/gpt-5.5 --variant high`:

| Variant | Session | Turns | Exported model | Tokens | Score |
| --- | --- | ---: | --- | --- | --- |
| baseline | `ses_138884cd7ffeE1WcHax7iUfWeX` | 2 | `openai/gpt-5.5`, variant `high` | `input=16079`, `output=104`, `reasoning=174`, `cache.read=38400` | file/span F1 `1.0`, line F1 `0.889`, AUC-line `1.0` |
| ContextLedger | `ses_1388800a7ffeVN5Q3JNNvdpXP6` | 2 | `openai/gpt-5.5`, variant `high` | `input=16169`, `output=105`, `reasoning=189`, `cache.read=38400` | file/span F1 `1.0`, line F1 `0.889`, AUC-line `1.0` |

Artifacts were written under `/tmp/ctxledger-live-multiturn-gpt55-20260615004848/runs/`. Debug logs show `loaded custom config from OPENCODE_CONFIG_CONTENT`, `providerID=openai modelID=gpt-5.5`, and the same `session.id` on both turns for each row. The report has zero paired metric delta, so this is continuation/export/report wiring evidence, not a compaction-quality result.

Live answer-recall A/B smoke on June 15, 2026 used three turns per row and `answer_contains` / `answer_regex` checks to score the final text answer, again with `openai/gpt-5.5 --variant high`:

| Variant | Session | Turns | Exported model | Tokens | Answer | Trajectory score |
| --- | --- | ---: | --- | --- | --- | --- |
| baseline | `ses_1388255d9ffe1TLkcn43DP1d25` | 3 | `openai/gpt-5.5`, variant `high` | `input=20925`, `output=106`, `reasoning=152`, `cache.read=47616` | passed exact marker recall | file/span F1 `1.0`, line F1 `0.889`, AUC-line `1.0` |
| ContextLedger | `ses_13882082dffetbMLJZOtwkC236` | 3 | `openai/gpt-5.5`, variant `high` | `input=16406`, `output=110`, `reasoning=205`, `cache.read=52224` | passed exact marker recall | file/span F1 `1.0`, line F1 `0.889`, AUC-line `1.0` |

Artifacts were written under `/tmp/ctxledger-live-answer-recall-gpt55-20260615005530/runs/`. The report records `answerPassRate=1` for both labels and `answerPassed=0` paired delta. This proves report-level answer scoring on a live continuation probe; it still does not prove ContextLedger beats baseline because the task fits normal session context and did not trigger compaction pressure.

Live manual-compaction summary smoke on June 15, 2026 reused the answer-recall sessions, called the HTTP `POST /session/:sessionID/summarize` route, and scored the exported compaction summaries with `--opencode-compaction-summary-manifest`:

| Variant | Session | Compaction model evidence | Summary tokens | Claim recall |
| --- | --- | --- | ---: | ---: |
| baseline | `ses_1388255d9ffe1TLkcn43DP1d25` | server logs show `agent=compaction providerID=openai modelID=gpt-5.5`; export summary has variant `high` | 192 | `3/3` |
| ContextLedger | `ses_13882082dffetbMLJZOtwkC236` | server logs show `agent=compaction providerID=openai modelID=gpt-5.5`; export summary has variant `high` | 186 | `3/3` |

Artifacts were written under `/tmp/ctxledger-live-answer-recall-gpt55-20260615005530/compaction/`, including `baseline.export.json`, `contextledger.export.json`, `exports.jsonl`, `gold.jsonl`, and `summary-report.json`. Both summaries preserved the marker string, marker symbol, and `src/target.ts`, so the paired delta is still zero. This is the first direct live scorer for actual OpenCode compaction-summary output, not a ContextLedger advantage claim.

Live noisy manual-compaction calibration on June 15, 2026 generated and imported 38-message OpenCode sessions, then called the same HTTP summarize route with `openai/gpt-5.5 --variant high`. The fixture placed six gold payment-retry claims in older context, added 16 distractor turns, and left a final tail that omitted the exact marker/header/file/test/symbol names. The run used `tail_turns=1` and `preserve_recent_tokens=2000`; the ContextLedger lanes additionally used `context_ledger.enabled=true`, `policy=official-frontier`, and `budget=1200`.

| Variant | Session | Exported compaction model | Compaction tokens | Scored summary tokens | Claim recall |
| --- | --- | --- | --- | ---: | ---: |
| baseline | `ses_ctxledger_noisy_baseline_1781464346977` | `openai/gpt-5.5`, variant `high` | `input=2199`, `output=321`, `reasoning=214` | 309 | `6/6` |
| ContextLedger augment, after serialized-line split | `ses_ctxledger_noisy_augment2_1781465197929` | `openai/gpt-5.5`, variant `high` | `input=5282`, `output=397`, `reasoning=516` | 377 | `6/6` |
| ContextLedger replace, before serialized-line split | `ses_ctxledger_noisy_replace_1781464947140` | `openai/gpt-5.5`, variant `high` | `input=2121`, `output=317`, `reasoning=516` | 296 | `3/6` |
| ContextLedger replace, after serialized-line split | `ses_ctxledger_noisy_replace2_1781465113445` | `openai/gpt-5.5`, variant `high` | `input=3472`, `output=442`, `reasoning=516` | 437 | `6/6` |
| ContextLedger precision replace | `ses_ctxledger_noisy_precision_1781465670300` | `openai/gpt-5.5`, variant `high` | `input=852`, `output=298`, `reasoning=149` | 291 | `6/6` |

Artifacts were written under `/tmp/ctxledger-noisy-compaction-gpt55-20260614191226/`, including the generated imports, exported summaries, `exports.jsonl`, `gold.jsonl`, server logs, and `summary-report.json`. This is useful calibration evidence and the first bounded live advantage on the noisy compaction fixture, not a solve-rate or SOTA claim. The original OpenCode compaction prompt retained every gold claim. Default ContextLedger `augment` also retained every claim but spent more input tokens. Early `replace` mode reduced input roughly to baseline size but lost exact test/decision/symbol recall because multi-line serialized user messages were collapsed into one truncated ledger event. Splitting serialized user/system/synthetic chunks into per-line events restored `replace` recall to `6/6`, but its richer ledger packet still cost more input than baseline. The new `precision-frontier` replacement lane retained `6/6` claims while cutting compaction input from baseline `2199` to `852` tokens and summary text from baseline `309` to `291` tokens. The next research target is replication: run the same precision replacement design across multiple noisy sessions and then a live task where the compacted summary is used for a follow-up answer or edit, not just scored immediately after summarization.

Live noisy manual-compaction replication on June 15, 2026 moved the fixture construction into the benchmark CLI with `--noisy-compaction-fixtures-output-dir`, then generated two fresh domains (`cache-invalidation`, `parser-fallback`) and ran baseline versus `context_ledger.policy=precision-frontier`, `mode=replace` with the same OpenAI summarize request. Both scenarios retained every gold claim, and precision replacement reduced compaction input substantially:

| Scenario | Variant | Session | Exported compaction model | Compaction tokens | Scored summary tokens | Claim recall |
| --- | --- | --- | --- | --- | ---: | ---: |
| cache invalidation | baseline | `ses_ctxledger_noisy_cache_invalidation_baseline_1781466224875` | `openai/gpt-5.5`, variant `high` | `input=1807`, `output=314`, `reasoning=162` | 346 | `6/6` |
| cache invalidation | ContextLedger precision replace | `ses_ctxledger_noisy_cache_invalidation_precision_1781466224875` | `openai/gpt-5.5`, variant `high` | `input=715`, `output=331`, `reasoning=0` | 341 | `6/6` |
| parser fallback | baseline | `ses_ctxledger_noisy_parser_fallback_baseline_1781466224875` | `openai/gpt-5.5`, variant `high` | `input=1807`, `output=379`, `reasoning=202` | 419 | `6/6` |
| parser fallback | ContextLedger precision replace | `ses_ctxledger_noisy_parser_fallback_precision_1781466224875` | `openai/gpt-5.5`, variant `high` | `input=710`, `output=282`, `reasoning=53` | 305 | `6/6` |

Artifacts were written under `/tmp/ctxledger-noisy-replication-gpt55-20260614194344/`, including `fixtures.jsonl`, `gold.jsonl`, imports, exports, server logs, and `summary-report.json`. Server logs show `loaded custom config from OPENCODE_CONFIG_CONTENT` and `stream providerID=openai modelID=gpt-5.5 ... agent=compaction` for each row. This strengthens the bounded compaction result from one scenario to three total scenarios, but it still only scores summary retention immediately after compaction. The next required live proof is a post-compaction continuation task that uses the summary to answer or edit correctly.

Live post-compaction continuation on June 15, 2026 imported the compacted cache/parser exports into an isolated OpenCode data home, copied only the existing OpenCode auth file needed for provider access, and resumed each compacted session with `opencode run --session ... --model openai/gpt-5.5 --variant high`. The follow-up prompts required exact old facts from retained context and used `answer_contains` checks through `--opencode-run-manifest`:

| Scenario | Variant | Session | Final answer check | Exported model | Continuation tokens |
| --- | --- | --- | --- | --- | --- |
| cache invalidation | baseline | `ses_ctxledger_noisy_cache_invalidation_baseline_1781466224875` | pass: marker, file, test, `ttl=45`, symbol | `openai/gpt-5.5`, variant `high` | `input=6795`, `output=50`, `reasoning=0` |
| cache invalidation | ContextLedger precision replace | `ses_ctxledger_noisy_cache_invalidation_precision_1781466224875` | pass: marker, file, test, `ttl=45`, symbol | `openai/gpt-5.5`, variant `high` | `input=6814`, `output=52`, `reasoning=68` |
| parser fallback | baseline | `ses_ctxledger_noisy_parser_fallback_baseline_1781466224875` | pass: marker, file, test, `depth=4`, code, symbol | `openai/gpt-5.5`, variant `high` | `input=6863`, `output=56`, `reasoning=0` |
| parser fallback | ContextLedger precision replace | `ses_ctxledger_noisy_parser_fallback_precision_1781466224875` | pass: marker, file, test, `depth=4`, code, symbol | `openai/gpt-5.5`, variant `high` | `input=622`, `cache.read=6144`, `output=56`, `reasoning=0` |

Artifacts were written under `/tmp/ctxledger-noisy-continuation-gpt55-20260614195649/`, including the imports, `continuation-manifest.jsonl`, per-run stdout/stderr, exports, predictions, and `run-report.json`. Run logs show `stream providerID=openai modelID=gpt-5.5 ... agent=build mode=primary` for each row. This upgrades the evidence from immediate summary retention to bounded post-compaction answer usability. It is still not solve-rate evidence: the task is an exact-fact answer probe, not a code-edit benchmark or SWE-style trajectory.

Live post-compaction edit smoke on June 15, 2026 imported the same compacted cache/parser exports into per-row temporary repositories with placeholder constants, then resumed each session with `opencode run --session ... --model openai/gpt-5.5 --variant high --dangerously-skip-permissions`. The prompt asked the model to edit the target file using retained compacted context, and the run report scored actual file contents with `file_checks`:

| Scenario | Variant | Session | File check | Exported model | Run tokens |
| --- | --- | --- | --- | --- | --- |
| cache invalidation | baseline | `ses_ctxledger_noisy_cache_invalidation_baseline_1781466224875` | pass: marker, lease prefix, `LEASE_TTL_SECONDS = 45`, symbol retained; placeholders removed | `openai/gpt-5.5`, variant `high` | `input=8380`, `cache.read=45568`, `output=1098`, `reasoning=327` |
| cache invalidation | ContextLedger precision replace | `ses_ctxledger_noisy_cache_invalidation_precision_1781466224875` | pass: marker, lease prefix, `LEASE_TTL_SECONDS = 45`, symbol retained; placeholders removed | `openai/gpt-5.5`, variant `high` | `input=15263`, `cache.read=23040`, `output=983`, `reasoning=169` |
| parser fallback | baseline | `ses_ctxledger_noisy_parser_fallback_baseline_1781466224875` | pass: marker, code, `FALLBACK_DEPTH_FRAMES = 4`, symbol retained; placeholders removed | `openai/gpt-5.5`, variant `high` | `input=16700`, `cache.read=45056`, `output=1111`, `reasoning=362` |
| parser fallback | ContextLedger precision replace | `ses_ctxledger_noisy_parser_fallback_precision_1781466224875` | pass: marker, code, `FALLBACK_DEPTH_FRAMES = 4`, symbol retained; placeholders removed | `openai/gpt-5.5`, variant `high` | `input=5566`, `cache.read=30720`, `output=863`, `reasoning=227` |

Artifacts were written under `/tmp/ctxledger-noisy-edit-gpt55-20260614202330/`, including per-row temp repos, imports, `edit-run-manifest.jsonl`, run/export logs, predictions, and `run-report.json`. Logs show `stream providerID=openai modelID=gpt-5.5 ... agent=build mode=primary`, plus read/edit/bash permissions allowed by the explicit temp-repo `--dangerously-skip-permissions` control. This is the first live code-edit evidence after compaction, but it is still a controlled exact-fact fixture. It should be treated as a bridge toward solve-rate experiments, not as an end-to-end benchmark win.

Live post-compaction patch-and-test smoke on June 15, 2026 reran the cache/parser mini repos with explicit `command_checks` that execute `npm test` after the OpenCode run. The tests read the edited files and assert the retained compacted facts while rejecting placeholders:

| Scenario | Variant | Session | File check | Command check | Exported model | Run tokens |
| --- | --- | --- | --- | --- | --- | --- |
| cache invalidation | baseline | `ses_ctxledger_noisy_cache_invalidation_baseline_1781466224875` | pass | pass: `npm test`, `retained context patch ok: cache` | `openai/gpt-5.5`, variant `high` | `input=7378`, `cache.read=62976`, `output=1214`, `reasoning=257` |
| cache invalidation | ContextLedger precision replace | `ses_ctxledger_noisy_cache_invalidation_precision_1781466224875` | pass | pass: `npm test`, `retained context patch ok: cache` | `openai/gpt-5.5`, variant `high` | `input=7429`, `cache.read=53760`, `output=1159`, `reasoning=47` |
| parser fallback | baseline | `ses_ctxledger_noisy_parser_fallback_baseline_1781466224875` | pass | pass: `npm test`, `retained context patch ok: parser` | `openai/gpt-5.5`, variant `high` | `input=6638`, `cache.read=24064`, `output=894`, `reasoning=293` |
| parser fallback | ContextLedger precision replace | `ses_ctxledger_noisy_parser_fallback_precision_1781466224875` | pass | pass: `npm test`, `retained context patch ok: parser` | `openai/gpt-5.5`, variant `high` | `input=6182`, `cache.read=53248`, `output=982`, `reasoning=147` |

Artifacts were written under `/tmp/ctxledger-noisy-patchtest-gpt55-20260614211412/`, including per-row repos, `patchtest-run-manifest.jsonl`, run/export logs, command-check stdout/stderr, predictions, and `run-report.json`. Run logs show `stream providerID=openai modelID=gpt-5.5 ... agent=build mode=primary` and explicit edit/bash permission decisions. This is stronger than the file-only edit smoke because it includes an external test command, but it remains a controlled mini benchmark with exact old facts rather than an open-ended SWE-Bench or ContextBench solve-rate result.

Live noisy manual-compaction hardening on June 15, 2026 used the new `--opencode-noisy-compaction-live-manifest` bridge on all three noisy scenarios with 32 distractor turns per fixture. The run imported baseline and precision sessions into a temporary SQLite DB, used per-lane `OPENCODE_CONFIG_CONTENT`, called the HTTP summarize route, exported the compacted sessions, and scored actual summary text. Every lane used OpenCode's native OpenAI provider with `openai/gpt-5.5`, variant `high`; serve logs show `stream providerID=openai modelID=gpt-5.5 ... agent=compaction`.

| Scenario | Baseline input | Precision input | Input delta | Baseline summary tokens | Precision summary tokens | Claim recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| payment retry | 3834 | 719 | -3115 | 274 | 249 | both `6/6` |
| cache invalidation | 3889 | 715 | -3174 | 360 | 330 | both `6/6` |
| parser fallback | 3899 | 710 | -3189 | 462 | 318 | both `6/6` |

Aggregate: baseline mean input `3874`, precision mean input `714.7`; baseline mean summary tokens `365.3`, precision mean summary tokens `299`; both lanes retained `18/18` total claims. Artifacts were written under `/tmp/ctxledger-noisy-live-gpt55-20260615130746/live/`, including `live-report.json`, `summary-report.json`, lane exports, import logs, serve logs, and summarize responses. This is the strongest bounded live compaction-token result so far: precision replacement preserved all scored claims while using about 18.4% of baseline compaction input on a noisier fixture. It is still not solve-rate evidence.

The follow-up continuation path exposed a harness issue: `opencode run --session ... --format json` against an imported compacted session completed the `openai/gpt-5.5` model call and stored the correct payment-retry answer in the temp DB, but the CLI process stayed alive after `exiting loop` and emitted no JSON stdout before the external timeout. The stored assistant text matched all answer checks (`marker`, `header`, `file`, `test`, `attempts`, `symbol`), with message metadata `providerID=openai`, `modelID=gpt-5.5`, variant `high`. Treat this as a CLI resume/reporting bug to fix before broad post-compaction continuation runs, not as a failed model recall result.

Manual compaction smoke on June 14, 2026 used a temporary `probe` agent with `skill` denied to avoid tool-use noise, then called the local-source HTTP summarize route with `{"providerID":"openai","modelID":"gpt-5.5","variant":"high","auto":false}`. ContextLedger-enabled and ContextLedger-disabled runs both returned `true`, logged `agent=compaction providerID=openai modelID=gpt-5.5`, and stored `variant="high"` on the summary assistant message. The enabled summary preserved all simple sentinel facts:

| ContextLedger | Sentinel retained | Active file retained | Benchmark-only decision retained | Typecheck note retained | Summary tokens |
| --- | --- | --- | --- | --- | ---: |
| enabled | yes: `LEDGER_SENTINEL_ALPHA=ctxlg-openai-gpt55-alpha` | yes | yes | yes | 1003 |
| disabled | yes: `LEDGER_SENTINEL_BETA=ctxlg-openai-gpt55-beta` | yes | yes | yes | 694 |

This is a live compaction integration check, not an algorithmic win: the prompt was simple enough that the original compaction path also retained the facts. A forced-overflow attempt with an artificially huge `compaction.reserved` value was rejected as a harness because it made every assistant response over-budget and caused repeated compaction cycles.

Historical note: an earlier OpenCode Zen-provider retry reached `opencode/gpt-5.4` but returned `401 CreditsError: Insufficient balance` from `https://opencode.ai/zen/v1/responses`. That blocker no longer applies to the required OpenAI-provider lane.

## Current Non-Claims

- This does not yet beat state of the art.
- This does not yet run ContextBench end to end with real OpenCode trajectories.
- The ContextBench sampler is a selector-pressure harness over converted dataset rows, not a substitute for official leaderboard evidence.
- This does not yet use the ledger outside compaction prompt construction.
- This does not yet persist a separate artifact store.
- This has only run bounded live OpenAI-provider prompt, tool-read, manual-compaction, post-compaction answer, small edit, and mini patch-and-test smokes; it does not yet prove full benchmark trajectory quality with `openai/gpt-5.5 --variant high`.

The slice exists to establish a measured, in-repo context selection loop before broader experiments.
