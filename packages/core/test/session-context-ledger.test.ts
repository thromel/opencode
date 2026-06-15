import { describe, expect, test } from "bun:test"
import { DateTime } from "effect"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { ModelV2 } from "@opencode-ai/core/model"
import { buildPrompt } from "@opencode-ai/core/session/compaction"
import { SessionContextLedger } from "@opencode-ai/core/session/context-ledger"
import { SessionMessage } from "@opencode-ai/core/session/message"

const created = DateTime.makeUnsafe(0)
const id = (value: string) => SessionMessage.ID.make(`msg_${value}`)
const model = { providerID: ProviderV2.ID.make("opencode"), id: ModelV2.ID.make("gpt-5.4") }

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

describe("SessionContextLedger", () => {
  test("selects typed constraints and test evidence better than recency under pressure", () => {
    const events = SessionContextLedger.fromEntries(entries)
    const goldIDs = ["msg_system:system", "msg_user:user", "msg_testfail:shell", "msg_assistant:text:text-1"]
    const recency = SessionContextLedger.select({ events, policy: "recency", budget: 90 })
    const ledger = SessionContextLedger.select({
      events,
      policy: "balanced-frontier",
      budget: 90,
      activeFiles: ["src/config.ts", "tests/config.test.ts"],
    })

    expect(SessionContextLedger.evaluate({ selected: ledger.events, goldIDs }).recall).toBeGreaterThan(
      SessionContextLedger.evaluate({ selected: recency.events, goldIDs }).recall,
    )
    expect(ledger.events.map((event) => event.id)).toContain("msg_system:system")
    expect(ledger.events.map((event) => event.id)).toContain("msg_testfail:shell")
  })

  test("uses the benchmark-backed official policy by default", () => {
    const events = SessionContextLedger.fromEntries(entries)
    const selection = SessionContextLedger.select({
      events,
      budget: 120,
      activeFiles: ["src/config.ts", "tests/config.test.ts"],
    })
    const overridden = SessionContextLedger.select({
      events,
      policy: "balanced-frontier",
      budget: 120,
      activeFiles: ["src/config.ts", "tests/config.test.ts"],
    })
    const packet = SessionContextLedger.compile({
      entries,
      budget: 120,
      activeFiles: ["src/config.ts", "tests/config.test.ts"],
    })

    expect(SessionContextLedger.DEFAULT_SELECTION_POLICY).toBe("official-frontier")
    expect(selection.policy).toBe("official-frontier")
    expect(packet.selection.policy).toBe("official-frontier")
    expect(overridden.policy).toBe("balanced-frontier")
  })

  test("exposes one canonical ordered selection policy list", () => {
    expect(SessionContextLedger.SELECTION_POLICIES).toEqual([
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
    ])
    expect(SessionContextLedger.selectionPolicyOrder("recency")).toBeLessThan(
      SessionContextLedger.selectionPolicyOrder("experience-frontier"),
    )
  })

  test("experience frontier lets prior experience guide current code retention", () => {
    const events = [
      {
        id: "prior-parser-fallback",
        kind: "experience",
        order: 50,
        summary: "Prior parser fallback fix touched src/parser.ts around the fallback branch.",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/parser.ts"],
        spans: [{ file: "src/parser.ts", start: 10, end: 20 }],
        tokens: 45,
        source: "experience:prior-parser-fallback",
        dependencies: [],
      },
      {
        id: "target-parser",
        kind: "code-context",
        order: 100,
        summary: "src/parser.ts:10-20\nparse token stream and return default branch result",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/parser.ts"],
        spans: [{ file: "src/parser.ts", start: 10, end: 20 }],
        tokens: 70,
        source: "candidate:target-parser",
        dependencies: [],
      },
      {
        id: "lexical-distractor",
        kind: "code-context",
        order: 101,
        summary: "src/cache.ts:1-12\nfallback behavior fallback behavior fallback behavior",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/cache.ts"],
        spans: [{ file: "src/cache.ts", start: 1, end: 12 }],
        tokens: 70,
        source: "candidate:lexical-distractor",
        dependencies: [],
      },
    ] satisfies SessionContextLedger.Event[]

    const selection = SessionContextLedger.select({
      events,
      policy: "experience-frontier",
      budget: 125,
      query: "Fix fallback behavior.",
    })

    expect(selection.events.map((event) => event.id)).toEqual(["prior-parser-fallback", "target-parser"])
  })

  test("candidate rank frontier packs pre-ranked candidate events in order", () => {
    const events = [
      {
        id: "candidate:0",
        kind: "code-context",
        order: 1000,
        summary: "src/target.py:1-20\nfirst ranked candidate",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/target.py"],
        spans: [{ file: "src/target.py", start: 1, end: 20 }],
        tokens: 20,
        source: "candidate:0",
        dependencies: [],
      },
      {
        id: "candidate:1",
        kind: "code-context",
        order: 1001,
        summary: "src/target.py:21-40\nsecond ranked candidate",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/target.py"],
        spans: [{ file: "src/target.py", start: 21, end: 40 }],
        tokens: 20,
        source: "candidate:1",
        dependencies: [],
      },
      {
        id: "candidate:2",
        kind: "code-context",
        order: 1002,
        summary: "src/noise.py:1-20\nnewer but lower ranked candidate",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/noise.py"],
        spans: [{ file: "src/noise.py", start: 1, end: 20 }],
        tokens: 20,
        source: "candidate:2",
        dependencies: [],
      },
    ] satisfies SessionContextLedger.Event[]

    const selection = SessionContextLedger.select({ events, policy: "candidate-rank-frontier", budget: 40 })

    expect(selection.events.map((event) => event.id)).toEqual(["candidate:0", "candidate:1"])
  })

  test("budget rank frontier prefers chunk scale by budget", () => {
    const small = [0, 1].map((index) => ({
      id: `candidate:small:${index}`,
      kind: "code-context",
      order: 1000 + index,
      summary: `src/target.py:${index * 40 + 1}-${index * 40 + 40}\nsmall ranked candidate`,
      recoverability: "medium",
      mustPreserve: false,
      files: ["src/target.py"],
      spans: [{ file: "src/target.py", start: index * 40 + 1, end: index * 40 + 40 }],
      tokens: 40,
      source: `candidate:small:${index}`,
      dependencies: [],
    })) satisfies SessionContextLedger.Event[]
    const medium = Array.from({ length: 11 }, (_, index) => ({
      id: `candidate:medium:${index}`,
      kind: "code-context",
      order: 2000 + index,
      summary: `src/target.py:${index * 80 + 1}-${index * 80 + 80}\nmedium ranked candidate`,
      recoverability: "medium",
      mustPreserve: false,
      files: ["src/target.py"],
      spans: [{ file: "src/target.py", start: index * 80 + 1, end: index * 80 + 80 }],
      tokens: 80,
      source: `candidate:medium:${index}`,
      dependencies: [],
    })) satisfies SessionContextLedger.Event[]
    const events = [...small, ...medium]

    const tight = SessionContextLedger.select({ events, policy: "budget-rank-frontier", budget: 80 })
    const broad = SessionContextLedger.select({ events, policy: "budget-rank-frontier", budget: 800 })

    expect(tight.events.map((event) => event.id)).toEqual(["candidate:small:0", "candidate:small:1"])
    expect(broad.events).toHaveLength(10)
    expect(broad.events.every((event) => event.id.startsWith("candidate:medium:"))).toBe(true)
  })

  test("rank portfolio frontier preserves rank tightly and scale broadly", () => {
    const topMedium = {
      id: "candidate:medium:top",
      kind: "code-context",
      order: 1000,
      summary: "src/top.py:1-80\nhighest ranked medium candidate",
      recoverability: "medium",
      mustPreserve: false,
      files: ["src/top.py"],
      spans: [{ file: "src/top.py", start: 1, end: 80 }],
      tokens: 80,
      source: "candidate:medium:top",
      dependencies: [],
    } satisfies SessionContextLedger.Event
    const small = [0, 1].map((index) => ({
      id: `candidate:small:${index}`,
      kind: "code-context",
      order: 2000 + index,
      summary: `src/small.py:${index * 40 + 1}-${index * 40 + 40}\nlower ranked small candidate`,
      recoverability: "medium",
      mustPreserve: false,
      files: ["src/small.py"],
      spans: [{ file: "src/small.py", start: index * 40 + 1, end: index * 40 + 40 }],
      tokens: 40,
      source: `candidate:small:${index}`,
      dependencies: [],
    })) satisfies SessionContextLedger.Event[]
    const medium = Array.from({ length: 10 }, (_, index) => ({
      id: `candidate:medium:${index}`,
      kind: "code-context",
      order: 3000 + index,
      summary: `src/medium.py:${index * 80 + 1}-${index * 80 + 80}\nlower ranked medium candidate`,
      recoverability: "medium",
      mustPreserve: false,
      files: ["src/medium.py"],
      spans: [{ file: "src/medium.py", start: index * 80 + 1, end: index * 80 + 80 }],
      tokens: 80,
      source: `candidate:medium:${index}`,
      dependencies: [],
    })) satisfies SessionContextLedger.Event[]
    const events = [topMedium, ...small, ...medium]

    const tight = SessionContextLedger.select({ events, policy: "rank-portfolio-frontier", budget: 80 })
    const broad = SessionContextLedger.select({ events, policy: "rank-portfolio-frontier", budget: 800 })

    expect(tight.events.map((event) => event.id)).toEqual(["candidate:medium:top"])
    expect(broad.events).toHaveLength(10)
    expect(broad.events.every((event) => event.id.startsWith("candidate:medium:"))).toBe(true)
  })

  test("coverage rank frontier avoids redundant ranked spans", () => {
    const events = [
      {
        id: "candidate:first",
        kind: "code-context",
        order: 1000,
        summary: "src/target.py:1-40\nfirst ranked candidate",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/target.py"],
        spans: [{ file: "src/target.py", start: 1, end: 40 }],
        tokens: 40,
        source: "candidate:first",
        dependencies: [],
      },
      {
        id: "candidate:duplicate",
        kind: "code-context",
        order: 1001,
        summary: "src/target.py:1-40\nduplicate ranked candidate",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/target.py"],
        spans: [{ file: "src/target.py", start: 1, end: 40 }],
        tokens: 40,
        source: "candidate:duplicate",
        dependencies: [],
      },
      {
        id: "candidate:novel",
        kind: "code-context",
        order: 1002,
        summary: "src/target.py:41-80\nnovel ranked candidate",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/target.py"],
        spans: [{ file: "src/target.py", start: 41, end: 80 }],
        tokens: 40,
        source: "candidate:novel",
        dependencies: [],
      },
    ] satisfies SessionContextLedger.Event[]

    const budgetRanked = SessionContextLedger.select({ events, policy: "budget-rank-frontier", budget: 80 })
    const coverageRanked = SessionContextLedger.select({ events, policy: "coverage-rank-frontier", budget: 80 })

    expect(budgetRanked.events.map((event) => event.id)).toEqual(["candidate:first", "candidate:duplicate"])
    expect(coverageRanked.events.map((event) => event.id)).toEqual(["candidate:first", "candidate:novel"])
  })

  test("mmr rank frontier trades a little rank for non-overlapping file diversity", () => {
    const events = [
      {
        id: "candidate:first",
        kind: "code-context",
        order: 1000,
        summary: "src/target.py:1-40\nfirst ranked candidate",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/target.py"],
        spans: [{ file: "src/target.py", start: 1, end: 40 }],
        tokens: 40,
        source: "candidate:first",
        dependencies: [],
      },
      {
        id: "candidate:duplicate",
        kind: "code-context",
        order: 1001,
        summary: "src/target.py:1-40\nduplicate ranked candidate",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/target.py"],
        spans: [{ file: "src/target.py", start: 1, end: 40 }],
        tokens: 40,
        source: "candidate:duplicate",
        dependencies: [],
      },
      {
        id: "candidate:neighbor",
        kind: "code-context",
        order: 1002,
        summary: "src/neighbor.py:1-40\nnearby ranked candidate in a different file",
        recoverability: "medium",
        mustPreserve: false,
        files: ["src/neighbor.py"],
        spans: [{ file: "src/neighbor.py", start: 1, end: 40 }],
        tokens: 40,
        source: "candidate:neighbor",
        dependencies: [],
      },
    ] satisfies SessionContextLedger.Event[]

    const budgetRanked = SessionContextLedger.select({ events, policy: "budget-rank-frontier", budget: 80 })
    const mmrRanked = SessionContextLedger.select({ events, policy: "mmr-rank-frontier", budget: 80 })

    expect(budgetRanked.events.map((event) => event.id)).toEqual(["candidate:first", "candidate:duplicate"])
    expect(mmrRanked.events.map((event) => event.id)).toEqual(["candidate:first", "candidate:neighbor"])
  })

  test("renders provenance handles for compacted context", () => {
    const packet = SessionContextLedger.compile({
      entries,
      budget: 120,
      activeFiles: ["src/config.ts", "tests/config.test.ts"],
    }).text

    expect(packet).toContain("<context-ledger>")
    expect(packet).toContain("source: message:msg_system")
    expect(packet).toContain("tests/config.test.ts")
  })

  test("compiles serialized V1 context into typed ledger sections", () => {
    const packet = SessionContextLedger.compileSerializedContext({
      context: [
        "[User]: Fix src/app.ts without changing renderApp().",
        "[Shell]: bun test test/app.test.ts\nFAILED test/app.test.ts expected render output",
        '[Assistant tool call]: read({"filePath":"src/app.ts"})\n[Tool result]: diff --git a/src/app.ts b/src/app.ts',
      ],
      budget: 160,
    }).text

    expect(packet).toContain("## Constraints And Goals")
    expect(packet).toContain("## Tests And Tool Evidence")
    expect(packet).toContain("## Current Diff And Edits")
    expect(packet).toContain("source: serialized-context:0")
    expect(packet).toContain("src/app.ts")
  })

  test("extracts line spans from completed read tool output", () => {
    const events = SessionContextLedger.fromEntries([
      {
        seq: 1,
        message: new SessionMessage.Assistant({
          id: id("read-assistant"),
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
          ],
          time: { created },
        }),
      },
    ])
    const result = events.find((event) => event.id === "msg_read-assistant:tool:read-1:result")

    expect(result?.files).toEqual(["src/config.ts"])
    expect(result?.spans).toEqual([{ file: "src/config.ts", start: 10, end: 12 }])
  })

  test("extracts line spans from completed grep tool output", () => {
    const events = SessionContextLedger.fromEntries([
      {
        seq: 1,
        message: new SessionMessage.Assistant({
          id: id("grep-assistant"),
          type: "assistant",
          agent: "build",
          model,
          content: [
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
      },
    ])
    const result = events.find((event) => event.id === "msg_grep-assistant:tool:grep-1:result")

    expect(result?.files).toEqual(["src/config.ts"])
    expect(result?.spans).toEqual([{ file: "src/config.ts", start: 42, end: 42 }])
  })

  test("compaction prompt places the ledger before raw context", () => {
    const prompt = buildPrompt({
      previousSummary: "Earlier summary",
      ledger: "<context-ledger>\n## Tests And Tool Evidence\n- [test] failure\n</context-ledger>",
      context: ["[User]: raw conversation"],
    })

    expect(prompt.indexOf("<context-ledger>")).toBeLessThan(prompt.indexOf("[User]: raw conversation"))
    expect(prompt).toContain("Use this provenance-preserving ContextLedger packet")
  })

  test("serialized multiline user context preserves exact individual facts", () => {
    const packet = SessionContextLedger.compileSerializedContext({
      policy: "official-frontier",
      budget: 700,
      context: [
        [
          "[User]: Preserve the following payment retry facts for compaction.",
          "CRITICAL FACT: payment retry marker is NOISY_LEDGER_ALPHA_20260615.",
          "CRITICAL FACT: the idempotency header key is x-context-ledger-noisy-id.",
          "CRITICAL FILE: src/payments/retry.ts owns the retry policy.",
          "CRITICAL TEST: tests/payments/retry.test.ts::keeps_idempotency passed after the last change.",
          "CRITICAL DECISION: retry budget remains exactly 2 attempts; do not raise it to 3.",
          "CRITICAL SYMBOL: computeRetryPlan must keep stable request fingerprints.",
        ].join("\n"),
      ],
    })

    expect(packet.text).toContain("NOISY_LEDGER_ALPHA_20260615")
    expect(packet.text).toContain("x-context-ledger-noisy-id")
    expect(packet.text).toContain("src/payments/retry.ts")
    expect(packet.text).toContain("tests/payments/retry.test.ts::keeps_idempotency")
    expect(packet.text).toContain("retry budget remains exactly 2 attempts")
    expect(packet.text).toContain("computeRetryPlan")
  })

  test("precision frontier keeps exact serialized facts while demoting distractors", () => {
    const packet = SessionContextLedger.compileSerializedContext({
      policy: "precision-frontier",
      budget: 500,
      context: [
        [
          "[User]: Preserve the following payment retry facts for compaction.",
          "CRITICAL FACT: payment retry marker is NOISY_LEDGER_ALPHA_20260615.",
          "CRITICAL FACT: the idempotency header key is x-context-ledger-noisy-id.",
          "CRITICAL FILE: src/payments/retry.ts owns the retry policy.",
          "CRITICAL TEST: tests/payments/retry.test.ts::keeps_idempotency passed after the last change.",
          "CRITICAL DECISION: retry budget remains exactly 2 attempts; do not raise it to 3.",
          "CRITICAL SYMBOL: computeRetryPlan must keep stable request fingerprints.",
        ].join("\n"),
        [
          "[User]: Distractor investigation 0: inspect src/auth/session.ts.",
          "Temporary marker DISTRACTOR_MARKER_00 is unrelated and should not override the payment retry facts.",
          "Decision candidate 0: leave feature flag noisyCandidate0 unchanged.",
          "Test note: tests/noise/0.test.ts was flaky and is not part of the retry evidence.",
        ].join("\n"),
      ],
    })

    expect(packet.text).toContain("NOISY_LEDGER_ALPHA_20260615")
    expect(packet.text).toContain("x-context-ledger-noisy-id")
    expect(packet.text).toContain("src/payments/retry.ts")
    expect(packet.text).toContain("tests/payments/retry.test.ts::keeps_idempotency")
    expect(packet.text).toContain("retry budget remains exactly 2 attempts")
    expect(packet.text).toContain("computeRetryPlan")
    expect(packet.text).not.toContain("DISTRACTOR_MARKER_00")
    expect(packet.text).not.toContain("src/auth/session.ts")
    expect(packet.text).not.toContain("tests/noise/0.test.ts")
  })
})
