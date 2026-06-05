import { createHash } from "node:crypto";
import { buildAccounts } from "./accounts";
import {
  accountWebsetSuggestionSchema,
  prospectWebsetSuggestionSchema,
  type AccountRecord,
  type AccountWebsetSuggestion,
  type ProspectWebsetSuggestion,
  type SignalRecord,
  type SignalReviewIssue,
  type StudioOption,
} from "./domain";
import { ExaAnswerClient } from "./exa-answer";
import { getOptionalEnv } from "./env";
import { normalizeDomain } from "./logo";
import { latestReviewsBySignal } from "./reviews";
import { optionFromSuggestion, sanitizeProspectWebsetSuggestion, semanticContextFromSignals, semanticMonitorQuery } from "./semantic-monitor";
import { rowHash, signalForReviewPrompt } from "./signal-review-context";
import { readAccountSuggestions, readReviews, readSignals, upsertAccountSuggestions } from "./store";

const DEFAULT_REVIEWER_MODEL = "exa-answer/account-webset-suggestion";
const MAX_PROMPT_SIGNALS = 10;

type ParsedAccountSuggestionAnswer = {
  status: AccountWebsetSuggestion["status"];
  accuracyScore: number;
  fitScore: number;
  rationale: string;
  suggestions: ProspectWebsetSuggestion[];
  issues: SignalReviewIssue[];
};

export type AccountSuggestionBundle = {
  account: AccountRecord;
  suggestion: AccountWebsetSuggestion;
  options: StudioOption[];
  stale: boolean;
  generated: boolean;
};

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function looseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function looseString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return compact(value) || undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function looseScore(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value > 0 && value <= 1 ? value * 100 : value)));
  }
  if (typeof value === "string" && value.trim()) {
    return looseScore(Number(value), fallback);
  }
  return fallback;
}

function statusValue(value: unknown): AccountWebsetSuggestion["status"] {
  const normalized = looseString(value)?.toLowerCase().replace(/\s+/g, "_");
  if (normalized === "approved" || normalized === "needs_review" || normalized === "rejected") {
    return normalized;
  }
  return "needs_review";
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();
  const fence = String.fromCharCode(96, 96, 96);
  if (trimmed.startsWith(fence)) {
    const firstNewline = trimmed.indexOf("\n");
    const lastFence = trimmed.lastIndexOf(fence);
    if (firstNewline >= 0 && lastFence > firstNewline) {
      return JSON.parse(trimmed.slice(firstNewline + 1, lastFence).trim());
    }
  }
  return JSON.parse(trimmed);
}

function normalizeSuggestion(value: unknown, context: { accountName: string; companyDomain: string; signals: SignalRecord[] }): ProspectWebsetSuggestion {
  const record = looseRecord(value);
  const workflow =
    looseString(record.workflow) ??
    looseString(record.useCase) ??
    context.signals.find((signal) => signal.workflow)?.workflow ??
    "Regulated agent workflow grounding";
  const title =
    looseString(record.title) ??
    looseString(record.websetTitle) ??
    looseString(record.monitorTitle) ??
    workflow + " Monitor";
  const monitorQuery =
    looseString(record.monitorQuery) ??
    looseString(record.semanticMonitorQuery) ??
    looseString(record.query) ??
    looseString(record.searchQuery) ??
    semanticMonitorQuery(semanticContextFromSignals(context.accountName, context.companyDomain, workflow, context.signals));
  const criteriaValue = record.monitorCriteria ?? record.criteria;
  const monitorCriteria = Array.isArray(criteriaValue)
    ? criteriaValue.map(looseString).filter((item): item is string => Boolean(item)).slice(0, 5)
    : [];
  const valueProposition =
    looseString(record.valueProposition) ??
    looseString(record.valueProp) ??
    looseString(record.whyUseful) ??
    `Monitor fresh, cited public-web evidence for ${workflow}.`;
  const rationale =
    looseString(record.rationale) ??
    looseString(record.reasoning) ??
    looseString(record.why) ??
    valueProposition;

  return sanitizeProspectWebsetSuggestion(
    prospectWebsetSuggestionSchema.parse({
      fitScore: looseScore(record.fitScore ?? record.fit_score ?? record.score, 70),
      workflow,
      title,
      audience: looseString(record.audience) ?? looseString(record.buyerPersona) ?? "AI platform or workflow owner",
      monitorQuery,
      monitorCriteria: monitorCriteria.length ? monitorCriteria : ["Sources must relate to the selected financial-services AI-agent workflow."],
      valueProposition,
      rationale,
    }),
    semanticContextFromSignals(context.accountName, context.companyDomain, workflow, context.signals),
  );
}

