export * as SessionContextLedgerBenchmark from "./context-ledger-benchmark"

import { Option, Schema } from "effect"
import { Token } from "../util/token"
import { SessionContextLedger } from "./context-ledger"
import { SessionMessage } from "./message"

const EventKind = Schema.Union([
  Schema.Literal("instruction"),
  Schema.Literal("user-goal"),
  Schema.Literal("assistant-note"),
  Schema.Literal("tool-call"),
  Schema.Literal("tool-result"),
  Schema.Literal("test-evidence"),
  Schema.Literal("shell"),
  Schema.Literal("diff"),
  Schema.Literal("code-context"),
  Schema.Literal("experience"),
  Schema.Literal("compaction"),
  Schema.Literal("synthetic"),
])

const Recoverability = Schema.Union([Schema.Literal("low"), Schema.Literal("medium"), Schema.Literal("high")])

const SelectionPolicy = Schema.Union([
  Schema.Literal("recency"),
  Schema.Literal("balanced-frontier"),
  Schema.Literal("diverse-frontier"),
  Schema.Literal("query-frontier"),
  Schema.Literal("relevance-frontier"),
  Schema.Literal("coherence-frontier"),
  Schema.Literal("file-frontier"),
  Schema.Literal("adaptive-frontier"),
  Schema.Literal("fusion-frontier"),
  Schema.Literal("portfolio-frontier"),
  Schema.Literal("robust-frontier"),
  Schema.Literal("utility-frontier"),
  Schema.Literal("target-balanced-frontier"),
  Schema.Literal("official-frontier"),
  Schema.Literal("precision-frontier"),
  Schema.Literal("exploration-frontier"),
  Schema.Literal("candidate-rank-frontier"),
  Schema.Literal("budget-rank-frontier"),
  Schema.Literal("rank-portfolio-frontier"),
  Schema.Literal("coverage-rank-frontier"),
  Schema.Literal("mmr-rank-frontier"),
  Schema.Literal("action-aware-frontier"),
  Schema.Literal("intent-frontier"),
  Schema.Literal("experience-frontier"),
])

const RouterTargetSchema = Schema.Union([
  Schema.Literal("event-f1"),
  Schema.Literal("span-f1"),
  Schema.Literal("line-f1"),
  Schema.Literal("auc-file"),
  Schema.Literal("auc-span"),
  Schema.Literal("auc-line"),
  Schema.Literal("official-utility"),
])

const Span = Schema.Struct({
  file: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
})

export const Step = Schema.Struct({
  files: Schema.Array(Schema.String),
  spans: Schema.optional(
    Schema.Record(
      Schema.String,
      Schema.Array(Schema.Struct({ type: Schema.Literal("line"), start: Schema.Number, end: Schema.Number })),
    ),
  ),
  symbols: Schema.optional(Schema.Record(Schema.String, Schema.Array(Schema.String))),
})
export type Step = typeof Step.Type

export const Prediction = Schema.Struct({
  instance_id: Schema.String,
  traj_data: Schema.Struct({
    pred_steps: Schema.Array(Step),
    pred_files: Schema.Array(Schema.String),
    pred_spans: Schema.Record(
      Schema.String,
      Schema.Array(Schema.Struct({ type: Schema.Literal("line"), start: Schema.Number, end: Schema.Number })),
    ),
  }),
  model_patch: Schema.optional(Schema.String),
})
export type Prediction = typeof Prediction.Type

const CompactionSurvivalCategory = Schema.Union([
  Schema.Literal("constraint"),
  Schema.Literal("latest-test"),
  Schema.Literal("diff"),
  Schema.Literal("evidence"),
  Schema.Literal("decision"),
  Schema.Literal("file"),
  Schema.Literal("other"),
])
export type CompactionSurvivalCategory = typeof CompactionSurvivalCategory.Type

export const CompactionSurvivalGold = Schema.Struct({
  id: Schema.String,
  category: CompactionSurvivalCategory,
  text: Schema.optional(Schema.String),
  file: Schema.optional(Schema.String),
})
export type CompactionSurvivalGold = typeof CompactionSurvivalGold.Type

export const CompactionSurvivalCase = Schema.Struct({
  instance_id: Schema.String,
  context: Schema.Array(Schema.String),
  gold: Schema.Array(CompactionSurvivalGold),
})
export type CompactionSurvivalCase = typeof CompactionSurvivalCase.Type

export const CompactionSummaryGoldCase = Schema.Struct({
  instance_id: Schema.String,
  gold: Schema.Array(CompactionSurvivalGold),
  unsupported: Schema.optional(Schema.Array(CompactionSurvivalGold)),
  contradicted: Schema.optional(Schema.Array(CompactionSurvivalGold)),
  stale: Schema.optional(Schema.Array(CompactionSurvivalGold)),
})
export type CompactionSummaryGoldCase = typeof CompactionSummaryGoldCase.Type

const OfficialCountMetric = Schema.Struct({
  coverage: Schema.Number,
  precision: Schema.Number,
  intersection: Schema.Number,
  gold_size: Schema.Number,
  pred_size: Schema.Number,
})
export type OfficialCountMetric = typeof OfficialCountMetric.Type

const OfficialEditlocMetric = Schema.Struct({
  recall: Schema.Number,
  precision: Schema.Number,
  intersection: Schema.Number,
  gold_size: Schema.Number,
  pred_size: Schema.Number,
})
export type OfficialEditlocMetric = typeof OfficialEditlocMetric.Type

const OfficialCoverageVector = Schema.Struct({
  file: Schema.Number,
  symbol: Schema.Number,
  span: Schema.Number,
  line: Schema.Number,
})
export type OfficialCoverageVector = typeof OfficialCoverageVector.Type

export const OfficialEvaluationRow = Schema.Struct({
  instance_id: Schema.String,
  num_steps: Schema.Number,
  final: Schema.Struct({
    file: OfficialCountMetric,
    symbol: OfficialCountMetric,
    span: OfficialCountMetric,
    line: OfficialCountMetric,
  }),
  trajectory: Schema.optional(
    Schema.Struct({
      auc_coverage: Schema.optional(OfficialCoverageVector),
    }),
  ),
  editloc: Schema.optional(OfficialEditlocMetric),
})
export type OfficialEvaluationRow = typeof OfficialEvaluationRow.Type

export const Case = Schema.Struct({
  instance_id: Schema.String,
  query: Schema.optional(Schema.String),
  benchmark: Schema.optional(Schema.String),
  task_type: Schema.optional(Schema.String),
  repo: Schema.optional(Schema.String),
  base_commit: Schema.optional(Schema.String),
  gold_ids: Schema.Array(Schema.String),
  gold_files: Schema.Array(Schema.String),
  events: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      kind: EventKind,
      source: Schema.String,
      order: Schema.Number,
      summary: Schema.String,
      tokens: Schema.Number,
      recoverability: Recoverability,
      mustPreserve: Schema.Boolean,
      files: Schema.Array(Schema.String),
      spans: Schema.optional(Schema.Array(Span)),
      dependencies: Schema.Array(Schema.String),
    }),
  ),
})
export type Case = typeof Case.Type

const ContextBenchSpan = Schema.Struct({
  file: Schema.String,
  start_line: Schema.Number,
  end_line: Schema.Number,
  content: Schema.String,
})
export type ContextBenchSpan = typeof ContextBenchSpan.Type

export const ContextBenchRow = Schema.Struct({
  instance_id: Schema.String,
  original_inst_id: Schema.String,
  repo: Schema.String,
  repo_url: Schema.String,
  language: Schema.String,
  base_commit: Schema.String,
  gold_context: Schema.String,
  patch: Schema.String,
  test_patch: Schema.String,
  problem_statement: Schema.String,
  f2p: Schema.String,
  p2p: Schema.String,
  source: Schema.String,
})
export type ContextBenchRow = typeof ContextBenchRow.Type

export const ContextBenchRowsResponse = Schema.Struct({
  rows: Schema.Array(Schema.Struct({ row: ContextBenchRow })),
})
export type ContextBenchRowsResponse = typeof ContextBenchRowsResponse.Type

export const AgentRetrievalBenchSample = Schema.Struct({
  id: Schema.String,
  task_type: Schema.String,
  repo: Schema.optional(Schema.String),
  base_commit: Schema.optional(Schema.String),
  query: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  gold: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})
export type AgentRetrievalBenchSample = typeof AgentRetrievalBenchSample.Type

export const AgentRetrievalBenchChunk = Schema.Struct({
  chunk_id: Schema.optional(Schema.String),
  repo: Schema.optional(Schema.String),
  base_commit: Schema.optional(Schema.String),
  path: Schema.String,
  kind: Schema.optional(Schema.String),
  symbol: Schema.optional(Schema.String),
  start_line: Schema.optional(Schema.Number),
  end_line: Schema.optional(Schema.Number),
  text: Schema.optional(Schema.String),
})
export type AgentRetrievalBenchChunk = typeof AgentRetrievalBenchChunk.Type

export const AgentRetrievalBenchCorpusManifestRow = Schema.Struct({
  repo: Schema.String,
  base_commit: Schema.String,
  status: Schema.String,
  chunks_path: Schema.optional(Schema.String),
})
export type AgentRetrievalBenchCorpusManifestRow = typeof AgentRetrievalBenchCorpusManifestRow.Type

export const ExperienceRecord = Schema.Struct({
  id: Schema.String,
  summary: Schema.String,
  query: Schema.optional(Schema.String),
  repo: Schema.optional(Schema.String),
  benchmark: Schema.optional(Schema.String),
  task_type: Schema.optional(Schema.String),
  files: Schema.Array(Schema.String),
  spans: Schema.optional(Schema.Array(Span)),
})
export type ExperienceRecord = typeof ExperienceRecord.Type

export type SWEContextBenchTaskRow = {
  readonly repo: string
  readonly instance_id: string
  readonly base_commit?: string
  readonly patch?: string
  readonly test_patch?: string
  readonly problem_statement?: string
  readonly hints_text?: string
  readonly FAIL_TO_PASS?: string
  readonly PASS_TO_PASS?: string
}

export type SWEContextBenchRelationshipRow = {
  readonly related_instance_id: string
  readonly experience_instance_id: string
  readonly related_pr_url?: string
  readonly related_issue_url?: string
  readonly experience_pr_url?: string
  readonly experience_issue_url?: string
}

const SWEExploreRegion = Schema.Struct({
  path: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
})
export type SWEExploreRegion = typeof SWEExploreRegion.Type

export const SWEExploreRow = Schema.Struct({
  instance_id: Schema.String,
  repo_path: Schema.optional(Schema.String),
  repo_dir: Schema.optional(Schema.String),
  dataset: Schema.optional(Schema.String),
  problem_statement: Schema.optional(Schema.String),
  ground_truth: Schema.Struct({
    read_core_files: Schema.Array(Schema.String),
    read_core_regions: Schema.Array(SWEExploreRegion),
    read_optional_files_map: Schema.optional(Schema.Record(Schema.String, Schema.Array(Schema.String))),
    read_optional_regions_map: Schema.optional(Schema.Record(Schema.String, Schema.Array(SWEExploreRegion))),
    modified_core_files: Schema.Array(Schema.String),
    main_files: Schema.Array(Schema.String),
  }),
  read_step_info: Schema.optional(
    Schema.Record(
      Schema.String,
      Schema.Array(
        Schema.Struct({
          traj_path: Schema.String,
          step_idx: Schema.Number,
          start: Schema.Number,
          end: Schema.Number,
        }),
      ),
    ),
  ),
  meta: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})
export type SWEExploreRow = typeof SWEExploreRow.Type

export type SWEExploreRepoChunk = {
  readonly path: string
  readonly start: number
  readonly end: number
  readonly text?: string
}

export const OpenCodeExport = Schema.Struct({
  info: Schema.Record(Schema.String, Schema.Unknown),
  messages: Schema.Array(
    Schema.Struct({
      info: Schema.Record(Schema.String, Schema.Unknown),
      parts: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
    }),
  ),
})
export type OpenCodeExport = typeof OpenCodeExport.Type

export const OpenCodeExportManifestRow = Schema.Struct({
  instance_id: Schema.String,
  export_path: Schema.String,
  session_id: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
})
export type OpenCodeExportManifestRow = typeof OpenCodeExportManifestRow.Type

export const OpenCodeRunManifestRow = Schema.Struct({
  instance_id: Schema.String,
  dir: Schema.String,
  prompt: Schema.optional(Schema.String),
  prompts: Schema.optional(Schema.Array(Schema.String)),
  repeats: Schema.optional(Schema.Number),
  import_path: Schema.optional(Schema.String),
  import_session_id: Schema.optional(Schema.String),
  isolate_repeats: Schema.optional(Schema.Boolean),
  run_id: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  model: Schema.optional(Schema.String),
  variant: Schema.optional(Schema.String),
  extra_args: Schema.optional(Schema.Array(Schema.String)),
  env: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  config: Schema.optional(Schema.Json),
  answer_contains: Schema.optional(Schema.Array(Schema.String)),
  answer_regex: Schema.optional(Schema.String),
  file_checks: Schema.optional(
    Schema.Array(
      Schema.Struct({
        path: Schema.String,
        contains: Schema.optional(Schema.Array(Schema.String)),
        not_contains: Schema.optional(Schema.Array(Schema.String)),
        regex: Schema.optional(Schema.String),
      }),
    ),
  ),
  command_checks: Schema.optional(
    Schema.Array(
      Schema.Struct({
        command: Schema.Array(Schema.String),
        exit_code: Schema.optional(Schema.Number),
        contains: Schema.optional(Schema.Array(Schema.String)),
        not_contains: Schema.optional(Schema.Array(Schema.String)),
        regex: Schema.optional(Schema.String),
      }),
    ),
  ),
})
export type OpenCodeRunManifestRow = typeof OpenCodeRunManifestRow.Type

export const ContextBenchGoldRow = Schema.Struct({
  inst_id: Schema.String,
  original_inst_id: Schema.String,
  repo: Schema.String,
  repo_url: Schema.String,
  commit: Schema.String,
  gold_ctx: Schema.Array(ContextBenchSpan),
  patch: Schema.String,
  test_patch: Schema.String,
  source: Schema.String,
  language: Schema.String,
})
export type ContextBenchGoldRow = typeof ContextBenchGoldRow.Type

export type Result = {
  readonly instanceID: string
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly tokens: number
  readonly selected: number
  readonly recall: number
  readonly precision: number
  readonly f1: number
  readonly recallPerThousandTokens: number
  readonly fileRecall: number
  readonly filePrecision: number
  readonly fileF1: number
  readonly spanRecall: number
  readonly spanPrecision: number
  readonly spanF1: number
  readonly lineRecall: number
  readonly linePrecision: number
  readonly lineF1: number
  readonly aucFileCoverage: number
  readonly aucSpanCoverage: number
  readonly aucLineCoverage: number
}

export type Summary = {
  readonly budget: number
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly cases: number
  readonly tokens: number
  readonly recall: number
  readonly precision: number
  readonly f1: number
  readonly recallPerThousandTokens: number
  readonly fileRecall: number
  readonly filePrecision: number
  readonly fileF1: number
  readonly spanRecall: number
  readonly spanPrecision: number
  readonly spanF1: number
  readonly lineRecall: number
  readonly linePrecision: number
  readonly lineF1: number
  readonly aucFileCoverage: number
  readonly aucSpanCoverage: number
  readonly aucLineCoverage: number
}

export type PredictionEvaluationMetric = {
  readonly recall: number
  readonly precision: number
  readonly f1: number
}

export type PredictionEvaluationRow = {
  readonly instanceID: string
  readonly file: PredictionEvaluationMetric
  readonly span: PredictionEvaluationMetric
  readonly line: PredictionEvaluationMetric
  readonly trajectory: {
    readonly aucFileCoverage: number
    readonly aucSpanCoverage: number
    readonly aucLineCoverage: number
  }
  readonly predicted: {
    readonly files: readonly string[]
    readonly spans: readonly SessionContextLedger.Span[]
  }
  readonly gold: {
    readonly files: readonly string[]
    readonly spans: readonly SessionContextLedger.Span[]
  }
}

export type PredictionEvaluationReport = {
  readonly rows: readonly PredictionEvaluationRow[]
  readonly summary: {
    readonly cases: number
    readonly fileRecall: number
    readonly filePrecision: number
    readonly fileF1: number
    readonly spanRecall: number
    readonly spanPrecision: number
    readonly spanF1: number
    readonly lineRecall: number
    readonly linePrecision: number
    readonly lineF1: number
    readonly aucFileCoverage: number
    readonly aucSpanCoverage: number
    readonly aucLineCoverage: number
  }
}

export type BenchmarkRegistryStatus = "integrated" | "partial" | "planned" | "watchlist"

export type BenchmarkRegistrySource = {
  readonly label: string
  readonly url: string
}

export type BenchmarkRegistryEntry = {
  readonly id: string
  readonly name: string
  readonly status: BenchmarkRegistryStatus
  readonly role: string
  readonly currentSupport: string
  readonly evidenceCanSupport: readonly string[]
  readonly evidenceCannotSupport: readonly string[]
  readonly supportedOutputs: readonly string[]
  readonly primarySources: readonly BenchmarkRegistrySource[]
}

export type BenchmarkRegistryReport = {
  readonly generatedBy: "context-ledger-benchmark"
  readonly entries: readonly BenchmarkRegistryEntry[]
  readonly summary: Record<BenchmarkRegistryStatus, number>
}

