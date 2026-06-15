#!/usr/bin/env bun

import { DateTime } from "effect"
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from "fs"
import { dirname, extname, isAbsolute, join, relative } from "path"
import { parseArgs } from "util"
import { ModelV2 } from "../src/model"
import { ProviderV2 } from "../src/provider"
import { SessionContextLedger } from "../src/session/context-ledger"
import { SessionContextLedgerBenchmark } from "../src/session/context-ledger-benchmark"
import { SessionMessage } from "../src/session/message"

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    "analysis-output": { type: "string" },
    "agent-retrieval-bench-chunks": { type: "string" },
    "agent-retrieval-bench-corpus-manifest": { type: "string" },
    "agent-retrieval-bench-corpus-root": { type: "string" },
    "agent-retrieval-bench-include-query": { type: "boolean" },
    "agent-retrieval-bench-ranking-context-budget": { type: "string" },
    "agent-retrieval-bench-ranking-output": { type: "string" },
    "agent-retrieval-bench-ranking-strategy": { type: "string" },
    "agent-retrieval-bench-max-chunks": { type: "string" },
    "agent-retrieval-bench-samples": { type: "string" },
    "benchmark-registry-output": { type: "string" },
    budget: { type: "string", short: "b" },
    budgets: { type: "string" },
    contextbench: { type: "boolean" },
    "contextbench-config": { type: "string" },
    "contextbench-limit": { type: "string" },
    "contextbench-offset": { type: "string" },
    "contextbench-page-size": { type: "string" },
    "contextbench-split": { type: "string" },
    "compaction-summary-gold": { type: "string" },
    "compaction-summary-output": { type: "string" },
    "compaction-survival-input": { type: "string" },
    "compaction-survival-output": { type: "string" },
    "compaction-survival-policy": { type: "string" },
    "experience-replay-input": { type: "string" },
    "experience-replay-k": { type: "string" },
    "experience-replay-min-score": { type: "string" },
    "experience-replay-report-output": { type: "string" },
    "feature-router-output": { type: "string" },
    "feature-router-eval-output": { type: "string" },
    "feature-router-min-validation-gain": { type: "string" },
    "feature-router-rules-input": { type: "string" },
    "feature-router-rules-output": { type: "string" },
    "feature-router-target": { type: "string" },
    "feature-router-validation-folds": { type: "string" },
    "gold-output": { type: "string" },
    "include-problem": { type: "boolean" },
    "include-test-code-context": { type: "boolean" },
    "instance-id": { type: "string" },
    input: { type: "string", short: "i" },
    "max-gold-spans": { type: "string" },
    "max-test-code-contexts": { type: "string" },
    "max-tests": { type: "string" },
    "official-eval-cache": { type: "string" },
    "official-eval-module": { type: "string" },
    "official-eval-output": { type: "string" },
    "official-eval-python": { type: "string" },
    "official-eval-pythonpath": { type: "string" },
    "official-policy-report-output": { type: "string" },
    "official-policy-report-policies": { type: "string" },
    "official-summary-input": { type: "string" },
    "official-summary-output": { type: "string" },
    "opencode-compaction-summary-manifest": { type: "string" },
    "opencode-export": { type: "string" },
    "opencode-export-manifest": { type: "string" },
    "opencode-messages": { type: "string" },
    "opencode-noisy-compaction-live-command-json": { type: "string" },
    "opencode-noisy-compaction-live-env-json": { type: "string" },
    "opencode-noisy-compaction-live-manifest": { type: "string" },
    "opencode-noisy-compaction-live-output-dir": { type: "string" },
    "opencode-noisy-continuation-live-report": { type: "string" },
    "opencode-noisy-continuation-output": { type: "string" },
    "opencode-noisy-continuation-repeats": { type: "string" },
    "opencode-run-command-json": { type: "string" },
    "opencode-run-config-json": { type: "string" },
    "opencode-run-env-json": { type: "string" },
    "opencode-run-export-manifest-output": { type: "string" },
    "opencode-run-extra-args-json": { type: "string" },
    "opencode-run-manifest": { type: "string" },
    "opencode-run-model": { type: "string" },
    "opencode-run-output-dir": { type: "string" },
    "opencode-run-report-output": { type: "string" },
    "opencode-run-variant": { type: "string" },
    "noisy-compaction-fixtures-distractor-turns": { type: "string" },
    "noisy-compaction-fixtures-output-dir": { type: "string" },
    "noisy-compaction-fixtures-scenarios": { type: "string" },
    "noisy-compaction-fixtures-timestamp": { type: "string" },
    policies: { type: "string" },
    "portfolio-objective": { type: "string" },
    "portfolio-max-heldout-loss": { type: "string" },
    "portfolio-report-output": { type: "string" },
    "portfolio-stability-report-output": { type: "string" },
    "portfolio-stability-split-inputs": { type: "string" },
    "portfolio-stability-split-labels": { type: "string" },
    "portfolio-target": { type: "string" },
    "portfolio-targets": { type: "string" },
    "prediction-output": { type: "string" },
    "prediction-eval-gold": { type: "string" },
    "prediction-eval-output": { type: "string" },
    "prediction-policy": { type: "string" },
    "promotion-min-heldout-gain": { type: "string" },
    "promotion-report-output": { type: "string" },
    "promotion-split-inputs": { type: "string" },
    "promotion-split-labels": { type: "string" },
    "router-folds": { type: "string" },
    "router-output": { type: "string" },
    "selection-delta-baseline": { type: "string" },
    "selection-delta-limit": { type: "string" },
    "selection-delta-output": { type: "string" },
    "selection-delta-policy": { type: "string" },
    "stability-report-output": { type: "string" },
    "stability-split-inputs": { type: "string" },
    "stability-split-labels": { type: "string" },
    "stability-target": { type: "string" },
    "swe-contextbench-experience-input": { type: "string" },
    "swe-contextbench-experience-output": { type: "string" },
    "swe-contextbench-related-instance-ids": { type: "string" },
    "swe-contextbench-relationship-input": { type: "string" },
    "swe-explore": { type: "string" },
    "swe-explore-auto-issue-map": { type: "boolean" },
    "swe-explore-auto-source-map": { type: "boolean" },
    "swe-explore-core-only": { type: "boolean" },
    "swe-explore-chunk-lines": { type: "string" },
    "swe-explore-chunk-sweep-lines": { type: "string" },
    "swe-explore-chunk-sweep-output": { type: "string" },
    "swe-explore-chunk-overlap": { type: "string" },
    "swe-explore-datasets": { type: "string" },
    "swe-explore-issue-map": { type: "string" },
    "swe-explore-instance-ids": { type: "string" },
    "swe-explore-limit": { type: "string" },
    "swe-explore-max-optional-regions": { type: "string" },
    "swe-explore-max-repo-chunks": { type: "string" },
    "swe-explore-max-repo-files": { type: "string" },
    "swe-explore-multiscale-chunk-lines": { type: "string" },
    "swe-explore-official-output": { type: "string" },
    "swe-explore-official-summary-output": { type: "string" },
    "swe-explore-oracle-report-output": { type: "string" },
    "swe-explore-offset": { type: "string" },
    "swe-explore-optional-models": { type: "string" },
    "swe-explore-prepare-repos": { type: "boolean" },
    "swe-explore-prepare-repos-cache": { type: "string" },
    "swe-explore-prepare-repos-output": { type: "string" },
    "swe-explore-ranker-gate-transfer-inputs": { type: "string" },
    "swe-explore-ranker-gate-transfer-labels": { type: "string" },
    "swe-explore-ranker-gate-transfer-output": { type: "string" },
    "swe-explore-ranker-gate-epsilon": { type: "string" },
    "swe-explore-ranker-gate-repo-fold-input": { type: "string" },
    "swe-explore-ranker-gate-repo-fold-output": { type: "string" },
    "swe-explore-ranker-gate-repo-folds": { type: "string" },
    "swe-explore-ranker-gate-report-inputs": { type: "string" },
    "swe-explore-ranker-gate-report-labels": { type: "string" },
    "swe-explore-ranker-gate-report-output": { type: "string" },
    "swe-explore-ranker-portfolio-max-heldout-loss": { type: "string" },
    "swe-explore-ranker-portfolio-inputs": { type: "string" },
    "swe-explore-ranker-portfolio-labels": { type: "string" },
    "swe-explore-ranker-portfolio-output": { type: "string" },
    "swe-explore-ranker-portfolio-stability-inputs": { type: "string" },
    "swe-explore-ranker-portfolio-stability-labels": { type: "string" },
    "swe-explore-ranker-portfolio-stability-output": { type: "string" },
    "swe-explore-ranker-portfolio-target": { type: "string" },
    "swe-explore-ranker-sweep-merge-inputs": { type: "string" },
    "swe-explore-ranker-sweep-merge-output": { type: "string" },
    "swe-explore-ranker-sweep-output": { type: "string" },
    "swe-explore-ranker-sweep-progress": { type: "boolean" },
    "swe-explore-ranker-sweep-rankers": { type: "string" },
    "swe-explore-repo-candidates": { type: "boolean" },
    "swe-explore-repo-ranker": { type: "string" },
    "swe-explore-repos-root": { type: "string" },
    "swe-explore-source-map": { type: "string" },
    "swe-explore-source-map-output": { type: "string" },
    "swe-explore-split-labels": { type: "string" },
    "swe-explore-split-output": { type: "string" },
    "swe-explore-split-seed": { type: "string" },
    "swe-explore-split-sizes": { type: "string" },
    "target-report-output": { type: "string" },
    "target-report-targets": { type: "string" },
    "write-cases": { type: "string" },
  },
})
const created = DateTime.makeUnsafe(0)
const id = (value: string) => SessionMessage.ID.make(`msg_${value}`)
const model = { providerID: ProviderV2.ID.make("openai"), id: ModelV2.ID.make("gpt-5.5") }
const selectedPolicies = parsePolicies(
  args.values.policies ?? SessionContextLedger.SELECTION_POLICIES.join(","),
  "--policies",
)
const sweExploreRankerGateMinimumGain = numberAtLeast(
  args.values["swe-explore-ranker-gate-epsilon"] ?? "0",
  "--swe-explore-ranker-gate-epsilon",
  0,
)

const SKIPPED_REPO_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  ".tox",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
])

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".mjs",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scala",
  ".sh",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
])
const SWE_EXPLORE_REPO_RANKERS = [
  "lexical",
  "bm25",
  "structural",
  "content-structural",
  "content-backfill",
  "structural-neighbor",
  "dependency-neighbor",
  "anchored-neighbor",
  "hybrid-rrf",
] as const
type SWEExploreRepoRanker = (typeof SWE_EXPLORE_REPO_RANKERS)[number]
const DEFAULT_SWE_EXPLORE_RANKER_SWEEP_RANKERS = [
  "lexical",
  "bm25",
  "structural",
  "structural-neighbor",
  "hybrid-rrf",
] as const satisfies readonly SWEExploreRepoRanker[]
const CONTENT_STRUCTURAL_PREFILTER_BYTES = 96_000
const CONTENT_BACKFILL_STRUCTURAL_SHARE = 0.8
const SWE_EXPLORE_RANKER_SWEEP_FEATURE_KEYS = [
  "eventCount",
  "fileCount",
  "totalLineCost",
  "averageChunkLines",
  "averageEventsPerFile",
  "maxFileClusterShare",
  "smallChunkShare",
  "mediumChunkShare",
  "largeChunkShare",
  "implementationPathShare",
  "testPathShare",
  "noisyPathShare",
  "queryTermCount",
  "queryCandidateTermOverlap",
] as const satisfies readonly (keyof SWEExploreRankerSweepFeatures)[]
const SWE_EXPLORE_RANKER_COMPARISON_FEATURE_KEYS = [
  "fileJaccard",
  "baselineRetainedFileShare",
  "candidateNewFileShare",
  "eventJaccard",
  "baselineRetainedEventShare",
  "candidateNewEventShare",
] as const satisfies readonly (keyof SWEExploreRankerComparisonFeatures)[]
const SWE_EXPLORE_RANKER_PORTFOLIO_TARGETS = [
  "f1",
  "recall",
  "precision",
  "first-useful-hit",
  "f1-first-useful",
] as const
type SWEExploreRankerPortfolioTarget = (typeof SWE_EXPLORE_RANKER_PORTFOLIO_TARGETS)[number]
const STRUCTURAL_NEIGHBOR_MAX_SEEDS_PER_FILE = 24
const STRUCTURAL_NEIGHBOR_MAX_LINE_GAP = 240
const STRUCTURAL_NEIGHBOR_BONUS_PER_POINT = 0.35
const STRUCTURAL_NEIGHBOR_MAX_BONUS = 3
const DEPENDENCY_NEIGHBOR_MAX_SEEDS_PER_FILE = 8
const DEPENDENCY_NEIGHBOR_BONUS_PER_POINT = 0.22
const DEPENDENCY_NEIGHBOR_MAX_BONUS = 2.5
const ANCHORED_NEIGHBOR_MAX_SEEDS_PER_FILE = 8
const ANCHORED_NEIGHBOR_MIN_SEED_CONFIDENCE = 3
const ANCHORED_NEIGHBOR_MAX_LINE_GAP = 160
const ANCHORED_NEIGHBOR_BONUS_PER_POINT = 0.22
const ANCHORED_NEIGHBOR_MAX_BONUS = 1.75
const HYBRID_RRF_K = 60
const HYBRID_RRF_PATH_BONUS_SCALE = 0.01
const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "be",
  "but",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
])
const CODE_QUERY_STOP_WORDS = new Set([
  ...SEARCH_STOP_WORDS,
  "actual",
  "bug",
  "case",
  "error",
  "expected",
  "fail",
  "fails",
  "failing",
  "issue",
  "problem",
  "test",
  "tests",
  "using",
  "version",
])
const IMPORT_KEYWORDS = new Set(["as", "default", "export", "from", "import", "require", "type"])

const SWE_EXPLORE_ISSUE_DATASETS = {
  verified: { dataset: "princeton-nlp/SWE-bench_Verified", config: "default", split: "test" },
  multilingual: { dataset: "SWE-bench/SWE-bench_Multilingual", config: "default", split: "test" },
  pro: { dataset: "ScaleAI/SWE-bench_Pro", config: "default", split: "test" },
} as const

type SWEExploreSourceRecord = {
  readonly instance_id: string
  readonly source_instance_id?: string
  readonly dataset?: string
  readonly repo?: string
  readonly repo_url?: string
  readonly base_commit?: string
  readonly problem_statement?: string
}

const entries = [
  {
    seq: 1,
    message: new SessionMessage.System({
      id: id("system"),
      type: "system",
      text: "Keep public API stable.",
      time: { created },
    }),
  },
  {
    seq: 2,
    message: new SessionMessage.User({
      id: id("user"),
      type: "user",
      text: "Fix src/config.ts without changing loadConfig().",
      files: [],
      agents: [],
      time: { created },
    }),
  },
  {
    seq: 3,
    message: new SessionMessage.Shell({
      id: id("testfail"),
      type: "shell",
      callID: "shell-1",
      command: "bun test tests/config.test.ts",
      output: "FAILED tests/config.test.ts expected empty env value to block fallback",
      time: { created, completed: created },
    }),
  },
  {
    seq: 4,
    message: new SessionMessage.Shell({
      id: id("noise"),
      type: "shell",
      callID: "shell-2",
      command: "bun install",
      output: "Installed many packages with verbose unrelated output ".repeat(80),
      time: { created, completed: created },
    }),
  },
  {
    seq: 5,
    message: new SessionMessage.Assistant({
      id: id("assistant"),
      type: "assistant",
      agent: "build",
      model,
      content: [
        new SessionMessage.AssistantText({
          type: "text",
          id: "text-1",
          text: "Patch src/config.ts to preserve the API and update tests/config.test.ts.",
        }),
      ],
      time: { created },
    }),
  },
  {
    seq: 6,
    message: new SessionMessage.Shell({
      id: id("late-noise"),
      type: "shell",
      callID: "shell-3",
      command: "cat README.md",
      output: "Historical notes unrelated to config fallback ".repeat(40),
      time: { created, completed: created },
    }),
  },
] satisfies SessionContextLedger.Entry[]

const goldIDs = ["msg_system:system", "msg_user:user", "msg_testfail:shell", "msg_assistant:text:text-1"]
const goldFiles = ["src/config.ts", "tests/config.test.ts"]
const events = SessionContextLedger.fromEntries(entries)
const syntheticItem = {
  instance_id: "synthetic-config-fallback",
  gold_ids: goldIDs,
  gold_files: goldFiles,
  events,
} satisfies SessionContextLedgerBenchmark.Case

type OpenCodeRunReportRow = {
  readonly instanceID: string
  readonly runID: string
  readonly label: string
  readonly repeatIndex?: number
  readonly repeatCount?: number
  readonly title?: string
  readonly sessionID: string
  readonly turns: number
  readonly requestedModel: string
  readonly requestedVariant: string
  readonly exportedModel?: {
    readonly providerID?: string
    readonly modelID?: string
    readonly variant?: string
  }
  readonly config?: unknown
  readonly artifacts: {
    readonly importStdout?: string
    readonly importStderr?: string
    readonly runStdout: string
    readonly runStderr: string
    readonly exportJson: string
    readonly exportStderr: string
  }
  readonly tokens?: {
    readonly input: number
    readonly output: number
    readonly reasoning: number
    readonly cacheRead: number
    readonly cacheWrite: number
  }
  readonly answer?: OpenCodeRunAnswerReport
  readonly fileChecks?: OpenCodeRunFileCheckReport
  readonly commandChecks?: OpenCodeRunCommandCheckReport
  readonly metrics?: SessionContextLedgerBenchmark.PredictionEvaluationRow
}

type OpenCodeRunAnswerReport = {
  readonly finalText: string
  readonly contains: readonly {
    readonly text: string
    readonly matched: boolean
  }[]
  readonly regex?: {
    readonly pattern: string
    readonly matched: boolean
  }
  readonly passed: boolean
}

type OpenCodeRunFileCheckReport = {
  readonly checks: readonly {
    readonly path: string
    readonly exists: boolean
    readonly contains: readonly {
      readonly text: string
      readonly matched: boolean
    }[]
    readonly notContains: readonly {
      readonly text: string
      readonly matched: boolean
    }[]
    readonly regex?: {
      readonly pattern: string
      readonly matched: boolean
    }
    readonly passed: boolean
  }[]
  readonly passed: boolean
}

type OpenCodeRunCommandCheckReport = {
  readonly checks: readonly {
    readonly command: readonly string[]
    readonly exitCode: number
    readonly expectedExitCode: number
    readonly stdoutPath: string
    readonly stderrPath: string
    readonly contains: readonly {
      readonly text: string
      readonly matched: boolean
    }[]
    readonly notContains: readonly {
      readonly text: string
      readonly matched: boolean
    }[]
    readonly regex?: {
      readonly pattern: string
      readonly matched: boolean
    }
    readonly passed: boolean
  }[]
  readonly passed: boolean
}

type OpenCodeRunReport = {
  readonly generatedBy: "context-ledger-benchmark"
  readonly kind: "opencode-run-report"
  readonly rows: readonly OpenCodeRunReportRow[]
  readonly summaries: readonly {
    readonly label: string
    readonly runs: number
    readonly fileF1?: number
    readonly spanF1?: number
    readonly lineF1?: number
    readonly aucLineCoverage?: number
    readonly answerPassRate?: number
    readonly stddevAnswerPassRate?: number
    readonly minAnswerPassed?: number
    readonly maxAnswerPassed?: number
    readonly fileCheckPassRate?: number
    readonly commandCheckPassRate?: number
    readonly meanPromptTokens?: number
    readonly stddevPromptTokens?: number
    readonly minPromptTokens?: number
    readonly maxPromptTokens?: number
    readonly meanInputTokens?: number
    readonly stddevInputTokens?: number
    readonly minInputTokens?: number
    readonly maxInputTokens?: number
    readonly meanOutputTokens?: number
    readonly stddevOutputTokens?: number
    readonly minOutputTokens?: number
    readonly maxOutputTokens?: number
    readonly meanReasoningTokens?: number
    readonly stddevReasoningTokens?: number
    readonly minReasoningTokens?: number
    readonly maxReasoningTokens?: number
    readonly meanCacheReadTokens?: number
    readonly stddevCacheReadTokens?: number
    readonly minCacheReadTokens?: number
    readonly maxCacheReadTokens?: number
    readonly meanCacheWriteTokens?: number
    readonly stddevCacheWriteTokens?: number
    readonly minCacheWriteTokens?: number
    readonly maxCacheWriteTokens?: number
  }[]
  readonly pairedSummaries: readonly {
    readonly instanceID: string
    readonly baselineLabel: string
    readonly candidateLabel: string
    readonly pairs: number
    readonly meanAnswerPassedDelta?: number
    readonly stddevAnswerPassedDelta?: number
    readonly meanPromptTokensDelta?: number
    readonly stddevPromptTokensDelta?: number
    readonly minPromptTokensDelta?: number
    readonly maxPromptTokensDelta?: number
    readonly meanInputTokensDelta?: number
    readonly stddevInputTokensDelta?: number
    readonly minInputTokensDelta?: number
    readonly maxInputTokensDelta?: number
    readonly meanOutputTokensDelta?: number
    readonly stddevOutputTokensDelta?: number
    readonly minOutputTokensDelta?: number
    readonly maxOutputTokensDelta?: number
    readonly meanReasoningTokensDelta?: number
    readonly stddevReasoningTokensDelta?: number
    readonly minReasoningTokensDelta?: number
    readonly maxReasoningTokensDelta?: number
  }[]
  readonly pairedComparisons: readonly {
    readonly instanceID: string
    readonly baselineRunID: string
    readonly candidateRunID: string
    readonly baselineLabel: string
    readonly candidateLabel: string
    readonly repeatIndex?: number
    readonly delta: {
      readonly fileF1?: number
      readonly spanF1?: number
      readonly lineF1?: number
      readonly aucLineCoverage?: number
      readonly answerPassed?: number
      readonly fileChecksPassed?: number
      readonly commandChecksPassed?: number
      readonly promptTokens?: number
      readonly inputTokens?: number
      readonly outputTokens?: number
      readonly reasoningTokens?: number
      readonly cacheReadTokens?: number
      readonly cacheWriteTokens?: number
    }
  }[]
}

type NoisyCompactionLiveManifestRow = {
  readonly scenario_id: string
  readonly instance_id: string
  readonly baseline_session_id: string
  readonly precision_session_id: string
  readonly baseline_import_path: string
  readonly precision_import_path: string
  readonly gold_path: string
  readonly summarize_request: {
    readonly providerID: string
    readonly modelID: string
    readonly variant?: string
    readonly auto?: boolean
  }
  readonly baseline_config: unknown
  readonly precision_config: unknown
}

type NoisyCompactionFixtureManifestRow = NoisyCompactionLiveManifestRow & {
  readonly continuation_prompt?: string
  readonly continuation_answer_contains?: readonly string[]
}

type NoisyCompactionLiveLane = "baseline" | "precision"

type NoisyCompactionLiveReportRow = {
  readonly scenarioID: string
  readonly instanceID: string
  readonly lane: NoisyCompactionLiveLane
  readonly sessionID: string
  readonly importedSessionID?: string
  readonly config: unknown
  readonly summarizeRequest: NoisyCompactionLiveManifestRow["summarize_request"]
  readonly exportedModel?: {
    readonly providerID?: string
    readonly modelID?: string
    readonly variant?: string
  }
  readonly tokens?: {
    readonly input: number
    readonly output: number
    readonly reasoning: number
    readonly cacheRead: number
    readonly cacheWrite: number
  }
  readonly summaryTokens?: number
  readonly claimRecall?: number
  readonly claimPrecision?: number
  readonly falseClaimRate?: number
  readonly unsupportedClaimRate?: number
  readonly contradictedClaimRate?: number
  readonly staleClaimRate?: number
  readonly survivedClaims?: readonly string[]
  readonly missingClaims?: readonly string[]
  readonly falseClaims?: readonly string[]
  readonly unsupportedClaims?: readonly string[]
  readonly contradictedClaims?: readonly string[]
  readonly staleClaims?: readonly string[]
  readonly artifacts: {
    readonly importStdout: string
    readonly importStderr: string
    readonly serveStdout: string
    readonly serveStderr: string
    readonly summarizeResponse: string
    readonly exportJson: string
    readonly exportStderr: string
  }
}

type NoisyCompactionLiveReport = {
  readonly generatedBy: "context-ledger-benchmark"
  readonly kind: "opencode-noisy-compaction-live-report"
  readonly manifestPath: string
  readonly outputDir: string
  readonly rows: readonly NoisyCompactionLiveReportRow[]
  readonly summaryReport: SessionContextLedgerBenchmark.OpenCodeCompactionSummaryReport
  readonly summaries: readonly {
    readonly lane: NoisyCompactionLiveLane
    readonly runs: number
    readonly meanClaimRecall?: number
    readonly meanClaimPrecision?: number
    readonly meanFalseClaimRate?: number
    readonly meanUnsupportedClaimRate?: number
    readonly meanContradictedClaimRate?: number
    readonly meanStaleClaimRate?: number
    readonly meanSummaryTokens?: number
    readonly meanPromptTokens?: number
    readonly meanInputTokens?: number
    readonly meanCacheReadTokens?: number
  }[]
  readonly pairedComparisons: readonly {
    readonly scenarioID: string
    readonly instanceID: string
    readonly baselineSessionID: string
    readonly precisionSessionID: string
    readonly delta: {
      readonly claimRecall?: number
      readonly claimPrecision?: number
      readonly falseClaimRate?: number
      readonly unsupportedClaimRate?: number
      readonly contradictedClaimRate?: number
      readonly staleClaimRate?: number
      readonly summaryTokens?: number
      readonly promptTokens?: number
      readonly inputTokens?: number
      readonly cacheReadTokens?: number
    }
  }[]
}

async function emitPredictions(predictions: readonly SessionContextLedgerBenchmark.Prediction[]) {
  const output = predictions.map((prediction) => JSON.stringify(prediction)).join("\n") + "\n"
  if (args.values["prediction-output"]) await Bun.write(args.values["prediction-output"], output)
  else process.stdout.write(output)
  if (args.values["prediction-eval-output"]) {
    if (!args.values["prediction-eval-gold"])
      throw new Error("--prediction-eval-output requires --prediction-eval-gold")
    await Bun.write(
      args.values["prediction-eval-output"],
      `${JSON.stringify(
        SessionContextLedgerBenchmark.evaluatePredictionsAgainstGold({
          predictions,
          goldRows: SessionContextLedgerBenchmark.parseContextBenchGoldJsonl(
            await Bun.file(args.values["prediction-eval-gold"]).text(),
          ),
        }),
        undefined,
        2,
      )}\n`,
    )
  }
  process.exit(0)
}

async function predictionFromManifestRow(
  row: SessionContextLedgerBenchmark.OpenCodeExportManifestRow,
  manifestPath: string,
) {
  const exportPath = resolveManifestPath(row.export_path, manifestPath)
  return SessionContextLedgerBenchmark.toPredictionFromOpenCodeExport(await Bun.file(exportPath).json(), {
    instanceID: row.instance_id,
  })
}

async function compactionSummaryInputFromManifestRow(
  row: SessionContextLedgerBenchmark.OpenCodeExportManifestRow,
  manifestPath: string,
) {
  const exportPath = resolveManifestPath(row.export_path, manifestPath)
  return {
    instanceID: row.instance_id,
    ...(row.label ? { label: row.label } : {}),
    ...(row.session_id ? { sessionID: row.session_id } : {}),
    exported: await Bun.file(exportPath).json(),
  } satisfies SessionContextLedgerBenchmark.OpenCodeCompactionSummaryInput
}

async function emitNoisyCompactionFixtures(outputDir: string) {
  mkdirSync(outputDir, { recursive: true })
  const timestamp =
    optionalIntegerAtLeast(
      args.values["noisy-compaction-fixtures-timestamp"],
      "--noisy-compaction-fixtures-timestamp",
      0,
    ) ?? Date.now()
  const fixtures = SessionContextLedgerBenchmark.buildNoisyCompactionFixtures({
    timestamp,
    directory: realpathSync(process.cwd()),
    scenarios: optionalList(args.values["noisy-compaction-fixtures-scenarios"]),
    distractorTurns: optionalIntegerAtLeast(
      args.values["noisy-compaction-fixtures-distractor-turns"],
      "--noisy-compaction-fixtures-distractor-turns",
      0,
    ),
  })
  const goldPath = join(outputDir, "gold.jsonl")
  const manifestPath = join(outputDir, "fixtures.jsonl")
  const continuationManifestPath = join(outputDir, "continuation-run-manifest.jsonl")
  const rows = await Promise.all(
    fixtures.map(async (fixture) => {
      const segment = safeFileSegment(fixture.scenario.id)
      const baselinePath = join(outputDir, `${segment}.baseline.import.json`)
      const precisionPath = join(outputDir, `${segment}.precision.import.json`)
      await Bun.write(baselinePath, `${JSON.stringify(fixture.baseline, undefined, 2)}\n`)
      await Bun.write(precisionPath, `${JSON.stringify(fixture.contextLedger, undefined, 2)}\n`)
      return {
        scenario_id: fixture.scenario.id,
        instance_id: fixture.instanceID,
        baseline_session_id: sessionIDFromExport(fixture.baseline),
        precision_session_id: sessionIDFromExport(fixture.contextLedger),
        baseline_import_path: baselinePath,
        precision_import_path: precisionPath,
        continuation_prompt: fixture.continuation.prompt,
        continuation_answer_contains: fixture.continuation.answerContains,
        gold_path: goldPath,
        summarize_request: { providerID: "openai", modelID: "gpt-5.5", variant: "high", auto: false },
        baseline_config: {
          compaction: {
            tail_turns: 1,
            preserve_recent_tokens: 2_000,
            context_ledger: { enabled: false },
          },
        },
        precision_config: {
          compaction: {
            tail_turns: 1,
            preserve_recent_tokens: 2_000,
            context_ledger: {
              enabled: true,
              policy: "precision-frontier",
              budget: 1_200,
              mode: "replace",
            },
          },
        },
      }
    }),
  )
  const continuationRows = fixtures.flatMap((fixture) => [
    noisyContinuationRunManifestRow({ fixture, lane: "baseline" }),
    noisyContinuationRunManifestRow({ fixture, lane: "precision" }),
  ])
  await Bun.write(goldPath, fixtures.map((fixture) => JSON.stringify(fixture.gold)).join("\n") + "\n")
  await Bun.write(manifestPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n")
  await Bun.write(continuationManifestPath, continuationRows.map((row) => JSON.stringify(row)).join("\n") + "\n")
  process.stdout.write(
    `${JSON.stringify(
      { outputDir, timestamp, fixtures: rows.length, manifestPath, goldPath, continuationManifestPath },
      undefined,
      2,
    )}\n`,
  )
}

function noisyContinuationRunManifestRow(input: {
  readonly fixture: SessionContextLedgerBenchmark.NoisyCompactionFixture
  readonly lane: "baseline" | "precision"
}) {
  const isBaseline = input.lane === "baseline"
  const sessionID = sessionIDFromExport(isBaseline ? input.fixture.baseline : input.fixture.contextLedger)
  const segment = safeFileSegment(input.fixture.scenario.id)
  return {
    instance_id: `${input.fixture.instanceID}_continuation`,
    run_id: `${segment}-${isBaseline ? "baseline" : "precision"}-continuation`,
    title: isBaseline ? "baseline" : "ContextLedger-precision-replace",
    dir:
      optionalStringField((isBaseline ? input.fixture.baseline : input.fixture.contextLedger).info, "directory") ??
      process.cwd(),
    model: "openai/gpt-5.5",
    variant: "high",
    extra_args: ["--pure", "--session", sessionID],
    config: isBaseline
      ? {
          compaction: {
            tail_turns: 1,
            preserve_recent_tokens: 2_000,
            context_ledger: { enabled: false },
          },
        }
      : {
          compaction: {
            tail_turns: 1,
            preserve_recent_tokens: 2_000,
            context_ledger: {
              enabled: true,
              policy: "precision-frontier",
              budget: 1_200,
              mode: "replace",
            },
          },
        },
    prompt: input.fixture.continuation.prompt,
    answer_contains: input.fixture.continuation.answerContains,
  } satisfies SessionContextLedgerBenchmark.OpenCodeRunManifestRow
}

async function emitNoisyContinuationManifestFromLiveReport(liveReportPath: string) {
  if (!args.values["opencode-noisy-continuation-output"]) {
    throw new Error("--opencode-noisy-continuation-output is required")
  }
  const outputPath = args.values["opencode-noisy-continuation-output"]
  const repeats =
    optionalIntegerAtLeast(
      args.values["opencode-noisy-continuation-repeats"],
      "--opencode-noisy-continuation-repeats",
      1,
    ) ?? 1
  const report = (await Bun.file(liveReportPath).json()) as NoisyCompactionLiveReport
  const manifestPath = resolveManifestPath(report.manifestPath, liveReportPath)
  const fixtureRows = parseNoisyCompactionFixtureManifestJsonl(await Bun.file(manifestPath).text())
  const fixtureByInstance = new Map(fixtureRows.map((row) => [row.instance_id, row]))
  const rows = await Promise.all(
    report.rows.map(async (row) => {
      const fixture = fixtureByInstance.get(row.instanceID)
      if (!fixture) throw new Error(`Missing fixture manifest row for ${row.instanceID}`)
      if (!fixture.continuation_prompt) throw new Error(`Missing continuation_prompt for ${row.instanceID}`)
      const exportPath = resolveManifestPath(row.artifacts.exportJson, liveReportPath)
      const exported = (await Bun.file(exportPath).json()) as SessionContextLedgerBenchmark.OpenCodeExport
      const laneTitle = row.lane === "baseline" ? "baseline" : "ContextLedger-precision-replace"
      const model =
        row.exportedModel?.providerID && row.exportedModel.modelID
          ? `${row.exportedModel.providerID}/${row.exportedModel.modelID}`
          : `${row.summarizeRequest.providerID}/${row.summarizeRequest.modelID}`
      return {
        instance_id: `${row.instanceID}_continuation`,
        run_id: `${row.scenarioID}-${row.lane}-continuation`,
        title: laneTitle,
        dir: optionalStringField(exported.info, "directory") ?? process.cwd(),
        model,
        variant: row.exportedModel?.variant ?? row.summarizeRequest.variant ?? "high",
        extra_args: ["--pure"],
        import_path: exportPath,
        import_session_id: row.sessionID,
        repeats,
        isolate_repeats: true,
        config: row.config as SessionContextLedgerBenchmark.OpenCodeRunManifestRow["config"],
        prompt: fixture.continuation_prompt,
        answer_contains: fixture.continuation_answer_contains ?? [],
      } satisfies SessionContextLedgerBenchmark.OpenCodeRunManifestRow
    }),
  )
  mkdirSync(dirname(outputPath), { recursive: true })
  await Bun.write(outputPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n")
  process.stdout.write(`${JSON.stringify({ outputPath, rows: rows.length, repeats }, undefined, 2)}\n`)
}

async function runNoisyCompactionLiveManifest(manifestPath: string) {
  const rows = parseNoisyCompactionLiveManifestJsonl(await Bun.file(manifestPath).text())
  if (rows.length === 0)
    throw new Error("--opencode-noisy-compaction-live-manifest must contain at least one JSONL row")
  const outputDir =
    args.values["opencode-noisy-compaction-live-output-dir"] ?? join(dirname(manifestPath), "noisy-compaction-live")
  mkdirSync(outputDir, { recursive: true })
  const exportManifestPath = join(outputDir, "exports.jsonl")
  const summaryReportPath = join(outputDir, "summary-report.json")
  const reportPath = join(outputDir, "live-report.json")
  const dbPath = join(outputDir, "opencode-live.db")
  const baseCommand = parseOpenCodeRunCommand(
    args.values["opencode-noisy-compaction-live-command-json"] ??
      JSON.stringify([
        "bun",
        "run",
        "--cwd",
        join(import.meta.dir, "../../opencode"),
        "--conditions=browser",
        "src/index.ts",
      ]),
    "--opencode-noisy-compaction-live-command-json",
  )
  const baseEnv = args.values["opencode-noisy-compaction-live-env-json"]
    ? parseStringRecord(
        args.values["opencode-noisy-compaction-live-env-json"],
        "--opencode-noisy-compaction-live-env-json",
      )
    : {}
  if (baseEnv.OPENCODE_CONFIG_CONTENT !== undefined) {
    throw new Error("--opencode-noisy-compaction-live-env-json cannot include OPENCODE_CONFIG_CONTENT")
  }
  const commonEnv = {
    ...baseEnv,
    OPENCODE_DB: dbPath,
    OPENCODE_PURE: baseEnv.OPENCODE_PURE ?? "1",
    OPENCODE_PRINT_LOGS: baseEnv.OPENCODE_PRINT_LOGS ?? "1",
    OPENCODE_LOG_LEVEL: baseEnv.OPENCODE_LOG_LEVEL ?? "DEBUG",
    OPENCODE_SERVER_PASSWORD: baseEnv.OPENCODE_SERVER_PASSWORD ?? "",
  }
  const exportRows: SessionContextLedgerBenchmark.OpenCodeExportManifestRow[] = []
  const reportRows: Omit<
    NoisyCompactionLiveReportRow,
    | "summaryTokens"
    | "claimRecall"
    | "claimPrecision"
    | "falseClaimRate"
    | "unsupportedClaimRate"
    | "contradictedClaimRate"
    | "staleClaimRate"
    | "survivedClaims"
    | "missingClaims"
    | "falseClaims"
    | "unsupportedClaims"
    | "contradictedClaims"
    | "staleClaims"
  >[] = []

  for (const row of rows) {
    for (const lane of ["baseline", "precision"] as const) {
      const laneInput = await noisyCompactionLaneInput(row, lane, manifestPath)
      const env = {
        ...commonEnv,
        OPENCODE_CONFIG_CONTENT: JSON.stringify(laneInput.config),
      }
      const importResult = await runCommandIn([...baseCommand, "import", laneInput.importPath], {
        cwd: laneInput.directory,
        env,
      })
      const importedSessionID = importResult.stdout.match(/\bses_[A-Za-z0-9]+\b/)?.[0]
      const laneSegment = safeFileSegment(`${row.scenario_id}-${lane}`)
      const importStdoutPath = join(outputDir, `${laneSegment}.import.stdout`)
      const importStderrPath = join(outputDir, `${laneSegment}.import.stderr`)
      const serveStdoutPath = join(outputDir, `${laneSegment}.serve.stdout`)
      const serveStderrPath = join(outputDir, `${laneSegment}.serve.stderr`)
      const summarizeResponsePath = join(outputDir, `${laneSegment}.summarize.response`)
      const exportPath = join(outputDir, `${laneSegment}.export.json`)
      const exportStderrPath = join(outputDir, `${laneSegment}.export.stderr`)
      await Bun.write(importStdoutPath, importResult.stdout)
      await Bun.write(importStderrPath, importResult.stderr)

      const server = await startOpenCodeServer({ baseCommand, cwd: laneInput.directory, env })
      try {
        const response = await fetch(`${server.url}/session/${laneInput.sessionID}/summarize`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-opencode-directory": laneInput.directory,
          },
          body: JSON.stringify(row.summarize_request),
        })
        const text = await response.text()
        await Bun.write(summarizeResponsePath, text)
        if (!response.ok) {
          throw new Error(`OpenCode summarize failed for ${row.scenario_id} ${lane}: ${response.status} ${text}`)
        }
      } finally {
        const stopped = await server.stop()
        await Bun.write(serveStdoutPath, stopped.stdout)
        await Bun.write(serveStderrPath, stopped.stderr)
      }

      const exported = await runCommandIn([...baseCommand, "export", laneInput.sessionID], {
        cwd: laneInput.directory,
        env,
      })
      await Bun.write(exportPath, exported.stdout)
      await Bun.write(exportStderrPath, exported.stderr)
      const exportedJson = JSON.parse(exported.stdout)
      exportRows.push({
        instance_id: row.instance_id,
        export_path: relative(dirname(exportManifestPath), exportPath) || exportPath,
        session_id: laneInput.sessionID,
        label: lane,
      })
      reportRows.push({
        scenarioID: row.scenario_id,
        instanceID: row.instance_id,
        lane,
        sessionID: laneInput.sessionID,
        ...(importedSessionID ? { importedSessionID } : {}),
        config: laneInput.config,
        summarizeRequest: row.summarize_request,
        exportedModel: openCodeExportModel(exportedJson),
        tokens: openCodeExportTokens(exportedJson),
        artifacts: {
          importStdout: importStdoutPath,
          importStderr: importStderrPath,
          serveStdout: serveStdoutPath,
          serveStderr: serveStderrPath,
          summarizeResponse: summarizeResponsePath,
          exportJson: exportPath,
          exportStderr: exportStderrPath,
        },
      })
    }
  }

  await Bun.write(exportManifestPath, exportRows.map((row) => JSON.stringify(row)).join("\n") + "\n")
  const goldPath = resolveManifestPath(rows[0].gold_path, manifestPath)
  const summaryReport = SessionContextLedgerBenchmark.analyzeOpenCodeCompactionSummaries({
    exports: await Promise.all(exportRows.map((row) => compactionSummaryInputFromManifestRow(row, exportManifestPath))),
    gold: SessionContextLedgerBenchmark.parseCompactionSummaryGoldJsonl(await Bun.file(goldPath).text()),
  })
  await Bun.write(summaryReportPath, `${JSON.stringify(summaryReport, undefined, 2)}\n`)
  const enrichedRows = enrichNoisyCompactionLiveRows(reportRows, summaryReport, outputDir)
  const report: NoisyCompactionLiveReport = {
    generatedBy: "context-ledger-benchmark",
    kind: "opencode-noisy-compaction-live-report",
    manifestPath,
    outputDir,
    rows: enrichedRows,
    summaryReport,
    summaries: noisyCompactionLiveSummaries(enrichedRows),
    pairedComparisons: noisyCompactionLiveComparisons(enrichedRows),
  }
  await Bun.write(reportPath, `${JSON.stringify(report, undefined, 2)}\n`)
  process.stdout.write(
    `${JSON.stringify(
      { outputDir, manifestPath, exportManifestPath, summaryReportPath, reportPath, rows: enrichedRows.length },
      undefined,
      2,
    )}\n`,
  )
}

