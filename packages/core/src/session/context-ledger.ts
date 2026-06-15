export * as SessionContextLedger from "./context-ledger"

import { Token } from "../util/token"
import { SessionMessage } from "./message"
import { SessionContextLedgerPolicy } from "./context-ledger-policy"

export type Entry = {
  readonly seq: number
  readonly message: SessionMessage.Message
}

export type EventKind =
  | "instruction"
  | "user-goal"
  | "assistant-note"
  | "tool-call"
  | "tool-result"
  | "test-evidence"
  | "shell"
  | "diff"
  | "code-context"
  | "experience"
  | "compaction"
  | "synthetic"

export type Recoverability = "low" | "medium" | "high"

export type Span = {
  readonly file: string
  readonly start: number
  readonly end: number
}

export type Event = {
  readonly id: string
  readonly kind: EventKind
  readonly source: string
  readonly order: number
  readonly summary: string
  readonly tokens: number
  readonly recoverability: Recoverability
  readonly mustPreserve: boolean
  readonly files: readonly string[]
  readonly spans?: readonly Span[]
  readonly dependencies: readonly string[]
}

export const SELECTION_POLICIES = SessionContextLedgerPolicy.SELECTION_POLICIES
export type SelectionPolicy = SessionContextLedgerPolicy.SelectionPolicy
export const INPUT_MODES = SessionContextLedgerPolicy.INPUT_MODES
export type InputMode = SessionContextLedgerPolicy.InputMode

export type Selection = {
  readonly policy: SelectionPolicy
  readonly budget: number
  readonly tokens: number
  readonly events: readonly Event[]
}

export type Evaluation = {
  readonly recall: number
  readonly precision: number
  readonly recallPerThousandTokens: number
  readonly selectedGoldIDs: readonly string[]
  readonly missingGoldIDs: readonly string[]
}

export const DEFAULT_CONTEXT_BUDGET = SessionContextLedgerPolicy.DEFAULT_CONTEXT_BUDGET
export const DEFAULT_SELECTION_POLICY = SessionContextLedgerPolicy.DEFAULT_SELECTION_POLICY
export const DEFAULT_INPUT_MODE = SessionContextLedgerPolicy.DEFAULT_INPUT_MODE
const MAX_SUMMARY_CHARS = 240
const PATH_PATTERN = /(?:^|[\s(["'`])([A-Za-z0-9_.@/-]+\.[A-Za-z0-9][A-Za-z0-9_.-]*)(?=$|[\s)\]"'`,:;])/g
const SERIALIZED_PREFIX_PATTERN = /^\[[A-Za-z][A-Za-z -]*\]:/
const STOP_WORDS = new Set([
  "and",
  "are",
  "but",
  "can",
  "for",
  "from",
  "has",
  "have",
  "into",
  "not",
  "the",
  "this",
  "that",
  "with",
])
export function fromEntries(entries: readonly Entry[]) {
  return entries.flatMap((entry, index) => fromMessage(entry, index))
}

export function fromSerializedContext(context: readonly string[]) {
  return context.flatMap((item, index) =>
    serializedChunks(item).map((summary, chunkIndex) => {
      const kind = serializedKind(summary)
      return event({
        id: `serialized:${index}:${chunkIndex}`,
        kind,
        source: `serialized-context:${index}`,
        order: index * 100 + chunkIndex,
        summary,
        recoverability: serializedRecoverability(kind),
        mustPreserve: serializedMustPreserve(kind, summary),
        files: paths(summary),
      })
    }),
  )
}

export function select(input: {
  readonly events: readonly Event[]
  readonly budget?: number
  readonly policy?: SelectionPolicy
  readonly activeFiles?: readonly string[]
  readonly query?: string
}) {
  const policy = input.policy ?? DEFAULT_SELECTION_POLICY
  const budget = input.budget ?? DEFAULT_CONTEXT_BUDGET
  if (policy === "recency") return selectRecency(input.events, budget)
  if (policy === "query-frontier")
    return selectQueryFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "relevance-frontier")
    return selectRelevanceFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "coherence-frontier")
    return selectCoherenceFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "file-frontier")
    return selectFileFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "adaptive-frontier")
    return selectAdaptiveFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "fusion-frontier")
    return selectFusionFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "portfolio-frontier")
    return selectPortfolioFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "robust-frontier")
    return selectRobustFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "utility-frontier")
    return selectUtilityFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "target-balanced-frontier")
    return selectTargetBalancedFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "official-frontier")
    return selectOfficialFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "precision-frontier")
    return selectPrecisionFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "exploration-frontier")
    return selectExplorationFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "candidate-rank-frontier")
    return selectCandidateRankFrontier(input.events, budget)
  if (policy === "budget-rank-frontier")
    return selectBudgetRankFrontier(input.events, budget)
  if (policy === "rank-portfolio-frontier")
    return selectRankPortfolioFrontier(input.events, budget)
  if (policy === "coverage-rank-frontier")
    return selectCoverageRankFrontier(input.events, budget)
  if (policy === "mmr-rank-frontier")
    return selectMMRRankFrontier(input.events, budget)
  if (policy === "action-aware-frontier")
    return selectActionAwareFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "intent-frontier")
    return selectIntentFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "experience-frontier")
    return selectExperienceFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)), input.query ?? "")
  if (policy === "diverse-frontier")
    return selectDiverseFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)))
  return selectBalancedFrontier(input.events, budget, new Set(input.activeFiles ?? activeFiles(input.events)))
}

export function compile(input: {
  readonly entries: readonly Entry[]
  readonly budget?: number
  readonly policy?: SelectionPolicy
  readonly activeFiles?: readonly string[]
  readonly query?: string
}) {
  const events = fromEntries(input.entries)
  const selection = select({
    events,
    budget: input.budget,
    policy: input.policy,
    activeFiles: input.activeFiles,
    query: input.query,
  })
  return {
    events,
    selection,
    text: render(selection.events),
  }
}

export function compileSerializedContext(input: {
  readonly context: readonly string[]
  readonly budget?: number
  readonly policy?: SelectionPolicy
  readonly activeFiles?: readonly string[]
  readonly query?: string
}) {
  const events = fromSerializedContext(input.context)
  const selection = select({
    events,
    budget: input.budget,
    policy: input.policy,
    activeFiles: input.activeFiles,
    query: input.query,
  })
  return {
    events,
    selection,
    text: render(selection.events),
  }
}

export function evaluate(input: { readonly selected: readonly Event[]; readonly goldIDs: readonly string[] }) {
  const selected = new Set(input.selected.map((event) => event.id))
  const gold = new Set(input.goldIDs)
  const selectedGoldIDs = input.goldIDs.filter((id) => selected.has(id))
  const missingGoldIDs = input.goldIDs.filter((id) => !selected.has(id))
  const tokens = input.selected.reduce((total, event) => total + event.tokens, 0)
  return {
    recall: gold.size === 0 ? 1 : selectedGoldIDs.length / gold.size,
    precision: selected.size === 0 ? 1 : selectedGoldIDs.length / selected.size,
    recallPerThousandTokens: tokens === 0 ? 0 : (selectedGoldIDs.length / tokens) * 1_000,
    selectedGoldIDs,
    missingGoldIDs,
  } satisfies Evaluation
}

export function selectionPolicyOrder(policy: SelectionPolicy) {
  return SessionContextLedgerPolicy.selectionPolicyOrder(policy)
}

export function render(events: readonly Event[]) {
  const sections = [
    section("Constraints And Goals", events, ["instruction", "user-goal", "synthetic"]),
    section("Current Diff And Edits", events, ["diff"]),
    section("Retrieved Code Context", events, ["code-context"]),
    section("Reusable Experience", events, ["experience"]),
    section("Tests And Tool Evidence", events, ["test-evidence", "tool-result", "shell"]),
    section("Assistant State", events, ["assistant-note", "tool-call"]),
    section("Prior Compaction", events, ["compaction"]),
  ].filter(Boolean)
  if (sections.length === 0) return ""
  return ["<context-ledger>", ...sections, "</context-ledger>"].join("\n")
}

