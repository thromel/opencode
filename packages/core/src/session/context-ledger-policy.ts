export * as SessionContextLedgerPolicy from "./context-ledger-policy"

export const SELECTION_POLICIES = [
  "recency",
  "balanced-frontier",
  "diverse-frontier",
  "query-frontier",
  "relevance-frontier",
  "coherence-frontier",
  "file-frontier",
  "adaptive-frontier",
  "fusion-frontier",
  "portfolio-frontier",
  "robust-frontier",
  "utility-frontier",
  "target-balanced-frontier",
  "official-frontier",
  "precision-frontier",
  "exploration-frontier",
  "candidate-rank-frontier",
  "budget-rank-frontier",
  "rank-portfolio-frontier",
  "coverage-rank-frontier",
  "mmr-rank-frontier",
  "action-aware-frontier",
  "intent-frontier",
  "experience-frontier",
] as const

export type SelectionPolicy = (typeof SELECTION_POLICIES)[number]

export const INPUT_MODES = ["augment", "replace"] as const
export type InputMode = (typeof INPUT_MODES)[number]

export const DEFAULT_CONTEXT_BUDGET = 2_500
export const DEFAULT_SELECTION_POLICY = "official-frontier" satisfies SelectionPolicy
export const DEFAULT_INPUT_MODE = "augment" satisfies InputMode

const SELECTION_POLICY_ORDER = {
  recency: 0,
  "balanced-frontier": 1,
  "diverse-frontier": 2,
  "query-frontier": 3,
  "relevance-frontier": 4,
  "coherence-frontier": 5,
  "file-frontier": 6,
  "adaptive-frontier": 7,
  "fusion-frontier": 8,
  "portfolio-frontier": 9,
  "robust-frontier": 10,
  "utility-frontier": 11,
  "target-balanced-frontier": 12,
  "official-frontier": 13,
  "precision-frontier": 14,
  "exploration-frontier": 15,
  "candidate-rank-frontier": 16,
  "budget-rank-frontier": 17,
  "rank-portfolio-frontier": 18,
  "coverage-rank-frontier": 19,
  "mmr-rank-frontier": 20,
  "action-aware-frontier": 21,
  "intent-frontier": 22,
  "experience-frontier": 23,
} satisfies Record<SelectionPolicy, number>

export function selectionPolicyOrder(policy: SelectionPolicy) {
  return SELECTION_POLICY_ORDER[policy]
}