function parseAnswer(answer: unknown, context: { accountName: string; companyDomain: string; signals: SignalRecord[] }): ParsedAccountSuggestionAnswer {
  const parsed = typeof answer === "string" ? parseJsonString(answer) : answer;
  const record = looseRecord(parsed);
  const rawSuggestions =
    record.suggestions ??
    record.prospectWebsetSuggestions ??
    record.prospectWebsetSuggestion ??
    record.websetSuggestions ??
    record.websets;
  const suggestionValues = Array.isArray(rawSuggestions) ? rawSuggestions : rawSuggestions ? [rawSuggestions] : [];
  const suggestions = suggestionValues
    .map((value) => normalizeSuggestion(value, context))
    .filter((suggestion) => suggestion.monitorQuery)
    .slice(0, 3);
  const rawIssues = Array.isArray(record.issues) ? record.issues : [];
  const issues = rawIssues.flatMap((issue) => {
    const item = looseRecord(issue);
    const message = looseString(item.message);
    if (!message) {
      return [];
    }
    const severity: SignalReviewIssue["severity"] =
      item.severity === "high" || item.severity === "medium" || item.severity === "low" ? item.severity : "medium";
    return [
      {
        field: looseString(item.field) ?? "account",
        severity,
        message,
      },
    ];
  });

  return {
    status: statusValue(record.status),
    accuracyScore: looseScore(record.accuracyScore ?? record.accuracy_score, 75),
    fitScore: looseScore(record.fitScore ?? record.fit_score ?? record.score, suggestions[0]?.fitScore ?? 70),
    rationale:
      looseString(record.rationale) ??
      looseString(record.reasoning) ??
      "Suggested from account-level signals and Exa Answer context.",
    suggestions: suggestions.length ? suggestions : [buildHeuristicProspectSuggestion(context.accountName, context.companyDomain, context.signals)],
    issues,
  };
}

function accountSuggestionOutputSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["status", "accuracyScore", "fitScore", "rationale", "suggestions", "issues"],
    properties: {
      status: { type: "string", enum: ["approved", "needs_review", "rejected"] },
      accuracyScore: { type: "integer", minimum: 0, maximum: 100 },
      fitScore: { type: "integer", minimum: 0, maximum: 100 },
      rationale: { type: "string" },
      suggestions: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["fitScore", "workflow", "title", "audience", "monitorQuery", "monitorCriteria", "valueProposition", "rationale"],
          properties: {
            fitScore: { type: "integer", minimum: 0, maximum: 100 },
            workflow: { type: "string" },
            title: { type: "string" },
            audience: { type: "string" },
            monitorQuery: { type: "string" },
            monitorCriteria: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
            valueProposition: { type: "string" },
            rationale: { type: "string" },
          },
        },
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["field", "severity", "message"],
          properties: {
            field: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            message: { type: "string" },
          },
        },
      },
    },
  };
}

function rankSignals(signals: SignalRecord[]): SignalRecord[] {
  const confidenceScore = { high: 3, medium: 2, low: 1 };
  const sourceScore = { official: 5, trusted: 4, medium: 3, unknown: 2, low: 1 };
  return [...signals].sort((a, b) => {
    const scoreA = confidenceScore[a.confidence] * 10 + sourceScore[a.sourceQuality];
    const scoreB = confidenceScore[b.confidence] * 10 + sourceScore[b.sourceQuality];
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return (b.sourceDate ?? b.discoveredAt).localeCompare(a.sourceDate ?? a.discoveredAt);
  });
}

export function accountSignalHash(signals: SignalRecord[]): string {
  const stable = rankSignals(signals)
    .map((signal) => [signal.id, rowHash(signal)].join(":"))
    .join("|");
  return createHash("sha256").update(stable).digest("hex");
}

