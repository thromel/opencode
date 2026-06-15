import { describe, expect, test } from "bun:test"
import { DateTime } from "effect"
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ModelV2 } from "@opencode-ai/core/model"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { SessionContextLedger } from "@opencode-ai/core/session/context-ledger"
import { SessionContextLedgerBenchmark } from "@opencode-ai/core/session/context-ledger-benchmark"
import { SessionMessage } from "@opencode-ai/core/session/message"

const created = DateTime.makeUnsafe(0)
const id = (value: string) => SessionMessage.ID.make(`msg_${value}`)
const model = { providerID: ProviderV2.ID.make("openai"), id: ModelV2.ID.make("gpt-5.5") }

const event = (input: {
  readonly id: string
  readonly kind: SessionContextLedger.EventKind
  readonly order: number
  readonly tokens: number
  readonly files?: readonly string[]
  readonly spans?: readonly SessionContextLedger.Span[]
  readonly mustPreserve?: boolean
  readonly recoverability?: SessionContextLedger.Recoverability
  readonly summary?: string
}) =>
  ({
    id: input.id,
    kind: input.kind,
    source: `fixture:${input.id}`,
    order: input.order,
    summary: input.summary ?? input.id,
    tokens: input.tokens,
    recoverability: input.recoverability ?? "medium",
    mustPreserve: input.mustPreserve ?? false,
    files: input.files ?? [],
    spans: input.spans,
    dependencies: [],
  }) satisfies SessionContextLedger.Event

const item = {
  instance_id: "owner__repo-1234",
  gold_ids: ["goal", "test", "diff"],
  gold_files: ["src/config.ts", "tests/config.test.ts"],
  events: [
    event({ id: "constraint", kind: "instruction", order: 1, tokens: 20, mustPreserve: true, recoverability: "low" }),
    event({
      id: "goal",
      kind: "user-goal",
      order: 2,
      tokens: 20,
      files: ["src/config.ts"],
      mustPreserve: true,
      recoverability: "low",
    }),
    event({ id: "noise", kind: "shell", order: 3, tokens: 70, files: ["README.md"], recoverability: "high" }),
    event({
      id: "test",
      kind: "test-evidence",
      order: 4,
      tokens: 18,
      files: ["tests/config.test.ts"],
      mustPreserve: true,
      recoverability: "low",
    }),
    event({ id: "diff", kind: "diff", order: 5, tokens: 20, files: ["src/config.ts", "tests/config.test.ts"] }),
  ],
} satisfies SessionContextLedgerBenchmark.Case

const benchmarkResult = (input: {
  readonly instanceID: string
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly f1: number
  readonly spanF1: number
  readonly lineF1: number
}) =>
  ({
    instanceID: input.instanceID,
    policy: input.policy,
    budget: input.budget,
    tokens: 100,
    selected: 1,
    recall: input.f1,
    precision: input.f1,
    f1: input.f1,
    recallPerThousandTokens: input.f1 * 10,
    fileRecall: input.f1,
    filePrecision: input.f1,
    fileF1: input.f1,
    spanRecall: input.spanF1,
    spanPrecision: input.spanF1,
    spanF1: input.spanF1,
    lineRecall: input.lineF1,
    linePrecision: input.lineF1,
    lineF1: input.lineF1,
    aucFileCoverage: input.f1,
    aucSpanCoverage: input.spanF1,
    aucLineCoverage: input.lineF1,
  }) satisfies SessionContextLedgerBenchmark.Result