function fromMessage(entry: Entry, index: number) {
  const message = entry.message
  const order = entry.seq * 100 + index
  if (message.type === "system")
    return [
      event({
        id: `${message.id}:system`,
        kind: "instruction",
        source: `message:${message.id}`,
        order,
        summary: message.text,
        recoverability: "low",
        mustPreserve: true,
        files: paths(message.text),
      }),
    ]
  if (message.type === "user")
    return [
      event({
        id: `${message.id}:user`,
        kind: "user-goal",
        source: `message:${message.id}`,
        order,
        summary: message.text,
        recoverability: "low",
        mustPreserve: true,
        files: [...paths(message.text), ...(message.files ?? []).flatMap((file) => (file.name ? [file.name] : []))],
      }),
    ]
  if (message.type === "shell")
    return [
      event({
        id: `${message.id}:shell`,
        kind: shellKind(message.command, message.output),
        source: `message:${message.id}`,
        order,
        summary: [`$ ${message.command}`, truncate(message.output)].filter(Boolean).join("\n"),
        recoverability: "medium",
        mustPreserve: shellKind(message.command, message.output) === "test-evidence",
        files: paths(`${message.command}\n${message.output}`),
      }),
    ]
  if (message.type === "synthetic")
    return [
      event({
        id: `${message.id}:synthetic`,
        kind: "synthetic",
        source: `message:${message.id}`,
        order,
        summary: message.text,
        recoverability: "low",
        mustPreserve: true,
        files: paths(message.text),
      }),
    ]
  if (message.type === "compaction")
    return [
      event({
        id: `${message.id}:compaction`,
        kind: "compaction",
        source: `message:${message.id}`,
        order,
        summary: message.summary,
        recoverability: "low",
        mustPreserve: true,
        files: paths(`${message.summary}\n${message.recent}`),
      }),
    ]
  if (message.type !== "assistant") return []
  return message.content.flatMap((part, partIndex) => {
    if (part.type === "text")
      return [
        event({
          id: `${message.id}:text:${part.id}`,
          kind: "assistant-note",
          source: `message:${message.id}#${part.id}`,
          order: order + partIndex,
          summary: part.text,
          recoverability: "medium",
          mustPreserve: false,
          files: paths(part.text),
        }),
      ]
    if (part.type === "reasoning") return []
    const input = stringify(part.state.input)
    const base = {
      source: `message:${message.id}#${part.id}`,
      order: order + partIndex,
      files: unique([...paths(`${part.name}\n${input}\n${toolOutput(part.state)}`), ...toolFiles(part.name, part.state)]),
    }
    const spans = toolSpans(part.name, part.state)
    const call = event({
      ...base,
      id: `${message.id}:tool:${part.id}:call`,
      kind: "tool-call",
      summary: `${part.name}(${input})`,
      recoverability: "medium",
      mustPreserve: false,
    })
    if (part.state.status === "completed")
      return [
        call,
        event({
          ...base,
          id: `${message.id}:tool:${part.id}:result`,
          kind: toolKind(part.name, toolOutput(part.state)),
          summary: toolOutput(part.state),
          recoverability: "medium",
          mustPreserve: toolKind(part.name, toolOutput(part.state)) === "test-evidence",
          dependencies: [call.id],
          spans,
        }),
      ]
    if (part.state.status === "error")
      return [
        call,
        event({
          ...base,
          id: `${message.id}:tool:${part.id}:error`,
          kind: "test-evidence",
          summary: part.state.error.message,
          recoverability: "low",
          mustPreserve: true,
          dependencies: [call.id],
        }),
      ]
    return [call]
  })
}

function event(input: {
  readonly id: string
  readonly kind: EventKind
  readonly source: string
  readonly order: number
  readonly summary: string
  readonly recoverability: Recoverability
  readonly mustPreserve: boolean
  readonly files: readonly string[]
  readonly spans?: readonly Span[]
  readonly dependencies?: readonly string[]
}) {
  const summary = truncate(input.summary.trim())
  return {
    ...input,
    summary,
    tokens: Token.estimate(summary),
    dependencies: input.dependencies ?? [],
  } satisfies Event
}

