export * as ConfigCompaction from "./compaction"

import { Schema } from "effect"
import { NonNegativeInt } from "../schema"
import { SessionContextLedgerPolicy } from "../session/context-ledger-policy"

export class Keep extends Schema.Class<Keep>("ConfigV2.Compaction.Keep")({
  tokens: NonNegativeInt.pipe(Schema.optional),
}) {}

export class ContextLedger extends Schema.Class<ContextLedger>("ConfigV2.Compaction.ContextLedger")({
  enabled: Schema.Boolean.pipe(Schema.optional).annotate({
    description: "Include a provenance-preserving ContextLedger packet in compaction prompts",
  }),
  policy: Schema.Literals(SessionContextLedgerPolicy.SELECTION_POLICIES).pipe(Schema.optional).annotate({
    description: "ContextLedger selection policy used for compaction packets",
  }),
  budget: NonNegativeInt.pipe(Schema.optional).annotate({
    description: "Token budget for the ContextLedger packet inside compaction prompts",
  }),
  mode: Schema.Literals(SessionContextLedgerPolicy.INPUT_MODES).pipe(Schema.optional).annotate({
    description:
      "How ContextLedger participates in compaction: augment the raw old history or replace it with the ledger packet",
  }),
}) {}

export class Info extends Schema.Class<Info>("ConfigV2.Compaction")({
  auto: Schema.Boolean.pipe(Schema.optional),
  prune: Schema.Boolean.pipe(Schema.optional),
  keep: Keep.pipe(Schema.optional),
  buffer: NonNegativeInt.pipe(Schema.optional),
  context_ledger: ContextLedger.pipe(Schema.optional),
}) {}