function stableId(parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

function buildHeuristicProspectSuggestion(accountName: string, companyDomain: string, signals: SignalRecord[]): ProspectWebsetSuggestion {
  const workflow = signals.find((signal) => signal.workflow)?.workflow ?? "Regulated agent workflow grounding";
  const signalTypes = Array.from(new Set(signals.map((signal) => signal.signalType).filter(Boolean))).slice(0, 4);
  return prospectWebsetSuggestionSchema.parse({
    fitScore: 65,
    workflow,
    title: `${workflow} Monitor`,
    audience: "AI platform lead / business workflow owner",
    monitorQuery: semanticMonitorQuery(semanticContextFromSignals(accountName, companyDomain, workflow, signals)),
    monitorCriteria: [
      `Sources should be relevant to ${accountName} or comparable financial-services institutions.`,
      "Sources should discuss AI-agent adoption, governance, product change, partner activity, or workflow-specific external evidence.",
      "Results should include citations and enough source context to support a prospect demo.",
    ],
    valueProposition: `Turns ${signalTypes.length ? signalTypes.join(", ") : "AI-agent"} signals into a live external-intelligence monitor for ${accountName}.`,
    rationale: "Generated as a safe fallback when no cached Exa Answer account suggestion exists yet.",
  });
}

function buildHeuristicAccountSuggestion(account: AccountRecord, signals: SignalRecord[]): AccountWebsetSuggestion {
  const suggestion = buildHeuristicProspectSuggestion(account.accountName, account.companyDomain, signals);
  return accountWebsetSuggestionSchema.parse({
    id: `acct_suggestion_${stableId([account.companyDomain, accountSignalHash(signals), "heuristic"])}`,
    accountName: account.accountName,
    companyDomain: account.companyDomain,
    signalHash: accountSignalHash(signals),
    sourceSignalIds: rankSignals(signals).slice(0, MAX_PROMPT_SIGNALS).map((signal) => signal.id),
    source: "heuristic",
    status: "needs_review",
    accuracyScore: 65,
    fitScore: suggestion.fitScore,
    reviewerModel: "heuristic/account-webset-suggestion",
    generatedAt: new Date().toISOString(),
    rationale: suggestion.rationale,
    suggestions: [suggestion],
    issues: [],
  });
}

function buildAccountSuggestionFromReviews(account: AccountRecord, signals: SignalRecord[]): Promise<AccountWebsetSuggestion | undefined> {
  return readReviews().then((reviews) => {
    const latest = latestReviewsBySignal(reviews);
    const suggestions = rankSignals(signals)
      .map((signal) => latest[signal.id])
      .filter((review) => review?.prospectWebsetSuggestion && review.status !== "rejected")
      .map((review) =>
        sanitizeProspectWebsetSuggestion(
          review.prospectWebsetSuggestion!,
          semanticContextFromSignals(account.accountName, account.companyDomain, review.prospectWebsetSuggestion!.workflow, signals),
        ),
      )
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 3);
    if (!suggestions.length) {
      return undefined;
    }
    return accountWebsetSuggestionSchema.parse({
      id: `acct_suggestion_${stableId([account.companyDomain, accountSignalHash(signals), "row-review"])}`,
      accountName: account.accountName,
      companyDomain: account.companyDomain,
      signalHash: accountSignalHash(signals),
      sourceSignalIds: rankSignals(signals).slice(0, MAX_PROMPT_SIGNALS).map((signal) => signal.id),
      source: "exa-answer-row-review",
      status: "needs_review",
      accuracyScore: 75,
      fitScore: suggestions[0].fitScore,
      reviewerModel: "exa-answer/row-review-cache",
      generatedAt: new Date().toISOString(),
      rationale: "Derived from the highest-scoring Exa Answer row-review suggestion for this account.",
      suggestions,
      issues: [],
    });
  });
}

function isFresh(suggestion: AccountWebsetSuggestion | undefined, signalHash: string, staleAfterDays: number): boolean {
  if (!suggestion || suggestion.signalHash !== signalHash) {
    return false;
  }
  const generatedAt = Date.parse(suggestion.generatedAt);
  if (!Number.isFinite(generatedAt)) {
    return false;
  }
  return Date.now() - generatedAt < staleAfterDays * 24 * 60 * 60 * 1000;
}