export type ExperienceReplayReport = {
  readonly cases: number
  readonly experiences: number
  readonly budgets: readonly number[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly maxPerCase: number
  readonly minScore: number
  readonly summaries: readonly {
    readonly budget: number
    readonly policy: SessionContextLedger.SelectionPolicy
    readonly base: Summary
    readonly replay: Summary
    readonly deltas: ExperienceReplayMetricDeltas
    readonly selectedExperienceEvents: number
    readonly casesWithSelectedExperience: number
    readonly experienceTokens: number
  }[]
  readonly rows: readonly {
    readonly instanceID: string
    readonly budget: number
    readonly policy: SessionContextLedger.SelectionPolicy
    readonly base: Result
    readonly replay: Result
    readonly deltas: ExperienceReplayMetricDeltas
    readonly selectedExperienceEvents: number
    readonly selectedExperienceIDs: readonly string[]
    readonly experienceTokens: number
  }[]
}

export type ExperienceReplayMetricDeltas = {
  readonly eventF1: number
  readonly fileF1: number
  readonly spanF1: number
  readonly lineF1: number
  readonly aucLineCoverage: number
  readonly officialUtility: number
  readonly tokens: number
}

export type AgentRetrievalRankingMetrics = {
  readonly recallAt5: number
  readonly recallAt10: number
  readonly recallAt20: number
  readonly mrr: number
  readonly goldCoverageAt8k: number
}

export type AgentRetrievalRankingStrategy = "packet-order" | "action-aware"

export type AgentRetrievalRankingDetail = {
  readonly instanceID: string
  readonly taskType: string
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly rankingStrategy: AgentRetrievalRankingStrategy
  readonly tokens: number
  readonly goldFiles: readonly string[]
  readonly rankedFiles: readonly string[]
  readonly goldRanks: Record<string, number | null>
  readonly metrics: AgentRetrievalRankingMetrics
}

export type AgentRetrievalRankingSummary = {
  readonly taskType: string
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly rankingStrategy: AgentRetrievalRankingStrategy
  readonly cases: number
  readonly metrics: AgentRetrievalRankingMetrics
}

export type AgentRetrievalRankingReport = {
  readonly cases: number
  readonly budgets: readonly number[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly rankingStrategy: AgentRetrievalRankingStrategy
  readonly contextBudgetChars: number
  readonly summaries: readonly AgentRetrievalRankingSummary[]
  readonly details: readonly AgentRetrievalRankingDetail[]
}

export type CompactionSurvivalVariant = "raw-tail" | "context-ledger" | "context-ledger-plus-tail"

export type CompactionSurvivalRow = {
  readonly instanceID: string
  readonly variant: CompactionSurvivalVariant
  readonly budget: number
  readonly tokens: number
  readonly recall: number
  readonly survived: readonly string[]
  readonly missing: readonly string[]
  readonly categoryRecall: readonly {
    readonly category: CompactionSurvivalCategory
    readonly recall: number
    readonly survived: number
    readonly total: number
  }[]
}

export type CompactionSurvivalSummary = {
  readonly variant: CompactionSurvivalVariant
  readonly cases: number
  readonly recall: number
  readonly categoryRecall: readonly {
    readonly category: CompactionSurvivalCategory
    readonly recall: number
  }[]
}

export type CompactionSurvivalReport = {
  readonly cases: number
  readonly budget: number
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly variants: readonly CompactionSurvivalVariant[]
  readonly summaries: readonly CompactionSurvivalSummary[]
  readonly rows: readonly CompactionSurvivalRow[]
}

export type OpenCodeCompactionSummaryInput = {
  readonly instanceID: string
  readonly label?: string
  readonly sessionID?: string
  readonly exported: OpenCodeExport
}

export type OpenCodeCompactionSummaryRow = {
  readonly instanceID: string
  readonly label?: string
  readonly sessionID?: string
  readonly summaryCount: number
  readonly text: string
  readonly tokens: number
  readonly recall: number
  readonly precision: number
  readonly predictedClaims: number
  readonly falseClaimRate: number
  readonly unsupportedClaimRate: number
  readonly contradictedClaimRate: number
  readonly staleClaimRate: number
  readonly survived: readonly string[]
  readonly missing: readonly string[]
  readonly falseClaims: readonly string[]
  readonly unsupported: readonly string[]
  readonly contradicted: readonly string[]
  readonly stale: readonly string[]
  readonly categoryRecall: readonly {
    readonly category: CompactionSurvivalCategory
    readonly recall: number
    readonly survived: number
    readonly total: number
  }[]
}

export type OpenCodeCompactionSummaryReport = {
  readonly cases: number
  readonly rows: readonly OpenCodeCompactionSummaryRow[]
  readonly summary: {
    readonly recall: number
    readonly precision: number
    readonly falseClaimRate: number
    readonly unsupportedClaimRate: number
    readonly contradictedClaimRate: number
    readonly staleClaimRate: number
    readonly categoryRecall: readonly {
      readonly category: CompactionSurvivalCategory
      readonly recall: number
    }[]
  }
}

export type NoisyCompactionScenario = {
  readonly id: string
  readonly title: string
  readonly domain: string
  readonly facts: readonly string[]
  readonly distractorFiles: readonly string[]
  readonly gold: readonly CompactionSurvivalGold[]
  readonly unsupported?: readonly CompactionSurvivalGold[]
  readonly contradicted?: readonly CompactionSurvivalGold[]
  readonly stale?: readonly CompactionSurvivalGold[]
  readonly continuation: {
    readonly prompt: string
    readonly answerContains: readonly string[]
  }
}

export type NoisyCompactionFixture = {
  readonly scenario: NoisyCompactionScenario
  readonly instanceID: string
  readonly baseline: OpenCodeExport
  readonly contextLedger: OpenCodeExport
  readonly gold: CompactionSummaryGoldCase
  readonly continuation: NoisyCompactionScenario["continuation"]
}

export type SWEExploreOfficialMetrics = {
  readonly precision: number
  readonly recall: number
  readonly f1_score: number
  readonly hit_file_rate: number
  readonly noise_file_rate: number
  readonly hit_region_rate: number
  readonly noise_region_rate: number
  readonly weighted_core_coverage: number
  readonly context_efficiency: number
  readonly optional_coverage: number
  readonly ndcg_at_100: number
  readonly ndcg_at_300: number
  readonly ndcg_at_500: number
  readonly recall_at_100: number
  readonly recall_at_300: number
  readonly recall_at_500: number
  readonly first_useful_hit: number
}

export type SWEExploreOfficialRow = {
  readonly instance_id: string
  readonly explorer: string
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly regions: readonly SWEExploreRegion[]
  readonly metrics: SWEExploreOfficialMetrics
  readonly num_regions: number
}

export type SWEExploreOfficialSummary = {
  readonly explorer: string
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly cases: number
  readonly metrics: SWEExploreOfficialMetrics
}

export type SWEExploreOfficialReport = {
  readonly cases: number
  readonly budgets: readonly number[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly rows: readonly SWEExploreOfficialRow[]
  readonly summaries: readonly SWEExploreOfficialSummary[]
}

export type SWEExploreOracleFailureClass =
  | "pool-covered"
  | "empty-candidate-pool"
  | "gold-file-absent"
  | "gold-region-absent"

export type SWEExploreOracleCandidatePoolRow = {
  readonly instanceID: string
  readonly candidateFiles: number
  readonly candidateRegions: number
  readonly goldFiles: number
  readonly goldRegions: number
  readonly fileRecall: number
  readonly regionRecall: number
  readonly lineRecall: number
  readonly failureClass: SWEExploreOracleFailureClass
}

export type SWEExploreOracleBudgetRow = {
  readonly instanceID: string
  readonly budget: number
  readonly bestPolicy: SessionContextLedger.SelectionPolicy
  readonly bestPolicyMetrics: SWEExploreOfficialMetrics
  readonly fileOracleMetrics: SWEExploreOfficialMetrics
  readonly budgetOracleMetrics: SWEExploreOfficialMetrics
  readonly poolMetrics: SWEExploreOfficialMetrics
  readonly bestPolicyRegretVsBudgetOracle: number
  readonly fileOracleRegretVsBudgetOracle: number
}

export type SWEExploreOracleBudgetSummary = {
  readonly budget: number
  readonly cases: number
  readonly bestPolicyF1: number
  readonly fileOracleF1: number
  readonly budgetOracleF1: number
  readonly poolLineRecall: number
  readonly bestPolicyRegretVsBudgetOracle: number
  readonly fileOracleRegretVsBudgetOracle: number
}

export type SWEExploreOracleReport = {
  readonly cases: number
  readonly budgets: readonly number[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly candidatePool: {
    readonly summary: {
      readonly cases: number
      readonly meanFileRecall: number
      readonly meanRegionRecall: number
      readonly meanLineRecall: number
      readonly failureClasses: readonly {
        readonly failureClass: SWEExploreOracleFailureClass
        readonly cases: number
      }[]
    }
    readonly rows: readonly SWEExploreOracleCandidatePoolRow[]
  }
  readonly budgetOracles: {
    readonly summaries: readonly SWEExploreOracleBudgetSummary[]
    readonly rows: readonly SWEExploreOracleBudgetRow[]
  }
}

export type SelectionDeltaEvent = {
  readonly id: string
  readonly kind: SessionContextLedger.EventKind
  readonly tokens: number
  readonly files: readonly string[]
  readonly spans: readonly SessionContextLedger.Span[]
  readonly gold: boolean
}

export type SelectionDeltaSnapshot = {
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly tokens: number
  readonly selected: number
  readonly files: readonly string[]
  readonly goldFiles: readonly string[]
  readonly eventIDs: readonly string[]
  readonly metrics: {
    readonly eventF1: number
    readonly fileF1: number
    readonly spanF1: number
    readonly lineF1: number
    readonly officialUtility: number
  }
}

export type SelectionDeltaRow = {
  readonly instanceID: string
  readonly budget: number
  readonly baseline: SelectionDeltaSnapshot
  readonly candidate: SelectionDeltaSnapshot
  readonly deltas: {
    readonly tokens: number
    readonly selected: number
    readonly eventF1: number
    readonly fileF1: number
    readonly spanF1: number
    readonly lineF1: number
    readonly officialUtility: number
  }
  readonly gainedFiles: readonly string[]
  readonly lostFiles: readonly string[]
  readonly gainedGoldFiles: readonly string[]
  readonly lostGoldFiles: readonly string[]
  readonly gainedSpans: readonly SessionContextLedger.Span[]
  readonly lostSpans: readonly SessionContextLedger.Span[]
  readonly candidateOnlyEvents: readonly SelectionDeltaEvent[]
  readonly baselineOnlyEvents: readonly SelectionDeltaEvent[]
}

export type SelectionDeltaReport = {
  readonly baselinePolicy: SessionContextLedger.SelectionPolicy
  readonly candidatePolicy: SessionContextLedger.SelectionPolicy
  readonly budgets: readonly number[]
  readonly cases: number
  readonly rows: readonly SelectionDeltaRow[]
}

export type OfficialEvaluationSummary = {
  readonly rows: number
  readonly final: {
    readonly fileCoverage: number
    readonly filePrecision: number
    readonly fileF1: number
    readonly symbolCoverage: number
    readonly symbolPrecision: number
    readonly symbolF1: number
    readonly spanCoverage: number
    readonly spanPrecision: number
    readonly spanF1: number
    readonly lineCoverage: number
    readonly linePrecision: number
    readonly lineF1: number
    readonly officialUtility: number
  }
  readonly trajectory: {
    readonly aucFileCoverage: number
    readonly aucSymbolCoverage: number
    readonly aucSpanCoverage: number
    readonly aucLineCoverage: number
  }
  readonly editloc: {
    readonly recall: number
    readonly precision: number
  }
}

export type OfficialPolicyEvaluation = {
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly rows: readonly OfficialEvaluationRow[]
  readonly summary: OfficialEvaluationSummary
}

export type OfficialPairedDelta = {
  readonly pairedRows: number
  readonly baselineMean: number
  readonly policyMean: number
  readonly deltaMean: number
  readonly deltaStdError: number
  readonly ci95Low: number
  readonly ci95High: number
  readonly wins: number
  readonly losses: number
  readonly ties: number
  readonly winRate: number
  readonly lossRate: number
  readonly topImprovements: readonly OfficialPairedExample[]
  readonly topRegressions: readonly OfficialPairedExample[]
}

export type OfficialPairedExample = {
  readonly instanceID: string
  readonly baselineScore: number
  readonly policyScore: number
  readonly delta: number
}

export type OfficialPolicyComparison = {
  readonly baselinePolicy: SessionContextLedger.SelectionPolicy
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly officialUtility: OfficialPairedDelta
  readonly fileF1: OfficialPairedDelta
  readonly spanF1: OfficialPairedDelta
  readonly lineF1: OfficialPairedDelta
  readonly aucLineCoverage: OfficialPairedDelta
}

export type RouterTarget = typeof RouterTargetSchema.Type

export type PolicyAnalysis = {
  readonly budget: number
  readonly cases: number
  readonly oracleF1: number
  readonly oracleSpanF1: number
  readonly oracleLineF1: number
  readonly bestPolicyByF1: SessionContextLedger.SelectionPolicy
  readonly policies: readonly {
    readonly policy: SessionContextLedger.SelectionPolicy
    readonly eventWins: number
    readonly spanWins: number
    readonly lineWins: number
    readonly f1: number
    readonly spanF1: number
    readonly lineF1: number
    readonly regretF1: number
  }[]
}

export type PolicyRouterAnalysis = {
  readonly budget: number
  readonly cases: number
  readonly folds: number
  readonly routerF1: number
  readonly routerSpanF1: number
  readonly routerLineF1: number
  readonly oracleF1: number
  readonly oracleSpanF1: number
  readonly oracleLineF1: number
  readonly bestFixedPolicy: SessionContextLedger.SelectionPolicy
  readonly bestFixedF1: number
  readonly routerRegretF1: number
  readonly bestFixedRegretF1: number
  readonly trainPolicyCounts: readonly {
    readonly policy: SessionContextLedger.SelectionPolicy
    readonly folds: number
  }[]
  readonly foldResults: readonly {
    readonly fold: number
    readonly trainCases: number
    readonly evalCases: number
    readonly trainBestPolicy: SessionContextLedger.SelectionPolicy
    readonly evalF1: number
    readonly evalSpanF1: number
    readonly evalLineF1: number
    readonly regretF1: number
  }[]
}

export const FeatureRouterRule = Schema.Struct({
  feature: Schema.String,
  threshold: Schema.Number,
  lowPolicy: SelectionPolicy,
  highPolicy: SelectionPolicy,
  target: RouterTargetSchema,
  trainScore: Schema.Number,
})
export type FeatureRouterRule = typeof FeatureRouterRule.Type

export const FeatureRouterRuleArtifact = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal("context-ledger-feature-router"),
  target: RouterTargetSchema,
  policies: Schema.Array(SelectionPolicy),
  rules: Schema.Array(
    Schema.Struct({
      budget: Schema.Number,
      trainCases: Schema.Number,
      bestFixedPolicy: SelectionPolicy,
      bestFixedTargetScore: Schema.Number,
      promoted: Schema.optional(Schema.Boolean),
      validationFolds: Schema.optional(Schema.Number),
      validationTargetScore: Schema.optional(Schema.Number),
      validationBestFixedTargetScore: Schema.optional(Schema.Number),
      validationDeltaVsBestFixed: Schema.optional(Schema.Number),
      minimumValidationGain: Schema.optional(Schema.Number),
      rule: FeatureRouterRule,
    }),
  ),
})
export type FeatureRouterRuleArtifact = typeof FeatureRouterRuleArtifact.Type

export type FeatureRouterAnalysis = {
  readonly target: RouterTarget
  readonly budget: number
  readonly cases: number
  readonly folds: number
  readonly routerTargetScore: number
  readonly routerF1: number
  readonly routerSpanF1: number
  readonly routerLineF1: number
  readonly oracleTargetScore: number
  readonly oracleF1: number
  readonly oracleSpanF1: number
  readonly oracleLineF1: number
  readonly bestFixedPolicy: SessionContextLedger.SelectionPolicy
  readonly bestFixedTargetScore: number
  readonly bestFixedF1: number
  readonly targetDeltaVsBestFixed: number
  readonly f1DeltaVsBestFixed: number
  readonly routerRegretTarget: number
  readonly routerRegretF1: number
  readonly bestFixedRegretTarget: number
  readonly bestFixedRegretF1: number
  readonly featureCounts: readonly {
    readonly feature: string
    readonly folds: number
  }[]
  readonly foldResults: readonly {
    readonly fold: number
    readonly trainCases: number
    readonly evalCases: number
    readonly rule: FeatureRouterRule
    readonly evalF1: number
    readonly evalSpanF1: number
    readonly evalLineF1: number
    readonly regretF1: number
  }[]
}

export type FeatureRouterRuleEvaluation = {
  readonly target: RouterTarget
  readonly budget: number
  readonly cases: number
  readonly trainCases: number
  readonly routerTargetScore: number
  readonly routerF1: number
  readonly routerSpanF1: number
  readonly routerLineF1: number
  readonly oracleTargetScore: number
  readonly oracleF1: number
  readonly oracleSpanF1: number
  readonly oracleLineF1: number
  readonly trainingBestFixedPolicy: SessionContextLedger.SelectionPolicy
  readonly trainingBestFixedTargetScore: number
  readonly promoted: boolean
  readonly trainingValidationFolds?: number
  readonly trainingValidationDeltaVsBestFixed?: number
  readonly bestFixedPolicy: SessionContextLedger.SelectionPolicy
  readonly bestFixedTargetScore: number
  readonly bestFixedF1: number
  readonly targetDeltaVsBestFixed: number
  readonly f1DeltaVsBestFixed: number
  readonly routerRegretTarget: number
  readonly routerRegretF1: number
  readonly bestFixedRegretTarget: number
  readonly bestFixedRegretF1: number
  readonly rule: FeatureRouterRule
}

export type FeatureRouterPromotionSplit = {
  readonly id: string
  readonly cases: readonly Case[]
}

export type FeatureRouterPromotionReport = {
  readonly target: RouterTarget
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly splitCount: number
  readonly minimumValidationGain: number
  readonly minimumHeldoutGain: number
  readonly budgets: readonly {
    readonly budget: number
    readonly trainSplits: readonly {
      readonly trainSplit: string
      readonly trainCases: number
      readonly rule: FeatureRouterRule
      readonly ruleIsLearned: boolean
      readonly rulePromoted: boolean
      readonly validationDeltaVsBestFixed?: number
      readonly evalSplits: readonly {
        readonly evalSplit: string
        readonly cases: number
        readonly routerTargetScore: number
        readonly bestFixedTargetScore: number
        readonly targetDeltaVsBestFixed: number
        readonly f1DeltaVsBestFixed: number
        readonly passed: boolean
      }[]
      readonly passedEvalSplits: number
      readonly failedEvalSplits: number
      readonly promotable: boolean
    }[]
    readonly promotable: boolean
  }[]
}

export type PolicyStabilityReport = {
  readonly target: RouterTarget
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly splitCount: number
  readonly budgets: readonly {
    readonly budget: number
    readonly robustPolicy: SessionContextLedger.SelectionPolicy
    readonly bestMeanPolicy: SessionContextLedger.SelectionPolicy
    readonly policies: readonly {
      readonly policy: SessionContextLedger.SelectionPolicy
      readonly meanTargetScore: number
      readonly minTargetScore: number
      readonly maxTargetScore: number
      readonly meanF1: number
      readonly meanSpanF1: number
      readonly meanLineF1: number
      readonly splitWins: number
      readonly worstDeltaVsSplitBest: number
      readonly meanDeltaVsSplitBest: number
      readonly splitScores: readonly {
        readonly split: string
        readonly cases: number
        readonly targetScore: number
        readonly f1: number
        readonly spanF1: number
        readonly lineF1: number
        readonly deltaVsSplitBest: number
        readonly splitBest: boolean
      }[]
    }[]
  }[]
}

export type PolicyTargetComparisonReport = {
  readonly targets: readonly RouterTarget[]
  readonly budgets: readonly {
    readonly budget: number
    readonly cases: number
    readonly targets: readonly {
      readonly target: RouterTarget
      readonly bestPolicy: SessionContextLedger.SelectionPolicy
      readonly bestScore: number
      readonly oracleScore: number
      readonly policies: readonly {
        readonly policy: SessionContextLedger.SelectionPolicy
        readonly score: number
        readonly regretVsBest: number
        readonly regretVsOracle: number
      }[]
    }[]
    readonly policies: readonly {
      readonly policy: SessionContextLedger.SelectionPolicy
      readonly meanEventF1: number
      readonly meanFileF1: number
      readonly meanSpanF1: number
      readonly meanLineF1: number
      readonly meanOfficialUtility: number
      readonly worstTargetRegret: number
      readonly meanTargetRegret: number
      readonly worstOracleRegret: number
      readonly meanOracleRegret: number
      readonly targetWins: number
      readonly paretoOptimal: boolean
      readonly targetScores: readonly {
        readonly target: RouterTarget
        readonly score: number
        readonly regretVsBest: number
        readonly regretVsOracle: number
      }[]
    }[]
  }[]
}

export type PolicyPortfolioObjective = "target-score" | "minimax-regret"

export type PolicyPortfolioReport = {
  readonly objective: PolicyPortfolioObjective
  readonly target?: RouterTarget
  readonly targets: readonly RouterTarget[]
  readonly budgets: readonly {
    readonly budget: number
    readonly cases: number
    readonly selectedPolicy: SessionContextLedger.SelectionPolicy
    readonly targetWinners: readonly {
      readonly target: RouterTarget
      readonly policy: SessionContextLedger.SelectionPolicy
      readonly score: number
    }[]
    readonly selectedScores: readonly {
      readonly target: RouterTarget
      readonly score: number
      readonly regretVsBest: number
      readonly regretVsOracle: number
    }[]
    readonly selectedMeanEventF1: number
    readonly selectedMeanFileF1: number
    readonly selectedMeanSpanF1: number
    readonly selectedMeanLineF1: number
    readonly selectedMeanOfficialUtility: number
    readonly selectedWorstTargetRegret: number
    readonly selectedMeanTargetRegret: number
    readonly selectedWorstOracleRegret: number
    readonly selectedMeanOracleRegret: number
  }[]
  readonly portfolio: {
    readonly meanEventF1: number
    readonly meanFileF1: number
    readonly meanSpanF1: number
    readonly meanLineF1: number
    readonly meanOfficialUtility: number
    readonly worstTargetRegret: number
    readonly meanTargetRegret: number
    readonly worstOracleRegret: number
    readonly meanOracleRegret: number
    readonly selectedPolicyCounts: readonly {
      readonly policy: SessionContextLedger.SelectionPolicy
      readonly budgets: number
    }[]
  }
  readonly fixedPolicies: readonly {
    readonly policy: SessionContextLedger.SelectionPolicy
    readonly selectedBudgetCount: number
    readonly meanEventF1: number
    readonly meanFileF1: number
    readonly meanSpanF1: number
    readonly meanLineF1: number
    readonly meanOfficialUtility: number
    readonly worstTargetRegret: number
    readonly meanTargetRegret: number
    readonly worstOracleRegret: number
    readonly meanOracleRegret: number
  }[]
}

export type PolicyPortfolioStabilityReport = {
  readonly objective: PolicyPortfolioObjective
  readonly target?: RouterTarget
  readonly targets: readonly RouterTarget[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly splitCount: number
  readonly maximumHeldoutLoss: number
  readonly budgets: readonly {
    readonly budget: number
    readonly robustPolicy: SessionContextLedger.SelectionPolicy
    readonly bestMeanPolicy: SessionContextLedger.SelectionPolicy
    readonly fixedPolicies: readonly {
      readonly policy: SessionContextLedger.SelectionPolicy
      readonly meanObjectiveScore: number
      readonly minObjectiveScore: number
      readonly maxObjectiveScore: number
      readonly meanEventF1: number
      readonly meanOfficialUtility: number
      readonly splitWins: number
      readonly maxHeldoutLoss: number
      readonly meanHeldoutLoss: number
      readonly splitScores: readonly {
        readonly split: string
        readonly cases: number
        readonly objectiveScore: number
        readonly splitBestObjectiveScore: number
        readonly objectiveDeltaVsSplitBest: number
        readonly heldoutLoss: number
        readonly splitBest: boolean
      }[]
    }[]
    readonly trainSplits: readonly {
      readonly trainSplit: string
      readonly trainCases: number
      readonly selectedPolicy: SessionContextLedger.SelectionPolicy
      readonly selectedObjectiveScore: number
      readonly selectedWorstTargetRegret: number
      readonly selectedMeanTargetRegret: number
      readonly evalSplits: readonly {
        readonly evalSplit: string
        readonly cases: number
        readonly evalBestPolicy: SessionContextLedger.SelectionPolicy
        readonly selectedObjectiveScore: number
        readonly evalBestObjectiveScore: number
        readonly objectiveDeltaVsEvalBest: number
        readonly heldoutLoss: number
        readonly selectedMeanEventF1: number
        readonly selectedMeanOfficialUtility: number
        readonly selectedWorstTargetRegret: number
        readonly selectedMeanTargetRegret: number
        readonly passed: boolean
      }[]
      readonly passedEvalSplits: number
      readonly failedEvalSplits: number
      readonly stable: boolean
    }[]
    readonly stable: boolean
  }[]
}

const decodeCase = Schema.decodeUnknownSync(Case)
const decodeContextBenchRowsResponse = Schema.decodeUnknownSync(ContextBenchRowsResponse)
const decodeContextBenchGoldRow = Schema.decodeUnknownSync(ContextBenchGoldRow)
const decodeFeatureRouterRuleArtifact = Schema.decodeUnknownSync(FeatureRouterRuleArtifact)
const decodeJson = Schema.decodeUnknownSync(Schema.UnknownFromJsonString)
const decodeJsonOption = Schema.decodeUnknownOption(Schema.UnknownFromJsonString)
const decodeOfficialEvaluationRow = Schema.decodeUnknownSync(OfficialEvaluationRow)
const decodeOpenCodeExport = Schema.decodeUnknownSync(OpenCodeExport)
const decodeOpenCodeExportManifestRow = Schema.decodeUnknownSync(OpenCodeExportManifestRow)
const decodeOpenCodeRunManifestRow = Schema.decodeUnknownSync(OpenCodeRunManifestRow)
const decodeCompactionSurvivalCase = Schema.decodeUnknownSync(CompactionSurvivalCase)
const decodeCompactionSummaryGoldCase = Schema.decodeUnknownSync(CompactionSummaryGoldCase)
const decodePrediction = Schema.decodeUnknownSync(Prediction)
const decodeAgentRetrievalBenchChunk = Schema.decodeUnknownSync(AgentRetrievalBenchChunk)
const decodeAgentRetrievalBenchCorpusManifestRow = Schema.decodeUnknownSync(AgentRetrievalBenchCorpusManifestRow)
const decodeAgentRetrievalBenchSample = Schema.decodeUnknownSync(AgentRetrievalBenchSample)
const decodeExperienceRecord = Schema.decodeUnknownSync(ExperienceRecord)
const decodeSWEExploreRow = Schema.decodeUnknownSync(SWEExploreRow)
const decodeSpans = Schema.decodeUnknownSync(Schema.Array(ContextBenchSpan))
const decodeStringArrayOption = Schema.decodeUnknownOption(Schema.Array(Schema.String))
const decodeSessionMessages = Schema.decodeUnknownSync(Schema.Array(SessionMessage.Message))

export function parseJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeCase(JSON.parse(line)))
}

export function parsePredictionJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodePrediction(JSON.parse(line)))
}

export function parseOpenCodeExportManifestJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeOpenCodeExportManifestRow(JSON.parse(line)))
}

export function parseOpenCodeRunManifestJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeOpenCodeRunManifestRow(JSON.parse(line)))
}

export function parseContextBenchGoldJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeContextBenchGoldRow(JSON.parse(line)))
}

export function parseCompactionSurvivalJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeCompactionSurvivalCase(JSON.parse(line)))
}

export function parseCompactionSummaryGoldJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeCompactionSummaryGoldCase(JSON.parse(line)))
}

export function parseExperienceJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeExperienceRecord(JSON.parse(line)))
}

export function parseSWEContextBenchTaskJsonl(input: string) {
  return parseJsonLines(input).map((item, index) => sweContextBenchTaskRowFromUnknown(item, `line ${index + 1}`))
}

export function parseSWEContextBenchRelationshipJsonl(input: string) {
  return parseJsonLines(input).map((item, index) =>
    sweContextBenchRelationshipRowFromUnknown(item, `line ${index + 1}`),
  )
}

export function experienceRecordsFromSWEContextBenchRows(
  rows: readonly SWEContextBenchTaskRow[],
  options?: {
    readonly relationships?: readonly SWEContextBenchRelationshipRow[]
    readonly relatedInstanceIDs?: readonly string[]
  },
) {
  const allowedExperienceIDs = sweContextBenchAllowedExperienceIDs(
    options?.relationships ?? [],
    options?.relatedInstanceIDs ?? [],
  )
  return rows
    .filter((row) => allowedExperienceIDs.size === 0 || allowedExperienceIDs.has(row.instance_id))
    .map(sweContextBenchExperienceRecord)
}

export function parseOfficialJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeOfficialEvaluationRow(JSON.parse(line)))
}

export function parseAgentRetrievalBenchSamplesJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeAgentRetrievalBenchSample(JSON.parse(line)))
}

export function parseAgentRetrievalBenchChunksJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeAgentRetrievalBenchChunk(JSON.parse(line)))
}

export function parseAgentRetrievalBenchCorpusManifestJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeAgentRetrievalBenchCorpusManifestRow(JSON.parse(line)))
}

export function parseSWEExploreJsonl(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => decodeSWEExploreRow(JSON.parse(line)))
}

export function benchmarkRegistry(): BenchmarkRegistryReport {
  const entries: readonly BenchmarkRegistryEntry[] = [
    {
      id: "contextbench",
      name: "ContextBench",
      status: "integrated",
      role: "Primary external context-retrieval benchmark.",
      currentSupport:
        "Fetches rows from the Hugging Face dataset server, converts rows into ContextLedger cases, emits ContextBench-compatible prediction and gold JSONL, and can invoke the official evaluator.",
      evidenceCanSupport: [
        "File, span, line, and trajectory AUC quality for selected context.",
        "Compatibility between ContextLedger/OpenCode trajectory exports and the ContextBench prediction shape.",
        "Cheap selector comparisons before spending live model budget.",
      ],
      evidenceCannotSupport: [
        "End-to-end coding-agent solve rate without a controlled repair run.",
        "Runtime policy promotion without disjoint split, cost, and live-provider evidence.",
      ],
      supportedOutputs: [
        "--prediction-output",
        "--gold-output",
        "--official-eval-output",
        "--official-policy-report-output",
        "--prediction-eval-output",
      ],
      primarySources: [
        { label: "GitHub", url: "https://github.com/EuniAI/ContextBench" },
        { label: "Dataset", url: "https://huggingface.co/datasets/Contextbench/ContextBench" },
      ],
    },
    {
      id: "swe-explore",
      name: "SWE-Explore",
      status: "integrated",
      role: "Repository-exploration and ranked line-region benchmark.",
      currentSupport:
        "Parses public rows, prepares repository snapshots from source metadata, builds non-oracle repository candidates, emits official-style region output, and reports target, ranker-sweep, gate, portfolio, stability, and oracle diagnostics.",
      evidenceCanSupport: [
        "Line-budget retrieval quality for ranked source regions.",
        "Candidate-pool, budget, and ranker-oracle headroom before model spending.",
        "Held-out selector and conservative gate evidence when split by repository.",
      ],
      evidenceCannotSupport: [
        "Patch correctness or solve rate; the benchmark evaluates exploration output.",
        "General runtime superiority unless paired with controlled OpenCode tasks.",
      ],
      supportedOutputs: [
        "--swe-explore-official-output",
        "--swe-explore-official-summary-output",
        "--swe-explore-ranker-sweep-output",
        "--swe-explore-ranker-gate-report-output",
        "--swe-explore-oracle-report-output",
      ],
      primarySources: [
        { label: "GitHub", url: "https://github.com/Qiushao-E/SWE-Explore-Bench" },
        { label: "Dataset", url: "https://huggingface.co/datasets/SWE-Explore-Bench/SWE-Explore-Bench" },
      ],
    },
    {
      id: "agent-retrieval-bench",
      name: "Agent Retrieval Bench",
      status: "integrated",
      role: "Fast action-oriented retrieval smoke lane.",
      currentSupport:
        "Parses samples, optional chunks, and corpus manifests; converts code2test, comment2context, and trace-style retrieval cases into ContextLedger events; and reports MRR, Recall@K, and goldCoverageAt8k.",
      evidenceCanSupport: [
        "Whether selected packets expose task-specific target files early.",
        "Cheap regression checks for path priors and action-aware reranking.",
      ],
      evidenceCannotSupport: [
        "Long-horizon context retention, compaction quality, or coding-agent solve rate.",
        "Line-level localization unless the supplied chunks carry span metadata.",
      ],
      supportedOutputs: ["--agent-retrieval-bench-ranking-output", "--target-report-output", "--write-cases"],
      primarySources: [{ label: "Project", url: "https://agent-retrieval-bench.github.io/" }],
    },
    {
      id: "swe-contextbench",
      name: "SWE-ContextBench",
      status: "partial",
      role: "Cross-task experience-reuse benchmark target.",
      currentSupport:
        "The benchmark-only experience replay lane can parse SWE-ContextBench task-row JSONL into prior-experience records, optionally filter them through relationship rows, inject bounded prior-task events, and measure whether experience-conditioned selection changes file/span/line outcomes.",
      evidenceCanSupport: [
        "Early cross-task reuse hypotheses when prior experience records are available.",
        "Whether retrieved experience changes current context packets under a fixed budget.",
        "Whether public SWE-ContextBench task rows can be converted into reusable provenance packets without hand-authored experience JSONL.",
      ],
      evidenceCannotSupport: [
        "Official SWE-ContextBench solve-rate results until related tasks are run through the benchmark's full task protocol.",
        "Runtime memory-store readiness; the current lane is a replay harness, not a persistent agent memory.",
      ],
      supportedOutputs: [
        "--swe-contextbench-experience-input",
        "--swe-contextbench-relationship-input",
        "--swe-contextbench-related-instance-ids",
        "--swe-contextbench-experience-output",
        "--experience-replay-input",
        "--experience-replay-report-output",
        "--write-cases",
      ],
      primarySources: [
        { label: "arXiv", url: "https://arxiv.org/abs/2602.08316" },
        { label: "Dataset", url: "https://huggingface.co/datasets/jiayuanz3/SWEContextBench" },
      ],
    },
    {
      id: "compaction-survival",
      name: "Compaction Survival",
      status: "integrated",
      role: "In-fork diagnostic for provenance-packet compaction pressure.",
      currentSupport:
        "Scores raw-tail, ContextLedger-only, and ContextLedger-plus-tail retention against gold claims for constraints, tests, diffs, evidence, decisions, and files.",
      evidenceCanSupport: [
        "Whether important claims survive a fixed token budget before invoking a summarizer.",
        "Which claim categories are helped or missed by a selected provenance packet.",
      ],
      evidenceCannotSupport: [
        "LLM summary faithfulness without a summarization step.",
        "Solve-rate improvement without paired live OpenCode tasks.",
      ],
      supportedOutputs: ["--compaction-survival-output"],
      primarySources: [],
    },
    {
      id: "opencode-live-manifest",
      name: "OpenCode live manifest",
      status: "integrated",
      role: "Controlled live-provider calibration lane.",
      currentSupport:
        "Runs manifest rows through opencode run, exports sessions, converts trajectories into prediction JSONL, and can score them with the local ContextBench-style evaluator.",
      evidenceCanSupport: [
        "Provider bridge correctness, export conversion, and small live trace scoring.",
        "Token, stdout/stderr, and session-export evidence for bounded live probes.",
      ],
      evidenceCannotSupport: [
        "Solve-rate claims unless the manifest contains real repair tasks with fixed controls.",
        "Broad runtime promotion from one-off smoke runs.",
      ],
      supportedOutputs: [
        "--opencode-run-manifest",
        "--opencode-run-config-json",
        "--opencode-run-env-json",
        "--opencode-run-export-manifest-output",
        "--opencode-run-extra-args-json",
        "--opencode-run-report-output",
        "--prediction-output",
        "--prediction-eval-output",
      ],
      primarySources: [],
    },
    {
      id: "core-bench",
      name: "CORE-Bench",
      status: "watchlist",
      role: "Future requirement-driven code retrieval and repository-search stress lane.",
      currentSupport:
        "No adapter yet; keep it as a design target for broader issue-to-edit and repository-search retrieval once a stable data path is available.",
      evidenceCanSupport: [
        "Potential future evidence about requirement-to-code retrieval under broader repository search.",
      ],
      evidenceCannotSupport: [
        "Any current ContextLedger claim; this repository has not ingested or scored CORE-Bench rows.",
      ],
      supportedOutputs: [],
      primarySources: [{ label: "arXiv", url: "https://arxiv.org/abs/2606.11864" }],
    },
    {
      id: "codescalebench",
      name: "CodeScaleBench",
      status: "watchlist",
      role: "Future large-codebase and external-context stress lane.",
      currentSupport:
        "No adapter yet; keep it on the roadmap for large-codebase retrieval pressure after held-out SWE-Explore and live OpenCode lanes are stable.",
      evidenceCanSupport: [
        "Potential future evidence about retrieval and generation under large enterprise-scale code context.",
      ],
      evidenceCannotSupport: [
        "Any current ContextLedger claim; this repository has not ingested or scored CodeScaleBench rows.",
      ],
      supportedOutputs: [],
      primarySources: [
        { label: "GitHub", url: "https://github.com/sourcegraph/CodeScaleBench" },
        {
          label: "Sourcegraph",
          url: "https://sourcegraph.com/blog/codescalebench-testing-coding-agents-on-large-codebases-and-multi-repo-software-engineering-tasks",
        },
      ],
    },
  ]

  return {
    generatedBy: "context-ledger-benchmark",
    entries,
    summary: {
      integrated: entries.filter((entry) => entry.status === "integrated").length,
      partial: entries.filter((entry) => entry.status === "partial").length,
      planned: entries.filter((entry) => entry.status === "planned").length,
      watchlist: entries.filter((entry) => entry.status === "watchlist").length,
    },
  }
}