async function noisyCompactionLaneInput(
  row: NoisyCompactionLiveManifestRow,
  lane: NoisyCompactionLiveLane,
  manifestPath: string,
) {
  const importPath = resolveManifestPath(
    lane === "baseline" ? row.baseline_import_path : row.precision_import_path,
    manifestPath,
  )
  const exported = (await Bun.file(importPath).json()) as SessionContextLedgerBenchmark.OpenCodeExport
  return {
    lane,
    importPath,
    sessionID: lane === "baseline" ? row.baseline_session_id : row.precision_session_id,
    config: lane === "baseline" ? row.baseline_config : row.precision_config,
    directory: optionalStringField(exported.info, "directory") ?? process.cwd(),
  }
}

function sessionIDFromExport(exported: SessionContextLedgerBenchmark.OpenCodeExport) {
  const id = exported.info.id
  if (typeof id !== "string") throw new Error("Generated OpenCode export missing session id")
  return id
}

function resolveManifestPath(path: string, manifestPath: string) {
  if (isAbsolute(path)) return path
  return join(dirname(manifestPath), path)
}

async function runOpenCodeManifest(manifestPath: string) {
  const rows = SessionContextLedgerBenchmark.parseOpenCodeRunManifestJsonl(await Bun.file(manifestPath).text())
  if (rows.length === 0) throw new Error("--opencode-run-manifest must contain at least one JSONL row")
  const outputDir = args.values["opencode-run-output-dir"] ?? join(dirname(manifestPath), "opencode-runs")
  mkdirSync(outputDir, { recursive: true })
  const exportManifestPath = args.values["opencode-run-export-manifest-output"] ?? join(outputDir, "exports.jsonl")
  mkdirSync(dirname(exportManifestPath), { recursive: true })
  const baseCommand = parseOpenCodeRunCommand(
    args.values["opencode-run-command-json"] ??
      JSON.stringify([
        "bun",
        "run",
        "--cwd",
        join(import.meta.dir, "../../opencode"),
        "--conditions=browser",
        "src/index.ts",
      ]),
  )
  const extraArgs = args.values["opencode-run-extra-args-json"]
    ? parseOpenCodeStringArray(args.values["opencode-run-extra-args-json"], "--opencode-run-extra-args-json", {
        allowEmpty: true,
      })
    : []
  const baseEnv = args.values["opencode-run-env-json"]
    ? parseStringRecord(args.values["opencode-run-env-json"], "--opencode-run-env-json")
    : {}
  const baseConfig = args.values["opencode-run-config-json"]
    ? parseJson(args.values["opencode-run-config-json"], "--opencode-run-config-json")
    : undefined
  const model = args.values["opencode-run-model"] ?? "openai/gpt-5.5"
  const variant = args.values["opencode-run-variant"] ?? "high"
  const predictions: SessionContextLedgerBenchmark.Prediction[] = []
  const exportRows: SessionContextLedgerBenchmark.OpenCodeExportManifestRow[] = []
  const reportRows: Omit<OpenCodeRunReportRow, "metrics">[] = []
  for (const row of rows) {
    const baseRunID = row.run_id ?? row.instance_id
    const baseSegment = safeFileSegment(baseRunID)
    const dir = isAbsolute(row.dir) ? row.dir : join(dirname(manifestPath), row.dir)
    const rowModel = row.model ?? model
    const rowVariant = row.variant ?? variant
    const rowExtraArgs = row.extra_args ?? []
    const prompts = openCodeRunPrompts(row)
    const repeats = openCodeRunRepeats(row)
    for (let repeatIndex = 1; repeatIndex <= repeats; repeatIndex++) {
      const segment = repeats === 1 ? baseSegment : `${baseSegment}-r${String(repeatIndex).padStart(2, "0")}`
      const runID = repeats === 1 ? baseRunID : `${baseRunID}-r${repeatIndex}`
      const rowEnv: Record<string, string> = {
        ...openCodeRunEnvironment({ baseEnv, baseConfig, row }),
        CONTEXTLEDGER_BENCHMARK_REPEAT_INDEX: String(repeatIndex),
        CONTEXTLEDGER_BENCHMARK_REPEAT_COUNT: String(repeats),
      }
      if (openCodeRunShouldIsolate(row, repeats)) {
        rowEnv.OPENCODE_DB = join(outputDir, `${segment}.opencode.db`)
      }
      let importedSessionID: string | undefined
      let importStdoutPath: string | undefined
      let importStderrPath: string | undefined
      if (row.import_path) {
        const importPath = resolveManifestPath(row.import_path, manifestPath)
        const importedExport = (await Bun.file(importPath).json()) as SessionContextLedgerBenchmark.OpenCodeExport
        const importResult = await runCommandIn([...baseCommand, "import", importPath], { cwd: dir, env: rowEnv })
        importStdoutPath = join(outputDir, `${segment}.import.stdout`)
        importStderrPath = join(outputDir, `${segment}.import.stderr`)
        await Bun.write(importStdoutPath, importResult.stdout)
        await Bun.write(importStderrPath, importResult.stderr)
        importedSessionID =
          row.import_session_id ??
          importResult.stdout.match(/\bses_[A-Za-z0-9_]+\b/)?.[0] ??
          sessionIDFromExport(importedExport)
        if (!importedSessionID) throw new Error(`Could not find imported session ID for ${row.instance_id}`)
      }
      const turnRuns: { readonly stdout: string; readonly stderr: string }[] = []
      let sessionID = importedSessionID
      for (const [index, prompt] of prompts.entries()) {
        const run = await runCommand(
          openCodeRunCommand({
            baseCommand,
            extraArgs: [...extraArgs, ...rowExtraArgs],
            dir,
            model: rowModel,
            variant: rowVariant,
            title: index === 0 ? row.title : undefined,
            sessionID,
            prompt,
          }),
          { env: rowEnv },
        )
        turnRuns.push(run)
        const nextSessionID = openCodeRunSessionID(run.stdout)
        if (!nextSessionID)
          throw new Error(`Could not find OpenCode session ID in run output for ${row.instance_id} turn ${index + 1}`)
        if (sessionID && nextSessionID !== sessionID) {
          throw new Error(
            `OpenCode session changed from ${sessionID} to ${nextSessionID} for ${row.instance_id} turn ${index + 1}`,
          )
        }
        sessionID = nextSessionID
      }
      if (!sessionID) throw new Error(`Could not find OpenCode session ID in run output for ${row.instance_id}`)
      const runStdoutPath = join(outputDir, `${segment}.run.stdout`)
      const runStderrPath = join(outputDir, `${segment}.run.stderr`)
      const runStdout = turnRuns.map((run) => run.stdout.trimEnd()).join("\n") + "\n"
      const runStderr = turnRuns.map((run) => run.stderr.trimEnd()).join("\n") + "\n"
      await Bun.write(runStdoutPath, runStdout)
      await Bun.write(runStderrPath, runStderr)
      const exported = await runCommand([...baseCommand, "export", sessionID], { env: rowEnv })
      const exportPath = join(outputDir, `${segment}.export.json`)
      const exportStderrPath = join(outputDir, `${segment}.export.stderr`)
      await Bun.write(exportPath, exported.stdout)
      await Bun.write(exportStderrPath, exported.stderr)
      const exportedJson = JSON.parse(exported.stdout)
      exportRows.push({
        instance_id: row.instance_id,
        export_path: relative(dirname(exportManifestPath), exportPath) || exportPath,
        session_id: sessionID,
        label: row.title ?? row.run_id,
      })
      const prediction = relativizeOpenCodePrediction(
        SessionContextLedgerBenchmark.toPredictionFromOpenCodeExport(exportedJson, {
          instanceID: row.instance_id,
        }),
        dir,
      )
      predictions.push(prediction)
      const answer = openCodeRunAnswerReport({
        stdout: runStdout,
        contains: row.answer_contains,
        regex: row.answer_regex,
      })
      const fileChecks = openCodeRunFileCheckReport({ dir, checks: row.file_checks })
      const commandChecks = await openCodeRunCommandCheckReport({
        dir,
        outputDir,
        segment,
        checks: row.command_checks,
        env: rowEnv,
      })
      reportRows.push({
        instanceID: row.instance_id,
        runID,
        label: row.title ?? row.run_id ?? row.instance_id,
        ...(repeats > 1 ? { repeatIndex, repeatCount: repeats } : {}),
        title: row.title,
        sessionID,
        turns: prompts.length,
        requestedModel: rowModel,
        requestedVariant: rowVariant,
        exportedModel: openCodeExportModel(exportedJson),
        config: row.config ?? baseConfig,
        artifacts: {
          ...(importStdoutPath ? { importStdout: importStdoutPath } : {}),
          ...(importStderrPath ? { importStderr: importStderrPath } : {}),
          runStdout: runStdoutPath,
          runStderr: runStderrPath,
          exportJson: exportPath,
          exportStderr: exportStderrPath,
        },
        tokens: openCodeExportTokens(exportedJson),
        ...(answer ? { answer } : {}),
        ...(fileChecks ? { fileChecks } : {}),
        ...(commandChecks ? { commandChecks } : {}),
      })
    }
  }
  await Bun.write(exportManifestPath, exportRows.map((row) => JSON.stringify(row)).join("\n") + "\n")
  if (args.values["opencode-run-report-output"]) {
    await writeOpenCodeRunReport({
      outputPath: args.values["opencode-run-report-output"],
      rows: reportRows,
      predictions,
      goldPath: args.values["prediction-eval-gold"],
    })
  }
  await emitPredictions(predictions)
}

function openCodeRunEnvironment(input: {
  readonly baseEnv: Record<string, string>
  readonly baseConfig?: unknown
  readonly row: SessionContextLedgerBenchmark.OpenCodeRunManifestRow
}) {
  const env = { ...input.baseEnv, ...input.row.env }
  const config = input.row.config ?? input.baseConfig
  if (config !== undefined) {
    if (env.OPENCODE_CONFIG_CONTENT !== undefined) {
      throw new Error("OpenCode run manifest cannot combine config with OPENCODE_CONFIG_CONTENT env")
    }
    env.OPENCODE_CONFIG_CONTENT = JSON.stringify(config)
  }
  return env
}

function openCodeRunPrompts(row: SessionContextLedgerBenchmark.OpenCodeRunManifestRow) {
  const prompts = row.prompts ?? (row.prompt === undefined ? [] : [row.prompt])
  if (prompts.length === 0) throw new Error(`OpenCode run row ${row.instance_id} requires prompt or prompts`)
  const blankIndex = prompts.findIndex((prompt) => prompt.trim().length === 0)
  if (blankIndex >= 0)
    throw new Error(`OpenCode run row ${row.instance_id} has an empty prompt at turn ${blankIndex + 1}`)
  return prompts
}

function openCodeRunRepeats(row: SessionContextLedgerBenchmark.OpenCodeRunManifestRow) {
  const repeats = row.repeats ?? 1
  if (!Number.isInteger(repeats) || repeats < 1) {
    throw new Error(`OpenCode run row ${row.instance_id} requires repeats to be a positive integer`)
  }
  return repeats
}

function openCodeRunShouldIsolate(row: SessionContextLedgerBenchmark.OpenCodeRunManifestRow, repeats: number) {
  return row.isolate_repeats ?? Boolean(row.import_path && repeats > 1)
}

function openCodeRunCommand(input: {
  readonly baseCommand: readonly string[]
  readonly extraArgs: readonly string[]
  readonly dir: string
  readonly model: string
  readonly variant: string
  readonly title?: string
  readonly sessionID?: string
  readonly prompt: string
}) {
  return [
    ...input.baseCommand,
    "run",
    ...input.extraArgs,
    "--dir",
    input.dir,
    "--model",
    input.model,
    "--variant",
    input.variant,
    "--format",
    "json",
    ...(input.title ? ["--title", input.title] : []),
    ...(input.sessionID ? ["--session", input.sessionID] : []),
    input.prompt,
  ]
}

async function writeOpenCodeRunReport(input: {
  readonly outputPath: string
  readonly rows: readonly Omit<OpenCodeRunReportRow, "metrics">[]
  readonly predictions: readonly SessionContextLedgerBenchmark.Prediction[]
  readonly goldPath?: string
}) {
  const evaluation = input.goldPath
    ? SessionContextLedgerBenchmark.evaluatePredictionsAgainstGold({
        predictions: input.predictions,
        goldRows: SessionContextLedgerBenchmark.parseContextBenchGoldJsonl(await Bun.file(input.goldPath).text()),
      })
    : undefined
  const reportDir = dirname(input.outputPath)
  mkdirSync(reportDir, { recursive: true })
  const rows = input.rows.map((row, index) => ({
    ...row,
    artifacts: {
      ...(row.artifacts.importStdout
        ? { importStdout: reportRelativePath(row.artifacts.importStdout, reportDir) }
        : {}),
      ...(row.artifacts.importStderr
        ? { importStderr: reportRelativePath(row.artifacts.importStderr, reportDir) }
        : {}),
      runStdout: reportRelativePath(row.artifacts.runStdout, reportDir),
      runStderr: reportRelativePath(row.artifacts.runStderr, reportDir),
      exportJson: reportRelativePath(row.artifacts.exportJson, reportDir),
      exportStderr: reportRelativePath(row.artifacts.exportStderr, reportDir),
    },
    ...(row.commandChecks
      ? {
          commandChecks: {
            ...row.commandChecks,
            checks: row.commandChecks.checks.map((check) => ({
              ...check,
              stdoutPath: reportRelativePath(check.stdoutPath, reportDir),
              stderrPath: reportRelativePath(check.stderrPath, reportDir),
            })),
          },
        }
      : {}),
    metrics: evaluation?.rows[index],
  }))
  const pairedComparisons = openCodeRunReportComparisons(rows)
  const report: OpenCodeRunReport = {
    generatedBy: "context-ledger-benchmark",
    kind: "opencode-run-report",
    rows,
    summaries: openCodeRunReportSummaries(rows),
    pairedSummaries: openCodeRunReportPairedSummaries(pairedComparisons),
    pairedComparisons,
  }
  await Bun.write(input.outputPath, `${JSON.stringify(report, undefined, 2)}\n`)
}

function reportRelativePath(path: string, fromDirectory: string) {
  const value = relative(fromDirectory, path)
  if (!value || value.startsWith("..") || isAbsolute(value)) return path
  return value
}

function openCodeRunReportSummaries(rows: readonly OpenCodeRunReportRow[]): OpenCodeRunReport["summaries"] {
  return Array.from(new Set(rows.map((row) => row.label))).map((label) => {
    const items = rows.filter((row) => row.label === label)
    return {
      label,
      runs: items.length,
      fileF1: metricAverage(items, (row) => row.metrics?.file.f1),
      spanF1: metricAverage(items, (row) => row.metrics?.span.f1),
      lineF1: metricAverage(items, (row) => row.metrics?.line.f1),
      aucLineCoverage: metricAverage(items, (row) => row.metrics?.trajectory.aucLineCoverage),
      answerPassRate: metricAverage(items, (row) => answerScore(row.answer)),
      stddevAnswerPassRate: metricStddev(items, (row) => answerScore(row.answer)),
      minAnswerPassed: metricMin(items, (row) => answerScore(row.answer)),
      maxAnswerPassed: metricMax(items, (row) => answerScore(row.answer)),
      fileCheckPassRate: metricAverage(items, (row) => fileCheckScore(row.fileChecks)),
      commandCheckPassRate: metricAverage(items, (row) => commandCheckScore(row.commandChecks)),
      meanPromptTokens: metricAverage(items, (row) => openCodePromptTokens(row.tokens)),
      stddevPromptTokens: metricStddev(items, (row) => openCodePromptTokens(row.tokens)),
      minPromptTokens: metricMin(items, (row) => openCodePromptTokens(row.tokens)),
      maxPromptTokens: metricMax(items, (row) => openCodePromptTokens(row.tokens)),
      meanInputTokens: metricAverage(items, (row) => row.tokens?.input),
      stddevInputTokens: metricStddev(items, (row) => row.tokens?.input),
      minInputTokens: metricMin(items, (row) => row.tokens?.input),
      maxInputTokens: metricMax(items, (row) => row.tokens?.input),
      meanOutputTokens: metricAverage(items, (row) => row.tokens?.output),
      stddevOutputTokens: metricStddev(items, (row) => row.tokens?.output),
      minOutputTokens: metricMin(items, (row) => row.tokens?.output),
      maxOutputTokens: metricMax(items, (row) => row.tokens?.output),
      meanReasoningTokens: metricAverage(items, (row) => row.tokens?.reasoning),
      stddevReasoningTokens: metricStddev(items, (row) => row.tokens?.reasoning),
      minReasoningTokens: metricMin(items, (row) => row.tokens?.reasoning),
      maxReasoningTokens: metricMax(items, (row) => row.tokens?.reasoning),
      meanCacheReadTokens: metricAverage(items, (row) => row.tokens?.cacheRead),
      stddevCacheReadTokens: metricStddev(items, (row) => row.tokens?.cacheRead),
      minCacheReadTokens: metricMin(items, (row) => row.tokens?.cacheRead),
      maxCacheReadTokens: metricMax(items, (row) => row.tokens?.cacheRead),
      meanCacheWriteTokens: metricAverage(items, (row) => row.tokens?.cacheWrite),
      stddevCacheWriteTokens: metricStddev(items, (row) => row.tokens?.cacheWrite),
      minCacheWriteTokens: metricMin(items, (row) => row.tokens?.cacheWrite),
      maxCacheWriteTokens: metricMax(items, (row) => row.tokens?.cacheWrite),
    }
  })
}

function openCodeRunReportComparisons(rows: readonly OpenCodeRunReportRow[]): OpenCodeRunReport["pairedComparisons"] {
  const instanceIDs = Array.from(new Set(rows.map((row) => row.instanceID)))
  return instanceIDs.flatMap((instanceID) => {
    const items = rows.filter((row) => row.instanceID === instanceID)
    const repeatIndexes = Array.from(new Set(items.map((row) => row.repeatIndex ?? 1)))
    return repeatIndexes.flatMap((repeatIndex) => {
      const repeatItems = items.filter((row) => (row.repeatIndex ?? 1) === repeatIndex)
      const baseline = repeatItems[0]
      if (!baseline) return []
      return repeatItems.slice(1).map((candidate) => ({
        instanceID,
        baselineRunID: baseline.runID,
        candidateRunID: candidate.runID,
        baselineLabel: baseline.label,
        candidateLabel: candidate.label,
        ...((baseline.repeatCount ?? candidate.repeatCount ?? 1) > 1 ? { repeatIndex } : {}),
        delta: {
          fileF1: metricDelta(candidate.metrics?.file.f1, baseline.metrics?.file.f1),
          spanF1: metricDelta(candidate.metrics?.span.f1, baseline.metrics?.span.f1),
          lineF1: metricDelta(candidate.metrics?.line.f1, baseline.metrics?.line.f1),
          aucLineCoverage: metricDelta(
            candidate.metrics?.trajectory.aucLineCoverage,
            baseline.metrics?.trajectory.aucLineCoverage,
          ),
          answerPassed: metricDelta(answerScore(candidate.answer), answerScore(baseline.answer)),
          fileChecksPassed: metricDelta(fileCheckScore(candidate.fileChecks), fileCheckScore(baseline.fileChecks)),
          commandChecksPassed: metricDelta(
            commandCheckScore(candidate.commandChecks),
            commandCheckScore(baseline.commandChecks),
          ),
          promptTokens: metricDelta(openCodePromptTokens(candidate.tokens), openCodePromptTokens(baseline.tokens)),
          inputTokens: metricDelta(candidate.tokens?.input, baseline.tokens?.input),
          outputTokens: metricDelta(candidate.tokens?.output, baseline.tokens?.output),
          reasoningTokens: metricDelta(candidate.tokens?.reasoning, baseline.tokens?.reasoning),
          cacheReadTokens: metricDelta(candidate.tokens?.cacheRead, baseline.tokens?.cacheRead),
          cacheWriteTokens: metricDelta(candidate.tokens?.cacheWrite, baseline.tokens?.cacheWrite),
        },
      }))
    })
  })
}

function openCodeRunReportPairedSummaries(
  comparisons: OpenCodeRunReport["pairedComparisons"],
): OpenCodeRunReport["pairedSummaries"] {
  const groups = new Map<string, OpenCodeRunReport["pairedComparisons"]>()
  for (const comparison of comparisons) {
    const key = [comparison.instanceID, comparison.baselineLabel, comparison.candidateLabel].join("\0")
    groups.set(key, [...(groups.get(key) ?? []), comparison])
  }
  return Array.from(groups.values()).map((items) => {
    const first = items[0]
    if (!first) throw new Error("empty paired comparison group")
    return {
      instanceID: first.instanceID,
      baselineLabel: first.baselineLabel,
      candidateLabel: first.candidateLabel,
      pairs: items.length,
      meanAnswerPassedDelta: metricAverage(items, (row) => row.delta.answerPassed),
      stddevAnswerPassedDelta: metricStddev(items, (row) => row.delta.answerPassed),
      meanPromptTokensDelta: metricAverage(items, (row) => row.delta.promptTokens),
      stddevPromptTokensDelta: metricStddev(items, (row) => row.delta.promptTokens),
      minPromptTokensDelta: metricMin(items, (row) => row.delta.promptTokens),
      maxPromptTokensDelta: metricMax(items, (row) => row.delta.promptTokens),
      meanInputTokensDelta: metricAverage(items, (row) => row.delta.inputTokens),
      stddevInputTokensDelta: metricStddev(items, (row) => row.delta.inputTokens),
      minInputTokensDelta: metricMin(items, (row) => row.delta.inputTokens),
      maxInputTokensDelta: metricMax(items, (row) => row.delta.inputTokens),
      meanOutputTokensDelta: metricAverage(items, (row) => row.delta.outputTokens),
      stddevOutputTokensDelta: metricStddev(items, (row) => row.delta.outputTokens),
      minOutputTokensDelta: metricMin(items, (row) => row.delta.outputTokens),
      maxOutputTokensDelta: metricMax(items, (row) => row.delta.outputTokens),
      meanReasoningTokensDelta: metricAverage(items, (row) => row.delta.reasoningTokens),
      stddevReasoningTokensDelta: metricStddev(items, (row) => row.delta.reasoningTokens),
      minReasoningTokensDelta: metricMin(items, (row) => row.delta.reasoningTokens),
      maxReasoningTokensDelta: metricMax(items, (row) => row.delta.reasoningTokens),
    }
  })
}

function answerScore(answer: OpenCodeRunAnswerReport | undefined) {
  if (!answer) return undefined
  return answer.passed ? 1 : 0
}

function fileCheckScore(report: OpenCodeRunFileCheckReport | undefined) {
  if (!report) return undefined
  return report.passed ? 1 : 0
}

function commandCheckScore(report: OpenCodeRunCommandCheckReport | undefined) {
  if (!report) return undefined
  return report.passed ? 1 : 0
}

function openCodePromptTokens(tokens: OpenCodeRunReportRow["tokens"] | undefined) {
  if (!tokens) return undefined
  return tokens.input + tokens.cacheRead
}

function metricAverage<Row>(rows: readonly Row[], value: (row: Row) => number | undefined) {
  const values = metricValues(rows, value)
  if (values.length === 0) return undefined
  return values.reduce((total, item) => total + item, 0) / values.length
}

function metricStddev<Row>(rows: readonly Row[], value: (row: Row) => number | undefined) {
  const values = metricValues(rows, value)
  if (values.length === 0) return undefined
  const average = values.reduce((total, item) => total + item, 0) / values.length
  const variance = values.reduce((total, item) => total + (item - average) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function metricMin<Row>(rows: readonly Row[], value: (row: Row) => number | undefined) {
  const values = metricValues(rows, value)
  return values.length ? Math.min(...values) : undefined
}

function metricMax<Row>(rows: readonly Row[], value: (row: Row) => number | undefined) {
  const values = metricValues(rows, value)
  return values.length ? Math.max(...values) : undefined
}

function metricValues<Row>(rows: readonly Row[], value: (row: Row) => number | undefined) {
  return rows.map(value).filter((item): item is number => item !== undefined)
}

function metricDelta(candidate: number | undefined, baseline: number | undefined) {
  if (candidate === undefined || baseline === undefined) return undefined
  return candidate - baseline
}

function openCodeExportModel(input: unknown): OpenCodeRunReportRow["exportedModel"] {
  const info = openCodeExportInfo(input)
  const model = isRecord(info?.model) ? info.model : undefined
  if (!model) return undefined
  return {
    providerID: typeof model.providerID === "string" ? model.providerID : undefined,
    modelID: typeof model.id === "string" ? model.id : typeof model.modelID === "string" ? model.modelID : undefined,
    variant: typeof model.variant === "string" ? model.variant : undefined,
  }
}

function openCodeExportTokens(input: unknown): OpenCodeRunReportRow["tokens"] {
  const info = openCodeExportInfo(input)
  const tokens = isRecord(info?.tokens) ? info.tokens : undefined
  const cache = isRecord(tokens?.cache) ? tokens.cache : undefined
  if (!tokens) return undefined
  return {
    input: optionalNumberField(tokens.input),
    output: optionalNumberField(tokens.output),
    reasoning: optionalNumberField(tokens.reasoning),
    cacheRead: optionalNumberField(cache?.read),
    cacheWrite: optionalNumberField(cache?.write),
  }
}

function openCodeExportInfo(input: unknown) {
  return isRecord(input) && isRecord(input.info) ? input.info : undefined
}

function optionalNumberField(input: unknown) {
  return typeof input === "number" && Number.isFinite(input) ? input : 0
}

function relativizeOpenCodePrediction(
  prediction: SessionContextLedgerBenchmark.Prediction,
  rootDir: string,
): SessionContextLedgerBenchmark.Prediction {
  const root = realpathSync(rootDir)
  const remap = (file: string) => relativeOpenCodePath(file, root)
  const predSteps = prediction.traj_data.pred_steps.map((step) => {
    const spans = remapSpanRecord(step.spans ?? {}, remap)
    return {
      ...step,
      files: Array.from(new Set([...step.files.map(remap), ...Object.keys(spans)])),
      spans,
    }
  })
  const predSpans = remapSpanRecord(prediction.traj_data.pred_spans, remap)
  return {
    ...prediction,
    traj_data: {
      ...prediction.traj_data,
      pred_steps: predSteps,
      pred_files: Array.from(new Set([...prediction.traj_data.pred_files.map(remap), ...Object.keys(predSpans)])),
      pred_spans: predSpans,
    },
  }
}

function remapSpanRecord(
  spans: SessionContextLedgerBenchmark.Prediction["traj_data"]["pred_spans"],
  remap: (file: string) => string,
) {
  const output: Record<string, { readonly type: "line"; readonly start: number; readonly end: number }[]> = {}
  for (const [file, items] of Object.entries(spans)) {
    const mapped = remap(file)
    output[mapped] = [...(output[mapped] ?? []), ...items]
  }
  return output
}

function relativeOpenCodePath(file: string, root: string) {
  if (!isAbsolute(file)) return file
  const physical = existsSync(file) ? realpathSync(file) : file
  const value = relative(root, physical)
  if (!value || value.startsWith("..") || isAbsolute(value)) return file
  return value
}

function parseOpenCodeRunCommand(input: string, optionName = "--opencode-run-command-json") {
  return parseOpenCodeStringArray(input, optionName, { allowEmpty: false })
}

function parseOpenCodeStringArray(input: string, optionName: string, options: { readonly allowEmpty: boolean }) {
  const parsed = parseJson(input, optionName)
  if (!isStringArray(parsed) || (!options.allowEmpty && parsed.length === 0)) {
    throw new Error(`${optionName} must be a ${options.allowEmpty ? "" : "non-empty "}JSON string array`)
  }
  return parsed
}

function parseJson(input: string, optionName: string): unknown {
  try {
    return JSON.parse(input)
  } catch (error) {
    throw new Error(`${optionName} must be valid JSON`, { cause: error })
  }
}

function parseStringRecord(input: string, optionName: string) {
  const parsed = parseJson(input, optionName)
  if (!isRecord(parsed) || !Object.values(parsed).every((value) => typeof value === "string")) {
    throw new Error(`${optionName} must be a JSON object with string values`)
  }
  return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]))
}