async function runTestGit(args: readonly string[], cwd: string) {
  const proc = Bun.spawn({
    cmd: ["git", ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (exit !== 0) throw new Error(`git ${args.join(" ")} failed\n${stderr}`)
  return stdout.trim()
}

const officialEvaluationRow = (instanceID: string, coverage: number, aucLineCoverage: number) =>
  JSON.stringify({
    instance_id: instanceID,
    num_steps: 1,
    final: {
      file: { coverage, precision: 1, intersection: 1, gold_size: 1, pred_size: 1 },
      symbol: { coverage: 1, precision: 1, intersection: 0, gold_size: 0, pred_size: 0 },
      span: { coverage, precision: 1, intersection: 1, gold_size: 1, pred_size: 1 },
      line: { coverage, precision: 1, intersection: 1, gold_size: 1, pred_size: 1 },
    },
    trajectory: {
      auc_coverage: { file: coverage, symbol: 1, span: coverage, line: aucLineCoverage },
    },
    editloc: { recall: 1, precision: 1, intersection: 1, gold_size: 1, pred_size: 1 },
  })

describe("SessionContextLedgerBenchmark", () => {
  test("parses JSONL cases and evaluates policy metrics", () => {
    const [parsed] = SessionContextLedgerBenchmark.parseJsonl(`${JSON.stringify(item)}\n`)
    const result = SessionContextLedgerBenchmark.evaluateCase({
      item: parsed,
      policy: "balanced-frontier",
      budget: 80,
    })

    expect(parsed.instance_id).toBe("owner__repo-1234")
    expect(result.recall).toBe(1)
    expect(result.fileRecall).toBe(1)
    expect(result.spanF1).toBe(1)
    expect(result.lineF1).toBe(1)
  })

  test("exports ContextBench-compatible prediction shape", () => {
    const selection = SessionContextLedger.select({
      events: item.events,
      policy: "balanced-frontier",
      budget: 80,
      activeFiles: item.gold_files,
    })
    const prediction = SessionContextLedgerBenchmark.toPrediction({
      instanceID: item.instance_id,
      selection,
    })

    expect(prediction.instance_id).toBe(item.instance_id)
    expect(prediction.traj_data.pred_steps).toHaveLength(selection.events.length)
    expect(prediction.traj_data.pred_files).toEqual(["src/config.ts", "tests/config.test.ts"])
    expect(prediction.traj_data.pred_spans).toEqual({})
  })

  test("evaluates prediction JSONL against ContextBench gold rows", () => {
    const report = SessionContextLedgerBenchmark.evaluatePredictionsAgainstGold({
      predictions: [
        {
          instance_id: "owner__repo-1234",
          traj_data: {
            pred_steps: [
              {
                files: ["src/config.py"],
                spans: { "src/config.py": [{ type: "line", start: 10, end: 14 }] },
              },
            ],
            pred_files: ["src/config.py"],
            pred_spans: { "src/config.py": [{ type: "line", start: 10, end: 14 }] },
          },
        },
      ],
      goldRows: [
        {
          inst_id: "owner__repo-1234",
          original_inst_id: "owner__repo-1234",
          repo: "owner/repo",
          repo_url: "https://github.com/owner/repo.git",
          commit: "abc123",
          gold_ctx: [{ file: "src/config.py", start_line: 10, end_line: 20, content: "" }],
          patch: "",
          test_patch: "",
          source: "fixture",
          language: "python",
        },
      ],
    })

    expect(report.summary.cases).toBe(1)
    expect(report.summary.fileF1).toBe(1)
    expect(report.summary.lineRecall).toBeCloseTo(5 / 11)
    expect(report.summary.linePrecision).toBe(1)
    expect(report.summary.aucLineCoverage).toBeCloseTo(5 / 11)
  })

  test("reports benchmark registry evidence boundaries", () => {
    const registry = SessionContextLedgerBenchmark.benchmarkRegistry()
    const ids = registry.entries.map((entry) => entry.id)

    for (const id of [
      "contextbench",
      "swe-explore",
      "agent-retrieval-bench",
      "swe-contextbench",
      "compaction-survival",
      "opencode-live-manifest",
    ]) {
      expect(ids).toContain(id)
    }
    expect(registry.summary.integrated).toBeGreaterThanOrEqual(5)
    expect(registry.entries.find((entry) => entry.id === "contextbench")?.status).toBe("integrated")
    expect(registry.entries.find((entry) => entry.id === "swe-contextbench")?.status).toBe("partial")
    expect(
      registry.entries.find((entry) => entry.id === "contextbench")?.evidenceCannotSupport.some((item) =>
        item.includes("solve rate"),
      ),
    ).toBe(true)
    expect(registry.entries.every((entry) => entry.evidenceCanSupport.length > 0)).toBe(true)
    expect(registry.entries.every((entry) => entry.evidenceCannotSupport.length > 0)).toBe(true)
  })

  test("analyzes compaction survival against raw-tail retention", () => {
    const report = SessionContextLedgerBenchmark.analyzeCompactionSurvival({
      budget: 35,
      policy: "official-frontier",
      cases: [{
        instance_id: "compaction-api-stability",
        context: [
          "[System update]: Keep public API stable in src/api.ts.",
          "[User]: Fix the fallback behavior without changing loadConfig().",
          `[Tool result]: ${"dependency install noise ".repeat(80)}`,
          "[Shell]: bun test tests/api.test.ts\nFAILED tests/api.test.ts expected src/api.ts to preserve stable response",
          "[Assistant]: Next inspect README.md for unrelated docs cleanup.",
        ],
        gold: [
          { id: "constraint", category: "constraint", text: "Keep public API stable", file: "src/api.ts" },
          { id: "latest-test", category: "latest-test", text: "FAILED tests/api.test.ts", file: "tests/api.test.ts" },
          { id: "active-file", category: "file", file: "src/api.ts" },
        ],
      }],
    })

    const raw = report.rows.find((row) => row.variant === "raw-tail")
    const ledger = report.rows.find((row) => row.variant === "context-ledger")
    const combined = report.rows.find((row) => row.variant === "context-ledger-plus-tail")
    expect(raw?.survived).not.toContain("constraint")
    expect(ledger?.survived).toContain("constraint")
    expect((combined?.recall ?? 0)).toBeGreaterThan(raw?.recall ?? 0)
    expect(report.summaries.find((summary) => summary.variant === "context-ledger-plus-tail")?.recall).toBeGreaterThan(
      report.summaries.find((summary) => summary.variant === "raw-tail")?.recall ?? 0,
    )
  })

  test("summarizes result groups by policy", () => {
    const policies = ["recency", "balanced-frontier"] satisfies readonly SessionContextLedger.SelectionPolicy[]
    const results = [60, 80].flatMap((budget) =>
      policies.map((policy) =>
        SessionContextLedgerBenchmark.evaluateCase({
          item,
          policy,
          budget,
        }),
      ),
    )
    const summary = SessionContextLedgerBenchmark.summarize(results)

    expect(summary.find((row) => row.policy === "balanced-frontier" && row.budget === 80)?.cases).toBe(1)
    expect(summary.find((row) => row.policy === "balanced-frontier" && row.budget === 80)?.recall).toBe(1)
    expect(summary.map((row) => `${row.budget}:${row.policy}`)).toEqual([
      "60:recency",
      "60:balanced-frontier",
      "80:recency",
      "80:balanced-frontier",
    ])
  })

	  test("injects top similar prior experience records as optional context", () => {
	    const [enriched] = SessionContextLedgerBenchmark.withExperienceReplay(
      [
        {
          instance_id: "current-parser-bug",
          query: "Fix parser fallback in src/parser.ts",
          benchmark: "swe-contextbench",
          task_type: "bugfix",
          repo: "acme/parser",
          gold_ids: ["target"],
          gold_files: ["src/parser.ts"],
          events: [
            event({
              id: "target",
              kind: "code-context",
              order: 100,
              tokens: 40,
              files: ["src/parser.ts"],
              spans: [{ file: "src/parser.ts", start: 10, end: 20 }],
            }),
          ],
        },
      ],
      {
        maxPerCase: 1,
        experiences: [
          {
            id: "old-parser-fallback",
            query: "Fix parser fallback in src/parser.ts",
            benchmark: "swe-contextbench",
            task_type: "bugfix",
            repo: "acme/parser",
            files: ["src/parser.ts"],
            spans: [{ file: "src/parser.ts", start: 8, end: 18 }],
            summary: "Previous repair kept the fallback branch next to parseFallback.",
          },
          {
            id: "unrelated-ui",
            query: "Adjust dashboard colors",
            repo: "acme/ui",
            files: ["src/dashboard.tsx"],
            summary: "UI-only styling change.",
          },
        ],
      },
    )

    expect(enriched?.events[0]?.kind).toBe("experience")
    expect(enriched?.events[0]?.id).toContain("old-parser-fallback")
    expect(enriched?.events.some((entry) => entry.id.includes("unrelated-ui"))).toBe(false)
    expect(enriched?.events[0]?.files).toEqual(["src/parser.ts"])
	    expect(SessionContextLedger.render(enriched?.events ?? [])).toContain("## Reusable Experience")
	  })

  test("converts SWE-ContextBench rows into relationship-filtered experience records", () => {
    const rows = SessionContextLedgerBenchmark.parseSWEContextBenchTaskJsonl(
      [
        {
          repo: "acme/parser",
          instance_id: "exp-parser",
          base_commit: "abc123",
          patch: "diff --git a/src/parser.ts b/src/parser.ts\n--- a/src/parser.ts\n+++ b/src/parser.ts\n@@ -1,1 +1,1 @@\n-old\n+new\n",
          test_patch: "diff --git a/tests/parser.test.ts b/tests/parser.test.ts\nnew file mode 100644\n--- /dev/null\n+++ b/tests/parser.test.ts\n@@ -0,0 +1,1 @@\n+test('fallback')\n",
          problem_statement: "Parser fallback drops empty input.",
          hints_text: null,
          FAIL_TO_PASS: "[\"tests/parser.test.ts::fallback\"]",
          PASS_TO_PASS: "[]",
        },
        {
          repo: "acme/ui",
          instance_id: "exp-ui",
          patch: "diff --git a/src/ui.ts b/src/ui.ts\n--- a/src/ui.ts\n+++ b/src/ui.ts\n",
          problem_statement: "Unrelated UI task.",
        },
      ].map((row) => JSON.stringify(row)).join("\n"),
    )
    const relationships = SessionContextLedgerBenchmark.parseSWEContextBenchRelationshipJsonl(
      `${JSON.stringify({
        related_instance_id: "related-parser",
        experience_instance_id: "exp-parser",
        related_pr_url: "https://example.test/related",
        experience_pr_url: "https://example.test/experience",
      })}\n`,
    )
    const records = SessionContextLedgerBenchmark.experienceRecordsFromSWEContextBenchRows(rows, {
      relationships,
      relatedInstanceIDs: ["related-parser"],
    })

    expect(records).toHaveLength(1)
    expect(records[0]?.id).toBe("exp-parser")
    expect(records[0]?.repo).toBe("acme/parser")
    expect(records[0]?.files).toEqual(["src/parser.ts", "tests/parser.test.ts"])
    expect(records[0]?.summary).toContain("Parser fallback drops empty input.")
    expect(records[0]?.summary).toContain("tests/parser.test.ts::fallback")
  })

	  test("reports paired experience replay deltas", () => {
    const report = SessionContextLedgerBenchmark.analyzeExperienceReplay(
      [
        {
          instance_id: "current-parser-bug",
          query: "Fix parser fallback in src/parser.ts",
          benchmark: "swe-contextbench",
          task_type: "bugfix",
          repo: "acme/parser",
          gold_ids: ["target"],
          gold_files: ["src/parser.ts"],
          events: [
            event({
              id: "target",
              kind: "code-context",
              order: 100,
              tokens: 300,
              files: ["src/parser.ts"],
              spans: [{ file: "src/parser.ts", start: 10, end: 20 }],
            }),
            event({
              id: "noise",
              kind: "code-context",
              order: 101,
              tokens: 40,
              files: ["src/noise.ts"],
              spans: [{ file: "src/noise.ts", start: 1, end: 4 }],
            }),
          ],
        },
      ],
      {
        budgets: [180],
        policies: ["relevance-frontier"],
        maxPerCase: 1,
        experiences: [
          {
            id: "old-parser-fallback",
            query: "Fix parser fallback in src/parser.ts",
            benchmark: "swe-contextbench",
            task_type: "bugfix",
            repo: "acme/parser",
            files: ["src/parser.ts"],
            spans: [{ file: "src/parser.ts", start: 10, end: 20 }],
            summary: "Prior parser fallback fix.",
          },
        ],
      },
    )

    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]?.selectedExperienceEvents).toBeGreaterThan(0)
    expect(report.rows[0]?.deltas.fileF1).toBeGreaterThan(0)
    expect(report.rows[0]?.deltas.lineF1).toBeGreaterThan(0)
    expect(report.summaries[0]?.casesWithSelectedExperience).toBe(1)
  })

  test("experience frontier turns replay records into matching code retention", () => {
    const cases = [
      {
        instance_id: "current-parser-bug",
        query: "Fix fallback behavior.",
        benchmark: "swe-contextbench",
        task_type: "bugfix",
        repo: "acme/parser",
        gold_ids: ["target"],
        gold_files: ["src/parser.ts"],
        events: [
          event({
            id: "target",
            kind: "code-context",
            order: 100,
            tokens: 70,
            summary: "src/parser.ts:10-20\nparse token stream and return default branch result",
            files: ["src/parser.ts"],
            spans: [{ file: "src/parser.ts", start: 10, end: 20 }],
          }),
          event({
            id: "lexical-distractor",
            kind: "code-context",
            order: 101,
            tokens: 110,
            summary: "src/cache.ts:1-12\nfallback behavior fallback behavior fallback behavior",
            files: ["src/cache.ts"],
            spans: [{ file: "src/cache.ts", start: 1, end: 12 }],
          }),
        ],
      },
    ] satisfies SessionContextLedgerBenchmark.Case[]
    const experiences = [
      {
        id: "old-parser-fallback",
        repo: "acme/parser",
        task_type: "bugfix",
        files: ["src/parser.ts"],
        spans: [{ file: "src/parser.ts", start: 10, end: 20 }],
        summary: "Prior parser fallback fix.",
      },
    ] satisfies SessionContextLedgerBenchmark.ExperienceRecord[]

    const [enriched] = SessionContextLedgerBenchmark.withExperienceReplay(cases, {
      experiences,
      maxPerCase: 1,
      minScore: 1,
    })
    const selection = SessionContextLedger.select({
      events: enriched?.events ?? [],
      policy: "experience-frontier",
      budget: 130,
      query: cases[0]?.query,
    })
    const report = SessionContextLedgerBenchmark.analyzeExperienceReplay(cases, {
      experiences,
      budgets: [130],
      policies: ["experience-frontier"],
      maxPerCase: 1,
      minScore: 1,
    })

    expect(selection.events.map((entry) => entry.id)).toContain("target")
    expect(report.rows[0]?.selectedExperienceEvents).toBeGreaterThan(0)
    expect(report.rows[0]?.deltas.lineF1).toBeGreaterThan(0)
  })

  test("summarizes official ContextBench evaluator output", () => {
    const rows = SessionContextLedgerBenchmark.parseOfficialJsonl(
      [
        JSON.stringify({
          instance_id: "owner__repo-1",
          num_steps: 2,
          final: {
            file: { coverage: 0.5, precision: 1, intersection: 1, gold_size: 2, pred_size: 1 },
            symbol: { coverage: 1, precision: 1, intersection: 0, gold_size: 0, pred_size: 0 },
            span: { coverage: 0.4, precision: 0.8, intersection: 4, gold_size: 10, pred_size: 5 },
            line: { coverage: 0.25, precision: 0.5, intersection: 1, gold_size: 4, pred_size: 2 },
          },
          trajectory: {
            auc_coverage: { file: 0.4, symbol: 1, span: 0.3, line: 0.2 },
          },
          editloc: { recall: 1, precision: 0, intersection: 3, gold_size: 4, pred_size: 3 },
        }),
        JSON.stringify({
          instance_id: "owner__repo-2",
          num_steps: 1,
          final: {
            file: { coverage: 0.25, precision: 0.5, intersection: 1, gold_size: 4, pred_size: 2 },
            symbol: { coverage: 1, precision: 1, intersection: 0, gold_size: 0, pred_size: 0 },
            span: { coverage: 0.2, precision: 1, intersection: 2, gold_size: 10, pred_size: 2 },
            line: { coverage: 0.5, precision: 1, intersection: 2, gold_size: 4, pred_size: 2 },
          },
          trajectory: {
            auc_coverage: { file: 0.2, symbol: 1, span: 0.1, line: 0.4 },
          },
          editloc: { recall: 1, precision: 0, intersection: 1, gold_size: 4, pred_size: 2 },
        }),
      ].join("\n"),
    )
    const summary = SessionContextLedgerBenchmark.summarizeOfficialEvaluation(rows)

    expect(summary.rows).toBe(2)
    expect(summary.final.fileCoverage).toBeCloseTo(0.375)
    expect(summary.final.fileF1).toBeCloseTo(0.5)
    expect(summary.final.spanPrecision).toBeCloseTo(0.9)
    expect(summary.final.officialUtility).toBeCloseTo(0.477777777)
    expect(summary.trajectory.aucLineCoverage).toBeCloseTo(0.3)
    expect(summary.editloc.recall).toBeCloseTo(0.5)
    expect(summary.editloc.precision).toBeCloseTo(0.75)
  })

  test("compares official evaluator policies with paired per-instance deltas", () => {
    const baselineRows = SessionContextLedgerBenchmark.parseOfficialJsonl(
      [
        officialEvaluationRow("case-1", 0.5, 0.5),
        officialEvaluationRow("case-2", 0.8, 0.8),
        officialEvaluationRow("case-3", 0.5, 0.5),
      ].join("\n"),
    )
    const candidateRows = SessionContextLedgerBenchmark.parseOfficialJsonl(
      [
        officialEvaluationRow("case-1", 0.75, 0.75),
        officialEvaluationRow("case-2", 0.4, 0.4),
        officialEvaluationRow("case-3", 0.5, 0.5),
      ].join("\n"),
    )
    const [comparison] = SessionContextLedgerBenchmark.compareOfficialPolicyEvaluations({
      baselinePolicy: "portfolio-frontier",
      evaluations: [
        {
          policy: "portfolio-frontier",
          rows: baselineRows,
          summary: SessionContextLedgerBenchmark.summarizeOfficialEvaluation(baselineRows),
        },
        {
          policy: "official-frontier",
          rows: candidateRows,
          summary: SessionContextLedgerBenchmark.summarizeOfficialEvaluation(candidateRows),
        },
      ],
    })

    expect(comparison?.policy).toBe("official-frontier")
    expect(comparison?.officialUtility.pairedRows).toBe(3)
    expect(comparison?.officialUtility.wins).toBe(1)
    expect(comparison?.officialUtility.losses).toBe(1)
    expect(comparison?.officialUtility.ties).toBe(1)
    expect(comparison?.officialUtility.ci95Low).toBeLessThan(comparison?.officialUtility.deltaMean ?? 0)
    expect(comparison?.officialUtility.ci95High).toBeGreaterThan(comparison?.officialUtility.deltaMean ?? 0)
    expect(comparison?.officialUtility.topImprovements.map((item) => item.instanceID)).toEqual(["case-1"])
    expect(comparison?.officialUtility.topRegressions.map((item) => item.instanceID)).toEqual(["case-2"])
  })

  test("inspects selection deltas with gained files and policy-only events", () => {
    const caseItem = {
      instance_id: "owner__repo-selection-delta",
      gold_ids: ["gold"],
      gold_files: ["src/config.ts"],
      events: [
        event({
          id: "gold",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/config.ts"],
          spans: [{ file: "src/config.ts", start: 10, end: 20 }],
          mustPreserve: true,
          recoverability: "low",
        }),
        event({
          id: "noise",
          kind: "shell",
          order: 2,
          tokens: 30,
          files: ["README.md"],
          spans: [{ file: "README.md", start: 1, end: 5 }],
          recoverability: "high",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const report = SessionContextLedgerBenchmark.inspectSelectionDeltas({
      cases: [caseItem],
      budgets: [30],
      baselinePolicy: "recency",
      candidatePolicy: "balanced-frontier",
    })
    const [row] = report.rows

    expect(row?.deltas.officialUtility).toBeGreaterThan(0)
    expect(row?.gainedGoldFiles).toEqual(["src/config.ts"])
    expect(row?.lostFiles).toEqual(["README.md"])
    expect(row?.candidateOnlyEvents.map((item) => item.id)).toEqual(["gold"])
    expect(row?.baselineOnlyEvents.map((item) => item.id)).toEqual(["noise"])
  })

  test("analyzes per-case policy wins and oracle regret", () => {
    const [analysis] = SessionContextLedgerBenchmark.analyze([
      benchmarkResult({
        instanceID: "case-a",
        policy: "relevance-frontier",
        budget: 100,
        f1: 0.8,
        spanF1: 0.7,
        lineF1: 0.6,
      }),
      benchmarkResult({
        instanceID: "case-a",
        policy: "file-frontier",
        budget: 100,
        f1: 0.6,
        spanF1: 0.9,
        lineF1: 0.5,
      }),
      benchmarkResult({
        instanceID: "case-b",
        policy: "relevance-frontier",
        budget: 100,
        f1: 0.4,
        spanF1: 0.6,
        lineF1: 0.7,
      }),
      benchmarkResult({
        instanceID: "case-b",
        policy: "file-frontier",
        budget: 100,
        f1: 0.9,
        spanF1: 0.8,
        lineF1: 0.8,
      }),
    ])
    const relevance = analysis?.policies.find((item) => item.policy === "relevance-frontier")
    const file = analysis?.policies.find((item) => item.policy === "file-frontier")

    expect(analysis?.cases).toBe(2)
    expect(analysis?.bestPolicyByF1).toBe("file-frontier")
    expect(analysis?.oracleF1).toBeCloseTo(0.85)
    expect(relevance?.eventWins).toBe(1)
    expect(relevance?.regretF1).toBeCloseTo(0.25)
    expect(file?.eventWins).toBe(1)
    expect(file?.spanWins).toBe(2)
  })

  test("cross-validates a budget router from training folds", () => {
    const results = ["case-a", "case-b", "case-c", "case-d"].flatMap((instanceID) => [
      benchmarkResult({
        instanceID,
        policy: "relevance-frontier",
        budget: 100,
        f1: 0.8,
        spanF1: 0.7,
        lineF1: 0.6,
      }),
      benchmarkResult({
        instanceID,
        policy: "file-frontier",
        budget: 100,
        f1: 0.5,
        spanF1: 0.9,
        lineF1: 0.4,
      }),
    ])
    const [analysis] = SessionContextLedgerBenchmark.analyzeBudgetRouter(results, { folds: 2 })

    expect(analysis?.cases).toBe(4)
    expect(analysis?.folds).toBe(2)
    expect(analysis?.bestFixedPolicy).toBe("relevance-frontier")
    expect(analysis?.routerF1).toBeCloseTo(0.8)
    expect(analysis?.routerRegretF1).toBeCloseTo(0)
    expect(analysis?.trainPolicyCounts).toEqual([{ policy: "relevance-frontier", folds: 2 }])
  })

  test("cross-validates an observable feature router", () => {
    const cases = ["a", "b", "c", "d"].map(
      (suffix) =>
        ({
          instance_id: `owner__repo-feature-${suffix}`,
          query: suffix < "c" ? "timezone conversion offset" : "empty environment fallback config value",
          gold_ids: suffix < "c" ? ["entry", "neighbor"] : ["matching"],
          gold_files: suffix < "c" ? ["src/time.ts"] : ["src/config.ts"],
          events:
            suffix < "c"
              ? [
                  event({
                    id: "entry",
                    kind: "code-context",
                    order: 1,
                    tokens: 30,
                    files: ["src/time.ts"],
                    summary: "timezone conversion offset implementation",
                  }),
                  event({
                    id: "neighbor",
                    kind: "code-context",
                    order: 2,
                    tokens: 25,
                    files: ["src/time.ts"],
                    summary: "normalize zone delta helper",
                  }),
                  event({
                    id: "distractor",
                    kind: "code-context",
                    order: 3,
                    tokens: 30,
                    files: ["tests/time.test.ts"],
                    summary: "timezone conversion offset fixture",
                  }),
                ]
              : [
                  event({
                    id: "test-context",
                    kind: "code-context",
                    order: 1,
                    tokens: 30,
                    files: ["tests/config.test.ts"],
                    summary: "empty environment fallback config value",
                  }),
                  event({
                    id: "matching",
                    kind: "code-context",
                    order: 2,
                    tokens: 30,
                    files: ["src/config.ts"],
                    summary: "empty environment fallback config value",
                  }),
                ],
        }) satisfies SessionContextLedgerBenchmark.Case,
    )
    const [analysis] = SessionContextLedgerBenchmark.analyzeFeatureRouter(cases, {
      budgets: [55],
      policies: ["relevance-frontier", "file-frontier", "adaptive-frontier"],
      folds: 2,
      target: "official-utility",
    })

    expect(analysis?.target).toBe("official-utility")
    expect(analysis?.cases).toBe(4)
    expect(analysis?.folds).toBe(2)
    expect(analysis?.routerTargetScore).toBeGreaterThanOrEqual(0)
    expect(analysis?.bestFixedTargetScore).toBeGreaterThanOrEqual(0)
    expect(analysis?.routerF1).toBeGreaterThanOrEqual(0)
    expect(analysis?.targetDeltaVsBestFixed).toBeCloseTo(
      (analysis?.routerTargetScore ?? 0) - (analysis?.bestFixedTargetScore ?? 0),
    )
    expect(analysis?.f1DeltaVsBestFixed).toBeCloseTo((analysis?.routerF1 ?? 0) - (analysis?.bestFixedF1 ?? 0))
    expect(analysis?.foldResults.every((fold) => fold.rule.feature.length > 0)).toBe(true)
    expect(analysis?.featureCounts.length).toBeGreaterThan(0)
  })

  test("trains and evaluates feature router rule artifacts", () => {
    const cases = ["a", "b", "c", "d"].map(
      (suffix) =>
        ({
          instance_id: `owner__repo-artifact-${suffix}`,
          query: suffix < "c" ? "timezone conversion offset" : "empty environment fallback config value",
          gold_ids: suffix < "c" ? ["entry", "neighbor"] : ["matching"],
          gold_files: suffix < "c" ? ["src/time.ts"] : ["src/config.ts"],
          events:
            suffix < "c"
              ? [
                  event({
                    id: "entry",
                    kind: "code-context",
                    order: 1,
                    tokens: 30,
                    files: ["src/time.ts"],
                    summary: "timezone conversion offset implementation",
                  }),
                  event({
                    id: "neighbor",
                    kind: "code-context",
                    order: 2,
                    tokens: 25,
                    files: ["src/time.ts"],
                    summary: "normalize zone delta helper",
                  }),
                  event({
                    id: "distractor",
                    kind: "code-context",
                    order: 3,
                    tokens: 30,
                    files: ["tests/time.test.ts"],
                    summary: "timezone conversion offset fixture",
                  }),
                ]
              : [
                  event({
                    id: "test-context",
                    kind: "code-context",
                    order: 1,
                    tokens: 30,
                    files: ["tests/config.test.ts"],
                    summary: "empty environment fallback config value",
                  }),
                  event({
                    id: "matching",
                    kind: "code-context",
                    order: 2,
                    tokens: 30,
                    files: ["src/config.ts"],
                    summary: "empty environment fallback config value",
                  }),
                ],
        }) satisfies SessionContextLedgerBenchmark.Case,
    )
    const artifact = SessionContextLedgerBenchmark.trainFeatureRouterRules(cases, {
      budgets: [55, 65],
      policies: ["relevance-frontier", "file-frontier", "adaptive-frontier"],
      target: "event-f1",
    })
    const decoded = SessionContextLedgerBenchmark.decodeFeatureRouterRules(JSON.parse(JSON.stringify(artifact)))
    const evaluations = SessionContextLedgerBenchmark.evaluateFeatureRouterRules(cases, decoded)
    const [evaluation] = evaluations

    expect(decoded).toMatchObject({
      version: 1,
      kind: "context-ledger-feature-router",
      target: "event-f1",
    })
    expect(decoded.rules.map((rule) => rule.budget)).toEqual([55, 65])
    expect(decoded.rules.every((rule) => rule.trainCases === 4)).toBe(true)
    expect(evaluations).toHaveLength(2)
    expect(evaluation?.cases).toBe(4)
    expect(evaluation?.trainCases).toBe(4)
    expect(evaluation?.rule.target).toBe("event-f1")
    expect(evaluation?.routerTargetScore).toBeGreaterThanOrEqual(0)
    expect(evaluation?.targetDeltaVsBestFixed).toBeCloseTo(
      (evaluation?.routerTargetScore ?? 0) - (evaluation?.bestFixedTargetScore ?? 0),
    )
    expect(evaluation?.trainingBestFixedPolicy).toBe(decoded.rules[0]?.bestFixedPolicy)

    const conservative = SessionContextLedgerBenchmark.trainFeatureRouterRules(cases, {
      budgets: [55],
      policies: ["relevance-frontier", "file-frontier", "adaptive-frontier"],
      target: "event-f1",
      validationFolds: 2,
      minimumValidationGain: 1,
    })
    const [conservativeRule] = conservative.rules
    const [conservativeEvaluation] = SessionContextLedgerBenchmark.evaluateFeatureRouterRules(cases, conservative)

    expect(conservativeRule?.promoted).toBe(false)
    expect(conservativeRule?.rule.feature).toBe("constant")
    expect(conservativeRule?.rule.lowPolicy).toBe(conservativeRule?.bestFixedPolicy)
    expect(conservativeEvaluation?.promoted).toBe(false)
    expect(conservativeEvaluation?.trainingValidationFolds).toBe(2)
    expect(conservativeEvaluation?.trainingValidationDeltaVsBestFixed).toBeDefined()
  })

  test("reports cross-split feature router promotion gates", () => {
    const splitA = {
      instance_id: "owner__repo-promotion-a",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 25,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "distractor",
          kind: "code-context",
          order: 3,
          tokens: 30,
          files: ["tests/time.test.ts"],
          summary: "timezone conversion offset fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const splitB = {
      instance_id: "owner__repo-promotion-b",
      query: "empty environment fallback config value",
      gold_ids: ["matching"],
      gold_files: ["src/config.ts"],
      events: [
        event({
          id: "test-context",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["tests/config.test.ts"],
          summary: "empty environment fallback config value",
        }),
        event({
          id: "matching",
          kind: "code-context",
          order: 2,
          tokens: 30,
          files: ["src/config.ts"],
          summary: "empty environment fallback config value",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const report = SessionContextLedgerBenchmark.analyzeFeatureRouterPromotion(
      [
        { id: "split-a", cases: [splitA] },
        { id: "split-b", cases: [splitB] },
      ],
      {
        budgets: [55],
        policies: ["relevance-frontier", "file-frontier", "adaptive-frontier"],
        target: "event-f1",
        validationFolds: 2,
        minimumValidationGain: 1,
        minimumHeldoutGain: 0,
      },
    )
    const [budget] = report.budgets
    const [trainSplit] = budget?.trainSplits ?? []

    expect(report.splitCount).toBe(2)
    expect(budget?.budget).toBe(55)
    expect(budget?.promotable).toBe(false)
    expect(trainSplit?.rulePromoted).toBe(false)
    expect(trainSplit?.ruleIsLearned).toBe(false)
    expect(trainSplit?.promotable).toBe(false)
    expect(trainSplit?.evalSplits).toHaveLength(1)
    expect(trainSplit?.evalSplits[0]?.evalSplit).toBe("split-b")
    expect(trainSplit?.evalSplits[0]?.targetDeltaVsBestFixed).toBeGreaterThanOrEqual(-1)
    expect(() =>
      SessionContextLedgerBenchmark.analyzeFeatureRouterPromotion(
        [
          { id: "duplicate", cases: [splitA] },
          { id: "duplicate", cases: [splitB] },
        ],
        {
          budgets: [55],
          policies: ["relevance-frontier"],
        },
      ),
    ).toThrow("Promotion split IDs must be unique")
  })

  test("reports fixed-policy stability across disjoint splits", () => {
    const splitA = {
      instance_id: "owner__repo-stability-a",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 25,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "distractor",
          kind: "code-context",
          order: 3,
          tokens: 30,
          files: ["tests/time.test.ts"],
          summary: "timezone conversion offset fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const splitB = {
      instance_id: "owner__repo-stability-b",
      query: "empty environment fallback config value",
      gold_ids: ["matching"],
      gold_files: ["src/config.ts"],
      events: [
        event({
          id: "test-context",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["tests/config.test.ts"],
          summary: "empty environment fallback config value",
        }),
        event({
          id: "matching",
          kind: "code-context",
          order: 2,
          tokens: 30,
          files: ["src/config.ts"],
          summary: "empty environment fallback config value",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const report = SessionContextLedgerBenchmark.analyzePolicyStability(
      [
        { id: "split-a", cases: [splitA] },
        { id: "split-b", cases: [splitB] },
      ],
      {
        budgets: [55],
        policies: ["relevance-frontier", "file-frontier", "portfolio-frontier"],
        target: "event-f1",
      },
    )
    const [budget] = report.budgets
    const filePolicy = budget?.policies.find((item) => item.policy === "file-frontier")

    expect(report.splitCount).toBe(2)
    expect(report.target).toBe("event-f1")
    expect(budget?.robustPolicy).toBeDefined()
    expect(budget?.bestMeanPolicy).toBeDefined()
    expect(filePolicy?.splitScores).toHaveLength(2)
    expect(filePolicy?.worstDeltaVsSplitBest).toBeLessThanOrEqual(0)
    expect(filePolicy?.meanTargetScore).toBeGreaterThanOrEqual(0)
    expect(() =>
      SessionContextLedgerBenchmark.analyzePolicyStability(
        [
          { id: "duplicate", cases: [splitA] },
          { id: "duplicate", cases: [splitB] },
        ],
        {
          budgets: [55],
          policies: ["relevance-frontier"],
        },
      ),
    ).toThrow("Stability split IDs must be unique")
  })

  test("compares policies across multiple evaluation targets", () => {
    const report = SessionContextLedgerBenchmark.analyzePolicyTargets(
      [
        benchmarkResult({
          instanceID: "case-a",
          policy: "relevance-frontier",
          budget: 100,
          f1: 0.9,
          spanF1: 0.2,
          lineF1: 0.2,
        }),
        benchmarkResult({
          instanceID: "case-a",
          policy: "file-frontier",
          budget: 100,
          f1: 0.6,
          spanF1: 0.8,
          lineF1: 0.8,
        }),
        benchmarkResult({
          instanceID: "case-a",
          policy: "recency",
          budget: 100,
          f1: 0.5,
          spanF1: 0.1,
          lineF1: 0.1,
        }),
      ],
      {
        targets: ["event-f1", "span-f1", "line-f1", "official-utility"],
      },
    )
    const [budget] = report.budgets
    const eventTarget = budget?.targets.find((item) => item.target === "event-f1")
    const utilityTarget = budget?.targets.find((item) => item.target === "official-utility")
    const relevance = budget?.policies.find((item) => item.policy === "relevance-frontier")
    const file = budget?.policies.find((item) => item.policy === "file-frontier")
    const recency = budget?.policies.find((item) => item.policy === "recency")

    expect(report.targets).toEqual(["event-f1", "span-f1", "line-f1", "official-utility"])
    expect(budget?.cases).toBe(1)
    expect(eventTarget?.bestPolicy).toBe("relevance-frontier")
    expect(utilityTarget?.bestPolicy).toBe("file-frontier")
    expect(file?.targetWins).toBe(3)
    expect(relevance?.targetWins).toBe(1)
    expect(file?.paretoOptimal).toBe(true)
    expect(relevance?.paretoOptimal).toBe(true)
    expect(recency?.paretoOptimal).toBe(false)
    expect(relevance?.worstTargetRegret).toBeCloseTo(0.6)
    expect(file?.worstTargetRegret).toBeCloseTo(0.3)
  })

  test("builds policy portfolios from target and regret objectives", () => {
    const results = [
      benchmarkResult({
        instanceID: "case-a",
        policy: "relevance-frontier",
        budget: 100,
        f1: 0.9,
        spanF1: 0.2,
        lineF1: 0.2,
      }),
      benchmarkResult({
        instanceID: "case-a",
        policy: "file-frontier",
        budget: 100,
        f1: 0.6,
        spanF1: 0.8,
        lineF1: 0.8,
      }),
      benchmarkResult({
        instanceID: "case-b",
        policy: "relevance-frontier",
        budget: 200,
        f1: 0.7,
        spanF1: 0.4,
        lineF1: 0.4,
      }),
      benchmarkResult({
        instanceID: "case-b",
        policy: "file-frontier",
        budget: 200,
        f1: 0.8,
        spanF1: 0.9,
        lineF1: 0.9,
      }),
    ]
    const eventPortfolio = SessionContextLedgerBenchmark.analyzePolicyPortfolio(results, {
      objective: "target-score",
      target: "event-f1",
    })
    const minimaxPortfolio = SessionContextLedgerBenchmark.analyzePolicyPortfolio(results, {
      objective: "minimax-regret",
      targets: ["event-f1", "span-f1", "line-f1", "official-utility"],
    })
    const fileFixed = minimaxPortfolio.fixedPolicies.find((policy) => policy.policy === "file-frontier")

    expect(eventPortfolio.target).toBe("event-f1")
    expect(eventPortfolio.budgets.map((budget) => budget.selectedPolicy)).toEqual(["relevance-frontier", "file-frontier"])
    expect(eventPortfolio.portfolio.selectedPolicyCounts).toEqual([
      { policy: "relevance-frontier", budgets: 1 },
      { policy: "file-frontier", budgets: 1 },
    ])
    expect(minimaxPortfolio.target).toBeUndefined()
    expect(minimaxPortfolio.budgets.map((budget) => budget.selectedPolicy)).toEqual(["file-frontier", "file-frontier"])
    expect(minimaxPortfolio.portfolio.selectedPolicyCounts).toEqual([{ policy: "file-frontier", budgets: 2 }])
    expect(fileFixed?.selectedBudgetCount).toBe(2)
    expect(minimaxPortfolio.portfolio.worstTargetRegret).toBeCloseTo(0.3)
  })

  test("checks portfolio transfer across disjoint splits", () => {
    const report = SessionContextLedgerBenchmark.analyzePolicyPortfolioStability(
      [
        { id: "split-a", cases: [item] },
        { id: "split-b", cases: [item] },
      ],
      {
        budgets: [80],
        policies: ["recency", "balanced-frontier"],
        objective: "target-score",
        target: "event-f1",
      },
    )
    const [budget] = report.budgets
    const [trainSplit] = budget?.trainSplits ?? []
    const [evalSplit] = trainSplit?.evalSplits ?? []
    const robustPolicy = budget?.fixedPolicies.find((policy) => policy.policy === budget.robustPolicy)

    expect(report.splitCount).toBe(2)
    expect(report.target).toBe("event-f1")
    expect(budget?.stable).toBe(true)
    expect(budget?.robustPolicy).toBeDefined()
    expect(budget?.bestMeanPolicy).toBeDefined()
    expect(robustPolicy?.splitScores).toHaveLength(2)
    expect(robustPolicy?.maxHeldoutLoss).toBe(0)
    expect(trainSplit?.selectedPolicy).toBeDefined()
    expect(evalSplit?.evalBestPolicy).toBe(trainSplit?.selectedPolicy)
    expect(evalSplit?.passed).toBe(true)
    expect(() =>
      SessionContextLedgerBenchmark.analyzePolicyPortfolioStability(
        [
          { id: "duplicate", cases: [item] },
          { id: "duplicate", cases: [item] },
        ],
        {
          budgets: [80],
          policies: ["recency", "balanced-frontier"],
        },
      ),
    ).toThrow("Portfolio stability split IDs must be unique")
  })

  test("converts ContextBench rows into benchmark cases", () => {
    const rowResponse = {
      rows: [
        {
          row: {
            instance_id: "SWE-Bench-Verified__python__bug__abc123",
            original_inst_id: "example__repo-1",
            repo: "example/repo",
            repo_url: "https://github.com/example/repo.git",
            language: "python",
            base_commit: "abc123",
            gold_context: JSON.stringify([
              { file: "src/config.py", start_line: 10, end_line: 20, content: "def load_config(): pass" },
            ]),
            patch: "",
            test_patch: "",
            problem_statement: "Config fallback should reject an empty environment value.",
            f2p: JSON.stringify(["tests/test_config.py::test_empty_env"]),
            p2p: JSON.stringify(["tests/test_config.py::test_default_env"]),
            source: "Verified",
          },
        },
      ],
    }
    const [converted] = SessionContextLedgerBenchmark.fromContextBenchRowsResponse(rowResponse, {
      maxGoldSpans: 4,
      maxTests: 4,
    })
    const [goldRow] = SessionContextLedgerBenchmark.toGoldRowsFromContextBenchRowsResponse(rowResponse)

    expect(converted.gold_ids).toEqual(["SWE-Bench-Verified__python__bug__abc123:gold:0"])
    expect(converted.gold_files).toEqual(["src/config.py"])
    expect(converted.events.map((item) => item.id)).not.toContain("SWE-Bench-Verified__python__bug__abc123:problem")
    expect(converted.events.find((item) => item.id === "SWE-Bench-Verified__python__bug__abc123:gold:0")?.kind).toBe(
      "code-context",
    )
    expect(
      converted.events.find((item) => item.id === "SWE-Bench-Verified__python__bug__abc123:gold:0")?.recoverability,
    ).toBe("medium")
    expect(converted.events.find((item) => item.id === "SWE-Bench-Verified__python__bug__abc123:gold:0")?.spans).toEqual(
      [{ file: "src/config.py", start: 10, end: 20 }],
    )
    expect(converted.events.some((item) => item.id.includes("test-code-context"))).toBe(false)
    expect(goldRow).toMatchObject({
      inst_id: "SWE-Bench-Verified__python__bug__abc123",
      original_inst_id: "example__repo-1",
      commit: "abc123",
      gold_ctx: [{ file: "src/config.py", start_line: 10, end_line: 20, content: "def load_config(): pass" }],
    })
    expect(converted.events.map((item) => item.id)).toContain("SWE-Bench-Verified__python__bug__abc123:f2p:0")
    expect(converted.events.map((item) => item.id)).toContain("SWE-Bench-Verified__python__bug__abc123:p2p:0")
  })

  test("optionally adds test-file code context as hard negatives", () => {
    const [converted] = SessionContextLedgerBenchmark.fromContextBenchRowsResponse(
      {
        rows: [
          {
            row: {
              instance_id: "SWE-Bench-Verified__python__bug__abc123",
              original_inst_id: "example__repo-1",
              repo: "example/repo",
              repo_url: "https://github.com/example/repo.git",
              language: "python",
              base_commit: "abc123",
              gold_context: JSON.stringify([
                { file: "src/config.py", start_line: 10, end_line: 20, content: "def load_config(): pass" },
              ]),
              patch: "",
              test_patch: "",
              problem_statement: "Config fallback should reject an empty environment value.",
              f2p: JSON.stringify(["tests/test_config.py::test_empty_env"]),
              p2p: JSON.stringify(["tests/test_config.py::test_default_env"]),
              source: "Verified",
            },
          },
        ],
      },
      { includeTestCodeContext: true, maxTestCodeContexts: 1 },
    )
    const hardNegative = converted.events.find((item) =>
      item.id.includes("SWE-Bench-Verified__python__bug__abc123:test-code-context:0"),
    )

    expect(converted.gold_ids).not.toContain(hardNegative?.id)
    expect(hardNegative).toMatchObject({
      kind: "code-context",
      files: ["tests/test_config.py"],
      spans: [{ file: "tests/test_config.py", start: 1, end: 20 }],
    })
  })

  test("converts Agent Retrieval Bench code2test samples into retrieval cases", () => {
    const [converted] = SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples([
      {
        id: "arb-code2test",
        task_type: "code2test",
        repo: "example/repo",
        base_commit: "base",
        query: {
          changed_file: "src/auth.py",
          pr_title: "Refresh token fallback",
        },
        gold: {
          root_cause_files: ["src/auth.py"],
          related_tests: ["tests/test_auth.py"],
          supporting_files: ["src/token.py"],
          negative_distractors: ["docs/auth.md"],
        },
      },
    ])
    const files = converted.events.flatMap((item) => item.files)

    expect(converted.query).toContain("Refresh token fallback")
    expect(converted.gold_files).toEqual(["tests/test_auth.py"])
    expect(converted.gold_ids).toHaveLength(1)
    expect(files).toEqual(["src/auth.py", "tests/test_auth.py", "src/token.py", "docs/auth.md"])
    expect(converted.events.find((item) => item.files.includes("tests/test_auth.py"))?.kind).toBe("code-context")
  })

  test("converts Agent Retrieval Bench comment2context chunks with span metadata", () => {
    const [sample] = SessionContextLedgerBenchmark.parseAgentRetrievalBenchSamplesJsonl(
      JSON.stringify({
        id: "arb-comment",
        task_type: "comment2context",
        repo: "example/repo",
        base_commit: "base",
        query: {
          path: "src/auth.py",
          comment: "Review says behavior needs a regression test.",
        },
        gold: {
          given_files: ["src/auth.py"],
          must_context_files: [{ path: "tests/test_auth.py", evidence: ["review_comment"] }],
          root_cause_files: ["src/auth.py"],
        },
      }) + "\n",
    )
    const chunks = SessionContextLedgerBenchmark.parseAgentRetrievalBenchChunksJsonl(
      [
        {
          chunk_id: "c-test",
          repo: "example/repo",
          base_commit: "base",
          path: "tests/test_auth.py",
          kind: "symbol",
          symbol: "test_refresh_token",
          start_line: 10,
          end_line: 18,
          text: "regression test for refresh token behavior",
        },
        {
          chunk_id: "c-source",
          repo: "example/repo",
          base_commit: "base",
          path: "src/auth.py",
          kind: "file",
          start_line: 1,
          end_line: 80,
          text: "refresh token implementation",
        },
      ]
        .map((item) => JSON.stringify(item))
        .join("\n") + "\n",
    )
    const [converted] = SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples([sample], {
      chunks,
      includeQueryEvent: true,
    })
    const goldEvent = converted.events.find((item) => item.files.includes("tests/test_auth.py"))

    expect(converted.gold_files).toEqual(["tests/test_auth.py"])
    expect(goldEvent).toBeDefined()
    expect(converted.gold_ids).toEqual([goldEvent!.id])
    expect(converted.events.find((item) => item.id === "arb-comment:arb-query")?.files).toEqual(["src/auth.py"])
    expect(goldEvent?.spans).toEqual([{ file: "tests/test_auth.py", start: 10, end: 18 }])
    expect(goldEvent?.summary).toContain("test_refresh_token")
  })

  test("reports Agent Retrieval Bench ranking metrics from selected packets", () => {
    const [converted] = SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples([
      {
        id: "arb-ranking",
        task_type: "code2test",
        repo: "example/repo",
        base_commit: "base",
        query: { changed_file: "src/auth.py", pr_title: "Refresh token fallback" },
        gold: {
          root_cause_files: ["src/auth.py"],
          related_tests: ["tests/test_auth.py"],
          supporting_files: ["src/token.py"],
        },
      },
    ])
    const report = SessionContextLedgerBenchmark.evaluateAgentRetrievalBenchRanking({
      cases: [converted],
      budgets: [5_000],
      policies: ["recency"],
    })
    const overall = report.summaries.find((item) => item.taskType === "overall")
    const detail = report.details[0]

    expect(report.contextBudgetChars).toBe(8_000)
    expect(overall?.metrics.recallAt5).toBe(1)
    expect(overall?.metrics.mrr).toBe(0.5)
    expect(detail?.goldRanks).toEqual({ "tests/test_auth.py": 2 })
    expect(detail?.rankedFiles.slice(0, 3)).toEqual(["src/auth.py", "tests/test_auth.py", "src/token.py"])
  })

  test("action-aware Agent Retrieval Bench ranking prioritizes target file class", () => {
    const [converted] = SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples([
      {
        id: "arb-action-aware-ranking",
        task_type: "code2test",
        repo: "example/repo",
        base_commit: "base",
        query: { changed_file: "src/auth.py", pr_title: "Refresh token fallback" },
        gold: {
          root_cause_files: ["src/auth.py"],
          related_tests: ["tests/test_auth.py"],
          supporting_files: ["src/token.py"],
        },
      },
    ])
    const report = SessionContextLedgerBenchmark.evaluateAgentRetrievalBenchRanking({
      cases: [converted],
      budgets: [5_000],
      policies: ["recency"],
      rankingStrategy: "action-aware",
    })
    const detail = report.details[0]

    expect(report.rankingStrategy).toBe("action-aware")
    expect(detail?.rankingStrategy).toBe("action-aware")
    expect(detail?.goldRanks).toEqual({ "tests/test_auth.py": 1 })
    expect(detail?.metrics.mrr).toBe(1)
    expect(detail?.rankedFiles[0]).toBe("tests/test_auth.py")
  })

  test("action-aware frontier reorders selected context for packet-order retrieval metrics", () => {
    const [converted] = SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples([
      {
        id: "arb-action-aware-frontier",
        task_type: "code2test",
        repo: "example/repo",
        base_commit: "base",
        query: { changed_file: "src/auth.py", pr_title: "Refresh token fallback" },
        gold: {
          root_cause_files: ["src/auth.py"],
          related_tests: ["tests/test_auth.py"],
          supporting_files: ["src/token.py"],
        },
      },
    ])
    const report = SessionContextLedgerBenchmark.evaluateAgentRetrievalBenchRanking({
      cases: [converted],
      budgets: [5_000],
      policies: ["action-aware-frontier"],
    })
    const detail = report.details[0]
    const selection = SessionContextLedger.select({
      events: converted.events,
      policy: "action-aware-frontier",
      budget: 5_000,
      query: converted.query,
    })

    expect(selection.policy).toBe("action-aware-frontier")
    expect(selection.events[0]?.files).toEqual(["tests/test_auth.py"])
    expect(detail?.rankingStrategy).toBe("packet-order")
    expect(detail?.goldRanks).toEqual({ "tests/test_auth.py": 1 })
    expect(detail?.metrics.mrr).toBe(1)
  })

  test("intent frontier can change retained context for action-specific tight budgets", () => {
    const [converted] = SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples([
      {
        id: "arb-intent-frontier",
        task_type: "code2test",
        repo: "example/repo",
        base_commit: "base",
        query: { changed_file: "src/auth.py", pr_title: "Refresh token fallback" },
        gold: {
          root_cause_files: ["src/auth.py"],
          related_tests: ["tests/test_auth.py"],
          supporting_files: ["src/token.py"],
          negative_distractors: ["src/session.py", "src/config.py", "docs/auth.md"],
        },
      },
    ])
    const official = SessionContextLedger.select({
      events: converted.events,
      policy: "official-frontier",
      budget: 60,
      query: converted.query,
    })
    const intent = SessionContextLedger.select({
      events: converted.events,
      policy: "intent-frontier",
      budget: 60,
      query: converted.query,
    })
    const officialResult = SessionContextLedgerBenchmark.evaluateCase({
      item: converted,
      policy: "official-frontier",
      budget: 60,
    })
    const intentResult = SessionContextLedgerBenchmark.evaluateCase({
      item: converted,
      policy: "intent-frontier",
      budget: 60,
    })

    expect(official.events.flatMap((event) => event.files)).not.toContain("tests/test_auth.py")
    expect(intent.events[0]?.files).toEqual(["tests/test_auth.py"])
    expect(intentResult.f1).toBeGreaterThan(officialResult.f1)
    expect(intentResult.aucLineCoverage).toBeGreaterThan(officialResult.aucLineCoverage)
  })

  test("intent frontier falls back for unstructured issue prose", () => {
    const [converted] = SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples([
      {
        id: "arb-intent-frontier-prose",
        task_type: "code2test",
        repo: "example/repo",
        base_commit: "base",
        query: { changed_file: "src/auth.py", pr_title: "Refresh token fallback" },
        gold: {
          root_cause_files: ["src/auth.py"],
          related_tests: ["tests/test_auth.py"],
          supporting_files: ["src/token.py"],
          negative_distractors: ["src/session.py", "src/config.py", "docs/auth.md"],
        },
      },
    ])
    const proseCase = {
      ...converted,
      query: "Fix refresh token fallback. Add or update the failing auth test.",
    }
    const official = SessionContextLedger.select({
      events: proseCase.events,
      policy: "official-frontier",
      budget: 60,
      query: proseCase.query,
    })
    const intent = SessionContextLedger.select({
      events: proseCase.events,
      policy: "intent-frontier",
      budget: 60,
      query: proseCase.query,
    })

    expect(intent.events.map((event) => event.id)).toEqual(official.events.map((event) => event.id))
  })

  test("trajectory AUC captures selected context order changes", () => {
    const [converted] = SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples([
      {
        id: "arb-trajectory-order",
        task_type: "code2test",
        repo: "example/repo",
        base_commit: "base",
        query: { changed_file: "src/auth.py", pr_title: "Refresh token fallback" },
        gold: {
          root_cause_files: ["src/auth.py"],
          related_tests: ["tests/test_auth.py"],
          supporting_files: ["src/token.py"],
        },
      },
    ])
    const official = SessionContextLedgerBenchmark.evaluateCase({
      item: converted,
      policy: "official-frontier",
      budget: 5_000,
    })
    const actionAware = SessionContextLedgerBenchmark.evaluateCase({
      item: converted,
      policy: "action-aware-frontier",
      budget: 5_000,
    })

    expect(actionAware.fileF1).toBe(official.fileF1)
    expect(actionAware.lineF1).toBe(official.lineF1)
    expect(actionAware.aucFileCoverage).toBeGreaterThan(official.aucFileCoverage)
    expect(actionAware.aucLineCoverage).toBeGreaterThan(official.aucLineCoverage)
  })

  test("target reports can optimize trajectory AUC separately from final F1", () => {
    const [converted] = SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples([
      {
        id: "arb-auc-target",
        task_type: "code2test",
        repo: "example/repo",
        base_commit: "base",
        query: { changed_file: "src/auth.py", pr_title: "Refresh token fallback" },
        gold: {
          root_cause_files: ["src/auth.py"],
          related_tests: ["tests/test_auth.py"],
          supporting_files: ["src/token.py"],
        },
      },
    ])
    const policies = ["official-frontier", "action-aware-frontier"] satisfies readonly SessionContextLedger.SelectionPolicy[]
    const results = policies.map((policy) =>
      SessionContextLedgerBenchmark.evaluateCase({
        item: converted,
        policy,
        budget: 5_000,
      }),
    )
    const report = SessionContextLedgerBenchmark.analyzePolicyTargets(results, {
      targets: ["event-f1", "auc-line"],
    })
    const [budget] = report.budgets
    const eventTarget = budget?.targets.find((item) => item.target === "event-f1")
    const aucTarget = budget?.targets.find((item) => item.target === "auc-line")

    expect(eventTarget?.bestPolicy).toBe("official-frontier")
    expect(aucTarget?.bestPolicy).toBe("action-aware-frontier")
    expect(budget?.policies.find((item) => item.policy === "action-aware-frontier")?.meanOfficialUtility).toBe(
      budget?.policies.find((item) => item.policy === "official-frontier")?.meanOfficialUtility,
    )
  })

  test("selects Agent Retrieval Bench corpus chunk paths for requested samples", () => {
    const samples = SessionContextLedgerBenchmark.parseAgentRetrievalBenchSamplesJsonl(
      [
        {
          id: "arb-one",
          task_type: "trace2code",
          repo: "example/repo",
          base_commit: "base-a",
          query: { raw_signal: "auth failure" },
          gold: { root_cause_files: ["src/auth.py"] },
        },
        {
          id: "arb-two",
          task_type: "trace2code",
          repo: "example/repo",
          base_commit: "base-b",
          query: { raw_signal: "token failure" },
          gold: { root_cause_files: ["src/token.py"] },
        },
      ]
        .map((item) => JSON.stringify(item))
        .join("\n") + "\n",
    )
    const manifest = SessionContextLedgerBenchmark.parseAgentRetrievalBenchCorpusManifestJsonl(
      [
        {
          repo: "example/repo",
          base_commit: "base-a",
          status: "ok",
          chunks_path: "corpus/example__repo/base-a.chunks.jsonl",
        },
        {
          repo: "example/repo",
          base_commit: "base-b",
          status: "missing_commit",
          chunks_path: "corpus/example__repo/base-b.chunks.jsonl",
        },
        {
          repo: "other/repo",
          base_commit: "base-c",
          status: "ok",
          chunks_path: "corpus/other__repo/base-c.chunks.jsonl",
        },
      ]
        .map((item) => JSON.stringify(item))
        .join("\n") + "\n",
    )

    expect(SessionContextLedgerBenchmark.agentRetrievalBenchChunkPathsForSamples(samples, manifest)).toEqual([
      "corpus/example__repo/base-a.chunks.jsonl",
    ])
  })

  test("converts SWE-Explore rows into line-budget context cases", () => {
    const [row] = SessionContextLedgerBenchmark.parseSWEExploreJsonl(
      `${JSON.stringify({
        instance_id: "example__repo-42",
        repo_dir: "repos/example__repo-42",
        dataset: "verified",
        ground_truth: {
          read_core_files: ["src/a.ts", "src/b.ts"],
          read_core_regions: [
            { path: "src/a.ts", start: 10, end: 15 },
            { path: "src/b.ts", start: 1, end: 2 },
          ],
          read_optional_files_map: {
            model_a: ["tests/a.test.ts"],
            model_b: ["docs/a.md"],
          },
          read_optional_regions_map: {
            model_a: [{ path: "tests/a.test.ts", start: 1, end: 20 }],
            model_b: [{ path: "docs/a.md", start: 1, end: 5 }],
          },
          modified_core_files: ["src/a.ts"],
          main_files: ["src/a.ts"],
        },
        read_step_info: {
          "src/a.ts": [{ traj_path: "traj.json", step_idx: 4, start: 10, end: 15 }],
          "src/b.ts": [{ traj_path: "traj.json", step_idx: 2, start: 1, end: 2 }],
          "tests/a.test.ts": [{ traj_path: "traj.json", step_idx: 1, start: 1, end: 20 }],
        },
        meta: { num_trajectories: 1 },
      })}\n`,
    )
    const [converted] = SessionContextLedgerBenchmark.fromSWEExploreRows([row], { optionalModels: ["model_a"] })
    const result = SessionContextLedgerBenchmark.evaluateCase({
      item: converted,
      policy: "balanced-frontier",
      budget: 100,
    })
    const frontierPairs = [400, 800].map((budget) => ({
      exploration: SessionContextLedger.select({
        events: converted.events,
        policy: "exploration-frontier",
        budget,
      }),
      coherence: SessionContextLedger.select({
        events: converted.events,
        policy: "coherence-frontier",
        budget,
      }),
    }))

    expect(converted.benchmark).toBe("swe-explore")
    expect(converted.gold_ids).toEqual([
      "example__repo-42:swe-explore:core:0",
      "example__repo-42:swe-explore:core:1",
    ])
    expect(converted.gold_files).toEqual(["src/a.ts", "src/b.ts"])
    expect(converted.events.map((event) => event.files[0])).toEqual(["tests/a.test.ts", "src/b.ts", "src/a.ts"])
    expect(converted.events.find((event) => event.files[0] === "src/a.ts")?.tokens).toBe(6)
    expect(converted.events.some((event) => event.files[0] === "docs/a.md")).toBe(false)
    expect(converted.events.filter((event) => converted.gold_ids.includes(event.id)).flatMap((event) => event.spans ?? [])).toEqual([
      { file: "src/b.ts", start: 1, end: 2 },
      { file: "src/a.ts", start: 10, end: 15 },
    ])
    for (const { exploration, coherence } of frontierPairs) {
      expect(exploration.events.map((event) => event.id)).toEqual(coherence.events.map((event) => event.id))
    }
    expect(result.lineF1).toBeGreaterThan(0)
  })

  test("converts SWE-Explore rows from repository chunks without using trajectory regions as candidates", () => {
    const [row] = SessionContextLedgerBenchmark.parseSWEExploreJsonl(
      `${JSON.stringify({
        instance_id: "example__repo-99",
        repo_dir: "repos/example__repo-99",
        dataset: "verified",
        ground_truth: {
          read_core_files: ["src/main.ts"],
          read_core_regions: [{ path: "src/main.ts", start: 5, end: 8 }],
          read_optional_files_map: { model_a: ["tests/main.test.ts"] },
          read_optional_regions_map: { model_a: [{ path: "tests/main.test.ts", start: 1, end: 20 }] },
          modified_core_files: ["src/main.ts"],
          main_files: ["src/main.ts"],
        },
        read_step_info: {},
      })}\n`,
    )
    const [converted] = SessionContextLedgerBenchmark.fromSWEExploreRows([row], {
      issueMap: { "example__repo-99": "Fix parseWidget in src/main.ts" },
      repoCandidates: {
        "example__repo-99": [
          { path: "src/main.ts", start: 1, end: 10, text: "export function parseWidget() {}" },
          { path: "tests/main.test.ts", start: 1, end: 20, text: "optional successful trajectory evidence" },
          { path: "src/other.ts", start: 1, end: 10, text: "unrelated" },
        ],
      },
    })

    expect(converted.query).toBe("Fix parseWidget in src/main.ts")
    expect(converted.gold_ids).toEqual(["example__repo-99:swe-explore:repo:0"])
    expect(converted.events.map((event) => event.id)).toEqual([
      "example__repo-99:swe-explore:repo:0",
      "example__repo-99:swe-explore:repo:1",
      "example__repo-99:swe-explore:repo:2",
    ])
    expect(converted.events.some((event) => event.id.includes(":core:"))).toBe(false)
    expect(converted.events.some((event) => event.id.includes(":optional:"))).toBe(false)
  })

  test("analyzes SWE-Explore candidate pool and budget oracle headroom", () => {
    const rows = SessionContextLedgerBenchmark.parseSWEExploreJsonl(
      [
        JSON.stringify({
          instance_id: "example__covered",
          repo_dir: "repos/example__covered",
          dataset: "verified",
          ground_truth: {
            read_core_files: ["src/main.ts"],
            read_core_regions: [{ path: "src/main.ts", start: 5, end: 8 }],
            read_optional_files_map: {},
            read_optional_regions_map: {},
            modified_core_files: ["src/main.ts"],
            main_files: ["src/main.ts"],
          },
          read_step_info: {},
        }),
        JSON.stringify({
          instance_id: "example__missing",
          repo_dir: "repos/example__missing",
          dataset: "verified",
          ground_truth: {
            read_core_files: ["src/missing.ts"],
            read_core_regions: [{ path: "src/missing.ts", start: 2, end: 3 }],
            read_optional_files_map: {},
            read_optional_regions_map: {},
            modified_core_files: ["src/missing.ts"],
            main_files: ["src/missing.ts"],
          },
          read_step_info: {},
        }),
      ].join("\n") + "\n",
    )
    const cases = SessionContextLedgerBenchmark.fromSWEExploreRows(rows, {
      repoCandidates: {
        example__covered: [
          { path: "src/main.ts", start: 5, end: 8, text: "export function parseWidget() {}" },
          { path: "src/noise.ts", start: 1, end: 20, text: "noise" },
        ],
        example__missing: [
          { path: "src/noise.ts", start: 1, end: 5, text: "noise" },
        ],
      },
    })

    const report = SessionContextLedgerBenchmark.analyzeSWEExploreOracles({
      rows,
      cases,
      budgets: [4],
      policies: ["candidate-rank-frontier"],
    })

    expect(report.candidatePool.summary.meanFileRecall).toBe(0.5)
    expect(report.candidatePool.summary.failureClasses).toContainEqual({ failureClass: "pool-covered", cases: 1 })
    expect(report.candidatePool.summary.failureClasses).toContainEqual({ failureClass: "gold-file-absent", cases: 1 })
    const covered = report.budgetOracles.rows.find((row) => row.instanceID === "example__covered")
    const missing = report.budgetOracles.rows.find((row) => row.instanceID === "example__missing")
    expect(covered?.budgetOracleMetrics.f1_score).toBe(1)
    expect(covered?.bestPolicyRegretVsBudgetOracle).toBe(0)
    expect(missing?.poolMetrics.recall).toBe(0)
    expect(report.budgetOracles.summaries[0]?.budgetOracleF1).toBe(0.5)
  })

  test("CLI can emit Agent Retrieval Bench ranking and target reports in one run", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-cli-"))
    const samplesPath = join(dir, "samples.jsonl")
    const rankingPath = join(dir, "ranking.json")
    const targetsPath = join(dir, "targets.json")
    await Bun.write(
      samplesPath,
      `${JSON.stringify({
        id: "cli-combined-report",
        task_type: "code2test",
        repo: "example/repo",
        base_commit: "base",
        query: { changed_file: "src/auth.py", pr_title: "Refresh token fallback" },
        gold: {
          root_cause_files: ["src/auth.py"],
          related_tests: ["tests/test_auth.py"],
          supporting_files: ["src/token.py"],
        },
      })}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--agent-retrieval-bench-samples",
        samplesPath,
        "--budget",
        "400",
        "--policies",
        "official-frontier,intent-frontier",
        "--agent-retrieval-bench-ranking-output",
        rankingPath,
        "--target-report-output",
        targetsPath,
        "--target-report-targets",
        "event-f1,auc-line",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    expect(existsSync(rankingPath)).toBe(true)
    expect(existsSync(targetsPath)).toBe(true)
    const ranking = JSON.parse(readFileSync(rankingPath, "utf8"))
    const targets = JSON.parse(readFileSync(targetsPath, "utf8"))
    expect(ranking.policies).toEqual(["official-frontier", "intent-frontier"])
    expect(targets.budgets[0]?.policies.map((policy: { policy: string }) => policy.policy)).toEqual([
      "official-frontier",
      "intent-frontier",
    ])
    expect(targets.budgets[0]?.targets.length).toBe(2)
  })

  test("CLI can add experience replay records to emitted cases", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-experience-cli-"))
    const casesPath = join(dir, "cases.jsonl")
    const experiencesPath = join(dir, "experiences.jsonl")
    const enrichedPath = join(dir, "enriched.jsonl")
    const reportPath = join(dir, "experience-report.json")
    await Bun.write(
      casesPath,
      `${JSON.stringify({
        instance_id: "cli-experience-current",
        query: "Fix parser fallback in src/parser.ts",
        benchmark: "swe-contextbench",
        task_type: "bugfix",
        repo: "acme/parser",
        gold_ids: ["target"],
        gold_files: ["src/parser.ts"],
        events: [
          event({
            id: "target",
            kind: "code-context",
            order: 100,
            tokens: 40,
            files: ["src/parser.ts"],
            spans: [{ file: "src/parser.ts", start: 10, end: 20 }],
          }),
        ],
      })}\n`,
    )
    await Bun.write(
      experiencesPath,
      `${JSON.stringify({
        id: "cli-old-parser-fallback",
        query: "Fix parser fallback in src/parser.ts",
        benchmark: "swe-contextbench",
        task_type: "bugfix",
        repo: "acme/parser",
        files: ["src/parser.ts"],
        spans: [{ file: "src/parser.ts", start: 8, end: 18 }],
        summary: "Prior fix checked the fallback branch before returning parsed defaults.",
      })}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--input",
        casesPath,
        "--experience-replay-input",
        experiencesPath,
        "--experience-replay-k",
        "1",
        "--budget",
        "300",
        "--policies",
        "relevance-frontier",
        "--write-cases",
        enrichedPath,
        "--experience-replay-report-output",
        reportPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const [enriched] = SessionContextLedgerBenchmark.parseJsonl(readFileSync(enrichedPath, "utf8"))
    expect(enriched?.events[0]?.kind).toBe("experience")
    expect(enriched?.events[0]?.id).toContain("cli-old-parser-fallback")
    expect(enriched?.events[0]?.spans).toEqual([{ file: "src/parser.ts", start: 8, end: 18 }])
    const report = JSON.parse(readFileSync(reportPath, "utf8"))
    expect(report.summaries[0]?.casesWithSelectedExperience).toBeGreaterThan(0)
    expect(report.summaries[0]?.selectedExperienceEvents).toBeGreaterThan(0)
    expect(typeof report.rows[0]?.deltas.fileF1).toBe("number")
  })

  test("CLI can derive replay records from SWE-ContextBench rows", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-swe-contextbench-cli-"))
    const casesPath = join(dir, "cases.jsonl")
    const taskRowsPath = join(dir, "swe-contextbench-experience.jsonl")
    const relationshipsPath = join(dir, "swe-contextbench-relationships.jsonl")
    const generatedExperiencePath = join(dir, "generated-experience.jsonl")
    const enrichedPath = join(dir, "enriched.jsonl")
    const reportPath = join(dir, "experience-report.json")
    await Bun.write(
      casesPath,
      `${JSON.stringify({
        instance_id: "related-parser",
        query: "Parser fallback drops empty input in src/parser.ts",
        benchmark: "swe-contextbench",
        task_type: "related",
        repo: "acme/parser",
        gold_ids: ["target"],
        gold_files: ["src/parser.ts"],
        events: [
          event({
            id: "target",
            kind: "code-context",
            order: 100,
            tokens: 80,
            files: ["src/parser.ts"],
            spans: [{ file: "src/parser.ts", start: 10, end: 20 }],
          }),
        ],
      })}\n`,
    )
    await Bun.write(
      taskRowsPath,
      `${JSON.stringify({
        repo: "acme/parser",
        instance_id: "exp-parser",
        base_commit: "abc123",
        patch: "diff --git a/src/parser.ts b/src/parser.ts\n--- a/src/parser.ts\n+++ b/src/parser.ts\n@@ -1,1 +1,1 @@\n-old\n+new\n",
        test_patch: "diff --git a/tests/parser.test.ts b/tests/parser.test.ts\n--- a/tests/parser.test.ts\n+++ b/tests/parser.test.ts\n@@ -1,1 +1,1 @@\n-old\n+new\n",
        problem_statement: "Parser fallback drops empty input.",
        FAIL_TO_PASS: "[\"tests/parser.test.ts::fallback\"]",
        PASS_TO_PASS: "[]",
      })}\n`,
    )
    await Bun.write(
      relationshipsPath,
      `${JSON.stringify({
        related_instance_id: "related-parser",
        experience_instance_id: "exp-parser",
      })}\n`,
    )

    const emitProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-contextbench-experience-input",
        taskRowsPath,
        "--swe-contextbench-relationship-input",
        relationshipsPath,
        "--swe-contextbench-related-instance-ids",
        "related-parser",
        "--swe-contextbench-experience-output",
        generatedExperiencePath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const emitExit = await emitProc.exited
    const emitStderr = await new Response(emitProc.stderr).text()
    expect(emitExit, emitStderr).toBe(0)
    const [generated] = SessionContextLedgerBenchmark.parseExperienceJsonl(readFileSync(generatedExperiencePath, "utf8"))
    expect(generated?.id).toBe("exp-parser")
    expect(generated?.files).toEqual(["src/parser.ts", "tests/parser.test.ts"])

    const replayProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--input",
        casesPath,
        "--swe-contextbench-experience-input",
        taskRowsPath,
        "--swe-contextbench-relationship-input",
        relationshipsPath,
        "--swe-contextbench-related-instance-ids",
        "related-parser",
        "--experience-replay-k",
        "1",
        "--budget",
        "220",
        "--policies",
        "experience-frontier",
        "--write-cases",
        enrichedPath,
        "--experience-replay-report-output",
        reportPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const replayExit = await replayProc.exited
    const replayStderr = await new Response(replayProc.stderr).text()

    expect(replayExit, replayStderr).toBe(0)
    const [enriched] = SessionContextLedgerBenchmark.parseJsonl(readFileSync(enrichedPath, "utf8"))
    expect(enriched?.events[0]?.kind).toBe("experience")
    expect(enriched?.events[0]?.id).toContain("exp-parser")
    expect(enriched?.events[0]?.files).toEqual(["src/parser.ts", "tests/parser.test.ts"])
    const report = JSON.parse(readFileSync(reportPath, "utf8"))
    expect(report.experiences).toBe(1)
    expect(report.summaries[0]?.casesWithSelectedExperience).toBe(1)
  })

  test("CLI can emit compaction survival reports", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-compaction-survival-cli-"))
    const inputPath = join(dir, "compaction.jsonl")
    const reportPath = join(dir, "compaction-report.json")
    await Bun.write(
      inputPath,
      `${JSON.stringify({
        instance_id: "cli-compaction-survival",
        context: [
          "[System update]: Keep the public API stable in src/api.ts.",
          "[User]: Fix fallback behavior without changing loadConfig().",
          `[Tool result]: ${"cache warmup noise ".repeat(80)}`,
          "[Shell]: bun test tests/api.test.ts\nFAILED tests/api.test.ts expected src/api.ts stable response",
          "[Assistant]: Next inspect README.md for unrelated docs cleanup.",
        ],
        gold: [
          { id: "constraint", category: "constraint", text: "public API stable", file: "src/api.ts" },
          { id: "test", category: "latest-test", text: "FAILED tests/api.test.ts", file: "tests/api.test.ts" },
        ],
      })}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--compaction-survival-input",
        inputPath,
        "--compaction-survival-output",
        reportPath,
        "--compaction-survival-policy",
        "official-frontier",
        "--budget",
        "35",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const report = JSON.parse(readFileSync(reportPath, "utf8"))
    expect(report.policy).toBe("official-frontier")
    expect(report.variants).toEqual(["raw-tail", "context-ledger", "context-ledger-plus-tail"])
    expect(report.summaries.find((summary: { variant: string }) => summary.variant === "context-ledger")?.recall).toBeGreaterThan(0)
  })

  test("CLI can emit the benchmark registry", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-benchmark-registry-cli-"))
    const reportPath = join(dir, "benchmark-registry.json")
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--benchmark-registry-output",
        reportPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const report = JSON.parse(readFileSync(reportPath, "utf8"))
    expect(report.generatedBy).toBe("context-ledger-benchmark")
    expect(report.summary.integrated).toBeGreaterThanOrEqual(5)
    expect(report.entries.map((entry: { id: string }) => entry.id)).toContain("swe-explore")
    expect(
      report.entries
        .find((entry: { id: string }) => entry.id === "opencode-live-manifest")
        ?.evidenceCannotSupport.some((item: string) => item.includes("Solve-rate claims")),
    ).toBe(true)
  })

  test("CLI can merge saved SWE-Explore ranker sweep reports", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-ranker-merge-cli-"))
    const leftPath = join(dir, "left.json")
    const rightPath = join(dir, "right.json")
    const mergedPath = join(dir, "merged.json")
    const features = {
      eventCount: 1,
      fileCount: 1,
      totalLineCost: 2,
      averageChunkLines: 2,
      averageEventsPerFile: 1,
      maxFileClusterShare: 1,
      smallChunkShare: 1,
      mediumChunkShare: 0,
      largeChunkShare: 0,
      implementationPathShare: 1,
      testPathShare: 0,
      noisyPathShare: 0,
      queryTermCount: 1,
      queryCandidateTermOverlap: 1,
    }
    const structuralResult = {
      ranker: "structural",
      chunkSizes: [{ chunkLines: 2, chunkOverlap: 0 }],
      maxFiles: 10,
      maxChunks: 2,
      cases: 1,
      summaries: [
        {
          policy: "budget-rank-frontier",
          budget: 4,
          metrics: { f1_score: 0.4, recall: 0.5, precision: 0.333, first_useful_hit: 0.8 },
        },
      ],
    }
    const candidateResult = (ranker: string, f1: number) => ({
      ...structuralResult,
      ranker,
      summaries: [
        {
          policy: "budget-rank-frontier",
          budget: 4,
          metrics: { f1_score: f1, recall: f1 + 0.1, precision: f1 - 0.1, first_useful_hit: 0.7 },
        },
      ],
    })
    const comparison = (ranker: string, f1Delta: number) => ({
      baselineRanker: "structural",
      ranker,
      policy: "budget-rank-frontier",
      budget: 4,
      instanceID: "owner__repo-1",
      outcome: "win",
      deltas: { f1: f1Delta, recall: f1Delta, precision: f1Delta, firstUsefulHit: 0 },
      baselineMetrics: { f1: 0.4, recall: 0.5, precision: 0.333, firstUsefulHit: 0.8 },
      metrics: { f1: 0.4 + f1Delta, recall: 0.5 + f1Delta, precision: 0.333 + f1Delta, firstUsefulHit: 0.8 },
      baselineRegions: [],
      regions: [],
      baselineFeatures: features,
      features,
      comparisonFeatures: {
        fileJaccard: 1,
        baselineRetainedFileShare: 1,
        candidateNewFileShare: 0,
        eventJaccard: 1,
        baselineRetainedEventShare: 1,
        candidateNewEventShare: 0,
      },
    })
    const gate = (ranker: string, f1Delta: number) => ({
      baselineRanker: "structural",
      ranker,
      policy: "budget-rank-frontier",
      budget: 4,
      cases: 1,
      minimumGain: 0,
      rule: { type: "constant", ranker, trainF1: 0.4 + f1Delta },
      baseline: { f1: 0.4, recall: 0.5, precision: 0.333, firstUsefulHit: 0.8 },
      candidate: { f1: 0.4 + f1Delta, recall: 0.5 + f1Delta, precision: 0.333 + f1Delta, firstUsefulHit: 0.8 },
      oracle: { f1: 0.4 + f1Delta, recall: 0.5 + f1Delta, precision: 0.333 + f1Delta, firstUsefulHit: 0.8 },
      routed: { f1: 0.4 + f1Delta, recall: 0.5 + f1Delta, precision: 0.333 + f1Delta, firstUsefulHit: 0.8 },
      leaveOneOut: { f1: 0.4 + f1Delta, recall: 0.5 + f1Delta, precision: 0.333 + f1Delta, firstUsefulHit: 0.8 },
      routedChoices: { baseline: 0, candidate: 1 },
    })
    const report = (ranker: string, f1: number, f1Delta: number) => ({
      instances: ["owner__repo-1"],
      budgets: [4],
      policies: ["budget-rank-frontier"],
      results: [structuralResult, candidateResult(ranker, f1)],
      bestByBudget: [],
      comparisons: [],
      caseComparisons: [comparison(ranker, f1Delta)],
      gates: [gate(ranker, f1Delta)],
    })
    await Bun.write(leftPath, JSON.stringify(report("bm25", 0.45, 0.05)))
    await Bun.write(rightPath, JSON.stringify(report("hybrid-rrf", 0.5, 0.1)))
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore-ranker-sweep-merge-output",
        mergedPath,
        "--swe-explore-ranker-sweep-merge-inputs",
        `${leftPath},${rightPath}`,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const merged = JSON.parse(readFileSync(mergedPath, "utf8"))
    expect(merged.results.map((item: { ranker: string }) => item.ranker)).toEqual(["bm25", "structural", "hybrid-rrf"])
    expect(merged.bestByBudget[0]?.best.ranker).toBe("hybrid-rrf")
    expect(merged.comparisons.map((item: { ranker: string }) => item.ranker)).toEqual(["bm25", "hybrid-rrf"])
    expect(merged.caseComparisons.map((item: { ranker: string }) => item.ranker).toSorted()).toEqual(["bm25", "hybrid-rrf"])
    expect(merged.gates.map((item: { ranker: string }) => item.ranker).toSorted()).toEqual(["bm25", "hybrid-rrf"])
  })

  test("CLI can evaluate SWE-Explore ranker gates by repository folds", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-ranker-gate-repo-fold-cli-"))
    const sweepPath = join(dir, "ranker-sweep.json")
    const reportPath = join(dir, "ranker-gate-repo-fold.json")
    const features = (averageChunkLines: number) => ({
      eventCount: 4,
      fileCount: 2,
      totalLineCost: 120,
      averageChunkLines,
      averageEventsPerFile: 2,
      maxFileClusterShare: 0.5,
      smallChunkShare: averageChunkLines < 20 ? 1 : 0,
      mediumChunkShare: averageChunkLines >= 20 && averageChunkLines < 80 ? 1 : 0,
      largeChunkShare: averageChunkLines >= 80 ? 1 : 0,
      implementationPathShare: 1,
      testPathShare: 0,
      noisyPathShare: 0,
      queryTermCount: 4,
      queryCandidateTermOverlap: averageChunkLines > 20 ? 0.75 : 0.25,
    })
    const comparison = (instanceID: string, candidateF1: number, averageChunkLines: number) => ({
      baselineRanker: "structural",
      ranker: "hybrid-rrf",
      instanceID,
      policy: "budget-rank-frontier",
      budget: 400,
      baselineMetrics: { f1: 0.1, recall: 0.1, precision: 0.1, firstUsefulHit: 0.1 },
      metrics: { f1: candidateF1, recall: candidateF1, precision: candidateF1, firstUsefulHit: candidateF1 },
      baselineFeatures: features(20),
      features: features(averageChunkLines),
    })
    await Bun.write(
      sweepPath,
      `${JSON.stringify({
        caseComparisons: [
          comparison("acme__alpha-1", 0.3, 60),
          comparison("acme__beta-2", 0.05, 10),
          comparison("acme__charlie-3", 0.05, 10),
          comparison("acme__delta-4", 0.3, 60),
        ],
      })}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore-ranker-gate-repo-fold-output",
        reportPath,
        "--swe-explore-ranker-gate-repo-fold-input",
        sweepPath,
        "--swe-explore-ranker-gate-repo-folds",
        "2",
        "--swe-explore-ranker-gate-epsilon",
        "0.005",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const report = JSON.parse(readFileSync(reportPath, "utf8"))
    expect(report.foldCount).toBe(2)
    expect(report.repoCount).toBe(4)
    expect(report.summary.gates).toBe(2)
    expect(report.summary.stableGates).toBe(2)
    expect(report.summary.meanRoutedDeltaVsBaseline).toBeGreaterThan(0)
    expect(report.summary.worstDecileRoutedRegretVsOracle).toBe(0)
    expect(report.folds.every((fold: { repos: string[] }) => fold.repos.length === 2)).toBe(true)
    expect(report.gates.every((gate: { stable: boolean }) => gate.stable)).toBe(true)
    expect(report.gates[0]?.rule.type).toBe("threshold")
  })

  test("CLI can emit repository-disjoint SWE-Explore split manifests", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-swe-explore-split-cli-"))
    const sweExplorePath = join(dir, "swe-explore.jsonl")
    const sourceMapPath = join(dir, "source-map.jsonl")
    const splitPath = join(dir, "splits.json")
    const fallbackSplitPath = join(dir, "splits-from-rows.json")
    const verifiedSplitPath = join(dir, "verified-splits.json")
    const row = (instanceID: string, dataset = "verified") => ({
      instance_id: instanceID,
      repo_path: "/testbed",
      repo_dir: `repos/${instanceID}`,
      dataset,
      ground_truth: {
        read_core_files: ["src/main.py"],
        read_core_regions: [{ path: "src/main.py", start: 1, end: 3 }],
        read_optional_files_map: {},
        read_optional_regions_map: {},
        modified_core_files: ["src/main.py"],
        main_files: ["src/main.py"],
      },
      read_step_info: {},
    })
    const rows = [
      row("owner__alpha-1"),
      row("owner__alpha-2"),
      row("owner__beta-3"),
      row("owner__gamma-4"),
      row("owner__delta-5", "pro"),
    ]
    await Bun.write(sweExplorePath, `${rows.map((item) => JSON.stringify(item)).join("\n")}\n`)
    await Bun.write(
      sourceMapPath,
      `${[
        { instance_id: "owner__alpha-1", repo: "owner/alpha", problem_statement: "alpha first" },
        { instance_id: "owner__alpha-2", repo: "owner/alpha", problem_statement: "alpha second" },
        { instance_id: "owner__beta-3", repo: "owner/beta", problem_statement: "beta" },
        { instance_id: "owner__gamma-4", repo: "owner/gamma", problem_statement: "gamma" },
      ].map((item) => JSON.stringify(item)).join("\n")}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-source-map",
        sourceMapPath,
        "--swe-explore-split-output",
        splitPath,
        "--swe-explore-split-labels",
        "broad50-dev,broad50-heldout",
        "--swe-explore-split-sizes",
        "2,2",
        "--swe-explore-split-seed",
        "fixture",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const manifest = JSON.parse(readFileSync(splitPath, "utf8"))
    expect(manifest.repoCount).toBe(4)
    expect(manifest.sourceMapCoverage).toBe(4)
    expect(manifest.splits.map((split: { label: string }) => split.label)).toEqual([
      "broad50-dev",
      "broad50-heldout",
    ])
    const [dev, heldout] = manifest.splits
    const devRepos = new Set(dev.repos)
    expect(heldout.repos.every((repo: string) => !devRepos.has(repo))).toBe(true)
    expect([...dev.instanceIDs, ...heldout.instanceIDs]).toHaveLength(4)
    expect(typeof dev.instanceIDsCsv).toBe("string")
    expect(manifest.unassigned.instances).toBe(1)

    const fallbackProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-split-output",
        fallbackSplitPath,
        "--swe-explore-split-labels",
        "dev,heldout",
        "--swe-explore-split-sizes",
        "2,2",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const fallbackExit = await fallbackProc.exited
    const fallbackStderr = await new Response(fallbackProc.stderr).text()

    expect(fallbackExit, fallbackStderr).toBe(0)
    const fallbackManifest = JSON.parse(readFileSync(fallbackSplitPath, "utf8"))
    expect(fallbackManifest.sourceMapCoverage).toBe(0)
    expect(fallbackManifest.repoCount).toBe(4)

    const verifiedProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-datasets",
        "verified",
        "--swe-explore-split-output",
        verifiedSplitPath,
        "--swe-explore-split-labels",
        "verified-dev,verified-heldout",
        "--swe-explore-split-sizes",
        "2,2",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const verifiedExit = await verifiedProc.exited
    const verifiedStderr = await new Response(verifiedProc.stderr).text()

    expect(verifiedExit, verifiedStderr).toBe(0)
    const verifiedManifest = JSON.parse(readFileSync(verifiedSplitPath, "utf8"))
    expect(verifiedManifest.instances).toBe(4)
    expect(verifiedManifest.splits.flatMap((split: { instanceIDs: string[] }) => split.instanceIDs)).not.toContain(
      "owner__delta-5",
    )
  })

  test("CLI can convert an OpenCode export into prediction JSONL", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-opencode-export-cli-"))
    const exportPath = join(dir, "session-export.json")
    const predictionPath = join(dir, "predictions.jsonl")
    const goldPath = join(dir, "gold.jsonl")
    const evaluationPath = join(dir, "prediction-eval.json")
    await Bun.write(
      exportPath,
      `${JSON.stringify({
        info: { id: "ses_cli_export" },
        messages: [
          {
            info: { id: "msg_assistant", role: "assistant" },
            parts: [
              {
                type: "tool",
                tool: "read",
                state: {
                  status: "completed",
                  input: { filePath: "src/exported.ts" },
                  output: "",
                  metadata: {
                    display: { type: "file", path: "src/exported.ts", lineStart: 7, lineEnd: 9 },
                  },
                },
              },
            ],
          },
        ],
      })}\n`,
    )
    await Bun.write(
      goldPath,
      `${JSON.stringify({
        inst_id: "owner__repo-export",
        original_inst_id: "owner__repo-export",
        repo: "owner/repo",
        repo_url: "https://github.com/owner/repo.git",
        commit: "abc123",
        gold_ctx: [{ file: "src/exported.ts", start_line: 7, end_line: 9, content: "" }],
        patch: "",
        test_patch: "",
        source: "fixture",
        language: "typescript",
      })}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--opencode-export",
        exportPath,
        "--instance-id",
        "owner__repo-export",
        "--prediction-output",
        predictionPath,
        "--prediction-eval-gold",
        goldPath,
        "--prediction-eval-output",
        evaluationPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const prediction = JSON.parse(readFileSync(predictionPath, "utf8"))
    expect(prediction.instance_id).toBe("owner__repo-export")
    expect(prediction.traj_data.pred_files).toEqual(["src/exported.ts"])
    expect(prediction.traj_data.pred_spans).toEqual({
      "src/exported.ts": [{ type: "line", start: 7, end: 9 }],
    })
    const evaluation = JSON.parse(readFileSync(evaluationPath, "utf8"))
    expect(evaluation.summary.cases).toBe(1)
    expect(evaluation.summary.lineF1).toBe(1)
  })

  test("CLI can convert an OpenCode export manifest into scored prediction JSONL", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-opencode-export-manifest-cli-"))
    const firstExportPath = join(dir, "first-export.json")
    const secondExportPath = join(dir, "second-export.json")
    const manifestPath = join(dir, "exports.jsonl")
    const goldPath = join(dir, "gold.jsonl")
    const predictionPath = join(dir, "predictions.jsonl")
    const evaluationPath = join(dir, "prediction-eval.json")
    const exportFor = (file: string, start: number, end: number) => ({
      info: { id: `ses_${file}` },
      messages: [
        {
          info: { id: `msg_${file}`, role: "assistant" },
          parts: [
            {
              type: "tool",
              tool: "read",
              state: {
                status: "completed",
                input: { filePath: file },
                output: "",
                metadata: {
                  display: { type: "file", path: file, lineStart: start, lineEnd: end },
                },
              },
            },
          ],
        },
      ],
    })
    await Bun.write(firstExportPath, `${JSON.stringify(exportFor("src/first.ts", 2, 4))}\n`)
    await Bun.write(secondExportPath, `${JSON.stringify(exportFor("src/second.ts", 8, 8))}\n`)
    await Bun.write(
      manifestPath,
      [
        JSON.stringify({ instance_id: "owner__repo-first", export_path: "first-export.json", session_id: "ses_first" }),
        JSON.stringify({ instance_id: "owner__repo-second", export_path: "second-export.json", session_id: "ses_second" }),
      ].join("\n") + "\n",
    )
    await Bun.write(
      goldPath,
      [
        JSON.stringify({
          inst_id: "owner__repo-first",
          original_inst_id: "owner__repo-first",
          repo: "owner/repo",
          repo_url: "https://github.com/owner/repo.git",
          commit: "abc123",
          gold_ctx: [{ file: "src/first.ts", start_line: 2, end_line: 4, content: "" }],
          patch: "",
          test_patch: "",
          source: "fixture",
          language: "typescript",
        }),
        JSON.stringify({
          inst_id: "owner__repo-second",
          original_inst_id: "owner__repo-second",
          repo: "owner/repo",
          repo_url: "https://github.com/owner/repo.git",
          commit: "def456",
          gold_ctx: [{ file: "src/second.ts", start_line: 8, end_line: 8, content: "" }],
          patch: "",
          test_patch: "",
          source: "fixture",
          language: "typescript",
        }),
      ].join("\n") + "\n",
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--opencode-export-manifest",
        manifestPath,
        "--prediction-output",
        predictionPath,
        "--prediction-eval-gold",
        goldPath,
        "--prediction-eval-output",
        evaluationPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const predictions = SessionContextLedgerBenchmark.parsePredictionJsonl(readFileSync(predictionPath, "utf8"))
    expect(predictions.map((prediction) => prediction.instance_id)).toEqual(["owner__repo-first", "owner__repo-second"])
    const evaluation = JSON.parse(readFileSync(evaluationPath, "utf8"))
    expect(evaluation.summary.cases).toBe(2)
    expect(evaluation.summary.fileF1).toBe(1)
    expect(evaluation.summary.lineF1).toBe(1)
  })

  test("CLI can run an OpenCode manifest and export scored predictions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-opencode-run-manifest-cli-"))
    const repoDir = join(dir, "repo")
    const fakeCliPath = join(dir, "fake-opencode.ts")
    const manifestPath = join(dir, "run-manifest.jsonl")
    const outputDir = join(dir, "runs")
    const exportManifestPath = join(dir, "exports.jsonl")
    const predictionPath = join(dir, "predictions.jsonl")
    const goldPath = join(dir, "gold.jsonl")
    const evaluationPath = join(dir, "prediction-eval.json")
    const runReportPath = join(dir, "run-report.json")
    mkdirSync(repoDir, { recursive: true })
    await Bun.write(
      fakeCliPath,
      [
        "const fs = await import('fs/promises')",
        "const path = await import('path')",
        "const args = Bun.argv.slice(2)",
        "if (args[0] === 'run') {",
        "  const titleIndex = args.indexOf('--title')",
        "  const title = titleIndex >= 0 ? args[titleIndex + 1] : undefined",
        "  const sessionArg = args.includes('--session') ? args[args.indexOf('--session') + 1] : undefined",
        "  const dir = args[args.indexOf('--dir') + 1]",
        "  if (sessionArg) {",
        "    await fs.mkdir(path.join(dir, 'src'), { recursive: true })",
        "    await fs.writeFile(path.join(dir, 'src/live.ts'), `export const answer = '${process.env.CTXLEDGER_RUN_LABEL}-LIVE-ANSWER'\\n`)",
        "  }",
        "  const sessionID = sessionArg ?? (title.includes('baseline') ? 'ses_fake_baseline' : 'ses_fake_contextledger')",
        "  console.log(JSON.stringify({",
        "    sessionID,",
        "    pure: args.includes('--pure'),",
        "    thinking: args.includes('--thinking'),",
        "    dir,",
        "    model: args[args.indexOf('--model') + 1],",
        "    variant: args[args.indexOf('--variant') + 1],",
        "    title,",
        "    resumed: sessionArg !== undefined,",
        "    prompt: args.at(-1),",
        "    runLabel: process.env.CTXLEDGER_RUN_LABEL,",
        "    config: JSON.parse(process.env.OPENCODE_CONFIG_CONTENT),",
        "    part: { type: 'text', text: sessionArg ? `final-${process.env.CTXLEDGER_RUN_LABEL}-LIVE-ANSWER` : `warmup-${process.env.CTXLEDGER_RUN_LABEL}` },",
        "  }))",
        "  process.exit(0)",
        "}",
        "if (args[0] === 'export') {",
        "  console.log(JSON.stringify({",
        "    info: {",
        "      id: args[1],",
        "      model: { providerID: 'openai', id: 'gpt-5.5', variant: 'high' },",
        "      tokens: { input: args[1].includes('baseline') ? 100 : 120, output: 10, reasoning: 5, cache: { read: 20, write: 0 } },",
        "    },",
        "    messages: [{ info: { id: 'msg_fake' }, parts: [{ type: 'file', filename: 'src/live.ts', source: { path: 'src/live.ts', text: { start: 3, end: 5 } } }] }],",
        "  }))",
        "  process.exit(0)",
        "}",
        "console.error(`unexpected args: ${args.join(' ')}`)",
        "process.exit(1)",
      ].join("\n"),
    )
    await Bun.write(
      manifestPath,
      [
        {
          instance_id: "owner__repo-live",
          run_id: "owner__repo-live-baseline",
          dir: repoDir,
          prompts: ["Read src/live.ts", "Read src/live.ts again"],
          title: "fake live baseline",
          model: "openai/gpt-5.5",
          variant: "high",
          extra_args: ["--thinking"],
          env: { CTXLEDGER_RUN_LABEL: "baseline" },
          config: { compaction: { context_ledger: { enabled: false } } },
          answer_contains: ["final-baseline-LIVE-ANSWER"],
          answer_regex: "LIVE-ANSWER$",
          file_checks: [
            {
              path: "src/live.ts",
              contains: ["baseline-LIVE-ANSWER"],
              not_contains: ["contextledger-LIVE-ANSWER"],
            },
          ],
          command_checks: [
            {
              command: ["node", "--check", "src/live.ts"],
              exit_code: 0,
              not_contains: ["SyntaxError"],
            },
          ],
        },
        {
          instance_id: "owner__repo-live",
          run_id: "owner__repo-live-contextledger",
          dir: repoDir,
          prompts: ["Read src/live.ts", "Read src/live.ts again"],
          title: "fake live contextledger",
          model: "openai/gpt-5.5",
          variant: "high",
          extra_args: ["--thinking"],
          env: { CTXLEDGER_RUN_LABEL: "contextledger" },
          config: { compaction: { context_ledger: { enabled: true, policy: "official-frontier", budget: 777 } } },
          answer_contains: ["final-contextledger-LIVE-ANSWER"],
          answer_regex: "LIVE-ANSWER$",
          file_checks: [
            {
              path: "src/live.ts",
              contains: ["contextledger-LIVE-ANSWER"],
              not_contains: ["baseline-LIVE-ANSWER"],
              regex: "export const answer = 'contextledger-LIVE-ANSWER'",
            },
          ],
          command_checks: [
            {
              command: ["node", "--check", "src/live.ts"],
              exit_code: 0,
              not_contains: ["SyntaxError"],
            },
          ],
        },
      ].map((row) => JSON.stringify(row)).join("\n") + "\n",
    )
    await Bun.write(
      goldPath,
      `${JSON.stringify({
        inst_id: "owner__repo-live",
        original_inst_id: "owner__repo-live",
        repo: "owner/repo",
        repo_url: "https://github.com/owner/repo.git",
        commit: "abc123",
        gold_ctx: [{ file: "src/live.ts", start_line: 3, end_line: 5, content: "" }],
        patch: "",
        test_patch: "",
        source: "fixture",
        language: "typescript",
      })}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--opencode-run-manifest",
        manifestPath,
        "--opencode-run-command-json",
        JSON.stringify(["bun", fakeCliPath]),
        "--opencode-run-extra-args-json",
        JSON.stringify(["--pure"]),
        "--opencode-run-output-dir",
        outputDir,
        "--opencode-run-export-manifest-output",
        exportManifestPath,
        "--opencode-run-report-output",
        runReportPath,
        "--prediction-output",
        predictionPath,
        "--prediction-eval-gold",
        goldPath,
        "--prediction-eval-output",
        evaluationPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    expect(existsSync(join(outputDir, "owner__repo-live-baseline.run.stdout"))).toBe(true)
    expect(existsSync(join(outputDir, "owner__repo-live-contextledger.run.stdout"))).toBe(true)
    const contextLedgerTurns = readFileSync(join(outputDir, "owner__repo-live-contextledger.run.stdout"), "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line))
    expect(contextLedgerTurns).toHaveLength(2)
    expect(contextLedgerTurns[0]).toMatchObject({
      pure: true,
      thinking: true,
      model: "openai/gpt-5.5",
      variant: "high",
      title: "fake live contextledger",
      prompt: "Read src/live.ts",
      resumed: false,
      runLabel: "contextledger",
      config: { compaction: { context_ledger: { enabled: true, policy: "official-frontier", budget: 777 } } },
    })
    expect(contextLedgerTurns[1]).toMatchObject({
      sessionID: "ses_fake_contextledger",
      prompt: "Read src/live.ts again",
      resumed: true,
    })
    expect("title" in contextLedgerTurns[1]).toBe(false)
    const exportManifest = readFileSync(exportManifestPath, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line))
    expect(exportManifest.map((row) => row.session_id)).toEqual(["ses_fake_baseline", "ses_fake_contextledger"])
    expect(exportManifest[1]?.export_path).toBe("runs/owner__repo-live-contextledger.export.json")
    expect(exportManifest[1]?.label).toBe("fake live contextledger")
    const predictions = SessionContextLedgerBenchmark.parsePredictionJsonl(readFileSync(predictionPath, "utf8"))
    expect(predictions.map((prediction) => prediction.instance_id)).toEqual(["owner__repo-live", "owner__repo-live"])
    expect(predictions[1]?.traj_data.pred_files).toEqual(["src/live.ts"])
    const evaluation = JSON.parse(readFileSync(evaluationPath, "utf8"))
    expect(evaluation.summary.cases).toBe(2)
    expect(evaluation.summary.lineF1).toBe(1)
    const runReport = JSON.parse(readFileSync(runReportPath, "utf8"))
    expect(runReport.rows.map((row: { runID: string }) => row.runID)).toEqual([
      "owner__repo-live-baseline",
      "owner__repo-live-contextledger",
    ])
    expect(runReport.rows.map((row: { turns: number }) => row.turns)).toEqual([2, 2])
    expect(runReport.rows[0].config).toEqual({ compaction: { context_ledger: { enabled: false } } })
    expect(runReport.rows[1].exportedModel).toEqual({ providerID: "openai", modelID: "gpt-5.5", variant: "high" })
    expect(runReport.rows[1].tokens).toMatchObject({ input: 120, output: 10, reasoning: 5, cacheRead: 20 })
    expect(runReport.rows[1].metrics.line.f1).toBe(1)
    expect(runReport.rows[1].answer).toEqual({
      finalText: "final-contextledger-LIVE-ANSWER",
      contains: [{ text: "final-contextledger-LIVE-ANSWER", matched: true }],
      regex: { pattern: "LIVE-ANSWER$", matched: true },
      passed: true,
    })
    expect(runReport.rows[1].fileChecks).toEqual({
      checks: [
        {
          path: "src/live.ts",
          exists: true,
          contains: [{ text: "contextledger-LIVE-ANSWER", matched: true }],
          notContains: [{ text: "baseline-LIVE-ANSWER", matched: true }],
          regex: { pattern: "export const answer = 'contextledger-LIVE-ANSWER'", matched: true },
          passed: true,
        },
      ],
      passed: true,
    })
    expect(runReport.rows[1].commandChecks).toMatchObject({
      checks: [
        {
          command: ["node", "--check", "src/live.ts"],
          exitCode: 0,
          expectedExitCode: 0,
          notContains: [{ text: "SyntaxError", matched: true }],
          passed: true,
        },
      ],
      passed: true,
    })
    expect(runReport.rows[1].commandChecks.checks[0].stdoutPath).toBe("runs/owner__repo-live-contextledger.command-0.stdout")
    expect(runReport.rows[1].commandChecks.checks[0].stderrPath).toBe("runs/owner__repo-live-contextledger.command-0.stderr")
    expect(runReport.summaries.map((row: { label: string; lineF1: number }) => [row.label, row.lineF1])).toEqual([
      ["fake live baseline", 1],
      ["fake live contextledger", 1],
    ])
    expect(runReport.summaries.map((row: { label: string; answerPassRate: number }) => [row.label, row.answerPassRate])).toEqual([
      ["fake live baseline", 1],
      ["fake live contextledger", 1],
    ])
    expect(runReport.summaries.map((row: { label: string; fileCheckPassRate: number }) => [row.label, row.fileCheckPassRate])).toEqual([
      ["fake live baseline", 1],
      ["fake live contextledger", 1],
    ])
    expect(runReport.summaries.map((row: { label: string; commandCheckPassRate: number }) => [row.label, row.commandCheckPassRate])).toEqual([
      ["fake live baseline", 1],
      ["fake live contextledger", 1],
    ])
    expect(runReport.pairedComparisons).toEqual([
      {
        instanceID: "owner__repo-live",
        baselineRunID: "owner__repo-live-baseline",
        candidateRunID: "owner__repo-live-contextledger",
        baselineLabel: "fake live baseline",
        candidateLabel: "fake live contextledger",
        delta: {
          fileF1: 0,
          spanF1: 0,
          lineF1: 0,
          aucLineCoverage: 0,
          answerPassed: 0,
          fileChecksPassed: 0,
          commandChecksPassed: 0,
        },
      },
    ])
  })

  test("CLI can score exported OpenCode compaction summaries against gold claims", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-opencode-compaction-summary-cli-"))
    const manifestPath = join(dir, "exports.jsonl")
    const baselineExportPath = join(dir, "baseline.export.json")
    const contextLedgerExportPath = join(dir, "contextledger.export.json")
    const goldPath = join(dir, "gold.jsonl")
    const reportPath = join(dir, "summary-report.json")
    const exportJson = (sessionID: string, summary: string) => ({
      info: { id: sessionID, model: { providerID: "openai", id: "gpt-5.5", variant: "high" } },
      messages: [
        {
          info: { id: `msg_${sessionID}_compact`, role: "user" },
          parts: [{ type: "compaction" }],
        },
        {
          info: {
            id: `msg_${sessionID}_summary`,
            parentID: `msg_${sessionID}_compact`,
            role: "assistant",
            summary: true,
            finish: "end_turn",
          },
          parts: [{ type: "text", text: summary }],
        },
      ],
    })
    await Bun.write(baselineExportPath, `${JSON.stringify(exportJson("ses_fake_baseline", "Preserve KEEP_ALPHA only."))}\n`)
    await Bun.write(
      contextLedgerExportPath,
      `${JSON.stringify(exportJson("ses_fake_contextledger", "Preserve KEEP_ALPHA and src/target.ts."))}\n`,
    )
    await Bun.write(
      manifestPath,
      [
        {
          instance_id: "owner__repo-summary",
          export_path: baselineExportPath,
          session_id: "ses_fake_baseline",
          label: "baseline",
        },
        {
          instance_id: "owner__repo-summary",
          export_path: contextLedgerExportPath,
          session_id: "ses_fake_contextledger",
          label: "contextledger",
        },
      ].map((row) => JSON.stringify(row)).join("\n") + "\n",
    )
    await Bun.write(
      goldPath,
      `${JSON.stringify({
        instance_id: "owner__repo-summary",
        gold: [
          { id: "keep-alpha", category: "constraint", text: "KEEP_ALPHA" },
          { id: "target-file", category: "file", file: "src/target.ts" },
        ],
      })}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--opencode-compaction-summary-manifest",
        manifestPath,
        "--compaction-summary-gold",
        goldPath,
        "--compaction-summary-output",
        reportPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const report = JSON.parse(readFileSync(reportPath, "utf8"))
    expect(report.rows.map((row: { label: string; recall: number }) => [row.label, row.recall])).toEqual([
      ["baseline", 0.5],
      ["contextledger", 1],
    ])
    expect(report.rows[0].missing).toEqual(["target-file"])
    expect(report.rows[1]).toMatchObject({
      sessionID: "ses_fake_contextledger",
      summaryCount: 1,
      survived: ["keep-alpha", "target-file"],
      missing: [],
    })
    expect(report.summary.recall).toBe(0.75)
  })

  test("builds noisy OpenCode compaction fixtures with gold claims", () => {
    const [fixture] = SessionContextLedgerBenchmark.buildNoisyCompactionFixtures({
      timestamp: 1234,
      directory: "/tmp/repo",
      scenarios: ["cache-invalidation"],
      distractorTurns: 2,
    })

    expect(fixture?.instanceID).toBe("live__ctxledger_noisy_cache_invalidation_gpt55")
    expect(fixture?.baseline.info.id).toBe("ses_ctxledger_noisy_cache_invalidation_baseline_1234")
    expect(fixture?.contextLedger.info.id).toBe("ses_ctxledger_noisy_cache_invalidation_precision_1234")
    expect(fixture?.gold.gold.map((claim) => claim.id)).toEqual([
      "cache-marker",
      "lease-prefix",
      "cache-file",
      "cache-test",
      "lease-ttl",
      "cache-symbol",
    ])
    expect(fixture?.continuation.prompt).toContain("cache invalidation facts")
    expect(fixture?.continuation.answerContains).toContain("marker=NOISY_LEDGER_CACHE_20260615")
    expect(fixture?.continuation.answerContains).toContain("ttl=45")
    const baselineText = JSON.stringify(fixture?.baseline)
    expect(baselineText).toContain("NOISY_LEDGER_CACHE_20260615")
    expect(baselineText).toContain("DISTRACTOR_CACHE_INVALIDATION_00")
    expect(baselineText).toContain("Recent tail-only status")
  })

  test("CLI can emit noisy compaction fixture imports and gold", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-noisy-compaction-fixtures-"))
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--noisy-compaction-fixtures-output-dir",
        dir,
        "--noisy-compaction-fixtures-scenarios",
        "payment-retry,parser-fallback",
        "--noisy-compaction-fixtures-timestamp",
        "5678",
        "--noisy-compaction-fixtures-distractor-turns",
        "1",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const stdout = JSON.parse(await new Response(proc.stdout).text())
    expect(stdout.fixtures).toBe(2)
    const manifestPath = join(dir, "fixtures.jsonl")
    const goldPath = join(dir, "gold.jsonl")
    const continuationManifestPath = join(dir, "continuation-run-manifest.jsonl")
    expect(existsSync(manifestPath)).toBe(true)
    expect(existsSync(goldPath)).toBe(true)
    expect(existsSync(continuationManifestPath)).toBe(true)
    const rows = readFileSync(manifestPath, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line))
    expect(rows.map((row) => row.scenario_id)).toEqual(["payment-retry", "parser-fallback"])
    expect(rows[0].continuation_answer_contains).toContain("attempts=2")
    expect(rows[0].precision_config.compaction.context_ledger).toEqual({
      enabled: true,
      policy: "precision-frontier",
      budget: 1200,
      mode: "replace",
    })
    expect(existsSync(rows[1].precision_import_path)).toBe(true)
    const goldRows = readFileSync(goldPath, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line))
    expect(goldRows).toHaveLength(2)
    expect(readFileSync(rows[0].baseline_import_path, "utf8")).toContain("ses_ctxledger_noisy_payment_retry_baseline_5678")
    const continuationRows = readFileSync(continuationManifestPath, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line))
    expect(continuationRows).toHaveLength(4)
    expect(continuationRows[0]).toMatchObject({
      run_id: "payment-retry-baseline-continuation",
      title: "baseline",
      model: "openai/gpt-5.5",
      variant: "high",
      extra_args: ["--pure", "--session", "ses_ctxledger_noisy_payment_retry_baseline_5678"],
    })
    expect(continuationRows[1]).toMatchObject({
      run_id: "payment-retry-precision-continuation",
      title: "ContextLedger-precision-replace",
      answer_contains: expect.arrayContaining(["marker=NOISY_LEDGER_ALPHA_20260615"]),
    })
  })

  test("CLI can convert V2 session messages into prediction JSONL", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-opencode-messages-cli-"))
    const messagesPath = join(dir, "messages.json")
    const predictionPath = join(dir, "predictions.jsonl")
    await Bun.write(
      messagesPath,
      `${JSON.stringify([
        new SessionMessage.Assistant({
          id: id("cli-v2-assistant"),
          type: "assistant",
          agent: "build",
          model,
          content: [
            new SessionMessage.AssistantTool({
              type: "tool",
              id: "read-1",
              name: "read",
              state: new SessionMessage.ToolStateCompleted({
                status: "completed",
                input: { path: "src/messages.ts", offset: 11, limit: 2 },
                structured: {
                  type: "text-page",
                  content: "export const value = true\nexport const done = true",
                  mime: "text/typescript",
                  offset: 11,
                  truncated: false,
                },
                content: [],
                outputPaths: [],
              }),
              time: { created, ran: created, completed: created },
            }),
          ],
          time: { created },
        }),
      ])}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--opencode-messages",
        messagesPath,
        "--instance-id",
        "owner__repo-messages",
        "--prediction-output",
        predictionPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const prediction = JSON.parse(readFileSync(predictionPath, "utf8"))
    expect(prediction.instance_id).toBe("owner__repo-messages")
    expect(prediction.traj_data.pred_files).toEqual(["src/messages.ts"])
    expect(prediction.traj_data.pred_spans).toEqual({
      "src/messages.ts": [{ type: "line", start: 11, end: 12 }],
    })
  })

  test("CLI can convert SWE-Explore rows and emit target reports", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-swe-explore-cli-"))
    const sweExplorePath = join(dir, "swe-explore.jsonl")
    const casesPath = join(dir, "cases.jsonl")
    const targetsPath = join(dir, "targets.json")
    const officialPath = join(dir, "official.jsonl")
    const officialSummaryPath = join(dir, "official-summary.json")
    await Bun.write(
      sweExplorePath,
      [
        {
          instance_id: "cli__swe-explore-noise",
          repo_dir: "repos/cli__swe-explore-noise",
          dataset: "verified",
          ground_truth: {
            read_core_files: ["src/noise.py"],
            read_core_regions: [{ path: "src/noise.py", start: 1, end: 4 }],
            read_optional_files_map: {},
            read_optional_regions_map: {},
            modified_core_files: ["src/noise.py"],
            main_files: ["src/noise.py"],
          },
          read_step_info: {},
        },
        {
          instance_id: "cli__swe-explore-1",
          repo_dir: "repos/cli__swe-explore-1",
          dataset: "verified",
          ground_truth: {
            read_core_files: ["src/main.py"],
            read_core_regions: [{ path: "src/main.py", start: 5, end: 8 }],
            read_optional_files_map: { model_a: ["tests/test_main.py"] },
            read_optional_regions_map: { model_a: [{ path: "tests/test_main.py", start: 1, end: 30 }] },
            modified_core_files: ["src/main.py"],
            main_files: ["src/main.py"],
          },
          read_step_info: {
            "tests/test_main.py": [{ traj_path: "traj.json", step_idx: 1, start: 1, end: 30 }],
            "src/main.py": [{ traj_path: "traj.json", step_idx: 2, start: 5, end: 8 }],
          },
        },
      ].map((row) => JSON.stringify(row)).join("\n") + "\n",
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-instance-ids",
        "cli__swe-explore-1",
        "--swe-explore-limit",
        "1",
        "--swe-explore-max-optional-regions",
        "0",
        "--swe-explore-offset",
        "0",
        "--budget",
        "40",
        "--policies",
        "official-frontier",
        "--write-cases",
        casesPath,
        "--target-report-output",
        targetsPath,
        "--target-report-targets",
        "line-f1,auc-line",
        "--swe-explore-official-output",
        officialPath,
        "--swe-explore-official-summary-output",
        officialSummaryPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const [converted] = SessionContextLedgerBenchmark.parseJsonl(readFileSync(casesPath, "utf8"))
    expect(converted?.instance_id).toBe("cli__swe-explore-1")
    expect(converted?.benchmark).toBe("swe-explore")
    expect(converted?.events).toHaveLength(1)
    const targets = JSON.parse(readFileSync(targetsPath, "utf8"))
    expect(targets.budgets[0]?.targets.map((target: { target: string }) => target.target)).toEqual([
      "line-f1",
      "auc-line",
    ])
    const officialRows = readFileSync(officialPath, "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line))
    const officialSummary = JSON.parse(readFileSync(officialSummaryPath, "utf8"))
    expect(officialRows).toHaveLength(1)
    expect(officialRows[0]?.regions).toEqual([{ path: "src/main.py", start: 5, end: 8 }])
    expect(officialRows[0]?.metrics.recall).toBe(1)
    expect(officialRows[0]?.metrics.ndcg_at_100).toBe(1)
    expect(officialSummary.summaries[0]?.metrics.recall).toBe(1)
  })

  test("CLI can build SWE-Explore candidates from a repository snapshot", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-swe-explore-repo-cli-"))
    const reposRoot = join(dir, "repo-root")
    const repoDir = join(reposRoot, "repos/cli__swe-explore-repo")
    const sweExplorePath = join(dir, "swe-explore.jsonl")
    const sourceMapPath = join(dir, "source-map.jsonl")
    const sourceMapOutputPath = join(dir, "source-map-output.jsonl")
    const casesPath = join(dir, "cases.jsonl")
    const multiscaleCasesPath = join(dir, "multiscale-cases.jsonl")
    const multiscaleSummaryPath = join(dir, "multiscale-summary.json")
    const officialSummaryPath = join(dir, "official-summary.json")
    const oracleReportPath = join(dir, "oracle-report.json")
    const sweepPath = join(dir, "chunk-sweep.json")
    const rankerSweepPath = join(dir, "ranker-sweep.json")
    const defaultRankerSweepPath = join(dir, "default-ranker-sweep.json")
    const rankerPortfolioPath = join(dir, "ranker-portfolio.json")
    const rankerEarlyPortfolioPath = join(dir, "ranker-early-portfolio.json")
    const rankerPortfolioStabilityPath = join(dir, "ranker-portfolio-stability.json")
    const rankerGateTransferPath = join(dir, "ranker-gate-transfer.json")
    const rankerGateReportPath = join(dir, "ranker-gate-report.md")
    mkdirSync(join(repoDir, "src"), { recursive: true })
    mkdirSync(join(repoDir, "tests"), { recursive: true })
    await Bun.write(
      join(repoDir, "src/main.py"),
      [
        "def helper():",
        "    return None",
        "",
        "",
        "def parse_config(raw):",
        "    if raw == '':",
        "        return None",
        "    return raw.strip()",
        "",
        "def other():",
        "    return 'noise'",
      ].join("\n"),
    )
    await Bun.write(join(repoDir, "tests/test_main.py"), "def test_parse_config():\n    assert True\n")
    await Bun.write(
      sourceMapPath,
      `${JSON.stringify({
        instance_id: "cli__swe-explore-repo",
        dataset: "verified",
        repo: "cli/swe-explore-repo",
        base_commit: "abc123",
        problem_statement: "parse_config fails for empty raw config in src/main.py",
      })}\n`,
    )
    await Bun.write(
      sweExplorePath,
      `${JSON.stringify({
        instance_id: "cli__swe-explore-repo",
        repo_dir: "repos/cli__swe-explore-repo",
        dataset: "verified",
        ground_truth: {
          read_core_files: ["src/main.py"],
          read_core_regions: [{ path: "src/main.py", start: 5, end: 8 }],
          read_optional_files_map: {},
          read_optional_regions_map: {},
          modified_core_files: ["src/main.py"],
          main_files: ["src/main.py"],
        },
        read_step_info: {},
      })}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-repo-candidates",
        "--swe-explore-repos-root",
        reposRoot,
        "--swe-explore-source-map",
        sourceMapPath,
        "--swe-explore-source-map-output",
        sourceMapOutputPath,
        "--swe-explore-chunk-lines",
        "4",
        "--swe-explore-chunk-overlap",
        "0",
        "--swe-explore-max-repo-files",
        "10",
        "--swe-explore-max-repo-chunks",
        "4",
        "--budget",
        "4",
        "--policies",
        "relevance-frontier",
        "--write-cases",
        casesPath,
        "--swe-explore-official-summary-output",
        officialSummaryPath,
        "--swe-explore-oracle-report-output",
        oracleReportPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const [converted] = SessionContextLedgerBenchmark.parseJsonl(readFileSync(casesPath, "utf8"))
    const officialSummary = JSON.parse(readFileSync(officialSummaryPath, "utf8"))
    const oracleReport = JSON.parse(readFileSync(oracleReportPath, "utf8"))
    const [sourceOutput] = readFileSync(sourceMapOutputPath, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line))
    expect(converted?.query).toContain("parse_config")
    expect(converted?.events.some((event) => event.id.includes(":core:"))).toBe(false)
    expect(converted?.events.some((event) => event.id.includes(":optional:"))).toBe(false)
    expect(converted?.events.some((event) => event.files.includes("src/main.py"))).toBe(true)
    expect(sourceOutput?.repo).toBe("cli/swe-explore-repo")
    expect(sourceOutput?.base_commit).toBe("abc123")
    expect(officialSummary.summaries[0]?.metrics.recall).toBe(1)
    expect(oracleReport.candidatePool.summary.meanFileRecall).toBe(1)
    expect(oracleReport.budgetOracles.summaries[0]?.budget).toBe(4)

    const sweepProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-repos-root",
        reposRoot,
        "--swe-explore-source-map",
        sourceMapPath,
        "--swe-explore-chunk-sweep-output",
        sweepPath,
        "--swe-explore-chunk-sweep-lines",
        "2,4",
        "--swe-explore-max-repo-files",
        "10",
        "--swe-explore-max-repo-chunks",
        "4",
        "--swe-explore-repo-ranker",
        "bm25",
        "--budgets",
        "2,4",
        "--policies",
        "candidate-rank-frontier",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const sweepExit = await sweepProc.exited
    const sweepStderr = await new Response(sweepProc.stderr).text()

    expect(sweepExit, sweepStderr).toBe(0)
    const sweep = JSON.parse(readFileSync(sweepPath, "utf8"))
    expect(sweep.results.map((item: { chunkLines: number }) => item.chunkLines)).toEqual([2, 4])
    expect(sweep.results.every((item: { ranker: string }) => item.ranker === "bm25")).toBe(true)
    expect(sweep.bestByBudget[0]?.best.policy).toBe("candidate-rank-frontier")

    const rankerSweepProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-repos-root",
        reposRoot,
        "--swe-explore-source-map",
        sourceMapPath,
        "--swe-explore-ranker-sweep-output",
        rankerSweepPath,
        "--swe-explore-ranker-sweep-rankers",
        "lexical,dependency-neighbor,anchored-neighbor,hybrid-rrf",
        "--swe-explore-chunk-lines",
        "2",
        "--swe-explore-chunk-overlap",
        "0",
        "--swe-explore-max-repo-files",
        "10",
        "--swe-explore-max-repo-chunks",
        "2",
        "--budgets",
        "2,4",
        "--policies",
        "candidate-rank-frontier",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const rankerSweepExit = await rankerSweepProc.exited
    const rankerSweepStderr = await new Response(rankerSweepProc.stderr).text()

    expect(rankerSweepExit, rankerSweepStderr).toBe(0)
    const rankerSweep = JSON.parse(readFileSync(rankerSweepPath, "utf8"))
    expect(rankerSweep.results.map((item: { ranker: string }) => item.ranker)).toEqual([
      "lexical",
      "dependency-neighbor",
      "anchored-neighbor",
      "hybrid-rrf",
    ])
    expect(rankerSweep.results.every((item: { chunkSizes: unknown[] }) => item.chunkSizes.length === 1)).toBe(true)
    expect(rankerSweep.bestByBudget[0]?.best.policy).toBe("candidate-rank-frontier")
    expect(rankerSweep.comparisons[0]?.baselineRanker).toBe("lexical")
    expect(rankerSweep.comparisons[0]?.ranker).toBe("dependency-neighbor")
    expect(rankerSweep.comparisons.some((item: { ranker: string }) => item.ranker === "anchored-neighbor")).toBe(true)
    expect(typeof rankerSweep.comparisons[0]?.deltas.f1).toBe("number")
    const dependencyCase = rankerSweep.caseComparisons.find(
      (item: { ranker: string }) => item.ranker === "dependency-neighbor",
    )
    expect(dependencyCase?.baselineRanker).toBe("lexical")
    expect(dependencyCase?.instanceID).toBe("cli__swe-explore-repo")
    expect(rankerSweep.caseComparisons.some((item: { ranker: string }) => item.ranker === "anchored-neighbor")).toBe(true)
    expect(rankerSweep.caseComparisons.some((item: { ranker: string }) => item.ranker === "hybrid-rrf")).toBe(true)
    expect(["win", "loss", "tie"]).toContain(rankerSweep.caseComparisons[0]?.outcome)
    expect(typeof rankerSweep.caseComparisons[0]?.deltas.f1).toBe("number")
    expect(typeof rankerSweep.caseComparisons[0]?.baselineMetrics.f1).toBe("number")
    expect(typeof rankerSweep.caseComparisons[0]?.metrics.firstUsefulHit).toBe("number")
    expect(typeof rankerSweep.caseComparisons[0]?.features.eventCount).toBe("number")
    expect(typeof rankerSweep.caseComparisons[0]?.features.queryCandidateTermOverlap).toBe("number")
    expect(typeof rankerSweep.caseComparisons[0]?.baselineFeatures.fileCount).toBe("number")
    expect(typeof rankerSweep.caseComparisons[0]?.comparisonFeatures.fileJaccard).toBe("number")
    expect(typeof rankerSweep.caseComparisons[0]?.comparisonFeatures.candidateNewEventShare).toBe("number")
    const dependencyGate = rankerSweep.gates.find((item: { ranker: string }) => item.ranker === "dependency-neighbor")
    expect(dependencyGate?.baselineRanker).toBe("lexical")
    expect(rankerSweep.gates.some((item: { ranker: string }) => item.ranker === "anchored-neighbor")).toBe(true)
    expect(rankerSweep.gates.some((item: { ranker: string }) => item.ranker === "hybrid-rrf")).toBe(true)
    expect(dependencyGate?.cases).toBe(1)
    expect(typeof dependencyGate?.rule.trainF1).toBe("number")
    expect(typeof dependencyGate?.leaveOneOut.f1).toBe("number")

    const defaultRankerSweepProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-repos-root",
        reposRoot,
        "--swe-explore-source-map",
        sourceMapPath,
        "--swe-explore-ranker-sweep-output",
        defaultRankerSweepPath,
        "--swe-explore-chunk-lines",
        "2",
        "--swe-explore-chunk-overlap",
        "0",
        "--swe-explore-max-repo-files",
        "10",
        "--swe-explore-max-repo-chunks",
        "2",
        "--budgets",
        "2",
        "--policies",
        "candidate-rank-frontier",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const defaultRankerSweepExit = await defaultRankerSweepProc.exited
    const defaultRankerSweepStderr = await new Response(defaultRankerSweepProc.stderr).text()

    expect(defaultRankerSweepExit, defaultRankerSweepStderr).toBe(0)
    const defaultRankerSweep = JSON.parse(readFileSync(defaultRankerSweepPath, "utf8"))
    expect(defaultRankerSweep.results.map((item: { ranker: string }) => item.ranker)).toEqual([
      "lexical",
      "bm25",
      "structural",
      "structural-neighbor",
      "hybrid-rrf",
    ])

    const rankerPortfolioProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore-ranker-portfolio-output",
        rankerPortfolioPath,
        "--swe-explore-ranker-portfolio-inputs",
        rankerSweepPath,
        "--swe-explore-ranker-portfolio-labels",
        "repo-cli",
        "--swe-explore-ranker-portfolio-target",
        "f1",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const rankerPortfolioExit = await rankerPortfolioProc.exited
    const rankerPortfolioStderr = await new Response(rankerPortfolioProc.stderr).text()

    expect(rankerPortfolioExit, rankerPortfolioStderr).toBe(0)
    const rankerPortfolio = JSON.parse(readFileSync(rankerPortfolioPath, "utf8"))
    expect(rankerPortfolio.target).toBe("f1")
    expect(rankerPortfolio.splitCount).toBe(1)
    expect(rankerPortfolio.splits[0]?.id).toBe("repo-cli")
    expect(rankerPortfolio.budgets.map((item: { budget: number }) => item.budget)).toEqual([2, 4])
    expect(rankerPortfolio.budgets[0]?.selectedRanker).toBe(rankerSweep.bestByBudget[0]?.best.ranker)
    expect(rankerPortfolio.budgets[0]?.selectedPolicy).toBe(rankerSweep.bestByBudget[0]?.best.policy)
    expect(rankerPortfolio.budgets[0]?.robustRanker).toBe(rankerPortfolio.budgets[0]?.selectedRanker)
    expect(rankerPortfolio.budgets[0]?.robustPolicy).toBe(rankerPortfolio.budgets[0]?.selectedPolicy)
    expect(rankerPortfolio.budgets[0]?.robustSplitScores).toHaveLength(1)
    expect(rankerPortfolio.budgets[0]?.candidates[0]?.complete).toBe(true)
    expect(rankerPortfolio.portfolio.selectedRankerCounts[0]?.budgets).toBeGreaterThan(0)
    expect(rankerPortfolio.portfolio.robustRankerCounts[0]?.budgets).toBeGreaterThan(0)

    const rankerEarlyPortfolioProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore-ranker-portfolio-output",
        rankerEarlyPortfolioPath,
        "--swe-explore-ranker-portfolio-inputs",
        rankerSweepPath,
        "--swe-explore-ranker-portfolio-labels",
        "repo-cli",
        "--swe-explore-ranker-portfolio-target",
        "f1-first-useful",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const rankerEarlyPortfolioExit = await rankerEarlyPortfolioProc.exited
    const rankerEarlyPortfolioStderr = await new Response(rankerEarlyPortfolioProc.stderr).text()

    expect(rankerEarlyPortfolioExit, rankerEarlyPortfolioStderr).toBe(0)
    const rankerEarlyPortfolio = JSON.parse(readFileSync(rankerEarlyPortfolioPath, "utf8"))
    expect(rankerEarlyPortfolio.target).toBe("f1-first-useful")
    expect(rankerEarlyPortfolio.budgets[0]?.selectedScore).toBeGreaterThan(0)
    expect(rankerEarlyPortfolio.budgets[0]?.selectedMetrics.firstUsefulHit).toBeGreaterThan(0)

    const rankerPortfolioStabilityProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore-ranker-portfolio-stability-output",
        rankerPortfolioStabilityPath,
        "--swe-explore-ranker-portfolio-stability-inputs",
        `${rankerSweepPath},${rankerSweepPath}`,
        "--swe-explore-ranker-portfolio-stability-labels",
        "same-a,same-b",
        "--swe-explore-ranker-portfolio-target",
        "f1-first-useful",
        "--swe-explore-ranker-portfolio-max-heldout-loss",
        "0.01",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const rankerPortfolioStabilityExit = await rankerPortfolioStabilityProc.exited
    const rankerPortfolioStabilityStderr = await new Response(rankerPortfolioStabilityProc.stderr).text()

    expect(rankerPortfolioStabilityExit, rankerPortfolioStabilityStderr).toBe(0)
    const rankerPortfolioStability = JSON.parse(readFileSync(rankerPortfolioStabilityPath, "utf8"))
    expect(rankerPortfolioStability.target).toBe("f1-first-useful")
    expect(rankerPortfolioStability.maximumHeldoutLoss).toBe(0.01)
    expect(rankerPortfolioStability.splitCount).toBe(2)
    expect(rankerPortfolioStability.splits.map((item: { id: string }) => item.id)).toEqual(["same-a", "same-b"])
    expect(rankerPortfolioStability.fixedCandidates[0]?.robustRanker).toBeString()
    expect(rankerPortfolioStability.budgets[0]?.trainSplit).toBe("same-a")
    expect(rankerPortfolioStability.budgets[0]?.selectedEvaluation.evalSplits).toHaveLength(2)
    expect(typeof rankerPortfolioStability.budgets[0]?.selectedHeldout.maxRegretVsBest).toBe("number")
    expect(typeof rankerPortfolioStability.budgets[0]?.robustHeldout.stable).toBe("boolean")

    const transferProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore-ranker-gate-transfer-output",
        rankerGateTransferPath,
        "--swe-explore-ranker-gate-transfer-inputs",
        `${rankerSweepPath},${rankerSweepPath}`,
        "--swe-explore-ranker-gate-transfer-labels",
        "same-a,same-b",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const transferExit = await transferProc.exited
    const transferStderr = await new Response(transferProc.stderr).text()

    expect(transferExit, transferStderr).toBe(0)
    const rankerGateTransfer = JSON.parse(readFileSync(rankerGateTransferPath, "utf8"))
    expect(rankerGateTransfer.splitCount).toBe(2)
    expect(rankerGateTransfer.gates[0]?.trainSplit).toBe("same-a")
    expect(rankerGateTransfer.gates[0]?.evalSplits).toHaveLength(2)
    expect(typeof rankerGateTransfer.gates[0]?.heldout.minRoutedDeltaVsBestFixed).toBe("number")

    const gateReportProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore-ranker-gate-report-output",
        rankerGateReportPath,
        "--swe-explore-ranker-gate-report-inputs",
        `${rankerSweepPath},${rankerSweepPath}`,
        "--swe-explore-ranker-gate-report-labels",
        "same-a,same-b",
        "--swe-explore-ranker-gate-epsilon",
        "0.005",
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const gateReportExit = await gateReportProc.exited
    const gateReportStderr = await new Response(gateReportProc.stderr).text()

    expect(gateReportExit, gateReportStderr).toBe(0)
    const gateReport = readFileSync(rankerGateReportPath, "utf8")
    expect(gateReport).toContain("# Gated Ranker Validation")
    expect(gateReport).toContain("## Oracle Headroom")
    expect(gateReport).toContain("epsilon=0.005")
    expect(gateReport).toContain("Stable non-abstaining gates under epsilon")

    const multiscaleProc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-repo-candidates",
        "--swe-explore-repos-root",
        reposRoot,
        "--swe-explore-source-map",
        sourceMapPath,
        "--swe-explore-multiscale-chunk-lines",
        "2,4",
        "--swe-explore-max-repo-files",
        "10",
        "--swe-explore-max-repo-chunks",
        "8",
        "--swe-explore-repo-ranker",
        "structural",
        "--budget",
        "6",
        "--policies",
        "budget-rank-frontier",
        "--write-cases",
        multiscaleCasesPath,
        "--swe-explore-official-summary-output",
        multiscaleSummaryPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const multiscaleExit = await multiscaleProc.exited
    const multiscaleStderr = await new Response(multiscaleProc.stderr).text()

    expect(multiscaleExit, multiscaleStderr).toBe(0)
    const [multiscale] = SessionContextLedgerBenchmark.parseJsonl(readFileSync(multiscaleCasesPath, "utf8"))
    const multiscaleSummary = JSON.parse(readFileSync(multiscaleSummaryPath, "utf8"))
    const multiscaleTokenSizes = new Set(multiscale?.events.map((event) => event.tokens))
    expect(multiscaleTokenSizes.has(2)).toBe(true)
    expect(multiscaleTokenSizes.has(4)).toBe(true)
    expect(multiscale?.events.some((event) => event.id.includes(":core:"))).toBe(false)
    expect(multiscale?.events.some((event) => event.id.includes(":optional:"))).toBe(false)
    expect(multiscaleSummary.summaries[0]?.policy).toBe("budget-rank-frontier")
  }, 30_000)

  test("content-aware repo rankers can recover weak-path files before the file cutoff", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-swe-explore-content-structural-cli-"))
    const reposRoot = join(dir, "repo-root")
    const repoDir = join(reposRoot, "repos/cli__content-structural")
    const sweExplorePath = join(dir, "swe-explore.jsonl")
    const sourceMapPath = join(dir, "source-map.jsonl")
    mkdirSync(join(repoDir, "a_noise"), { recursive: true })
    mkdirSync(join(repoDir, "z_target"), { recursive: true })
    await Bun.write(
      join(repoDir, "a_noise/first.py"),
      [
        "public ",
        "",
        "",
        "def unrelated():",
        "    return 'noise'",
      ].join("\n"),
    )
    await Bun.write(
      join(repoDir, "z_target/opaque.py"),
      [
        "def frobnicate_uuid(token):",
        "    if token is None:",
        "        return None",
        "    return token.strip()",
      ].join("\n"),
    )
    await Bun.write(
      sourceMapPath,
      `${JSON.stringify({
        instance_id: "cli__content-structural",
        dataset: "verified",
        repo: "cli/content-structural",
        base_commit: "abc123",
        problem_statement: "frobnicate_uuid rejects null token",
      })}\n`,
    )
    await Bun.write(
      sweExplorePath,
      `${JSON.stringify({
        instance_id: "cli__content-structural",
        repo_dir: "repos/cli__content-structural",
        dataset: "verified",
        ground_truth: {
          read_core_files: ["z_target/opaque.py"],
          read_core_regions: [{ path: "z_target/opaque.py", start: 1, end: 4 }],
          read_optional_files_map: {},
          read_optional_regions_map: {},
          modified_core_files: ["z_target/opaque.py"],
          main_files: ["z_target/opaque.py"],
        },
        read_step_info: {},
      })}\n`,
    )

    for (const ranker of ["content-structural", "content-backfill"] as const) {
      const casesPath = join(dir, `${ranker}-cases.jsonl`)
      const officialSummaryPath = join(dir, `${ranker}-official-summary.json`)
      const proc = Bun.spawn({
        cmd: [
          "bun",
          "run",
          "script/context-ledger-benchmark.ts",
          "--swe-explore",
          sweExplorePath,
          "--swe-explore-repo-candidates",
          "--swe-explore-repos-root",
          reposRoot,
          "--swe-explore-source-map",
          sourceMapPath,
          "--swe-explore-repo-ranker",
          ranker,
          "--swe-explore-chunk-lines",
          "4",
          "--swe-explore-chunk-overlap",
          "0",
          "--swe-explore-max-repo-files",
          "1",
          "--swe-explore-max-repo-chunks",
          "1",
          "--budget",
          "4",
          "--policies",
          "candidate-rank-frontier",
          "--write-cases",
          casesPath,
          "--swe-explore-official-summary-output",
          officialSummaryPath,
        ],
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      })
      const exit = await proc.exited
      const stderr = await new Response(proc.stderr).text()

      expect(exit, stderr).toBe(0)
      const [converted] = SessionContextLedgerBenchmark.parseJsonl(readFileSync(casesPath, "utf8"))
      const officialSummary = JSON.parse(readFileSync(officialSummaryPath, "utf8"))
      expect(converted?.events.map((event) => event.files)).toEqual([["z_target/opaque.py"]])
      expect(officialSummary.summaries[0]?.metrics.recall).toBe(1)
    }
  }, 30_000)

  test("CLI can prepare SWE-Explore repository snapshots from source metadata", async () => {
    const dir = mkdtempSync(join(tmpdir(), "context-ledger-swe-explore-prepare-cli-"))
    const sourceRepo = join(dir, "source-repo")
    const reposRoot = join(dir, "prepared")
    const cacheRoot = join(dir, "repo-cache")
    const sweExplorePath = join(dir, "swe-explore.jsonl")
    const sourceMapPath = join(dir, "source-map.jsonl")
    const prepareOutputPath = join(dir, "prepared.json")
    const casesPath = join(dir, "cases.jsonl")
    const officialSummaryPath = join(dir, "official-summary.json")
    mkdirSync(join(sourceRepo, "src"), { recursive: true })
    await Bun.write(
      join(sourceRepo, "src/main.py"),
      [
        "def helper():",
        "    return None",
        "",
        "",
        "def parse_config(raw):",
        "    if raw == '':",
        "        return None",
        "    return raw.strip()",
      ].join("\n"),
    )
    await runTestGit(["init"], sourceRepo)
    await runTestGit(["config", "user.email", "context-ledger@example.com"], sourceRepo)
    await runTestGit(["config", "user.name", "Context Ledger"], sourceRepo)
    await runTestGit(["add", "src/main.py"], sourceRepo)
    await runTestGit(["commit", "-m", "seed"], sourceRepo)
    const baseCommit = await runTestGit(["rev-parse", "HEAD"], sourceRepo)
    await Bun.write(
      sourceMapPath,
      `${JSON.stringify({
        instance_id: "cli__prepare-repo",
        dataset: "verified",
        repo: "cli/prepare-repo",
        repo_url: sourceRepo,
        base_commit: baseCommit,
        problem_statement: "parse_config fails for empty raw config in src/main.py",
      })}\n`,
    )
    await Bun.write(
      sweExplorePath,
      `${JSON.stringify({
        instance_id: "cli__prepare-repo",
        repo_dir: "repos/cli__prepare-repo",
        dataset: "verified",
        ground_truth: {
          read_core_files: ["src/main.py"],
          read_core_regions: [{ path: "src/main.py", start: 5, end: 8 }],
          read_optional_files_map: {},
          read_optional_regions_map: {},
          modified_core_files: ["src/main.py"],
          main_files: ["src/main.py"],
        },
        read_step_info: {},
      })}\n`,
    )
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "script/context-ledger-benchmark.ts",
        "--swe-explore",
        sweExplorePath,
        "--swe-explore-source-map",
        sourceMapPath,
        "--swe-explore-prepare-repos",
        "--swe-explore-prepare-repos-cache",
        cacheRoot,
        "--swe-explore-prepare-repos-output",
        prepareOutputPath,
        "--swe-explore-repo-candidates",
        "--swe-explore-repos-root",
        reposRoot,
        "--swe-explore-chunk-lines",
        "4",
        "--swe-explore-chunk-overlap",
        "0",
        "--swe-explore-max-repo-files",
        "10",
        "--swe-explore-max-repo-chunks",
        "4",
        "--budget",
        "4",
        "--policies",
        "candidate-rank-frontier",
        "--write-cases",
        casesPath,
        "--swe-explore-official-summary-output",
        officialSummaryPath,
      ],
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    })
    const exit = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exit, stderr).toBe(0)
    const prepared = JSON.parse(readFileSync(prepareOutputPath, "utf8"))
    const [converted] = SessionContextLedgerBenchmark.parseJsonl(readFileSync(casesPath, "utf8"))
    const officialSummary = JSON.parse(readFileSync(officialSummaryPath, "utf8"))
    expect(prepared.repos[0]?.head).toBe(baseCommit)
    expect(existsSync(join(reposRoot, "repos/cli__prepare-repo/.git"))).toBe(true)
    expect(existsSync(cacheRoot)).toBe(true)
    expect(converted?.events.some((event) => event.files.includes("src/main.py"))).toBe(true)
    expect(officialSummary.summaries[0]?.metrics.recall).toBe(1)
  })

  test("accepts Python-style ContextBench test lists", () => {
    const [converted] = SessionContextLedgerBenchmark.fromContextBenchRowsResponse({
      rows: [
        {
          row: {
            instance_id: "SWE-Bench-Verified__python__bug__singlequotes",
            original_inst_id: "example__repo-2",
            repo: "example/repo",
            repo_url: "https://github.com/example/repo.git",
            language: "python",
            base_commit: "abc123",
            gold_context: JSON.stringify([
              { file: "src/config.py", start_line: 10, end_line: 20, content: "def load_config(): pass" },
            ]),
            patch: "",
            test_patch: "",
            problem_statement: "Config fallback should reject an empty environment value.",
            f2p: "['tests/test_config.py::test_empty_env']",
            p2p: "['tests/test_config.py::test_default_env']",
            source: "Verified",
          },
        },
      ],
    })

    expect(converted.events.map((item) => item.id)).toContain("SWE-Bench-Verified__python__bug__singlequotes:f2p:0")
    expect(converted.events.map((item) => item.id)).toContain("SWE-Bench-Verified__python__bug__singlequotes:p2p:0")
    expect(converted.events.find((item) => item.id.endsWith(":f2p:0"))?.files).toEqual(["tests/test_config.py"])
  })

  test("does not treat bare test identifiers as file paths", () => {
    const [converted] = SessionContextLedgerBenchmark.fromContextBenchRowsResponse(
      {
        rows: [
          {
            row: {
              instance_id: "SWE-Bench-Verified__python__bug__baretest",
              original_inst_id: "example__repo-3",
              repo: "example/repo",
              repo_url: "https://github.com/example/repo.git",
              language: "python",
              base_commit: "abc123",
              gold_context: JSON.stringify([
                { file: "src/config.py", start_line: 10, end_line: 20, content: "def load_config(): pass" },
              ]),
              patch: "",
              test_patch: "",
              problem_statement: "Config fallback should reject an empty environment value.",
              f2p: JSON.stringify(["test_empty_env (tests.test_config.ConfigTest)"]),
              p2p: JSON.stringify(["test_default_env (tests.test_config.ConfigTest)"]),
              source: "Verified",
            },
          },
        ],
      },
      { includeTestCodeContext: true },
    )

    expect(converted.events.find((item) => item.id.endsWith(":f2p:0"))?.files).toEqual([])
    expect(converted.events.find((item) => item.id.endsWith(":p2p:0"))?.files).toEqual([])
    expect(converted.events.some((item) => item.id.includes(":test-code-context:"))).toBe(false)
  })

  test("query frontier uses issue text as non-budget ranking evidence", () => {
    const queryItem = {
      instance_id: "owner__repo-5678",
      query: "empty environment fallback should reject blank config values",
      gold_ids: ["matching"],
      gold_files: ["src/config.ts"],
      events: [
        event({
          id: "distractor",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/parser.ts"],
          summary: "parse command arguments and normalize option aliases",
        }),
        event({
          id: "matching",
          kind: "code-context",
          order: 2,
          tokens: 30,
          files: ["src/config.ts"],
          summary: "load environment config fallback and reject blank values",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const result = SessionContextLedgerBenchmark.evaluateCase({
      item: queryItem,
      policy: "query-frontier",
      budget: 35,
    })

    expect(result.recall).toBe(1)
  })

  test("relevance frontier favors matching code context over noisy evidence", () => {
    const queryItem = {
      instance_id: "owner__repo-9012",
      query: "empty environment fallback should reject blank config values",
      gold_ids: ["matching"],
      gold_files: ["src/config.ts"],
      events: [
        event({
          id: "test-noise",
          kind: "test-evidence",
          order: 1,
          tokens: 10,
          files: ["tests/config.test.ts"],
          summary: "test_empty_environment_fallback",
        }),
        event({
          id: "matching",
          kind: "code-context",
          order: 2,
          tokens: 30,
          files: ["src/config.ts"],
          summary: "load environment config fallback and reject blank values",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "relevance-frontier",
      budget: 35,
      query: queryItem.query,
    })
    const result = SessionContextLedgerBenchmark.evaluateCase({
      item: queryItem,
      policy: "relevance-frontier",
      budget: 35,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["matching"])
    expect(result.f1).toBe(1)
  })

  test("relevance frontier does not let active test files dominate code context", () => {
    const queryItem = {
      instance_id: "owner__repo-3456",
      query: "empty environment fallback config value",
      gold_ids: ["matching"],
      gold_files: ["src/config.ts"],
      events: [
        event({
          id: "test-context",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["tests/config.test.ts"],
          summary: "empty environment fallback config fixture",
        }),
        event({
          id: "matching",
          kind: "code-context",
          order: 2,
          tokens: 30,
          files: ["src/config.ts"],
          summary: "empty environment fallback config value",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "relevance-frontier",
      budget: 35,
      activeFiles: ["tests/config.test.ts"],
      query: queryItem.query,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["matching"])
  })

  test("relevance frontier prefers implementation paths over test hard negatives", () => {
    const queryItem = {
      instance_id: "owner__repo-4567",
      query: "empty environment fallback config value",
      gold_ids: ["matching"],
      gold_files: ["src/config.ts"],
      events: [
        event({
          id: "test-context",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["tests/config.test.ts"],
          summary: "empty environment fallback config value",
        }),
        event({
          id: "matching",
          kind: "code-context",
          order: 2,
          tokens: 30,
          files: ["src/config.ts"],
          summary: "empty environment fallback config value",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "relevance-frontier",
      budget: 35,
      query: queryItem.query,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["matching"])
  })

  test("adaptive frontier preserves implementation path preference", () => {
    const queryItem = {
      instance_id: "owner__repo-4568",
      query: "empty environment fallback config value",
      gold_ids: ["matching"],
      gold_files: ["src/config.ts"],
      events: [
        event({
          id: "test-context",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["tests/config.test.ts"],
          summary: "empty environment fallback config value",
        }),
        event({
          id: "matching",
          kind: "code-context",
          order: 2,
          tokens: 30,
          files: ["src/config.ts"],
          summary: "empty environment fallback config value",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "adaptive-frontier",
      budget: 35,
      query: queryItem.query,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["matching"])
  })

  test("relevance frontier matches issue terms against code identifiers", () => {
    const queryItem = {
      instance_id: "owner__repo-7890",
      query: "load config selected value",
      gold_ids: ["matching"],
      gold_files: ["src/config.ts"],
      events: [
        event({
          id: "distractor",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/cache.ts"],
          summary: "load cached selected value from a helper",
        }),
        event({
          id: "matching",
          kind: "code-context",
          order: 2,
          tokens: 30,
          files: ["src/config.ts"],
          summary: "function loadConfig() { return selectedValues }",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "relevance-frontier",
      budget: 35,
      query: queryItem.query,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["matching"])
  })

  test("coherence frontier expands from a matched implementation file", () => {
    const queryItem = {
      instance_id: "owner__repo-2468",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "test-context",
          kind: "code-context",
          order: 2,
          tokens: 25,
          files: ["tests/time.test.ts"],
          summary: "timezone conversion fixture",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 3,
          tokens: 25,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "coherence-frontier",
      budget: 55,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["entry", "neighbor"])
  })

  test("file frontier carries adjacent context from the strongest file cluster", () => {
    const queryItem = {
      instance_id: "owner__repo-1357",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 25,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "distractor",
          kind: "code-context",
          order: 3,
          tokens: 30,
          files: ["src/parser.ts"],
          summary: "timezone conversion offset parser fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "file-frontier",
      budget: 55,
      query: queryItem.query,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["entry", "neighbor"])
  })

  test("adaptive frontier carries adjacent context from the strongest file cluster", () => {
    const queryItem = {
      instance_id: "owner__repo-1358",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 25,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "distractor",
          kind: "code-context",
          order: 3,
          tokens: 30,
          files: ["src/parser.ts"],
          summary: "timezone conversion offset parser fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "adaptive-frontier",
      budget: 55,
      query: queryItem.query,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["entry", "neighbor"])
  })

  test("fusion frontier carries consensus context from stable ranks", () => {
    const queryItem = {
      instance_id: "owner__repo-1359",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 25,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "test-context",
          kind: "code-context",
          order: 3,
          tokens: 30,
          files: ["tests/time.test.ts"],
          summary: "timezone conversion offset fixture",
        }),
        event({
          id: "distractor",
          kind: "code-context",
          order: 4,
          tokens: 30,
          files: ["src/parser.ts"],
          summary: "timezone conversion offset parser fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "fusion-frontier",
      budget: 55,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["entry", "neighbor"])
  })

  test("portfolio frontier selects a coherent deterministic frontier", () => {
    const queryItem = {
      instance_id: "owner__repo-1360",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 25,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "test-context",
          kind: "code-context",
          order: 3,
          tokens: 30,
          files: ["tests/time.test.ts"],
          summary: "timezone conversion offset fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const selection = SessionContextLedger.select({
      events: queryItem.events,
      policy: "portfolio-frontier",
      budget: 55,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })

    expect(selection.events.map((event) => event.id)).toEqual(["entry", "neighbor"])
  })

  test("robust frontier selects a stability-oriented deterministic frontier", () => {
    const queryItem = {
      instance_id: "owner__repo-1361",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 25,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "test-context",
          kind: "code-context",
          order: 3,
          tokens: 30,
          files: ["tests/time.test.ts"],
          summary: "timezone conversion offset fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const tight = SessionContextLedger.select({
      events: queryItem.events,
      policy: "robust-frontier",
      budget: 55,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const mid = SessionContextLedger.select({
      events: queryItem.events,
      policy: "robust-frontier",
      budget: 800,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })

    expect(tight.events.map((event) => event.id)).toEqual(["entry", "neighbor"])
    expect(mid.events.map((event) => event.id)).toEqual(["entry", "neighbor", "test-context"])
  })

  test("utility frontier selects a utility-oriented deterministic frontier", () => {
    const queryItem = {
      instance_id: "owner__repo-1362",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 30,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 25,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "test-context",
          kind: "code-context",
          order: 3,
          tokens: 30,
          files: ["tests/time.test.ts"],
          summary: "timezone conversion offset fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const tight = SessionContextLedger.select({
      events: queryItem.events,
      policy: "utility-frontier",
      budget: 55,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const large = SessionContextLedger.select({
      events: queryItem.events,
      policy: "utility-frontier",
      budget: 1200,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })

    expect(tight.events.map((event) => event.id)).toEqual(["entry", "neighbor"])
    expect(large.events.map((event) => event.id)).toEqual(["entry", "neighbor", "test-context"])
  })

  test("target-balanced frontier follows multi-target budget evidence", () => {
    const queryItem = {
      instance_id: "owner__repo-1363",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 600,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 550,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "test-context",
          kind: "code-context",
          order: 3,
          tokens: 550,
          files: ["tests/time.test.ts"],
          summary: "timezone conversion offset fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const tight = SessionContextLedger.select({
      events: queryItem.events,
      policy: "target-balanced-frontier",
      budget: 1_000,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const tightFile = SessionContextLedger.select({
      events: queryItem.events,
      policy: "file-frontier",
      budget: 1_000,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const large = SessionContextLedger.select({
      events: queryItem.events,
      policy: "target-balanced-frontier",
      budget: 1_200,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const largeFusion = SessionContextLedger.select({
      events: queryItem.events,
      policy: "fusion-frontier",
      budget: 1_200,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })

    expect(tight.policy).toBe("target-balanced-frontier")
    expect(tight.events.map((event) => event.id)).toEqual(tightFile.events.map((event) => event.id))
    expect(large.policy).toBe("target-balanced-frontier")
    expect(large.events.map((event) => event.id)).toEqual(largeFusion.events.map((event) => event.id))
  })

  test("official frontier follows official evaluator budget evidence", () => {
    const queryItem = {
      instance_id: "owner__repo-1364",
      query: "timezone conversion offset",
      gold_ids: ["entry", "neighbor"],
      gold_files: ["src/time.ts"],
      events: [
        event({
          id: "entry",
          kind: "code-context",
          order: 1,
          tokens: 180,
          files: ["src/time.ts"],
          summary: "timezone conversion offset implementation",
        }),
        event({
          id: "neighbor",
          kind: "code-context",
          order: 2,
          tokens: 170,
          files: ["src/time.ts"],
          summary: "normalize zone delta helper",
        }),
        event({
          id: "test-context",
          kind: "code-context",
          order: 3,
          tokens: 180,
          files: ["tests/time.test.ts"],
          summary: "timezone conversion offset fixture",
        }),
      ],
    } satisfies SessionContextLedgerBenchmark.Case
    const tight = SessionContextLedger.select({
      events: queryItem.events,
      policy: "official-frontier",
      budget: 400,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const tightAdaptive = SessionContextLedger.select({
      events: queryItem.events,
      policy: "adaptive-frontier",
      budget: 400,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const large = SessionContextLedger.select({
      events: queryItem.events,
      policy: "official-frontier",
      budget: 800,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const largeFusion = SessionContextLedger.select({
      events: queryItem.events,
      policy: "fusion-frontier",
      budget: 800,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const veryLarge = SessionContextLedger.select({
      events: queryItem.events,
      policy: "official-frontier",
      budget: 1_200,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })
    const veryLargeAdaptive = SessionContextLedger.select({
      events: queryItem.events,
      policy: "adaptive-frontier",
      budget: 1_200,
      activeFiles: ["tests/time.test.ts"],
      query: queryItem.query,
    })

    expect(tight.policy).toBe("official-frontier")
    expect(tight.events.map((event) => event.id)).toEqual(tightAdaptive.events.map((event) => event.id))
    expect(large.policy).toBe("official-frontier")
    expect(large.events.map((event) => event.id)).toEqual(largeFusion.events.map((event) => event.id))
    expect(veryLarge.policy).toBe("official-frontier")
    expect(veryLarge.events.map((event) => event.id)).toEqual(veryLargeAdaptive.events.map((event) => event.id))
  })

  test("exports selected ContextBench spans in prediction output", () => {
    const [converted] = SessionContextLedgerBenchmark.fromContextBenchRowsResponse({
      rows: [
        {
          row: {
            instance_id: "SWE-Bench-Verified__python__bug__abc123",
            original_inst_id: "example__repo-1",
            repo: "example/repo",
            repo_url: "https://github.com/example/repo.git",
            language: "python",
            base_commit: "abc123",
            gold_context: JSON.stringify([
              { file: "src/config.py", start_line: 10, end_line: 20, content: "def load_config(): pass" },
            ]),
            patch: "",
            test_patch: "",
            problem_statement: "Config fallback should reject an empty environment value.",
            f2p: "[]",
            p2p: "[]",
            source: "Verified",
          },
        },
      ],
    })
    const selection = SessionContextLedger.select({
      events: converted.events,
      policy: "balanced-frontier",
      budget: 80,
    })
    const prediction = SessionContextLedgerBenchmark.toPrediction({
      instanceID: converted.instance_id,
      selection,
    })
    const result = SessionContextLedgerBenchmark.evaluateCase({
      item: converted,
      policy: "balanced-frontier",
      budget: 80,
    })

    expect(prediction.traj_data.pred_files).toEqual(["src/config.py"])
    expect(prediction.traj_data.pred_steps[0]?.spans).toEqual({
      "src/config.py": [{ type: "line", start: 10, end: 20 }],
    })
    expect(prediction.traj_data.pred_spans).toEqual({
      "src/config.py": [{ type: "line", start: 10, end: 20 }],
    })
    expect(result.spanF1).toBe(1)
    expect(result.lineF1).toBe(1)
  })

  test("converts OpenCode exports into ContextBench prediction trajectories", () => {
    const prediction = SessionContextLedgerBenchmark.toPredictionFromOpenCodeExport(
      {
        info: { id: "ses_example" },
        messages: [
          {
            info: { id: "msg_user", role: "user" },
            parts: [
              {
                type: "file",
                source: {
                  type: "file",
                  path: "src/config.ts",
                  text: { value: "export const config = {}", start: 4, end: 8 },
                },
              },
            ],
          },
          {
            info: { id: "msg_assistant", role: "assistant" },
            parts: [
              {
                type: "tool",
                tool: "read",
                state: {
                  status: "completed",
                  input: { filePath: "tests/config.test.ts" },
                  output: "",
                  metadata: {
                    display: { type: "file", path: "tests/config.test.ts", lineStart: 3, lineEnd: 7 },
                  },
                },
              },
              {
                type: "patch",
                files: ["src/config.ts", "tests/config.test.ts"],
              },
            ],
          },
        ],
      },
      { instanceID: "owner__repo-1234" },
    )

    expect(prediction.instance_id).toBe("owner__repo-1234")
    expect(prediction.traj_data.pred_files).toEqual(["src/config.ts", "tests/config.test.ts"])
    expect(prediction.traj_data.pred_spans).toEqual({
      "src/config.ts": [{ type: "line", start: 4, end: 8 }],
      "tests/config.test.ts": [{ type: "line", start: 3, end: 7 }],
    })
    expect(prediction.traj_data.pred_steps).toHaveLength(3)
  })

  test("converts V2 session messages into ContextBench prediction trajectories", () => {
    const prediction = SessionContextLedgerBenchmark.toPredictionFromSessionMessages({
      instanceID: "owner__repo-5678",
      messages: [
        new SessionMessage.Assistant({
          id: id("v2-assistant"),
          type: "assistant",
          agent: "build",
          model,
          content: [
            new SessionMessage.AssistantTool({
              type: "tool",
              id: "read-1",
              name: "read",
              state: new SessionMessage.ToolStateCompleted({
                status: "completed",
                input: { path: "src/config.ts", offset: 10, limit: 3 },
                structured: {
                  type: "text-page",
                  content: "export function loadConfig() {\n  return env\n}",
                  mime: "text/typescript",
                  offset: 10,
                  truncated: false,
                },
                content: [],
                outputPaths: [],
              }),
              time: { created, ran: created, completed: created },
            }),
            new SessionMessage.AssistantTool({
              type: "tool",
              id: "grep-1",
              name: "grep",
              state: new SessionMessage.ToolStateCompleted({
                status: "completed",
                input: { pattern: "loadConfig" },
                structured: {
                  value: [
                    {
                      entry: { path: "src/config.ts", type: "file" },
                      line: 42,
                      text: "export function loadConfig() {",
                    },
                  ],
                },
                content: [],
                outputPaths: [],
              }),
              time: { created, ran: created, completed: created },
            }),
          ],
          time: { created },
        }),
      ],
    })

    expect(prediction.instance_id).toBe("owner__repo-5678")
    expect(prediction.traj_data.pred_files).toEqual(["src/config.ts"])
    expect(prediction.traj_data.pred_spans).toEqual({
      "src/config.ts": [
        { type: "line", start: 10, end: 12 },
        { type: "line", start: 42, end: 42 },
      ],
    })
  })

  test("parses file spans from OpenCode read tool output text", () => {
    const prediction = SessionContextLedgerBenchmark.toPredictionFromOpenCodeExport({
      info: { id: "ses_example" },
      messages: [
        {
          info: { id: "msg_assistant", role: "assistant" },
          parts: [
            {
              type: "tool",
              tool: "read",
              state: {
                status: "completed",
                input: {},
                output: [
                  "<path>src/query.ts</path>",
                  "<type>file</type>",
                  "<content>",
                  "12: export function query() {",
                  "13:   return true",
                  "14: }",
                  "(End of file - total 14 lines)",
                  "</content>",
                ].join("\n"),
                metadata: {},
              },
            },
          ],
        },
      ],
    })

    expect(prediction.traj_data.pred_files).toEqual(["src/query.ts"])
    expect(prediction.traj_data.pred_spans).toEqual({
      "src/query.ts": [{ type: "line", start: 12, end: 14 }],
    })
  })

  test("diverse frontier keeps searching after an oversized candidate", () => {
    const events = [
      event({ id: "must", kind: "instruction", order: 1, tokens: 45, mustPreserve: true, recoverability: "low" }),
      event({ id: "oversized", kind: "diff", order: 2, tokens: 40, files: ["src/config.ts"] }),
      event({ id: "small", kind: "assistant-note", order: 3, tokens: 10, files: ["tests/config.test.ts"] }),
    ]
    const selection = SessionContextLedger.select({
      events,
      policy: "diverse-frontier",
      budget: 60,
      activeFiles: ["src/config.ts", "tests/config.test.ts"],
    })

    expect(selection.events.map((selected) => selected.id)).toEqual(["must", "small"])
  })
})