export function agentRetrievalBenchChunkPathsForSamples(
  samples: readonly AgentRetrievalBenchSample[],
  manifest: readonly AgentRetrievalBenchCorpusManifestRow[],
) {
  const needed = new Set(
    samples.flatMap((sample) => (sample.repo && sample.base_commit ? [`${sample.repo}\0${sample.base_commit}`] : [])),
  )
  return unique(
    manifest.flatMap((row) =>
      row.status === "ok" && row.chunks_path && needed.has(`${row.repo}\0${row.base_commit}`) ? [row.chunks_path] : [],
    ),
  )
}

export function summarizeOfficialEvaluation(rows: readonly OfficialEvaluationRow[]) {
  return {
    rows: rows.length,
    final: {
      fileCoverage: mean(rows.map((row) => row.final.file.coverage)),
      filePrecision: mean(rows.map((row) => row.final.file.precision)),
      fileF1: mean(rows.map((row) => metricF1(row.final.file))),
      symbolCoverage: mean(rows.map((row) => row.final.symbol.coverage)),
      symbolPrecision: mean(rows.map((row) => row.final.symbol.precision)),
      symbolF1: mean(rows.map((row) => metricF1(row.final.symbol))),
      spanCoverage: mean(rows.map((row) => row.final.span.coverage)),
      spanPrecision: mean(rows.map((row) => row.final.span.precision)),
      spanF1: mean(rows.map((row) => metricF1(row.final.span))),
      lineCoverage: mean(rows.map((row) => row.final.line.coverage)),
      linePrecision: mean(rows.map((row) => row.final.line.precision)),
      lineF1: mean(rows.map((row) => metricF1(row.final.line))),
      officialUtility: mean(
        rows.map((row) => (metricF1(row.final.file) + metricF1(row.final.span) + metricF1(row.final.line)) / 3),
      ),
    },
    trajectory: {
      aucFileCoverage: mean(rows.map((row) => row.trajectory?.auc_coverage?.file ?? 0)),
      aucSymbolCoverage: mean(rows.map((row) => row.trajectory?.auc_coverage?.symbol ?? 0)),
      aucSpanCoverage: mean(rows.map((row) => row.trajectory?.auc_coverage?.span ?? 0)),
      aucLineCoverage: mean(rows.map((row) => row.trajectory?.auc_coverage?.line ?? 0)),
    },
    editloc: {
      recall: mean(
        rows.map((row) => (row.editloc ? ratioOrPerfect(row.editloc.intersection, row.editloc.gold_size) : 0)),
      ),
      precision: mean(
        rows.map((row) => (row.editloc ? ratioOrPerfect(row.editloc.intersection, row.editloc.pred_size) : 0)),
      ),
    },
  } satisfies OfficialEvaluationSummary
}

export function compareOfficialPolicyEvaluations(input: {
  readonly baselinePolicy: SessionContextLedger.SelectionPolicy
  readonly evaluations: readonly OfficialPolicyEvaluation[]
}) {
  const baseline = input.evaluations.find((item) => item.policy === input.baselinePolicy)
  if (!baseline) throw new Error(`Missing official comparison baseline: ${input.baselinePolicy}`)
  return input.evaluations
    .filter((item) => item.policy !== input.baselinePolicy)
    .map(
      (item) =>
        ({
          baselinePolicy: input.baselinePolicy,
          policy: item.policy,
          officialUtility: pairedOfficialDelta(baseline.rows, item.rows, officialUtility),
          fileF1: pairedOfficialDelta(baseline.rows, item.rows, (row) => metricF1(row.final.file)),
          spanF1: pairedOfficialDelta(baseline.rows, item.rows, (row) => metricF1(row.final.span)),
          lineF1: pairedOfficialDelta(baseline.rows, item.rows, (row) => metricF1(row.final.line)),
          aucLineCoverage: pairedOfficialDelta(
            baseline.rows,
            item.rows,
            (row) => row.trajectory?.auc_coverage?.line ?? 0,
          ),
        }) satisfies OfficialPolicyComparison,
    )
}

function pairedOfficialDelta(
  baselineRows: readonly OfficialEvaluationRow[],
  policyRows: readonly OfficialEvaluationRow[],
  score: (row: OfficialEvaluationRow) => number,
) {
  const baselineByID = new Map(baselineRows.map((row) => [row.instance_id, row]))
  const pairs = policyRows
    .flatMap((row) => {
      const baseline = baselineByID.get(row.instance_id)
      return baseline ? [{ baseline, row }] : []
    })
    .toSorted((a, b) => a.row.instance_id.localeCompare(b.row.instance_id))
  const baselineValues = pairs.map((pair) => score(pair.baseline))
  const policyValues = pairs.map((pair) => score(pair.row))
  const examples = pairs.map((pair) => {
    const baselineScore = score(pair.baseline)
    const policyScore = score(pair.row)
    return {
      instanceID: pair.row.instance_id,
      baselineScore,
      policyScore,
      delta: policyScore - baselineScore,
    }
  })
  const deltas = examples.map((example) => example.delta)
  const deltaMean = mean(deltas)
  const deltaStdError = standardError(deltas)
  const margin = deltaStdError * 1.96
  const wins = deltas.filter((delta) => delta > 1e-12).length
  const losses = deltas.filter((delta) => delta < -1e-12).length
  const ties = deltas.length - wins - losses
  return {
    pairedRows: pairs.length,
    baselineMean: mean(baselineValues),
    policyMean: mean(policyValues),
    deltaMean,
    deltaStdError,
    ci95Low: deltaMean - margin,
    ci95High: deltaMean + margin,
    wins,
    losses,
    ties,
    winRate: pairs.length === 0 ? 0 : wins / pairs.length,
    lossRate: pairs.length === 0 ? 0 : losses / pairs.length,
    topImprovements: topPairedExamples(examples, "improvement"),
    topRegressions: topPairedExamples(examples, "regression"),
  } satisfies OfficialPairedDelta
}

function topPairedExamples(examples: readonly OfficialPairedExample[], direction: "improvement" | "regression") {
  const multiplier = direction === "improvement" ? -1 : 1
  return examples
    .filter((example) => (direction === "improvement" ? example.delta > 1e-12 : example.delta < -1e-12))
    .toSorted((a, b) => {
      const delta = multiplier * (a.delta - b.delta)
      if (delta !== 0) return delta
      return a.instanceID.localeCompare(b.instanceID)
    })
    .slice(0, 5)
}

function ratioOrPerfect(numerator: number, denominator: number) {
  return denominator === 0 ? 1 : numerator / denominator
}

function metricF1(metric: OfficialCountMetric) {
  return f1(metric.coverage, metric.precision)
}

function officialUtility(row: OfficialEvaluationRow) {
  return (metricF1(row.final.file) + metricF1(row.final.span) + metricF1(row.final.line)) / 3
}

function standardError(values: readonly number[]) {
  if (values.length < 2) return 0
  const valueMean = mean(values)
  const variance = values.reduce((total, value) => total + (value - valueMean) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance) / Math.sqrt(values.length)
}

export function fromContextBenchRowsResponse(
  input: unknown,
  options?: {
    readonly includeProblemStatement?: boolean
    readonly includeTestCodeContext?: boolean
    readonly maxGoldSpans?: number
    readonly maxTestCodeContexts?: number
    readonly maxTests?: number
  },
) {
  return decodeContextBenchRowsResponse(input).rows.map((item) =>
    fromContextBenchRow({
      row: item.row,
      includeProblemStatement: options?.includeProblemStatement,
      includeTestCodeContext: options?.includeTestCodeContext,
      maxGoldSpans: options?.maxGoldSpans,
      maxTestCodeContexts: options?.maxTestCodeContexts,
      maxTests: options?.maxTests,
    }),
  )
}

export function toGoldRowsFromContextBenchRowsResponse(input: unknown) {
  return decodeContextBenchRowsResponse(input).rows.map((item) => {
    const row = item.row
    return {
      inst_id: row.instance_id,
      original_inst_id: row.original_inst_id,
      repo: row.repo,
      repo_url: row.repo_url,
      commit: row.base_commit,
      gold_ctx: decodeSpans(decodeJson(row.gold_context)),
      patch: row.patch,
      test_patch: row.test_patch,
      source: row.source,
      language: row.language,
    } satisfies ContextBenchGoldRow
  })
}

export function evaluatePredictionsAgainstGold(input: {
  readonly predictions: readonly Prediction[]
  readonly goldRows: readonly ContextBenchGoldRow[]
}) {
  const goldByID = new Map(
    input.goldRows.flatMap(
      (row) =>
        [
          [row.inst_id, row],
          [row.original_inst_id, row],
        ] as const,
    ),
  )
  const rows = input.predictions.map((prediction) => {
    const gold = goldByID.get(prediction.instance_id)
    if (!gold) throw new Error(`No gold row found for prediction instance '${prediction.instance_id}'`)
    const goldSpans = gold.gold_ctx.map((span) => ({
      file: span.file,
      start: span.start_line,
      end: span.end_line,
    }))
    const goldFiles = unique(goldSpans.map((span) => span.file))
    const predictedSpans = predictionSpans(prediction)
    const predictedFiles = unique([...prediction.traj_data.pred_files, ...predictedSpans.map((span) => span.file)])
    const file = fileEvaluationMetric(goldFiles, predictedFiles)
    const spanMetrics = overlapMetrics({ gold: goldSpans, selected: predictedSpans })
    const trajectory = trajectoryCoverageMetrics({
      goldFiles,
      goldSpans,
      events: predictionTrajectoryEvents(prediction),
    })
    return {
      instanceID: prediction.instance_id,
      file,
      span: {
        recall: spanMetrics.spanRecall,
        precision: spanMetrics.spanPrecision,
        f1: spanMetrics.spanF1,
      },
      line: {
        recall: spanMetrics.lineRecall,
        precision: spanMetrics.linePrecision,
        f1: spanMetrics.lineF1,
      },
      trajectory: {
        aucFileCoverage: trajectory.aucFileCoverage,
        aucSpanCoverage: trajectory.aucSpanCoverage,
        aucLineCoverage: trajectory.aucLineCoverage,
      },
      predicted: {
        files: predictedFiles,
        spans: predictedSpans,
      },
      gold: {
        files: goldFiles,
        spans: goldSpans,
      },
    } satisfies PredictionEvaluationRow
  })
  return {
    rows,
    summary: {
      cases: rows.length,
      fileRecall: mean(rows.map((row) => row.file.recall)),
      filePrecision: mean(rows.map((row) => row.file.precision)),
      fileF1: mean(rows.map((row) => row.file.f1)),
      spanRecall: mean(rows.map((row) => row.span.recall)),
      spanPrecision: mean(rows.map((row) => row.span.precision)),
      spanF1: mean(rows.map((row) => row.span.f1)),
      lineRecall: mean(rows.map((row) => row.line.recall)),
      linePrecision: mean(rows.map((row) => row.line.precision)),
      lineF1: mean(rows.map((row) => row.line.f1)),
      aucFileCoverage: mean(rows.map((row) => row.trajectory.aucFileCoverage)),
      aucSpanCoverage: mean(rows.map((row) => row.trajectory.aucSpanCoverage)),
      aucLineCoverage: mean(rows.map((row) => row.trajectory.aucLineCoverage)),
    },
  } satisfies PredictionEvaluationReport
}

export function analyzeCompactionSurvival(input: {
  readonly cases: readonly CompactionSurvivalCase[]
  readonly budget: number
  readonly policy?: SessionContextLedger.SelectionPolicy
}) {
  const policy = input.policy ?? SessionContextLedger.DEFAULT_SELECTION_POLICY
  const variants = ["raw-tail", "context-ledger", "context-ledger-plus-tail"] as const
  const rows = input.cases.flatMap((item) =>
    variants.map((variant) =>
      compactionSurvivalRow({
        item,
        variant,
        budget: input.budget,
        policy,
      }),
    ),
  )
  const summaries = variants.map((variant) => {
    const items = rows.filter((row) => row.variant === variant)
    return {
      variant,
      cases: items.length,
      recall: mean(items.map((row) => row.recall)),
      categoryRecall: compactionSurvivalCategories(input.cases).map((category) => ({
        category,
        recall: mean(items.map((row) => row.categoryRecall.find((item) => item.category === category)?.recall ?? 1)),
      })),
    } satisfies CompactionSurvivalSummary
  })
  return {
    cases: input.cases.length,
    budget: input.budget,
    policy,
    variants,
    summaries,
    rows: rows.toSorted(
      (a, b) =>
        a.instanceID.localeCompare(b.instanceID) ||
        compactionSurvivalVariantOrder(a.variant) - compactionSurvivalVariantOrder(b.variant),
    ),
  } satisfies CompactionSurvivalReport
}

export function analyzeOpenCodeCompactionSummaries(input: {
  readonly exports: readonly OpenCodeCompactionSummaryInput[]
  readonly gold: readonly CompactionSummaryGoldCase[]
}) {
  const goldByInstance = new Map(input.gold.map((item) => [item.instance_id, item]))
  const rows = input.exports.map((item) => {
    const goldCase = goldByInstance.get(item.instanceID)
    const gold = goldCase?.gold ?? []
    const summaries = openCodeCompactionSummaries(item.exported)
    const text = summaries.map((summary) => summary.text).join("\n\n")
    const survived = compactionClaimIDs(gold, text)
    const missing = gold.filter((claim) => !survived.includes(claim.id)).map((claim) => claim.id)
    const unsupported = compactionClaimIDs(goldCase?.unsupported ?? [], text)
    const contradicted = compactionClaimIDs(goldCase?.contradicted ?? [], text)
    const stale = compactionClaimIDs(goldCase?.stale ?? [], text)
    const falseClaims = unique([...unsupported, ...contradicted, ...stale])
    const predictedClaims = survived.length + falseClaims.length
    const precision = predictedClaims === 0 ? 1 : survived.length / predictedClaims
    return {
      instanceID: item.instanceID,
      ...(item.label ? { label: item.label } : {}),
      ...(item.sessionID ? { sessionID: item.sessionID } : {}),
      summaryCount: summaries.length,
      text,
      tokens: Token.estimate(text),
      recall: gold.length === 0 ? 1 : survived.length / gold.length,
      precision,
      predictedClaims,
      falseClaimRate: claimRate(falseClaims.length, predictedClaims),
      unsupportedClaimRate: claimRate(unsupported.length, predictedClaims),
      contradictedClaimRate: claimRate(contradicted.length, predictedClaims),
      staleClaimRate: claimRate(stale.length, predictedClaims),
      survived,
      missing,
      falseClaims,
      unsupported,
      contradicted,
      stale,
      categoryRecall: compactionSurvivalCategories([{ instance_id: item.instanceID, context: [], gold }]).map(
        (category) => {
          const categoryGold = gold.filter((claim) => claim.category === category)
          const categorySurvived = categoryGold.filter((claim) => survived.includes(claim.id)).length
          return {
            category,
            recall: categoryGold.length === 0 ? 1 : categorySurvived / categoryGold.length,
            survived: categorySurvived,
            total: categoryGold.length,
          }
        },
      ),
    } satisfies OpenCodeCompactionSummaryRow
  })
  const categories = compactionSurvivalCategories(input.gold.map((item) => ({ ...item, context: [] })))
  return {
    cases: rows.length,
    rows,
    summary: {
      recall: mean(rows.map((row) => row.recall)),
      precision: mean(rows.map((row) => row.precision)),
      falseClaimRate: mean(rows.map((row) => row.falseClaimRate)),
      unsupportedClaimRate: mean(rows.map((row) => row.unsupportedClaimRate)),
      contradictedClaimRate: mean(rows.map((row) => row.contradictedClaimRate)),
      staleClaimRate: mean(rows.map((row) => row.staleClaimRate)),
      categoryRecall: categories.map((category) => ({
        category,
        recall: mean(rows.map((row) => row.categoryRecall.find((item) => item.category === category)?.recall ?? 1)),
      })),
    },
  } satisfies OpenCodeCompactionSummaryReport
}

export const NOISY_COMPACTION_SCENARIOS: readonly NoisyCompactionScenario[] = [
  {
    id: "payment-retry",
    title: "Payment retry idempotency",
    domain: "payment retry module",
    facts: [
      "CRITICAL FACT: payment retry marker is NOISY_LEDGER_ALPHA_20260615.",
      "CRITICAL FACT: the idempotency header key is x-context-ledger-noisy-id.",
      "CRITICAL FILE: src/payments/retry.ts owns the retry policy.",
      "CRITICAL TEST: tests/payments/retry.test.ts::keeps_idempotency passed after the last change.",
      "CRITICAL DECISION: retry budget remains exactly 2 attempts; do not raise it to 3.",
      "CRITICAL SYMBOL: computeRetryPlan must keep stable request fingerprints.",
    ],
    distractorFiles: [
      "src/auth/session.ts",
      "src/ui/theme.ts",
      "docs/deploy.md",
      "src/cache/index.ts",
      "tests/auth/session.test.ts",
      "src/billing/invoice.ts",
      "src/search/ranking.ts",
      "docs/observability.md",
    ],
    gold: [
      { id: "retry-marker", category: "evidence", text: "NOISY_LEDGER_ALPHA_20260615" },
      { id: "idempotency-header", category: "evidence", text: "x-context-ledger-noisy-id" },
      { id: "retry-file", category: "file", text: "src/payments/retry.ts", file: "src/payments/retry.ts" },
      { id: "retry-test", category: "latest-test", text: "tests/payments/retry.test.ts::keeps_idempotency" },
      { id: "retry-budget", category: "decision", text: "retry budget remains exactly 2 attempts" },
      { id: "retry-symbol", category: "evidence", text: "computeRetryPlan" },
    ],
    contradicted: [{ id: "retry-budget-three", category: "decision", text: "retry budget is 3 attempts" }],
    stale: [
      { id: "retry-old-noise-test", category: "latest-test", text: "tests/noise/payment-retry-31.test.ts passed" },
    ],
    unsupported: [{ id: "retry-ui-owner", category: "file", text: "src/ui/theme.ts owns the retry policy" }],
    continuation: {
      prompt:
        "Answer from the retained conversation context only. Do not use tools. Return one line in this exact field format: marker=<marker>;header=<header>;file=<file>;test=<test>;attempts=<retry_attempts>;symbol=<symbol>. Use the payment retry facts.",
      answerContains: [
        "marker=NOISY_LEDGER_ALPHA_20260615",
        "header=x-context-ledger-noisy-id",
        "file=src/payments/retry.ts",
        "test=tests/payments/retry.test.ts::keeps_idempotency",
        "attempts=2",
        "symbol=computeRetryPlan",
      ],
    },
  },
  {
    id: "cache-invalidation",
    title: "Cache invalidation stampede guard",
    domain: "cache invalidation module",
    facts: [
      "CRITICAL FACT: cache invalidation marker is NOISY_LEDGER_CACHE_20260615.",
      "CRITICAL FACT: the lease key prefix is cache:ledger:lease.",
      "CRITICAL FILE: src/cache/invalidate.ts owns the invalidation policy.",
      "CRITICAL TEST: tests/cache/invalidate.test.ts::deduplicates_stampede passed after the last change.",
      "CRITICAL DECISION: lease TTL remains exactly 45 seconds; do not raise it to 90.",
      "CRITICAL SYMBOL: planInvalidationBatch must keep shard ordering stable.",
    ],
    distractorFiles: [
      "src/payments/retry.ts",
      "src/ui/theme.ts",
      "docs/cache.md",
      "src/search/index.ts",
      "tests/ui/theme.test.ts",
      "src/reports/export.ts",
      "docs/rollout.md",
      "src/auth/session.ts",
    ],
    gold: [
      { id: "cache-marker", category: "evidence", text: "NOISY_LEDGER_CACHE_20260615" },
      { id: "lease-prefix", category: "evidence", text: "cache:ledger:lease" },
      { id: "cache-file", category: "file", text: "src/cache/invalidate.ts", file: "src/cache/invalidate.ts" },
      { id: "cache-test", category: "latest-test", text: "tests/cache/invalidate.test.ts::deduplicates_stampede" },
      { id: "lease-ttl", category: "decision", text: "lease TTL remains exactly 45 seconds" },
      { id: "cache-symbol", category: "evidence", text: "planInvalidationBatch" },
    ],
    contradicted: [{ id: "cache-ttl-ninety", category: "decision", text: "lease TTL is 90 seconds" }],
    stale: [
      { id: "cache-old-noise-test", category: "latest-test", text: "tests/noise/cache-invalidation-31.test.ts passed" },
    ],
    unsupported: [
      { id: "cache-search-owner", category: "file", text: "src/search/index.ts owns the invalidation policy" },
    ],
    continuation: {
      prompt:
        "Answer from the retained conversation context only. Do not use tools. Return one line in this exact field format: marker=<marker>;file=<file>;test=<test>;ttl=<ttl_seconds>;symbol=<symbol>. Use the cache invalidation facts.",
      answerContains: [
        "marker=NOISY_LEDGER_CACHE_20260615",
        "file=src/cache/invalidate.ts",
        "test=tests/cache/invalidate.test.ts::deduplicates_stampede",
        "ttl=45",
        "symbol=planInvalidationBatch",
      ],
    },
  },
  {
    id: "parser-fallback",
    title: "Parser fallback compatibility",
    domain: "parser fallback module",
    facts: [
      "CRITICAL FACT: parser fallback marker is NOISY_LEDGER_PARSE_20260615.",
      "CRITICAL FACT: empty input fallback code is PARSE_EMPTY_SAFE.",
      "CRITICAL FILE: src/parser/fallback.ts owns the fallback policy.",
      "CRITICAL TEST: tests/parser/fallback.test.ts::keeps_empty_input_safe passed after the last change.",
      "CRITICAL DECISION: fallback depth remains exactly 4 frames; do not raise it to 8.",
      "CRITICAL SYMBOL: resolveFallbackBranch must keep legacy token ordering.",
    ],
    distractorFiles: [
      "src/cache/invalidate.ts",
      "src/payments/retry.ts",
      "docs/parser.md",
      "src/ui/theme.ts",
      "tests/cache/invalidate.test.ts",
      "src/search/ranking.ts",
      "src/auth/session.ts",
      "docs/observability.md",
    ],
    gold: [
      { id: "parser-marker", category: "evidence", text: "NOISY_LEDGER_PARSE_20260615" },
      { id: "fallback-code", category: "evidence", text: "PARSE_EMPTY_SAFE" },
      { id: "parser-file", category: "file", text: "src/parser/fallback.ts", file: "src/parser/fallback.ts" },
      { id: "parser-test", category: "latest-test", text: "tests/parser/fallback.test.ts::keeps_empty_input_safe" },
      { id: "fallback-depth", category: "decision", text: "fallback depth remains exactly 4 frames" },
      { id: "parser-symbol", category: "evidence", text: "resolveFallbackBranch" },
    ],
    contradicted: [{ id: "parser-depth-eight", category: "decision", text: "fallback depth is 8 frames" }],
    stale: [
      { id: "parser-old-noise-test", category: "latest-test", text: "tests/noise/parser-fallback-31.test.ts passed" },
    ],
    unsupported: [
      { id: "parser-cache-owner", category: "file", text: "src/cache/invalidate.ts owns the fallback policy" },
    ],
    continuation: {
      prompt:
        "Answer from the retained conversation context only. Do not use tools. Return one line in this exact field format: marker=<marker>;file=<file>;test=<test>;depth=<depth_frames>;code=<fallback_code>;symbol=<symbol>. Use the parser fallback facts.",
      answerContains: [
        "marker=NOISY_LEDGER_PARSE_20260615",
        "file=src/parser/fallback.ts",
        "test=tests/parser/fallback.test.ts::keeps_empty_input_safe",
        "depth=4",
        "code=PARSE_EMPTY_SAFE",
        "symbol=resolveFallbackBranch",
      ],
    },
  },
] as const

export function buildNoisyCompactionFixtures(input: {
  readonly timestamp: number
  readonly directory: string
  readonly scenarios?: readonly string[]
  readonly distractorTurns?: number
}) {
  const selected = input.scenarios?.length
    ? NOISY_COMPACTION_SCENARIOS.filter((scenario) => input.scenarios?.includes(scenario.id))
    : NOISY_COMPACTION_SCENARIOS
  const missing = (input.scenarios ?? []).filter(
    (id) => !NOISY_COMPACTION_SCENARIOS.some((scenario) => scenario.id === id),
  )
  if (missing.length > 0) throw new Error(`Unknown noisy compaction scenario(s): ${missing.join(", ")}`)
  return selected.map((scenario) => noisyCompactionFixture({ ...input, scenario }))
}

function noisyCompactionFixture(input: {
  readonly timestamp: number
  readonly directory: string
  readonly scenario: NoisyCompactionScenario
  readonly distractorTurns?: number
}) {
  const instanceID = `live__ctxledger_noisy_${input.scenario.id.replaceAll("-", "_")}_gpt55`
  return {
    scenario: input.scenario,
    instanceID,
    baseline: noisyCompactionExport({ ...input, lane: "baseline" }),
    contextLedger: noisyCompactionExport({ ...input, lane: "precision" }),
    gold: {
      instance_id: instanceID,
      gold: input.scenario.gold,
      ...(input.scenario.unsupported ? { unsupported: input.scenario.unsupported } : {}),
      ...(input.scenario.contradicted ? { contradicted: input.scenario.contradicted } : {}),
      ...(input.scenario.stale ? { stale: input.scenario.stale } : {}),
    },
    continuation: input.scenario.continuation,
  } satisfies NoisyCompactionFixture
}