function isStringArray(input: unknown): input is string[] {
  return Array.isArray(input) && input.every((item) => typeof item === "string")
}

async function runCommand(cmd: readonly string[], options?: { readonly env?: Record<string, string> }) {
  const proc = Bun.spawn({
    cmd: [...cmd],
    stdout: "pipe",
    stderr: "pipe",
    ...(options?.env ? { env: mergedProcessEnv(options.env) } : {}),
  })
  const [stdout, stderr, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (exit !== 0) {
    throw new Error(`Command failed (${exit}): ${cmd.join(" ")}\n${stderr}`)
  }
  return { stdout, stderr }
}

async function runCommandIn(
  cmd: readonly string[],
  options: { readonly cwd: string; readonly env?: Record<string, string> },
) {
  const result = await runCommandCapture(cmd, options)
  if (result.exit !== 0) {
    throw new Error(`Command failed (${result.exit}): ${cmd.join(" ")}\n${result.stderr}`)
  }
  return { stdout: result.stdout, stderr: result.stderr }
}

async function runCommandCapture(
  cmd: readonly string[],
  options: { readonly cwd: string; readonly env?: Record<string, string> },
) {
  const proc = Bun.spawn({
    cmd: [...cmd],
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
    ...(options.env ? { env: mergedProcessEnv(options.env) } : {}),
  })
  const [stdout, stderr, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exit }
}

async function startOpenCodeServer(input: {
  readonly baseCommand: readonly string[]
  readonly cwd: string
  readonly env: Record<string, string>
}) {
  const proc = Bun.spawn({
    cmd: [...input.baseCommand, "serve", "--hostname", "127.0.0.1", "--port", "0"],
    cwd: input.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: mergedProcessEnv(input.env),
  })
  let ready = false
  let stdout = ""
  let stderr = ""
  let settleReady: (value: string) => void = () => {}
  let rejectReady: (error: Error) => void = () => {}
  const readyPromise = new Promise<string>((resolve, reject) => {
    settleReady = resolve
    rejectReady = reject
  })
  const timer = setTimeout(() => {
    if (!ready) rejectReady(new Error("Timed out waiting for OpenCode server to start"))
  }, 30_000)
  const stdoutDone = readStreamText(proc.stdout, (chunk) => {
    stdout += chunk
    const match = stdout.match(/opencode server listening on (http:\/\/[^\s]+)/)
    if (!ready && match?.[1]) {
      ready = true
      clearTimeout(timer)
      settleReady(match[1])
    }
  })
  const stderrDone = readStreamText(proc.stderr, (chunk) => {
    stderr += chunk
  })
  proc.exited.then((exit) => {
    if (!ready) {
      clearTimeout(timer)
      rejectReady(new Error(`OpenCode server exited before startup (${exit})\n${stderr}`))
    }
  })
  const url = await readyPromise
  return {
    url,
    stop: async () => {
      proc.kill()
      await proc.exited.catch(() => undefined)
      await Promise.all([stdoutDone, stderrDone]).catch(() => undefined)
      return { stdout, stderr }
    },
  }
}

async function readStreamText(stream: ReadableStream<Uint8Array>, onChunk: (chunk: string) => void) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const item = await reader.read()
    if (item.done) break
    onChunk(decoder.decode(item.value, { stream: true }))
  }
  const tail = decoder.decode()
  if (tail) onChunk(tail)
}

function mergedProcessEnv(env: Record<string, string>) {
  const output: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) output[key] = value
  }
  return { ...output, ...env }
}

function openCodeRunSessionID(stdout: string) {
  for (const value of openCodeRunJsonValues(stdout).toReversed()) {
    const found = sessionIDFromValue(value)
    if (found) return found
  }
  return stdout.match(/\bses_[A-Za-z0-9]+\b/)?.[0]
}

function openCodeRunAnswerReport(input: {
  readonly stdout: string
  readonly contains?: readonly string[]
  readonly regex?: string
}): OpenCodeRunAnswerReport | undefined {
  const contains = input.contains ?? []
  if (contains.length === 0 && input.regex === undefined) return undefined
  const finalText = openCodeRunFinalText(input.stdout) ?? ""
  const containsChecks = contains.map((text) => ({
    text,
    matched: finalText.includes(text),
  }))
  const regexCheck = input.regex
    ? {
        pattern: input.regex,
        matched: new RegExp(input.regex).test(finalText),
      }
    : undefined
  return {
    finalText,
    contains: containsChecks,
    ...(regexCheck ? { regex: regexCheck } : {}),
    passed: containsChecks.every((check) => check.matched) && (regexCheck?.matched ?? true),
  }
}

function openCodeRunFileCheckReport(input: {
  readonly dir: string
  readonly checks?: NonNullable<SessionContextLedgerBenchmark.OpenCodeRunManifestRow["file_checks"]>
}): OpenCodeRunFileCheckReport | undefined {
  const specs = input.checks ?? []
  if (specs.length === 0) return undefined
  const checks = specs.map((spec) => {
    const filePath = isAbsolute(spec.path) ? spec.path : join(input.dir, spec.path)
    const text = existsSync(filePath) ? readFileSync(filePath, "utf8") : undefined
    const contains = (spec.contains ?? []).map((expected) => ({
      text: expected,
      matched: text?.includes(expected) ?? false,
    }))
    const notContains = (spec.not_contains ?? []).map((unexpected) => ({
      text: unexpected,
      matched: !(text?.includes(unexpected) ?? false),
    }))
    const regex = spec.regex
      ? {
          pattern: spec.regex,
          matched: text !== undefined && new RegExp(spec.regex).test(text),
        }
      : undefined
    return {
      path: spec.path,
      exists: text !== undefined,
      contains,
      notContains,
      ...(regex ? { regex } : {}),
      passed:
        text !== undefined &&
        contains.every((check) => check.matched) &&
        notContains.every((check) => check.matched) &&
        (regex?.matched ?? true),
    }
  })
  return {
    checks,
    passed: checks.every((check) => check.passed),
  }
}

async function openCodeRunCommandCheckReport(input: {
  readonly dir: string
  readonly outputDir: string
  readonly segment: string
  readonly checks?: NonNullable<SessionContextLedgerBenchmark.OpenCodeRunManifestRow["command_checks"]>
  readonly env?: Record<string, string>
}): Promise<OpenCodeRunCommandCheckReport | undefined> {
  const specs = input.checks ?? []
  if (specs.length === 0) return undefined
  const checks = await Promise.all(
    specs.map(async (spec, index) => {
      if (spec.command.length === 0) throw new Error(`command_checks[${index}].command must not be empty`)
      const result = await runCommandCapture(spec.command, { cwd: input.dir, env: input.env })
      const stdoutPath = join(input.outputDir, `${input.segment}.command-${index}.stdout`)
      const stderrPath = join(input.outputDir, `${input.segment}.command-${index}.stderr`)
      await Bun.write(stdoutPath, result.stdout)
      await Bun.write(stderrPath, result.stderr)
      const combined = `${result.stdout}\n${result.stderr}`
      const expectedExitCode = spec.exit_code ?? 0
      const contains = (spec.contains ?? []).map((expected) => ({
        text: expected,
        matched: combined.includes(expected),
      }))
      const notContains = (spec.not_contains ?? []).map((unexpected) => ({
        text: unexpected,
        matched: !combined.includes(unexpected),
      }))
      const regex = spec.regex
        ? {
            pattern: spec.regex,
            matched: new RegExp(spec.regex).test(combined),
          }
        : undefined
      return {
        command: spec.command,
        exitCode: result.exit,
        expectedExitCode,
        stdoutPath,
        stderrPath,
        contains,
        notContains,
        ...(regex ? { regex } : {}),
        passed:
          result.exit === expectedExitCode &&
          contains.every((check) => check.matched) &&
          notContains.every((check) => check.matched) &&
          (regex?.matched ?? true),
      }
    }),
  )
  return {
    checks,
    passed: checks.every((check) => check.passed),
  }
}

function openCodeRunFinalText(stdout: string) {
  const textParts = openCodeRunJsonValues(stdout).flatMap((value) => {
    if (!isRecord(value)) return []
    const part = value.part
    if (isRecord(part) && part.type === "text" && typeof part.text === "string") return [part.text]
    if (value.type === "text" && typeof value.text === "string") return [value.text]
    return []
  })
  return textParts.at(-1)
}

function openCodeRunJsonValues(stdout: string) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)]
      } catch {
        return []
      }
    })
}

function sessionIDFromValue(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  for (const key of ["sessionID", "session_id", "id"]) {
    const candidate = value[key]
    if (typeof candidate === "string" && candidate.startsWith("ses_")) return candidate
  }
  const session = value.session
  if (isRecord(session)) return sessionIDFromValue(session)
  return undefined
}

function safeFileSegment(value: string) {
  return (
    value
      .replace(/[^A-Za-z0-9_.-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "instance"
  )
}

function parseNoisyCompactionLiveManifestJsonl(text: string): NoisyCompactionLiveManifestRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) =>
      noisyCompactionLiveManifestRow(
        parseJson(line, `--opencode-noisy-compaction-live-manifest line ${index + 1}`),
        index,
      ),
    )
}

function parseNoisyCompactionFixtureManifestJsonl(text: string): NoisyCompactionFixtureManifestRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) =>
      noisyCompactionFixtureManifestRow(parseJson(line, `noisy fixture manifest line ${index + 1}`), index),
    )
}

function noisyCompactionFixtureManifestRow(input: unknown, index: number): NoisyCompactionFixtureManifestRow {
  const row = noisyCompactionLiveManifestRow(input, index)
  if (!isRecord(input)) throw new Error(`Noisy fixture manifest row ${index + 1} must be an object`)
  const answerContains = input.continuation_answer_contains
  return {
    ...row,
    ...(typeof input.continuation_prompt === "string" ? { continuation_prompt: input.continuation_prompt } : {}),
    ...(Array.isArray(answerContains) && answerContains.every((item) => typeof item === "string")
      ? { continuation_answer_contains: answerContains }
      : {}),
  }
}

function noisyCompactionLiveManifestRow(input: unknown, index: number): NoisyCompactionLiveManifestRow {
  if (!isRecord(input)) throw new Error(`Noisy compaction live manifest row ${index + 1} must be an object`)
  const summarize = input.summarize_request
  if (!isRecord(summarize)) throw new Error(`Noisy compaction live manifest row ${index + 1} missing summarize_request`)
  return {
    scenario_id: requiredStringField(input.scenario_id, "scenario_id", index),
    instance_id: requiredStringField(input.instance_id, "instance_id", index),
    baseline_session_id: requiredStringField(input.baseline_session_id, "baseline_session_id", index),
    precision_session_id: requiredStringField(input.precision_session_id, "precision_session_id", index),
    baseline_import_path: requiredStringField(input.baseline_import_path, "baseline_import_path", index),
    precision_import_path: requiredStringField(input.precision_import_path, "precision_import_path", index),
    gold_path: requiredStringField(input.gold_path, "gold_path", index),
    summarize_request: {
      providerID: requiredStringField(summarize.providerID, "summarize_request.providerID", index),
      modelID: requiredStringField(summarize.modelID, "summarize_request.modelID", index),
      ...(typeof summarize.variant === "string" ? { variant: summarize.variant } : {}),
      ...(typeof summarize.auto === "boolean" ? { auto: summarize.auto } : {}),
    },
    baseline_config: input.baseline_config,
    precision_config: input.precision_config,
  }
}

function requiredStringField(input: unknown, field: string, index: number) {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error(`Noisy compaction live manifest row ${index + 1} requires string ${field}`)
  }
  return input
}

function enrichNoisyCompactionLiveRows(
  rows: readonly Omit<
    NoisyCompactionLiveReportRow,
    | "summaryTokens"
    | "claimRecall"
    | "claimPrecision"
    | "falseClaimRate"
    | "unsupportedClaimRate"
    | "contradictedClaimRate"
    | "staleClaimRate"
    | "survivedClaims"
    | "missingClaims"
    | "falseClaims"
    | "unsupportedClaims"
    | "contradictedClaims"
    | "staleClaims"
  >[],
  summaryReport: SessionContextLedgerBenchmark.OpenCodeCompactionSummaryReport,
  reportDir: string,
): NoisyCompactionLiveReportRow[] {
  const summaryBySession = new Map(summaryReport.rows.map((row) => [row.sessionID, row]))
  return rows.map((row) => {
    const summary = summaryBySession.get(row.sessionID)
    return {
      ...row,
      ...(summary
        ? {
            summaryTokens: summary.tokens,
            claimRecall: summary.recall,
            claimPrecision: summary.precision,
            falseClaimRate: summary.falseClaimRate,
            unsupportedClaimRate: summary.unsupportedClaimRate,
            contradictedClaimRate: summary.contradictedClaimRate,
            staleClaimRate: summary.staleClaimRate,
            survivedClaims: summary.survived,
            missingClaims: summary.missing,
            falseClaims: summary.falseClaims,
            unsupportedClaims: summary.unsupported,
            contradictedClaims: summary.contradicted,
            staleClaims: summary.stale,
          }
        : {}),
      artifacts: {
        importStdout: reportRelativePath(row.artifacts.importStdout, reportDir),
        importStderr: reportRelativePath(row.artifacts.importStderr, reportDir),
        serveStdout: reportRelativePath(row.artifacts.serveStdout, reportDir),
        serveStderr: reportRelativePath(row.artifacts.serveStderr, reportDir),
        summarizeResponse: reportRelativePath(row.artifacts.summarizeResponse, reportDir),
        exportJson: reportRelativePath(row.artifacts.exportJson, reportDir),
        exportStderr: reportRelativePath(row.artifacts.exportStderr, reportDir),
      },
    }
  })
}

function noisyCompactionLiveSummaries(
  rows: readonly NoisyCompactionLiveReportRow[],
): NoisyCompactionLiveReport["summaries"] {
  return (["baseline", "precision"] as const).map((lane) => {
    const items = rows.filter((row) => row.lane === lane)
    return {
      lane,
      runs: items.length,
      meanClaimRecall: metricAverage(items, (row) => row.claimRecall),
      meanClaimPrecision: metricAverage(items, (row) => row.claimPrecision),
      meanFalseClaimRate: metricAverage(items, (row) => row.falseClaimRate),
      meanUnsupportedClaimRate: metricAverage(items, (row) => row.unsupportedClaimRate),
      meanContradictedClaimRate: metricAverage(items, (row) => row.contradictedClaimRate),
      meanStaleClaimRate: metricAverage(items, (row) => row.staleClaimRate),
      meanSummaryTokens: metricAverage(items, (row) => row.summaryTokens),
      meanPromptTokens: metricAverage(items, (row) => openCodePromptTokens(row.tokens)),
      meanInputTokens: metricAverage(items, (row) => row.tokens?.input),
      meanCacheReadTokens: metricAverage(items, (row) => row.tokens?.cacheRead),
    }
  })
}

function noisyCompactionLiveComparisons(
  rows: readonly NoisyCompactionLiveReportRow[],
): NoisyCompactionLiveReport["pairedComparisons"] {
  return Array.from(new Set(rows.map((row) => row.instanceID))).flatMap((instanceID) => {
    const items = rows.filter((row) => row.instanceID === instanceID)
    const baseline = items.find((row) => row.lane === "baseline")
    const precision = items.find((row) => row.lane === "precision")
    if (!baseline || !precision) return []
    return [
      {
        scenarioID: baseline.scenarioID,
        instanceID,
        baselineSessionID: baseline.sessionID,
        precisionSessionID: precision.sessionID,
        delta: {
          claimRecall: metricDelta(precision.claimRecall, baseline.claimRecall),
          claimPrecision: metricDelta(precision.claimPrecision, baseline.claimPrecision),
          falseClaimRate: metricDelta(precision.falseClaimRate, baseline.falseClaimRate),
          unsupportedClaimRate: metricDelta(precision.unsupportedClaimRate, baseline.unsupportedClaimRate),
          contradictedClaimRate: metricDelta(precision.contradictedClaimRate, baseline.contradictedClaimRate),
          staleClaimRate: metricDelta(precision.staleClaimRate, baseline.staleClaimRate),
          summaryTokens: metricDelta(precision.summaryTokens, baseline.summaryTokens),
          promptTokens: metricDelta(openCodePromptTokens(precision.tokens), openCodePromptTokens(baseline.tokens)),
          inputTokens: metricDelta(precision.tokens?.input, baseline.tokens?.input),
          cacheReadTokens: metricDelta(precision.tokens?.cacheRead, baseline.tokens?.cacheRead),
        },
      },
    ]
  })
}

const opencodePredictionInputs = [
  args.values["opencode-export"],
  args.values["opencode-export-manifest"],
  args.values["opencode-messages"],
  args.values["opencode-run-manifest"],
].filter(Boolean)
if (opencodePredictionInputs.length > 1) {
  throw new Error(
    "--opencode-export, --opencode-export-manifest, --opencode-messages, and --opencode-run-manifest are mutually exclusive",
  )
}

if (args.values["benchmark-registry-output"]) {
  await Bun.write(
    args.values["benchmark-registry-output"],
    `${JSON.stringify(SessionContextLedgerBenchmark.benchmarkRegistry(), undefined, 2)}\n`,
  )
  process.exit(0)
}

if (args.values["noisy-compaction-fixtures-output-dir"]) {
  await emitNoisyCompactionFixtures(args.values["noisy-compaction-fixtures-output-dir"])
  process.exit(0)
}

if (args.values["opencode-noisy-compaction-live-manifest"]) {
  await runNoisyCompactionLiveManifest(args.values["opencode-noisy-compaction-live-manifest"])
  process.exit(0)
}

if (args.values["opencode-noisy-continuation-live-report"]) {
  await emitNoisyContinuationManifestFromLiveReport(args.values["opencode-noisy-continuation-live-report"])
  process.exit(0)
}

if (args.values["opencode-export"]) {
  const prediction = SessionContextLedgerBenchmark.toPredictionFromOpenCodeExport(
    await Bun.file(args.values["opencode-export"]).json(),
    { instanceID: args.values["instance-id"] },
  )
  await emitPredictions([prediction])
}

if (args.values["opencode-export-manifest"]) {
  const manifestPath = args.values["opencode-export-manifest"]
  const rows = SessionContextLedgerBenchmark.parseOpenCodeExportManifestJsonl(await Bun.file(manifestPath).text())
  await emitPredictions(await Promise.all(rows.map((row) => predictionFromManifestRow(row, manifestPath))))
}

if (args.values["opencode-messages"]) {
  const prediction = SessionContextLedgerBenchmark.toPredictionFromSessionMessages({
    messages: await Bun.file(args.values["opencode-messages"]).json(),
    instanceID: args.values["instance-id"],
  })
  await emitPredictions([prediction])
}

if (args.values["opencode-run-manifest"]) {
  await runOpenCodeManifest(args.values["opencode-run-manifest"])
}