function selectRecency(events: readonly Event[], budget: number): Selection {
  const selected = fit(events.toSorted((a, b) => b.order - a.order), budget, { preserveRequired: false }).toReversed()
  return {
    policy: "recency",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectBalancedFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>): Selection {
  const selected = withDependencies(
    events,
    fit(
      events.toSorted((a, b) => {
        const score = scoreEvent(b, events, activeFiles) - scoreEvent(a, events, activeFiles)
        if (score !== 0) return score
        return density(b, events, activeFiles) - density(a, events, activeFiles)
      }),
      budget,
      { preserveRequired: true },
    ),
  ).toSorted((a, b) => a.order - b.order)
  return {
    policy: "balanced-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectDiverseFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>): Selection {
  const result = events.reduce<{ readonly selected: readonly Event[]; readonly tokens: number }>(
    (current) => {
      const candidate = events
        .filter((event) => !current.selected.some((item) => item.id === event.id))
        .filter((event) => current.tokens + event.tokens <= budget || event.mustPreserve)
        .toSorted((a, b) => {
          const score = diverseScore(b, events, activeFiles, current.selected) - diverseScore(a, events, activeFiles, current.selected)
          if (score !== 0) return score
          return density(b, events, activeFiles) - density(a, events, activeFiles)
        })[0]
      if (!candidate) return current
      return {
        selected: [...current.selected, candidate],
        tokens: current.tokens + candidate.tokens,
      }
    },
    { selected: [], tokens: 0 },
  )
  const selected = withDependencies(events, result.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "diverse-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectQueryFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const queryTermSet = terms(query)
  const result = events.reduce<{ readonly selected: readonly Event[]; readonly tokens: number }>(
    (current) => {
      const candidate = events
        .filter((event) => !current.selected.some((item) => item.id === event.id))
        .filter((event) => current.tokens + event.tokens <= budget || event.mustPreserve)
        .toSorted((a, b) => {
          const score =
            queryScore(b, events, activeFiles, current.selected, queryTermSet) -
            queryScore(a, events, activeFiles, current.selected, queryTermSet)
          if (score !== 0) return score
          return density(b, events, activeFiles) - density(a, events, activeFiles)
        })[0]
      if (!candidate) return current
      return {
        selected: [...current.selected, candidate],
        tokens: current.tokens + candidate.tokens,
      }
    },
    { selected: [], tokens: 0 },
  )
  const selected = withDependencies(events, result.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "query-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectRelevanceFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const queryTermSet = terms(query)
  const corpus = corpusStats(events)
  const result = events.reduce<{ readonly selected: readonly Event[]; readonly tokens: number }>(
    (current) => {
      const candidate = events
        .filter((event) => !current.selected.some((item) => item.id === event.id))
        .filter((event) => current.tokens + event.tokens <= budget || event.mustPreserve)
        .toSorted((a, b) => {
          const score =
            relevanceScore(b, events, activeFiles, current.selected, queryTermSet, corpus) -
            relevanceScore(a, events, activeFiles, current.selected, queryTermSet, corpus)
          if (score !== 0) return score
          return density(b, events, activeFiles) - density(a, events, activeFiles)
        })[0]
      if (!candidate) return current
      return {
        selected: [...current.selected, candidate],
        tokens: current.tokens + candidate.tokens,
      }
    },
    { selected: [], tokens: 0 },
  )
  const selected = withDependencies(events, result.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "relevance-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectCoherenceFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const queryTermSet = terms(query)
  const corpus = corpusStats(events)
  const result = events.reduce<{ readonly selected: readonly Event[]; readonly tokens: number }>(
    (current) => {
      const candidate = events
        .filter((event) => !current.selected.some((item) => item.id === event.id))
        .filter((event) => current.tokens + event.tokens <= budget || event.mustPreserve)
        .toSorted((a, b) => {
          const score =
            coherenceScore(b, events, activeFiles, current.selected, queryTermSet, corpus) -
            coherenceScore(a, events, activeFiles, current.selected, queryTermSet, corpus)
          if (score !== 0) return score
          return density(b, events, activeFiles) - density(a, events, activeFiles)
        })[0]
      if (!candidate) return current
      return {
        selected: [...current.selected, candidate],
        tokens: current.tokens + candidate.tokens,
      }
    },
    { selected: [], tokens: 0 },
  )
  const selected = withDependencies(events, result.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "coherence-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectFileFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const queryTermSet = terms(query)
  const corpus = corpusStats(events)
  const required = events.filter((event) => event.mustPreserve)
  const initial = {
    selected: fit(required.toSorted((a, b) => scoreEvent(b, events, activeFiles) - scoreEvent(a, events, activeFiles)), budget, {
      preserveRequired: true,
    }),
    tokens: 0,
  }
  const seeded = { ...initial, tokens: initial.selected.reduce((total, event) => total + event.tokens, 0) }
  const grouped = rankedFiles(events, activeFiles, queryTermSet, corpus).reduce((current, file) => {
    const candidates = events
      .filter((event) => event.files.includes(file))
      .filter((event) => !current.selected.some((item) => item.id === event.id))
      .toSorted((a, b) => {
        const score =
          fileClusterScore(b, file, events, activeFiles, current.selected, queryTermSet, corpus) -
          fileClusterScore(a, file, events, activeFiles, current.selected, queryTermSet, corpus)
        if (score !== 0) return score
        return a.order - b.order
      })
    return candidates.reduce((result, event) => {
      if (result.tokens + event.tokens > budget && !event.mustPreserve) return result
      return {
        selected: [...result.selected, event],
        tokens: result.tokens + event.tokens,
      }
    }, current)
  }, seeded)
  const filled = events
    .filter((event) => !grouped.selected.some((item) => item.id === event.id))
    .toSorted((a, b) => {
      const score =
        relevanceScore(b, events, activeFiles, grouped.selected, queryTermSet, corpus) -
        relevanceScore(a, events, activeFiles, grouped.selected, queryTermSet, corpus)
      if (score !== 0) return score
      return density(b, events, activeFiles) - density(a, events, activeFiles)
    })
    .reduce((current, event) => {
      if (current.tokens + event.tokens > budget && !event.mustPreserve) return current
      return {
        selected: [...current.selected, event],
        tokens: current.tokens + event.tokens,
      }
    }, grouped)
  const selected = withDependencies(events, filled.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "file-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectAdaptiveFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const queryTermSet = terms(query)
  const corpus = corpusStats(events)
  const candidates = [
    selectRelevanceFrontier(events, budget, activeFiles, query),
    selectCoherenceFrontier(events, budget, activeFiles, query),
    selectFileFrontier(events, budget, activeFiles, query),
  ]
  const best = candidates.toSorted((a, b) => {
    const quality =
      selectionQuality(b, events, activeFiles, queryTermSet, corpus, budget) -
      selectionQuality(a, events, activeFiles, queryTermSet, corpus, budget)
    if (quality !== 0) return quality
    return policyPreference(b.policy) - policyPreference(a.policy)
  })[0]
  return {
    policy: "adaptive-frontier",
    budget,
    tokens: best.tokens,
    events: best.events,
  }
}

function selectFusionFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const queryTermSet = terms(query)
  const corpus = corpusStats(events)
  const rankMaps = fusionRankMaps(events, budget, activeFiles, query, queryTermSet, corpus)
  const required = fit(events.filter((event) => event.mustPreserve), budget, { preserveRequired: true })
  const initial: { readonly selected: readonly Event[]; readonly tokens: number } = {
    selected: required,
    tokens: required.reduce((total, event) => total + event.tokens, 0),
  }
  const result = events.reduce(
    (current) => {
      const candidate = events
        .filter((event) => !current.selected.some((item) => item.id === event.id))
        .filter((event) => current.tokens + event.tokens <= budget || event.mustPreserve)
        .toSorted((a, b) => {
          const score =
            fusionScore(b, events, activeFiles, current.selected, queryTermSet, corpus, rankMaps) -
            fusionScore(a, events, activeFiles, current.selected, queryTermSet, corpus, rankMaps)
          if (score !== 0) return score
          return density(b, events, activeFiles) - density(a, events, activeFiles)
        })[0]
      if (!candidate) return current
      return {
        selected: [...current.selected, candidate],
        tokens: current.tokens + candidate.tokens,
      }
    },
    initial,
  )
  const selected = withDependencies(events, result.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "fusion-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectPortfolioFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const best = budget <= 400
    ? selectFileFrontier(events, budget, activeFiles, query)
    : selectFusionFrontier(events, budget, activeFiles, query)
  return {
    policy: "portfolio-frontier",
    budget,
    tokens: best.tokens,
    events: best.events,
  }
}

function selectRobustFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const best = budget > 400 && budget <= 1_000
    ? selectFileFrontier(events, budget, activeFiles, query)
    : selectAdaptiveFrontier(events, budget, activeFiles, query)
  return {
    policy: "robust-frontier",
    budget,
    tokens: best.tokens,
    events: best.events,
  }
}

function selectUtilityFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const best = budget <= 1_000
    ? selectFileFrontier(events, budget, activeFiles, query)
    : selectCoherenceFrontier(events, budget, activeFiles, query)
  return {
    policy: "utility-frontier",
    budget,
    tokens: best.tokens,
    events: best.events,
  }
}

function selectTargetBalancedFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const best = budget <= 1_000
    ? selectFileFrontier(events, budget, activeFiles, query)
    : selectFusionFrontier(events, budget, activeFiles, query)
  return {
    policy: "target-balanced-frontier",
    budget,
    tokens: best.tokens,
    events: best.events,
  }
}

function selectOfficialFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const best = budget <= 400 || budget > 1_000
    ? selectAdaptiveFrontier(events, budget, activeFiles, query)
    : selectFusionFrontier(events, budget, activeFiles, query)
  return {
    policy: "official-frontier",
    budget,
    tokens: best.tokens,
    events: best.events,
  }
}

function selectPrecisionFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const queryTermSet = terms(query)
  const corpus = corpusStats(events)
  const result = events
    .toSorted((a, b) => {
      const score =
        precisionScore(b, events, activeFiles, queryTermSet, corpus) -
        precisionScore(a, events, activeFiles, queryTermSet, corpus)
      if (score !== 0) return score
      return density(b, events, activeFiles) - density(a, events, activeFiles)
    })
    .reduce<{ readonly selected: readonly Event[]; readonly tokens: number }>(
      (current, event) => {
        if (current.selected.some((item) => item.id === event.id)) return current
        const required = precisionRequired(event)
        const score = precisionScore(event, events, activeFiles, queryTermSet, corpus)
        if (!required && score < 220) return current
        if (current.tokens + event.tokens > budget && !required) return current
        return {
          selected: [...current.selected, event],
          tokens: current.tokens + event.tokens,
        }
      },
      { selected: [], tokens: 0 },
    )
  const selected = withDependencies(events, result.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "precision-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectExplorationFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const best = selectCoherenceFrontier(events, budget, activeFiles, query)
  return {
    policy: "exploration-frontier",
    budget,
    tokens: best.tokens,
    events: best.events,
  }
}

function selectCandidateRankFrontier(events: readonly Event[], budget: number): Selection {
  const selected = withDependencies(
    events,
    fit(events.toSorted((a, b) => a.order - b.order), budget, { preserveRequired: true }),
  ).toSorted((a, b) => a.order - b.order)
  return {
    policy: "candidate-rank-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectBudgetRankFrontier(events: readonly Event[], budget: number): Selection {
  const targetTokens = budget <= 400 ? 40 : budget <= 1_600 ? 80 : 160
  const selected = withDependencies(
    events,
    fit(
      events.toSorted((a, b) => {
        const scale = candidateScaleDistance(a, targetTokens) - candidateScaleDistance(b, targetTokens)
        if (scale !== 0) return scale
        return a.order - b.order
      }),
      budget,
      { preserveRequired: true },
    ),
  ).toSorted((a, b) => a.order - b.order)
  return {
    policy: "budget-rank-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectRankPortfolioFrontier(events: readonly Event[], budget: number): Selection {
  const selection = budget <= 400
    ? selectCandidateRankFrontier(events, budget)
    : selectBudgetRankFrontier(events, budget)
  return {
    policy: "rank-portfolio-frontier",
    budget,
    tokens: selection.tokens,
    events: selection.events,
  }
}

function selectCoverageRankFrontier(events: readonly Event[], budget: number): Selection {
  const targetTokens = budget <= 400 ? 40 : budget <= 1_600 ? 80 : 160
  const required = fit(events.filter((event) => event.mustPreserve).toSorted((a, b) => a.order - b.order), budget, {
    preserveRequired: true,
  })
  const result = events.reduce(
    (current) => {
      const candidate = events
        .filter((event) => !current.selected.some((item) => item.id === event.id))
        .filter((event) => current.tokens + event.tokens <= budget || event.mustPreserve)
        .toSorted((a, b) => {
          const scale = candidateScaleDistance(a, targetTokens) - candidateScaleDistance(b, targetTokens)
          if (scale !== 0) return scale
          const overlap = coverageOverlapRatio(a, current.selected) - coverageOverlapRatio(b, current.selected)
          const duplicate = duplicateCoveragePenalty(a, current.selected) - duplicateCoveragePenalty(b, current.selected)
          if (duplicate !== 0) return duplicate
          if (duplicateCoveragePenalty(a, current.selected) > 0 && overlap !== 0) return overlap
          return a.order - b.order
        })[0]
      if (!candidate) return current
      return {
        selected: [...current.selected, candidate],
        tokens: current.tokens + candidate.tokens,
      }
    },
    { selected: required, tokens: required.reduce((total, event) => total + event.tokens, 0) },
  )
  const selected = withDependencies(events, result.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "coverage-rank-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectMMRRankFrontier(events: readonly Event[], budget: number): Selection {
  const targetTokens = budget <= 400 ? 40 : budget <= 1_600 ? 80 : 160
  const ranked = events.toSorted((a, b) => {
    const scale = candidateScaleDistance(a, targetTokens) - candidateScaleDistance(b, targetTokens)
    if (scale !== 0) return scale
    return a.order - b.order
  })
  const rank = new Map(ranked.map((event, index) => [event.id, index]))
  const required = fit(events.filter((event) => event.mustPreserve).toSorted((a, b) => a.order - b.order), budget, {
    preserveRequired: true,
  })
  const result = events.reduce(
    (current) => {
      const selectedIDs = new Set(current.selected.map((event) => event.id))
      const candidate = events
        .filter((event) => !selectedIDs.has(event.id))
        .filter((event) => current.tokens + event.tokens <= budget || event.mustPreserve)
        .toSorted((a, b) => {
          const score = mmrRankScore(b, current.selected, targetTokens, rank) - mmrRankScore(a, current.selected, targetTokens, rank)
          if (score !== 0) return score
          return a.order - b.order
        })[0]
      if (!candidate) return current
      return {
        selected: [...current.selected, candidate],
        tokens: current.tokens + candidate.tokens,
      }
    },
    { selected: required, tokens: required.reduce((total, event) => total + event.tokens, 0) },
  )
  const selected = withDependencies(events, result.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "mmr-rank-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function mmrRankScore(
  event: Event,
  selected: readonly Event[],
  targetTokens: number,
  rank: ReadonlyMap<string, number>,
) {
  const selectedFiles = new Set(selected.flatMap((item) => item.files))
  const newFileBonus =
    event.files.length > 0 && event.files.every((file) => !selectedFiles.has(file)) ? 22 : 0
  const sameFilePenalty = event.files.filter((file) => selectedFiles.has(file)).length * 6
  return (
    -(rank.get(event.id) ?? Number.MAX_SAFE_INTEGER) * 3 -
    candidateScaleDistance(event, targetTokens) * 0.4 -
    coverageOverlapRatio(event, selected) * 35 -
    duplicateCoveragePenalty(event, selected) * 80 +
    newFileBonus -
    sameFilePenalty
  )
}

function candidateScaleDistance(event: Event, targetTokens: number) {
  if (event.kind !== "code-context" || !event.spans?.length) return targetTokens
  return Math.abs(event.tokens - targetTokens)
}

function coverageOverlapRatio(event: Event, selected: readonly Event[]) {
  if (event.kind !== "code-context" && event.kind !== "diff") return 0
  const spans = coverageMergeSpans(event.spans ?? [])
  const totalLines = spans.reduce((total, span) => total + spanLineCount(span), 0)
  if (totalLines <= 0) return 0
  const selectedByFile = Map.groupBy(
    coverageMergeSpans(selected.flatMap((item) => item.spans ?? [])),
    (span) => span.file,
  )
  const overlappingLines = spans.reduce((total, span) => {
    const selectedSpans = selectedByFile.get(span.file) ?? []
    return total + selectedSpans.reduce((subtotal, selectedSpan) => subtotal + spanLineOverlap(span, selectedSpan), 0)
  }, 0)
  return Math.min(1, overlappingLines / totalLines)
}

function duplicateCoveragePenalty(event: Event, selected: readonly Event[]) {
  return coverageOverlapRatio(event, selected) >= 0.8 ? 1 : 0
}

function coverageMergeSpans(spans: readonly Span[]) {
  return spans
    .map(normalizeSpan)
    .toSorted((a, b) => a.file.localeCompare(b.file) || a.start - b.start || a.end - b.end)
    .reduce<Span[]>((merged, span) => {
      const last = merged.at(-1)
      if (!last || last.file !== span.file || span.start > last.end + 1) return [...merged, span]
      return [...merged.slice(0, -1), { ...last, end: Math.max(last.end, span.end) }]
    }, [])
}

function normalizeSpan(span: Span) {
  const start = Math.max(1, Math.floor(Math.min(span.start, span.end)))
  const end = Math.max(start, Math.floor(Math.max(span.start, span.end)))
  return { ...span, start, end }
}

function spanLineCount(span: Span) {
  return Math.max(0, span.end - span.start + 1)
}

function spanLineOverlap(left: Span, right: Span) {
  if (left.file !== right.file) return 0
  const start = Math.max(left.start, right.start)
  const end = Math.min(left.end, right.end)
  return Math.max(0, end - start + 1)
}

function selectActionAwareFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const best = selectOfficialFrontier(events, budget, activeFiles, query)
  const ordered = actionAwareOrder(best.events, query)
  return {
    policy: "action-aware-frontier",
    budget,
    tokens: best.tokens,
    events: ordered,
  }
}

function selectIntentFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  const target = selectionIntentTarget(query)
  if (!target) {
    const best = selectOfficialFrontier(events, budget, activeFiles, query)
    return {
      policy: "intent-frontier",
      budget,
      tokens: best.tokens,
      events: best.events,
    }
  }
  const queryTermSet = terms(query)
  const corpus = corpusStats(events)
  const required = fit(
    events
      .filter((event) => event.mustPreserve)
      .toSorted((a, b) => scoreEvent(b, events, activeFiles) - scoreEvent(a, events, activeFiles)),
    budget,
    { preserveRequired: true },
  )
  const initial: { readonly selected: readonly Event[]; readonly tokens: number } = {
    selected: required,
    tokens: required.reduce((total, event) => total + event.tokens, 0),
  }
  const result = events.reduce(
    (current) => {
      const candidate = events
        .filter((event) => !current.selected.some((item) => item.id === event.id))
        .filter((event) => current.tokens + event.tokens <= budget || event.mustPreserve)
        .toSorted((a, b) => {
          const score =
            intentSelectionScore(b, events, activeFiles, current.selected, query, target, queryTermSet, corpus) -
            intentSelectionScore(a, events, activeFiles, current.selected, query, target, queryTermSet, corpus)
          if (score !== 0) return score
          return density(b, events, activeFiles) - density(a, events, activeFiles)
        })[0]
      if (!candidate) return current
      return {
        selected: [...current.selected, candidate],
        tokens: current.tokens + candidate.tokens,
      }
    },
    initial,
  )
  const selected = actionAwareOrder(withDependencies(events, result.selected), query)
  return {
    policy: "intent-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function selectExperienceFrontier(events: readonly Event[], budget: number, activeFiles: Set<string>, query: string): Selection {
  if (!events.some((event) => event.kind === "experience")) {
    const best = selectOfficialFrontier(events, budget, activeFiles, query)
    return {
      policy: "experience-frontier",
      budget,
      tokens: best.tokens,
      events: best.events,
    }
  }
  const queryTermSet = terms(query)
  const corpus = corpusStats(events)
  const required = fit(
    events
      .filter((event) => event.mustPreserve)
      .toSorted((a, b) => scoreEvent(b, events, activeFiles) - scoreEvent(a, events, activeFiles)),
    budget,
    { preserveRequired: true },
  )
  const initial: { readonly selected: readonly Event[]; readonly tokens: number } = {
    selected: required,
    tokens: required.reduce((total, event) => total + event.tokens, 0),
  }
  const result = events.reduce(
    (current) => {
      const candidate = events
        .filter((event) => !current.selected.some((item) => item.id === event.id))
        .filter((event) => current.tokens + event.tokens <= budget || event.mustPreserve)
        .toSorted((a, b) => {
          const score =
            experienceSelectionScore(b, events, activeFiles, current.selected, queryTermSet, corpus) -
            experienceSelectionScore(a, events, activeFiles, current.selected, queryTermSet, corpus)
          if (score !== 0) return score
          return density(b, events, activeFiles) - density(a, events, activeFiles)
        })[0]
      if (!candidate) return current
      return {
        selected: [...current.selected, candidate],
        tokens: current.tokens + candidate.tokens,
      }
    },
    initial,
  )
  const selected = withDependencies(events, result.selected).toSorted((a, b) => a.order - b.order)
  return {
    policy: "experience-frontier",
    budget,
    tokens: selected.reduce((total, event) => total + event.tokens, 0),
    events: selected,
  }
}

function fit(events: readonly Event[], budget: number, options: { readonly preserveRequired: boolean }) {
  return events.reduce<{ readonly selected: readonly Event[]; readonly tokens: number }>(
    (result, event) => {
      if (result.selected.some((item) => item.id === event.id)) return result
      const tokens = result.tokens + event.tokens
      if (tokens > budget && (!options.preserveRequired || !event.mustPreserve)) return result
      return {
        selected: [...result.selected, event],
        tokens,
      }
    },
    { selected: [], tokens: 0 },
  ).selected
}

function withDependencies(events: readonly Event[], selected: readonly Event[]) {
  const byID = new Map(events.map((event) => [event.id, event]))
  const dependencyIDs = new Set(selected.flatMap((event) => event.dependencies))
  return [
    ...selected,
    ...Array.from(dependencyIDs)
      .flatMap((id) => {
        const event = byID.get(id)
        return event ? [event] : []
      })
      .filter((event) => !selected.some((item) => item.id === event.id)),
  ]
}

function scoreEvent(event: Event, events: readonly Event[], activeFiles: Set<string>) {
  return (
    (event.mustPreserve ? 1_000 : 0) +
    kindWeight(event.kind) +
    (event.recoverability === "low" ? 40 : event.recoverability === "high" ? -20 : 0) +
    (event.files.some((file) => activeFiles.has(file)) ? 40 : 0) +
    (events.some((item) => item.dependencies.includes(event.id)) ? 25 : 0) -
    (event.tokens > 800 && event.recoverability === "high" ? 60 : 0)
  )
}

function diverseScore(
  event: Event,
  events: readonly Event[],
  activeFiles: Set<string>,
  selected: readonly Event[],
) {
  const selectedFiles = new Set(selected.flatMap((item) => item.files))
  const kindPenalty =
    (event.kind === "synthetic" || event.kind === "code-context"
      ? 0
      : selected.filter((item) => item.kind === event.kind).length) * 35
  const filePenalty = event.files.filter((file) => selectedFiles.has(file)).length * 20
  return scoreEvent(event, events, activeFiles) - kindPenalty - filePenalty
}

function queryScore(
  event: Event,
  events: readonly Event[],
  activeFiles: Set<string>,
  selected: readonly Event[],
  queryTerms: ReadonlySet<string>,
) {
  const eventTerms = terms(`${event.summary}\n${event.files.join("\n")}`)
  const overlap = Array.from(queryTerms).filter((term) => eventTerms.has(term)).length
  return diverseScore(event, events, activeFiles, selected) + overlap * 18
}

function relevanceScore(
  event: Event,
  events: readonly Event[],
  activeFiles: Set<string>,
  selected: readonly Event[],
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  const lexical = bm25(event, queryTerms, corpus)
  const retrievalBoost =
    event.kind === "code-context" ? 90 : event.kind === "diff" ? 70 : event.spans?.length ? 50 : 0
  const activeFileCodeContextPenalty =
    queryTerms.size > 0 && event.kind === "code-context" && event.files.some((file) => activeFiles.has(file)) ? 40 : 0
  const evidencePenalty =
    queryTerms.size === 0 || event.mustPreserve
      ? 0
      : event.kind === "shell" || event.kind === "tool-result"
        ? 45
        : event.kind === "test-evidence"
          ? 35
          : event.kind === "tool-call"
            ? 70
            : 0
  return (
    diverseScore(event, events, activeFiles, selected) +
    lexical * 42 +
    retrievalBoost +
    pathPrior(event, queryTerms) -
    evidencePenalty -
    activeFileCodeContextPenalty
  )
}

function coherenceScore(
  event: Event,
  events: readonly Event[],
  activeFiles: Set<string>,
  selected: readonly Event[],
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  const selectedCodeFiles = new Set(
    selected
      .filter((item) => item.kind === "code-context" || item.kind === "diff")
      .flatMap((item) => item.files),
  )
  const sharedCodeFileBoost =
    event.kind === "code-context" && event.files.some((file) => selectedCodeFiles.has(file)) ? 115 : 0
  const selectedFiles = new Set(selected.flatMap((item) => item.files))
  const unexploredFileBoost =
    event.kind === "code-context" && event.files.length > 0 && event.files.every((file) => !selectedFiles.has(file)) ? 12 : 0
  return relevanceScore(event, events, activeFiles, selected, queryTerms, corpus) + sharedCodeFileBoost + unexploredFileBoost
}

function rankedFiles(
  events: readonly Event[],
  activeFiles: Set<string>,
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  return unique(events.flatMap((event) => event.files)).toSorted(
    (a, b) =>
      fileScore(b, events, activeFiles, queryTerms, corpus) - fileScore(a, events, activeFiles, queryTerms, corpus) ||
      a.localeCompare(b),
  )
}

function fileScore(
  file: string,
  events: readonly Event[],
  activeFiles: Set<string>,
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  const scores = events
    .filter((event) => event.files.includes(file))
    .map((event) => relevanceScore(event, events, activeFiles, [], queryTerms, corpus))
    .toSorted((a, b) => b - a)
  const [best = 0, second = 0, third = 0] = scores
  return best + second * 0.35 + third * 0.15
}

function fileClusterScore(
  event: Event,
  file: string,
  events: readonly Event[],
  activeFiles: Set<string>,
  selected: readonly Event[],
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  const fileBoost = event.files.includes(file) ? 35 : 0
  const selectedFileBoost = selected.some((item) => item.files.includes(file)) ? 80 : 0
  return relevanceScore(event, events, activeFiles, selected, queryTerms, corpus) + fileBoost + selectedFileBoost
}

function fusionRankMaps(
  events: readonly Event[],
  budget: number,
  activeFiles: Set<string>,
  query: string,
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  const scoredRanks = [
    scoreRankMap(events, (event) => relevanceScore(event, events, activeFiles, [], queryTerms, corpus)),
    scoreRankMap(events, (event) => coherenceScore(event, events, activeFiles, [], queryTerms, corpus)),
    scoreRankMap(events, (event) => fileConsensusScore(event, events, activeFiles, queryTerms, corpus)),
    scoreRankMap(events, (event) => scoreEvent(event, events, activeFiles)),
  ]
  const selectionRanks = [
    selectRelevanceFrontier(events, budget, activeFiles, query),
    selectCoherenceFrontier(events, budget, activeFiles, query),
    selectFileFrontier(events, budget, activeFiles, query),
    selectAdaptiveFrontier(events, budget, activeFiles, query),
  ].map((selection) => rankMap(selection.events))
  return [...scoredRanks, ...selectionRanks]
}

function scoreRankMap(events: readonly Event[], score: (event: Event) => number) {
  return rankMap(
    events.toSorted((a, b) => {
      const delta = score(b) - score(a)
      if (delta !== 0) return delta
      return b.order - a.order
    }),
  )
}

function rankMap(events: readonly Event[]) {
  return new Map(events.map((event, index) => [event.id, index + 1]))
}

function fileConsensusScore(
  event: Event,
  events: readonly Event[],
  activeFiles: Set<string>,
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  const fileScoreBest = Math.max(0, ...event.files.map((file) => fileScore(file, events, activeFiles, queryTerms, corpus)))
  return fileScoreBest + relevanceScore(event, events, activeFiles, [], queryTerms, corpus) * 0.2
}

function fusionScore(
  event: Event,
  events: readonly Event[],
  activeFiles: Set<string>,
  selected: readonly Event[],
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
  rankMaps: readonly ReadonlyMap<string, number>[],
) {
  const reciprocalRankScore = rankMaps.reduce((total, ranks) => {
    const rank = ranks.get(event.id)
    return rank ? total + 1 / (12 + rank) : total
  }, 0)
  return (
    (event.mustPreserve ? 1_000 : 0) +
    reciprocalRankScore * 100 +
    sameSelectedCodeFileBonus(event, selected) +
    pathPrior(event, queryTerms) * 0.25 +
    Math.max(0, relevanceScore(event, events, activeFiles, selected, queryTerms, corpus)) * 0.04
  )
}

function precisionRequired(event: Event) {
  if (lowValueContext(event.summary)) return false
  if (!event.mustPreserve) return false
  if (event.kind !== "user-goal" && event.kind !== "synthetic") return true
  return anchorContext(event.summary)
}

function precisionScore(
  event: Event,
  events: readonly Event[],
  activeFiles: Set<string>,
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  if (lowValueContext(event.summary)) return -1_000
  const preserveBoost = precisionRequired(event) ? 700 : 0
  const base = scoreEvent(event, events, activeFiles) - (event.mustPreserve ? 1_000 : 0)
  const lexical = relevanceScore(event, events, activeFiles, [], queryTerms, corpus) * 0.18
  const anchorBoost = anchorContext(event.summary) ? 180 : 0
  const exactBoost = exactFactScore(event.summary)
  const evidenceBoost = event.kind === "test-evidence" ? 90 : event.kind === "diff" ? 70 : 0
  return base + preserveBoost + lexical + anchorBoost + exactBoost + evidenceBoost
}

function sameSelectedCodeFileBonus(event: Event, selected: readonly Event[]) {
  if (event.kind !== "code-context" && event.kind !== "diff") return 0
  const selectedCodeFiles = new Set(
    selected
      .filter((item) => item.kind === "code-context" || item.kind === "diff")
      .flatMap((item) => item.files),
  )
  return event.files.some((file) => selectedCodeFiles.has(file)) ? 14 : 0
}

function selectionQuality(
  selection: Selection,
  events: readonly Event[],
  activeFiles: Set<string>,
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
  budget: number,
) {
  const selected = selection.events
  const score = selected.reduce(
    (total, event, index) =>
      total + Math.max(0, relevanceScore(event, events, activeFiles, selected.slice(0, index), queryTerms, corpus)),
    0,
  )
  const classes = selected.flatMap((event) => event.files.map(pathClass))
  const nonImplementationPenalty = classes.filter((item) => item !== "implementation").length * 28
  const fileGroups = Map.groupBy(
    selected.filter((event) => event.kind === "code-context" || event.kind === "diff").flatMap((event) => event.files),
    (file) => file,
  )
  const clusterBonus = Array.from(fileGroups.values()).reduce((total, files) => total + Math.min(3, files.length) * 14, 0)
  const underfillPenalty = selection.tokens < budget * 0.55 ? (budget * 0.55 - selection.tokens) * 0.08 : 0
  const tokenPenalty = Math.max(0, selection.tokens - budget) * 0.12
  return score / Math.sqrt(Math.max(1, selection.tokens)) + clusterBonus - nonImplementationPenalty - underfillPenalty - tokenPenalty
}

function policyPreference(policy: SelectionPolicy) {
  return selectionPolicyOrder(policy)
}

type CorpusStats = {
  readonly documents: number
  readonly averageLength: number
  readonly frequencyByEvent: ReadonlyMap<string, ReadonlyMap<string, number>>
  readonly documentFrequency: ReadonlyMap<string, number>
}

function corpusStats(events: readonly Event[]) {
  const frequencyByEvent = new Map(events.map((event) => [event.id, termFrequency(eventText(event))]))
  const documentFrequency = new Map<string, number>()
  for (const frequencies of frequencyByEvent.values()) {
    for (const term of frequencies.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
    }
  }
  const lengths = Array.from(frequencyByEvent.values(), (frequencies) =>
    Array.from(frequencies.values()).reduce((total, frequency) => total + frequency, 0),
  )
  return {
    documents: events.length,
    averageLength: lengths.reduce((total, length) => total + length, 0) / Math.max(1, lengths.length),
    frequencyByEvent,
    documentFrequency,
  } satisfies CorpusStats
}

function bm25(event: Event, queryTerms: ReadonlySet<string>, corpus: CorpusStats) {
  const frequencies = corpus.frequencyByEvent.get(event.id)
  if (!frequencies || queryTerms.size === 0) return 0
  const length = Array.from(frequencies.values()).reduce((total, frequency) => total + frequency, 0)
  return Array.from(queryTerms).reduce((total, term) => {
    const frequency = frequencies.get(term) ?? 0
    if (frequency === 0) return total
    const documentFrequency = corpus.documentFrequency.get(term) ?? 0
    const idf = Math.log(1 + (corpus.documents - documentFrequency + 0.5) / (documentFrequency + 0.5))
    const denominator = frequency + 1.2 * (1 - 0.75 + 0.75 * (length / Math.max(1, corpus.averageLength)))
    return total + idf * ((frequency * 2.2) / denominator)
  }, 0)
}

function termFrequency(input: string) {
  return termList(input).reduce((frequencies, term) => {
    frequencies.set(term, (frequencies.get(term) ?? 0) + 1)
    return frequencies
  }, new Map<string, number>())
}

function eventText(event: Event) {
  return `${event.summary}\n${event.files.join("\n")}\n${(event.spans ?? []).map((span) => `${span.file}:${span.start}-${span.end}`).join("\n")}`
}

function pathPrior(event: Event, queryTerms: ReadonlySet<string>) {
  if (event.kind !== "code-context" && event.kind !== "diff") return 0
  const classes = event.files.map(pathClass)
  const testPenalty = queryWantsTestContext(queryTerms) ? 6 : 32
  return classes.reduce((score, item) => {
    if (item === "implementation") return score + 24
    if (item === "test") return score - testPenalty
    if (item === "docs") return score - 24
    if (item === "generated") return score - 30
    if (item === "fixture") return score - 18
    return score
  }, 0)
}

function pathClass(file: string) {
  const normalized = file.toLowerCase()
  const segments = normalized.split(/[\\/]+/).filter(Boolean)
  const basename = segments.at(-1) ?? normalized
  if (
    normalized.includes(".generated.") ||
    normalized.includes(".gen.") ||
    normalized.includes(".snap.") ||
    segments.includes("generated") ||
    segments.includes("__generated__") ||
    segments.includes("dist") ||
    segments.includes("build") ||
    segments.includes("vendor")
  )
    return "generated"
  if (
    segments.includes("test") ||
    segments.includes("tests") ||
    segments.includes("__tests__") ||
    basename.endsWith("_test.py") ||
    basename.endsWith("_test.go") ||
    basename.endsWith(".test.ts") ||
    basename.endsWith(".test.tsx") ||
    basename.endsWith(".spec.ts") ||
    basename.endsWith(".spec.tsx")
  )
    return "test"
  if (
    segments.includes("docs") ||
    segments.includes("doc") ||
    basename.endsWith(".md") ||
    basename.endsWith(".rst") ||
    basename.endsWith(".txt")
  )
    return "docs"
  if (
    segments.includes("fixture") ||
    segments.includes("fixtures") ||
    segments.includes("example") ||
    segments.includes("examples") ||
    segments.includes("sample") ||
    segments.includes("samples")
  )
    return "fixture"
  return "implementation"
}

function queryWantsTestContext(queryTerms: ReadonlySet<string>) {
  return ["test", "testing", "pytest", "fixture", "assert", "assertion", "regression"].some((term) => queryTerms.has(term))
}

function actionAwareOrder(events: readonly Event[], query: string) {
  const target = actionTarget(query)
  const original = new Map(events.map((event, index) => [event.id, index]))
  return events.toSorted((a, b) => {
    const score = actionEventScore(b, target, query) - actionEventScore(a, target, query)
    if (score !== 0) return score
    return (original.get(a.id) ?? 0) - (original.get(b.id) ?? 0)
  })
}

function actionTarget(query: string): "test" | "implementation" | "packet" {
  const parsed = parseQueryRecord(query)
  if (typeof parsed?.changed_file === "string") return "test"
  if (typeof parsed?.path === "string" || typeof parsed?.given_file === "string") return "packet"
  const queryTerms = terms(query)
  if (queryWantsTestContext(queryTerms)) return "test"
  return "implementation"
}

function actionEventScore(event: Event, target: "test" | "implementation" | "packet", query: string) {
  if (target === "packet") return 0
  if (event.kind !== "code-context" && event.kind !== "diff") return 0
  const queryTerms = terms(query)
  const overlap = Array.from(queryTerms).filter((term) => terms(eventText(event)).has(term)).length
  const pathScore = event.files.reduce((score, file) => score + actionPathScore(pathClass(file), target), 0)
  return pathScore + overlap + (event.kind === "code-context" ? 2 : 1)
}

function intentSelectionScore(
  event: Event,
  events: readonly Event[],
  activeFiles: Set<string>,
  selected: readonly Event[],
  query: string,
  target: "test" | "implementation",
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  const selectedFiles = new Set(selected.flatMap((item) => item.files))
  const duplicateFilePenalty = event.files.filter((file) => selectedFiles.has(file)).length * 14
  const newTargetFileBonus =
    event.files.length > 0 &&
    event.files.every((file) => !selectedFiles.has(file)) &&
    event.files.some((file) => actionPathScore(pathClass(file), target) > 0)
      ? 36
      : 0
  return (
    scoreEvent(event, events, activeFiles) * 0.25 +
    relevanceScore(event, events, activeFiles, selected, queryTerms, corpus) * 0.45 +
    actionEventScore(event, target, query) * 9 +
    newTargetFileBonus -
    duplicateFilePenalty
  )
}

function experienceSelectionScore(
  event: Event,
  events: readonly Event[],
  activeFiles: Set<string>,
  selected: readonly Event[],
  queryTerms: ReadonlySet<string>,
  corpus: CorpusStats,
) {
  const base =
    scoreEvent(event, events, activeFiles) * 0.2 +
    relevanceScore(event, events, activeFiles, selected, queryTerms, corpus) * 0.45
  if (event.kind === "experience") {
    const selectedExperienceCount = selected.filter((item) => item.kind === "experience").length
    return base + 65 + experienceCandidateCoverageScore(event, events) - selectedExperienceCount * 45
  }
  const selectedExperiences = selected.filter((item) => item.kind === "experience")
  const selectedLink = experienceLinkScore(event, selectedExperiences)
  const unselectedLink =
    selectedExperiences.length === 0 ? experienceLinkScore(event, events.filter((item) => item.kind === "experience")) * 0.15 : 0
  return (
    base +
    selectedLink +
    unselectedLink +
    sameSelectedCodeFileBonus(event, selected) -
    duplicateCoveragePenalty(event, selected) * 35
  )
}

function experienceCandidateCoverageScore(experience: Event, events: readonly Event[]) {
  if (experience.kind !== "experience") return 0
  return Math.max(
    0,
    ...events
      .filter((event) => event.kind === "code-context" || event.kind === "diff")
      .map((event) => experienceLinkScore(event, [experience])),
  )
}

function experienceLinkScore(event: Event, experiences: readonly Event[]) {
  if (event.kind !== "code-context" && event.kind !== "diff") return 0
  const eventFiles = new Set(event.files)
  const eventSpans = event.spans ?? []
  return experiences.reduce((score, experience) => {
    const fileOverlap = experience.files.filter((file) => eventFiles.has(file)).length
    const spanOverlap = experienceSpanOverlapRatio(eventSpans, experience.spans ?? [])
    return score + fileOverlap * 58 + spanOverlap * 95
  }, 0)
}

function experienceSpanOverlapRatio(eventSpans: readonly Span[], experienceSpans: readonly Span[]) {
  const normalized = coverageMergeSpans(eventSpans)
  const experience = coverageMergeSpans(experienceSpans)
  const lines = normalized.reduce((total, span) => total + spanLineCount(span), 0)
  if (lines === 0 || experience.length === 0) return 0
  const overlap = normalized.reduce(
    (total, span) => total + experience.reduce((subtotal, item) => subtotal + spanLineOverlap(span, item), 0),
    0,
  )
  return Math.min(1, overlap / lines)
}

function selectionIntentTarget(query: string): "test" | "implementation" | undefined {
  const parsed = parseQueryRecord(query)
  if (!parsed) return undefined
  if (typeof parsed.changed_file === "string") return "test"
  if (Array.isArray(parsed.changed_files) && parsed.changed_files.some((item) => typeof item === "string")) return "test"
  return undefined
}

function actionPathScore(pathClass: string, target: "test" | "implementation") {
  if (target === "test") {
    if (pathClass === "test") return 30
    if (pathClass === "implementation") return 3
    return -4
  }
  if (pathClass === "implementation") return 18
  if (pathClass === "test") return -6
  if (pathClass === "docs") return -3
  return 0
}

function parseQueryRecord(query: string) {
  try {
    const parsed: unknown = JSON.parse(query)
    return isRecord(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function density(event: Event, events: readonly Event[], activeFiles: Set<string>) {
  return Math.round((scoreEvent(event, events, activeFiles) / Math.max(1, event.tokens)) * 100)
}

function kindWeight(kind: EventKind) {
  const weights = {
    instruction: 160,
    "user-goal": 140,
    "test-evidence": 120,
    "code-context": 115,
    diff: 110,
    synthetic: 100,
    experience: 95,
    compaction: 90,
    "tool-result": 70,
    shell: 55,
    "assistant-note": 45,
    "tool-call": 25,
  } satisfies Record<EventKind, number>
  return weights[kind]
}

function activeFiles(events: readonly Event[]) {
  return Array.from(
    new Set(
      events
        .filter((event) => event.kind === "diff" || event.kind === "test-evidence" || event.kind === "user-goal")
        .flatMap((event) => event.files),
    ),
  )
}

function section(title: string, events: readonly Event[], kinds: readonly EventKind[]) {
  const sectionEvents = events.filter((event) => kinds.includes(event.kind))
  if (sectionEvents.length === 0) return ""
  return [
    `## ${title}`,
    ...sectionEvents.map((event) =>
      [
        `- [${event.id}] ${event.summary}`,
        `  source: ${event.source}`,
        event.files.length ? `  files: ${event.files.join(", ")}` : "",
        event.spans?.length ? `  spans: ${event.spans.map((span) => `${span.file}:${span.start}-${span.end}`).join(", ")}` : "",
        event.dependencies.length ? `  depends_on: ${event.dependencies.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n")
}

function shellKind(command: string, output: string): EventKind {
  const text = `${command}\n${output}`.toLowerCase()
  if (text.includes("diff --git") || command.includes("git diff")) return "diff"
  if (
    command.includes("test") ||
    command.includes("pytest") ||
    command.includes("vitest") ||
    command.includes("jest") ||
    command.includes("cargo test") ||
    command.includes("go test") ||
    text.includes("failed") ||
    text.includes("assertion")
  )
    return "test-evidence"
  return "shell"
}

function toolKind(name: string, output: string): EventKind {
  const text = `${name}\n${output}`.toLowerCase()
  if (text.includes("diff --git") || name.includes("edit") || name.includes("write")) return "diff"
  if (text.includes("failed") || text.includes("passed") || text.includes("assertion")) return "test-evidence"
  return "tool-result"
}

function serializedKind(summary: string): EventKind {
  const lower = summary.toLowerCase()
  if (lower.startsWith("[system update]:")) return "instruction"
  if (lower.startsWith("[user]:")) return "user-goal"
  if (lower.startsWith("[prior experience]:")) return "experience"
  if (lower.startsWith("[synthetic context]:")) return "synthetic"
  if (lower.startsWith("[assistant]:")) return "assistant-note"
  if (lower.startsWith("[assistant reasoning]:")) return "assistant-note"
  if (lower.startsWith("[assistant tool call]:")) return "tool-call"
  if (lower.startsWith("[tool error]:")) return "test-evidence"
  if (lower.startsWith("[tool result]:")) return toolKind("tool", summary)
  if (lower.startsWith("[shell]:")) return shellKind(summary, summary)
  if (lower.startsWith("[compaction]:")) return "compaction"
  return "synthetic"
}

function serializedRecoverability(kind: EventKind): Recoverability {
  if (
    kind === "instruction" ||
    kind === "user-goal" ||
    kind === "test-evidence" ||
    kind === "compaction" ||
    kind === "synthetic"
  )
    return "low"
  if (kind === "experience") return "medium"
  return "medium"
}

function serializedMustPreserve(kind: EventKind, summary: string) {
  if (lowValueContext(summary)) return false
  if (kind === "user-goal") return anchorContext(summary)
  return (
    kind === "instruction" ||
    kind === "test-evidence" ||
    kind === "compaction" ||
    kind === "synthetic"
  )
}

function lowValueContext(summary: string) {
  const lower = summary.toLowerCase()
  return (
    lower.includes("distractor") ||
    lower.includes("unrelated") ||
    lower.includes("temporary marker") ||
    lower.includes("flaky and is not") ||
    lower.includes("not part of") ||
    lower.includes("noise/") ||
    lower.includes("noisycandidate")
  )
}

function anchorContext(summary: string) {
  const lower = summary.toLowerCase()
  return (
    lower.includes("critical") ||
    lower.includes("preserve") ||
    lower.includes("must ") ||
    lower.includes("do not") ||
    lower.includes("exactly") ||
    lower.includes("decision") ||
    lower.includes("constraint") ||
    lower.includes("passed") ||
    lower.includes("failed") ||
    lower.includes("active task") ||
    lower.includes("fix ") ||
    lower.includes("debug") ||
    lower.includes("implement") ||
    lower.includes("continue") ||
    paths(summary).length > 0 ||
    /[A-Z][A-Z0-9_]{3,}/.test(summary)
  )
}

function exactFactScore(summary: string) {
  let score = 0
  if (/[A-Z][A-Z0-9_]{3,}/.test(summary)) score += 65
  if (/[a-z0-9]+(?:-[a-z0-9]+){2,}/i.test(summary)) score += 40
  if (paths(summary).length > 0) score += 55
  if (summary.includes("::")) score += 45
  if (/\b\d+\s+(attempt|attempts|token|tokens|line|lines)\b/i.test(summary)) score += 30
  return score
}

function serializedChunks(input: string) {
  const lines = input
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
  return lines
    .reduce<readonly string[]>(
      (chunks, line) => {
        if (!SERIALIZED_PREFIX_PATTERN.test(line)) {
          const last = chunks.at(-1)
          if (!last) return [line]
          return [...chunks.slice(0, -1), `${last}\n${line}`]
        }
        return [...chunks, line]
      },
      [],
    )
    .flatMap(expandSerializedChunk)
    .map((chunk) => chunk.trim())
}

function expandSerializedChunk(chunk: string) {
  const lines = chunk
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length <= 1) return [chunk]
  const match = lines[0].match(/^(\[[A-Za-z][A-Za-z -]*\]:)\s*(.*)$/)
  if (!match) return [chunk]
  const [, prefix, first] = match
  if (prefix !== "[User]:" && prefix !== "[System update]:" && prefix !== "[Synthetic context]:") return [chunk]
  return [first ? `${prefix} ${first}` : prefix, ...lines.slice(1).map((line) => `${prefix} ${line}`)]
}

function toolOutput(state: SessionMessage.AssistantTool["state"]) {
  if (state.status === "completed")
    return (
      state.content
        .map((item) => (item.type === "text" ? item.text : `[Attached ${item.mime}${item.name ? `: ${item.name}` : ""}]`))
        .join("\n") || stringify(state.structured)
    )
  if (state.status === "error") return state.error.message
  return stringify(state.input)
}

function toolFiles(name: string, state: SessionMessage.AssistantTool["state"]) {
  const input = "input" in state ? state.input : undefined
  const inputFiles = input && typeof input === "object" ? inputPathFiles(input) : []
  const structured = "structured" in state ? state.structured : undefined
  if (!structured) return inputFiles
  if (name === "grep" || name === "glob") return unique([...inputFiles, ...structuredEntryFiles(structured)])
  return inputFiles
}

function toolSpans(name: string, state: SessionMessage.AssistantTool["state"]) {
  if (!("structured" in state)) return []
  if (name === "read") return readToolSpans(state.input, state.structured)
  if (name === "grep") return grepToolSpans(state.structured)
  return []
}

function readToolSpans(input: Record<string, unknown>, structured: Record<string, unknown>) {
  const file = inputPath(input)
  if (!file) return []
  if (structured.type === "text-page" && typeof structured.content === "string") {
    const start = numberField(structured, "offset") ?? 1
    return [{ file, start, end: start + lineCount(structured.content) - 1 }]
  }
  if (structured.encoding === "utf8" && typeof structured.content === "string") {
    return [{ file, start: 1, end: lineCount(structured.content) }]
  }
  return []
}

function grepToolSpans(structured: Record<string, unknown>) {
  return structuredRecords(structured).flatMap((match) => {
    const entry = recordField(match, "entry")
    const file = entry ? stringField(entry, "path") : undefined
    const line = numberField(match, "line")
    return file && line !== undefined ? [{ file, start: line, end: line }] : []
  })
}

function structuredEntryFiles(structured: Record<string, unknown>) {
  return structuredRecords(structured).flatMap((item) => {
    const entry = recordField(item, "entry")
    return [stringField(item, "path"), entry ? stringField(entry, "path") : undefined].filter((value): value is string =>
      Boolean(value),
    )
  })
}

function structuredRecords(structured: Record<string, unknown>) {
  const value = Array.isArray(structured.value) ? structured.value : Array.isArray(structured.entries) ? structured.entries : []
  return value.filter(isRecord)
}

function inputPathFiles(input: Record<string, unknown>) {
  return unique(["path", "filePath", "filepath", "file"].flatMap((key) => {
    const value = stringField(input, key)
    return value ? [value] : []
  }))
}

function inputPath(input: Record<string, unknown>) {
  return inputPathFiles(input)[0]
}

function recordField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return isRecord(value) ? value : undefined
}

function stringField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return typeof value === "string" ? value : undefined
}

function numberField(input: Record<string, unknown>, key: string) {
  const value = input[key]
  return typeof value === "number" ? value : undefined
}

function lineCount(input: string) {
  const text = input.endsWith("\n") ? input.slice(0, -1) : input
  return Math.max(1, text.split(/\r?\n/).length)
}

function unique(values: readonly string[]) {
  return values.filter((value, index) => values.indexOf(value) === index)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function paths(input: string) {
  return Array.from(input.matchAll(PATH_PATTERN), (match) => match[1]).filter(
    (value, index, values) => values.indexOf(value) === index,
  )
}

function stringify(input: unknown) {
  if (typeof input === "string") return input
  const text = JSON.stringify(input)
  return text ?? ""
}

function truncate(input: string) {
  if (input.length <= MAX_SUMMARY_CHARS) return input
  return `${input.slice(0, MAX_SUMMARY_CHARS)}\n[truncated]`
}

function terms(input: string) {
  return new Set(termList(input))
}

function termList(input: string) {
  return input
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(normalizeTerm)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term))
}

function normalizeTerm(term: string) {
  if (STOP_WORDS.has(term)) return term
  if (term.length > 5 && term.endsWith("ies")) return `${term.slice(0, -3)}y`
  if (term.length > 5 && term.endsWith("ing")) return term.slice(0, -3)
  if (term.length > 4 && term.endsWith("ed")) return term.slice(0, -2)
  if (term.length > 4 && term.endsWith("es")) return term.slice(0, -2)
  if (term.length > 4 && term.endsWith("s") && !term.endsWith("ss")) return term.slice(0, -1)
  return term
}