function optionsFromSuggestion(suggestion: AccountWebsetSuggestion, signals: SignalRecord[]): StudioOption[] {
  return suggestion.suggestions.map((item, index) =>
    optionFromSuggestion(
      item,
      semanticContextFromSignals(suggestion.accountName, suggestion.companyDomain, item.workflow, signals),
      index,
    ),
  );
}

function buildPrompt(account: AccountRecord, signals: SignalRecord[]): string {
  return [
    "You are designing a prospect-facing Exa Webset demo for an AE.",
    "",
    "Use Exa search-backed citations plus the provided account signals to decide whether the account and signals are accurate enough for outbound, then recommend the Webset/monitor the prospect would actually care about.",
    "This is not the AE's internal signal feed. The Webset should be something the prospect would want to monitor for their own AI-agent workflows.",
    "",
    "Critical query rule: monitorQuery must be a natural-language semantic search instruction for Exa. Do not use site: filters, boolean operators, quoted keyword lists, parentheses, or a raw keyword query. Write it like: Find current public web evidence that [company] can use to monitor [workflow]...",
    "",
    "Return 1-3 suggestions. Prefer the strongest workflow if the signals point to one obvious buyer pain. Set status to rejected only when the account is not a credible FSI or FSI-infrastructure prospect, or the signals are too weak for outbound.",
    "",
    JSON.stringify(
      {
        account,
        signals: rankSignals(signals).slice(0, MAX_PROMPT_SIGNALS).map(signalForReviewPrompt),
      },
      null,
      2,
    ),
  ].join("\n");
}

function accountForSignals(signals: SignalRecord[]): AccountRecord | undefined {
  return buildAccounts(signals)[0];
}

export async function getAccountSuggestionBundle(
  accountDomainInput: string,
  options: { staleAfterDays?: number } = {},
): Promise<AccountSuggestionBundle> {
  const accountDomain = normalizeDomain(accountDomainInput);
  const signals = (await readSignals()).filter((signal) => normalizeDomain(signal.companyDomain) === accountDomain);
  const account = accountForSignals(signals);
  if (!account) {
    throw new Error(`Account not found: ${accountDomainInput}`);
  }
  const signalHash = accountSignalHash(signals);
  const staleAfterDays = options.staleAfterDays ?? 7;
  const persisted = (await readAccountSuggestions()).find((suggestion) => normalizeDomain(suggestion.companyDomain) === accountDomain);
  if (persisted) {
    const sanitized = accountWebsetSuggestionSchema.parse({
      ...persisted,
      suggestions: persisted.suggestions.map((suggestion) =>
        sanitizeProspectWebsetSuggestion(
          suggestion,
          semanticContextFromSignals(account.accountName, account.companyDomain, suggestion.workflow, signals),
        ),
      ),
    });
    return {
      account,
      suggestion: sanitized,
      options: optionsFromSuggestion(sanitized, signals),
      stale: !isFresh(sanitized, signalHash, staleAfterDays),
      generated: false,
    };
  }

  const fromReviews = await buildAccountSuggestionFromReviews(account, signals);
  const suggestion = fromReviews ?? buildHeuristicAccountSuggestion(account, signals);
  return {
    account,
    suggestion,
    options: optionsFromSuggestion(suggestion, signals),
    stale: true,
    generated: false,
  };
}