if (
  args.values["opencode-compaction-summary-manifest"] ||
  args.values["compaction-summary-gold"] ||
  args.values["compaction-summary-output"]
) {
  if (!args.values["opencode-compaction-summary-manifest"]) {
    throw new Error("--opencode-compaction-summary-manifest is required for compaction summary scoring")
  }
  if (!args.values["compaction-summary-gold"]) {
    throw new Error("--compaction-summary-gold is required for compaction summary scoring")
  }
  if (!args.values["compaction-summary-output"]) {
    throw new Error("--compaction-summary-output is required for compaction summary scoring")
  }
  const manifestPath = args.values["opencode-compaction-summary-manifest"]
  const rows = SessionContextLedgerBenchmark.parseOpenCodeExportManifestJsonl(await Bun.file(manifestPath).text())
  await Bun.write(
    args.values["compaction-summary-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzeOpenCodeCompactionSummaries({
        exports: await Promise.all(rows.map((row) => compactionSummaryInputFromManifestRow(row, manifestPath))),
        gold: SessionContextLedgerBenchmark.parseCompactionSummaryGoldJsonl(
          await Bun.file(args.values["compaction-summary-gold"]).text(),
        ),
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (
  args.values["opencode-noisy-compaction-live-command-json"] ||
  args.values["opencode-noisy-compaction-live-env-json"] ||
  args.values["opencode-noisy-compaction-live-output-dir"]
) {
  throw new Error(
    "--opencode-noisy-compaction-live-command-json, --opencode-noisy-compaction-live-env-json, and --opencode-noisy-compaction-live-output-dir require --opencode-noisy-compaction-live-manifest",
  )
}

if (args.values["opencode-noisy-continuation-output"] || args.values["opencode-noisy-continuation-repeats"]) {
  throw new Error(
    "--opencode-noisy-continuation-output and --opencode-noisy-continuation-repeats require --opencode-noisy-continuation-live-report",
  )
}

if (
  args.values["opencode-run-command-json"] ||
  args.values["opencode-run-config-json"] ||
  args.values["opencode-run-env-json"] ||
  args.values["opencode-run-export-manifest-output"] ||
  args.values["opencode-run-extra-args-json"] ||
  args.values["opencode-run-model"] ||
  args.values["opencode-run-output-dir"] ||
  args.values["opencode-run-report-output"] ||
  args.values["opencode-run-variant"]
) {
  throw new Error(
    "--opencode-run-command-json, --opencode-run-config-json, --opencode-run-env-json, --opencode-run-export-manifest-output, --opencode-run-extra-args-json, --opencode-run-model, --opencode-run-output-dir, --opencode-run-report-output, and --opencode-run-variant require --opencode-run-manifest",
  )
}

if (args.values["swe-explore-ranker-sweep-merge-output"]) {
  await Bun.write(
    args.values["swe-explore-ranker-sweep-merge-output"],
    `${JSON.stringify(
      await mergeSWEExploreRankerSweepReports({
        inputs: args.values["swe-explore-ranker-sweep-merge-inputs"] ?? "",
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-ranker-sweep-merge-inputs"]) {
  throw new Error("--swe-explore-ranker-sweep-merge-inputs requires --swe-explore-ranker-sweep-merge-output")
}

if (args.values["swe-explore-ranker-portfolio-output"]) {
  await Bun.write(
    args.values["swe-explore-ranker-portfolio-output"],
    `${JSON.stringify(
      await evaluateSWEExploreRankerPortfolio({
        inputs: args.values["swe-explore-ranker-portfolio-inputs"] ?? "",
        labels: args.values["swe-explore-ranker-portfolio-labels"] ?? "",
        outputName: "--swe-explore-ranker-portfolio-output",
        inputsName: "--swe-explore-ranker-portfolio-inputs",
        labelsName: "--swe-explore-ranker-portfolio-labels",
        target: parseSWEExploreRankerPortfolioTarget(args.values["swe-explore-ranker-portfolio-target"] ?? "f1"),
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-ranker-portfolio-stability-output"]) {
  await Bun.write(
    args.values["swe-explore-ranker-portfolio-stability-output"],
    `${JSON.stringify(
      await evaluateSWEExploreRankerPortfolioStability({
        inputs: args.values["swe-explore-ranker-portfolio-stability-inputs"] ?? "",
        labels: args.values["swe-explore-ranker-portfolio-stability-labels"] ?? "",
        outputName: "--swe-explore-ranker-portfolio-stability-output",
        inputsName: "--swe-explore-ranker-portfolio-stability-inputs",
        labelsName: "--swe-explore-ranker-portfolio-stability-labels",
        target: parseSWEExploreRankerPortfolioTarget(args.values["swe-explore-ranker-portfolio-target"] ?? "f1"),
        maximumHeldoutLoss: numberAtLeast(
          args.values["swe-explore-ranker-portfolio-max-heldout-loss"] ?? "0",
          "--swe-explore-ranker-portfolio-max-heldout-loss",
          0,
        ),
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-ranker-gate-report-output"]) {
  await Bun.write(
    args.values["swe-explore-ranker-gate-report-output"],
    await renderSWEExploreRankerGateReport({
      inputs: args.values["swe-explore-ranker-gate-report-inputs"] ?? "",
      labels: args.values["swe-explore-ranker-gate-report-labels"] ?? "",
      minimumGain: sweExploreRankerGateMinimumGain,
    }),
  )
  process.exit(0)
}

if (args.values["swe-explore-ranker-gate-report-inputs"] || args.values["swe-explore-ranker-gate-report-labels"]) {
  throw new Error(
    "--swe-explore-ranker-gate-report-inputs and --swe-explore-ranker-gate-report-labels require --swe-explore-ranker-gate-report-output",
  )
}

if (
  args.values["swe-explore-ranker-portfolio-inputs"] ||
  args.values["swe-explore-ranker-portfolio-labels"] ||
  args.values["swe-explore-ranker-portfolio-stability-inputs"] ||
  args.values["swe-explore-ranker-portfolio-stability-labels"] ||
  args.values["swe-explore-ranker-portfolio-max-heldout-loss"] ||
  args.values["swe-explore-ranker-portfolio-target"]
) {
  throw new Error(
    "--swe-explore-ranker-portfolio inputs, labels, target, and max-heldout-loss require --swe-explore-ranker-portfolio-output or --swe-explore-ranker-portfolio-stability-output",
  )
}

const budgets = args.values.budgets
  ? args.values.budgets.split(",").map((value) => integerAtLeast(value.trim(), "--budgets", 1))
  : [integerAtLeast(args.values.budget ?? "90", "--budget", 1)]
if (budgets.length === 0) throw new Error("At least one budget is required")

if (args.values["compaction-survival-output"]) {
  const inputPath = args.values["compaction-survival-input"]
  if (!inputPath) throw new Error("--compaction-survival-output requires --compaction-survival-input")
  await Bun.write(
    args.values["compaction-survival-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzeCompactionSurvival({
        cases: SessionContextLedgerBenchmark.parseCompactionSurvivalJsonl(await Bun.file(inputPath).text()),
        budget: budgets[0] ?? 90,
        policy: args.values["compaction-survival-policy"]
          ? parsePolicyWithName(args.values["compaction-survival-policy"], "--compaction-survival-policy")
          : undefined,
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["compaction-survival-input"] || args.values["compaction-survival-policy"]) {
  throw new Error("--compaction-survival-input and --compaction-survival-policy require --compaction-survival-output")
}

const contextBenchRowsResponse = args.values.contextbench ? await fetchContextBenchRowsResponse() : undefined
const agentRetrievalBenchSamples = args.values["agent-retrieval-bench-samples"]
  ? SessionContextLedgerBenchmark.parseAgentRetrievalBenchSamplesJsonl(
      await Bun.file(args.values["agent-retrieval-bench-samples"]).text(),
    )
  : undefined
const agentRetrievalBenchChunks = await loadAgentRetrievalBenchChunks(agentRetrievalBenchSamples)
const sweExploreRows = args.values["swe-explore"]
  ? sliceRows(
      filterSWEExploreRows(
        filterSWEExploreDatasets(
          SessionContextLedgerBenchmark.parseSWEExploreJsonl(await Bun.file(args.values["swe-explore"]).text()),
          optionalList(args.values["swe-explore-datasets"]) ?? [],
        ),
        optionalList(args.values["swe-explore-instance-ids"]) ?? [],
      ),
      {
        limit: optionalIntegerAtLeast(args.values["swe-explore-limit"], "--swe-explore-limit", 1),
        offset: optionalIntegerAtLeast(args.values["swe-explore-offset"], "--swe-explore-offset", 0),
      },
    )
  : undefined
const sweExploreSourceMap = await loadSWEExploreSourceMap(sweExploreRows)
const sweExploreIssueMap = await loadSWEExploreIssueMap(sweExploreRows, sweExploreSourceMap)
const sweExplorePreparedRepos = await prepareSWEExploreRepos(sweExploreRows, sweExploreSourceMap)
const sweContextBenchExperienceRecords = await loadSWEContextBenchExperienceRecords()

if (args.values["swe-contextbench-experience-output"]) {
  if (!sweContextBenchExperienceRecords) {
    throw new Error("--swe-contextbench-experience-output requires --swe-contextbench-experience-input")
  }
  await Bun.write(
    args.values["swe-contextbench-experience-output"],
    sweContextBenchExperienceRecords.map((item) => JSON.stringify(item)).join("\n") + "\n",
  )
  process.exit(0)
}

if (args.values["swe-explore-chunk-sweep-output"]) {
  await Bun.write(
    args.values["swe-explore-chunk-sweep-output"],
    `${JSON.stringify(evaluateSWEExploreChunkSweep(sweExploreRows, sweExploreIssueMap), undefined, 2)}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-ranker-sweep-output"]) {
  await Bun.write(
    args.values["swe-explore-ranker-sweep-output"],
    `${JSON.stringify(evaluateSWEExploreRankerSweep(sweExploreRows, sweExploreIssueMap), undefined, 2)}\n`,
  )
  process.exit(0)
}

const sweExploreRepoCandidates = await loadSWEExploreRepoCandidates(sweExploreRows, sweExploreIssueMap)
const baseCases = args.values.input
  ? SessionContextLedgerBenchmark.parseJsonl(await Bun.file(args.values.input).text())
  : contextBenchRowsResponse
    ? SessionContextLedgerBenchmark.fromContextBenchRowsResponse(contextBenchRowsResponse, {
        includeProblemStatement: args.values["include-problem"] ?? false,
        includeTestCodeContext: args.values["include-test-code-context"] ?? false,
        maxGoldSpans: integerAtLeast(args.values["max-gold-spans"] ?? "8", "--max-gold-spans", 0),
        maxTestCodeContexts: integerAtLeast(
          args.values["max-test-code-contexts"] ?? "4",
          "--max-test-code-contexts",
          0,
        ),
        maxTests: integerAtLeast(args.values["max-tests"] ?? "8", "--max-tests", 0),
      })
    : agentRetrievalBenchSamples
      ? SessionContextLedgerBenchmark.fromAgentRetrievalBenchSamples(agentRetrievalBenchSamples, {
          chunks: agentRetrievalBenchChunks,
          includeQueryEvent: args.values["agent-retrieval-bench-include-query"] ?? false,
          maxChunksPerCase: optionalIntegerAtLeast(
            args.values["agent-retrieval-bench-max-chunks"],
            "--agent-retrieval-bench-max-chunks",
            1,
          ),
        })
      : sweExploreRows
        ? SessionContextLedgerBenchmark.fromSWEExploreRows(sweExploreRows, {
            includeOptionalRegions: !(args.values["swe-explore-core-only"] ?? false),
            maxOptionalRegions: optionalIntegerAtLeast(
              args.values["swe-explore-max-optional-regions"],
              "--swe-explore-max-optional-regions",
              0,
            ),
            optionalModels: optionalList(args.values["swe-explore-optional-models"]),
            repoCandidates: sweExploreRepoCandidates,
            issueMap: sweExploreIssueMap,
          })
        : [syntheticItem]
const experienceRecords = args.values["experience-replay-input"]
  ? SessionContextLedgerBenchmark.parseExperienceJsonl(await Bun.file(args.values["experience-replay-input"]).text())
  : sweContextBenchExperienceRecords
const cases = experienceRecords
  ? SessionContextLedgerBenchmark.withExperienceReplay(baseCases, {
      experiences: experienceRecords,
      maxPerCase: integerAtLeast(args.values["experience-replay-k"] ?? "3", "--experience-replay-k", 0),
      minScore: numberAtLeast(args.values["experience-replay-min-score"] ?? "1", "--experience-replay-min-score", 0),
    })
  : baseCases

if ((args.values["experience-replay-k"] || args.values["experience-replay-min-score"]) && !experienceRecords) {
  throw new Error(
    "--experience-replay-k and --experience-replay-min-score require --experience-replay-input or --swe-contextbench-experience-input",
  )
}

if (args.values["experience-replay-report-output"] && !experienceRecords) {
  throw new Error(
    "--experience-replay-report-output requires --experience-replay-input or --swe-contextbench-experience-input",
  )
}

if (args.values["prediction-eval-output"] && !args.values["prediction-eval-gold"]) {
  throw new Error("--prediction-eval-output requires --prediction-eval-gold")
}

if (
  !agentRetrievalBenchSamples &&
  (args.values["agent-retrieval-bench-chunks"] ||
    args.values["agent-retrieval-bench-corpus-manifest"] ||
    args.values["agent-retrieval-bench-corpus-root"] ||
    args.values["agent-retrieval-bench-include-query"] ||
    args.values["agent-retrieval-bench-max-chunks"])
) {
  throw new Error(
    "--agent-retrieval-bench-chunks, --agent-retrieval-bench-corpus-manifest, --agent-retrieval-bench-corpus-root, --agent-retrieval-bench-include-query, and --agent-retrieval-bench-max-chunks require --agent-retrieval-bench-samples",
  )
}

if (args.values["agent-retrieval-bench-chunks"] && args.values["agent-retrieval-bench-corpus-manifest"]) {
  throw new Error("--agent-retrieval-bench-chunks and --agent-retrieval-bench-corpus-manifest are mutually exclusive")
}

if (args.values["agent-retrieval-bench-corpus-root"] && !args.values["agent-retrieval-bench-corpus-manifest"]) {
  throw new Error("--agent-retrieval-bench-corpus-root requires --agent-retrieval-bench-corpus-manifest")
}

if (
  args.values["agent-retrieval-bench-ranking-context-budget"] &&
  !args.values["agent-retrieval-bench-ranking-output"]
) {
  throw new Error("--agent-retrieval-bench-ranking-context-budget requires --agent-retrieval-bench-ranking-output")
}

if (args.values["agent-retrieval-bench-ranking-strategy"] && !args.values["agent-retrieval-bench-ranking-output"]) {
  throw new Error("--agent-retrieval-bench-ranking-strategy requires --agent-retrieval-bench-ranking-output")
}

if (
  !sweExploreRows &&
  (args.values["swe-explore-auto-issue-map"] ||
    args.values["swe-explore-auto-source-map"] ||
    args.values["swe-explore-core-only"] ||
    args.values["swe-explore-chunk-lines"] ||
    args.values["swe-explore-chunk-sweep-lines"] ||
    args.values["swe-explore-chunk-sweep-output"] ||
    args.values["swe-explore-chunk-overlap"] ||
    args.values["swe-explore-datasets"] ||
    args.values["swe-explore-issue-map"] ||
    args.values["swe-explore-instance-ids"] ||
    args.values["swe-explore-limit"] ||
    args.values["swe-explore-max-optional-regions"] ||
    args.values["swe-explore-max-repo-chunks"] ||
    args.values["swe-explore-max-repo-files"] ||
    args.values["swe-explore-multiscale-chunk-lines"] ||
    args.values["swe-explore-official-output"] ||
    args.values["swe-explore-official-summary-output"] ||
    args.values["swe-explore-offset"] ||
    args.values["swe-explore-optional-models"] ||
    args.values["swe-explore-prepare-repos"] ||
    args.values["swe-explore-prepare-repos-cache"] ||
    args.values["swe-explore-prepare-repos-output"] ||
    args.values["swe-explore-ranker-sweep-output"] ||
    args.values["swe-explore-ranker-sweep-rankers"] ||
    args.values["swe-explore-repo-candidates"] ||
    args.values["swe-explore-repo-ranker"] ||
    args.values["swe-explore-repos-root"] ||
    args.values["swe-explore-source-map"] ||
    args.values["swe-explore-source-map-output"] ||
    args.values["swe-explore-split-labels"] ||
    args.values["swe-explore-split-output"] ||
    args.values["swe-explore-split-seed"] ||
    args.values["swe-explore-split-sizes"])
) {
  throw new Error("SWE-Explore options require --swe-explore")
}

if (
  (args.values["swe-explore-split-labels"] ||
    args.values["swe-explore-split-seed"] ||
    args.values["swe-explore-split-sizes"]) &&
  !args.values["swe-explore-split-output"]
) {
  throw new Error(
    "--swe-explore-split-labels, --swe-explore-split-seed, and --swe-explore-split-sizes require --swe-explore-split-output",
  )
}

if (args.values["swe-explore-repo-candidates"] && !args.values["swe-explore-repos-root"]) {
  throw new Error("--swe-explore-repo-candidates requires --swe-explore-repos-root")
}

if (args.values["swe-explore-prepare-repos"] && !args.values["swe-explore-repos-root"]) {
  throw new Error("--swe-explore-prepare-repos requires --swe-explore-repos-root")
}

if (args.values["swe-explore-prepare-repos-output"] && !args.values["swe-explore-prepare-repos"]) {
  throw new Error("--swe-explore-prepare-repos-output requires --swe-explore-prepare-repos")
}

if (args.values["swe-explore-prepare-repos-cache"] && !args.values["swe-explore-prepare-repos"]) {
  throw new Error("--swe-explore-prepare-repos-cache requires --swe-explore-prepare-repos")
}

if (args.values["swe-explore-chunk-sweep-lines"] && !args.values["swe-explore-chunk-sweep-output"]) {
  throw new Error("--swe-explore-chunk-sweep-lines requires --swe-explore-chunk-sweep-output")
}

if (args.values["swe-explore-chunk-sweep-output"] && !args.values["swe-explore-repos-root"]) {
  throw new Error("--swe-explore-chunk-sweep-output requires --swe-explore-repos-root")
}

if (args.values["swe-explore-ranker-sweep-rankers"] && !args.values["swe-explore-ranker-sweep-output"]) {
  throw new Error("--swe-explore-ranker-sweep-rankers requires --swe-explore-ranker-sweep-output")
}

if (args.values["swe-explore-ranker-sweep-output"] && !args.values["swe-explore-repos-root"]) {
  throw new Error("--swe-explore-ranker-sweep-output requires --swe-explore-repos-root")
}

if (
  !args.values["swe-explore-repo-candidates"] &&
  !args.values["swe-explore-chunk-sweep-output"] &&
  !args.values["swe-explore-ranker-sweep-output"] &&
  (args.values["swe-explore-chunk-lines"] ||
    args.values["swe-explore-chunk-overlap"] ||
    args.values["swe-explore-max-repo-chunks"] ||
    args.values["swe-explore-max-repo-files"] ||
    args.values["swe-explore-multiscale-chunk-lines"] ||
    args.values["swe-explore-repo-ranker"])
) {
  throw new Error(
    "--swe-explore-chunk-lines, --swe-explore-chunk-overlap, --swe-explore-max-repo-chunks, --swe-explore-max-repo-files, --swe-explore-multiscale-chunk-lines, and --swe-explore-repo-ranker require --swe-explore-repo-candidates, --swe-explore-chunk-sweep-output, or --swe-explore-ranker-sweep-output",
  )
}

const continueAfterRankingOutput = Boolean(
  args.values["prediction-output"] ||
    args.values["official-eval-output"] ||
    args.values["official-policy-report-output"] ||
    args.values["official-summary-input"] ||
    args.values["official-summary-output"] ||
    args.values["analysis-output"] ||
    args.values["target-report-output"] ||
    args.values["target-report-targets"] ||
    args.values["portfolio-report-output"] ||
    args.values["portfolio-stability-report-output"] ||
    args.values["portfolio-objective"] ||
    args.values["portfolio-target"] ||
    args.values["portfolio-targets"] ||
    args.values["portfolio-stability-split-inputs"] ||
    args.values["portfolio-stability-split-labels"] ||
    args.values["portfolio-max-heldout-loss"] ||
    args.values["prediction-eval-output"] ||
    args.values["router-output"] ||
    args.values["feature-router-output"] ||
    args.values["feature-router-rules-output"] ||
    args.values["feature-router-rules-input"] ||
    args.values["feature-router-eval-output"] ||
    args.values["promotion-report-output"] ||
    args.values["promotion-split-inputs"] ||
    args.values["promotion-split-labels"] ||
    args.values["stability-report-output"] ||
    args.values["stability-split-inputs"] ||
    args.values["stability-split-labels"] ||
    args.values["stability-target"],
)

if (args.values["write-cases"]) {
  await Bun.write(args.values["write-cases"], cases.map((item) => JSON.stringify(item)).join("\n") + "\n")
}

if (args.values["experience-replay-report-output"]) {
  await Bun.write(
    args.values["experience-replay-report-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzeExperienceReplay(baseCases, {
        experiences: experienceRecords ?? [],
        budgets,
        policies: selectedPolicies,
        maxPerCase: integerAtLeast(args.values["experience-replay-k"] ?? "3", "--experience-replay-k", 0),
        minScore: numberAtLeast(args.values["experience-replay-min-score"] ?? "1", "--experience-replay-min-score", 0),
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-source-map-output"]) {
  await Bun.write(args.values["swe-explore-source-map-output"], sourceMapJsonl(sweExploreSourceMap ?? {}))
}

if (args.values["swe-explore-split-output"]) {
  if (!sweExploreRows) throw new Error("--swe-explore-split-output requires --swe-explore")
  await Bun.write(
    args.values["swe-explore-split-output"],
    `${JSON.stringify(
      buildSWEExploreSplitManifest({
        rows: sweExploreRows,
        sourceMap: sweExploreSourceMap,
        labels: optionalList(args.values["swe-explore-split-labels"]) ?? ["dev", "heldout"],
        seed: args.values["swe-explore-split-seed"] ?? "context-ledger-v1",
        sizes: optionalList(args.values["swe-explore-split-sizes"])?.map((value) =>
          integerAtLeast(value, "--swe-explore-split-sizes", 1),
        ),
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-prepare-repos-output"]) {
  await Bun.write(
    args.values["swe-explore-prepare-repos-output"],
    `${JSON.stringify({ repos: sweExplorePreparedRepos ?? [] }, undefined, 2)}\n`,
  )
}

if (args.values["gold-output"]) {
  if (!contextBenchRowsResponse) throw new Error("--gold-output requires --contextbench")
  await Bun.write(
    args.values["gold-output"],
    SessionContextLedgerBenchmark.toGoldRowsFromContextBenchRowsResponse(contextBenchRowsResponse)
      .map((item) => JSON.stringify(item))
      .join("\n") + "\n",
  )
}

if (args.values["selection-delta-output"]) {
  await Bun.write(
    args.values["selection-delta-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.inspectSelectionDeltas({
        cases,
        budgets,
        baselinePolicy: parsePolicyWithName(
          args.values["selection-delta-baseline"] ?? "portfolio-frontier",
          "--selection-delta-baseline",
        ),
        candidatePolicy: parsePolicyWithName(
          args.values["selection-delta-policy"] ?? "official-frontier",
          "--selection-delta-policy",
        ),
        limit: optionalIntegerAtLeast(args.values["selection-delta-limit"], "--selection-delta-limit", 1),
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (
  args.values["selection-delta-baseline"] ||
  args.values["selection-delta-policy"] ||
  args.values["selection-delta-limit"]
) {
  throw new Error(
    "--selection-delta-baseline, --selection-delta-policy, and --selection-delta-limit require --selection-delta-output",
  )
}

if (args.values["agent-retrieval-bench-ranking-output"]) {
  await Bun.write(
    args.values["agent-retrieval-bench-ranking-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.evaluateAgentRetrievalBenchRanking({
        cases,
        budgets,
        policies: selectedPolicies,
        rankingStrategy: parseAgentRetrievalRankingStrategy(
          args.values["agent-retrieval-bench-ranking-strategy"] ?? "packet-order",
        ),
        contextBudgetChars: integerAtLeast(
          args.values["agent-retrieval-bench-ranking-context-budget"] ?? "8000",
          "--agent-retrieval-bench-ranking-context-budget",
          1,
        ),
      }),
      undefined,
      2,
    )}\n`,
  )
  if (!continueAfterRankingOutput) process.exit(0)
}

if (args.values["swe-explore-chunk-sweep-output"]) {
  await Bun.write(
    args.values["swe-explore-chunk-sweep-output"],
    `${JSON.stringify(evaluateSWEExploreChunkSweep(sweExploreRows, sweExploreIssueMap), undefined, 2)}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-ranker-sweep-output"]) {
  await Bun.write(
    args.values["swe-explore-ranker-sweep-output"],
    `${JSON.stringify(evaluateSWEExploreRankerSweep(sweExploreRows, sweExploreIssueMap), undefined, 2)}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-ranker-gate-repo-fold-output"]) {
  await Bun.write(
    args.values["swe-explore-ranker-gate-repo-fold-output"],
    `${JSON.stringify(
      await evaluateSWEExploreRankerGateRepoFolds({
        input: args.values["swe-explore-ranker-gate-repo-fold-input"] ?? "",
        folds: integerAtLeast(
          args.values["swe-explore-ranker-gate-repo-folds"] ?? "5",
          "--swe-explore-ranker-gate-repo-folds",
          2,
        ),
        minimumGain: sweExploreRankerGateMinimumGain,
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-ranker-gate-repo-fold-input"] || args.values["swe-explore-ranker-gate-repo-folds"]) {
  throw new Error(
    "--swe-explore-ranker-gate-repo-fold-input and --swe-explore-ranker-gate-repo-folds require --swe-explore-ranker-gate-repo-fold-output",
  )
}

if (args.values["swe-explore-ranker-gate-transfer-output"]) {
  await Bun.write(
    args.values["swe-explore-ranker-gate-transfer-output"],
    `${JSON.stringify(
      await evaluateSWEExploreRankerGateTransfer({
        inputs: args.values["swe-explore-ranker-gate-transfer-inputs"] ?? "",
        labels: args.values["swe-explore-ranker-gate-transfer-labels"] ?? "",
        minimumGain: sweExploreRankerGateMinimumGain,
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["swe-explore-ranker-gate-transfer-inputs"] || args.values["swe-explore-ranker-gate-transfer-labels"]) {
  throw new Error(
    "--swe-explore-ranker-gate-transfer-inputs and --swe-explore-ranker-gate-transfer-labels require --swe-explore-ranker-gate-transfer-output",
  )
}

if (args.values["swe-explore-official-output"] || args.values["swe-explore-official-summary-output"]) {
  if (!sweExploreRows)
    throw new Error("--swe-explore-official-output and --swe-explore-official-summary-output require --swe-explore")
  const report = SessionContextLedgerBenchmark.evaluateSWEExploreOfficial({
    rows: sweExploreRows,
    cases,
    budgets,
    policies: selectedPolicies,
  })
  if (args.values["swe-explore-official-output"]) {
    await Bun.write(
      args.values["swe-explore-official-output"],
      report.rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
    )
  }
  if (args.values["swe-explore-official-summary-output"]) {
    await Bun.write(
      args.values["swe-explore-official-summary-output"],
      `${JSON.stringify(
        {
          cases: report.cases,
          budgets: report.budgets,
          policies: report.policies,
          summaries: report.summaries,
        },
        undefined,
        2,
      )}\n`,
    )
  }
}

if (args.values["swe-explore-oracle-report-output"]) {
  if (!sweExploreRows) throw new Error("--swe-explore-oracle-report-output requires --swe-explore")
  await Bun.write(
    args.values["swe-explore-oracle-report-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzeSWEExploreOracles({
        rows: sweExploreRows,
        cases,
        budgets,
        policies: selectedPolicies,
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

const results = cases.flatMap((item) =>
  budgets.flatMap((budget) =>
    selectedPolicies.map((policy) =>
      SessionContextLedgerBenchmark.evaluateCase({
        item,
        policy,
        budget,
      }),
    ),
  ),
)
const summary = SessionContextLedgerBenchmark.summarize(results)
let emittedPredictions: readonly SessionContextLedgerBenchmark.Prediction[] | undefined

if (args.values["prediction-output"]) {
  if (budgets.length !== 1) throw new Error("--prediction-output requires exactly one budget")
  const policy = parsePolicy(args.values["prediction-policy"] ?? SessionContextLedger.DEFAULT_SELECTION_POLICY)
  const budget = budgets[0] ?? 0
  const predictions = predictionsForPolicy({ cases, policy, budget })
  emittedPredictions = predictions
  await Bun.write(
    args.values["prediction-output"],
    predictions.map((prediction) => JSON.stringify(prediction)).join("\n") + "\n",
  )
}

if (args.values["prediction-eval-output"]) {
  const predictions = emittedPredictions
  if (!predictions)
    throw new Error("--prediction-eval-output requires --prediction-output, --opencode-export, or --opencode-messages")
  await Bun.write(
    args.values["prediction-eval-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.evaluatePredictionsAgainstGold({
        predictions,
        goldRows: SessionContextLedgerBenchmark.parseContextBenchGoldJsonl(
          await Bun.file(args.values["prediction-eval-gold"] ?? "").text(),
        ),
      }),
      undefined,
      2,
    )}\n`,
  )
}

if (args.values["official-eval-output"]) {
  if (!args.values["prediction-output"]) throw new Error("--official-eval-output requires --prediction-output")
  if (!args.values["gold-output"]) throw new Error("--official-eval-output requires --gold-output")
  await runOfficialEvaluator({
    python: args.values["official-eval-python"] ?? "python",
    module: args.values["official-eval-module"] ?? "contextbench.evaluate",
    gold: args.values["gold-output"],
    prediction: args.values["prediction-output"],
    cache: args.values["official-eval-cache"] ?? "/tmp/contextbench-repos",
    output: args.values["official-eval-output"],
    pythonPath: args.values["official-eval-pythonpath"],
  })
}

if (
  args.values["official-eval-cache"] ||
  args.values["official-eval-module"] ||
  args.values["official-eval-python"] ||
  args.values["official-eval-pythonpath"]
) {
  if (!args.values["official-eval-output"] && !args.values["official-policy-report-output"]) {
    throw new Error(
      "--official-eval-cache, --official-eval-module, --official-eval-python, and --official-eval-pythonpath require --official-eval-output or --official-policy-report-output",
    )
  }
}

if (args.values["official-policy-report-output"]) {
  const goldPath = await officialGoldPath(contextBenchRowsResponse)
  const evaluator = officialEvaluatorOptions()
  const reportPolicies = parsePolicies(
    args.values["official-policy-report-policies"] ?? SessionContextLedger.DEFAULT_SELECTION_POLICY,
    "--official-policy-report-policies",
  )
  const comparisonBaselinePolicy = reportPolicies.includes(SessionContextLedger.DEFAULT_SELECTION_POLICY)
    ? SessionContextLedger.DEFAULT_SELECTION_POLICY
    : reportPolicies[0]
  const budgetResults = []
  for (const budget of budgets) {
    const policyResults = []
    const policyEvaluations = []
    for (const policy of reportPolicies) {
      const predictionPath = tempPath(`context-ledger-official-${budget}-${policy}-`, ".pred.jsonl")
      const officialPath = tempPath(`context-ledger-official-${budget}-${policy}-`, ".results.jsonl")
      const predictions = predictionsForPolicy({ cases, policy, budget })
      await Bun.write(predictionPath, predictions.map((prediction) => JSON.stringify(prediction)).join("\n") + "\n")
      await runOfficialEvaluator({
        ...evaluator,
        gold: goldPath,
        prediction: predictionPath,
        output: officialPath,
      })
      const officialRows = SessionContextLedgerBenchmark.parseOfficialJsonl(await Bun.file(officialPath).text())
      const summary = SessionContextLedgerBenchmark.summarizeOfficialEvaluation(officialRows)
      policyResults.push({
        policy,
        predictionRows: predictions.length,
        officialRows: officialRows.length,
        summary,
      })
      policyEvaluations.push({
        policy,
        rows: officialRows,
        summary,
      })
    }
    budgetResults.push({
      budget,
      policies: policyResults,
      best: officialPolicyBests(policyResults),
      comparisonBaselinePolicy,
      comparisons: SessionContextLedgerBenchmark.compareOfficialPolicyEvaluations({
        baselinePolicy: comparisonBaselinePolicy,
        evaluations: policyEvaluations,
      }),
    })
  }
  const baseReport = {
    budgets,
    cases: cases.length,
    goldRows: await lineCount(goldPath),
    comparisonBaselinePolicy,
    evaluator: {
      module: evaluator.module,
      cache: evaluator.cache,
      python: evaluator.python,
      pythonPath: evaluator.pythonPath,
    },
    results: budgetResults,
  }
  const report =
    budgets.length === 1
      ? {
          ...baseReport,
          budget: budgets[0],
          policies: budgetResults[0]?.policies ?? [],
          best: budgetResults[0]?.best,
          comparisons: budgetResults[0]?.comparisons ?? [],
        }
      : baseReport
  await Bun.write(args.values["official-policy-report-output"], `${JSON.stringify(report, undefined, 2)}\n`)
  process.exit(0)
}

if (args.values["official-policy-report-policies"] && !args.values["official-policy-report-output"]) {
  throw new Error("--official-policy-report-policies requires --official-policy-report-output")
}

if (args.values["official-summary-input"]) {
  const summary = SessionContextLedgerBenchmark.summarizeOfficialEvaluation(
    SessionContextLedgerBenchmark.parseOfficialJsonl(await Bun.file(args.values["official-summary-input"]).text()),
  )
  const output = `${JSON.stringify(summary, undefined, 2)}\n`
  if (args.values["official-summary-output"]) await Bun.write(args.values["official-summary-output"], output)
  else process.stdout.write(output)
  process.exit(0)
}

if (args.values["official-summary-output"] && !args.values["official-summary-input"]) {
  throw new Error("--official-summary-output requires --official-summary-input")
}

if (args.values["analysis-output"]) {
  await Bun.write(
    args.values["analysis-output"],
    `${JSON.stringify(SessionContextLedgerBenchmark.analyze(results), undefined, 2)}\n`,
  )
}

if (args.values["target-report-output"]) {
  await Bun.write(
    args.values["target-report-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzePolicyTargets(results, {
        targets: parseRouterTargets(args.values["target-report-targets"], "--target-report-targets"),
      }),
      undefined,
      2,
    )}\n`,
  )
}

if (args.values["target-report-targets"] && !args.values["target-report-output"]) {
  throw new Error("--target-report-targets requires --target-report-output")
}

if (args.values["portfolio-report-output"]) {
  await Bun.write(
    args.values["portfolio-report-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzePolicyPortfolio(results, {
        objective: parsePortfolioObjective(args.values["portfolio-objective"] ?? "minimax-regret"),
        target: parseRouterTarget(args.values["portfolio-target"] ?? "official-utility", "--portfolio-target"),
        targets: parseRouterTargets(args.values["portfolio-targets"], "--portfolio-targets"),
      }),
      undefined,
      2,
    )}\n`,
  )
}

if (args.values["portfolio-objective"] || args.values["portfolio-target"] || args.values["portfolio-targets"]) {
  if (!args.values["portfolio-report-output"] && !args.values["portfolio-stability-report-output"]) {
    throw new Error(
      "--portfolio-objective, --portfolio-target, and --portfolio-targets require --portfolio-report-output or --portfolio-stability-report-output",
    )
  }
}

if (args.values["portfolio-stability-report-output"]) {
  const splits = await readCaseSplits({
    inputs: args.values["portfolio-stability-split-inputs"] ?? "",
    labels: args.values["portfolio-stability-split-labels"] ?? "",
    outputName: "--portfolio-stability-report-output",
    inputsName: "--portfolio-stability-split-inputs",
    labelsName: "--portfolio-stability-split-labels",
  })
  await Bun.write(
    args.values["portfolio-stability-report-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzePolicyPortfolioStability(splits, {
        budgets,
        policies: selectedPolicies,
        objective: parsePortfolioObjective(args.values["portfolio-objective"] ?? "minimax-regret"),
        target: parseRouterTarget(args.values["portfolio-target"] ?? "official-utility", "--portfolio-target"),
        targets: parseRouterTargets(args.values["portfolio-targets"], "--portfolio-targets"),
        maximumHeldoutLoss: numberAtLeast(
          args.values["portfolio-max-heldout-loss"] ?? "0",
          "--portfolio-max-heldout-loss",
          0,
        ),
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (
  args.values["portfolio-stability-split-inputs"] ||
  args.values["portfolio-stability-split-labels"] ||
  args.values["portfolio-max-heldout-loss"]
) {
  throw new Error(
    "--portfolio-stability-split-inputs, --portfolio-stability-split-labels, and --portfolio-max-heldout-loss require --portfolio-stability-report-output",
  )
}

if (args.values["router-output"]) {
  await Bun.write(
    args.values["router-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzeBudgetRouter(results, {
        folds: integerAtLeast(args.values["router-folds"] ?? "5", "--router-folds", 1),
      }),
      undefined,
      2,
    )}\n`,
  )
}

if (args.values["feature-router-output"]) {
  await Bun.write(
    args.values["feature-router-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzeFeatureRouter(cases, {
        budgets,
        policies: selectedPolicies,
        folds: integerAtLeast(args.values["router-folds"] ?? "5", "--router-folds", 1),
        target: parseRouterTarget(args.values["feature-router-target"] ?? "event-f1"),
      }),
      undefined,
      2,
    )}\n`,
  )
}

if (args.values["feature-router-rules-output"]) {
  await Bun.write(
    args.values["feature-router-rules-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.trainFeatureRouterRules(cases, {
        budgets,
        policies: selectedPolicies,
        target: parseRouterTarget(args.values["feature-router-target"] ?? "event-f1"),
        validationFolds: integerAtLeast(
          args.values["feature-router-validation-folds"] ?? "0",
          "--feature-router-validation-folds",
          0,
        ),
        minimumValidationGain: numberAtLeast(
          args.values["feature-router-min-validation-gain"] ?? "0",
          "--feature-router-min-validation-gain",
          0,
        ),
      }),
      undefined,
      2,
    )}\n`,
  )
}

if (args.values["feature-router-rules-input"]) {
  const evaluations = SessionContextLedgerBenchmark.evaluateFeatureRouterRules(
    cases,
    await Bun.file(args.values["feature-router-rules-input"]).json(),
  )
  const output = `${JSON.stringify(evaluations, undefined, 2)}\n`
  if (args.values["feature-router-eval-output"]) await Bun.write(args.values["feature-router-eval-output"], output)
  else process.stdout.write(output)
  process.exit(0)
}

if (args.values["feature-router-eval-output"]) {
  throw new Error("--feature-router-eval-output requires --feature-router-rules-input")
}

if (args.values["promotion-report-output"]) {
  const splits = await readCaseSplits({
    inputs: args.values["promotion-split-inputs"] ?? "",
    labels: args.values["promotion-split-labels"] ?? "",
    outputName: "--promotion-report-output",
    inputsName: "--promotion-split-inputs",
    labelsName: "--promotion-split-labels",
  })
  await Bun.write(
    args.values["promotion-report-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzeFeatureRouterPromotion(splits, {
        budgets,
        policies: selectedPolicies,
        target: parseRouterTarget(args.values["feature-router-target"] ?? "event-f1"),
        validationFolds: integerAtLeast(
          args.values["feature-router-validation-folds"] ?? "0",
          "--feature-router-validation-folds",
          0,
        ),
        minimumValidationGain: numberAtLeast(
          args.values["feature-router-min-validation-gain"] ?? "0",
          "--feature-router-min-validation-gain",
          0,
        ),
        minimumHeldoutGain: numberAtLeast(
          args.values["promotion-min-heldout-gain"] ?? "0",
          "--promotion-min-heldout-gain",
          0,
        ),
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["promotion-split-inputs"] || args.values["promotion-split-labels"]) {
  throw new Error("--promotion-split-inputs and --promotion-split-labels require --promotion-report-output")
}

if (args.values["stability-report-output"]) {
  const splits = await readCaseSplits({
    inputs: args.values["stability-split-inputs"] ?? "",
    labels: args.values["stability-split-labels"] ?? "",
    outputName: "--stability-report-output",
    inputsName: "--stability-split-inputs",
    labelsName: "--stability-split-labels",
  })
  await Bun.write(
    args.values["stability-report-output"],
    `${JSON.stringify(
      SessionContextLedgerBenchmark.analyzePolicyStability(splits, {
        budgets,
        policies: selectedPolicies,
        target: parseRouterTarget(args.values["stability-target"] ?? "event-f1"),
      }),
      undefined,
      2,
    )}\n`,
  )
  process.exit(0)
}

if (args.values["stability-split-inputs"] || args.values["stability-split-labels"] || args.values["stability-target"]) {
  throw new Error(
    "--stability-split-inputs, --stability-split-labels, and --stability-target require --stability-report-output",
  )
}

console.log(
  "| budget | policy | cases | avg tokens | recall | precision | f1 | recall/1k | file f1 | span f1 | line f1 | auc line |",
)
console.log("| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
for (const result of summary) {
  console.log(
    [
      `| ${result.budget}`,
      result.policy,
      result.cases,
      result.tokens.toFixed(1),
      result.recall.toFixed(2),
      result.precision.toFixed(2),
      result.f1.toFixed(2),
      result.recallPerThousandTokens.toFixed(2),
      result.fileF1.toFixed(2),
      result.spanF1.toFixed(2),
      result.lineF1.toFixed(2),
      result.aucLineCoverage.toFixed(2),
    ].join(" | ") + " |",
  )
}

function predictionsForPolicy(input: {
  readonly cases: readonly SessionContextLedgerBenchmark.Case[]
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
}) {
  return input.cases.map((item) =>
    SessionContextLedgerBenchmark.toPrediction({
      instanceID: item.instance_id,
      selection: SessionContextLedger.select({
        events: item.events,
        policy: input.policy,
        budget: input.budget,
        query: "query" in item ? item.query : undefined,
      }),
    }),
  )
}

async function loadSWEExploreSourceMap(rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[] | undefined) {
  const path = args.values["swe-explore-source-map"]
  const shouldLoad =
    Boolean(path) ||
    Boolean(args.values["swe-explore-auto-source-map"]) ||
    Boolean(args.values["swe-explore-source-map-output"]) ||
    Boolean(args.values["swe-explore-prepare-repos"]) ||
    Boolean(args.values["swe-explore-auto-issue-map"]) ||
    args.values["swe-explore-issue-map"] === "auto"
  if (!shouldLoad) return undefined
  if (path && path !== "auto") return sourceMapFromText(await Bun.file(path).text())
  return fetchSWEExploreSourceMap(rows)
}

async function loadSWEExploreIssueMap(
  rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[] | undefined,
  sourceMap: Readonly<Record<string, SWEExploreSourceRecord>> | undefined,
) {
  const path = args.values["swe-explore-issue-map"]
  if (path && path !== "auto") return issueMapFromText(await Bun.file(path).text())
  if (!path && !args.values["swe-explore-auto-issue-map"] && !sourceMap) return undefined
  if (sourceMap) return issueMapFromSourceMap(sourceMap)
  return fetchSWEExploreIssueMap(rows)
}

function sourceMapFromText(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return {}
  if (trimmed.startsWith("[")) return sourceMapFromJson(JSON.parse(trimmed))
  if (trimmed.startsWith("{")) {
    try {
      return sourceMapFromJson(JSON.parse(trimmed))
    } catch {
      // A JSONL source map also starts with "{", so fall through to line parsing.
    }
  }
  return Object.fromEntries(
    trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        const source = sourceRecordFromUnknown(JSON.parse(line))
        return source ? [[source.instance_id, source] as const] : []
      }),
  )
}

function sourceMapFromJson(input: unknown): Record<string, SWEExploreSourceRecord> {
  if (Array.isArray(input)) {
    return Object.fromEntries(
      input.flatMap((row) => {
        const source = sourceRecordFromUnknown(row)
        return source ? [[source.instance_id, source] as const] : []
      }),
    )
  }
  const record = recordValue(input)
  if (!record) return {}
  const direct =
    stringValue(record, "instance_id") || stringValue(record, "id") ? sourceRecordFromUnknown(record) : undefined
  if (direct) return { [direct.instance_id]: direct }
  return Object.fromEntries(
    Object.entries(record).flatMap(([id, value]) => {
      if (typeof value === "string") return [[id, { instance_id: id, problem_statement: value }] as const]
      const source = sourceRecordFromUnknown(value, id)
      return source ? [[id, source] as const] : []
    }),
  )
}

function sourceRecordFromUnknown(
  input: unknown,
  fallbackID?: string,
  fallbackDataset?: string,
  fallbackSourceID?: string,
): SWEExploreSourceRecord | undefined {
  const id = fallbackID ?? stringValue(input, "instance_id") ?? stringValue(input, "id")
  if (!id) return undefined
  const sourceID = fallbackSourceID ?? stringValue(input, "source_instance_id") ?? stringValue(input, "instance_id")
  const dataset = stringValue(input, "dataset") ?? fallbackDataset
  const repo = stringValue(input, "repo")
  const repoURL = stringValue(input, "repo_url") ?? stringValue(input, "clone_url") ?? stringValue(input, "url")
  const baseCommit = stringValue(input, "base_commit")
  const problemStatement = issueText(input)
  return {
    instance_id: id,
    ...(sourceID && sourceID !== id ? { source_instance_id: sourceID } : {}),
    ...(dataset ? { dataset } : {}),
    ...(repo ? { repo } : {}),
    ...(repoURL ? { repo_url: repoURL } : {}),
    ...(baseCommit ? { base_commit: baseCommit } : {}),
    ...(problemStatement ? { problem_statement: problemStatement } : {}),
  }
}

function sourceMapJsonl(sourceMap: Readonly<Record<string, SWEExploreSourceRecord>>) {
  const rows = Object.values(sourceMap).sort((a, b) => a.instance_id.localeCompare(b.instance_id))
  return rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length > 0 ? "\n" : "")
}

function issueMapFromSourceMap(sourceMap: Readonly<Record<string, SWEExploreSourceRecord>>) {
  return Object.fromEntries(
    Object.entries(sourceMap).flatMap(([id, source]) =>
      source.problem_statement ? [[id, source.problem_statement] as const] : [],
    ),
  )
}

function issueMapFromText(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return {}
  if (trimmed.startsWith("[")) return issueMapFromJson(JSON.parse(trimmed))
  if (trimmed.startsWith("{")) {
    try {
      return issueMapFromJson(JSON.parse(trimmed))
    } catch {
      // A JSONL issue map also starts with "{", so fall through to line parsing.
    }
  }
  return Object.fromEntries(
    trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        const row = JSON.parse(line)
        const id = stringValue(row, "instance_id") ?? stringValue(row, "id")
        const issue = issueText(row)
        return id && issue ? [[id, issue] as const] : []
      }),
  )
}

async function fetchSWEExploreIssueMap(rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[] | undefined) {
  return issueMapFromSourceMap(await fetchSWEExploreSourceMap(rows))
}

async function prepareSWEExploreRepos(
  rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[] | undefined,
  sourceMap: Readonly<Record<string, SWEExploreSourceRecord>> | undefined,
) {
  if (!args.values["swe-explore-prepare-repos"]) return undefined
  if (!rows) throw new Error("--swe-explore-prepare-repos requires --swe-explore")
  const reposRoot = args.values["swe-explore-repos-root"]
  if (!reposRoot) throw new Error("--swe-explore-prepare-repos requires --swe-explore-repos-root")
  if (!sourceMap)
    throw new Error("--swe-explore-prepare-repos requires --swe-explore-auto-source-map or --swe-explore-source-map")
  const cacheRoot = args.values["swe-explore-prepare-repos-cache"]
    ? absolutePath(args.values["swe-explore-prepare-repos-cache"])
    : undefined
  const prepared = []
  for (const row of rows) {
    const source = sourceMap[row.instance_id]
    if (!source) throw new Error(`Missing source metadata for ${row.instance_id}`)
    if (!source.base_commit) throw new Error(`Missing base_commit for ${row.instance_id}`)
    const cloneURL = sweExploreCloneURL(source)
    if (!cloneURL) throw new Error(`Missing repo or repo_url for ${row.instance_id}`)
    const repoDir = sweExploreRepoTargetDir(row, reposRoot)
    const head = await ensureSWEExploreRepo(repoDir, cloneURL, source.base_commit, { cacheRoot })
    prepared.push({
      instance_id: row.instance_id,
      source_instance_id: source.source_instance_id,
      repo: source.repo,
      repo_url: cloneURL,
      repo_dir: repoDir,
      base_commit: source.base_commit,
      head,
    })
  }
  return prepared
}

function sweExploreCloneURL(source: SWEExploreSourceRecord) {
  if (source.repo_url) return source.repo_url
  if (!source.repo) return undefined
  if (
    source.repo.startsWith("https://") ||
    source.repo.startsWith("http://") ||
    source.repo.startsWith("file://") ||
    source.repo.startsWith("/") ||
    source.repo.startsWith(".")
  )
    return source.repo
  return `https://github.com/${source.repo}.git`
}

function sweExploreRepoTargetDir(row: SessionContextLedgerBenchmark.SWEExploreRow, reposRoot: string) {
  const root = absolutePath(reposRoot)
  if (row.repo_dir) return isAbsolute(row.repo_dir) ? row.repo_dir : join(root, row.repo_dir)
  return join(root, row.instance_id)
}

function absolutePath(path: string) {
  return isAbsolute(path) ? path : join(process.cwd(), path)
}

async function ensureSWEExploreRepo(
  repoDir: string,
  cloneURL: string,
  commit: string,
  options?: { readonly cacheRoot?: string },
) {
  mkdirSync(dirname(repoDir), { recursive: true })
  const cacheDir = options?.cacheRoot ? await ensureSWEExploreRepoCache(options.cacheRoot, cloneURL, commit) : undefined
  if (!existsSync(join(repoDir, ".git"))) {
    await runGit([
      "clone",
      "--filter=blob:none",
      ...(cacheDir ? ["--reference-if-able", cacheDir] : []),
      "--no-checkout",
      cloneURL,
      repoDir,
    ])
  }
  if (!(await gitHasCommit(repoDir, commit))) {
    const directFetch = await runGitMaybe(["fetch", "--filter=blob:none", "origin", commit], repoDir)
    if (!directFetch.ok) {
      await runGit(
        ["fetch", "--filter=blob:none", "origin", "+refs/heads/*:refs/remotes/origin/*", "+refs/tags/*:refs/tags/*"],
        repoDir,
      )
    }
  }
  if (!(await gitHasCommit(repoDir, commit))) throw new Error(`Could not fetch ${commit} in ${repoDir}`)
  await runGit(["checkout", "--detach", commit], repoDir)
  return runGit(["rev-parse", "HEAD"], repoDir)
}

async function ensureSWEExploreRepoCache(cacheRoot: string, cloneURL: string, commit: string) {
  mkdirSync(cacheRoot, { recursive: true })
  const cacheDir = join(cacheRoot, `${safeFileSegment(cloneURL)}-${stableSplitHash(cloneURL).toString(16)}.git`)
  if (!existsSync(join(cacheDir, "HEAD"))) {
    await runGit(["clone", "--filter=blob:none", "--bare", cloneURL, cacheDir])
  }
  if (!(await gitHasCommit(cacheDir, commit))) {
    const directFetch = await runGitMaybe(["fetch", "--filter=blob:none", "origin", commit], cacheDir)
    if (!directFetch.ok) {
      await runGit(
        ["fetch", "--filter=blob:none", "origin", "+refs/heads/*:refs/remotes/origin/*", "+refs/tags/*:refs/tags/*"],
        cacheDir,
      )
    }
  }
  if (!(await gitHasCommit(cacheDir, commit))) throw new Error(`Could not fetch ${commit} in repo cache ${cacheDir}`)
  return cacheDir
}

async function gitHasCommit(repoDir: string, commit: string) {
  return (await runGitMaybe(["cat-file", "-e", `${commit}^{commit}`], repoDir)).ok
}

async function runGit(args: readonly string[], cwd?: string) {
  const result = await runGitMaybe(args, cwd)
  if (!result.ok) {
    throw new Error(`git ${args.join(" ")} failed${cwd ? ` in ${cwd}` : ""}\n${result.stderr.trim()}`)
  }
  return result.stdout.trim()
}

async function runGitMaybe(args: readonly string[], cwd?: string) {
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
  return { ok: exit === 0, stdout, stderr }
}

async function fetchSWEExploreSourceMap(rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[] | undefined) {
  if (!rows) throw new Error("--swe-explore-auto-source-map requires --swe-explore")
  const neededByDataset = Map.groupBy(rows, (row) => row.dataset ?? "verified")
  const entries: [string, SWEExploreSourceRecord][] = []
  for (const [label, items] of neededByDataset.entries()) {
    const source = sweExploreIssueDataset(label)
    if (!source) continue
    const needed = new Map(
      items.flatMap((item) => issueIDVariants(item.instance_id).map((id) => [id, item.instance_id] as const)),
    )
    const neededTargets = new Set(items.map((item) => item.instance_id))
    const matchedTargets = new Set<string>()
    for (const row of await fetchSWEExploreSourceRows(source)) {
      const id = stringValue(row, "instance_id")
      const matched = id
        ? issueIDVariants(id)
            .map((variant) => needed.get(variant))
            .find(Boolean)
        : undefined
      const sourceRecord = matched ? sourceRecordFromUnknown(row, matched, label, id) : undefined
      if (matched && sourceRecord) {
        entries.push([matched, sourceRecord])
        matchedTargets.add(matched)
      }
      if (matchedTargets.size >= neededTargets.size) break
    }
  }
  return Object.fromEntries(entries)
}

function issueIDVariants(id: string) {
  return Array.from(new Set([id, id.replace(/^instance_/, ""), id.startsWith("instance_") ? id : `instance_${id}`]))
}

function sweExploreIssueDataset(label: string) {
  if (label === "verified") return SWE_EXPLORE_ISSUE_DATASETS.verified
  if (label === "multilingual") return SWE_EXPLORE_ISSUE_DATASETS.multilingual
  if (label === "pro") return SWE_EXPLORE_ISSUE_DATASETS.pro
  return undefined
}

async function fetchSWEExploreSourceRows(source: {
  readonly dataset: string
  readonly config: string
  readonly split: string
}) {
  const pageSize = 100
  const rows = []
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL("https://datasets-server.huggingface.co/rows")
    url.searchParams.set("dataset", source.dataset)
    url.searchParams.set("config", source.config)
    url.searchParams.set("split", source.split)
    url.searchParams.set("offset", String(offset))
    url.searchParams.set("length", String(pageSize))
    const data = await fetchJson(url)
    const page = Array.isArray(data.rows) ? data.rows : []
    rows.push(
      ...page.flatMap((item) => {
        const record = recordValue(item)
        const row = recordValue(record?.row)
        return row ? [row] : []
      }),
    )
    const total = typeof data.num_rows_total === "number" ? data.num_rows_total : rows.length
    if (offset + page.length >= total || page.length === 0) break
  }
  return rows
}

async function fetchJson(url: URL) {
  const urlText = url.toString()
  let lastStatus = ""
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      const record = recordValue(data)
      if (!record) throw new Error(`Expected JSON object from ${urlText}`)
      return record
    }

    lastStatus = `${response.status} ${response.statusText}`
    if (response.status !== 429 && response.status < 500) break
    await Bun.sleep(500 * 2 ** attempt)
  }
  throw new Error(`Failed to fetch ${urlText}: ${lastStatus}`)
}

function issueMapFromJson(input: unknown): Record<string, string> {
  if (Array.isArray(input)) {
    return Object.fromEntries(
      input.flatMap((row) => {
        const id = stringValue(row, "instance_id") ?? stringValue(row, "id")
        const issue = issueText(row)
        return id && issue ? [[id, issue] as const] : []
      }),
    )
  }
  const record = recordValue(input)
  if (!record) return {}
  return Object.fromEntries(
    Object.entries(record).flatMap(([id, value]) => {
      if (typeof value === "string") return [[id, value] as const]
      const issue = issueText(value)
      return issue ? [[id, issue] as const] : []
    }),
  )
}

async function loadSWEExploreRepoCandidates(
  rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[] | undefined,
  issueMap: Readonly<Record<string, string>> | undefined,
) {
  if (!args.values["swe-explore-repo-candidates"]) return undefined
  if (!rows) throw new Error("--swe-explore-repo-candidates requires --swe-explore")
  const reposRoot = args.values["swe-explore-repos-root"]
  if (!reposRoot) throw new Error("--swe-explore-repo-candidates requires --swe-explore-repos-root")
  return sweExploreRepoCandidatesForOptions(rows, issueMap, reposRoot, sweExploreRepoChunkOptions())
}

async function loadSWEContextBenchExperienceRecords() {
  const input = args.values["swe-contextbench-experience-input"]
  if (!input) {
    if (args.values["swe-contextbench-relationship-input"] || args.values["swe-contextbench-related-instance-ids"]) {
      throw new Error(
        "--swe-contextbench-relationship-input and --swe-contextbench-related-instance-ids require --swe-contextbench-experience-input",
      )
    }
    return undefined
  }
  const rows = SessionContextLedgerBenchmark.parseSWEContextBenchTaskJsonl(await Bun.file(input).text())
  const relationships = args.values["swe-contextbench-relationship-input"]
    ? SessionContextLedgerBenchmark.parseSWEContextBenchRelationshipJsonl(
        await Bun.file(args.values["swe-contextbench-relationship-input"]).text(),
      )
    : undefined
  return SessionContextLedgerBenchmark.experienceRecordsFromSWEContextBenchRows(rows, {
    relationships,
    relatedInstanceIDs: optionalList(args.values["swe-contextbench-related-instance-ids"]) ?? [],
  })
}

function evaluateSWEExploreChunkSweep(
  rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[] | undefined,
  issueMap: Readonly<Record<string, string>> | undefined,
) {
  if (!rows) throw new Error("--swe-explore-chunk-sweep-output requires --swe-explore")
  const reposRoot = args.values["swe-explore-repos-root"]
  if (!reposRoot) throw new Error("--swe-explore-chunk-sweep-output requires --swe-explore-repos-root")
  const chunkLines = integerListAtLeast(
    args.values["swe-explore-chunk-sweep-lines"] ?? "40,80,160",
    "--swe-explore-chunk-sweep-lines",
    1,
  )
  const results = chunkLines.map((lines) => {
    const options = sweExploreRepoChunkOptions({
      chunkLines: lines,
      chunkOverlap: args.values["swe-explore-chunk-overlap"]
        ? integerAtLeast(args.values["swe-explore-chunk-overlap"], "--swe-explore-chunk-overlap", 0)
        : Math.floor(lines / 4),
    })
    const repoCandidates = sweExploreRepoCandidatesForOptions(rows, issueMap, reposRoot, options)
    const cases = SessionContextLedgerBenchmark.fromSWEExploreRows(rows, {
      includeOptionalRegions: !(args.values["swe-explore-core-only"] ?? false),
      maxOptionalRegions: optionalIntegerAtLeast(
        args.values["swe-explore-max-optional-regions"],
        "--swe-explore-max-optional-regions",
        0,
      ),
      optionalModels: optionalList(args.values["swe-explore-optional-models"]),
      repoCandidates,
      issueMap,
    })
    const report = SessionContextLedgerBenchmark.evaluateSWEExploreOfficial({
      rows,
      cases,
      budgets,
      policies: selectedPolicies,
    })
    return {
      chunkLines: options.chunkSizes[0]?.chunkLines ?? 0,
      chunkOverlap: options.chunkSizes[0]?.chunkOverlap ?? 0,
      maxFiles: options.maxFiles,
      maxChunks: options.maxChunks,
      ranker: options.ranker,
      cases: report.cases,
      summaries: report.summaries,
    }
  })
  return {
    instances: rows.map((row) => row.instance_id),
    budgets,
    policies: selectedPolicies,
    results,
    bestByBudget: sweExploreChunkSweepBests(results),
  }
}

function evaluateSWEExploreRankerSweep(
  rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[] | undefined,
  issueMap: Readonly<Record<string, string>> | undefined,
) {
  if (!rows) throw new Error("--swe-explore-ranker-sweep-output requires --swe-explore")
  const reposRoot = args.values["swe-explore-repos-root"]
  if (!reposRoot) throw new Error("--swe-explore-ranker-sweep-output requires --swe-explore-repos-root")
  const rankers = parseSWEExploreRepoRankers(
    args.values["swe-explore-ranker-sweep-rankers"] ?? DEFAULT_SWE_EXPLORE_RANKER_SWEEP_RANKERS.join(","),
    "--swe-explore-ranker-sweep-rankers",
  )
  const evaluated = rankers.map((ranker) => {
    const options = sweExploreRepoChunkOptions({ ranker })
    const started = performance.now()
    if (args.values["swe-explore-ranker-sweep-progress"]) {
      console.error(`[swe-explore-ranker-sweep] ranker=${ranker} cases=${rows.length} started`)
    }
    const repoCandidates = sweExploreRepoCandidatesForOptions(rows, issueMap, reposRoot, options, {
      ranker,
      enabled: args.values["swe-explore-ranker-sweep-progress"] ?? false,
    })
    const cases = SessionContextLedgerBenchmark.fromSWEExploreRows(rows, {
      includeOptionalRegions: !(args.values["swe-explore-core-only"] ?? false),
      maxOptionalRegions: optionalIntegerAtLeast(
        args.values["swe-explore-max-optional-regions"],
        "--swe-explore-max-optional-regions",
        0,
      ),
      optionalModels: optionalList(args.values["swe-explore-optional-models"]),
      repoCandidates,
      issueMap,
    })
    const report = SessionContextLedgerBenchmark.evaluateSWEExploreOfficial({
      rows,
      cases,
      budgets,
      policies: selectedPolicies,
    })
    const result = {
      ranker: options.ranker,
      chunkSizes: options.chunkSizes,
      maxFiles: options.maxFiles,
      maxChunks: options.maxChunks,
      cases: report.cases,
      summaries: report.summaries,
      rows: report.rows,
      featuresByInstance: sweExploreRankerSweepFeatures(cases),
    }
    if (args.values["swe-explore-ranker-sweep-progress"]) {
      console.error(
        `[swe-explore-ranker-sweep] ranker=${ranker} completed elapsedMs=${Math.round(performance.now() - started)}`,
      )
    }
    return result
  })
  return {
    instances: rows.map((row) => row.instance_id),
    budgets,
    policies: selectedPolicies,
    results: evaluated.map(({ rows: _rows, featuresByInstance: _featuresByInstance, ...result }) => result),
    bestByBudget: sweExploreRankerSweepBests(evaluated),
    comparisons: sweExploreRankerSweepComparisons(evaluated),
    caseComparisons: sweExploreRankerSweepCaseComparisons(evaluated),
    gates: sweExploreRankerSweepGates(evaluated, { minimumGain: sweExploreRankerGateMinimumGain }),
  }
}

async function mergeSWEExploreRankerSweepReports(input: { readonly inputs: string }) {
  const inputPaths = splitList(input.inputs)
  if (inputPaths.length === 0) {
    throw new Error("--swe-explore-ranker-sweep-merge-output requires --swe-explore-ranker-sweep-merge-inputs")
  }
  const reports = await Promise.all(
    inputPaths.map(async (path) => ({
      path,
      report: await Bun.file(path).json(),
    })),
  )
  const firstInstances = rankerSweepStringArray(reports[0]?.report, "instances", reports[0]?.path ?? "ranker sweep")
  const resultByRanker = new Map<SWEExploreRepoRanker, unknown>()
  const caseComparisons = new Map<string, unknown>()
  const gates = new Map<string, unknown>()
  let baselineRanker: string | undefined

  for (const { path, report } of reports) {
    if (!isRecord(report)) throw new Error(`Invalid ranker sweep report: ${path}`)
    const instances = rankerSweepStringArray(report, "instances", path)
    if (!sameStringArray(firstInstances, instances)) {
      throw new Error(`Cannot merge ranker sweep reports with different instances: ${path}`)
    }
    if (!Array.isArray(report.results)) throw new Error(`Ranker sweep report must include results: ${path}`)
    for (const [index, result] of report.results.entries()) {
      if (!isRecord(result)) throw new Error(`Invalid ${path}.results[${index}]`)
      const ranker = sweExploreRepoRanker(
        stringField(result.ranker, `${path}.results[${index}].ranker`),
        `${path}.results[${index}].ranker`,
      )
      const existing = resultByRanker.get(ranker)
      if (existing && JSON.stringify(existing) !== JSON.stringify(result)) {
        throw new Error(`Cannot merge conflicting result summaries for ranker ${ranker}: ${path}`)
      }
      resultByRanker.set(ranker, result)
    }

    baselineRanker = mergeRankerSweepEvidenceRows({
      path,
      rows: Array.isArray(report.caseComparisons) ? report.caseComparisons : [],
      target: caseComparisons,
      key: rankerSweepCaseComparisonMergeKey,
      baselineRanker,
      label: "caseComparisons",
    })
    baselineRanker = mergeRankerSweepEvidenceRows({
      path,
      rows: Array.isArray(report.gates) ? report.gates : [],
      target: gates,
      key: rankerSweepGateMergeKey,
      baselineRanker,
      label: "gates",
    })
  }

  const results = Array.from(resultByRanker.values()).toSorted(
    (left, right) =>
      SWE_EXPLORE_REPO_RANKERS.indexOf(rankerSweepResultRanker(left)) -
      SWE_EXPLORE_REPO_RANKERS.indexOf(rankerSweepResultRanker(right)),
  )
  const budgets = rankerSweepMergedBudgets(results)
  const policies = rankerSweepMergedPolicies(results)
  const summaryResults = results.map((result) => ({
    ranker: rankerSweepResultRanker(result),
    summaries: rankerSweepResultSummaries(result),
  }))
  return {
    instances: firstInstances,
    budgets,
    policies,
    results,
    bestByBudget: sweExploreRankerSweepBestsForBudgets(summaryResults, budgets),
    comparisons: sweExploreRankerSweepComparisons(summaryResults),
    caseComparisons: Array.from(caseComparisons.values()),
    gates: Array.from(gates.values()),
  }
}

function rankerSweepStringArray(report: unknown, key: string, path: string) {
  if (!isRecord(report) || !Array.isArray(report[key])) {
    throw new Error(`Ranker sweep report must include ${key}: ${path}`)
  }
  return report[key].map((item, index) => {
    if (typeof item !== "string") throw new Error(`Invalid ${path}.${key}[${index}]: expected string`)
    return item
  })
}

function rankerSweepResultRanker(result: unknown) {
  if (!isRecord(result)) throw new Error("Invalid ranker sweep result")
  return sweExploreRepoRanker(stringField(result.ranker, "result.ranker"), "result.ranker")
}

function rankerSweepResultSummaries(result: unknown) {
  if (!isRecord(result) || !Array.isArray(result.summaries)) {
    throw new Error("Ranker sweep result must include summaries")
  }
  return result.summaries as readonly SessionContextLedgerBenchmark.SWEExploreOfficialSummary[]
}

function rankerSweepMergedBudgets(results: readonly unknown[]) {
  return Array.from(
    new Set(
      results.flatMap((result) =>
        rankerSweepResultSummaries(result).map((summary) => integerField(summary.budget, "summary.budget", 1)),
      ),
    ),
  ).toSorted((a, b) => a - b)
}

function rankerSweepMergedPolicies(results: readonly unknown[]) {
  return Array.from(
    new Set(
      results.flatMap((result) =>
        rankerSweepResultSummaries(result).map((summary) => parsePolicyWithName(summary.policy, "summary.policy")),
      ),
    ),
  ).toSorted((a, b) => SessionContextLedger.selectionPolicyOrder(a) - SessionContextLedger.selectionPolicyOrder(b))
}

function mergeRankerSweepEvidenceRows(input: {
  readonly path: string
  readonly rows: readonly unknown[]
  readonly target: Map<string, unknown>
  readonly key: (row: unknown, path: string, index: number) => { readonly baselineRanker: string; readonly key: string }
  readonly baselineRanker: string | undefined
  readonly label: string
}) {
  let baselineRanker = input.baselineRanker
  for (const [index, row] of input.rows.entries()) {
    const keyed = input.key(row, input.path, index)
    baselineRanker ??= keyed.baselineRanker
    if (baselineRanker !== keyed.baselineRanker) {
      throw new Error(
        `Cannot merge ranker sweep ${input.label} with different baselines: ${baselineRanker} vs ${keyed.baselineRanker} in ${input.path}`,
      )
    }
    const existing = input.target.get(keyed.key)
    if (existing && JSON.stringify(existing) !== JSON.stringify(row)) {
      throw new Error(`Cannot merge conflicting ranker sweep ${input.label} row: ${keyed.key}`)
    }
    input.target.set(keyed.key, row)
  }
  return baselineRanker
}

function rankerSweepCaseComparisonMergeKey(row: unknown, path: string, index: number) {
  const location = `${path}.caseComparisons[${index}]`
  if (!isRecord(row)) throw new Error(`Invalid ${location}`)
  const baselineRanker = stringField(row.baselineRanker, `${location}.baselineRanker`)
  return {
    baselineRanker,
    key: [
      baselineRanker,
      stringField(row.ranker, `${location}.ranker`),
      stringField(row.policy, `${location}.policy`),
      integerField(row.budget, `${location}.budget`, 1),
      stringField(row.instanceID, `${location}.instanceID`),
    ].join("\0"),
  }
}

function rankerSweepGateMergeKey(row: unknown, path: string, index: number) {
  const location = `${path}.gates[${index}]`
  if (!isRecord(row)) throw new Error(`Invalid ${location}`)
  const baselineRanker = stringField(row.baselineRanker, `${location}.baselineRanker`)
  return {
    baselineRanker,
    key: [
      baselineRanker,
      stringField(row.ranker, `${location}.ranker`),
      stringField(row.policy, `${location}.policy`),
      integerField(row.budget, `${location}.budget`, 1),
    ].join("\0"),
  }
}

function sameStringArray(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function sweExploreRankerSweepBests(
  results: readonly {
    readonly ranker: SWEExploreRepoRanker
    readonly summaries: readonly SessionContextLedgerBenchmark.SWEExploreOfficialSummary[]
  }[],
) {
  return sweExploreRankerSweepBestsForBudgets(results, budgets)
}

function sweExploreRankerSweepBestsForBudgets(
  results: readonly {
    readonly ranker: SWEExploreRepoRanker
    readonly summaries: readonly SessionContextLedgerBenchmark.SWEExploreOfficialSummary[]
  }[],
  targetBudgets: readonly number[],
) {
  return targetBudgets.map((budget) => {
    const candidates = results.flatMap((result) =>
      result.summaries
        .filter((summary) => summary.budget === budget)
        .map((summary) => ({
          ranker: result.ranker,
          policy: summary.policy,
          f1: summary.metrics.f1_score,
          recall: summary.metrics.recall,
          precision: summary.metrics.precision,
          firstUsefulHit: summary.metrics.first_useful_hit,
        })),
    )
    const best = candidates.toSorted(
      (a, b) =>
        b.f1 - a.f1 ||
        b.recall - a.recall ||
        SWE_EXPLORE_REPO_RANKERS.indexOf(a.ranker) - SWE_EXPLORE_REPO_RANKERS.indexOf(b.ranker),
    )[0]
    return { budget, best }
  })
}

function sweExploreRankerSweepComparisons(
  results: readonly {
    readonly ranker: SWEExploreRepoRanker
    readonly summaries: readonly SessionContextLedgerBenchmark.SWEExploreOfficialSummary[]
  }[],
) {
  const baselineRanker = results.find((result) => result.ranker === "structural")?.ranker ?? results[0]?.ranker
  const baseline = results.find((result) => result.ranker === baselineRanker)
  if (!baseline) return []
  return results
    .filter((result) => result.ranker !== baseline.ranker)
    .flatMap((result) =>
      result.summaries.flatMap((summary) => {
        const baselineSummary = baseline.summaries.find(
          (item) => item.policy === summary.policy && item.budget === summary.budget,
        )
        if (!baselineSummary) return []
        return [
          {
            baselineRanker: baseline.ranker,
            ranker: result.ranker,
            policy: summary.policy,
            budget: summary.budget,
            deltas: {
              f1: summary.metrics.f1_score - baselineSummary.metrics.f1_score,
              recall: summary.metrics.recall - baselineSummary.metrics.recall,
              precision: summary.metrics.precision - baselineSummary.metrics.precision,
              firstUsefulHit: summary.metrics.first_useful_hit - baselineSummary.metrics.first_useful_hit,
            },
          },
        ]
      }),
    )
}

function sweExploreRankerSweepCaseComparisons(
  results: readonly {
    readonly ranker: SWEExploreRepoRanker
    readonly rows: readonly SessionContextLedgerBenchmark.SWEExploreOfficialRow[]
    readonly featuresByInstance: ReadonlyMap<string, SWEExploreRankerSweepPacketFeatures>
  }[],
) {
  const baselineRanker = results.find((result) => result.ranker === "structural")?.ranker ?? results[0]?.ranker
  const baseline = results.find((result) => result.ranker === baselineRanker)
  if (!baseline) return []
  const baselineRows = new Map(baseline.rows.map((row) => [sweExploreRankerSweepRowKey(row), row]))
  return results
    .filter((result) => result.ranker !== baseline.ranker)
    .flatMap((result) =>
      result.rows.flatMap((row) => {
        const baselineRow = baselineRows.get(sweExploreRankerSweepRowKey(row))
        if (!baselineRow) return []
        const baselineFeatures = baseline.featuresByInstance.get(row.instance_id)
        const features = result.featuresByInstance.get(row.instance_id)
        const f1Delta = row.metrics.f1_score - baselineRow.metrics.f1_score
        const baselineMetrics = sweExploreRankerGateMetrics(baselineRow.metrics)
        const metrics = sweExploreRankerGateMetrics(row.metrics)
        return [
          {
            baselineRanker: baseline.ranker,
            ranker: result.ranker,
            instanceID: row.instance_id,
            policy: row.policy,
            budget: row.budget,
            outcome: f1Delta > 0 ? "win" : f1Delta < 0 ? "loss" : "tie",
            baselineRegions: baselineRow.num_regions,
            regions: row.num_regions,
            baselineMetrics,
            metrics,
            baselineFeatures: baselineFeatures?.metrics,
            features: features?.metrics,
            comparisonFeatures:
              baselineFeatures && features ? sweExploreRankerComparisonFeatures(features, baselineFeatures) : undefined,
            deltas: {
              f1: metrics.f1 - baselineMetrics.f1,
              recall: metrics.recall - baselineMetrics.recall,
              precision: metrics.precision - baselineMetrics.precision,
              firstUsefulHit: metrics.firstUsefulHit - baselineMetrics.firstUsefulHit,
            },
          },
        ]
      }),
    )
    .toSorted(
      (a, b) =>
        a.budget - b.budget ||
        SessionContextLedger.selectionPolicyOrder(a.policy) - SessionContextLedger.selectionPolicyOrder(b.policy) ||
        a.ranker.localeCompare(b.ranker) ||
        a.instanceID.localeCompare(b.instanceID),
    )
}

function sweExploreRankerSweepRowKey(row: SessionContextLedgerBenchmark.SWEExploreOfficialRow) {
  return `${row.instance_id}\0${row.policy}\0${row.budget}`
}

function sweExploreRankerSweepGates(
  results: readonly {
    readonly ranker: SWEExploreRepoRanker
    readonly rows: readonly SessionContextLedgerBenchmark.SWEExploreOfficialRow[]
    readonly featuresByInstance: ReadonlyMap<string, SWEExploreRankerSweepPacketFeatures>
  }[],
  options?: { readonly minimumGain?: number },
) {
  const baselineRanker = results.find((result) => result.ranker === "structural")?.ranker ?? results[0]?.ranker
  const baseline = results.find((result) => result.ranker === baselineRanker)
  if (!baseline) return []
  const baselineRows = new Map(baseline.rows.map((row) => [sweExploreRankerSweepRowKey(row), row]))
  return results
    .filter((result) => result.ranker !== baseline.ranker)
    .flatMap((result) => {
      const examples = result.rows.flatMap((row) => {
        const baselineRow = baselineRows.get(sweExploreRankerSweepRowKey(row))
        const baselineFeatures = baseline.featuresByInstance.get(row.instance_id)
        const features = result.featuresByInstance.get(row.instance_id)
        if (!baselineRow || !baselineFeatures || !features) return []
        return [
          {
            instanceID: row.instance_id,
            ranker: result.ranker,
            baselineRanker: baseline.ranker,
            policy: row.policy,
            budget: row.budget,
            baselineMetrics: sweExploreRankerGateMetrics(baselineRow.metrics),
            candidateMetrics: sweExploreRankerGateMetrics(row.metrics),
            features: sweExploreRankerGateFeatures(
              features.metrics,
              baselineFeatures.metrics,
              sweExploreRankerComparisonFeatures(features, baselineFeatures),
            ),
          },
        ]
      })
      return Array.from(Map.groupBy(examples, (item) => `${item.policy}\0${item.budget}`).values()).map((items) => {
        const rule = trainSWEExploreRankerGate(items, { minimumGain: options?.minimumGain ?? 0 })
        const routedMetrics = items.map((item) => routeSWEExploreRankerGate(item, rule))
        const leaveOneOutMetrics = items.map((item, index) => {
          const training = items.filter((_, itemIndex) => itemIndex !== index)
          const heldoutRule = trainSWEExploreRankerGate(training.length > 0 ? training : items, {
            minimumGain: options?.minimumGain ?? 0,
          })
          return routeSWEExploreRankerGate(item, heldoutRule)
        })
        const baselineMetrics = items.map((item) => item.baselineMetrics)
        const candidateMetrics = items.map((item) => item.candidateMetrics)
        const oracleMetrics = items.map((item) =>
          item.candidateMetrics.f1 > item.baselineMetrics.f1 ? item.candidateMetrics : item.baselineMetrics,
        )
        return {
          baselineRanker: baseline.ranker,
          ranker: result.ranker,
          policy: items[0]?.policy ?? "recency",
          budget: items[0]?.budget ?? 0,
          cases: items.length,
          minimumGain: options?.minimumGain ?? 0,
          rule,
          baseline: sweExploreRankerGateScore(baselineMetrics),
          candidate: sweExploreRankerGateScore(candidateMetrics),
          oracle: sweExploreRankerGateScore(oracleMetrics),
          routed: sweExploreRankerGateScore(routedMetrics),
          leaveOneOut: sweExploreRankerGateScore(leaveOneOutMetrics),
          routedChoices: sweExploreRankerGateChoiceCounts(items, rule),
        }
      })
    })
    .toSorted(
      (a, b) =>
        a.budget - b.budget ||
        SessionContextLedger.selectionPolicyOrder(a.policy) - SessionContextLedger.selectionPolicyOrder(b.policy) ||
        a.ranker.localeCompare(b.ranker),
    )
}

type SWEExploreRankerGateExample = {
  readonly instanceID: string
  readonly ranker: SWEExploreRepoRanker
  readonly baselineRanker: SWEExploreRepoRanker
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly baselineMetrics: SWEExploreRankerGateMetrics
  readonly candidateMetrics: SWEExploreRankerGateMetrics
  readonly features: ReadonlyMap<string, number>
}

type SWEExploreRankerGateMetrics = {
  readonly f1: number
  readonly recall: number
  readonly precision: number
  readonly firstUsefulHit: number
}

type SWEExploreRankerGateRule =
  | {
      readonly type: "constant"
      readonly ranker: SWEExploreRepoRanker
      readonly trainF1: number
    }
  | {
      readonly type: "threshold"
      readonly feature: string
      readonly threshold: number
      readonly candidateWhen: "lte" | "gt"
      readonly baselineRanker: SWEExploreRepoRanker
      readonly ranker: SWEExploreRepoRanker
      readonly trainF1: number
    }

function trainSWEExploreRankerGate(
  examples: readonly SWEExploreRankerGateExample[],
  options?: { readonly minimumGain?: number },
): SWEExploreRankerGateRule {
  const first = examples[0]
  if (!first) return { type: "constant", ranker: "structural", trainF1: 0 }
  const minimumGain = options?.minimumGain ?? 0
  const baselineRule = {
    type: "constant",
    ranker: first.baselineRanker,
    trainF1: meanSWEExploreRankerGateF1(examples.map((item) => item.baselineMetrics)),
  } satisfies SWEExploreRankerGateRule
  const candidateRule = {
    type: "constant",
    ranker: first.ranker,
    trainF1: meanSWEExploreRankerGateF1(examples.map((item) => item.candidateMetrics)),
  } satisfies SWEExploreRankerGateRule
  let best: SWEExploreRankerGateRule =
    candidateRule.trainF1 > baselineRule.trainF1 + minimumGain ? candidateRule : baselineRule
  const featureNames = Array.from(new Set(examples.flatMap((item) => Array.from(item.features.keys())))).toSorted()
  for (const feature of featureNames) {
    for (const threshold of sweExploreRankerGateThresholds(examples.map((item) => item.features.get(feature) ?? 0))) {
      for (const candidateWhen of ["lte", "gt"] as const) {
        const rule = {
          type: "threshold",
          feature,
          threshold,
          candidateWhen,
          baselineRanker: first.baselineRanker,
          ranker: first.ranker,
          trainF1: 0,
        } satisfies SWEExploreRankerGateRule
        const trainF1 = meanSWEExploreRankerGateF1(examples.map((item) => routeSWEExploreRankerGate(item, rule)))
        const scored = { ...rule, trainF1 } satisfies SWEExploreRankerGateRule
        if (scored.trainF1 > best.trainF1 && scored.trainF1 > baselineRule.trainF1 + minimumGain) best = scored
      }
    }
  }
  return best
}

function routeSWEExploreRankerGate(example: SWEExploreRankerGateExample, rule: SWEExploreRankerGateRule) {
  if (rule.type === "constant")
    return rule.ranker === example.ranker ? example.candidateMetrics : example.baselineMetrics
  const value = example.features.get(rule.feature) ?? 0
  const useCandidate = rule.candidateWhen === "lte" ? value <= rule.threshold : value > rule.threshold
  return useCandidate ? example.candidateMetrics : example.baselineMetrics
}

function sweExploreRankerGateChoiceCounts(
  examples: readonly SWEExploreRankerGateExample[],
  rule: SWEExploreRankerGateRule,
) {
  const candidate = examples.filter((item) => routeSWEExploreRankerGate(item, rule) === item.candidateMetrics).length
  return {
    baseline: examples.length - candidate,
    candidate,
  }
}

function sweExploreRankerGateFeatures(
  features: SWEExploreRankerSweepFeatures,
  baselineFeatures: SWEExploreRankerSweepFeatures,
  comparisonFeatures?: SWEExploreRankerComparisonFeatures,
) {
  const rankerEntries = SWE_EXPLORE_RANKER_SWEEP_FEATURE_KEYS.flatMap((key) => {
    const value = features[key]
    const baseline = baselineFeatures[key]
    return [
      [`candidate:${key}`, value],
      [`baseline:${key}`, baseline],
      [`delta:${key}`, value - baseline],
    ] as const
  })
  const comparisonEntries = comparisonFeatures
    ? SWE_EXPLORE_RANKER_COMPARISON_FEATURE_KEYS.map((key) => [`comparison:${key}`, comparisonFeatures[key]] as const)
    : []
  return new Map([...rankerEntries, ...comparisonEntries])
}

function sweExploreRankerGateThresholds(values: readonly number[]) {
  const uniqueValues = Array.from(new Set(values)).toSorted((a, b) => a - b)
  if (uniqueValues.length <= 1) return uniqueValues
  const thresholds: number[] = []
  for (let index = 0; index < uniqueValues.length - 1; index++) {
    thresholds.push((uniqueValues[index] + uniqueValues[index + 1]) / 2)
  }
  return thresholds
}

function sweExploreRankerGateMetrics(
  metrics: SessionContextLedgerBenchmark.SWEExploreOfficialMetrics,
): SWEExploreRankerGateMetrics {
  return {
    f1: metrics.f1_score,
    recall: metrics.recall,
    precision: metrics.precision,
    firstUsefulHit: metrics.first_useful_hit,
  }
}

function sweExploreRankerGateScore(metrics: readonly SWEExploreRankerGateMetrics[]) {
  return {
    f1: meanNumber(metrics.map((item) => item.f1)),
    recall: meanNumber(metrics.map((item) => item.recall)),
    precision: meanNumber(metrics.map((item) => item.precision)),
    firstUsefulHit: meanNumber(metrics.map((item) => item.firstUsefulHit)),
  }
}

function meanSWEExploreRankerGateF1(metrics: readonly SWEExploreRankerGateMetrics[]) {
  return meanNumber(metrics.map((item) => item.f1))
}

function meanNumber(values: readonly number[]) {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length
}

type SWEExploreRankerPortfolioMetrics = {
  readonly f1: number
  readonly recall: number
  readonly precision: number
  readonly firstUsefulHit: number
}

type SWEExploreRankerPortfolioRow = {
  readonly split: string
  readonly ranker: SWEExploreRepoRanker
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly metrics: SWEExploreRankerPortfolioMetrics
}

type SWEExploreRankerPortfolioSplit = {
  readonly id: string
  readonly path: string
  readonly instances: readonly string[]
  readonly rankers: readonly SWEExploreRepoRanker[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly budgets: readonly number[]
  readonly rows: readonly SWEExploreRankerPortfolioRow[]
}

type SWEExploreRankerPortfolioSplitScore = {
  readonly split: string
  readonly score: number
  readonly metrics: SWEExploreRankerPortfolioMetrics
}

type SWEExploreRankerPortfolioCandidate = {
  readonly ranker: SWEExploreRepoRanker
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly score: number
  readonly metrics: SWEExploreRankerPortfolioMetrics
  readonly coveredSplits: number
  readonly complete: boolean
  readonly splitScores: readonly SWEExploreRankerPortfolioSplitScore[]
}

type SWEExploreRankerPortfolioFrozenEvalSplit = {
  readonly evalSplit: string
  readonly score: number
  readonly metrics: SWEExploreRankerPortfolioMetrics
  readonly bestRanker: SWEExploreRepoRanker
  readonly bestPolicy: SessionContextLedger.SelectionPolicy
  readonly bestScore: number
  readonly bestMetrics: SWEExploreRankerPortfolioMetrics
  readonly regretVsBest: number
}

type SWEExploreRankerPortfolioFrozenEvaluation = {
  readonly evalSplits: readonly SWEExploreRankerPortfolioFrozenEvalSplit[]
  readonly missingSplits: readonly string[]
  readonly heldout: {
    readonly splits: number
    readonly missingSplits: readonly string[]
    readonly meanScore: number
    readonly meanRegretVsBest: number
    readonly maxRegretVsBest: number
    readonly minScoreDeltaVsBest: number
    readonly stable: boolean
  }
}

async function evaluateSWEExploreRankerPortfolio(input: {
  readonly inputs: string
  readonly labels: string
  readonly outputName?: string
  readonly inputsName?: string
  readonly labelsName?: string
  readonly target: SWEExploreRankerPortfolioTarget
}) {
  const splits = await readSWEExploreRankerPortfolioSplits(input)
  const budgets = Array.from(new Set(splits.flatMap((split) => split.budgets))).toSorted((a, b) => a - b)
  const budgetRows = budgets.map((budget) => {
    const candidates = sweExploreRankerPortfolioCandidates(splits, budget, input.target)
    const selected = candidates[0]
    if (!selected) throw new Error(`No ranker portfolio candidates for budget ${budget}`)
    const robust = sweExploreRankerPortfolioRobustCandidate(candidates)
    return {
      budget,
      selectedRanker: selected.ranker,
      selectedPolicy: selected.policy,
      selectedScore: selected.score,
      selectedMetrics: selected.metrics,
      robustRanker: robust.ranker,
      robustPolicy: robust.policy,
      robustMeanScore: robust.score,
      robustMinScore: sweExploreRankerPortfolioCandidateMinScore(robust),
      robustMetrics: robust.metrics,
      robustSplitScores: robust.splitScores,
      splitWinners: splits.map((split) => {
        const winner = sweExploreRankerPortfolioSplitWinner(split, budget, input.target)
        return {
          split: split.id,
          ranker: winner?.ranker,
          policy: winner?.policy,
          score: winner?.score,
          metrics: winner?.metrics,
        }
      }),
      candidates,
    }
  })
  const selectedMetrics = budgetRows.map((row) => row.selectedMetrics)
  const robustMetrics = budgetRows.map((row) => row.robustMetrics)
  return {
    target: input.target,
    splitCount: splits.length,
    splits: splits.map((split) => ({
      id: split.id,
      path: split.path,
      instances: split.instances.length,
      rankers: split.rankers,
      policies: split.policies,
      budgets: split.budgets,
    })),
    budgets: budgetRows,
    portfolio: {
      selectedRankerCounts: sweExploreRankerPortfolioRankerCounts(budgetRows),
      selectedPairCounts: sweExploreRankerPortfolioPairCounts(budgetRows),
      robustRankerCounts: sweExploreRankerPortfolioRankerCounts(
        budgetRows.map((row) => ({ selectedRanker: row.robustRanker })),
      ),
      robustPairCounts: sweExploreRankerPortfolioPairCounts(
        budgetRows.map((row) => ({ selectedRanker: row.robustRanker, selectedPolicy: row.robustPolicy })),
      ),
      meanScore: meanNumber(budgetRows.map((row) => row.selectedScore)),
      meanF1: meanNumber(selectedMetrics.map((metrics) => metrics.f1)),
      meanRecall: meanNumber(selectedMetrics.map((metrics) => metrics.recall)),
      meanPrecision: meanNumber(selectedMetrics.map((metrics) => metrics.precision)),
      meanFirstUsefulHit: meanNumber(selectedMetrics.map((metrics) => metrics.firstUsefulHit)),
      meanRobustScore: meanNumber(budgetRows.map((row) => row.robustMeanScore)),
      meanRobustMinScore: meanNumber(budgetRows.map((row) => row.robustMinScore)),
      meanRobustF1: meanNumber(robustMetrics.map((metrics) => metrics.f1)),
      meanRobustRecall: meanNumber(robustMetrics.map((metrics) => metrics.recall)),
      meanRobustPrecision: meanNumber(robustMetrics.map((metrics) => metrics.precision)),
      meanRobustFirstUsefulHit: meanNumber(robustMetrics.map((metrics) => metrics.firstUsefulHit)),
    },
  }
}

async function evaluateSWEExploreRankerPortfolioStability(input: {
  readonly inputs: string
  readonly labels: string
  readonly outputName?: string
  readonly inputsName?: string
  readonly labelsName?: string
  readonly target: SWEExploreRankerPortfolioTarget
  readonly maximumHeldoutLoss: number
}) {
  const splits = await readSWEExploreRankerPortfolioSplits(input)
  const budgets = Array.from(new Set(splits.flatMap((split) => split.budgets))).toSorted((a, b) => a - b)
  const fixedCandidates = budgets.map((budget) => {
    const candidates = sweExploreRankerPortfolioCandidates(splits, budget, input.target)
    const selected = candidates[0]
    if (!selected) throw new Error(`No ranker portfolio candidates for budget ${budget}`)
    const robust = sweExploreRankerPortfolioRobustCandidate(candidates)
    return {
      budget,
      selectedRanker: selected.ranker,
      selectedPolicy: selected.policy,
      selectedScore: selected.score,
      selectedMetrics: selected.metrics,
      robustRanker: robust.ranker,
      robustPolicy: robust.policy,
      robustMeanScore: robust.score,
      robustMinScore: sweExploreRankerPortfolioCandidateMinScore(robust),
      robustMetrics: robust.metrics,
      robustSplitScores: robust.splitScores,
    }
  })
  const budgetRows = splits.flatMap((trainSplit) =>
    budgets.flatMap((budget) => {
      const trainCandidates = sweExploreRankerPortfolioCandidates([trainSplit], budget, input.target)
      const selected = trainCandidates[0]
      if (!selected) return []
      const robust = sweExploreRankerPortfolioRobustCandidate(trainCandidates)
      const selectedEvaluation = sweExploreRankerPortfolioEvaluateFrozenCandidate({
        splits,
        trainSplit,
        budget,
        candidate: selected,
        target: input.target,
        maximumHeldoutLoss: input.maximumHeldoutLoss,
      })
      const robustEvaluation = sweExploreRankerPortfolioEvaluateFrozenCandidate({
        splits,
        trainSplit,
        budget,
        candidate: robust,
        target: input.target,
        maximumHeldoutLoss: input.maximumHeldoutLoss,
      })
      return [
        {
          trainSplit: trainSplit.id,
          budget,
          selectedRanker: selected.ranker,
          selectedPolicy: selected.policy,
          selectedTrainScore: selected.score,
          selectedTrainMetrics: selected.metrics,
          selectedEvaluation,
          selectedHeldout: selectedEvaluation.heldout,
          robustRanker: robust.ranker,
          robustPolicy: robust.policy,
          robustTrainScore: robust.score,
          robustTrainMinScore: sweExploreRankerPortfolioCandidateMinScore(robust),
          robustTrainMetrics: robust.metrics,
          robustEvaluation,
          robustHeldout: robustEvaluation.heldout,
        },
      ]
    }),
  )
  return {
    target: input.target,
    maximumHeldoutLoss: input.maximumHeldoutLoss,
    splitCount: splits.length,
    splits: splits.map((split) => ({
      id: split.id,
      path: split.path,
      instances: split.instances.length,
      rankers: split.rankers,
      policies: split.policies,
      budgets: split.budgets,
    })),
    fixedCandidates,
    budgets: budgetRows,
    stability: {
      selectedStableBudgets: budgetRows.filter((row) => row.selectedHeldout.stable).length,
      robustStableBudgets: budgetRows.filter((row) => row.robustHeldout.stable).length,
      selectedMeanHeldoutRegret: meanNumber(budgetRows.map((row) => row.selectedHeldout.meanRegretVsBest)),
      robustMeanHeldoutRegret: meanNumber(budgetRows.map((row) => row.robustHeldout.meanRegretVsBest)),
      selectedMaxHeldoutRegret:
        budgetRows.length === 0 ? 0 : Math.max(...budgetRows.map((row) => row.selectedHeldout.maxRegretVsBest)),
      robustMaxHeldoutRegret:
        budgetRows.length === 0 ? 0 : Math.max(...budgetRows.map((row) => row.robustHeldout.maxRegretVsBest)),
    },
  }
}

function sweExploreRankerPortfolioCandidates(
  splits: readonly SWEExploreRankerPortfolioSplit[],
  budget: number,
  target: SWEExploreRankerPortfolioTarget,
) {
  const rows = splits.flatMap((split) => split.rows.filter((row) => row.budget === budget))
  const keys = Array.from(new Set(rows.map(sweExploreRankerPortfolioRowKey)))
  return keys
    .map((key) => {
      const candidateRows = rows.filter((row) => sweExploreRankerPortfolioRowKey(row) === key)
      const first = candidateRows[0]
      if (!first) throw new Error(`Missing ranker portfolio candidate ${key}`)
      const metrics = meanSWEExploreRankerPortfolioMetrics(candidateRows.map((row) => row.metrics))
      const splitScores = splits.flatMap((split) => {
        const row = split.rows.find(
          (item) => item.budget === budget && item.ranker === first.ranker && item.policy === first.policy,
        )
        if (!row) return []
        return [
          {
            split: split.id,
            score: sweExploreRankerPortfolioTargetScore(row.metrics, target),
            metrics: row.metrics,
          },
        ]
      })
      return {
        ranker: first.ranker,
        policy: first.policy,
        score: sweExploreRankerPortfolioTargetScore(metrics, target),
        metrics,
        coveredSplits: splitScores.length,
        complete: splitScores.length === splits.length,
        splitScores,
      } satisfies SWEExploreRankerPortfolioCandidate
    })
    .toSorted(sweExploreRankerPortfolioCandidateOrder)
}

function sweExploreRankerPortfolioRobustCandidate(candidates: readonly SWEExploreRankerPortfolioCandidate[]) {
  const candidate = candidates.toSorted(sweExploreRankerPortfolioRobustCandidateOrder)[0]
  if (!candidate) throw new Error("No ranker portfolio candidates")
  return candidate
}

function sweExploreRankerPortfolioSplitWinner(
  split: SWEExploreRankerPortfolioSplit,
  budget: number,
  target: SWEExploreRankerPortfolioTarget,
) {
  return split.rows
    .filter((row) => row.budget === budget)
    .map((row) => {
      const score = sweExploreRankerPortfolioTargetScore(row.metrics, target)
      return {
        ranker: row.ranker,
        policy: row.policy,
        score,
        metrics: row.metrics,
        coveredSplits: 1,
        complete: true,
        splitScores: [{ split: split.id, score, metrics: row.metrics }],
      } satisfies SWEExploreRankerPortfolioCandidate
    })
    .toSorted(sweExploreRankerPortfolioCandidateOrder)[0]
}

function sweExploreRankerPortfolioEvaluateFrozenCandidate(input: {
  readonly splits: readonly SWEExploreRankerPortfolioSplit[]
  readonly trainSplit: SWEExploreRankerPortfolioSplit
  readonly budget: number
  readonly candidate: SWEExploreRankerPortfolioCandidate
  readonly target: SWEExploreRankerPortfolioTarget
  readonly maximumHeldoutLoss: number
}): SWEExploreRankerPortfolioFrozenEvaluation {
  const missingSplits: string[] = []
  const evalSplits = input.splits.flatMap((split) => {
    const row = split.rows.find(
      (item) =>
        item.budget === input.budget &&
        item.ranker === input.candidate.ranker &&
        item.policy === input.candidate.policy,
    )
    const winner = sweExploreRankerPortfolioSplitWinner(split, input.budget, input.target)
    if (!row || !winner) {
      missingSplits.push(split.id)
      return []
    }
    const score = sweExploreRankerPortfolioTargetScore(row.metrics, input.target)
    return [
      {
        evalSplit: split.id,
        score,
        metrics: row.metrics,
        bestRanker: winner.ranker,
        bestPolicy: winner.policy,
        bestScore: winner.score,
        bestMetrics: winner.metrics,
        regretVsBest: winner.score - score,
      },
    ]
  })
  const heldout = evalSplits.filter((item) => item.evalSplit !== input.trainSplit.id)
  const heldoutMissing = missingSplits.filter((split) => split !== input.trainSplit.id)
  const heldoutRegrets = heldout.map((item) => item.regretVsBest)
  const maxRegretVsBest = heldoutRegrets.length === 0 ? 0 : Math.max(...heldoutRegrets)
  const minScoreDeltaVsBest = heldoutRegrets.length === 0 ? 0 : -maxRegretVsBest
  return {
    evalSplits,
    missingSplits,
    heldout: {
      splits: heldout.length,
      missingSplits: heldoutMissing,
      meanScore: meanNumber(heldout.map((item) => item.score)),
      meanRegretVsBest: meanNumber(heldoutRegrets),
      maxRegretVsBest,
      minScoreDeltaVsBest,
      stable: heldout.length > 0 && heldoutMissing.length === 0 && maxRegretVsBest <= input.maximumHeldoutLoss,
    },
  }
}

function sweExploreRankerPortfolioCandidateOrder(
  a: SWEExploreRankerPortfolioCandidate,
  b: SWEExploreRankerPortfolioCandidate,
) {
  return (
    Number(b.complete) - Number(a.complete) ||
    b.coveredSplits - a.coveredSplits ||
    b.score - a.score ||
    b.metrics.f1 - a.metrics.f1 ||
    b.metrics.recall - a.metrics.recall ||
    SWE_EXPLORE_REPO_RANKERS.indexOf(a.ranker) - SWE_EXPLORE_REPO_RANKERS.indexOf(b.ranker) ||
    SessionContextLedger.selectionPolicyOrder(a.policy) - SessionContextLedger.selectionPolicyOrder(b.policy)
  )
}

function sweExploreRankerPortfolioRobustCandidateOrder(
  a: SWEExploreRankerPortfolioCandidate,
  b: SWEExploreRankerPortfolioCandidate,
) {
  return (
    Number(b.complete) - Number(a.complete) ||
    b.coveredSplits - a.coveredSplits ||
    sweExploreRankerPortfolioCandidateMinScore(b) - sweExploreRankerPortfolioCandidateMinScore(a) ||
    sweExploreRankerPortfolioCandidateWorstF1(b) - sweExploreRankerPortfolioCandidateWorstF1(a) ||
    sweExploreRankerPortfolioCandidateOrder(a, b)
  )
}

function sweExploreRankerPortfolioCandidateMinScore(candidate: SWEExploreRankerPortfolioCandidate) {
  return Math.min(...candidate.splitScores.map((item) => item.score))
}

function sweExploreRankerPortfolioCandidateWorstF1(candidate: SWEExploreRankerPortfolioCandidate) {
  return Math.min(...candidate.splitScores.map((item) => item.metrics.f1))
}

function meanSWEExploreRankerPortfolioMetrics(metrics: readonly SWEExploreRankerPortfolioMetrics[]) {
  return {
    f1: meanNumber(metrics.map((item) => item.f1)),
    recall: meanNumber(metrics.map((item) => item.recall)),
    precision: meanNumber(metrics.map((item) => item.precision)),
    firstUsefulHit: meanNumber(metrics.map((item) => item.firstUsefulHit)),
  }
}

function sweExploreRankerPortfolioTargetScore(
  metrics: SWEExploreRankerPortfolioMetrics,
  target: SWEExploreRankerPortfolioTarget,
) {
  if (target === "recall") return metrics.recall
  if (target === "precision") return metrics.precision
  if (target === "first-useful-hit") return metrics.firstUsefulHit
  if (target === "f1-first-useful") return harmonicMean(metrics.f1, metrics.firstUsefulHit)
  return metrics.f1
}

function harmonicMean(left: number, right: number) {
  if (left <= 0 || right <= 0) return 0
  return (2 * left * right) / (left + right)
}

function sweExploreRankerPortfolioRowKey(row: SWEExploreRankerPortfolioRow) {
  return `${row.ranker}\0${row.policy}`
}

function sweExploreRankerPortfolioRankerCounts(rows: readonly { readonly selectedRanker: SWEExploreRepoRanker }[]) {
  return Array.from(Map.groupBy(rows, (row) => row.selectedRanker).entries())
    .map(([ranker, selected]) => ({ ranker, budgets: selected.length }))
    .toSorted(
      (a, b) =>
        b.budgets - a.budgets ||
        SWE_EXPLORE_REPO_RANKERS.indexOf(a.ranker) - SWE_EXPLORE_REPO_RANKERS.indexOf(b.ranker),
    )
}

function sweExploreRankerPortfolioPairCounts(
  rows: readonly {
    readonly selectedRanker: SWEExploreRepoRanker
    readonly selectedPolicy: SessionContextLedger.SelectionPolicy
  }[],
) {
  return Array.from(Map.groupBy(rows, (row) => `${row.selectedRanker}\0${row.selectedPolicy}`).entries())
    .map(([key, selected]) => {
      const [ranker, policy] = key.split("\0")
      return {
        ranker: sweExploreRepoRanker(ranker ?? "", "ranker portfolio pair ranker"),
        policy: parsePolicyWithName(policy ?? "", "ranker portfolio pair policy"),
        budgets: selected.length,
      }
    })
    .toSorted(
      (a, b) =>
        b.budgets - a.budgets ||
        SWE_EXPLORE_REPO_RANKERS.indexOf(a.ranker) - SWE_EXPLORE_REPO_RANKERS.indexOf(b.ranker) ||
        SessionContextLedger.selectionPolicyOrder(a.policy) - SessionContextLedger.selectionPolicyOrder(b.policy),
    )
}

async function evaluateSWEExploreRankerGateRepoFolds(input: {
  readonly input: string
  readonly folds: number
  readonly minimumGain?: number
}) {
  if (!input.input) {
    throw new Error("--swe-explore-ranker-gate-repo-fold-output requires --swe-explore-ranker-gate-repo-fold-input")
  }
  const examples = sweExploreRankerGateExamplesFromSweepReport(await Bun.file(input.input).json(), input.input)
  const folds = sweExploreRankerGateRepoFolds(examples, input.folds)
  const gates = folds
    .flatMap((fold) => {
      const heldoutRepos = new Set(fold.repos)
      const trainExamples = examples.filter(
        (example) => !heldoutRepos.has(sweExploreRankerGateRepo(example.instanceID)),
      )
      const trainByKey = Map.groupBy(trainExamples, sweExploreRankerGateExampleKey)
      return Array.from(Map.groupBy(fold.examples, sweExploreRankerGateExampleKey).entries()).flatMap(
        ([key, evalExamples]) => {
          const matchingTrainExamples = trainByKey.get(key) ?? []
          const first = evalExamples[0]
          if (!first || matchingTrainExamples.length === 0) return []
          const rule = trainSWEExploreRankerGate(matchingTrainExamples, { minimumGain: input.minimumGain ?? 0 })
          const train = sweExploreRankerGateTransferScore(matchingTrainExamples, rule)
          const heldout = sweExploreRankerGateTransferScore(evalExamples, rule)
          return [
            {
              fold: fold.id,
              heldoutRepos: fold.repos,
              baselineRanker: first.baselineRanker,
              ranker: first.ranker,
              policy: first.policy,
              budget: first.budget,
              minimumGain: input.minimumGain ?? 0,
              trainCases: matchingTrainExamples.length,
              heldoutCases: evalExamples.length,
              rule,
              train,
              trainChoices: sweExploreRankerGateChoiceCounts(matchingTrainExamples, rule),
              heldout,
              heldoutChoices: sweExploreRankerGateChoiceCounts(evalExamples, rule),
              stable: heldout.routedDeltaVsBaseline >= 0 && heldout.routedDeltaVsBestFixed >= -(input.minimumGain ?? 0),
            },
          ]
        },
      )
    })
    .toSorted(
      (a, b) =>
        a.budget - b.budget ||
        SessionContextLedger.selectionPolicyOrder(a.policy) - SessionContextLedger.selectionPolicyOrder(b.policy) ||
        a.ranker.localeCompare(b.ranker) ||
        a.fold.localeCompare(b.fold),
    )
  const heldoutScores = gates.map((gate) => gate.heldout)
  return {
    input: input.input,
    requestedFolds: input.folds,
    foldCount: folds.length,
    repoCount: new Set(examples.map((example) => sweExploreRankerGateRepo(example.instanceID))).size,
    examples: examples.length,
    minimumGain: input.minimumGain ?? 0,
    folds: folds.map((fold) => ({
      id: fold.id,
      repos: fold.repos,
      examples: fold.examples.length,
    })),
    summary: {
      gates: gates.length,
      stableGates: gates.filter((gate) => gate.stable).length,
      meanRoutedDeltaVsBaseline: meanNumber(heldoutScores.map((score) => score.routedDeltaVsBaseline)),
      meanRoutedDeltaVsBestFixed: meanNumber(heldoutScores.map((score) => score.routedDeltaVsBestFixed)),
      minRoutedDeltaVsBestFixed:
        heldoutScores.length === 0 ? 0 : Math.min(...heldoutScores.map((score) => score.routedDeltaVsBestFixed)),
      meanRoutedRegretVsOracle: meanNumber(heldoutScores.map((score) => score.routedRegretVsOracle)),
      worstDecileRoutedRegretVsOracle: worstDecileMean(heldoutScores.map((score) => score.routedRegretVsOracle)),
    },
    gates,
  }
}

function sweExploreRankerGateRepoFolds(
  examples: readonly SWEExploreRankerGateExample[],
  requestedFolds: number,
): readonly SWEExploreRankerGateRepoFold[] {
  const repoGroups = Array.from(
    Map.groupBy(examples, (example) => sweExploreRankerGateRepo(example.instanceID)).entries(),
  ).toSorted((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  if (repoGroups.length < 2) {
    throw new Error("--swe-explore-ranker-gate-repo-fold-output requires at least two repository groups")
  }
  const foldCount = Math.min(requestedFolds, repoGroups.length)
  const folds = Array.from({ length: foldCount }, (_, index) => ({
    id: `repo-fold-${index + 1}`,
    repos: [] as string[],
    examples: [] as SWEExploreRankerGateExample[],
  }))
  for (const [repo, repoExamples] of repoGroups) {
    const target = folds.toSorted(
      (a, b) => a.examples.length - b.examples.length || a.repos.length - b.repos.length || a.id.localeCompare(b.id),
    )[0]
    if (!target) throw new Error("Failed to allocate SWE-Explore ranker gate repo fold")
    target.repos.push(repo)
    target.examples.push(...repoExamples)
  }
  return folds.map((fold) => ({
    id: fold.id,
    repos: fold.repos.toSorted(),
    examples: fold.examples.toSorted(
      (a, b) =>
        sweExploreRankerGateExampleKey(a).localeCompare(sweExploreRankerGateExampleKey(b)) ||
        a.instanceID.localeCompare(b.instanceID),
    ),
  }))
}

function sweExploreRankerGateRepo(instanceID: string) {
  return instanceID.replace(/^instance_/, "").replace(/-\d+$/, "") || instanceID
}

function worstDecileMean(values: readonly number[]) {
  if (values.length === 0) return 0
  const sorted = values.toSorted((a, b) => b - a)
  return meanNumber(sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.1))))
}

async function evaluateSWEExploreRankerGateTransfer(input: {
  readonly inputs: string
  readonly labels: string
  readonly minimumGain?: number
}) {
  const splits = await readSWEExploreRankerGateTransferSplits(input)
  const gates = splits.flatMap((trainSplit) =>
    Array.from(Map.groupBy(trainSplit.examples, sweExploreRankerGateExampleKey).values()).flatMap((trainExamples) => {
      const first = trainExamples[0]
      if (!first) return []
      const rule = trainSWEExploreRankerGate(trainExamples, { minimumGain: input.minimumGain ?? 0 })
      const evalSplits = splits.flatMap((evalSplit) => {
        const evalExamples = evalSplit.examples.filter(
          (item) => sweExploreRankerGateExampleKey(item) === sweExploreRankerGateExampleKey(first),
        )
        if (evalExamples.length === 0) return []
        return [
          {
            evalSplit: evalSplit.id,
            evalCases: evalExamples.length,
            ...sweExploreRankerGateTransferScore(evalExamples, rule),
            routedChoices: sweExploreRankerGateChoiceCounts(evalExamples, rule),
          },
        ]
      })
      const heldout = evalSplits.filter((item) => item.evalSplit !== trainSplit.id)
      return [
        {
          trainSplit: trainSplit.id,
          baselineRanker: first.baselineRanker,
          ranker: first.ranker,
          policy: first.policy,
          budget: first.budget,
          minimumGain: input.minimumGain ?? 0,
          trainCases: trainExamples.length,
          rule,
          train: sweExploreRankerGateTransferScore(trainExamples, rule),
          trainChoices: sweExploreRankerGateChoiceCounts(trainExamples, rule),
          evalSplits,
          heldout: {
            splits: heldout.length,
            minRoutedDeltaVsBaseline:
              heldout.length === 0 ? 0 : Math.min(...heldout.map((item) => item.routedDeltaVsBaseline)),
            minRoutedDeltaVsBestFixed:
              heldout.length === 0 ? 0 : Math.min(...heldout.map((item) => item.routedDeltaVsBestFixed)),
          },
        },
      ]
    }),
  )
  return {
    splitCount: splits.length,
    splits: splits.map((split) => ({
      id: split.id,
      path: split.path,
      cases: split.examples.length,
    })),
    gates: gates.toSorted(
      (a, b) =>
        a.budget - b.budget ||
        SessionContextLedger.selectionPolicyOrder(a.policy) - SessionContextLedger.selectionPolicyOrder(b.policy) ||
        a.ranker.localeCompare(b.ranker) ||
        a.trainSplit.localeCompare(b.trainSplit),
    ),
  }
}

async function renderSWEExploreRankerGateReport(input: {
  readonly inputs: string
  readonly labels: string
  readonly minimumGain: number
}) {
  const portfolio = await evaluateSWEExploreRankerPortfolio({
    inputs: input.inputs,
    labels: input.labels,
    outputName: "--swe-explore-ranker-gate-report-output",
    inputsName: "--swe-explore-ranker-gate-report-inputs",
    labelsName: "--swe-explore-ranker-gate-report-labels",
    target: "f1",
  })
  const transfer = await evaluateSWEExploreRankerGateTransfer({
    inputs: input.inputs,
    labels: input.labels,
    minimumGain: input.minimumGain,
  })
  const splits = await readSWEExploreRankerGateTransferSplits({
    inputs: input.inputs,
    labels: input.labels,
    outputName: "--swe-explore-ranker-gate-report-output",
    inputsName: "--swe-explore-ranker-gate-report-inputs",
    labelsName: "--swe-explore-ranker-gate-report-labels",
  })
  const examples = splits.flatMap((split) => split.examples.map((example) => ({ split: split.id, ...example })))
  const heldout = transfer.gates.flatMap((gate) =>
    gate.evalSplits
      .filter((item) => item.evalSplit !== gate.trainSplit)
      .map((item) => ({
        trainSplit: gate.trainSplit,
        ranker: gate.ranker,
        policy: gate.policy,
        budget: gate.budget,
        rule: gate.rule,
        ...item,
      })),
  )
  const stableGates = transfer.gates.filter(
    (gate) =>
      gate.heldout.splits > 0 &&
      gate.heldout.minRoutedDeltaVsBestFixed >= -input.minimumGain &&
      gate.heldout.minRoutedDeltaVsBaseline >= 0,
  )
  const stableNonAbstainingGates = stableGates.filter((gate) => sweExploreRankerGateHeldoutCandidateChoices(gate) > 0)
  const budgets = portfolio.budgets.map((row) => row.budget)
  const policies = Array.from(new Set(portfolio.splits.flatMap((split) => split.policies))).toSorted(
    (a, b) => SessionContextLedger.selectionPolicyOrder(a) - SessionContextLedger.selectionPolicyOrder(b),
  )
  const rankers = Array.from(new Set(portfolio.splits.flatMap((split) => split.rankers))).toSorted(
    (a, b) => SWE_EXPLORE_REPO_RANKERS.indexOf(a) - SWE_EXPLORE_REPO_RANKERS.indexOf(b),
  )
  return [
    "# Gated Ranker Validation",
    "",
    "## Setup",
    markdownTable(
      ["Field", "Value"],
      [
        ["Generated", new Date().toISOString()],
        ["Splits", portfolio.splits.map((split) => `${split.id} (${split.instances} instances)`).join(", ")],
        ["Budgets", budgets.join(", ")],
        ["Candidate rankers", rankers.join(", ")],
        ["Policies", policies.join(", ")],
        ["Label rule", `structural wins ties within epsilon=${formatScore(input.minimumGain)}`],
        ["Gate", "one-stump threshold over observable packet/ranker-disagreement features"],
        ["Scoring", "SWE-Explore official-style F1"],
      ],
    ),
    "",
    "## Aggregate Results",
    markdownTable(
      ["Metric", "Value"],
      [
        ["Best fixed mean F1", formatScore(portfolio.portfolio.meanF1)],
        ["Robust fixed mean F1", formatScore(portfolio.portfolio.meanRobustF1)],
        ["Held-out gate rows", String(heldout.length)],
        [
          "Mean held-out routed delta vs structural",
          formatScore(meanNumber(heldout.map((item) => item.routedDeltaVsBaseline))),
        ],
        [
          "Mean held-out routed delta vs best fixed",
          formatScore(meanNumber(heldout.map((item) => item.routedDeltaVsBestFixed))),
        ],
        ["Mean held-out regret vs oracle", formatScore(meanNumber(heldout.map((item) => item.routedRegretVsOracle)))],
        ["Stable gates under epsilon", String(stableGates.length)],
        ["Stable non-abstaining gates under epsilon", String(stableNonAbstainingGates.length)],
      ],
    ),
    "",
    "## Per-Budget Results",
    markdownTable(
      ["Budget", "Best fixed", "Best F1", "Robust fixed", "Robust F1", "Gate held-out delta vs best", "Gate regret"],
      portfolio.budgets.map((row) => {
        const budgetHeldout = heldout.filter((item) => item.budget === row.budget)
        return [
          String(row.budget),
          `${row.selectedRanker}/${row.selectedPolicy}`,
          formatScore(row.selectedMetrics.f1),
          `${row.robustRanker}/${row.robustPolicy}`,
          formatScore(row.robustMetrics.f1),
          formatScore(meanNumber(budgetHeldout.map((item) => item.routedDeltaVsBestFixed))),
          formatScore(meanNumber(budgetHeldout.map((item) => item.routedRegretVsOracle))),
        ]
      }),
    ),
    "",
    "## Split Results",
    markdownTable(
      ["Split", "Instances", "Rankers", "Budgets"],
      portfolio.splits.map((split) => [
        split.id,
        String(split.instances),
        split.rankers.join(", "),
        split.budgets.join(", "),
      ]),
    ),
    "",
    "## Oracle Headroom",
    markdownTable(
      ["Budget", "Mean oracle gain vs structural", "Mean routed regret", "Rows"],
      Array.from(Map.groupBy(heldout, (item) => item.budget).entries())
        .toSorted((a, b) => a[0] - b[0])
        .map(([budget, rows]) => [
          String(budget),
          formatScore(meanNumber(rows.map((item) => item.baselineRegretVsOracle))),
          formatScore(meanNumber(rows.map((item) => item.routedRegretVsOracle))),
          String(rows.length),
        ]),
    ),
    "",
    "## Gate Rules",
    markdownTable(
      ["Train split", "Budget", "Candidate", "Policy", "Rule", "Held-out delta vs best", "Held-out regret"],
      transfer.gates
        .slice(0, 40)
        .map((gate) => [
          gate.trainSplit,
          String(gate.budget),
          gate.ranker,
          gate.policy,
          sweExploreRankerGateRuleText(gate.rule),
          formatScore(gate.heldout.minRoutedDeltaVsBestFixed),
          formatScore(
            meanNumber(
              gate.evalSplits
                .filter((item) => item.evalSplit !== gate.trainSplit)
                .map((item) => item.routedRegretVsOracle),
            ),
          ),
        ]),
    ),
    "",
    "## Case Comparisons",
    "### Biggest Candidate Wins",
    markdownTable(
      ["Split", "Budget", "Candidate", "Instance", "Delta", "Top feature delta"],
      rankerGateExamplesByDelta(examples, "desc").slice(0, 10).map(rankerGateCaseRow),
    ),
    "",
    "### Biggest Candidate Losses",
    markdownTable(
      ["Split", "Budget", "Candidate", "Instance", "Delta", "Top feature delta"],
      rankerGateExamplesByDelta(examples, "asc").slice(0, 10).map(rankerGateCaseRow),
    ),
    "",
    "## Decision",
    stableNonAbstainingGates.length > 0
      ? `Benchmark-only non-abstaining gates passed the epsilon screen: ${stableNonAbstainingGates.map((gate) => `${gate.trainSplit}/${gate.ranker}@${gate.budget}`).join(", ")}. Treat abstaining rules as evidence for keeping the structural baseline, and keep runtime default conservative until a sealed held-out report confirms transfer.`
      : stableGates.length > 0
        ? "Only abstaining gates clear the epsilon-conservative held-out screen. Keep structural or the best fixed held-out ranker as the benchmark champion and leave learned gates out of runtime defaults."
        : "No learned gate clears the epsilon-conservative held-out screen. Keep structural or the best fixed held-out ranker as the benchmark champion and leave learned gates out of runtime defaults.",
    "",
  ].join("\n")
}

function sweExploreRankerGateHeldoutCandidateChoices(gate: {
  readonly trainSplit: string
  readonly evalSplits: readonly {
    readonly evalSplit: string
    readonly routedChoices: { readonly candidate: number }
  }[]
}) {
  return gate.evalSplits
    .filter((item) => item.evalSplit !== gate.trainSplit)
    .reduce((total, item) => total + item.routedChoices.candidate, 0)
}

function markdownTable(headers: readonly string[], rows: readonly (readonly string[])[]) {
  const safeRows = rows.length ? rows : [headers.map(() => "")]
  return [
    `| ${headers.map(markdownCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...safeRows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`),
  ].join("\n")
}

function markdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
}

function formatScore(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "0.000"
}

function sweExploreRankerGateRuleText(rule: SWEExploreRankerGateRule) {
  if (rule.type === "constant") return `always ${rule.ranker}`
  const operator = rule.candidateWhen === "lte" ? "<=" : ">"
  return `if ${rule.feature} ${operator} ${formatScore(rule.threshold)} then ${rule.ranker} else ${rule.baselineRanker}`
}

function rankerGateExamplesByDelta(
  examples: readonly ({ readonly split: string } & SWEExploreRankerGateExample)[],
  direction: "asc" | "desc",
) {
  return examples.toSorted((a, b) => {
    const delta = a.candidateMetrics.f1 - a.baselineMetrics.f1 - (b.candidateMetrics.f1 - b.baselineMetrics.f1)
    return direction === "asc" ? delta : -delta
  })
}

function rankerGateCaseRow(example: { readonly split: string } & SWEExploreRankerGateExample) {
  const delta = example.candidateMetrics.f1 - example.baselineMetrics.f1
  return [
    example.split,
    String(example.budget),
    example.ranker,
    example.instanceID,
    formatScore(delta),
    topFeatureDelta(example.features),
  ]
}

function topFeatureDelta(features: ReadonlyMap<string, number>) {
  const [feature, value] = Array.from(features.entries())
    .filter(([key]) => key.startsWith("delta:"))
    .toSorted((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0] ?? ["", 0]
  return feature ? `${feature.replace(/^delta:/, "")}=${formatScore(value)}` : ""
}

function sweExploreRankerGateTransferScore(
  examples: readonly SWEExploreRankerGateExample[],
  rule: SWEExploreRankerGateRule,
) {
  const baseline = sweExploreRankerGateScore(examples.map((item) => item.baselineMetrics))
  const candidate = sweExploreRankerGateScore(examples.map((item) => item.candidateMetrics))
  const routed = sweExploreRankerGateScore(examples.map((item) => routeSWEExploreRankerGate(item, rule)))
  const oracle = sweExploreRankerGateScore(
    examples.map((item) =>
      item.candidateMetrics.f1 > item.baselineMetrics.f1 ? item.candidateMetrics : item.baselineMetrics,
    ),
  )
  return {
    baseline,
    candidate,
    routed,
    oracle,
    routedDeltaVsBaseline: routed.f1 - baseline.f1,
    routedDeltaVsCandidate: routed.f1 - candidate.f1,
    routedDeltaVsBestFixed: routed.f1 - Math.max(baseline.f1, candidate.f1),
    baselineRegretVsOracle: oracle.f1 - baseline.f1,
    candidateRegretVsOracle: oracle.f1 - candidate.f1,
    routedRegretVsOracle: oracle.f1 - routed.f1,
    routedWinsVsBaseline: examples.filter((item) => routeSWEExploreRankerGate(item, rule).f1 > item.baselineMetrics.f1)
      .length,
    routedLossesVsBaseline: examples.filter(
      (item) => routeSWEExploreRankerGate(item, rule).f1 < item.baselineMetrics.f1,
    ).length,
    routedTiesVsBaseline: examples.filter(
      (item) => routeSWEExploreRankerGate(item, rule).f1 === item.baselineMetrics.f1,
    ).length,
  }
}

function sweExploreRankerGateExampleKey(example: SWEExploreRankerGateExample) {
  return `${example.baselineRanker}\0${example.ranker}\0${example.policy}\0${example.budget}`
}

type SWEExploreRankerSweepFeatures = {
  readonly eventCount: number
  readonly fileCount: number
  readonly totalLineCost: number
  readonly averageChunkLines: number
  readonly averageEventsPerFile: number
  readonly maxFileClusterShare: number
  readonly smallChunkShare: number
  readonly mediumChunkShare: number
  readonly largeChunkShare: number
  readonly implementationPathShare: number
  readonly testPathShare: number
  readonly noisyPathShare: number
  readonly queryTermCount: number
  readonly queryCandidateTermOverlap: number
}

type SWEExploreRankerSweepPacketFeatures = {
  readonly metrics: SWEExploreRankerSweepFeatures
  readonly files: readonly string[]
  readonly eventKeys: readonly string[]
}

type SWEExploreRankerComparisonFeatures = {
  readonly fileJaccard: number
  readonly baselineRetainedFileShare: number
  readonly candidateNewFileShare: number
  readonly eventJaccard: number
  readonly baselineRetainedEventShare: number
  readonly candidateNewEventShare: number
}

function sweExploreRankerSweepFeatures(cases: readonly SessionContextLedgerBenchmark.Case[]) {
  return new Map(cases.map((item) => [item.instance_id, sweExploreRankerSweepCaseFeatures(item)] as const))
}

function sweExploreRankerSweepCaseFeatures(
  item: SessionContextLedgerBenchmark.Case,
): SWEExploreRankerSweepPacketFeatures {
  const codeEvents = item.events.filter((event) => event.kind === "code-context" || event.kind === "diff")
  const files = Array.from(new Set(codeEvents.flatMap((event) => event.files)))
  const fileRefs = codeEvents.flatMap((event) => event.files)
  const fileGroups = Map.groupBy(fileRefs, (file) => file)
  const maxFileCluster = Math.max(0, ...Array.from(fileGroups.values(), (group) => group.length))
  const tokenCounts = codeEvents.map((event) => event.tokens)
  const totalLineCost = tokenCounts.reduce((total, count) => total + count, 0)
  const pathBuckets = files.map(sweExplorePathBucket)
  const queryTerms = localTextTerms(item.query ?? "")
  const candidateTerms = localTextTerms(
    codeEvents.map((event) => `${event.summary}\n${event.files.join("\n")}`).join("\n"),
  )
  const queryOverlap = Array.from(queryTerms).filter((term) => candidateTerms.has(term)).length
  return {
    metrics: {
      eventCount: codeEvents.length,
      fileCount: files.length,
      totalLineCost,
      averageChunkLines: tokenCounts.length === 0 ? 0 : totalLineCost / tokenCounts.length,
      averageEventsPerFile: files.length === 0 ? 0 : codeEvents.length / files.length,
      maxFileClusterShare: codeEvents.length === 0 ? 0 : maxFileCluster / codeEvents.length,
      smallChunkShare: shareNumbers(tokenCounts, (count) => count <= 40),
      mediumChunkShare: shareNumbers(tokenCounts, (count) => count > 40 && count <= 80),
      largeChunkShare: shareNumbers(tokenCounts, (count) => count > 80),
      implementationPathShare: shareStrings(pathBuckets, "implementation"),
      testPathShare: shareStrings(pathBuckets, "test"),
      noisyPathShare:
        pathBuckets.length === 0
          ? 0
          : pathBuckets.filter(
              (bucket) => bucket === "test" || bucket === "docs" || bucket === "generated" || bucket === "fixture",
            ).length / pathBuckets.length,
      queryTermCount: queryTerms.size,
      queryCandidateTermOverlap: queryTerms.size === 0 ? 0 : queryOverlap / queryTerms.size,
    },
    files,
    eventKeys: codeEvents.map(sweExploreRankerSweepEventKey),
  }
}

function sweExploreRankerSweepEventKey(event: SessionContextLedger.Event) {
  const spans = event.spans?.map((span) => `${span.file}:${span.start}-${span.end}`).join(",") ?? ""
  return `${event.kind}\0${event.files.join(",")}\0${spans}\0${event.summary}`
}

function sweExploreRankerComparisonFeatures(
  candidate: SWEExploreRankerSweepPacketFeatures,
  baseline: SWEExploreRankerSweepPacketFeatures,
): SWEExploreRankerComparisonFeatures {
  const sharedFiles = intersectionSize(candidate.files, baseline.files)
  const sharedEvents = intersectionSize(candidate.eventKeys, baseline.eventKeys)
  return {
    fileJaccard: jaccardShare(candidate.files, baseline.files),
    baselineRetainedFileShare: shareOf(sharedFiles, baseline.files.length),
    candidateNewFileShare: shareOf(candidate.files.length - sharedFiles, candidate.files.length),
    eventJaccard: jaccardShare(candidate.eventKeys, baseline.eventKeys),
    baselineRetainedEventShare: shareOf(sharedEvents, baseline.eventKeys.length),
    candidateNewEventShare: shareOf(candidate.eventKeys.length - sharedEvents, candidate.eventKeys.length),
  }
}

function sweExplorePathBucket(path: string) {
  const lowered = path.toLowerCase()
  if (
    /(^|\/)(test|tests|testing|spec|specs)(__|\/|_|-|\.)/.test(lowered) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(lowered)
  )
    return "test"
  if (/(^|\/)(doc|docs|documentation|examples?)(\/|$)/.test(lowered) || /\.(md|rst|txt)$/.test(lowered)) return "docs"
  if (/(^|\/)(fixtures?|snapshots?|golden)(\/|$)/.test(lowered)) return "fixture"
  if (/(^|\/)(dist|build|generated|vendor|third_party)(\/|$)/.test(lowered) || /\.min\.[cm]?js$/.test(lowered))
    return "generated"
  return "implementation"
}

function shareNumbers(values: readonly number[], predicate: (value: number) => boolean) {
  return values.length === 0 ? 0 : values.filter(predicate).length / values.length
}

function shareOf(count: number, total: number) {
  return total === 0 ? 0 : count / total
}

function jaccardShare(left: readonly string[], right: readonly string[]) {
  const uniqueLeft = new Set(left)
  const uniqueRight = new Set(right)
  const union = new Set([...uniqueLeft, ...uniqueRight])
  return union.size === 0 ? 0 : intersectionSize(uniqueLeft, uniqueRight) / union.size
}

function intersectionSize(left: Iterable<string>, right: Iterable<string>) {
  const leftSet = left instanceof Set ? left : new Set(left)
  let count = 0
  for (const value of right) if (leftSet.has(value)) count++
  return count
}

function shareStrings(values: readonly string[], target: string) {
  return values.length === 0 ? 0 : values.filter((value) => value === target).length / values.length
}

function sweExploreChunkSweepBests(
  results: readonly {
    readonly chunkLines: number
    readonly summaries: readonly SessionContextLedgerBenchmark.SWEExploreOfficialSummary[]
  }[],
) {
  return budgets.map((budget) => {
    const candidates = results.flatMap((result) =>
      result.summaries
        .filter((summary) => summary.budget === budget)
        .map((summary) => ({
          chunkLines: result.chunkLines,
          policy: summary.policy,
          f1: summary.metrics.f1_score,
          recall: summary.metrics.recall,
          precision: summary.metrics.precision,
          firstUsefulHit: summary.metrics.first_useful_hit,
        })),
    )
    const best = candidates.toSorted((a, b) => b.f1 - a.f1 || b.recall - a.recall || a.chunkLines - b.chunkLines)[0]
    return { budget, best }
  })
}

function sweExploreRepoChunkOptions(input?: {
  readonly chunkLines?: number
  readonly chunkOverlap?: number
  readonly ranker?: SWEExploreRepoRanker
}) {
  const chunkLines =
    input?.chunkLines !== undefined
      ? [input.chunkLines]
      : args.values["swe-explore-multiscale-chunk-lines"]
        ? integerListAtLeast(
            args.values["swe-explore-multiscale-chunk-lines"],
            "--swe-explore-multiscale-chunk-lines",
            1,
          )
        : [integerAtLeast(args.values["swe-explore-chunk-lines"] ?? "80", "--swe-explore-chunk-lines", 1)]
  const configuredOverlap =
    input?.chunkOverlap ??
    (args.values["swe-explore-chunk-overlap"]
      ? integerAtLeast(args.values["swe-explore-chunk-overlap"], "--swe-explore-chunk-overlap", 0)
      : undefined)
  const chunkSizes = chunkLines.map((lines) => {
    const overlap = configuredOverlap ?? (chunkLines.length > 1 ? Math.floor(lines / 4) : 20)
    if (overlap >= lines)
      throw new Error("--swe-explore-chunk-overlap must be smaller than every configured chunk size")
    return { chunkLines: lines, chunkOverlap: overlap }
  })
  return {
    chunkSizes,
    maxFiles: integerAtLeast(args.values["swe-explore-max-repo-files"] ?? "300", "--swe-explore-max-repo-files", 1),
    maxChunks: integerAtLeast(args.values["swe-explore-max-repo-chunks"] ?? "400", "--swe-explore-max-repo-chunks", 1),
    ranker: input?.ranker ?? sweExploreRepoRanker(args.values["swe-explore-repo-ranker"] ?? "structural"),
  }
}

function sweExploreRepoCandidatesForOptions(
  rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[],
  issueMap: Readonly<Record<string, string>> | undefined,
  reposRoot: string,
  options: {
    readonly chunkSizes: readonly {
      readonly chunkLines: number
      readonly chunkOverlap: number
    }[]
    readonly maxFiles: number
    readonly maxChunks: number
    readonly ranker: SWEExploreRepoRanker
  },
  progress?: {
    readonly ranker: SWEExploreRepoRanker
    readonly enabled: boolean
  },
) {
  return Object.fromEntries(
    rows.map((row, index) => {
      const started = performance.now()
      const repoDir = resolveSWEExploreRepoDir(row, reposRoot)
      const query = row.problem_statement ?? issueMap?.[row.instance_id] ?? row.instance_id
      const chunks = repoDir ? sweExploreRepoChunks(repoDir, query, options) : []
      if (progress?.enabled) {
        console.error(
          [
            "[swe-explore-ranker-sweep]",
            `ranker=${progress.ranker}`,
            `case=${index + 1}/${rows.length}`,
            `instance=${row.instance_id}`,
            `chunks=${chunks.length}`,
            `elapsedMs=${Math.round(performance.now() - started)}`,
          ].join(" "),
        )
      }
      return [row.instance_id, chunks] as const
    }),
  )
}

function resolveSWEExploreRepoDir(row: SessionContextLedgerBenchmark.SWEExploreRow, reposRoot: string) {
  const root = isAbsolute(reposRoot) ? reposRoot : join(process.cwd(), reposRoot)
  const repoName = row.instance_id.includes("__") ? row.instance_id.split("__")[1]?.replace(/-[^-]+$/, "") : undefined
  const candidates = [
    sweExploreRepoTargetDir(row, reposRoot),
    join(root, row.instance_id),
    repoName ? join(root, repoName) : undefined,
  ].filter((item): item is string => Boolean(item))
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isDirectory())
}

function sweExploreRepoChunks(
  repoDir: string,
  query: string,
  options: {
    readonly chunkSizes: readonly {
      readonly chunkLines: number
      readonly chunkOverlap: number
    }[]
    readonly maxFiles: number
    readonly maxChunks: number
    readonly ranker: SWEExploreRepoRanker
  },
) {
  const queryTerms = localTextTerms(query)
  const queryPathTerms = localPathTerms(query)
  const chunks = rankRepoFiles(
    repoFiles(repoDir).map((file) => ({
      absolute: file,
      relative: relative(repoDir, file).replaceAll("\\", "/"),
    })),
    query,
    queryPathTerms,
    queryTerms,
    options.maxFiles,
    options.ranker,
  )
    .flatMap((file) => {
      const text = readFileSync(file.absolute, "utf8")
      return options.chunkSizes.flatMap((size) => chunkFile(file.relative, text, size.chunkLines, size.chunkOverlap))
    })
    .map((chunk, index) => ({ chunk, index }))
  return rankRepoChunks(query, queryTerms, chunks, options.ranker)
    .slice(0, options.maxChunks)
    .map(({ chunk }) => chunk)
}

function rankRepoFiles(
  files: readonly {
    readonly absolute: string
    readonly relative: string
  }[],
  query: string,
  queryPathTerms: ReadonlySet<string>,
  queryTextTerms: ReadonlySet<string>,
  maxFiles: number,
  ranker: SWEExploreRepoRanker,
) {
  const ranked = files
    .map((file) => ({
      ...file,
      score: repoFileScore(query, queryPathTerms, file.relative),
    }))
    .toSorted((a, b) => b.score - a.score || a.relative.localeCompare(b.relative))
  if (ranker !== "content-structural" && ranker !== "content-backfill") return ranked.slice(0, maxFiles)

  const queryCodeTerms = codeQueryTerms(query)
  const contentRanked = ranked
    .map((file) => ({
      ...file,
      contentScore: repoFileContentScore(queryCodeTerms, queryTextTerms, file),
    }))
    .toSorted((a, b) => b.contentScore - a.contentScore || b.score - a.score || a.relative.localeCompare(b.relative))

  if (ranker === "content-structural") {
    return contentRanked
      .map((file) => ({ ...file, score: file.score + file.contentScore }))
      .toSorted((a, b) => b.score - a.score || a.relative.localeCompare(b.relative))
      .slice(0, maxFiles)
  }

  const structuralCount = Math.floor(maxFiles * CONTENT_BACKFILL_STRUCTURAL_SHARE)
  const selected = new Map<string, (typeof ranked)[number]>()
  for (const file of ranked.slice(0, structuralCount)) selected.set(file.relative, file)
  for (const file of contentRanked) {
    if (selected.size >= maxFiles) break
    if (file.contentScore <= 0) break
    selected.set(file.relative, file)
  }
  for (const file of ranked) {
    if (selected.size >= maxFiles) break
    selected.set(file.relative, file)
  }
  const structuralPrefix = ranked.slice(0, maxFiles)
  const selectedPrefix = new Set(structuralPrefix.map((file) => file.relative))
  return [
    ...structuralPrefix.filter((file) => selected.has(file.relative)),
    ...Array.from(selected.values()).filter((file) => !selectedPrefix.has(file.relative)),
  ].slice(0, maxFiles)
}

function repoFileScore(query: string, queryTerms: ReadonlySet<string>, path: string) {
  const pathTerms = localPathTerms(path)
  let score = 0
  for (const term of queryTerms) if (pathTerms.has(term)) score += 4

  const loweredQuery = query.toLowerCase()
  const loweredPath = path.toLowerCase()
  const basename = loweredPath.split("/").at(-1) ?? loweredPath
  const stem = basename.replace(/\.[^.]+$/, "")
  if (loweredQuery.includes(loweredPath)) score += 50
  if (basename && loweredQuery.includes(basename)) score += 25
  if (stem && loweredQuery.includes(stem)) score += 20
  return score
}

function repoFileContentScore(
  queryCodeTerms: ReadonlySet<string>,
  queryTextTerms: ReadonlySet<string>,
  file: { readonly absolute: string; readonly relative: string },
) {
  if (queryCodeTerms.size === 0 && queryTextTerms.size === 0) return 0
  let text = ""
  try {
    text = readFileSync(file.absolute, "utf8").slice(0, CONTENT_STRUCTURAL_PREFILTER_BYTES)
  } catch {
    return 0
  }
  const fileTerms = localTextTerms(text)
  const filteredQueryTerms = Array.from(queryTextTerms).filter(
    (term) => term.length > 2 && !SEARCH_STOP_WORDS.has(term),
  )
  const lexicalHits = filteredQueryTerms.filter((term) => fileTerms.has(term)).length
  const definitionTerms = new Set(extractDefinitionIdentifiers(text).flatMap(identifierTerms))
  const identifierTermsInFile = new Set(extractCodeIdentifiers(text).flatMap(identifierTerms))
  const definitionHits = termIntersectionSize(queryCodeTerms, definitionTerms)
  const identifierHits = termIntersectionSize(queryCodeTerms, identifierTermsInFile)
  const pathBucket = sweExplorePathBucket(file.relative)
  const pathPenalty = pathBucket === "generated" || pathBucket === "fixture" || pathBucket === "docs" ? 4 : 0
  return Math.max(
    0,
    Math.min(8, lexicalHits * 0.5) + Math.min(18, definitionHits * 6) + Math.min(8, identifierHits * 1.5) - pathPenalty,
  )
}

function repoFiles(root: string) {
  const result: string[] = []
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    if (!dir) continue
    const entries = readdirSync(dir, { withFileTypes: true }).toSorted((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!SKIPPED_REPO_DIRS.has(entry.name)) stack.push(path)
        continue
      }
      if (!entry.isFile() || !TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue
      const stat = statSync(path)
      if (stat.size > 512_000) continue
      result.push(path)
    }
  }
  return result
}

type RepoChunkCandidate = {
  readonly chunk: SessionContextLedgerBenchmark.SWEExploreRepoChunk
  readonly index: number
}

type ScoredRepoChunkCandidate = RepoChunkCandidate & {
  readonly score: number
}

function rankRepoChunks(
  query: string,
  queryTerms: ReadonlySet<string>,
  chunks: readonly RepoChunkCandidate[],
  ranker: SWEExploreRepoRanker,
) {
  const scored =
    ranker === "bm25"
      ? repoChunkBM25Scores(query, chunks)
      : ranker === "dependency-neighbor"
        ? repoChunkDependencyNeighborScores(query, queryTerms, chunks)
        : ranker === "anchored-neighbor"
          ? repoChunkAnchoredNeighborScores(query, queryTerms, chunks)
          : ranker === "hybrid-rrf"
            ? repoChunkHybridRRFScores(query, queryTerms, chunks)
            : ranker === "structural-neighbor"
              ? repoChunkStructuralNeighborScores(query, queryTerms, chunks)
              : ranker === "structural" || ranker === "content-structural" || ranker === "content-backfill"
                ? repoChunkStructuralScores(query, queryTerms, chunks)
                : chunks.map((candidate) => ({
                    ...candidate,
                    score: repoChunkScore(query, queryTerms, candidate.chunk),
                  }))
  return sortRankedRepoChunks(scored)
}

function sortRankedRepoChunks<T extends ScoredRepoChunkCandidate>(chunks: readonly T[]) {
  return chunks.toSorted(
    (a, b) =>
      b.score - a.score ||
      a.chunk.path.localeCompare(b.chunk.path) ||
      a.chunk.start - b.chunk.start ||
      a.chunk.end - b.chunk.end ||
      a.index - b.index,
  )
}

function repoChunkBM25Scores(query: string, chunks: readonly RepoChunkCandidate[]) {
  if (chunks.length === 0) return []
  const queryTerms = Array.from(localTextTerms(query)).filter((term) => !SEARCH_STOP_WORDS.has(term))
  if (queryTerms.length === 0) {
    return chunks.map((candidate) => ({
      ...candidate,
      score: repoChunkPathBonus(query, candidate.chunk),
    }))
  }

  const documents = chunks.map((candidate) => {
    const termFrequency = new Map<string, number>()
    for (const term of localTextTermList(`${candidate.chunk.path}\n${candidate.chunk.text ?? ""}`)) {
      if (SEARCH_STOP_WORDS.has(term)) continue
      termFrequency.set(term, (termFrequency.get(term) ?? 0) + 1)
    }
    return {
      ...candidate,
      length: Math.max(
        1,
        Array.from(termFrequency.values()).reduce((total, count) => total + count, 0),
      ),
      termFrequency,
    }
  })
  const averageLength = Math.max(
    1,
    documents.reduce((total, document) => total + document.length, 0) / documents.length,
  )
  const documentFrequency = new Map<string, number>()
  for (const term of queryTerms) {
    documentFrequency.set(term, documents.filter((document) => document.termFrequency.has(term)).length)
  }

  const k1 = 1.2
  const b = 0.75
  return documents.map((document) => {
    let score = repoChunkPathBonus(query, document.chunk)
    for (const term of queryTerms) {
      const frequency = document.termFrequency.get(term) ?? 0
      if (frequency === 0) continue
      const containingDocuments = documentFrequency.get(term) ?? 0
      const idf = Math.log(1 + (documents.length - containingDocuments + 0.5) / (containingDocuments + 0.5))
      const denominator = frequency + k1 * (1 - b + b * (document.length / averageLength))
      score += idf * ((frequency * (k1 + 1)) / denominator)
    }
    return {
      chunk: document.chunk,
      index: document.index,
      score,
    }
  })
}

function repoChunkStructuralScores(
  query: string,
  queryTerms: ReadonlySet<string>,
  chunks: readonly RepoChunkCandidate[],
) {
  return repoChunkStructuralBaseScores(query, queryTerms, chunks)
}

function repoChunkStructuralNeighborScores(
  query: string,
  queryTerms: ReadonlySet<string>,
  chunks: readonly RepoChunkCandidate[],
) {
  const scored = repoChunkStructuralBaseScores(query, queryTerms, chunks)
  const seedsByPath = repoChunkStructuralSeedsByPath(scored, STRUCTURAL_NEIGHBOR_MAX_SEEDS_PER_FILE)
  return scored.map((candidate) => ({
    ...candidate,
    score: candidate.score + repoChunkNeighborScore(candidate, seedsByPath.get(candidate.chunk.path) ?? []),
  }))
}

function repoChunkDependencyNeighborScores(
  query: string,
  queryTerms: ReadonlySet<string>,
  chunks: readonly RepoChunkCandidate[],
) {
  const scored = repoChunkStructuralBaseScores(query, queryTerms, chunks)
  const seedsByPath = repoChunkStructuralSeedsByPath(scored, DEPENDENCY_NEIGHBOR_MAX_SEEDS_PER_FILE)
  const profiles = repoChunkFileProfiles(chunks)
  const dependencyBonusByPath = repoDependencyBonusByPath(seedsByPath, profiles)
  return scored.map((candidate) => ({
    ...candidate,
    score:
      candidate.score +
      repoChunkNeighborScore(candidate, seedsByPath.get(candidate.chunk.path) ?? []) +
      (dependencyBonusByPath.get(candidate.chunk.path) ?? 0),
  }))
}

function repoChunkAnchoredNeighborScores(
  query: string,
  queryTerms: ReadonlySet<string>,
  chunks: readonly RepoChunkCandidate[],
) {
  const scored = repoChunkStructuralBaseScores(query, queryTerms, chunks)
  const seedsByPath = repoChunkAnchoredSeedsByPath(scored, ANCHORED_NEIGHBOR_MAX_SEEDS_PER_FILE)
  return scored.map((candidate) => ({
    ...candidate,
    score: candidate.score + repoChunkAnchoredNeighborScore(candidate, seedsByPath.get(candidate.chunk.path) ?? []),
  }))
}

function repoChunkHybridRRFScores(
  query: string,
  queryTerms: ReadonlySet<string>,
  chunks: readonly RepoChunkCandidate[],
) {
  const weightedLists = [
    {
      weight: 0.9,
      candidates: chunks.map((candidate) => ({
        ...candidate,
        score: repoChunkScore(query, queryTerms, candidate.chunk),
      })),
    },
    { weight: 1, candidates: repoChunkBM25Scores(query, chunks) },
    { weight: 1.15, candidates: repoChunkStructuralScores(query, queryTerms, chunks) },
    { weight: 1.1, candidates: repoChunkStructuralNeighborScores(query, queryTerms, chunks) },
    { weight: 0.85, candidates: repoChunkAnchoredNeighborScores(query, queryTerms, chunks) },
    { weight: 0.75, candidates: repoChunkDependencyNeighborScores(query, queryTerms, chunks) },
  ] satisfies readonly { readonly weight: number; readonly candidates: readonly ScoredRepoChunkCandidate[] }[]
  const scores = new Map<number, number>()
  for (const list of weightedLists) {
    sortRankedRepoChunks(list.candidates).forEach((candidate, rank) => {
      scores.set(candidate.index, (scores.get(candidate.index) ?? 0) + list.weight / (HYBRID_RRF_K + rank + 1))
    })
  }
  return chunks.map((candidate) => ({
    ...candidate,
    score:
      (scores.get(candidate.index) ?? 0) + repoChunkPathBonus(query, candidate.chunk) * HYBRID_RRF_PATH_BONUS_SCALE,
  }))
}

function repoChunkStructuralSeedsByPath(
  scored: readonly StructurallyScoredRepoChunkCandidate[],
  maxSeedsPerFile: number,
) {
  const seedsByPath = new Map<string, StructurallyScoredRepoChunkCandidate[]>()
  for (const candidate of scored) {
    if (candidate.structuralScore <= 0) continue
    const seeds = seedsByPath.get(candidate.chunk.path) ?? []
    seeds.push(candidate)
    seedsByPath.set(candidate.chunk.path, seeds)
  }
  for (const [path, seeds] of seedsByPath) {
    seedsByPath.set(
      path,
      seeds.toSorted((a, b) => b.structuralScore - a.structuralScore || b.score - a.score).slice(0, maxSeedsPerFile),
    )
  }
  return seedsByPath
}

function repoChunkAnchoredSeedsByPath(
  scored: readonly StructurallyScoredRepoChunkCandidate[],
  maxSeedsPerFile: number,
) {
  const seedsByPath = new Map<string, StructurallyScoredRepoChunkCandidate[]>()
  for (const candidate of scored) {
    if (repoChunkAnchorConfidence(candidate) < ANCHORED_NEIGHBOR_MIN_SEED_CONFIDENCE) continue
    const seeds = seedsByPath.get(candidate.chunk.path) ?? []
    seeds.push(candidate)
    seedsByPath.set(candidate.chunk.path, seeds)
  }
  for (const [path, seeds] of seedsByPath) {
    seedsByPath.set(
      path,
      seeds
        .toSorted((a, b) => repoChunkAnchorConfidence(b) - repoChunkAnchorConfidence(a) || b.score - a.score)
        .slice(0, maxSeedsPerFile),
    )
  }
  return seedsByPath
}

type StructurallyScoredRepoChunkCandidate = ScoredRepoChunkCandidate & {
  readonly structuralScore: number
}

function repoChunkStructuralBaseScores(
  query: string,
  queryTerms: ReadonlySet<string>,
  chunks: readonly RepoChunkCandidate[],
): StructurallyScoredRepoChunkCandidate[] {
  const queryCodeTerms = codeQueryTerms(query)
  return chunks.map((candidate) => {
    const structuralScore = repoChunkStructuralScore(queryCodeTerms, candidate.chunk)
    return {
      ...candidate,
      score: repoChunkScore(query, queryTerms, candidate.chunk) + structuralScore,
      structuralScore,
    }
  })
}

function repoChunkNeighborScore(candidate: RepoChunkCandidate, seeds: readonly StructurallyScoredRepoChunkCandidate[]) {
  let best = 0
  for (const seed of seeds) {
    if (seed.index === candidate.index) continue
    const gap = repoChunkLineGap(candidate.chunk, seed.chunk)
    if (gap > STRUCTURAL_NEIGHBOR_MAX_LINE_GAP) continue
    const proximity = 1 - gap / STRUCTURAL_NEIGHBOR_MAX_LINE_GAP
    const bonus =
      Math.min(STRUCTURAL_NEIGHBOR_MAX_BONUS, seed.structuralScore * STRUCTURAL_NEIGHBOR_BONUS_PER_POINT) * proximity
    if (bonus > best) best = bonus
  }
  return best
}

function repoChunkAnchoredNeighborScore(
  candidate: RepoChunkCandidate,
  seeds: readonly StructurallyScoredRepoChunkCandidate[],
) {
  let best = 0
  for (const seed of seeds) {
    if (seed.index === candidate.index) continue
    const gap = repoChunkLineGap(candidate.chunk, seed.chunk)
    if (gap > ANCHORED_NEIGHBOR_MAX_LINE_GAP) continue
    const proximity = 1 - gap / ANCHORED_NEIGHBOR_MAX_LINE_GAP
    const bonus =
      Math.min(ANCHORED_NEIGHBOR_MAX_BONUS, repoChunkAnchorConfidence(seed) * ANCHORED_NEIGHBOR_BONUS_PER_POINT) *
      proximity
    if (bonus > best) best = bonus
  }
  return best
}

type RepoChunkFileProfile = {
  readonly pathTerms: ReadonlySet<string>
  readonly definitionTerms: ReadonlySet<string>
  readonly importTerms: ReadonlySet<string>
  readonly directoryTerms: ReadonlySet<string>
}

function repoChunkFileProfiles(chunks: readonly RepoChunkCandidate[]) {
  const profiles = new Map<
    string,
    {
      pathTerms: Set<string>
      definitionTerms: Set<string>
      importTerms: Set<string>
      directoryTerms: Set<string>
    }
  >()
  for (const candidate of chunks) {
    const profile = profiles.get(candidate.chunk.path) ?? {
      pathTerms: new Set(localPathTerms(candidate.chunk.path)),
      definitionTerms: new Set<string>(),
      importTerms: new Set<string>(),
      directoryTerms: new Set(localPathTerms(dirname(candidate.chunk.path))),
    }
    if (candidate.chunk.text) {
      for (const identifier of extractDefinitionIdentifiers(candidate.chunk.text)) {
        for (const term of identifierTerms(identifier)) profile.definitionTerms.add(term)
      }
      for (const term of extractImportTerms(candidate.chunk.text)) profile.importTerms.add(term)
    }
    profiles.set(candidate.chunk.path, profile)
  }
  return profiles
}

function repoDependencyBonusByPath(
  seedsByPath: ReadonlyMap<string, readonly StructurallyScoredRepoChunkCandidate[]>,
  profiles: ReadonlyMap<string, RepoChunkFileProfile>,
) {
  const bonusByPath = new Map<string, number>()
  for (const [candidatePath, candidateProfile] of profiles) {
    let best = 0
    for (const [seedPath, seeds] of seedsByPath) {
      if (seedPath === candidatePath) continue
      const seedProfile = profiles.get(seedPath)
      if (!seedProfile) continue
      const relationScore = repoFileDependencyRelationScore(seedProfile, candidateProfile)
      if (relationScore <= 0) continue
      const seedStrength = Math.max(...seeds.map((seed) => seed.structuralScore))
      const relationScale = Math.min(1, relationScore / 2.5)
      const bonus =
        Math.min(DEPENDENCY_NEIGHBOR_MAX_BONUS, seedStrength * DEPENDENCY_NEIGHBOR_BONUS_PER_POINT) * relationScale
      if (bonus > best) best = bonus
    }
    if (best > 0) bonusByPath.set(candidatePath, best)
  }
  return bonusByPath
}

function repoFileDependencyRelationScore(source: RepoChunkFileProfile, target: RepoChunkFileProfile) {
  const sourceReferencesTarget = termIntersectionSize(source.importTerms, repoFileReferenceTerms(target))
  const targetReferencesSource = termIntersectionSize(target.importTerms, repoFileReferenceTerms(source))
  const sharedImports = termIntersectionSize(source.importTerms, target.importTerms)
  const importRelation = sourceReferencesTarget * 1.25 + targetReferencesSource + Math.min(2, sharedImports) * 0.25
  if (importRelation <= 0) return 0
  const sameDirectory = termIntersectionSize(source.directoryTerms, target.directoryTerms) > 0 ? 0.15 : 0
  return Math.min(3, importRelation + sameDirectory)
}

function repoFileReferenceTerms(profile: RepoChunkFileProfile) {
  return new Set([...profile.pathTerms, ...profile.definitionTerms])
}

function termIntersectionSize(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  let count = 0
  for (const term of left) if (right.has(term)) count++
  return count
}

function repoChunkAnchorConfidence(candidate: StructurallyScoredRepoChunkCandidate) {
  return candidate.structuralScore + Math.min(3, repoChunkLexicalScore(candidate) * 0.25)
}

function repoChunkLexicalScore(candidate: StructurallyScoredRepoChunkCandidate) {
  return Math.max(0, candidate.score - candidate.structuralScore)
}

function repoChunkLineGap(
  left: SessionContextLedgerBenchmark.SWEExploreRepoChunk,
  right: SessionContextLedgerBenchmark.SWEExploreRepoChunk,
) {
  if (left.path !== right.path) return Number.POSITIVE_INFINITY
  if (left.end >= right.start && right.end >= left.start) return 0
  return left.end < right.start ? right.start - left.end : left.start - right.end
}

function codeQueryTerms(query: string) {
  return new Set(
    Array.from(localPathTerms(query)).filter((term) => term.length > 2 && !CODE_QUERY_STOP_WORDS.has(term)),
  )
}

function repoChunkStructuralScore(
  queryTerms: ReadonlySet<string>,
  chunk: SessionContextLedgerBenchmark.SWEExploreRepoChunk,
) {
  if (!chunk.text || queryTerms.size === 0) return 0
  const identifiers = extractCodeIdentifiers(chunk.text)
  const definitions = extractDefinitionIdentifiers(chunk.text)

  const matchedIdentifierTerms = new Set<string>()
  for (const identifier of identifiers) {
    for (const term of identifierTerms(identifier)) if (queryTerms.has(term)) matchedIdentifierTerms.add(term)
  }
  const matchedDefinitionTerms = new Set<string>()
  for (const identifier of definitions) {
    for (const term of identifierTerms(identifier)) if (queryTerms.has(term)) matchedDefinitionTerms.add(term)
  }

  const identifierScore = Math.min(4, matchedIdentifierTerms.size * 0.75)
  const definitionScore = Math.min(8, matchedDefinitionTerms.size * 3)
  return identifierScore + definitionScore
}

function extractCodeIdentifiers(text: string) {
  return Array.from(new Set(Array.from(text.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g), (match) => match[0]))).filter(
    (identifier) => identifier.length > 1 && !CODE_QUERY_STOP_WORDS.has(identifier.toLowerCase()),
  )
}

function extractDefinitionIdentifiers(text: string) {
  const identifiers = new Set<string>()
  const patterns = [
    /^\s*(?:async\s+)?(?:def|class|function)\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
    /^\s*(?:export\s+)?(?:const|let|var|type|interface|enum|struct|trait|func)\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
    /^\s*(?:public|private|protected)?[ \t]*(?:static[ \t]+)?[A-Za-z_<>,.?[\] \t]+[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*\(/gm,
    /^\s*def\s+([A-Za-z_][A-Za-z0-9_?!]*)/gm,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) if (match[1]) identifiers.add(match[1])
  }
  return Array.from(identifiers).filter((identifier) => identifier.length > 1)
}

function extractImportTerms(text: string) {
  const terms = new Set<string>()
  const importLines = text.match(/^\s*(?:from|import|export)\b.*$/gm) ?? []
  for (const line of importLines) {
    for (const match of line.matchAll(/["']([^"']+)["']/g)) {
      for (const term of localPathTerms(match[1] ?? "")) if (isCodeQueryTerm(term)) terms.add(term)
    }
    for (const match of line.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)) {
      const word = match[0]
      if (IMPORT_KEYWORDS.has(word.toLowerCase())) continue
      for (const term of identifierTerms(word)) terms.add(term)
    }
  }
  for (const match of text.matchAll(/\brequire\(["']([^"']+)["']\)/g)) {
    for (const term of localPathTerms(match[1] ?? "")) if (isCodeQueryTerm(term)) terms.add(term)
  }
  return terms
}

function identifierTerms(identifier: string) {
  return Array.from(localPathTerms(identifier)).filter(isCodeQueryTerm)
}

function isCodeQueryTerm(term: string) {
  return term.length > 2 && !CODE_QUERY_STOP_WORDS.has(term)
}

function chunkFile(path: string, text: string, chunkLines: number, chunkOverlap: number) {
  const lines = text.split(/\r?\n/)
  if (lines.length === 0) return []
  const stride = Math.max(1, chunkLines - chunkOverlap)
  const chunks: SessionContextLedgerBenchmark.SWEExploreRepoChunk[] = []
  for (let startIndex = 0; startIndex < lines.length; startIndex += stride) {
    const endIndex = Math.min(lines.length, startIndex + chunkLines)
    const chunkText = lines.slice(startIndex, endIndex).join("\n")
    if (!chunkText.trim()) continue
    chunks.push({
      path,
      start: startIndex + 1,
      end: endIndex,
      text: chunkText,
    })
    if (endIndex >= lines.length) break
  }
  return chunks
}

function repoChunkScore(
  query: string,
  queryTerms: ReadonlySet<string>,
  chunk: SessionContextLedgerBenchmark.SWEExploreRepoChunk,
) {
  const chunkTerms = localTextTerms(`${chunk.path}\n${chunk.text ?? ""}`)
  let score = 0
  for (const term of queryTerms) if (chunkTerms.has(term)) score += 1
  return score + repoChunkPathBonus(query, chunk)
}

function repoChunkPathBonus(query: string, chunk: SessionContextLedgerBenchmark.SWEExploreRepoChunk) {
  const loweredQuery = query.toLowerCase()
  const path = chunk.path.toLowerCase()
  const basename = path.split("/").at(-1) ?? path
  let score = 0
  if (loweredQuery.includes(path)) score += 25
  if (basename && loweredQuery.includes(basename)) score += 8
  return score
}

function localTextTermList(input: string) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((term) => term.length > 1)
}

function localTextTerms(input: string) {
  return new Set(localTextTermList(input))
}

function localPathTerms(input: string) {
  const expanded = input.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
  const terms = [...input.toLowerCase().split(/[^a-z0-9_]+/), ...expanded.toLowerCase().split(/[^a-z0-9]+/)].flatMap(
    (term) => [term, ...term.split(/_+/)],
  )
  return new Set(terms.flatMap(localTermVariants).filter((term) => term.length > 1))
}

function localTermVariants(term: string) {
  if (term.length > 3 && term.endsWith("s")) return [term, term.slice(0, -1)]
  return [term]
}

function issueText(input: unknown) {
  return (
    stringValue(input, "problem_statement") ??
    stringValue(input, "issue") ??
    stringValue(input, "query") ??
    stringValue(input, "text")
  )
}

function stringValue(input: unknown, key: string) {
  const record = recordValue(input)
  const value = record?.[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function recordValue(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined
  return Object.fromEntries(Object.entries(input))
}

async function loadAgentRetrievalBenchChunks(
  samples: readonly SessionContextLedgerBenchmark.AgentRetrievalBenchSample[] | undefined,
) {
  if (args.values["agent-retrieval-bench-chunks"]) {
    return SessionContextLedgerBenchmark.parseAgentRetrievalBenchChunksJsonl(
      await Bun.file(args.values["agent-retrieval-bench-chunks"]).text(),
    )
  }
  if (!args.values["agent-retrieval-bench-corpus-manifest"]) return undefined
  if (!samples) throw new Error("--agent-retrieval-bench-corpus-manifest requires --agent-retrieval-bench-samples")
  const manifestPath = args.values["agent-retrieval-bench-corpus-manifest"]
  const manifest = SessionContextLedgerBenchmark.parseAgentRetrievalBenchCorpusManifestJsonl(
    await Bun.file(manifestPath).text(),
  )
  const chunkPaths = SessionContextLedgerBenchmark.agentRetrievalBenchChunkPathsForSamples(samples, manifest)
  const root = args.values["agent-retrieval-bench-corpus-root"] ?? dirname(manifestPath)
  const chunks = []
  for (const path of chunkPaths) {
    const resolved = await resolveAgentRetrievalBenchChunkPath(path, root, dirname(manifestPath))
    chunks.push(...SessionContextLedgerBenchmark.parseAgentRetrievalBenchChunksJsonl(await Bun.file(resolved).text()))
  }
  return chunks
}

async function resolveAgentRetrievalBenchChunkPath(path: string, root: string, manifestDir: string) {
  if (isAbsolute(path)) return path
  const candidates = Array.from(new Set([join(root, path), join(manifestDir, path), path]))
  for (const candidate of candidates) {
    if (await Bun.file(candidate).exists()) return candidate
  }
  return candidates[0] ?? path
}

async function officialGoldPath(contextBenchRowsResponse: unknown) {
  if (args.values["gold-output"]) return args.values["gold-output"]
  if (!contextBenchRowsResponse)
    throw new Error("--official-policy-report-output requires --contextbench or --gold-output")
  const path = tempPath("context-ledger-official-gold-", ".jsonl")
  await Bun.write(
    path,
    SessionContextLedgerBenchmark.toGoldRowsFromContextBenchRowsResponse(contextBenchRowsResponse)
      .map((item) => JSON.stringify(item))
      .join("\n") + "\n",
  )
  return path
}

function officialEvaluatorOptions() {
  return {
    python: args.values["official-eval-python"] ?? "python",
    module: args.values["official-eval-module"] ?? "contextbench.evaluate",
    cache: args.values["official-eval-cache"] ?? "/tmp/contextbench-repos",
    pythonPath: args.values["official-eval-pythonpath"],
  }
}

function tempPath(prefix: string, suffix: string) {
  return `/tmp/${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`
}

async function lineCount(path: string) {
  const text = await Bun.file(path).text()
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length
}

function officialPolicyBests(
  policyResults: readonly {
    readonly policy: SessionContextLedger.SelectionPolicy
    readonly summary: SessionContextLedgerBenchmark.OfficialEvaluationSummary
  }[],
) {
  return {
    officialUtility: bestOfficialPolicy(policyResults, (item) => item.summary.final.officialUtility),
    fileF1: bestOfficialPolicy(policyResults, (item) => item.summary.final.fileF1),
    spanF1: bestOfficialPolicy(policyResults, (item) => item.summary.final.spanF1),
    lineF1: bestOfficialPolicy(policyResults, (item) => item.summary.final.lineF1),
    aucLineCoverage: bestOfficialPolicy(policyResults, (item) => item.summary.trajectory.aucLineCoverage),
  }
}

function bestOfficialPolicy(
  policyResults: readonly {
    readonly policy: SessionContextLedger.SelectionPolicy
    readonly summary: SessionContextLedgerBenchmark.OfficialEvaluationSummary
  }[],
  score: (item: {
    readonly policy: SessionContextLedger.SelectionPolicy
    readonly summary: SessionContextLedgerBenchmark.OfficialEvaluationSummary
  }) => number,
) {
  const best = policyResults.reduce<(typeof policyResults)[number] | undefined>((current, item) => {
    if (!current) return item
    const delta = score(item) - score(current)
    if (delta !== 0) return delta > 0 ? item : current
    return SessionContextLedger.selectionPolicyOrder(item.policy) <
      SessionContextLedger.selectionPolicyOrder(current.policy)
      ? item
      : current
  }, undefined)
  if (!best) throw new Error("--official-policy-report-policies must contain at least one policy")
  return {
    policy: best.policy,
    score: score(best),
  }
}

function parsePolicy(value: string) {
  const policy = SessionContextLedger.SELECTION_POLICIES.find((item) => item === value)
  if (!policy) throw new Error(`Invalid --prediction-policy: ${value}`)
  return policy
}

function parsePolicies(value: string, name: string) {
  const parsed = splitList(value).map((item) => parsePolicyWithName(item, name))
  if (parsed.length === 0) throw new Error(`Invalid ${name}: empty list`)
  return Array.from(new Set(parsed))
}

function parseSWEExploreRepoRankers(value: string, name: string) {
  const rankers = splitList(value).map((item) => sweExploreRepoRanker(item, name))
  if (rankers.length === 0) throw new Error(`Invalid ${name}: empty list`)
  return Array.from(new Set(rankers))
}

function sweExploreRepoRanker(value: string, name = "--swe-explore-repo-ranker") {
  const ranker = SWE_EXPLORE_REPO_RANKERS.find((item) => item === value)
  if (!ranker) throw new Error(`Invalid ${name}: ${value}`)
  return ranker
}

function parsePolicyWithName(value: string, name: string) {
  const policy = SessionContextLedger.SELECTION_POLICIES.find((item) => item === value)
  if (!policy) throw new Error(`Invalid ${name}: ${value}`)
  return policy
}

function parseRouterTarget(value: string, name = "--feature-router-target") {
  const targets = [
    "event-f1",
    "span-f1",
    "line-f1",
    "auc-file",
    "auc-span",
    "auc-line",
    "official-utility",
  ] satisfies readonly SessionContextLedgerBenchmark.RouterTarget[]
  const target = targets.find((item) => item === value)
  if (!target) throw new Error(`Invalid ${name}: ${value}`)
  return target
}

function parseRouterTargets(value: string | undefined, name: string) {
  if (!value) return undefined
  const targets = splitList(value).map((target) => parseRouterTarget(target, name))
  if (targets.length === 0) throw new Error(`Invalid ${name}: empty list`)
  return Array.from(new Set(targets))
}

function parseAgentRetrievalRankingStrategy(value: string) {
  const strategies = [
    "packet-order",
    "action-aware",
  ] satisfies readonly SessionContextLedgerBenchmark.AgentRetrievalRankingStrategy[]
  const strategy = strategies.find((item) => item === value)
  if (!strategy) throw new Error(`Invalid --agent-retrieval-bench-ranking-strategy: ${value}`)
  return strategy
}

function parsePortfolioObjective(value: string) {
  const objectives = [
    "target-score",
    "minimax-regret",
  ] satisfies readonly SessionContextLedgerBenchmark.PolicyPortfolioObjective[]
  const objective = objectives.find((item) => item === value)
  if (!objective) throw new Error(`Invalid --portfolio-objective: ${value}`)
  return objective
}

function parseSWEExploreRankerPortfolioTarget(value: string): SWEExploreRankerPortfolioTarget {
  const target = SWE_EXPLORE_RANKER_PORTFOLIO_TARGETS.find((item) => item === value)
  if (!target) throw new Error(`Invalid --swe-explore-ranker-portfolio-target: ${value}`)
  return target
}

async function fetchContextBenchRowsResponse() {
  const offset = integerAtLeast(args.values["contextbench-offset"] ?? "0", "--contextbench-offset", 0)
  const limit = integerAtLeast(args.values["contextbench-limit"] ?? "3", "--contextbench-limit", 0)
  const pageSize = Math.min(
    limit || 1,
    integerAtLeast(args.values["contextbench-page-size"] ?? "100", "--contextbench-page-size", 1),
  )
  const pages = Array.from({ length: Math.ceil(limit / pageSize) }, (_, index) => ({
    offset: offset + index * pageSize,
    length: Math.min(pageSize, limit - index * pageSize),
  }))
  const responses = await Promise.all(pages.map((page) => fetchContextBenchPage(page.offset, page.length)))
  return { rows: responses.flatMap(rowsFromResponse) }
}

async function fetchContextBenchPage(offset: number, length: number) {
  const params = new URLSearchParams({
    dataset: "Contextbench/ContextBench",
    config: args.values["contextbench-config"] ?? "contextbench_verified",
    split: args.values["contextbench-split"] ?? "train",
    offset: String(offset),
    length: String(length),
  })
  const url = `https://datasets-server.huggingface.co/rows?${params.toString()}`
  let lastError = `ContextBench fetch failed: ${url}`
  for (const attempt of [1, 2, 3]) {
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
      lastError = `ContextBench fetch failed: ${response.status} ${response.statusText}`
      if (response.status < 500 && response.status !== 429) break
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await sleep(attempt * 250)
  }
  throw new Error(lastError)
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function runOfficialEvaluator(input: {
  readonly python: string
  readonly module: string
  readonly gold: string
  readonly prediction: string
  readonly cache: string
  readonly output: string
  readonly pythonPath?: string
}) {
  const env = input.pythonPath ? { ...definedEnv(process.env), PYTHONPATH: input.pythonPath } : undefined
  const subprocess = Bun.spawn(
    [
      input.python,
      "-m",
      input.module,
      "--gold",
      input.gold,
      "--pred",
      input.prediction,
      "--cache",
      input.cache,
      "--out",
      input.output,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
      env,
    },
  )
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ])
  if (stdout.trim()) process.stderr.write(stdout)
  if (stderr.trim()) process.stderr.write(stderr)
  if (exitCode !== 0) {
    throw new Error(`Official ContextBench evaluator failed with exit code ${exitCode}`)
  }
}

function definedEnv(input: NodeJS.ProcessEnv) {
  return Object.fromEntries(Object.entries(input).filter((entry): entry is [string, string] => entry[1] !== undefined))
}

function rowsFromResponse(input: unknown) {
  if (!isRecord(input) || !Array.isArray(input.rows))
    throw new Error("ContextBench fetch returned malformed rows response")
  return input.rows
}

function filterSWEExploreRows(
  rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[],
  instanceIDs: readonly string[],
) {
  if (instanceIDs.length === 0) return rows
  const requested = new Set(instanceIDs)
  const filtered = rows.filter((row) => requested.has(row.instance_id))
  const found = new Set(filtered.map((row) => row.instance_id))
  const missing = instanceIDs.filter((id) => !found.has(id))
  if (missing.length > 0) throw new Error(`Missing SWE-Explore instance ids: ${missing.join(",")}`)
  return filtered
}

function filterSWEExploreDatasets(
  rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[],
  datasets: readonly string[],
) {
  if (datasets.length === 0) return rows
  const requested = new Set(datasets)
  const filtered = rows.filter((row) => requested.has(row.dataset ?? "unknown"))
  const found = new Set(filtered.map((row) => row.dataset ?? "unknown"))
  const missing = datasets.filter((dataset) => !found.has(dataset))
  if (missing.length > 0) throw new Error(`Missing SWE-Explore dataset labels: ${missing.join(",")}`)
  return filtered
}

function sliceRows<T>(rows: readonly T[], options: { readonly limit?: number; readonly offset?: number }) {
  const start = options.offset ?? 0
  return rows.slice(start, options.limit === undefined ? undefined : start + options.limit)
}

function buildSWEExploreSplitManifest(input: {
  readonly rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[]
  readonly sourceMap?: Readonly<Record<string, SWEExploreSourceRecord>>
  readonly labels: readonly string[]
  readonly seed: string
  readonly sizes?: readonly number[]
}) {
  const labels = input.labels.map((label) => label.trim()).filter(Boolean)
  if (labels.length === 0) throw new Error("--swe-explore-split-labels must contain at least one label")
  const duplicateLabel = firstDuplicate(labels)
  if (duplicateLabel) throw new Error(`SWE-Explore split labels must be unique: ${duplicateLabel}`)
  if (input.sizes && input.sizes.length !== labels.length) {
    throw new Error("--swe-explore-split-sizes must match --swe-explore-split-labels")
  }
  const rows = input.rows.toSorted((a, b) => a.instance_id.localeCompare(b.instance_id))
  const groups = Array.from(Map.groupBy(rows, (row) => sweExploreSplitRepo(row, input.sourceMap)).entries())
    .map(([repo, repoRows]) => ({
      repo,
      rows: repoRows.toSorted((a, b) => a.instance_id.localeCompare(b.instance_id)),
    }))
    .toSorted(
      (a, b) =>
        stableSplitHash(`${input.seed}\0${a.repo}`) - stableSplitHash(`${input.seed}\0${b.repo}`) ||
        a.repo.localeCompare(b.repo),
    )
  const defaultTarget = Math.ceil(rows.length / labels.length)
  const splits = labels.map((label, index) => ({
    label,
    requestedSize: input.sizes?.[index] ?? defaultTarget,
    repos: [] as string[],
    rows: [] as SessionContextLedgerBenchmark.SWEExploreRow[],
  }))
  const unassigned = {
    repos: [] as string[],
    rows: [] as SessionContextLedgerBenchmark.SWEExploreRow[],
  }
  for (const group of groups) {
    const candidates = splits.filter((split) => split.rows.length + group.rows.length <= split.requestedSize)
    if (candidates.length === 0) {
      unassigned.repos.push(group.repo)
      unassigned.rows.push(...group.rows)
      continue
    }
    const target = candidates.toSorted((a, b) => {
      const aRemaining = a.requestedSize - (a.rows.length + group.rows.length)
      const bRemaining = b.requestedSize - (b.rows.length + group.rows.length)
      return (
        aRemaining - bRemaining ||
        a.rows.length / a.requestedSize - b.rows.length / b.requestedSize ||
        a.rows.length - b.rows.length ||
        a.label.localeCompare(b.label)
      )
    })[0]
    if (!target) {
      unassigned.repos.push(group.repo)
      unassigned.rows.push(...group.rows)
      continue
    }
    target.repos.push(group.repo)
    target.rows.push(...group.rows)
  }
  return {
    dataset: "swe-explore",
    seed: input.seed,
    instances: rows.length,
    repoCount: groups.length,
    sourceMapCoverage: input.sourceMap ? rows.filter((row) => input.sourceMap?.[row.instance_id]).length : 0,
    labels,
    requestedSizes: splits.map((split) => split.requestedSize),
    splits: splits.map((split) => sweExploreSplitSummary(split.label, split.requestedSize, split.repos, split.rows)),
    unassigned: sweExploreSplitSummary("unassigned", undefined, unassigned.repos, unassigned.rows),
  }
}

function sweExploreSplitSummary(
  label: string,
  requestedSize: number | undefined,
  repos: readonly string[],
  rows: readonly SessionContextLedgerBenchmark.SWEExploreRow[],
) {
  const instanceIDs = rows.map((row) => row.instance_id).toSorted()
  return {
    label,
    ...(requestedSize === undefined ? {} : { requestedSize }),
    instances: instanceIDs.length,
    repoCount: repos.length,
    repos: repos.toSorted(),
    instanceIDs,
    instanceIDsCsv: instanceIDs.join(","),
  }
}

function sweExploreSplitRepo(
  row: SessionContextLedgerBenchmark.SWEExploreRow,
  sourceMap?: Readonly<Record<string, SWEExploreSourceRecord>>,
) {
  const source = sourceMap?.[row.instance_id]
  return (
    source?.repo ??
    sweExploreRepoFromPathHint(row.repo_dir) ??
    sweExploreRepoFromPathHint(row.repo_path) ??
    sweExploreRepoFromInstanceID(row.instance_id)
  )
}

function sweExploreRepoFromPathHint(path: string | undefined) {
  if (!path || path === "/testbed") return undefined
  const normalized = path.replace(/^repos\//, "").replace(/\/$/, "")
  if (!normalized || normalized === "." || normalized === "/") return undefined
  return sweExploreRepoFromInstanceID(normalized.split("/").pop() ?? normalized)
}

function sweExploreRepoFromInstanceID(instanceID: string) {
  const normalized = instanceID.replace(/^instance_/, "")
  const separator = normalized.indexOf("__")
  if (separator > 0) {
    const owner = normalized.slice(0, separator)
    const repo = normalized.slice(separator + 2)
    return `${owner}/${sweExploreRepoName(repo)}`
  }
  return sweExploreRepoName(normalized)
}

function sweExploreRepoName(value: string) {
  return value.match(/^(.*)-[0-9a-f]{7,40}(?:-v[A-Za-z0-9]+)?$/)?.[1] ?? value.match(/^(.*)-\d+$/)?.[1] ?? value
}

function stableSplitHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

async function readCaseSplits(input: {
  readonly inputs: string
  readonly labels: string
  readonly outputName: string
  readonly inputsName: string
  readonly labelsName: string
}) {
  const splitInputs = splitList(input.inputs)
  if (splitInputs.length === 0) throw new Error(`${input.outputName} requires ${input.inputsName}`)
  const splitLabels = splitList(input.labels)
  if (splitLabels.length > 0 && splitLabels.length !== splitInputs.length) {
    throw new Error(`${input.labelsName} must match ${input.inputsName}`)
  }
  return Promise.all(
    splitInputs.map(async (path, index) => ({
      id: splitLabels[index] ?? splitIDFromPath(path, index),
      cases: SessionContextLedgerBenchmark.parseJsonl(await Bun.file(path).text()),
    })),
  )
}

type SWEExploreRankerGateTransferSplit = {
  readonly id: string
  readonly path: string
  readonly examples: readonly SWEExploreRankerGateExample[]
}

type SWEExploreRankerGateRepoFold = {
  readonly id: string
  readonly repos: readonly string[]
  readonly examples: readonly SWEExploreRankerGateExample[]
}

async function readSWEExploreRankerPortfolioSplits(input: {
  readonly inputs: string
  readonly labels: string
  readonly outputName?: string
  readonly inputsName?: string
  readonly labelsName?: string
}) {
  const outputName = input.outputName ?? "--swe-explore-ranker-portfolio-output"
  const inputsName = input.inputsName ?? "--swe-explore-ranker-portfolio-inputs"
  const labelsName = input.labelsName ?? "--swe-explore-ranker-portfolio-labels"
  const splitInputs = splitList(input.inputs)
  if (splitInputs.length === 0) {
    throw new Error(`${outputName} requires ${inputsName}`)
  }
  const splitLabels = splitList(input.labels)
  if (splitLabels.length > 0 && splitLabels.length !== splitInputs.length) {
    throw new Error(`${labelsName} must match ${inputsName}`)
  }
  const splits = await Promise.all(
    splitInputs.map(async (path, index) =>
      sweExploreRankerPortfolioSplitFromSweepReport(
        await Bun.file(path).json(),
        path,
        splitLabels[index] ?? splitIDFromPath(path, index),
      ),
    ),
  )
  const duplicate = firstDuplicate(splits.map((split) => split.id))
  if (duplicate) throw new Error(`SWE-Explore ranker portfolio split IDs must be unique: ${duplicate}`)
  return splits
}

function sweExploreRankerPortfolioSplitFromSweepReport(
  report: unknown,
  path: string,
  id: string,
): SWEExploreRankerPortfolioSplit {
  if (!isRecord(report) || !Array.isArray(report.results)) {
    throw new Error(`Ranker sweep report must include results: ${path}`)
  }
  const rows = report.results.flatMap((result, resultIndex) =>
    sweExploreRankerPortfolioRowsFromResult(result, `${path} results[${resultIndex}]`, id),
  )
  const instances = Array.isArray(report.instances)
    ? report.instances.flatMap((item, index) =>
        typeof item === "string" ? [item] : failInvalidString(item, `${path}.instances[${index}]`),
      )
    : []
  return {
    id,
    path,
    instances,
    rankers: Array.from(new Set(rows.map((row) => row.ranker))).toSorted(
      (a, b) => SWE_EXPLORE_REPO_RANKERS.indexOf(a) - SWE_EXPLORE_REPO_RANKERS.indexOf(b),
    ),
    policies: Array.from(new Set(rows.map((row) => row.policy))).toSorted(
      (a, b) => SessionContextLedger.selectionPolicyOrder(a) - SessionContextLedger.selectionPolicyOrder(b),
    ),
    budgets: Array.from(new Set(rows.map((row) => row.budget))).toSorted((a, b) => a - b),
    rows,
  }
}

function failInvalidString(value: unknown, name: string): never[] {
  throw new Error(`Invalid ${name}: ${String(value)}`)
}

function sweExploreRankerPortfolioRowsFromResult(
  input: unknown,
  location: string,
  split: string,
): readonly SWEExploreRankerPortfolioRow[] {
  if (!isRecord(input)) throw new Error(`Invalid ${location}`)
  const ranker = sweExploreRepoRanker(stringField(input.ranker, `${location}.ranker`), `${location}.ranker`)
  if (!Array.isArray(input.summaries)) {
    throw new Error(`Ranker sweep result must include summaries: ${location}`)
  }
  return input.summaries.map((summary, index) => {
    const summaryLocation = `${location}.summaries[${index}]`
    if (!isRecord(summary)) throw new Error(`Invalid ${summaryLocation}`)
    const metrics = sweExploreRankerPortfolioMetricsFromRecord(summary.metrics, `${summaryLocation}.metrics`)
    return {
      split,
      ranker,
      policy: parsePolicyWithName(
        stringField(summary.policy, `${summaryLocation}.policy`),
        `${summaryLocation}.policy`,
      ),
      budget: integerField(summary.budget, `${summaryLocation}.budget`, 1),
      metrics,
    } satisfies SWEExploreRankerPortfolioRow
  })
}

function sweExploreRankerPortfolioMetricsFromRecord(input: unknown, name: string): SWEExploreRankerPortfolioMetrics {
  if (!isRecord(input)) throw new Error(`Missing ${name}; regenerate ranker sweep output with current CLI`)
  return {
    f1: numberField(input.f1_score, `${name}.f1_score`),
    recall: numberField(input.recall, `${name}.recall`),
    precision: numberField(input.precision, `${name}.precision`),
    firstUsefulHit: numberField(input.first_useful_hit, `${name}.first_useful_hit`),
  }
}

async function readSWEExploreRankerGateTransferSplits(input: {
  readonly inputs: string
  readonly labels: string
  readonly outputName?: string
  readonly inputsName?: string
  readonly labelsName?: string
}) {
  const outputName = input.outputName ?? "--swe-explore-ranker-gate-transfer-output"
  const inputsName = input.inputsName ?? "--swe-explore-ranker-gate-transfer-inputs"
  const labelsName = input.labelsName ?? "--swe-explore-ranker-gate-transfer-labels"
  const splitInputs = splitList(input.inputs)
  if (splitInputs.length === 0) {
    throw new Error(`${outputName} requires ${inputsName}`)
  }
  const splitLabels = splitList(input.labels)
  if (splitLabels.length > 0 && splitLabels.length !== splitInputs.length) {
    throw new Error(`${labelsName} must match ${inputsName}`)
  }
  const splits = await Promise.all(
    splitInputs.map(async (path, index) => {
      const report = await Bun.file(path).json()
      return {
        id: splitLabels[index] ?? splitIDFromPath(path, index),
        path,
        examples: sweExploreRankerGateExamplesFromSweepReport(report, path),
      } satisfies SWEExploreRankerGateTransferSplit
    }),
  )
  const duplicate = firstDuplicate(splits.map((split) => split.id))
  if (duplicate) throw new Error(`SWE-Explore ranker gate transfer split IDs must be unique: ${duplicate}`)
  return splits
}

function sweExploreRankerGateExamplesFromSweepReport(report: unknown, path: string) {
  if (!isRecord(report) || !Array.isArray(report.caseComparisons)) {
    throw new Error(`Ranker sweep report must include caseComparisons: ${path}`)
  }
  return report.caseComparisons.flatMap((item, index) =>
    sweExploreRankerGateExampleFromCaseComparison(item, path, index),
  )
}

function sweExploreRankerGateExampleFromCaseComparison(input: unknown, path: string, index: number) {
  const location = `${path} caseComparisons[${index}]`
  if (!isRecord(input)) throw new Error(`Invalid ${location}`)
  const baselineFeatures = sweExploreRankerSweepFeaturesFromRecord(
    input.baselineFeatures,
    `${location}.baselineFeatures`,
  )
  const features = sweExploreRankerSweepFeaturesFromRecord(input.features, `${location}.features`)
  const comparisonFeatures = isRecord(input.comparisonFeatures)
    ? sweExploreRankerComparisonFeaturesFromRecord(input.comparisonFeatures, `${location}.comparisonFeatures`)
    : undefined
  return [
    {
      instanceID: stringField(input.instanceID, `${location}.instanceID`),
      baselineRanker: sweExploreRepoRanker(
        stringField(input.baselineRanker, `${location}.baselineRanker`),
        `${location}.baselineRanker`,
      ),
      ranker: sweExploreRepoRanker(stringField(input.ranker, `${location}.ranker`), `${location}.ranker`),
      policy: parsePolicyWithName(stringField(input.policy, `${location}.policy`), `${location}.policy`),
      budget: integerField(input.budget, `${location}.budget`, 1),
      baselineMetrics: sweExploreRankerGateMetricsFromRecord(input.baselineMetrics, `${location}.baselineMetrics`),
      candidateMetrics: sweExploreRankerGateMetricsFromRecord(input.metrics, `${location}.metrics`),
      features: sweExploreRankerGateFeatures(features, baselineFeatures, comparisonFeatures),
    } satisfies SWEExploreRankerGateExample,
  ]
}

function sweExploreRankerGateMetricsFromRecord(input: unknown, name: string): SWEExploreRankerGateMetrics {
  if (!isRecord(input)) throw new Error(`Missing ${name}; regenerate ranker sweep output with current CLI`)
  return {
    f1: numberField(input.f1, `${name}.f1`),
    recall: numberField(input.recall, `${name}.recall`),
    precision: numberField(input.precision, `${name}.precision`),
    firstUsefulHit: numberField(input.firstUsefulHit, `${name}.firstUsefulHit`),
  }
}

function sweExploreRankerSweepFeaturesFromRecord(input: unknown, name: string): SWEExploreRankerSweepFeatures {
  if (!isRecord(input)) throw new Error(`Missing ${name}; regenerate ranker sweep output with current CLI`)
  return {
    eventCount: numberField(input.eventCount, `${name}.eventCount`),
    fileCount: numberField(input.fileCount, `${name}.fileCount`),
    totalLineCost: numberField(input.totalLineCost, `${name}.totalLineCost`),
    averageChunkLines: numberField(input.averageChunkLines, `${name}.averageChunkLines`),
    averageEventsPerFile: numberField(input.averageEventsPerFile, `${name}.averageEventsPerFile`),
    maxFileClusterShare: numberField(input.maxFileClusterShare, `${name}.maxFileClusterShare`),
    smallChunkShare: numberField(input.smallChunkShare, `${name}.smallChunkShare`),
    mediumChunkShare: numberField(input.mediumChunkShare, `${name}.mediumChunkShare`),
    largeChunkShare: numberField(input.largeChunkShare, `${name}.largeChunkShare`),
    implementationPathShare: numberField(input.implementationPathShare, `${name}.implementationPathShare`),
    testPathShare: numberField(input.testPathShare, `${name}.testPathShare`),
    noisyPathShare: numberField(input.noisyPathShare, `${name}.noisyPathShare`),
    queryTermCount: numberField(input.queryTermCount, `${name}.queryTermCount`),
    queryCandidateTermOverlap: numberField(input.queryCandidateTermOverlap, `${name}.queryCandidateTermOverlap`),
  }
}

function sweExploreRankerComparisonFeaturesFromRecord(
  input: unknown,
  name: string,
): SWEExploreRankerComparisonFeatures {
  if (!isRecord(input)) throw new Error(`Missing ${name}; regenerate ranker sweep output with current CLI`)
  return {
    fileJaccard: numberField(input.fileJaccard, `${name}.fileJaccard`),
    baselineRetainedFileShare: numberField(input.baselineRetainedFileShare, `${name}.baselineRetainedFileShare`),
    candidateNewFileShare: numberField(input.candidateNewFileShare, `${name}.candidateNewFileShare`),
    eventJaccard: numberField(input.eventJaccard, `${name}.eventJaccard`),
    baselineRetainedEventShare: numberField(input.baselineRetainedEventShare, `${name}.baselineRetainedEventShare`),
    candidateNewEventShare: numberField(input.candidateNewEventShare, `${name}.candidateNewEventShare`),
  }
}

function firstDuplicate(values: readonly string[]) {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) return value
    seen.add(value)
  }
  return undefined
}

function stringField(value: unknown, name: string) {
  if (typeof value !== "string") throw new Error(`Invalid ${name}: expected string`)
  return value
}

function optionalStringField(value: unknown, key: string) {
  if (!isRecord(value)) return undefined
  const found = value[key]
  return typeof found === "string" && found ? found : undefined
}

function numberField(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid ${name}: expected finite number`)
  return value
}

function integerField(value: unknown, name: string, minimum: number) {
  const parsed = numberField(value, name)
  if (!Number.isInteger(parsed) || parsed < minimum) throw new Error(`Invalid ${name}: expected integer >= ${minimum}`)
  return parsed
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input)
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function optionalList(value: string | undefined) {
  return value === undefined ? undefined : splitList(value)
}

function splitIDFromPath(path: string, index: number) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? `split-${index + 1}`
}

function integerAtLeast(value: string, name: string, minimum: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < minimum) throw new Error(`Invalid ${name}: ${value}`)
  return parsed
}

function integerListAtLeast(value: string, name: string, minimum: number) {
  const parsed = splitList(value).map((item) => integerAtLeast(item, name, minimum))
  if (parsed.length === 0) throw new Error(`Invalid ${name}: ${value}`)
  return parsed
}

function optionalIntegerAtLeast(value: string | undefined, name: string, minimum: number) {
  return value === undefined ? undefined : integerAtLeast(value, name, minimum)
}

function numberAtLeast(value: string, name: string, minimum: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < minimum) throw new Error(`Invalid ${name}: ${value}`)
  return parsed
}