function noisyCompactionExport(input: {
  readonly timestamp: number
  readonly directory: string
  readonly scenario: NoisyCompactionScenario
  readonly lane: "baseline" | "precision"
  readonly distractorTurns?: number
}) {
  const sessionID = noisySessionID(input.scenario.id, input.lane, input.timestamp)
  const messages: { info: Record<string, unknown>; parts: Record<string, unknown>[] }[] = []
  let index = 0
  const turn = (userText: string, assistantText: string) => {
    const userMessageID = noisyMessageID(input.scenario.id, input.lane, input.timestamp, index++)
    messages.push({
      info: {
        role: "user",
        time: { created: input.timestamp + index * 1_000 },
        agent: "build",
        model: { providerID: "openai", modelID: "gpt-5.5", variant: "high" },
        summary: { diffs: [] },
        id: userMessageID,
        sessionID,
      },
      parts: [{ type: "text", text: userText, id: noisyPartID(userMessageID, 0), sessionID, messageID: userMessageID }],
    })
    const assistantMessageID = noisyMessageID(input.scenario.id, input.lane, input.timestamp, index++)
    messages.push({
      info: {
        parentID: userMessageID,
        role: "assistant",
        mode: "build",
        agent: "build",
        variant: "high",
        path: { cwd: input.directory, root: input.directory },
        cost: 0,
        tokens: { total: 0, input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        modelID: "gpt-5.5",
        providerID: "openai",
        time: { created: input.timestamp + index * 1_000, completed: input.timestamp + index * 1_000 + 500 },
        finish: "stop",
        id: assistantMessageID,
        sessionID,
      },
      parts: [
        { type: "step-start", id: noisyPartID(assistantMessageID, 0), sessionID, messageID: assistantMessageID },
        {
          type: "text",
          text: assistantText,
          time: { start: input.timestamp + index * 1_000 + 100, end: input.timestamp + index * 1_000 + 450 },
          id: noisyPartID(assistantMessageID, 1),
          sessionID,
          messageID: assistantMessageID,
        },
        {
          type: "step-finish",
          reason: "stop",
          cost: 0,
          tokens: { total: 0, input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          id: noisyPartID(assistantMessageID, 2),
          sessionID,
          messageID: assistantMessageID,
        },
      ],
    })
  }
  turn(
    [
      `We are debugging the ${input.scenario.domain}. Preserve the exact facts below for future compaction.`,
      ...input.scenario.facts,
      "These facts are older than the final tail and should survive summarization.",
    ].join("\n"),
    `Stored the ${input.scenario.domain} facts for later work.`,
  )
  const distractorTurns = input.distractorTurns ?? 12
  for (let turnIndex = 0; turnIndex < distractorTurns; turnIndex++) {
    const file = input.scenario.distractorFiles[turnIndex % input.scenario.distractorFiles.length] ?? "docs/noise.md"
    const marker = `DISTRACTOR_${input.scenario.id.replaceAll("-", "_").toUpperCase()}_${String(turnIndex).padStart(2, "0")}`
    turn(
      [
        `Distractor investigation ${turnIndex}: inspect ${file}.`,
        `Temporary marker ${marker} is unrelated and should not override the ${input.scenario.domain} facts.`,
        `Decision candidate ${turnIndex}: leave feature flag noisyCandidate${turnIndex} unchanged.`,
        `Test note: tests/noise/${input.scenario.id}-${turnIndex}.test.ts was flaky and is not part of the retained evidence.`,
      ].join("\n"),
      `Acknowledged distractor ${turnIndex} in ${file}; no change to ${input.scenario.domain} scope.`,
    )
  }
  turn(
    [
      `Recent tail-only status: prepare for handoff. The active task is to continue the ${input.scenario.domain} investigation after compaction.`,
      "This final turn intentionally omits the exact marker, header/key/code, file, test, decision, and symbol names.",
    ].join("\n"),
    "Ready for handoff after compaction.",
  )
  return {
    info: {
      id: sessionID,
      slug: `ctxledger-noisy-${input.scenario.id}-${input.lane}`,
      projectID: "global",
      directory: input.directory,
      path: ".",
      title: `ctxledger-noisy-${input.scenario.id}-${input.lane}`,
      agent: "build",
      model: { id: "gpt-5.5", providerID: "openai", variant: "high" },
      version: "local",
      summary: { additions: 0, deletions: 0, files: 0 },
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      permission: [
        { permission: "question", pattern: "*", action: "deny" },
        { permission: "plan_enter", pattern: "*", action: "deny" },
        { permission: "plan_exit", pattern: "*", action: "deny" },
      ],
      time: { created: input.timestamp, updated: input.timestamp + messages.length * 1_000 },
    },
    messages,
  } satisfies OpenCodeExport
}

function noisySessionID(scenarioID: string, lane: string, timestamp: number) {
  return `ses_ctxledger_noisy_${scenarioID.replaceAll("-", "_")}_${lane}_${timestamp}`
}

function noisyMessageID(scenarioID: string, lane: string, timestamp: number, index: number) {
  return `msg_ctxledger_noisy_${scenarioID.replaceAll("-", "_")}_${lane}_${String(index).padStart(3, "0")}_${timestamp}`
}

function noisyPartID(messageID: string, index: number) {
  return `prt_${messageID.slice(4)}_${index}`
}

function openCodeCompactionSummaries(input: OpenCodeExport) {
  const compactionParents = new Set(
    input.messages.flatMap((message) =>
      message.parts.some((part) => part.type === "compaction") && typeof message.info.id === "string"
        ? [message.info.id]
        : [],
    ),
  )
  return input.messages.flatMap((message) => {
    const isSummary = message.info.role === "assistant" && Boolean(message.info.summary)
    const parentID = typeof message.info.parentID === "string" ? message.info.parentID : undefined
    if (!isSummary) return []
    if (compactionParents.size > 0 && (!parentID || !compactionParents.has(parentID))) return []
    const text = message.parts
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => String(part.text).trim())
      .filter(Boolean)
      .join("\n\n")
    return text ? [{ text }] : []
  })
}

function compactionSurvivalRow(input: {
  readonly item: CompactionSurvivalCase
  readonly variant: CompactionSurvivalVariant
  readonly budget: number
  readonly policy: SessionContextLedger.SelectionPolicy
}) {
  const text = compactionSurvivalText(input)
  const survived = input.item.gold.filter((gold) => compactionGoldSurvived(gold, text)).map((gold) => gold.id)
  const missing = input.item.gold.filter((gold) => !survived.includes(gold.id)).map((gold) => gold.id)
  return {
    instanceID: input.item.instance_id,
    variant: input.variant,
    budget: input.budget,
    tokens: Token.estimate(text),
    recall: input.item.gold.length === 0 ? 1 : survived.length / input.item.gold.length,
    survived,
    missing,
    categoryRecall: compactionSurvivalCategories([input.item]).map((category) => {
      const categoryGold = input.item.gold.filter((gold) => gold.category === category)
      const categorySurvived = categoryGold.filter((gold) => survived.includes(gold.id)).length
      return {
        category,
        recall: categoryGold.length === 0 ? 1 : categorySurvived / categoryGold.length,
        survived: categorySurvived,
        total: categoryGold.length,
      }
    }),
  } satisfies CompactionSurvivalRow
}

function compactionSurvivalText(input: {
  readonly item: CompactionSurvivalCase
  readonly variant: CompactionSurvivalVariant
  readonly budget: number
  readonly policy: SessionContextLedger.SelectionPolicy
}) {
  if (input.variant === "raw-tail") return packCompactionRawTail(input.item.context, input.budget)
  if (input.variant === "context-ledger")
    return SessionContextLedger.compileSerializedContext({
      context: input.item.context,
      budget: input.budget,
      policy: input.policy,
    }).text
  const ledgerBudget = Math.max(1, Math.floor(input.budget * 0.65))
  const tailBudget = Math.max(1, input.budget - ledgerBudget)
  return [
    SessionContextLedger.compileSerializedContext({
      context: input.item.context,
      budget: ledgerBudget,
      policy: input.policy,
    }).text,
    packCompactionRawTail(input.item.context, tailBudget),
  ]
    .filter(Boolean)
    .join("\n\n")
}

function packCompactionRawTail(context: readonly string[], budget: number) {
  const selected: string[] = []
  let tokens = 0
  for (let index = context.length - 1; index >= 0; index--) {
    const item = context[index] ?? ""
    const cost = Math.max(1, Token.estimate(item))
    if (tokens + cost > budget) continue
    selected.unshift(item)
    tokens += cost
  }
  return selected.join("\n\n")
}

function compactionClaimIDs(claims: readonly CompactionSurvivalGold[], text: string) {
  return claims.filter((claim) => compactionGoldSurvived(claim, text)).map((claim) => claim.id)
}

function claimRate(count: number, predictedClaims: number) {
  if (predictedClaims === 0) return 0
  return count / predictedClaims
}

function compactionGoldSurvived(gold: CompactionSurvivalGold, text: string) {
  const hasText = gold.text ? text.toLowerCase().includes(gold.text.toLowerCase()) : true
  const hasFile = gold.file ? text.includes(gold.file) : true
  return Boolean(gold.text || gold.file) && hasText && hasFile
}

function compactionSurvivalCategories(cases: readonly CompactionSurvivalCase[]) {
  return Array.from(new Set(cases.flatMap((item) => item.gold.map((gold) => gold.category)))).toSorted()
}

function compactionSurvivalVariantOrder(variant: CompactionSurvivalVariant) {
  if (variant === "raw-tail") return 0
  if (variant === "context-ledger") return 1
  return 2
}

export function withExperienceReplay(
  cases: readonly Case[],
  options: {
    readonly experiences: readonly ExperienceRecord[]
    readonly maxPerCase?: number
    readonly minScore?: number
  },
) {
  const maxPerCase = Math.max(0, Math.floor(options.maxPerCase ?? 3))
  const minScore = options.minScore ?? 1
  if (maxPerCase === 0 || options.experiences.length === 0) return cases
  return cases.map((item) => {
    const replay = options.experiences
      .filter((experience) => experience.id !== item.instance_id)
      .map((experience) => ({ experience, score: experienceReplayScore(item, experience) }))
      .filter((entry) => entry.score >= minScore)
      .toSorted((a, b) => {
        const score = b.score - a.score
        if (score !== 0) return score
        return a.experience.id.localeCompare(b.experience.id)
      })
      .slice(0, maxPerCase)
      .map(({ experience, score }, index) => experienceReplayEvent(item.instance_id, experience, index, score))
    if (replay.length === 0) return item
    return {
      ...item,
      events: [...replay, ...item.events],
    } satisfies Case
  })
}

export function analyzeExperienceReplay(
  cases: readonly Case[],
  options: {
    readonly experiences: readonly ExperienceRecord[]
    readonly budgets: readonly number[]
    readonly policies: readonly SessionContextLedger.SelectionPolicy[]
    readonly maxPerCase?: number
    readonly minScore?: number
  },
) {
  const maxPerCase = Math.max(0, Math.floor(options.maxPerCase ?? 3))
  const minScore = options.minScore ?? 1
  const replayCases = withExperienceReplay(cases, {
    experiences: options.experiences,
    maxPerCase,
    minScore,
  })
  const rows = cases.flatMap((item, index) => {
    const replayItem = replayCases[index] ?? item
    return options.budgets.flatMap((budget) =>
      options.policies.map((policy) => {
        const baseSelection = SessionContextLedger.select({
          events: item.events,
          policy,
          budget,
          query: item.query,
        })
        const replaySelection = SessionContextLedger.select({
          events: replayItem.events,
          policy,
          budget,
          query: replayItem.query,
        })
        const base = evaluateSelection({ item, policy, budget, selection: baseSelection })
        const replay = evaluateSelection({ item: replayItem, policy, budget, selection: replaySelection })
        const experienceEvents = replaySelection.events.filter((event) => event.kind === "experience")
        return {
          instanceID: item.instance_id,
          budget,
          policy,
          base,
          replay,
          deltas: experienceReplayMetricDeltas(base, replay),
          selectedExperienceEvents: experienceEvents.length,
          selectedExperienceIDs: experienceEvents.map((event) => event.id),
          experienceTokens: experienceEvents.reduce((total, event) => total + event.tokens, 0),
        }
      }),
    )
  })
  const summaries = Array.from(Map.groupBy(rows, (row) => `${row.budget}\0${row.policy}`).values()).map((items) => {
    const base = onlySummary(summarize(items.map((item) => item.base)))
    const replay = onlySummary(summarize(items.map((item) => item.replay)))
    return {
      budget: items[0]?.budget ?? 0,
      policy: items[0]?.policy ?? "recency",
      base,
      replay,
      deltas: experienceReplaySummaryDeltas(base, replay),
      selectedExperienceEvents: items.reduce((total, item) => total + item.selectedExperienceEvents, 0),
      casesWithSelectedExperience: items.filter((item) => item.selectedExperienceEvents > 0).length,
      experienceTokens: mean(items.map((item) => item.experienceTokens)),
    }
  })
  return {
    cases: cases.length,
    experiences: options.experiences.length,
    budgets: options.budgets,
    policies: options.policies,
    maxPerCase,
    minScore,
    summaries: summaries.toSorted((a, b) => a.budget - b.budget || policiesOrder(a.policy) - policiesOrder(b.policy)),
    rows: rows.toSorted(
      (a, b) =>
        a.budget - b.budget ||
        policiesOrder(a.policy) - policiesOrder(b.policy) ||
        a.instanceID.localeCompare(b.instanceID),
    ),
  } satisfies ExperienceReplayReport
}

export function fromContextBenchRow(input: {
  readonly row: ContextBenchRow
  readonly includeProblemStatement?: boolean
  readonly includeTestCodeContext?: boolean
  readonly maxGoldSpans?: number
  readonly maxTestCodeContexts?: number
  readonly maxTests?: number
}) {
  const goldSpans = decodeSpans(decodeJson(input.row.gold_context)).slice(0, input.maxGoldSpans ?? 8)
  const f2p = parseStringArray(input.row.f2p).slice(0, input.maxTests ?? 8)
  const p2p = parseStringArray(input.row.p2p).slice(0, input.maxTests ?? 8)
  const goldEvents = goldSpans.map((span, index) => spanEvent(input.row.instance_id, index, span))
  const testCodeContext = input.includeTestCodeContext
    ? unique([...f2p, ...p2p].flatMap(testFiles)).slice(0, input.maxTestCodeContexts ?? 4)
    : []
  return {
    instance_id: input.row.instance_id,
    query: input.row.problem_statement,
    benchmark: "contextbench",
    task_type: input.row.source,
    repo: input.row.repo,
    base_commit: input.row.base_commit,
    gold_ids: goldEvents.map((event) => event.id),
    gold_files: unique(goldSpans.map((span) => span.file)),
    events: [
      ...(input.includeProblemStatement
        ? [
            event({
              id: `${input.row.instance_id}:problem`,
              kind: "user-goal",
              order: 0,
              summary: `${input.row.repo} ${input.row.original_inst_id}\n${input.row.problem_statement.slice(0, 320)}`,
              recoverability: "low",
              mustPreserve: true,
              files: [],
            }),
          ]
        : []),
      ...goldEvents,
      ...testCodeContext.map((file, index) => testCodeContextEvent(input.row.instance_id, index, file)),
      ...f2p.map((test, index) => testEvent(input.row.instance_id, "f2p", index, test)),
      ...p2p.map((test, index) => testEvent(input.row.instance_id, "p2p", index, test)),
    ],
  } satisfies Case
}

export function fromAgentRetrievalBenchSamples(
  samples: readonly AgentRetrievalBenchSample[],
  options?: {
    readonly chunks?: readonly AgentRetrievalBenchChunk[]
    readonly includeQueryEvent?: boolean
    readonly maxChunksPerCase?: number
  },
) {
  return samples.map((sample) => fromAgentRetrievalBenchSample(sample, options))
}

export function fromAgentRetrievalBenchSample(
  sample: AgentRetrievalBenchSample,
  options?: {
    readonly chunks?: readonly AgentRetrievalBenchChunk[]
    readonly includeQueryEvent?: boolean
    readonly maxChunksPerCase?: number
  },
) {
  const query = stableJson(sample.query ?? {})
  const goldFiles = agentRetrievalBenchGoldFiles(sample)
  const chunks = agentRetrievalBenchChunks(sample, query, options?.chunks, options?.maxChunksPerCase)
  const chunkEvents = chunks.map((chunk, index) => agentRetrievalBenchChunkEvent(sample.id, index, chunk))
  const goldFileSet = new Set(goldFiles)
  const goldIDs = chunkEvents
    .filter((event) => event.files.some((file) => goldFileSet.has(file)))
    .map((event) => event.id)
  const queryEvent = options?.includeQueryEvent
    ? [
        event({
          id: `${sample.id}:arb-query`,
          kind: "user-goal",
          order: 0,
          summary: `${sample.repo ?? "unknown-repo"} ${sample.task_type}\n${query}`,
          recoverability: "low",
          mustPreserve: true,
          files: agentRetrievalBenchGivenFiles(sample),
        }),
      ]
    : []
  return {
    instance_id: sample.id,
    query,
    benchmark: "agent-retrieval-bench",
    task_type: sample.task_type,
    repo: sample.repo,
    base_commit: sample.base_commit,
    gold_ids: goldIDs,
    gold_files: goldFiles,
    events: [...queryEvent, ...chunkEvents],
  } satisfies Case
}

export function fromSWEExploreRows(
  rows: readonly SWEExploreRow[],
  options?: {
    readonly includeOptionalRegions?: boolean
    readonly maxOptionalRegions?: number
    readonly optionalModels?: readonly string[]
    readonly repoCandidates?: Readonly<Record<string, readonly SWEExploreRepoChunk[]>>
    readonly issueMap?: Readonly<Record<string, string>>
  },
) {
  return rows.map((row) => fromSWEExploreRow(row, options))
}

export function fromSWEExploreRow(
  row: SWEExploreRow,
  options?: {
    readonly includeOptionalRegions?: boolean
    readonly maxOptionalRegions?: number
    readonly optionalModels?: readonly string[]
    readonly repoCandidates?: Readonly<Record<string, readonly SWEExploreRepoChunk[]>>
    readonly issueMap?: Readonly<Record<string, string>>
  },
) {
  const query = row.problem_statement ?? options?.issueMap?.[row.instance_id]
  const repoCandidates = options?.repoCandidates?.[row.instance_id]
  if (repoCandidates && repoCandidates.length > 0) return fromSWEExploreRepoCandidateRow(row, repoCandidates, query)
  const coreEvents = row.ground_truth.read_core_regions.map((region, index) =>
    sweExploreRegionEvent({
      instanceID: row.instance_id,
      group: "core",
      index,
      region,
      order: sweExploreRegionOrder(row, region, 1_000 + index),
    }),
  )
  const optionalEvents =
    (options?.includeOptionalRegions ?? true)
      ? sweExploreOptionalRegions(row, options?.optionalModels, options?.maxOptionalRegions).map(
          (region: SWEExploreRegion, index: number) =>
            sweExploreRegionEvent({
              instanceID: row.instance_id,
              group: "optional",
              index,
              region,
              order: sweExploreRegionOrder(row, region, 10_000 + index),
            }),
        )
      : []
  return {
    instance_id: row.instance_id,
    query,
    benchmark: "swe-explore",
    task_type: row.dataset,
    repo: row.repo_dir,
    base_commit: undefined,
    gold_ids: coreEvents.map((event) => event.id),
    gold_files: unique(row.ground_truth.read_core_files),
    events: [...coreEvents, ...optionalEvents].toSorted((a, b) => {
      const order = a.order - b.order
      if (order !== 0) return order
      return a.id.localeCompare(b.id)
    }),
  } satisfies Case
}

function fromSWEExploreRepoCandidateRow(
  row: SWEExploreRow,
  chunks: readonly SWEExploreRepoChunk[],
  query: string | undefined,
) {
  const chunkEvents = chunks.map((chunk, index) => sweExploreRepoChunkEvent(row.instance_id, index, chunk))
  const coreRegions = row.ground_truth.read_core_regions
  return {
    instance_id: row.instance_id,
    query,
    benchmark: "swe-explore",
    task_type: row.dataset,
    repo: row.repo_dir,
    base_commit: undefined,
    gold_ids: chunkEvents
      .filter((event) =>
        (event.spans ?? []).some((span) => coreRegions.some((core) => overlaps(span, sweExploreRegionSpan(core)))),
      )
      .map((event) => event.id),
    gold_files: unique(row.ground_truth.read_core_files),
    events: chunkEvents,
  } satisfies Case
}

function agentRetrievalBenchGoldFiles(sample: AgentRetrievalBenchSample) {
  const gold = sample.gold ?? {}
  if (sample.task_type === "code2test") return stringValues(gold.related_tests)
  if (sample.task_type === "comment2context") {
    const contextFiles = pathValues(gold.must_context_files ?? gold.context_files)
    if (contextFiles.length > 0) return contextFiles
  }
  const rootFiles = stringValues(gold.root_cause_files)
  return rootFiles.length > 0 ? rootFiles : stringValues(gold.related_tests)
}

function agentRetrievalBenchGivenFiles(sample: AgentRetrievalBenchSample) {
  const gold = sample.gold ?? {}
  const query = sample.query ?? {}
  return unique([
    ...stringValues(gold.given_files),
    ...stringValues(query.given_files),
    ...stringValues(query.changed_files),
    ...stringValues(query.files),
    ...pathValues([query.given_file, query.path, query.changed_file]),
  ])
}

function agentRetrievalBenchChunks(
  sample: AgentRetrievalBenchSample,
  query: string,
  chunks: readonly AgentRetrievalBenchChunk[] | undefined,
  maxChunksPerCase: number | undefined,
) {
  const matched = chunks
    ?.filter((chunk) => agentRetrievalBenchChunkMatches(sample, chunk))
    .toSorted((a, b) => {
      const score = agentRetrievalBenchChunkScore(query, b) - agentRetrievalBenchChunkScore(query, a)
      if (score !== 0) return score
      return a.path.localeCompare(b.path)
    })
    .slice(0, maxChunksPerCase)
  if (matched && matched.length > 0) return matched
  return syntheticAgentRetrievalBenchChunks(sample)
}

function agentRetrievalBenchChunkMatches(sample: AgentRetrievalBenchSample, chunk: AgentRetrievalBenchChunk) {
  return (
    (!chunk.repo || !sample.repo || chunk.repo === sample.repo) &&
    (!chunk.base_commit || !sample.base_commit || chunk.base_commit === sample.base_commit)
  )
}

function agentRetrievalBenchChunkScore(query: string, chunk: AgentRetrievalBenchChunk) {
  const queryTerms = new Set(textTerms(query))
  const chunkTerms = new Set(textTerms([chunk.path, chunk.symbol, chunk.kind, chunk.text].filter(Boolean).join(" ")))
  let score = 0
  for (const term of queryTerms) if (chunkTerms.has(term)) score++
  const path = chunk.path.toLowerCase()
  const basename = path.split("/").at(-1) ?? path
  const loweredQuery = query.toLowerCase()
  if (path && loweredQuery.includes(path)) score += 25
  if (basename && loweredQuery.includes(basename)) score += 8
  if (chunk.symbol && loweredQuery.includes(chunk.symbol.toLowerCase())) score += 5
  return score
}

function syntheticAgentRetrievalBenchChunks(sample: AgentRetrievalBenchSample) {
  const gold = sample.gold ?? {}
  const query = stableJson(sample.query ?? {})
  return unique([
    ...stringValues(gold.root_cause_files),
    ...stringValues(gold.related_tests),
    ...stringValues(gold.supporting_files),
    ...stringValues(gold.negative_distractors),
    ...pathValues(gold.must_context_files),
    ...pathValues(gold.context_files),
    ...agentRetrievalBenchGivenFiles(sample),
  ]).map(
    (path) =>
      ({
        chunk_id: `${sample.id}:${path}`,
        repo: sample.repo,
        base_commit: sample.base_commit,
        path,
        kind: "file",
        symbol: "",
        start_line: 1,
        end_line: 1,
        text: `${path.replaceAll("/", " ")}\n${sample.task_type}\n${query}`,
      }) satisfies AgentRetrievalBenchChunk,
  )
}

function agentRetrievalBenchChunkEvent(instanceID: string, index: number, chunk: AgentRetrievalBenchChunk) {
  const start = chunk.start_line ?? 1
  const end = chunk.end_line ?? start
  return event({
    id: `${instanceID}:arb-chunk:${chunk.chunk_id ?? index}`,
    kind: "code-context",
    order: 1_000 + index,
    summary: [
      `${chunk.path}:${start}-${end}`,
      chunk.symbol ? `symbol: ${chunk.symbol}` : "",
      chunk.kind ? `kind: ${chunk.kind}` : "",
      chunk.text ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
    recoverability: "medium",
    mustPreserve: false,
    files: [chunk.path],
    spans: [{ file: chunk.path, start, end }],
  })
}

function sweExploreOptionalRegions(row: SWEExploreRow, models?: readonly string[], limit?: number): SWEExploreRegion[] {
  const allowed = models?.length ? new Set(models) : undefined
  const regions = uniqueRegions(
    Object.entries(row.ground_truth.read_optional_regions_map ?? {}).flatMap(([model, regions]) =>
      !allowed || allowed.has(model) ? regions : [],
    ),
  ).toSorted((a, b) => sweExploreRegionOrder(row, a, 10_000) - sweExploreRegionOrder(row, b, 10_000))
  return limit === undefined ? regions : regions.slice(0, limit)
}

function sweExploreRegionEvent(input: {
  readonly instanceID: string
  readonly group: "core" | "optional"
  readonly index: number
  readonly region: SWEExploreRegion
  readonly order: number
}) {
  return event({
    id: `${input.instanceID}:swe-explore:${input.group}:${input.index}`,
    kind: "code-context",
    order: input.order,
    summary: `${input.region.path}:${input.region.start}-${input.region.end}\nSWE-Explore ${input.group} read region.`,
    recoverability: input.group === "core" ? "medium" : "low",
    mustPreserve: false,
    files: [input.region.path],
    spans: sweExploreSpan(input.region),
    tokens: sweExploreRegionLines(input.region),
  })
}

function sweExploreRepoChunkEvent(instanceID: string, index: number, chunk: SWEExploreRepoChunk) {
  return event({
    id: `${instanceID}:swe-explore:repo:${index}`,
    kind: "code-context",
    order: 1_000 + index,
    summary: [`${chunk.path}:${chunk.start}-${chunk.end}`, chunk.text ?? ""].filter(Boolean).join("\n"),
    recoverability: "medium",
    mustPreserve: false,
    files: [chunk.path],
    spans: [{ file: chunk.path, start: chunk.start, end: chunk.end }],
    tokens: sweExploreRegionLines({ path: chunk.path, start: chunk.start, end: chunk.end }),
  })
}

function sweExploreSpan(region: SWEExploreRegion) {
  if (region.start < 1 || region.end < region.start) return undefined
  return [{ file: region.path, start: region.start, end: region.end }]
}

function sweExploreRegionSpan(region: SWEExploreRegion) {
  return { file: region.path, start: region.start, end: region.end }
}

function sweExploreRegionLines(region: SWEExploreRegion) {
  if (region.start < 1 || region.end < region.start) return 1
  return region.end - region.start + 1
}

function sweExploreRegionOrder(row: SWEExploreRow, region: SWEExploreRegion, fallback: number) {
  return Math.min(
    fallback,
    ...(row.read_step_info?.[region.path] ?? [])
      .filter(
        (step) =>
          !sweExploreSpan({ path: region.path, start: step.start, end: step.end }) ||
          overlaps(
            {
              file: region.path,
              start: step.start,
              end: step.end,
            },
            {
              file: region.path,
              start: region.start,
              end: region.end,
            },
          ),
      )
      .map((step) => step.step_idx),
  )
}

function sweExploreRegionsFromSelection(selection: SessionContextLedger.Selection) {
  return sweExploreRegionsFromEvents(selection.events)
}

function sweExploreRegionsFromEvents(events: readonly SessionContextLedger.Event[]) {
  return uniqueRegions(
    events.flatMap((event) =>
      (event.spans ?? []).flatMap((span) => {
        const region = { path: span.file, start: span.start, end: span.end }
        return sweExploreRegionIsFinite(region) ? [region] : []
      }),
    ),
  )
}

function sweExploreRegionIsFinite(region: SWEExploreRegion) {
  return region.path.length > 0 && region.start >= 1 && region.end >= region.start
}

function sweExploreRegionLinesSet(regions: readonly SWEExploreRegion[]) {
  const result = new Set<string>()
  for (const region of regions) {
    if (!sweExploreRegionIsFinite(region)) continue
    for (let line = region.start; line <= region.end; line++) {
      result.add(sweExploreLineKey(region.path, line))
    }
  }
  return result
}

function sweExploreLineKey(path: string, line: number) {
  return `${path}\0${line}`
}

function intersectionSize(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  let total = 0
  const [small, large] = left.size <= right.size ? [left, right] : [right, left]
  for (const item of small) if (large.has(item)) total++
  return total
}

function unionSets(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return new Set([...left, ...right])
}

function sweExploreRegionsOverlap(left: SWEExploreRegion, right: SWEExploreRegion) {
  if (left.path !== right.path) return false
  if (!sweExploreRegionIsFinite(left) || !sweExploreRegionIsFinite(right)) return false
  return left.start <= right.end && right.start <= left.end
}

function sweExploreWeightedCoreCoverage(
  regions: readonly SWEExploreRegion[],
  groundTruth: SWEExploreRow["ground_truth"],
) {
  const predLines = sweExploreRegionLinesSet(regions)
  const mainFiles = new Set(groundTruth.main_files)
  let weightedSum = 0
  let weightTotal = 0
  for (const core of groundTruth.read_core_regions) {
    const coreLines = sweExploreRegionLinesSet([core])
    if (coreLines.size === 0) continue
    const coverage = intersectionSize(predLines, coreLines) / coreLines.size
    const weight = mainFiles.has(core.path) ? 3 : 2
    weightedSum += weight * coverage
    weightTotal += weight
  }
  return weightTotal === 0 ? 0 : weightedSum / weightTotal
}

function sweExploreNdcgAtLineBudget(
  regions: readonly SWEExploreRegion[],
  groundTruth: SWEExploreRow["ground_truth"],
  budget: number,
) {
  if (regions.length === 0 || groundTruth.read_core_regions.length === 0) return 0
  const coreLines = sweExploreRegionLinesSet(groundTruth.read_core_regions)
  const mainFiles = new Set(groundTruth.main_files)
  const gains = regions.map((region) => {
    if (!sweExploreRegionIsFinite(region)) return 0
    let gain = 0
    for (let line = region.start; line <= region.end; line++) {
      if (coreLines.has(sweExploreLineKey(region.path, line))) gain += mainFiles.has(region.path) ? 1.5 : 1
    }
    return gain
  })
  const lineCounts = regions.map(sweExploreRegionLines)
  const dcg = sweExploreDcgWithLineBudget(gains, lineCounts, budget)
  const ideal = gains
    .map((gain, index) => ({ gain, lineCount: lineCounts[index] ?? 0 }))
    .toSorted((a, b) => b.gain / Math.max(b.lineCount, 1) - a.gain / Math.max(a.lineCount, 1))
  const idcg = sweExploreDcgWithLineBudget(
    ideal.map((item) => item.gain),
    ideal.map((item) => item.lineCount),
    budget,
  )
  return idcg === 0 ? 0 : Math.min(dcg / idcg, 1)
}

function sweExploreDcgWithLineBudget(gains: readonly number[], lineCounts: readonly number[], budget: number) {
  let total = 0
  let cumulativeLines = 0
  for (let index = 0; index < gains.length; index++) {
    cumulativeLines += lineCounts[index] ?? 0
    if (cumulativeLines > budget && index > 0) break
    total += (gains[index] ?? 0) / Math.log2(index + 2)
  }
  return total
}

function sweExploreRecallAtLineBudget(
  regions: readonly SWEExploreRegion[],
  groundTruth: SWEExploreRow["ground_truth"],
  budget: number,
) {
  const coreLines = sweExploreRegionLinesSet(groundTruth.read_core_regions)
  if (coreLines.size === 0) return 0
  const covered = new Set<string>()
  let cumulativeLines = 0
  for (const region of regions) {
    if (!sweExploreRegionIsFinite(region)) continue
    for (let line = region.start; line <= region.end; line++) {
      cumulativeLines++
      const key = sweExploreLineKey(region.path, line)
      if (coreLines.has(key)) covered.add(key)
      if (cumulativeLines >= budget) break
    }
    if (cumulativeLines >= budget) break
  }
  return covered.size / coreLines.size
}

function sweExploreFirstUsefulHit(regions: readonly SWEExploreRegion[], groundTruth: SWEExploreRow["ground_truth"]) {
  if (regions.length === 0) return 0
  const coreLines = sweExploreRegionLinesSet(groundTruth.read_core_regions)
  if (coreLines.size === 0) return 0
  for (let index = 0; index < regions.length; index++) {
    const region = regions[index]
    if (!region || !sweExploreRegionIsFinite(region)) continue
    for (let line = region.start; line <= region.end; line++) {
      if (coreLines.has(sweExploreLineKey(region.path, line))) return 1 - index / regions.length
    }
  }
  return 0
}

function meanSWEExploreOfficialMetrics(metrics: readonly SWEExploreOfficialMetrics[]) {
  return {
    precision: mean(metrics.map((item) => item.precision)),
    recall: mean(metrics.map((item) => item.recall)),
    f1_score: mean(metrics.map((item) => item.f1_score)),
    hit_file_rate: mean(metrics.map((item) => item.hit_file_rate)),
    noise_file_rate: mean(metrics.map((item) => item.noise_file_rate)),
    hit_region_rate: mean(metrics.map((item) => item.hit_region_rate)),
    noise_region_rate: mean(metrics.map((item) => item.noise_region_rate)),
    weighted_core_coverage: mean(metrics.map((item) => item.weighted_core_coverage)),
    context_efficiency: mean(metrics.map((item) => item.context_efficiency)),
    optional_coverage: mean(metrics.map((item) => item.optional_coverage)),
    ndcg_at_100: mean(metrics.map((item) => item.ndcg_at_100)),
    ndcg_at_300: mean(metrics.map((item) => item.ndcg_at_300)),
    ndcg_at_500: mean(metrics.map((item) => item.ndcg_at_500)),
    recall_at_100: mean(metrics.map((item) => item.recall_at_100)),
    recall_at_300: mean(metrics.map((item) => item.recall_at_300)),
    recall_at_500: mean(metrics.map((item) => item.recall_at_500)),
    first_useful_hit: mean(metrics.map((item) => item.first_useful_hit)),
  } satisfies SWEExploreOfficialMetrics
}

function uniqueRegions(regions: readonly SWEExploreRegion[]) {
  const seen = new Set<string>()
  return regions.filter((region) => {
    const key = `${region.path}\0${region.start}\0${region.end}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function stableJson(value: unknown) {
  return JSON.stringify(stableValue(value))
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  )
}

function stringValues(value: unknown) {
  if (!Array.isArray(value)) return []
  return unique(value.filter((item): item is string => typeof item === "string" && item.length > 0))
}

function pathValues(value: unknown) {
  if (!Array.isArray(value)) return []
  return unique(
    value.flatMap((item) => {
      if (typeof item === "string" && item.length > 0) return [item]
      if (isRecord(item) && typeof item.path === "string" && item.path.length > 0) return [item.path]
      return []
    }),
  )
}

export function evaluateCase(input: {
  readonly item: Case
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly activeFiles?: readonly string[]
}) {
  const selection = SessionContextLedger.select({
    events: input.item.events,
    policy: input.policy,
    budget: input.budget,
    activeFiles: input.activeFiles,
    query: input.item.query,
  })
  return evaluateSelection({
    item: input.item,
    policy: input.policy,
    budget: input.budget,
    selection,
  })
}

export function evaluateAgentRetrievalBenchRanking(input: {
  readonly cases: readonly Case[]
  readonly budgets: readonly number[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly rankingStrategy?: AgentRetrievalRankingStrategy
  readonly contextBudgetChars?: number
}) {
  const contextBudgetChars = input.contextBudgetChars ?? 8_000
  const rankingStrategy = input.rankingStrategy ?? "packet-order"
  const details = input.cases.flatMap((item) =>
    input.budgets.flatMap((budget) =>
      input.policies.map((policy) => {
        const selection = SessionContextLedger.select({
          events: item.events,
          policy,
          budget,
          query: item.query,
        })
        return agentRetrievalRankingDetail({
          item,
          policy,
          budget,
          selection,
          rankingStrategy,
          contextBudgetChars,
        })
      }),
    ),
  )
  const summaries = Array.from(
    Map.groupBy(details, (detail) => `${detail.budget}\0${detail.policy}\0${detail.taskType}`).values(),
  ).map((items) => ({
    taskType: items[0]?.taskType ?? "overall",
    policy: items[0]?.policy ?? "recency",
    budget: items[0]?.budget ?? 0,
    rankingStrategy,
    cases: items.length,
    metrics: meanAgentRetrievalRankingMetrics(items.map((item) => item.metrics)),
  }))
  const overallSummaries = Array.from(
    Map.groupBy(details, (detail) => `${detail.budget}\0${detail.policy}`).values(),
  ).map((items) => ({
    taskType: "overall",
    policy: items[0]?.policy ?? "recency",
    budget: items[0]?.budget ?? 0,
    rankingStrategy,
    cases: items.length,
    metrics: meanAgentRetrievalRankingMetrics(items.map((item) => item.metrics)),
  }))
  return {
    cases: input.cases.length,
    budgets: input.budgets,
    policies: input.policies,
    rankingStrategy,
    contextBudgetChars,
    summaries: [...overallSummaries, ...summaries].toSorted(
      (a, b) =>
        a.budget - b.budget ||
        a.taskType.localeCompare(b.taskType) ||
        input.policies.indexOf(a.policy) - input.policies.indexOf(b.policy),
    ),
    details: details.toSorted(
      (a, b) =>
        a.budget - b.budget ||
        a.policy.localeCompare(b.policy) ||
        a.taskType.localeCompare(b.taskType) ||
        a.instanceID.localeCompare(b.instanceID),
    ),
  } satisfies AgentRetrievalRankingReport
}

export function evaluateSWEExploreOfficial(input: {
  readonly rows: readonly SWEExploreRow[]
  readonly cases: readonly Case[]
  readonly budgets: readonly number[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
}) {
  const rowsByID = new Map(input.rows.map((row) => [row.instance_id, row]))
  const officialRows = input.cases.flatMap((item) =>
    input.budgets.flatMap((budget) =>
      input.policies.map((policy) => {
        const row = rowsByID.get(item.instance_id)
        if (!row) throw new Error(`Missing SWE-Explore row for case ${item.instance_id}`)
        const selection = SessionContextLedger.select({
          events: item.events,
          policy,
          budget,
          query: item.query,
        })
        const regions = sweExploreRegionsFromSelection(selection)
        const explorer = `context-ledger:${policy}:b${budget}`
        return {
          instance_id: item.instance_id,
          explorer,
          policy,
          budget,
          regions,
          metrics: evaluateSWEExploreOfficialMetrics(regions, row.ground_truth),
          num_regions: regions.length,
        } satisfies SWEExploreOfficialRow
      }),
    ),
  )
  const summaries = Array.from(Map.groupBy(officialRows, (row) => `${row.budget}\0${row.policy}`).values()).map(
    (items) => ({
      explorer: items[0]?.explorer ?? "context-ledger",
      policy: items[0]?.policy ?? "recency",
      budget: items[0]?.budget ?? 0,
      cases: items.length,
      metrics: meanSWEExploreOfficialMetrics(items.map((item) => item.metrics)),
    }),
  )
  return {
    cases: input.cases.length,
    budgets: input.budgets,
    policies: input.policies,
    rows: officialRows.toSorted(
      (a, b) =>
        a.budget - b.budget ||
        SessionContextLedger.selectionPolicyOrder(a.policy) - SessionContextLedger.selectionPolicyOrder(b.policy) ||
        a.instance_id.localeCompare(b.instance_id),
    ),
    summaries: summaries.toSorted(
      (a, b) =>
        a.budget - b.budget ||
        SessionContextLedger.selectionPolicyOrder(a.policy) - SessionContextLedger.selectionPolicyOrder(b.policy),
    ),
  } satisfies SWEExploreOfficialReport
}

export function analyzeSWEExploreOracles(input: {
  readonly rows: readonly SWEExploreRow[]
  readonly cases: readonly Case[]
  readonly budgets: readonly number[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
}) {
  const rowsByID = new Map(input.rows.map((row) => [row.instance_id, row]))
  const paired = input.cases.map((item) => {
    const row = rowsByID.get(item.instance_id)
    if (!row) throw new Error(`Missing SWE-Explore row for case ${item.instance_id}`)
    return { item, row }
  })
  const candidateRows = paired.map(({ item, row }) => sweExploreCandidatePoolOracleRow(item, row))
  const budgetRows = paired.flatMap(({ item, row }) =>
    input.budgets.map((budget) => sweExploreBudgetOracleRow({ item, row, budget, policies: input.policies })),
  )
  const budgetSummaries = Array.from(Map.groupBy(budgetRows, (row) => row.budget).entries()).map(
    ([budget, rows]) =>
      ({
        budget,
        cases: rows.length,
        bestPolicyF1: mean(rows.map((row) => row.bestPolicyMetrics.f1_score)),
        fileOracleF1: mean(rows.map((row) => row.fileOracleMetrics.f1_score)),
        budgetOracleF1: mean(rows.map((row) => row.budgetOracleMetrics.f1_score)),
        poolLineRecall: mean(rows.map((row) => row.poolMetrics.recall)),
        bestPolicyRegretVsBudgetOracle: mean(rows.map((row) => row.bestPolicyRegretVsBudgetOracle)),
        fileOracleRegretVsBudgetOracle: mean(rows.map((row) => row.fileOracleRegretVsBudgetOracle)),
      }) satisfies SWEExploreOracleBudgetSummary,
  )
  return {
    cases: input.cases.length,
    budgets: input.budgets,
    policies: input.policies,
    candidatePool: {
      summary: {
        cases: candidateRows.length,
        meanFileRecall: mean(candidateRows.map((row) => row.fileRecall)),
        meanRegionRecall: mean(candidateRows.map((row) => row.regionRecall)),
        meanLineRecall: mean(candidateRows.map((row) => row.lineRecall)),
        failureClasses: Array.from(Map.groupBy(candidateRows, (row) => row.failureClass).entries())
          .map(([failureClass, rows]) => ({ failureClass, cases: rows.length }))
          .toSorted((a, b) => b.cases - a.cases || a.failureClass.localeCompare(b.failureClass)),
      },
      rows: candidateRows.toSorted((a, b) => a.instanceID.localeCompare(b.instanceID)),
    },
    budgetOracles: {
      summaries: budgetSummaries.toSorted((a, b) => a.budget - b.budget),
      rows: budgetRows.toSorted((a, b) => a.budget - b.budget || a.instanceID.localeCompare(b.instanceID)),
    },
  } satisfies SWEExploreOracleReport
}

function sweExploreCandidatePoolOracleRow(item: Case, row: SWEExploreRow) {
  const regions = sweExploreRegionsFromEvents(item.events)
  const candidateFiles = new Set(regions.map((region) => region.path))
  const goldFiles = new Set(row.ground_truth.read_core_files)
  const goldRegions = row.ground_truth.read_core_regions
  const fileHits = Array.from(goldFiles).filter((file) => candidateFiles.has(file)).length
  const regionHits = goldRegions.filter((gold) =>
    regions.some((region) => sweExploreRegionsOverlap(gold, region)),
  ).length
  const candidateLines = sweExploreRegionLinesSet(regions)
  const goldLines = sweExploreRegionLinesSet(goldRegions)
  const lineHits = intersectionSize(candidateLines, goldLines)
  const fileRecall = goldFiles.size === 0 ? 1 : fileHits / goldFiles.size
  const regionRecall = goldRegions.length === 0 ? 1 : regionHits / goldRegions.length
  const lineRecall = goldLines.size === 0 ? 1 : lineHits / goldLines.size
  const failureClass: SWEExploreOracleFailureClass =
    regions.length === 0
      ? "empty-candidate-pool"
      : fileRecall < 1
        ? "gold-file-absent"
        : regionRecall < 1
          ? "gold-region-absent"
          : "pool-covered"
  return {
    instanceID: item.instance_id,
    candidateFiles: candidateFiles.size,
    candidateRegions: regions.length,
    goldFiles: goldFiles.size,
    goldRegions: goldRegions.length,
    fileRecall,
    regionRecall,
    lineRecall,
    failureClass,
  } satisfies SWEExploreOracleCandidatePoolRow
}

function sweExploreBudgetOracleRow(input: {
  readonly item: Case
  readonly row: SWEExploreRow
  readonly budget: number
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
}) {
  const policyScores = input.policies.map((policy) => {
    const selection = SessionContextLedger.select({
      events: input.item.events,
      policy,
      budget: input.budget,
      query: input.item.query,
    })
    return {
      policy,
      metrics: evaluateSWEExploreOfficialMetrics(sweExploreRegionsFromSelection(selection), input.row.ground_truth),
    }
  })
  const bestPolicy = maxBy(policyScores, (score) => score.metrics.f1_score) ?? {
    policy: input.policies[0] ?? "recency",
    metrics: evaluateSWEExploreOfficialMetrics([], input.row.ground_truth),
  }
  const fileOracleMetrics = evaluateSWEExploreOfficialMetrics(
    sweExplorePackEventsByFileOracle(input.item.events, input.row.ground_truth, input.budget),
    input.row.ground_truth,
  )
  const budgetOracleMetrics = evaluateSWEExploreOfficialMetrics(
    sweExplorePackEventsByRegionOracle(input.item.events, input.row.ground_truth, input.budget),
    input.row.ground_truth,
  )
  const poolMetrics = evaluateSWEExploreOfficialMetrics(
    sweExploreRegionsFromEvents(input.item.events),
    input.row.ground_truth,
  )
  return {
    instanceID: input.item.instance_id,
    budget: input.budget,
    bestPolicy: bestPolicy.policy,
    bestPolicyMetrics: bestPolicy.metrics,
    fileOracleMetrics,
    budgetOracleMetrics,
    poolMetrics,
    bestPolicyRegretVsBudgetOracle: Math.max(0, budgetOracleMetrics.f1_score - bestPolicy.metrics.f1_score),
    fileOracleRegretVsBudgetOracle: Math.max(0, budgetOracleMetrics.f1_score - fileOracleMetrics.f1_score),
  } satisfies SWEExploreOracleBudgetRow
}

function sweExplorePackEventsByFileOracle(
  events: readonly SessionContextLedger.Event[],
  groundTruth: SWEExploreRow["ground_truth"],
  budget: number,
) {
  const coreFiles = new Set(groundTruth.read_core_files)
  return sweExploreRegionsFromEvents(
    sweExplorePackEventsInOrder(
      events.filter((event) => eventFiles(event).some((file) => coreFiles.has(file))),
      budget,
    ),
  )
}

function sweExplorePackEventsByRegionOracle(
  events: readonly SessionContextLedger.Event[],
  groundTruth: SWEExploreRow["ground_truth"],
  budget: number,
) {
  const candidates = events.map((event, index) => ({
    event,
    index,
    cost: sweExploreOracleEventCost(event),
  }))
  const selected: SessionContextLedger.Event[] = []
  const covered = new Set<string>()
  const coreLines = sweExploreRegionLinesSet(groundTruth.read_core_regions)
  let remainingBudget = budget
  while (remainingBudget > 0) {
    const next = candidates
      .filter((candidate) => candidate.cost <= remainingBudget && !selected.includes(candidate.event))
      .map((candidate) => ({
        ...candidate,
        gain: sweExploreMarginalCoreLineGain(candidate.event, coreLines, covered),
      }))
      .filter((candidate) => candidate.gain > 0)
      .toSorted((a, b) => b.gain / b.cost - a.gain / a.cost || b.gain - a.gain || a.index - b.index)[0]
    if (!next) break
    selected.push(next.event)
    remainingBudget -= next.cost
    for (const key of sweExploreRegionLinesSet(sweExploreRegionsFromEvents([next.event]))) {
      if (coreLines.has(key)) covered.add(key)
    }
  }
  return sweExploreRegionsFromEvents(selected)
}

function sweExplorePackEventsInOrder(events: readonly SessionContextLedger.Event[], budget: number) {
  const selected: SessionContextLedger.Event[] = []
  let remainingBudget = budget
  for (const event of events) {
    const cost = sweExploreOracleEventCost(event)
    if (cost > remainingBudget) continue
    selected.push(event)
    remainingBudget -= cost
  }
  return selected
}

function sweExploreOracleEventCost(event: SessionContextLedger.Event) {
  const regionLines = sweExploreRegionsFromEvents([event]).reduce(
    (total, region) => total + sweExploreRegionLines(region),
    0,
  )
  return Math.max(1, event.tokens, regionLines)
}

function sweExploreMarginalCoreLineGain(
  event: SessionContextLedger.Event,
  coreLines: ReadonlySet<string>,
  covered: ReadonlySet<string>,
) {
  let gain = 0
  for (const key of sweExploreRegionLinesSet(sweExploreRegionsFromEvents([event]))) {
    if (coreLines.has(key) && !covered.has(key)) gain++
  }
  return gain
}

export function evaluateSWEExploreOfficialMetrics(
  regions: readonly SWEExploreRegion[],
  groundTruth: SWEExploreRow["ground_truth"],
) {
  const coreRegions = groundTruth.read_core_regions
  const optionalRegions = Object.values(groundTruth.read_optional_regions_map ?? {}).flat()
  const predLines = sweExploreRegionLinesSet(regions)
  const coreLines = sweExploreRegionLinesSet(coreRegions)
  const optionalLines = sweExploreRegionLinesSet(optionalRegions)
  const coreOverlap = intersectionSize(predLines, coreLines)
  const precision = predLines.size === 0 ? 0 : coreOverlap / predLines.size
  const recall = coreLines.size === 0 ? 0 : coreOverlap / coreLines.size
  const visitedFiles = new Set(regions.map((region) => region.path))
  const coreFiles = new Set(groundTruth.read_core_files)
  const optionalFiles = new Set(Object.values(groundTruth.read_optional_files_map ?? {}).flat())
  const hitFiles = Array.from(coreFiles).filter((file) => visitedFiles.has(file)).length
  const noiseFiles = Array.from(visitedFiles).filter((file) => !coreFiles.has(file) && !optionalFiles.has(file)).length
  const coreRegionHits = coreRegions.filter((core) =>
    regions.some((region) => sweExploreRegionsOverlap(core, region)),
  ).length
  const noiseRegions = regions.filter(
    (region) =>
      !coreRegions.some((core) => sweExploreRegionsOverlap(region, core)) &&
      !optionalRegions.some((optional) => sweExploreRegionsOverlap(region, optional)),
  ).length
  const usefulLines = unionSets(coreLines, optionalLines)
  return {
    precision,
    recall,
    f1_score: f1(precision, recall),
    hit_file_rate: coreFiles.size === 0 ? 0 : hitFiles / coreFiles.size,
    noise_file_rate: visitedFiles.size === 0 ? 0 : noiseFiles / visitedFiles.size,
    hit_region_rate: coreRegions.length === 0 ? 0 : coreRegionHits / coreRegions.length,
    noise_region_rate: regions.length === 0 ? 0 : noiseRegions / regions.length,
    weighted_core_coverage: sweExploreWeightedCoreCoverage(regions, groundTruth),
    context_efficiency: predLines.size === 0 ? 0 : intersectionSize(predLines, usefulLines) / predLines.size,
    optional_coverage: optionalLines.size === 0 ? 0 : intersectionSize(predLines, optionalLines) / optionalLines.size,
    ndcg_at_100: sweExploreNdcgAtLineBudget(regions, groundTruth, 100),
    ndcg_at_300: sweExploreNdcgAtLineBudget(regions, groundTruth, 300),
    ndcg_at_500: sweExploreNdcgAtLineBudget(regions, groundTruth, 500),
    recall_at_100: sweExploreRecallAtLineBudget(regions, groundTruth, 100),
    recall_at_300: sweExploreRecallAtLineBudget(regions, groundTruth, 300),
    recall_at_500: sweExploreRecallAtLineBudget(regions, groundTruth, 500),
    first_useful_hit: sweExploreFirstUsefulHit(regions, groundTruth),
  } satisfies SWEExploreOfficialMetrics
}

export function inspectSelectionDeltas(input: {
  readonly cases: readonly Case[]
  readonly budgets: readonly number[]
  readonly baselinePolicy: SessionContextLedger.SelectionPolicy
  readonly candidatePolicy: SessionContextLedger.SelectionPolicy
  readonly limit?: number
}) {
  const rows = input.cases.flatMap((item) =>
    input.budgets.map((budget) =>
      inspectSelectionDelta({
        item,
        budget,
        baselinePolicy: input.baselinePolicy,
        candidatePolicy: input.candidatePolicy,
      }),
    ),
  )
  return {
    baselinePolicy: input.baselinePolicy,
    candidatePolicy: input.candidatePolicy,
    budgets: input.budgets,
    cases: input.cases.length,
    rows: rows
      .toSorted((a, b) => {
        const delta = b.deltas.officialUtility - a.deltas.officialUtility
        if (delta !== 0) return delta
        return a.instanceID.localeCompare(b.instanceID) || a.budget - b.budget
      })
      .slice(0, input.limit),
  } satisfies SelectionDeltaReport
}

export function inspectSelectionDelta(input: {
  readonly item: Case
  readonly budget: number
  readonly baselinePolicy: SessionContextLedger.SelectionPolicy
  readonly candidatePolicy: SessionContextLedger.SelectionPolicy
}) {
  const baselineSelection = SessionContextLedger.select({
    events: input.item.events,
    policy: input.baselinePolicy,
    budget: input.budget,
    query: input.item.query,
  })
  const candidateSelection = SessionContextLedger.select({
    events: input.item.events,
    policy: input.candidatePolicy,
    budget: input.budget,
    query: input.item.query,
  })
  const baselineResult = evaluateSelection({
    item: input.item,
    policy: input.baselinePolicy,
    budget: input.budget,
    selection: baselineSelection,
  })
  const candidateResult = evaluateSelection({
    item: input.item,
    policy: input.candidatePolicy,
    budget: input.budget,
    selection: candidateSelection,
  })
  const baselineFiles = unique(baselineSelection.events.flatMap((event) => eventFiles(event)))
  const candidateFiles = unique(candidateSelection.events.flatMap((event) => eventFiles(event)))
  const baselineSpans = uniqueSpans(baselineSelection.events.flatMap((event) => event.spans ?? []))
  const candidateSpans = uniqueSpans(candidateSelection.events.flatMap((event) => event.spans ?? []))
  const baselineIDs = new Set(baselineSelection.events.map((event) => event.id))
  const candidateIDs = new Set(candidateSelection.events.map((event) => event.id))
  return {
    instanceID: input.item.instance_id,
    budget: input.budget,
    baseline: selectionDeltaSnapshot(input.baselinePolicy, baselineResult, baselineSelection, input.item),
    candidate: selectionDeltaSnapshot(input.candidatePolicy, candidateResult, candidateSelection, input.item),
    deltas: {
      tokens: candidateResult.tokens - baselineResult.tokens,
      selected: candidateResult.selected - baselineResult.selected,
      eventF1: candidateResult.f1 - baselineResult.f1,
      fileF1: candidateResult.fileF1 - baselineResult.fileF1,
      spanF1: candidateResult.spanF1 - baselineResult.spanF1,
      lineF1: candidateResult.lineF1 - baselineResult.lineF1,
      officialUtility: officialUtilityProxy(candidateResult) - officialUtilityProxy(baselineResult),
    },
    gainedFiles: candidateFiles.filter((file) => !baselineFiles.includes(file)),
    lostFiles: baselineFiles.filter((file) => !candidateFiles.includes(file)),
    gainedGoldFiles: candidateFiles.filter(
      (file) => input.item.gold_files.includes(file) && !baselineFiles.includes(file),
    ),
    lostGoldFiles: baselineFiles.filter(
      (file) => input.item.gold_files.includes(file) && !candidateFiles.includes(file),
    ),
    gainedSpans: candidateSpans
      .filter((span) => !baselineSpans.some((baseline) => spanKey(baseline) === spanKey(span)))
      .slice(0, 12),
    lostSpans: baselineSpans
      .filter((span) => !candidateSpans.some((candidate) => spanKey(candidate) === spanKey(span)))
      .slice(0, 12),
    candidateOnlyEvents: candidateSelection.events
      .filter((event) => !baselineIDs.has(event.id))
      .map((event) => selectionDeltaEvent(event, input.item))
      .slice(0, 8),
    baselineOnlyEvents: baselineSelection.events
      .filter((event) => !candidateIDs.has(event.id))
      .map((event) => selectionDeltaEvent(event, input.item))
      .slice(0, 8),
  } satisfies SelectionDeltaRow
}

function evaluateSelection(input: {
  readonly item: Case
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly selection: SessionContextLedger.Selection
}) {
  const selection = input.selection
  const evaluation = SessionContextLedger.evaluate({ selected: selection.events, goldIDs: input.item.gold_ids })
  const selectedFiles = new Set(selection.events.flatMap((event) => eventFiles(event)))
  const goldFiles = new Set(input.item.gold_files)
  const fileHits = input.item.gold_files.filter((file) => selectedFiles.has(file)).length
  const spanMetrics = overlapMetrics({
    gold: input.item.events
      .filter((event) => input.item.gold_ids.includes(event.id))
      .flatMap((event) => event.spans ?? []),
    selected: selection.events.flatMap((event) => event.spans ?? []),
  })
  const trajectory = trajectoryCoverageMetrics({
    goldFiles: input.item.gold_files,
    goldSpans: input.item.events
      .filter((event) => input.item.gold_ids.includes(event.id))
      .flatMap((event) => event.spans ?? []),
    events: selection.events,
  })
  return {
    instanceID: input.item.instance_id,
    policy: input.policy,
    budget: input.budget,
    tokens: selection.tokens,
    selected: selection.events.length,
    recall: evaluation.recall,
    precision: evaluation.precision,
    f1: f1(evaluation.recall, evaluation.precision),
    recallPerThousandTokens: evaluation.recallPerThousandTokens,
    fileRecall: goldFiles.size === 0 ? 1 : fileHits / goldFiles.size,
    filePrecision: selectedFiles.size === 0 ? 1 : fileHits / selectedFiles.size,
    fileF1: f1(
      goldFiles.size === 0 ? 1 : fileHits / goldFiles.size,
      selectedFiles.size === 0 ? 1 : fileHits / selectedFiles.size,
    ),
    spanRecall: spanMetrics.spanRecall,
    spanPrecision: spanMetrics.spanPrecision,
    spanF1: spanMetrics.spanF1,
    lineRecall: spanMetrics.lineRecall,
    linePrecision: spanMetrics.linePrecision,
    lineF1: spanMetrics.lineF1,
    aucFileCoverage: trajectory.aucFileCoverage,
    aucSpanCoverage: trajectory.aucSpanCoverage,
    aucLineCoverage: trajectory.aucLineCoverage,
  } satisfies Result
}

function trajectoryCoverageMetrics(input: {
  readonly goldFiles: readonly string[]
  readonly goldSpans: readonly SessionContextLedger.Span[]
  readonly events: readonly SessionContextLedger.Event[]
}) {
  const goldFiles = new Set(input.goldFiles)
  const cumulativeFiles = new Set<string>()
  const cumulativeSpans: SessionContextLedger.Span[] = []
  const fileCoverage: number[] = []
  const spanCoverage: number[] = []
  const lineCoverage: number[] = []
  for (const event of input.events) {
    for (const file of eventFiles(event)) cumulativeFiles.add(file)
    cumulativeSpans.push(...(event.spans ?? []))
    const fileHits = input.goldFiles.filter((file) => cumulativeFiles.has(file)).length
    const overlap = overlapMetrics({ gold: input.goldSpans, selected: cumulativeSpans })
    fileCoverage.push(goldFiles.size === 0 ? 1 : fileHits / goldFiles.size)
    spanCoverage.push(overlap.spanRecall)
    lineCoverage.push(overlap.lineRecall)
  }
  return {
    aucFileCoverage: mean(fileCoverage),
    aucSpanCoverage: mean(spanCoverage),
    aucLineCoverage: mean(lineCoverage),
  }
}

function agentRetrievalRankingDetail(input: {
  readonly item: Case
  readonly policy: SessionContextLedger.SelectionPolicy
  readonly budget: number
  readonly rankingStrategy: AgentRetrievalRankingStrategy
  readonly selection: SessionContextLedger.Selection
  readonly contextBudgetChars: number
}) {
  const rankedFiles = agentRetrievalRankedFiles(input.item, input.selection.events, input.rankingStrategy)
  const goldFiles = input.item.gold_files
  return {
    instanceID: input.item.instance_id,
    taskType: input.item.task_type ?? "unknown",
    policy: input.policy,
    budget: input.budget,
    rankingStrategy: input.rankingStrategy,
    tokens: input.selection.tokens,
    goldFiles,
    rankedFiles: rankedFiles.slice(0, 20),
    goldRanks: goldFileRanks(goldFiles, rankedFiles),
    metrics: {
      recallAt5: fileRecallAt(goldFiles, rankedFiles, 5),
      recallAt10: fileRecallAt(goldFiles, rankedFiles, 10),
      recallAt20: fileRecallAt(goldFiles, rankedFiles, 20),
      mrr: reciprocalFileRank(goldFiles, rankedFiles),
      goldCoverageAt8k: selectedGoldCoverageAtBudget(goldFiles, input.selection.events, input.contextBudgetChars),
    },
  } satisfies AgentRetrievalRankingDetail
}

function agentRetrievalRankedFiles(
  item: Case,
  events: readonly SessionContextLedger.Event[],
  strategy: AgentRetrievalRankingStrategy,
) {
  const packetOrder = unique(events.flatMap(eventFiles))
  if (strategy === "packet-order") return packetOrder
  if (item.task_type === "comment2context") return packetOrder
  const firstOrder = new Map(packetOrder.map((file, index) => [file, index]))
  const queryTerms = textTerms(item.query ?? "")
  const givenFiles = new Set(agentRetrievalCaseGivenFiles(item))
  const scored = packetOrder.map((file) => {
    const fileEvents = events.filter((event) => eventFiles(event).includes(file))
    const text = [file, ...fileEvents.map((event) => event.summary)].join("\n")
    const overlap =
      item.task_type === "comment2context"
        ? 0
        : Array.from(queryTerms).filter((term) => textTerms(text).has(term)).length
    const bucket = pathBucket(file)
    return {
      file,
      score:
        agentRetrievalTaskPathPrior(item.task_type ?? "", bucket, givenFiles.has(file)) +
        overlap +
        Math.max(0, ...fileEvents.map((event) => (event.kind === "code-context" ? 2 : event.kind === "diff" ? 1 : 0))),
    }
  })
  return scored
    .toSorted((a, b) => {
      const score = b.score - a.score
      if (score !== 0) return score
      return (firstOrder.get(a.file) ?? 0) - (firstOrder.get(b.file) ?? 0)
    })
    .map((item) => item.file)
}

function agentRetrievalCaseGivenFiles(item: Case) {
  return unique([
    ...item.events.filter((event) => event.kind === "user-goal").flatMap(eventFiles),
    ...agentRetrievalQueryPathHints(item.query ?? ""),
  ])
}

function agentRetrievalQueryPathHints(query: string) {
  try {
    const parsed = JSON.parse(query)
    if (!isRecord(parsed)) return []
    return unique([
      ...stringValues(parsed.given_files),
      ...stringValues(parsed.changed_files),
      ...stringValues(parsed.files),
      ...pathValues([parsed.given_file, parsed.path, parsed.changed_file]),
    ])
  } catch {
    return []
  }
}

function agentRetrievalTaskPathPrior(taskType: string, bucket: string, given: boolean) {
  if (taskType === "code2test") return bucket === "test" ? 20 : bucket === "implementation" ? 2 : -2
  if (taskType === "comment2context") return given ? -20 : 0
  return bucket === "implementation" ? 10 : bucket === "test" ? -4 : 0
}

function meanAgentRetrievalRankingMetrics(metrics: readonly AgentRetrievalRankingMetrics[]) {
  return {
    recallAt5: mean(metrics.map((item) => item.recallAt5)),
    recallAt10: mean(metrics.map((item) => item.recallAt10)),
    recallAt20: mean(metrics.map((item) => item.recallAt20)),
    mrr: mean(metrics.map((item) => item.mrr)),
    goldCoverageAt8k: mean(metrics.map((item) => item.goldCoverageAt8k)),
  } satisfies AgentRetrievalRankingMetrics
}

function goldFileRanks(goldFiles: readonly string[], rankedFiles: readonly string[]) {
  const ranks = new Map(rankedFiles.map((file, index) => [file, index + 1]))
  return Object.fromEntries(goldFiles.map((file) => [file, ranks.get(file) ?? null]))
}

function fileRecallAt(goldFiles: readonly string[], rankedFiles: readonly string[], k: number) {
  if (goldFiles.length === 0) return 0
  const retrieved = new Set(rankedFiles.slice(0, k))
  return goldFiles.filter((file) => retrieved.has(file)).length / goldFiles.length
}

function reciprocalFileRank(goldFiles: readonly string[], rankedFiles: readonly string[]) {
  const gold = new Set(goldFiles)
  const index = rankedFiles.findIndex((file) => gold.has(file))
  return index === -1 ? 0 : 1 / (index + 1)
}

function selectedGoldCoverageAtBudget(
  goldFiles: readonly string[],
  events: readonly SessionContextLedger.Event[],
  contextBudgetChars: number,
) {
  if (goldFiles.length === 0) return 0
  const gold = new Set(goldFiles)
  const covered = new Set<string>()
  let used = 0
  for (const event of events) {
    const size = event.summary.length
    if (used > 0 && used + size > contextBudgetChars) break
    used += size
    for (const file of eventFiles(event)) {
      if (gold.has(file)) covered.add(file)
    }
  }
  return covered.size / gold.size
}

function selectionDeltaSnapshot(
  policy: SessionContextLedger.SelectionPolicy,
  result: Result,
  selection: SessionContextLedger.Selection,
  item: Case,
) {
  const files = unique(selection.events.flatMap((event) => eventFiles(event)))
  return {
    policy,
    tokens: result.tokens,
    selected: result.selected,
    files,
    goldFiles: files.filter((file) => item.gold_files.includes(file)),
    eventIDs: selection.events.map((event) => event.id),
    metrics: {
      eventF1: result.f1,
      fileF1: result.fileF1,
      spanF1: result.spanF1,
      lineF1: result.lineF1,
      officialUtility: officialUtilityProxy(result),
    },
  } satisfies SelectionDeltaSnapshot
}

function selectionDeltaEvent(event: SessionContextLedger.Event, item: Case) {
  return {
    id: event.id,
    kind: event.kind,
    tokens: event.tokens,
    files: eventFiles(event),
    spans: event.spans ?? [],
    gold: item.gold_ids.includes(event.id),
  } satisfies SelectionDeltaEvent
}

function officialUtilityProxy(result: Result) {
  return mean([result.fileF1, result.spanF1, result.lineF1])
}

export function summarize(results: readonly Result[]) {
  const grouped = Map.groupBy(results, (result) => `${result.budget}\0${result.policy}`)
  return Array.from(grouped.values())
    .map(
      (items) =>
        ({
          budget: items[0]?.budget ?? 0,
          policy: items[0]?.policy ?? "recency",
          cases: items.length,
          tokens: mean(items.map((item) => item.tokens)),
          recall: mean(items.map((item) => item.recall)),
          precision: mean(items.map((item) => item.precision)),
          f1: mean(items.map((item) => item.f1)),
          recallPerThousandTokens: mean(items.map((item) => item.recallPerThousandTokens)),
          fileRecall: mean(items.map((item) => item.fileRecall)),
          filePrecision: mean(items.map((item) => item.filePrecision)),
          fileF1: mean(items.map((item) => item.fileF1)),
          spanRecall: mean(items.map((item) => item.spanRecall)),
          spanPrecision: mean(items.map((item) => item.spanPrecision)),
          spanF1: mean(items.map((item) => item.spanF1)),
          lineRecall: mean(items.map((item) => item.lineRecall)),
          linePrecision: mean(items.map((item) => item.linePrecision)),
          lineF1: mean(items.map((item) => item.lineF1)),
          aucFileCoverage: mean(items.map((item) => item.aucFileCoverage)),
          aucSpanCoverage: mean(items.map((item) => item.aucSpanCoverage)),
          aucLineCoverage: mean(items.map((item) => item.aucLineCoverage)),
        }) satisfies Summary,
    )
    .toSorted((a, b) => a.budget - b.budget || policiesOrder(a.policy) - policiesOrder(b.policy))
}

function onlySummary(summaries: readonly Summary[]) {
  const [summary] = summaries
  if (!summary) throw new Error("Expected one summary row")
  return summary
}

function experienceReplayMetricDeltas(base: Result, replay: Result) {
  return {
    eventF1: replay.f1 - base.f1,
    fileF1: replay.fileF1 - base.fileF1,
    spanF1: replay.spanF1 - base.spanF1,
    lineF1: replay.lineF1 - base.lineF1,
    aucLineCoverage: replay.aucLineCoverage - base.aucLineCoverage,
    officialUtility: officialUtilityProxy(replay) - officialUtilityProxy(base),
    tokens: replay.tokens - base.tokens,
  } satisfies ExperienceReplayMetricDeltas
}

function experienceReplaySummaryDeltas(base: Summary, replay: Summary) {
  return {
    eventF1: replay.f1 - base.f1,
    fileF1: replay.fileF1 - base.fileF1,
    spanF1: replay.spanF1 - base.spanF1,
    lineF1: replay.lineF1 - base.lineF1,
    aucLineCoverage: replay.aucLineCoverage - base.aucLineCoverage,
    officialUtility:
      mean([replay.fileF1, replay.spanF1, replay.lineF1]) - mean([base.fileF1, base.spanF1, base.lineF1]),
    tokens: replay.tokens - base.tokens,
  } satisfies ExperienceReplayMetricDeltas
}

export function analyze(results: readonly Result[]) {
  const byBudget = Map.groupBy(results, (result) => result.budget)
  return Array.from(byBudget.entries())
    .map(([budget, items]) => {
      const byCase = Map.groupBy(items, (result) => result.instanceID)
      const cases = Array.from(byCase.values())
      const policyItems = Map.groupBy(items, (result) => result.policy)
      const oracleF1ByCase = cases.map((results) => maxBy(results, (result) => result.f1)?.f1 ?? 0)
      const oracleSpanF1ByCase = cases.map((results) => maxBy(results, (result) => result.spanF1)?.spanF1 ?? 0)
      const oracleLineF1ByCase = cases.map((results) => maxBy(results, (result) => result.lineF1)?.lineF1 ?? 0)
      const policies = Array.from(policyItems.entries())
        .map(([policy, policyResults]) => ({
          policy,
          eventWins: cases.filter((results) => maxBy(results, (result) => result.f1)?.policy === policy).length,
          spanWins: cases.filter((results) => maxBy(results, (result) => result.spanF1)?.policy === policy).length,
          lineWins: cases.filter((results) => maxBy(results, (result) => result.lineF1)?.policy === policy).length,
          f1: mean(policyResults.map((result) => result.f1)),
          spanF1: mean(policyResults.map((result) => result.spanF1)),
          lineF1: mean(policyResults.map((result) => result.lineF1)),
          regretF1: mean(
            policyResults.map((result) => {
              const winner = maxBy(byCase.get(result.instanceID) ?? [], (item) => item.f1)
              return Math.max(0, (winner?.f1 ?? 0) - result.f1)
            }),
          ),
        }))
        .toSorted((a, b) => policiesOrder(a.policy) - policiesOrder(b.policy))
      const bestPolicyByF1 = maxBy(policies, (policy) => policy.f1)?.policy ?? "recency"
      return {
        budget,
        cases: cases.length,
        oracleF1: mean(oracleF1ByCase),
        oracleSpanF1: mean(oracleSpanF1ByCase),
        oracleLineF1: mean(oracleLineF1ByCase),
        bestPolicyByF1,
        policies,
      } satisfies PolicyAnalysis
    })
    .toSorted((a, b) => a.budget - b.budget)
}

export function analyzeBudgetRouter(results: readonly Result[], options?: { readonly folds?: number }) {
  const requestedFolds = Math.max(1, Math.floor(options?.folds ?? 5))
  const byBudget = Map.groupBy(results, (result) => result.budget)
  return Array.from(byBudget.entries())
    .map(([budget, items]) => {
      const byCase = Map.groupBy(items, (result) => result.instanceID)
      const caseIDs = Array.from(byCase.keys()).toSorted()
      const folds = Math.max(1, Math.min(requestedFolds, caseIDs.length))
      const foldResults = Array.from({ length: folds }, (_, fold) => {
        const evalCaseIDs = caseIDs.filter((id) => caseFold(id, folds) === fold)
        const trainCaseIDs = caseIDs.filter((id) => caseFold(id, folds) !== fold)
        const trainItems = (trainCaseIDs.length ? trainCaseIDs : caseIDs).flatMap((id) => byCase.get(id) ?? [])
        const trainBestPolicy = bestPolicyByF1(trainItems)
        const routed = evalCaseIDs.flatMap((id) => {
          const caseResults = byCase.get(id) ?? []
          return caseResults.find((result) => result.policy === trainBestPolicy) ?? []
        })
        return {
          fold,
          trainCases: trainCaseIDs.length || caseIDs.length,
          evalCases: evalCaseIDs.length,
          trainBestPolicy,
          evalF1: mean(routed.map((result) => result.f1)),
          evalSpanF1: mean(routed.map((result) => result.spanF1)),
          evalLineF1: mean(routed.map((result) => result.lineF1)),
          regretF1: mean(
            routed.map((result) => {
              const winner = maxBy(byCase.get(result.instanceID) ?? [], (item) => item.f1)
              return Math.max(0, (winner?.f1 ?? 0) - result.f1)
            }),
          ),
        }
      }).filter((fold) => fold.evalCases > 0)
      const routed = foldResults.flatMap((fold) =>
        caseIDs
          .filter((id) => caseFold(id, folds) === fold.fold)
          .flatMap((id) => {
            const caseResults = byCase.get(id) ?? []
            return caseResults.find((result) => result.policy === fold.trainBestPolicy) ?? []
          }),
      )
      const bestFixedPolicy = bestPolicyByF1(items)
      const bestFixedResults = caseIDs.flatMap((id) => {
        const caseResults = byCase.get(id) ?? []
        return caseResults.find((result) => result.policy === bestFixedPolicy) ?? []
      })
      const oracleF1ByCase = caseIDs.map((id) => maxBy(byCase.get(id) ?? [], (result) => result.f1)?.f1 ?? 0)
      const oracleSpanF1ByCase = caseIDs.map(
        (id) => maxBy(byCase.get(id) ?? [], (result) => result.spanF1)?.spanF1 ?? 0,
      )
      const oracleLineF1ByCase = caseIDs.map(
        (id) => maxBy(byCase.get(id) ?? [], (result) => result.lineF1)?.lineF1 ?? 0,
      )
      return {
        budget,
        cases: caseIDs.length,
        folds: foldResults.length,
        routerF1: mean(routed.map((result) => result.f1)),
        routerSpanF1: mean(routed.map((result) => result.spanF1)),
        routerLineF1: mean(routed.map((result) => result.lineF1)),
        oracleF1: mean(oracleF1ByCase),
        oracleSpanF1: mean(oracleSpanF1ByCase),
        oracleLineF1: mean(oracleLineF1ByCase),
        bestFixedPolicy,
        bestFixedF1: mean(bestFixedResults.map((result) => result.f1)),
        routerRegretF1: mean(
          routed.map((result) => {
            const winner = maxBy(byCase.get(result.instanceID) ?? [], (item) => item.f1)
            return Math.max(0, (winner?.f1 ?? 0) - result.f1)
          }),
        ),
        bestFixedRegretF1: mean(
          bestFixedResults.map((result) => {
            const winner = maxBy(byCase.get(result.instanceID) ?? [], (item) => item.f1)
            return Math.max(0, (winner?.f1 ?? 0) - result.f1)
          }),
        ),
        trainPolicyCounts: Array.from(Map.groupBy(foldResults, (fold) => fold.trainBestPolicy).entries())
          .map(([policy, folds]) => ({ policy, folds: folds.length }))
          .toSorted((a, b) => policiesOrder(a.policy) - policiesOrder(b.policy)),
        foldResults,
      } satisfies PolicyRouterAnalysis
    })
    .toSorted((a, b) => a.budget - b.budget)
}

export function analyzeFeatureRouter(
  cases: readonly Case[],
  options: {
    readonly budgets: readonly number[]
    readonly policies: readonly SessionContextLedger.SelectionPolicy[]
    readonly folds?: number
    readonly target?: RouterTarget
  },
) {
  const requestedFolds = Math.max(1, Math.floor(options.folds ?? 5))
  const target = options.target ?? "event-f1"
  return options.budgets.map((budget) => {
    const examples = cases.map((item) => featureExample(item, budget, options.policies))
    const folds = Math.max(1, Math.min(requestedFolds, examples.length))
    const foldResults = Array.from({ length: folds }, (_, fold) => {
      const evalExamples = examples.filter((example) => caseFold(example.instanceID, folds) === fold)
      const trainExamples = examples.filter((example) => caseFold(example.instanceID, folds) !== fold)
      const rule = trainFeatureRule(trainExamples.length ? trainExamples : examples, options.policies, target)
      const routed = evalExamples.map((example) => routedResult(example, rule))
      return {
        fold,
        trainCases: trainExamples.length || examples.length,
        evalCases: evalExamples.length,
        rule,
        evalF1: mean(routed.map((result) => result.f1)),
        evalSpanF1: mean(routed.map((result) => result.spanF1)),
        evalLineF1: mean(routed.map((result) => result.lineF1)),
        regretF1: mean(
          routed.map((result) =>
            Math.max(0, exampleOracle(exampleByID(examples, result.instanceID), "event-f1").f1 - result.f1),
          ),
        ),
      }
    }).filter((fold) => fold.evalCases > 0)
    const routed = foldResults.flatMap((fold) =>
      examples
        .filter((example) => caseFold(example.instanceID, folds) === fold.fold)
        .map((example) => routedResult(example, fold.rule)),
    )
    const scores = featureRouterScores({ target, examples, policies: options.policies, routed })
    return {
      target,
      budget,
      cases: examples.length,
      folds: foldResults.length,
      ...scores,
      featureCounts: Array.from(Map.groupBy(foldResults, (fold) => fold.rule.feature).entries())
        .map(([feature, folds]) => ({ feature, folds: folds.length }))
        .toSorted((a, b) => b.folds - a.folds || a.feature.localeCompare(b.feature)),
      foldResults,
    } satisfies FeatureRouterAnalysis
  })
}

export function trainFeatureRouterRules(
  cases: readonly Case[],
  options: {
    readonly budgets: readonly number[]
    readonly policies: readonly SessionContextLedger.SelectionPolicy[]
    readonly target?: RouterTarget
    readonly validationFolds?: number
    readonly minimumValidationGain?: number
  },
) {
  const target = options.target ?? "event-f1"
  const requestedValidationFolds = Math.max(0, Math.floor(options.validationFolds ?? 0))
  const minimumValidationGain = options.minimumValidationGain ?? 0
  return {
    version: 1,
    kind: "context-ledger-feature-router",
    target,
    policies: [...options.policies],
    rules: options.budgets.map((budget) => {
      const examples = cases.map((item) => featureExample(item, budget, options.policies))
      const bestFixedPolicy = bestPolicyForExamples(examples, options.policies, target)
      const bestFixedResults = examples.map((example) => example.results.get(bestFixedPolicy)).filter(isResult)
      const bestFixedTargetScore = mean(bestFixedResults.map((result) => scoreResult(result, target)))
      const validation =
        requestedValidationFolds > 1
          ? analyzeFeatureRouter(cases, {
              budgets: [budget],
              policies: options.policies,
              folds: requestedValidationFolds,
              target,
            })[0]
          : undefined
      const validationDelta = validation ? validation.routerTargetScore - validation.bestFixedTargetScore : undefined
      const learnedRule = trainFeatureRule(examples, options.policies, target)
      const promoted = validationDelta === undefined || validationDelta >= minimumValidationGain
      const rule = promoted ? learnedRule : constantFeatureRule(bestFixedPolicy, target, bestFixedTargetScore)
      return {
        budget,
        trainCases: examples.length,
        bestFixedPolicy,
        bestFixedTargetScore,
        promoted,
        validationFolds: validation?.folds,
        validationTargetScore: validation?.routerTargetScore,
        validationBestFixedTargetScore: validation?.bestFixedTargetScore,
        validationDeltaVsBestFixed: validationDelta,
        minimumValidationGain: validationDelta === undefined ? undefined : minimumValidationGain,
        rule,
      }
    }),
  } satisfies FeatureRouterRuleArtifact
}

export function decodeFeatureRouterRules(input: unknown) {
  return decodeFeatureRouterRuleArtifact(input)
}

export function evaluateFeatureRouterRules(cases: readonly Case[], input: unknown) {
  const artifact = decodeFeatureRouterRuleArtifact(input)
  return artifact.rules.map((item) => {
    const examples = cases.map((testCase) => featureExample(testCase, item.budget, artifact.policies))
    const routed = examples.map((example) => routedResult(example, item.rule))
    return {
      target: artifact.target,
      budget: item.budget,
      cases: examples.length,
      trainCases: item.trainCases,
      ...featureRouterScores({ target: artifact.target, examples, policies: artifact.policies, routed }),
      trainingBestFixedPolicy: item.bestFixedPolicy,
      trainingBestFixedTargetScore: item.bestFixedTargetScore,
      promoted: item.promoted ?? true,
      trainingValidationFolds: item.validationFolds,
      trainingValidationDeltaVsBestFixed: item.validationDeltaVsBestFixed,
      rule: item.rule,
    } satisfies FeatureRouterRuleEvaluation
  })
}

export function analyzeFeatureRouterPromotion(
  splits: readonly FeatureRouterPromotionSplit[],
  options: {
    readonly budgets: readonly number[]
    readonly policies: readonly SessionContextLedger.SelectionPolicy[]
    readonly target?: RouterTarget
    readonly validationFolds?: number
    readonly minimumValidationGain?: number
    readonly minimumHeldoutGain?: number
  },
) {
  const target = options.target ?? "event-f1"
  const minimumValidationGain = options.minimumValidationGain ?? 0
  const minimumHeldoutGain = options.minimumHeldoutGain ?? 0
  const uniqueSplitIDs = new Set(splits.map((split) => split.id))
  if (uniqueSplitIDs.size !== splits.length) throw new Error("Promotion split IDs must be unique")
  return {
    target,
    policies: [...options.policies],
    splitCount: splits.length,
    minimumValidationGain,
    minimumHeldoutGain,
    budgets: options.budgets.map((budget) => {
      const trainSplits = splits.map((trainSplit) => {
        const artifact = trainFeatureRouterRules(trainSplit.cases, {
          budgets: [budget],
          policies: options.policies,
          target,
          validationFolds: options.validationFolds,
          minimumValidationGain,
        })
        const trained = artifact.rules[0]
        if (!trained) throw new Error(`Missing trained rule for budget ${budget}`)
        const evalSplits = splits
          .filter((evalSplit) => evalSplit.id !== trainSplit.id)
          .map((evalSplit) => {
            const evaluation = evaluateFeatureRouterRules(evalSplit.cases, artifact)[0]
            if (!evaluation) throw new Error(`Missing evaluation for budget ${budget} on split ${evalSplit.id}`)
            return {
              evalSplit: evalSplit.id,
              cases: evaluation.cases,
              routerTargetScore: evaluation.routerTargetScore,
              bestFixedTargetScore: evaluation.bestFixedTargetScore,
              targetDeltaVsBestFixed: evaluation.targetDeltaVsBestFixed,
              f1DeltaVsBestFixed: evaluation.f1DeltaVsBestFixed,
              passed: evaluation.targetDeltaVsBestFixed >= minimumHeldoutGain,
            }
          })
        const failedEvalSplits = evalSplits.filter((split) => !split.passed).length
        const rulePromoted = trained.promoted ?? true
        const ruleIsLearned = trained.rule.feature !== "constant"
        return {
          trainSplit: trainSplit.id,
          trainCases: trainSplit.cases.length,
          rule: trained.rule,
          ruleIsLearned,
          rulePromoted,
          validationDeltaVsBestFixed: trained.validationDeltaVsBestFixed,
          evalSplits,
          passedEvalSplits: evalSplits.length - failedEvalSplits,
          failedEvalSplits,
          promotable: rulePromoted && ruleIsLearned && evalSplits.length > 0 && failedEvalSplits === 0,
        }
      })
      return {
        budget,
        trainSplits,
        promotable: trainSplits.length > 0 && trainSplits.every((split) => split.promotable),
      }
    }),
  } satisfies FeatureRouterPromotionReport
}

export function analyzePolicyStability(
  splits: readonly FeatureRouterPromotionSplit[],
  options: {
    readonly budgets: readonly number[]
    readonly policies: readonly SessionContextLedger.SelectionPolicy[]
    readonly target?: RouterTarget
  },
) {
  const target = options.target ?? "event-f1"
  const uniqueSplitIDs = new Set(splits.map((split) => split.id))
  if (splits.length === 0) throw new Error("At least one stability split is required")
  if (uniqueSplitIDs.size !== splits.length) throw new Error("Stability split IDs must be unique")
  return {
    target,
    policies: [...options.policies],
    splitCount: splits.length,
    budgets: options.budgets.map((budget) => {
      const splitRows = splits
        .map((split) => {
          const policyRows = options.policies.map((policy) => {
            const results = split.cases.map((item) => evaluateCase({ item, policy, budget }))
            return {
              split: split.id,
              cases: split.cases.length,
              policy,
              targetScore: mean(results.map((result) => scoreResult(result, target))),
              f1: mean(results.map((result) => result.f1)),
              spanF1: mean(results.map((result) => result.spanF1)),
              lineF1: mean(results.map((result) => result.lineF1)),
            }
          })
          const splitBestScore = Math.max(...policyRows.map((row) => row.targetScore))
          return policyRows.map((row) => ({
            ...row,
            deltaVsSplitBest: row.targetScore - splitBestScore,
            splitBest: row.targetScore === splitBestScore,
          }))
        })
        .flat()
      const policyRows = options.policies
        .map((policy) => {
          const rows = splitRows.filter((row) => row.policy === policy)
          const splitScores = rows.map((row) => ({
            split: row.split,
            cases: row.cases,
            targetScore: row.targetScore,
            f1: row.f1,
            spanF1: row.spanF1,
            lineF1: row.lineF1,
            deltaVsSplitBest: row.deltaVsSplitBest,
            splitBest: row.splitBest,
          }))
          return {
            policy,
            meanTargetScore: mean(rows.map((row) => row.targetScore)),
            minTargetScore: Math.min(...rows.map((row) => row.targetScore)),
            maxTargetScore: Math.max(...rows.map((row) => row.targetScore)),
            meanF1: mean(rows.map((row) => row.f1)),
            meanSpanF1: mean(rows.map((row) => row.spanF1)),
            meanLineF1: mean(rows.map((row) => row.lineF1)),
            splitWins: rows.filter((row) => row.splitBest).length,
            worstDeltaVsSplitBest: Math.min(...rows.map((row) => row.deltaVsSplitBest)),
            meanDeltaVsSplitBest: mean(rows.map((row) => row.deltaVsSplitBest)),
            splitScores,
          }
        })
        .toSorted((a, b) => policiesOrder(a.policy) - policiesOrder(b.policy))
      return {
        budget,
        robustPolicy:
          maxBy(policyRows, (row) => row.minTargetScore * 10_000 + row.meanTargetScore)?.policy ?? "recency",
        bestMeanPolicy: maxBy(policyRows, (row) => row.meanTargetScore)?.policy ?? "recency",
        policies: policyRows,
      }
    }),
  } satisfies PolicyStabilityReport
}

export function analyzePolicyTargets(
  results: readonly Result[],
  options?: {
    readonly targets?: readonly RouterTarget[]
  },
) {
  const targets = uniqueTargets(options?.targets ?? ["event-f1", "span-f1", "line-f1", "auc-line", "official-utility"])
  const byBudget = Map.groupBy(results, (result) => result.budget)
  return {
    targets,
    budgets: Array.from(byBudget.entries())
      .map(([budget, items]) => {
        const byCase = Map.groupBy(items, (result) => result.instanceID)
        const policyItems = Map.groupBy(items, (result) => result.policy)
        const policies = Array.from(policyItems.keys()).toSorted((a, b) => policiesOrder(a) - policiesOrder(b))
        const targetRows = targets.map((target) => {
          const scores = policies
            .map((policy) => {
              const policyResults = policyItems.get(policy) ?? []
              return {
                policy,
                score: mean(policyResults.map((result) => scoreResult(result, target))),
              }
            })
            .toSorted((a, b) => policiesOrder(a.policy) - policiesOrder(b.policy))
          const best = maxBy(scores, (item) => item.score) ?? { policy: "recency" as const, score: 0 }
          const oracleScore = mean(
            Array.from(byCase.values()).map((caseResults) =>
              Math.max(...caseResults.map((result) => scoreResult(result, target))),
            ),
          )
          return {
            target,
            bestPolicy: best.policy,
            bestScore: best.score,
            oracleScore,
            policies: scores.map((item) => ({
              policy: item.policy,
              score: item.score,
              regretVsBest: Math.max(0, best.score - item.score),
              regretVsOracle: Math.max(0, oracleScore - item.score),
            })),
          }
        })
        const policyRows = policies.map((policy) => {
          const policyResults = policyItems.get(policy) ?? []
          const targetScores = targetRows.map((target) => {
            const row = target.policies.find((item) => item.policy === policy)
            if (!row) throw new Error(`Missing target score for ${policy} at budget ${budget}`)
            return {
              target: target.target,
              score: row.score,
              regretVsBest: row.regretVsBest,
              regretVsOracle: row.regretVsOracle,
            }
          })
          return {
            policy,
            meanEventF1: mean(policyResults.map((result) => result.f1)),
            meanFileF1: mean(policyResults.map((result) => result.fileF1)),
            meanSpanF1: mean(policyResults.map((result) => result.spanF1)),
            meanLineF1: mean(policyResults.map((result) => result.lineF1)),
            meanOfficialUtility: mean(policyResults.map((result) => scoreResult(result, "official-utility"))),
            worstTargetRegret: Math.max(...targetScores.map((score) => score.regretVsBest)),
            meanTargetRegret: mean(targetScores.map((score) => score.regretVsBest)),
            worstOracleRegret: Math.max(...targetScores.map((score) => score.regretVsOracle)),
            meanOracleRegret: mean(targetScores.map((score) => score.regretVsOracle)),
            targetWins: targetScores.filter((score) => score.regretVsBest <= 1e-12).length,
            paretoOptimal: false,
            targetScores,
          }
        })
        return {
          budget,
          cases: byCase.size,
          targets: targetRows,
          policies: policyRows.map((policy) => ({
            ...policy,
            paretoOptimal: !policyRows.some(
              (other) => other.policy !== policy.policy && dominatesTargets(other, policy, targets),
            ),
          })),
        }
      })
      .toSorted((a, b) => a.budget - b.budget),
  } satisfies PolicyTargetComparisonReport
}

export function analyzePolicyPortfolio(
  results: readonly Result[],
  options?: {
    readonly objective?: PolicyPortfolioObjective
    readonly target?: RouterTarget
    readonly targets?: readonly RouterTarget[]
  },
) {
  const objective = options?.objective ?? "minimax-regret"
  const target = options?.target ?? "official-utility"
  const report = analyzePolicyTargets(results, {
    targets: objective === "target-score" ? uniqueTargets([target]) : options?.targets,
  })
  const budgetRows = report.budgets.map((budget) => {
    const selected = selectPortfolioPolicy(budget.policies, objective, target)
    return {
      budget: budget.budget,
      cases: budget.cases,
      selectedPolicy: selected.policy,
      targetWinners: budget.targets.map((item) => ({
        target: item.target,
        policy: item.bestPolicy,
        score: item.bestScore,
      })),
      selectedScores: selected.targetScores,
      selectedMeanEventF1: selected.meanEventF1,
      selectedMeanFileF1: selected.meanFileF1,
      selectedMeanSpanF1: selected.meanSpanF1,
      selectedMeanLineF1: selected.meanLineF1,
      selectedMeanOfficialUtility: selected.meanOfficialUtility,
      selectedWorstTargetRegret: selected.worstTargetRegret,
      selectedMeanTargetRegret: selected.meanTargetRegret,
      selectedWorstOracleRegret: selected.worstOracleRegret,
      selectedMeanOracleRegret: selected.meanOracleRegret,
    }
  })
  const fixedPolicies = Array.from(
    new Set(report.budgets.flatMap((budget) => budget.policies.map((policy) => policy.policy))),
  ).toSorted((a, b) => policiesOrder(a) - policiesOrder(b))
  return {
    objective,
    target: objective === "target-score" ? target : undefined,
    targets: report.targets,
    budgets: budgetRows,
    portfolio: portfolioAggregate(
      budgetRows.map((row) => ({
        policy: row.selectedPolicy,
        meanEventF1: row.selectedMeanEventF1,
        meanFileF1: row.selectedMeanFileF1,
        meanSpanF1: row.selectedMeanSpanF1,
        meanLineF1: row.selectedMeanLineF1,
        meanOfficialUtility: row.selectedMeanOfficialUtility,
        worstTargetRegret: row.selectedWorstTargetRegret,
        meanTargetRegret: row.selectedMeanTargetRegret,
        worstOracleRegret: row.selectedWorstOracleRegret,
        meanOracleRegret: row.selectedMeanOracleRegret,
      })),
    ),
    fixedPolicies: fixedPolicies.map((policy) => {
      const rows = report.budgets.flatMap((budget) => budget.policies.find((item) => item.policy === policy) ?? [])
      return {
        policy,
        selectedBudgetCount: budgetRows.filter((row) => row.selectedPolicy === policy).length,
        ...scoreAggregate(rows),
      }
    }),
  } satisfies PolicyPortfolioReport
}

export function analyzePolicyPortfolioStability(
  splits: readonly FeatureRouterPromotionSplit[],
  options: {
    readonly budgets: readonly number[]
    readonly policies: readonly SessionContextLedger.SelectionPolicy[]
    readonly objective?: PolicyPortfolioObjective
    readonly target?: RouterTarget
    readonly targets?: readonly RouterTarget[]
    readonly maximumHeldoutLoss?: number
  },
) {
  const objective = options.objective ?? "minimax-regret"
  const target = options.target ?? "official-utility"
  const targets =
    objective === "target-score"
      ? uniqueTargets([target])
      : uniqueTargets(options.targets ?? ["event-f1", "span-f1", "line-f1", "auc-line", "official-utility"])
  const maximumHeldoutLoss = options.maximumHeldoutLoss ?? 0
  const uniqueSplitIDs = new Set(splits.map((split) => split.id))
  if (splits.length === 0) throw new Error("At least one portfolio stability split is required")
  if (uniqueSplitIDs.size !== splits.length) throw new Error("Portfolio stability split IDs must be unique")
  return {
    objective,
    target: objective === "target-score" ? target : undefined,
    targets,
    policies: [...options.policies],
    splitCount: splits.length,
    maximumHeldoutLoss,
    budgets: options.budgets.map((budget) => {
      const splitSelections = splits.map((split) => ({
        id: split.id,
        cases: split.cases.length,
        ...portfolioBudgetSelection({
          cases: split.cases,
          budget,
          policies: options.policies,
          objective,
          target,
          targets,
        }),
      }))
      const fixedPolicies = options.policies
        .map((policy) => {
          const splitScores = splitSelections.map((split) => {
            const row = split.policyRows.find((item) => item.policy === policy)
            if (!row) throw new Error(`Missing policy ${policy} for split ${split.id}`)
            const objectiveScore = portfolioObjectiveScore(row, objective, target)
            const splitBestObjectiveScore = portfolioObjectiveScore(split.selected, objective, target)
            const objectiveDeltaVsSplitBest = objectiveScore - splitBestObjectiveScore
            const heldoutLoss = Math.max(0, splitBestObjectiveScore - objectiveScore)
            return {
              split: split.id,
              cases: split.cases,
              objectiveScore,
              splitBestObjectiveScore,
              objectiveDeltaVsSplitBest,
              heldoutLoss,
              splitBest: heldoutLoss <= 1e-12,
            }
          })
          const rows = splitSelections.map((split) => {
            const row = split.policyRows.find((item) => item.policy === policy)
            if (!row) throw new Error(`Missing policy ${policy} for split ${split.id}`)
            return row
          })
          return {
            policy,
            meanObjectiveScore: mean(splitScores.map((score) => score.objectiveScore)),
            minObjectiveScore: Math.min(...splitScores.map((score) => score.objectiveScore)),
            maxObjectiveScore: Math.max(...splitScores.map((score) => score.objectiveScore)),
            meanEventF1: mean(rows.map((row) => row.meanEventF1)),
            meanOfficialUtility: mean(rows.map((row) => row.meanOfficialUtility)),
            splitWins: splitScores.filter((score) => score.splitBest).length,
            maxHeldoutLoss: Math.max(...splitScores.map((score) => score.heldoutLoss)),
            meanHeldoutLoss: mean(splitScores.map((score) => score.heldoutLoss)),
            splitScores,
          }
        })
        .toSorted((a, b) => policiesOrder(a.policy) - policiesOrder(b.policy))
      const robustPolicy =
        maxBy(
          fixedPolicies,
          (policy) => -policy.maxHeldoutLoss * 1_000_000 - policy.meanHeldoutLoss * 1_000 + policy.meanObjectiveScore,
        )?.policy ?? "recency"
      const bestMeanPolicy = maxBy(fixedPolicies, (policy) => policy.meanObjectiveScore)?.policy ?? "recency"
      const trainSplits = splitSelections.map((trained) => {
        const evalSplits = splitSelections
          .filter((evaluated) => evaluated.id !== trained.id)
          .map((evaluated) => {
            const selected = evaluated.policyRows.find((row) => row.policy === trained.selected.policy)
            if (!selected)
              throw new Error(`Missing selected policy ${trained.selected.policy} for split ${evaluated.id}`)
            const selectedObjectiveScore = portfolioObjectiveScore(selected, objective, target)
            const evalBestObjectiveScore = portfolioObjectiveScore(evaluated.selected, objective, target)
            const objectiveDeltaVsEvalBest = selectedObjectiveScore - evalBestObjectiveScore
            const heldoutLoss = Math.max(0, evalBestObjectiveScore - selectedObjectiveScore)
            return {
              evalSplit: evaluated.id,
              cases: evaluated.cases,
              evalBestPolicy: evaluated.selected.policy,
              selectedObjectiveScore,
              evalBestObjectiveScore,
              objectiveDeltaVsEvalBest,
              heldoutLoss,
              selectedMeanEventF1: selected.meanEventF1,
              selectedMeanOfficialUtility: selected.meanOfficialUtility,
              selectedWorstTargetRegret: selected.worstTargetRegret,
              selectedMeanTargetRegret: selected.meanTargetRegret,
              passed: heldoutLoss <= maximumHeldoutLoss + 1e-12,
            }
          })
        const failedEvalSplits = evalSplits.filter((split) => !split.passed).length
        return {
          trainSplit: trained.id,
          trainCases: trained.cases,
          selectedPolicy: trained.selected.policy,
          selectedObjectiveScore: portfolioObjectiveScore(trained.selected, objective, target),
          selectedWorstTargetRegret: trained.selected.worstTargetRegret,
          selectedMeanTargetRegret: trained.selected.meanTargetRegret,
          evalSplits,
          passedEvalSplits: evalSplits.length - failedEvalSplits,
          failedEvalSplits,
          stable: evalSplits.length > 0 && failedEvalSplits === 0,
        }
      })
      return {
        budget,
        robustPolicy,
        bestMeanPolicy,
        fixedPolicies,
        trainSplits,
        stable: trainSplits.length > 0 && trainSplits.every((split) => split.stable),
      }
    }),
  } satisfies PolicyPortfolioStabilityReport
}

export function toPrediction(input: {
  readonly instanceID: string
  readonly selection: SessionContextLedger.Selection
}) {
  const steps = input.selection.events.map((event) => ({
    files: eventFiles(event),
    spans: spansByFile(event.spans ?? []),
    symbols: {},
  }))
  return {
    instance_id: input.instanceID,
    traj_data: {
      pred_steps: steps,
      pred_files: unique(input.selection.events.flatMap((event) => eventFiles(event))),
      pred_spans: spansByFile(input.selection.events.flatMap((event) => event.spans ?? [])),
    },
    model_patch: "",
  } satisfies Prediction
}

export function toPredictionFromSessionMessages(input: { readonly messages: unknown; readonly instanceID?: string }) {
  const messages = sessionMessages(input.messages)
  const events = SessionContextLedger.fromEntries(messages.map((message, index) => ({ seq: index + 1, message })))
  const steps = events.flatMap((event) => {
    const files = eventFiles(event)
    if (files.length === 0) return []
    return [step(files, event.spans ?? [])]
  })
  return {
    instance_id: input.instanceID ?? "opencode-v2-session",
    traj_data: {
      pred_steps: steps,
      pred_files: unique(steps.flatMap((item) => item.files)),
      pred_spans: mergeStepSpans(steps),
    },
    model_patch: "",
  } satisfies Prediction
}

function sessionMessages(input: unknown) {
  try {
    return decodeSessionMessages(input)
  } catch (error) {
    if (Array.isArray(input) && input.every(isSessionMessageLike)) return input as readonly SessionMessage.Message[]
    throw error
  }
}

function isSessionMessageLike(input: unknown) {
  return isRecord(input) && typeof input.id === "string" && typeof input.type === "string"
}

export function toPredictionFromOpenCodeExport(input: unknown, options?: { readonly instanceID?: string }) {
  const data = decodeOpenCodeExport(input)
  const steps = data.messages.flatMap((message) => message.parts.flatMap(partStep))
  return {
    instance_id: options?.instanceID ?? stringField(data.info, "id") ?? "opencode-export",
    traj_data: {
      pred_steps: steps,
      pred_files: unique(steps.flatMap((step) => step.files)),
      pred_spans: mergeStepSpans(steps),
    },
    model_patch: "",
  } satisfies Prediction
}

function event(input: {
  readonly id: string
  readonly kind: SessionContextLedger.EventKind
  readonly order: number
  readonly summary: string
  readonly recoverability: SessionContextLedger.Recoverability
  readonly mustPreserve: boolean
  readonly files: readonly string[]
  readonly spans?: readonly SessionContextLedger.Span[]
  readonly tokens?: number
}) {
  return {
    ...input,
    source: input.id,
    tokens: input.tokens ?? Token.estimate(input.summary),
    dependencies: [],
  } satisfies SessionContextLedger.Event
}

function experienceReplayEvent(instanceID: string, experience: ExperienceRecord, index: number, score: number) {
  const spans = experience.spans ?? []
  const files = unique([...experience.files, ...spans.map((span) => span.file)])
  return event({
    id: `${instanceID}:experience:${index}:${experienceIDFragment(experience.id)}`,
    kind: "experience",
    order: 50 + index,
    summary: [
      `[Prior experience]: ${experience.id}`,
      experience.query ? `Query: ${experience.query}` : "",
      experience.repo ? `Repo: ${experience.repo}` : "",
      experience.task_type ? `Task type: ${experience.task_type}` : "",
      files.length ? `Files: ${files.join(", ")}` : "",
      `Similarity score: ${score.toFixed(3)}`,
      experience.summary,
    ]
      .filter(Boolean)
      .join("\n"),
    recoverability: "medium",
    mustPreserve: false,
    files,
    spans,
  })
}

function experienceIDFragment(id: string) {
  return id.replace(/[^A-Za-z0-9_.-]+/g, "_").slice(0, 80) || "record"
}

function experienceReplayScore(item: Case, experience: ExperienceRecord) {
  const itemTerms = textTerms([item.query, item.repo, item.task_type, item.benchmark].filter(Boolean).join("\n"))
  const experienceTerms = textTerms(
    [
      experience.query,
      experience.summary,
      experience.repo,
      experience.task_type,
      experience.benchmark,
      experience.files.join("\n"),
    ]
      .filter(Boolean)
      .join("\n"),
  )
  const overlap = Array.from(itemTerms).filter((term) => experienceTerms.has(term)).length
  const normalizedOverlap = itemTerms.size === 0 ? 0 : overlap / itemTerms.size
  return (
    (item.repo && experience.repo === item.repo ? 8 : 0) +
    (item.task_type && experience.task_type === item.task_type ? 3 : 0) +
    (item.benchmark && experience.benchmark === item.benchmark ? 1 : 0) +
    overlap * 0.75 +
    normalizedOverlap * 6
  )
}

function spanEvent(instanceID: string, index: number, span: ContextBenchSpan) {
  return event({
    id: `${instanceID}:gold:${index}`,
    kind: "code-context",
    order: 100 + index,
    summary: `${span.file}:${span.start_line}-${span.end_line}\n${span.content}`,
    recoverability: "medium",
    mustPreserve: false,
    files: [span.file],
    spans: [{ file: span.file, start: span.start_line, end: span.end_line }],
  })
}

function testEvent(instanceID: string, group: "f2p" | "p2p", index: number, test: string) {
  return event({
    id: `${instanceID}:${group}:${index}`,
    kind: group === "f2p" ? "test-evidence" : "shell",
    order: (group === "f2p" ? 10_000 : 20_000) + index,
    summary: test,
    recoverability: "high",
    mustPreserve: false,
    files: testFiles(test),
  })
}

function testCodeContextEvent(instanceID: string, index: number, file: string) {
  return event({
    id: `${instanceID}:test-code-context:${index}`,
    kind: "code-context",
    order: 5_000 + index,
    summary: `${file}:1-20\nContextBench hard negative from a related test file.`,
    recoverability: "medium",
    mustPreserve: false,
    files: [file],
    spans: [{ file, start: 1, end: 20 }],
  })
}

function testFiles(test: string) {
  const file = test.split("::")[0]?.trim()
  if (!file || !isFileLikeTestReference(file)) return []
  return [file]
}

function isFileLikeTestReference(value: string) {
  if (/\s/.test(value)) return false
  return /[\\/]/.test(value) || /\.[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)
}

function parseStringArray(input: string) {
  if (!input.trim()) return []
  const strict = decodeJsonOption(input).pipe(Option.flatMap(decodeStringArrayOption))
  if (Option.isSome(strict)) return strict.value
  return Array.from(input.matchAll(/['"]([^'"]+)['"]/g), (match) => match[1]).filter(Boolean)
}

function unique<T>(values: readonly T[]) {
  return values.filter((value, index) => values.indexOf(value) === index)
}

function eventFiles(event: SessionContextLedger.Event) {
  return unique([...event.files, ...(event.spans ?? []).map((span) => span.file)])
}

function spansByFile(spans: readonly SessionContextLedger.Span[]) {
  return Object.fromEntries(
    Array.from(Map.groupBy(spans, (span) => span.file).entries()).map(([file, items]) => [
      file,
      items.map((span) => ({ type: "line" as const, start: span.start, end: span.end })),
    ]),
  )
}

function predictionSpans(prediction: Prediction) {
  return uniqueSpans(
    Object.entries(prediction.traj_data.pred_spans).flatMap(([file, spans]) =>
      spans.map((span) => ({ file, start: span.start, end: span.end })),
    ),
  )
}

function predictionTrajectoryEvents(prediction: Prediction) {
  return prediction.traj_data.pred_steps.map((stepItem, index) => {
    const spans = stepSpans(stepItem)
    return {
      id: `${prediction.instance_id}:prediction-step:${index}`,
      kind: "code-context",
      source: `prediction-step:${index}`,
      order: index,
      summary: stepItem.files.join("\n"),
      tokens: 0,
      recoverability: "medium",
      mustPreserve: false,
      files: unique([...stepItem.files, ...spans.map((span) => span.file)]),
      spans,
      dependencies: [],
    } satisfies SessionContextLedger.Event
  })
}

function stepSpans(stepItem: Step) {
  return Object.entries(stepItem.spans ?? {}).flatMap(([file, spans]) =>
    spans.map((span) => ({ file, start: span.start, end: span.end })),
  )
}

function fileEvaluationMetric(goldFiles: readonly string[], predictedFiles: readonly string[]) {
  const gold = new Set(goldFiles)
  const predicted = new Set(predictedFiles)
  const intersection = goldFiles.filter((file) => predicted.has(file)).length
  const recall = gold.size === 0 ? 1 : intersection / gold.size
  const precision = predicted.size === 0 ? 1 : intersection / predicted.size
  return {
    recall,
    precision,
    f1: f1(recall, precision),
  } satisfies PredictionEvaluationMetric
}

function overlapMetrics(input: {
  readonly gold: readonly SessionContextLedger.Span[]
  readonly selected: readonly SessionContextLedger.Span[]
}) {
  const goldSpans = uniqueSpans(input.gold)
  const selectedSpans = uniqueSpans(input.selected)
  const mergedGoldSpans = mergeSpans(goldSpans)
  const mergedSelectedSpans = mergeSpans(selectedSpans)
  const goldSpanHits = goldSpans.filter((span) => selectedSpans.some((selected) => overlaps(span, selected))).length
  const selectedSpanHits = selectedSpans.filter((span) => goldSpans.some((gold) => overlaps(span, gold))).length
  const goldLines = lineCount(mergedGoldSpans)
  const selectedLines = lineCount(mergedSelectedSpans)
  const overlapLines = lineOverlap(mergedGoldSpans, mergedSelectedSpans)
  const spanRecall = goldSpans.length === 0 ? 1 : goldSpanHits / goldSpans.length
  const spanPrecision = selectedSpans.length === 0 ? 1 : selectedSpanHits / selectedSpans.length
  const lineRecall = goldLines === 0 ? 1 : overlapLines / goldLines
  const linePrecision = selectedLines === 0 ? 1 : overlapLines / selectedLines
  return {
    spanRecall,
    spanPrecision,
    spanF1: f1(spanRecall, spanPrecision),
    lineRecall,
    linePrecision,
    lineF1: f1(lineRecall, linePrecision),
  }
}

function uniqueSpans(spans: readonly SessionContextLedger.Span[]) {
  return spans.filter((span, index, values) => values.findIndex((item) => spanKey(item) === spanKey(span)) === index)
}

function spanKey(span: SessionContextLedger.Span) {
  return `${span.file}\0${span.start}\0${span.end}`
}

function mergeSpans(spans: readonly SessionContextLedger.Span[]) {
  return Array.from(Map.groupBy(spans, (span) => span.file).entries()).flatMap(([file, items]) =>
    items
      .map(normalizeSpan)
      .toSorted((a, b) => a.start - b.start || a.end - b.end)
      .reduce<SessionContextLedger.Span[]>((merged, span) => {
        const last = merged.at(-1)
        if (!last || span.start > last.end + 1) return [...merged, { ...span, file }]
        return [...merged.slice(0, -1), { ...last, end: Math.max(last.end, span.end) }]
      }, []),
  )
}

function normalizeSpan(span: SessionContextLedger.Span) {
  return {
    ...span,
    start: Math.min(span.start, span.end),
    end: Math.max(span.start, span.end),
  }
}

function overlaps(left: SessionContextLedger.Span, right: SessionContextLedger.Span) {
  if (left.file !== right.file) return false
  const a = normalizeSpan(left)
  const b = normalizeSpan(right)
  return a.start <= b.end && b.start <= a.end
}

function lineCount(spans: readonly SessionContextLedger.Span[]) {
  return spans.reduce((total, span) => total + Math.max(0, span.end - span.start + 1), 0)
}

function lineOverlap(gold: readonly SessionContextLedger.Span[], selected: readonly SessionContextLedger.Span[]) {
  return gold.reduce(
    (total, goldSpan) =>
      total +
      selected
        .filter((selectedSpan) => selectedSpan.file === goldSpan.file)
        .reduce(
          (subtotal, selectedSpan) =>
            subtotal +
            Math.max(0, Math.min(goldSpan.end, selectedSpan.end) - Math.max(goldSpan.start, selectedSpan.start) + 1),
          0,
        ),
    0,
  )
}

function partStep(part: Record<string, unknown>) {
  if (part.type === "file") return filePartStep(part)
  if (part.type === "patch") return patchPartStep(part)
  if (part.type === "tool") return toolPartSteps(part)
  return []
}

function filePartStep(part: Record<string, unknown>) {
  const source = recordField(part, "source")
  const file = source ? stringField(source, "path") : stringField(part, "filename")
  if (!file) return []
  return [step([file], spanFromSource(file, source))]
}

function patchPartStep(part: Record<string, unknown>) {
  const files = stringArrayField(part, "files")
  return files.length ? [step(files, [])] : []
}

function toolPartSteps(part: Record<string, unknown>) {
  const state = recordField(part, "state")
  if (!state) return []
  const input = recordField(state, "input")
  const inputFiles = input ? inputPathFiles(input) : []
  const outputSteps = outputEvidenceSteps(state)
  const outputFiles = new Set(outputSteps.flatMap((item) => item.files))
  const remainingInputFiles = inputFiles.filter((file) => !outputFiles.has(file))
  const attachmentSteps = recordsField(state, "attachments").flatMap(filePartStep)
  return [...outputSteps, ...(remainingInputFiles.length ? [step(remainingInputFiles, [])] : []), ...attachmentSteps]
}

function inputPathFiles(input: Record<string, unknown>) {
  return unique(
    ["filePath", "filepath", "path", "file"].flatMap((key) => {
      const value = stringField(input, key)
      return value ? [value] : []
    }),
  )
}

function outputEvidenceSteps(state: Record<string, unknown>) {
  const metadata = recordField(state, "metadata")
  const display = metadata ? recordField(metadata, "display") : undefined
  const displayStep = display ? displayEvidenceStep(display) : []
  if (displayStep.length) return displayStep
  const output = stringField(state, "output")
  return output ? readOutputStep(output) : []
}

function displayEvidenceStep(display: Record<string, unknown>) {
  const file = stringField(display, "path")
  if (!file) return []
  const start = numberField(display, "lineStart")
  const end = numberField(display, "lineEnd")
  return [step([file], start === undefined || end === undefined ? [] : [{ file, start, end }])]
}

function readOutputStep(output: string) {
  const file = output.match(/<path>([^<]+)<\/path>/)?.[1]?.trim()
  if (!file || !output.includes("<type>file</type>")) return []
  const content = output.match(/<content>\n([\s\S]*?)\n<\/content>/)?.[1] ?? ""
  const lines = Array.from(content.matchAll(/^(\d+): /gm), (match) => Number(match[1])).filter(Number.isFinite)
  if (lines.length === 0) return [step([file], [])]
  return [step([file], [{ file, start: Math.min(...lines), end: Math.max(...lines) }])]
}

function step(files: readonly string[], spans: readonly SessionContextLedger.Span[]) {
  return {
    files: unique(files),
    spans: spansByFile(spans),
    symbols: {},
  } satisfies Step
}

function mergeStepSpans(steps: readonly Step[]) {
  const entries = steps.flatMap((item) =>
    Object.entries(item.spans ?? {}).flatMap(([file, spans]) => spans.map((span) => ({ file, ...span }))),
  )
  return Object.fromEntries(
    Array.from(Map.groupBy(entries, (entry) => entry.file).entries()).map(([file, spans]) => [
      file,
      spans.map((span) => ({ type: span.type, start: span.start, end: span.end })),
    ]),
  )
}

function spanFromSource(file: string, source: Record<string, unknown> | undefined) {
  const text = source ? recordField(source, "text") : undefined
  const start = text ? numberField(text, "start") : undefined
  const end = text ? numberField(text, "end") : undefined
  if (start === undefined || end === undefined) return []
  return [{ file, start, end }]
}

function recordField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return isRecord(value) ? value : undefined
}

function recordsField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function stringArrayField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function stringField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return typeof value === "string" ? value : undefined
}

function requiredStringField(input: Record<string, unknown>, key: string, location: string) {
  const value = stringField(input, key)
  if (value === undefined) throw new Error(`Missing ${location}.${key}`)
  return value
}

function numberField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return typeof value === "number" ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function parseJsonLines(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown)
}

function sweContextBenchTaskRowFromUnknown(input: unknown, location: string): SWEContextBenchTaskRow {
  if (!isRecord(input)) throw new Error(`Invalid SWE-ContextBench task row at ${location}`)
  return {
    repo: requiredStringField(input, "repo", location),
    instance_id: requiredStringField(input, "instance_id", location),
    base_commit: stringField(input, "base_commit"),
    patch: stringField(input, "patch"),
    test_patch: stringField(input, "test_patch"),
    problem_statement: stringField(input, "problem_statement"),
    hints_text: stringField(input, "hints_text"),
    FAIL_TO_PASS: stringField(input, "FAIL_TO_PASS"),
    PASS_TO_PASS: stringField(input, "PASS_TO_PASS"),
  }
}

function sweContextBenchRelationshipRowFromUnknown(input: unknown, location: string): SWEContextBenchRelationshipRow {
  if (!isRecord(input)) throw new Error(`Invalid SWE-ContextBench relationship row at ${location}`)
  return {
    related_instance_id: requiredStringField(input, "related_instance_id", location),
    experience_instance_id: requiredStringField(input, "experience_instance_id", location),
    related_pr_url: stringField(input, "related_pr_url"),
    related_issue_url: stringField(input, "related_issue_url"),
    experience_pr_url: stringField(input, "experience_pr_url"),
    experience_issue_url: stringField(input, "experience_issue_url"),
  }
}

function sweContextBenchAllowedExperienceIDs(
  relationships: readonly SWEContextBenchRelationshipRow[],
  relatedInstanceIDs: readonly string[],
) {
  if (relationships.length === 0 || relatedInstanceIDs.length === 0) return new Set<string>()
  const related = new Set(relatedInstanceIDs)
  return new Set(
    relationships.filter((item) => related.has(item.related_instance_id)).map((item) => item.experience_instance_id),
  )
}

function sweContextBenchExperienceRecord(row: SWEContextBenchTaskRow): ExperienceRecord {
  const files = unique([
    ...filesFromUnifiedDiff(row.patch ?? ""),
    ...filesFromUnifiedDiff(row.test_patch ?? ""),
    ...testsFromSWEContextBenchList(row.FAIL_TO_PASS ?? "").flatMap(testFiles),
  ])
  return {
    id: row.instance_id,
    repo: row.repo,
    benchmark: "swe-contextbench",
    task_type: "experience",
    query: row.problem_statement,
    summary:
      [
        row.problem_statement ? `Problem:\n${row.problem_statement}` : "",
        row.hints_text ? `Hints:\n${row.hints_text}` : "",
        files.length ? `Touched files: ${files.join(", ")}` : "",
        row.FAIL_TO_PASS ? `Fail-to-pass tests: ${testsFromSWEContextBenchList(row.FAIL_TO_PASS).join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n") || row.instance_id,
    files,
  }
}

function filesFromUnifiedDiff(diff: string) {
  const files: string[] = []
  for (const line of diff.split(/\r?\n/)) {
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line)
    if (!match) continue
    const [, left, right] = match
    const file = right && right !== "/dev/null" ? right : left
    if (file && file !== "/dev/null") files.push(file)
  }
  return unique(files)
}

function testsFromSWEContextBenchList(input: string) {
  if (!input.trim()) return []
  try {
    const parsed = JSON.parse(input)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return Array.from(input.matchAll(/['"]([^'"]+)['"]/g), (match) => match[1]).filter(Boolean)
  }
}

type FeatureExample = {
  readonly instanceID: string
  readonly features: ReadonlyMap<string, number>
  readonly results: ReadonlyMap<SessionContextLedger.SelectionPolicy, Result>
}

function featureExample(
  item: Case,
  budget: number,
  policies: readonly SessionContextLedger.SelectionPolicy[],
): FeatureExample {
  return {
    instanceID: item.instance_id,
    features: featureValues(item, budget, policies),
    results: new Map(
      policies.map((policy) => [
        policy,
        evaluateCase({
          item,
          policy,
          budget,
        }),
      ]),
    ),
  }
}

function featureValues(item: Case, budget: number, policies: readonly SessionContextLedger.SelectionPolicy[]) {
  const codeEvents = item.events.filter((event) => event.kind === "code-context" || event.kind === "diff")
  const evidenceEvents = item.events.filter((event) => event.kind === "test-evidence" || event.kind === "shell")
  const codeFiles = unique(codeEvents.flatMap(eventFiles))
  const fileGroups = Map.groupBy(codeEvents.flatMap(eventFiles), (file) => file)
  const maxFileCluster = Math.max(0, ...Array.from(fileGroups.values(), (files) => files.length))
  const pathBuckets = codeFiles.map(pathBucket)
  const spans = codeEvents.flatMap((event) => event.spans ?? [])
  const queryTerms = textTerms(item.query ?? "")
  const codeTerms = textTerms(codeEvents.map((event) => `${event.summary}\n${event.files.join("\n")}`).join("\n"))
  const queryOverlap = Array.from(queryTerms).filter((term) => codeTerms.has(term)).length
  const spanLineCount = spans.reduce((total, span) => total + Math.max(0, span.end - span.start + 1), 0)
  return new Map([
    ...Object.entries({
      eventCount: item.events.length,
      codeEventCount: codeEvents.length,
      evidenceEventCount: evidenceEvents.length,
      codeToEvidenceRatio: codeEvents.length / Math.max(1, evidenceEvents.length),
      codeFileCount: codeFiles.length,
      maxFileClusterShare: codeEvents.length === 0 ? 0 : maxFileCluster / codeEvents.length,
      implementationPathShare: share(pathBuckets, "implementation"),
      testPathShare: share(pathBuckets, "test"),
      noisyPathShare:
        pathBuckets.length === 0
          ? 0
          : pathBuckets.filter(
              (bucket) => bucket === "test" || bucket === "docs" || bucket === "generated" || bucket === "fixture",
            ).length / pathBuckets.length,
      spanCount: spans.length,
      spanLineCount,
      averageSpanLines: spans.length === 0 ? 0 : spanLineCount / spans.length,
      averageCodeTokens: mean(codeEvents.map((event) => event.tokens)),
      queryTermCount: queryTerms.size,
      queryCodeTermOverlap: queryTerms.size === 0 ? 0 : queryOverlap / queryTerms.size,
    }),
    ...selectionFeatureEntries(item, budget, policies),
  ])
}

function selectionFeatureEntries(
  item: Case,
  budget: number,
  policies: readonly SessionContextLedger.SelectionPolicy[],
) {
  const metricsByPolicy = new Map(
    policies.map((policy) => {
      const selection = SessionContextLedger.select({
        events: item.events,
        policy,
        budget,
        query: item.query,
      })
      return [policy, selectionMetrics(selection, budget)] as const
    }),
  )
  const metrics = [
    "tokens",
    "fill",
    "selectedCount",
    "fileCount",
    "codeEventShare",
    "evidenceEventShare",
    "spanCount",
    "spanLineCount",
    "averageSpanLines",
    "implementationPathShare",
    "testPathShare",
    "noisyPathShare",
    "maxFileClusterShare",
  ] as const
  const policyEntries = Array.from(metricsByPolicy.entries()).flatMap(([policy, values]) =>
    Object.entries(values).map(([metric, value]) => [`selection:${policy}:${metric}`, value] as const),
  )
  const deltaPolicies = policies.filter(
    (policy) =>
      policy === "relevance-frontier" ||
      policy === "coherence-frontier" ||
      policy === "file-frontier" ||
      policy === "adaptive-frontier" ||
      policy === "fusion-frontier" ||
      policy === "portfolio-frontier" ||
      policy === "robust-frontier" ||
      policy === "utility-frontier" ||
      policy === "target-balanced-frontier" ||
      policy === "official-frontier" ||
      policy === "action-aware-frontier" ||
      policy === "intent-frontier",
  )
  const deltaEntries = deltaPolicies.flatMap((left, leftIndex) =>
    deltaPolicies.slice(leftIndex + 1).flatMap((right) => {
      const leftMetrics = metricsByPolicy.get(left)
      const rightMetrics = metricsByPolicy.get(right)
      if (!leftMetrics || !rightMetrics) return []
      return metrics.map(
        (metric) => [`delta:${left}-${right}:${metric}`, leftMetrics[metric] - rightMetrics[metric]] as const,
      )
    }),
  )
  return [...policyEntries, ...deltaEntries]
}

function selectionMetrics(selection: SessionContextLedger.Selection, budget: number) {
  const codeEvents = selection.events.filter((event) => event.kind === "code-context" || event.kind === "diff")
  const evidenceEvents = selection.events.filter((event) => event.kind === "test-evidence" || event.kind === "shell")
  const files = unique(selection.events.flatMap(eventFiles))
  const codeFileRefs = codeEvents.flatMap(eventFiles)
  const fileGroups = Map.groupBy(codeFileRefs, (file) => file)
  const maxFileCluster = Math.max(0, ...Array.from(fileGroups.values(), (items) => items.length))
  const buckets = files.map(pathBucket)
  const spans = codeEvents.flatMap((event) => event.spans ?? [])
  const spanLineCount = spans.reduce((total, span) => total + Math.max(0, span.end - span.start + 1), 0)
  return {
    tokens: selection.tokens,
    fill: selection.tokens / Math.max(1, budget),
    selectedCount: selection.events.length,
    fileCount: files.length,
    codeEventShare: codeEvents.length / Math.max(1, selection.events.length),
    evidenceEventShare: evidenceEvents.length / Math.max(1, selection.events.length),
    spanCount: spans.length,
    spanLineCount,
    averageSpanLines: spans.length === 0 ? 0 : spanLineCount / spans.length,
    implementationPathShare: share(buckets, "implementation"),
    testPathShare: share(buckets, "test"),
    noisyPathShare:
      buckets.length === 0
        ? 0
        : buckets.filter(
            (bucket) => bucket === "test" || bucket === "docs" || bucket === "generated" || bucket === "fixture",
          ).length / buckets.length,
    maxFileClusterShare: codeFileRefs.length === 0 ? 0 : maxFileCluster / codeFileRefs.length,
  }
}

function featureRouterScores(input: {
  readonly target: RouterTarget
  readonly examples: readonly FeatureExample[]
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly routed: readonly Result[]
}) {
  const bestFixedPolicy = bestPolicyForExamples(input.examples, input.policies, input.target)
  const bestFixedResults = input.examples.map((example) => example.results.get(bestFixedPolicy)).filter(isResult)
  const targetOracles = input.examples.map((example) => exampleOracle(example, input.target))
  const f1Oracles = input.examples.map((example) => exampleOracle(example, "event-f1"))
  const routerTargetScore = mean(input.routed.map((result) => scoreResult(result, input.target)))
  const routerF1 = mean(input.routed.map((result) => result.f1))
  const bestFixedTargetScore = mean(bestFixedResults.map((result) => scoreResult(result, input.target)))
  const bestFixedF1 = mean(bestFixedResults.map((result) => result.f1))
  return {
    routerTargetScore,
    routerF1,
    routerSpanF1: mean(input.routed.map((result) => result.spanF1)),
    routerLineF1: mean(input.routed.map((result) => result.lineF1)),
    oracleTargetScore: mean(targetOracles.map((result) => scoreResult(result, input.target))),
    oracleF1: mean(f1Oracles.map((result) => result.f1)),
    oracleSpanF1: mean(input.examples.map((example) => exampleOracle(example, "span-f1").spanF1)),
    oracleLineF1: mean(input.examples.map((example) => exampleOracle(example, "line-f1").lineF1)),
    bestFixedPolicy,
    bestFixedTargetScore,
    bestFixedF1,
    targetDeltaVsBestFixed: routerTargetScore - bestFixedTargetScore,
    f1DeltaVsBestFixed: routerF1 - bestFixedF1,
    routerRegretTarget: mean(
      input.routed.map((result) =>
        Math.max(
          0,
          scoreResult(exampleOracle(exampleByID(input.examples, result.instanceID), input.target), input.target) -
            scoreResult(result, input.target),
        ),
      ),
    ),
    routerRegretF1: mean(
      input.routed.map((result) =>
        Math.max(0, exampleOracle(exampleByID(input.examples, result.instanceID), "event-f1").f1 - result.f1),
      ),
    ),
    bestFixedRegretTarget: mean(
      bestFixedResults.map((result) =>
        Math.max(
          0,
          scoreResult(exampleOracle(exampleByID(input.examples, result.instanceID), input.target), input.target) -
            scoreResult(result, input.target),
        ),
      ),
    ),
    bestFixedRegretF1: mean(
      bestFixedResults.map((result) =>
        Math.max(0, exampleOracle(exampleByID(input.examples, result.instanceID), "event-f1").f1 - result.f1),
      ),
    ),
  }
}

function trainFeatureRule(
  examples: readonly FeatureExample[],
  policies: readonly SessionContextLedger.SelectionPolicy[],
  target: RouterTarget,
) {
  const fixedPolicy = bestPolicyForExamples(examples, policies, target)
  let best = constantFeatureRule(
    fixedPolicy,
    target,
    scoreRule(examples, constantFeatureRule(fixedPolicy, target, 0), target),
  )

  const featureNames = Array.from(
    new Set(examples.flatMap((example) => Array.from(example.features.keys()))),
  ).toSorted()
  for (const feature of featureNames) {
    for (const threshold of splitThresholds(examples.map((example) => example.features.get(feature) ?? 0))) {
      const low = examples.filter((example) => (example.features.get(feature) ?? 0) <= threshold)
      const high = examples.filter((example) => (example.features.get(feature) ?? 0) > threshold)
      if (low.length === 0 || high.length === 0) continue
      const rule = {
        feature,
        threshold,
        lowPolicy: bestPolicyForExamples(low, policies, target),
        highPolicy: bestPolicyForExamples(high, policies, target),
        target,
        trainScore: 0,
      } satisfies FeatureRouterRule
      const scored = { ...rule, trainScore: scoreRule(examples, rule, target) } satisfies FeatureRouterRule
      if (scored.trainScore > best.trainScore) best = scored
    }
  }
  return best
}

function constantFeatureRule(
  policy: SessionContextLedger.SelectionPolicy,
  target: RouterTarget,
  trainScore: number,
): FeatureRouterRule {
  return {
    feature: "constant",
    threshold: 0,
    lowPolicy: policy,
    highPolicy: policy,
    target,
    trainScore,
  }
}

function scoreRule(examples: readonly FeatureExample[], rule: FeatureRouterRule, target: RouterTarget) {
  return mean(examples.map((example) => scoreResult(routedResult(example, rule), target)))
}

function routedResult(example: FeatureExample, rule: FeatureRouterRule) {
  const policy =
    rule.feature === "constant" || (example.features.get(rule.feature) ?? 0) <= rule.threshold
      ? rule.lowPolicy
      : rule.highPolicy
  const result = example.results.get(policy)
  if (result) return result
  const fallback = Array.from(example.results.values())[0]
  if (!fallback) throw new Error(`No policy results for ${example.instanceID}`)
  return fallback
}

function splitThresholds(values: readonly number[]) {
  const sorted = Array.from(new Set(values.filter(Number.isFinite))).toSorted((a, b) => a - b)
  const thresholds = sorted.slice(0, -1).map((value, index) => (value + sorted[index + 1]) / 2)
  if (thresholds.length <= 12) return thresholds
  const quantiles = [0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9]
  return unique(
    quantiles
      .map((quantile) => thresholds[Math.min(thresholds.length - 1, Math.floor(quantile * thresholds.length))])
      .filter((value): value is number => value !== undefined),
  )
}

function bestPolicyForExamples(
  examples: readonly FeatureExample[],
  policies: readonly SessionContextLedger.SelectionPolicy[],
  target: RouterTarget,
) {
  return (
    policies
      .map((policy) => ({
        policy,
        score: mean(
          examples
            .map((example) => example.results.get(policy))
            .filter(isResult)
            .map((result) => scoreResult(result, target)),
        ),
      }))
      .toSorted((a, b) => b.score - a.score || policiesOrder(a.policy) - policiesOrder(b.policy))[0]?.policy ??
    "recency"
  )
}

function exampleOracle(example: FeatureExample, target: RouterTarget) {
  return (
    maxBy(Array.from(example.results.values()), (result) => scoreResult(result, target)) ?? {
      instanceID: example.instanceID,
      policy: "recency",
      budget: 0,
      tokens: 0,
      selected: 0,
      recall: 0,
      precision: 0,
      f1: 0,
      recallPerThousandTokens: 0,
      fileRecall: 0,
      filePrecision: 0,
      fileF1: 0,
      spanRecall: 0,
      spanPrecision: 0,
      spanF1: 0,
      lineRecall: 0,
      linePrecision: 0,
      lineF1: 0,
      aucFileCoverage: 0,
      aucSpanCoverage: 0,
      aucLineCoverage: 0,
    }
  )
}

function scoreResult(result: Result, target: RouterTarget) {
  if (target === "span-f1") return result.spanF1
  if (target === "line-f1") return result.lineF1
  if (target === "auc-file") return result.aucFileCoverage
  if (target === "auc-span") return result.aucSpanCoverage
  if (target === "auc-line") return result.aucLineCoverage
  if (target === "official-utility") return mean([result.fileF1, result.spanF1, result.lineF1])
  return result.f1
}

function selectPortfolioPolicy(
  policies: readonly PolicyTargetComparisonReport["budgets"][number]["policies"][number][],
  objective: PolicyPortfolioObjective,
  target: RouterTarget,
) {
  const sorted = policies.toSorted((a, b) => {
    if (objective === "target-score") {
      const scoreDelta = targetScore(b.targetScores, target) - targetScore(a.targetScores, target)
      if (scoreDelta !== 0) return scoreDelta
      return a.worstTargetRegret - b.worstTargetRegret || policiesOrder(a.policy) - policiesOrder(b.policy)
    }
    return (
      a.worstTargetRegret - b.worstTargetRegret ||
      a.meanTargetRegret - b.meanTargetRegret ||
      b.targetWins - a.targetWins ||
      policiesOrder(a.policy) - policiesOrder(b.policy)
    )
  })
  const selected = sorted[0]
  if (!selected) throw new Error("Policy portfolio requires at least one policy")
  return selected
}

function portfolioBudgetSelection(input: {
  readonly cases: readonly Case[]
  readonly budget: number
  readonly policies: readonly SessionContextLedger.SelectionPolicy[]
  readonly objective: PolicyPortfolioObjective
  readonly target: RouterTarget
  readonly targets: readonly RouterTarget[]
}) {
  const results = input.cases.flatMap((item) =>
    input.policies.map((policy) =>
      evaluateCase({
        item,
        policy,
        budget: input.budget,
      }),
    ),
  )
  const report = analyzePolicyTargets(results, {
    targets: input.objective === "target-score" ? uniqueTargets([input.target]) : input.targets,
  })
  const budget = report.budgets[0]
  if (!budget) throw new Error(`Missing portfolio budget ${input.budget}`)
  const selected = selectPortfolioPolicy(budget.policies, input.objective, input.target)
  return {
    selected,
    policyRows: budget.policies,
  }
}

function portfolioObjectiveScore(
  policy: PolicyTargetComparisonReport["budgets"][number]["policies"][number],
  objective: PolicyPortfolioObjective,
  target: RouterTarget,
) {
  if (objective === "target-score") return targetScore(policy.targetScores, target)
  return -policy.worstTargetRegret
}

function portfolioAggregate(
  rows: readonly ({
    readonly policy: SessionContextLedger.SelectionPolicy
  } & ScoreAggregateInput)[],
) {
  return {
    ...scoreAggregate(rows),
    selectedPolicyCounts: Array.from(Map.groupBy(rows, (row) => row.policy).entries())
      .map(([policy, items]) => ({ policy, budgets: items.length }))
      .toSorted((a, b) => b.budgets - a.budgets || policiesOrder(a.policy) - policiesOrder(b.policy)),
  }
}

type ScoreAggregateInput = {
  readonly meanEventF1: number
  readonly meanFileF1: number
  readonly meanSpanF1: number
  readonly meanLineF1: number
  readonly meanOfficialUtility: number
  readonly worstTargetRegret: number
  readonly meanTargetRegret: number
  readonly worstOracleRegret: number
  readonly meanOracleRegret: number
}

function scoreAggregate(rows: readonly ScoreAggregateInput[]) {
  return {
    meanEventF1: mean(rows.map((row) => row.meanEventF1)),
    meanFileF1: mean(rows.map((row) => row.meanFileF1)),
    meanSpanF1: mean(rows.map((row) => row.meanSpanF1)),
    meanLineF1: mean(rows.map((row) => row.meanLineF1)),
    meanOfficialUtility: mean(rows.map((row) => row.meanOfficialUtility)),
    worstTargetRegret: Math.max(...rows.map((row) => row.worstTargetRegret)),
    meanTargetRegret: mean(rows.map((row) => row.meanTargetRegret)),
    worstOracleRegret: Math.max(...rows.map((row) => row.worstOracleRegret)),
    meanOracleRegret: mean(rows.map((row) => row.meanOracleRegret)),
  }
}

function uniqueTargets(targets: readonly RouterTarget[]) {
  const uniqueItems = Array.from(new Set(targets))
  return uniqueItems.length
    ? uniqueItems
    : (["event-f1", "span-f1", "line-f1", "auc-line", "official-utility"] satisfies readonly RouterTarget[])
}

function dominatesTargets(
  left: { readonly targetScores: readonly { readonly target: RouterTarget; readonly score: number }[] },
  right: { readonly targetScores: readonly { readonly target: RouterTarget; readonly score: number }[] },
  targets: readonly RouterTarget[],
) {
  let better = false
  for (const target of targets) {
    const leftScore = targetScore(left.targetScores, target)
    const rightScore = targetScore(right.targetScores, target)
    if (leftScore < rightScore - 1e-12) return false
    if (leftScore > rightScore + 1e-12) better = true
  }
  return better
}

function targetScore(
  scores: readonly { readonly target: RouterTarget; readonly score: number }[],
  target: RouterTarget,
) {
  return scores.find((score) => score.target === target)?.score ?? 0
}

function exampleByID(examples: readonly FeatureExample[], instanceID: string) {
  const example = examples.find((item) => item.instanceID === instanceID)
  if (!example) throw new Error(`Missing feature example for ${instanceID}`)
  return example
}

function isResult(value: Result | undefined): value is Result {
  return value !== undefined
}

function share(values: readonly string[], value: string) {
  return values.length === 0 ? 0 : values.filter((item) => item === value).length / values.length
}

function pathBucket(file: string) {
  const normalized = file.toLowerCase()
  if (/(^|\/)(__tests__|tests?|spec|fixtures?|mocks?)(\/|$)/.test(normalized)) return "test"
  if (/(^|\/)(docs?|documentation)(\/|$)/.test(normalized) || /\.(md|mdx|rst|txt)$/.test(normalized)) return "docs"
  if (/(^|\/)(dist|build|generated|gen|vendor)(\/|$)/.test(normalized)) return "generated"
  if (/(^|\/)(fixtures?|examples?)(\/|$)/.test(normalized)) return "fixture"
  return "implementation"
}

function textTerms(input: string) {
  return new Set(
    input
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .flatMap((term) => term.split("_"))
      .map((term) => term.trim())
      .filter((term) => term.length > 1),
  )
}

function mean(values: readonly number[]) {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

function maxBy<T>(values: readonly T[], score: (value: T) => number) {
  return values.reduce<T | undefined>((best, value) => {
    if (!best) return value
    return score(value) > score(best) ? value : best
  }, undefined)
}

function bestPolicyByF1(results: readonly Result[]) {
  return (
    Array.from(Map.groupBy(results, (result) => result.policy).entries())
      .map(([policy, results]) => ({ policy, f1: mean(results.map((result) => result.f1)) }))
      .toSorted((a, b) => b.f1 - a.f1 || policiesOrder(a.policy) - policiesOrder(b.policy))[0]?.policy ?? "recency"
  )
}

function caseFold(instanceID: string, folds: number) {
  let hash = 2166136261
  for (let index = 0; index < instanceID.length; index++) {
    hash ^= instanceID.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % Math.max(1, folds)
}

function f1(recall: number, precision: number) {
  if (recall + precision === 0) return 0
  return (2 * recall * precision) / (recall + precision)
}

function policiesOrder(policy: SessionContextLedger.SelectionPolicy) {
  return SessionContextLedger.selectionPolicyOrder(policy)
}