export async function generateAccountSuggestion(
  accountDomainInput: string,
  options: { force?: boolean; staleAfterDays?: number; reviewerModel?: string; includeText?: boolean } = {},
): Promise<AccountSuggestionBundle & { requestId?: string; citationCount: number; costDollars?: Record<string, unknown> }> {
  const accountDomain = normalizeDomain(accountDomainInput);
  const signals = (await readSignals()).filter((signal) => normalizeDomain(signal.companyDomain) === accountDomain);
  const account = accountForSignals(signals);
  if (!account) {
    throw new Error(`Account not found: ${accountDomainInput}`);
  }
  const signalHash = accountSignalHash(signals);
  const existing = (await readAccountSuggestions()).find((suggestion) => normalizeDomain(suggestion.companyDomain) === accountDomain);
  const staleAfterDays = options.staleAfterDays ?? 7;
  if (!options.force && isFresh(existing, signalHash, staleAfterDays)) {
    return {
      account,
      suggestion: existing!,
      options: optionsFromSuggestion(existing!, signals),
      stale: false,
      generated: false,
      citationCount: 0,
    };
  }

  const client = new ExaAnswerClient();
  const payload = await client.answer({
    query: buildPrompt(account, signals),
    text: options.includeText ?? true,
    stream: false,
    outputSchema: accountSuggestionOutputSchema(),
  });
  const parsed = parseAnswer(payload.answer, {
    accountName: account.accountName,
    companyDomain: account.companyDomain,
    signals,
  });
  const reviewerModel = options.reviewerModel ?? DEFAULT_REVIEWER_MODEL;
  const suggestion = accountWebsetSuggestionSchema.parse({
    id: `acct_suggestion_${stableId([account.companyDomain, signalHash, reviewerModel])}`,
    accountName: account.accountName,
    companyDomain: account.companyDomain,
    signalHash,
    sourceSignalIds: rankSignals(signals).slice(0, MAX_PROMPT_SIGNALS).map((signal) => signal.id),
    source: "exa-answer-account",
    status: parsed.status,
    accuracyScore: parsed.accuracyScore,
    fitScore: parsed.fitScore,
    reviewerModel,
    generatedAt: new Date().toISOString(),
    rationale: parsed.rationale,
    suggestions: parsed.suggestions,
    issues: parsed.issues,
  });

  await upsertAccountSuggestions([suggestion]);
  return {
    account,
    suggestion,
    options: optionsFromSuggestion(suggestion, signals),
    stale: false,
    generated: true,
    requestId: payload.requestId,
    citationCount: payload.citations?.length ?? 0,
    costDollars: payload.costDollars,
  };
}

export async function refreshDueAccountSuggestions(
  options: { limit?: number; force?: boolean; staleAfterDays?: number; domains?: string[]; includeText?: boolean } = {},
): Promise<{
  ok: true;
  attempted: number;
  generated: number;
  skipped: number;
  remainingDue: number;
  results: Array<{ domain: string; generated: boolean; stale: boolean; fitScore: number; status: AccountWebsetSuggestion["status"] }>;
}> {
  if (!getOptionalEnv("EXA_API_KEY")) {
    throw new Error("Missing EXA_API_KEY. Cannot generate Exa Answer account suggestions.");
  }
  const limit = Math.max(0, Math.min(options.limit ?? 10, 50));
  const allSignals = await readSignals();
  const requestedDomains = options.domains?.map(normalizeDomain).filter(Boolean);
  const accounts = buildAccounts(allSignals).filter((account) => {
    if (!requestedDomains?.length) {
      return true;
    }
    return requestedDomains.includes(normalizeDomain(account.companyDomain));
  });
  const persisted = await readAccountSuggestions();
  const persistedByDomain = new Map(persisted.map((suggestion) => [normalizeDomain(suggestion.companyDomain), suggestion]));
  const due = accounts.filter((account) => {
    const signals = allSignals.filter((signal) => normalizeDomain(signal.companyDomain) === normalizeDomain(account.companyDomain));
    return options.force || !isFresh(persistedByDomain.get(normalizeDomain(account.companyDomain)), accountSignalHash(signals), options.staleAfterDays ?? 7);
  });
  const targets = due.slice(0, limit);
  const results = [];
  let generated = 0;

  for (const account of targets) {
    const result = await generateAccountSuggestion(account.companyDomain, {
      force: options.force,
      staleAfterDays: options.staleAfterDays,
      includeText: options.includeText,
    });
    if (result.generated) {
      generated += 1;
    }
    results.push({
      domain: account.companyDomain,
      generated: result.generated,
      stale: result.stale,
      fitScore: result.suggestion.fitScore,
      status: result.suggestion.status,
    });
  }

  return {
    ok: true,
    attempted: targets.length,
    generated,
    skipped: Math.max(0, accounts.length - due.length),
    remainingDue: Math.max(0, due.length - targets.length),
    results,
  };
}
