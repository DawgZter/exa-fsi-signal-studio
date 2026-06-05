import { createHash } from "node:crypto";
import { z } from "zod";
import { prospectWebsetSuggestionSchema, signalReviewSchema, type SignalRecord, type SignalReview } from "./domain";

function looseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function looseString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function looseScore(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value > 0 && value <= 1 ? value * 100 : value)));
  }
  if (typeof value === "string" && value.trim()) {
    return looseScore(Number(value));
  }
  return undefined;
}

const prospectWebsetSuggestionResponseSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const record = looseRecord(value);
  const workflow = looseString(record.workflow) ?? "Regulated agent workflow grounding";
  const title =
    looseString(record.title) ??
    looseString(record.websetTitle) ??
    looseString(record.monitorTitle) ??
    workflow + " Monitor";
  const monitorQuery =
    looseString(record.monitorQuery) ??
    looseString(record.query) ??
    looseString(record.searchQuery) ??
    workflow + " AI agent external sources regulatory updates";
  const monitorCriteriaValue = record.monitorCriteria ?? record.criteria;
  const monitorCriteria = Array.isArray(monitorCriteriaValue)
    ? monitorCriteriaValue.map(looseString).filter((item): item is string => Boolean(item)).slice(0, 5)
    : [];
  const valueProposition =
    looseString(record.valueProposition) ??
    looseString(record.value_proposition) ??
    looseString(record.valueProp) ??
    looseString(record.whyUseful) ??
    looseString(record.rationale) ??
    "Monitor fresh, cited public-web evidence for " + workflow + ".";
  const rationale =
    looseString(record.rationale) ??
    looseString(record.reasoning) ??
    looseString(record.why) ??
    looseString(record.valueProposition) ??
    valueProposition;

  return {
    fitScore: looseScore(record.fitScore ?? record.fit_score ?? record.score) ?? 50,
    workflow,
    title,
    audience: looseString(record.audience) ?? looseString(record.buyerPersona) ?? "AI platform or workflow owner",
    monitorQuery,
    monitorCriteria: monitorCriteria.length ? monitorCriteria : ["Sources must relate to the selected financial-services workflow."],
    valueProposition,
    rationale,
  };
}, prospectWebsetSuggestionSchema.nullable());

export const signalReviewBatchResponseSchema = z.object({
  reviews: z.array(
    z.object({
      signalId: z.string(),
      status: z.enum(["approved", "needs_review", "rejected"]),
      accuracyScore: z.number().min(0).max(100),
      outboundUsefulnessScore: z.number().min(0).max(100),
      rationale: z.string(),
      corrected: z.object({
        accountName: z.string().nullable(),
        companyDomain: z.string().nullable(),
        lane: z
          .enum([
            "official_ai_agent_launches",
            "customer_ai_assistants",
            "ai_leadership_team",
            "job_posts_hiring",
            "webinars_whitepapers",
            "conference_speaker",
            "governance_model_risk",
            "vendor_partner_announcements",
            "procurement_rfp",
            "partner_marketplace",
            "unknown",
          ])
          .nullable(),
        signalType: z.string().nullable(),
        confidence: z.enum(["high", "medium", "low"]).nullable(),
        sourceQuality: z.enum(["official", "trusted", "medium", "low", "unknown"]).nullable(),
        fsiSubsector: z.string().nullable(),
        workflow: z.string().nullable(),
      }),
      prospectWebsetSuggestion: prospectWebsetSuggestionResponseSchema,
      issues: z
        .array(
          z.object({
            field: z.string(),
            severity: z.enum(["low", "medium", "high"]),
            message: z.string(),
          }),
        )
        .default([]),
    }),
  ),
});

export type SignalReviewBatchResponse = z.infer<typeof signalReviewBatchResponseSchema>;
export type SignalReviewBatchItem = SignalReviewBatchResponse["reviews"][number];

export function rowHash(signal: SignalRecord): string {
  const stable = {
    accountName: signal.accountName,
    companyDomain: signal.companyDomain,
    lane: signal.lane,
    signalType: signal.signalType,
    sourceUrl: signal.sourceUrl,
    sourceTitle: signal.sourceTitle,
    sourceDate: signal.sourceDate,
    evidenceSummary: signal.evidenceSummary,
    evidenceSnippet: signal.evidenceSnippet,
    confidence: signal.confidence,
    sourceQuality: signal.sourceQuality,
    fsiSubsector: signal.fsiSubsector,
    workflow: signal.workflow,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function rawRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join(", ") || undefined;
  }
  return undefined;
}

function importantContentExcerpt(content: string | undefined): string | undefined {
  if (!content) {
    return undefined;
  }
  const clean = content.replace(/\s+/g, " ").trim();
  const terms = [
    "agentic",
    "agent",
    "agents",
    "assistant",
    "copilot",
    "generative",
    "genai",
    "rag",
    "workflow",
    "governance",
    "fraud",
    "claims",
    "underwriting",
    "mortgage",
    "payments",
    "wealth",
    "research",
    "aml",
    "kyc",
  ];
  const windows: string[] = [];
  const lower = clean.toLowerCase();
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index >= 0) {
      windows.push(clean.slice(Math.max(0, index - 450), Math.min(clean.length, index + 950)));
    }
    if (windows.length >= 3) {
      break;
    }
  }
  const intro = clean.slice(0, 1200);
  return [intro, ...windows]
    .filter(Boolean)
    .join("\n---\n")
    .slice(0, 5000);
}

function compactEvaluations(raw: Record<string, unknown>): Array<Record<string, unknown>> {
  const evaluations = Array.isArray(raw.evaluations) ? raw.evaluations : [];
  return evaluations.slice(0, 6).flatMap((evaluation) => {
    const record = rawRecord(evaluation);
    const criterion = textValue(record.criterion);
    if (!criterion) {
      return [];
    }
    return [
      {
        criterion,
        satisfied: textValue(record.satisfied),
        reasoning: textValue(record.reasoning)?.slice(0, 900),
      },
    ];
  });
}

export function signalForReviewPrompt(signal: SignalRecord): Record<string, unknown> {
  const raw = rawRecord(signal.raw);
  const properties = rawRecord(raw.properties);
  const sourceContent = textValue(properties.content);
  return {
    signalId: signal.id,
    accountName: signal.accountName,
    companyDomain: signal.companyDomain,
    lane: signal.lane,
    signalType: signal.signalType,
    sourceUrl: signal.sourceUrl,
    sourceTitle: signal.sourceTitle,
    sourceDomain: signal.sourceDomain,
    sourceDate: signal.sourceDate,
    sourceQuality: signal.sourceQuality,
    confidence: signal.confidence,
    confidenceReason: signal.confidenceReason,
    fsiSubsector: signal.fsiSubsector,
    workflow: signal.workflow,
    evidenceSummary: signal.evidenceSummary,
    evidenceSnippet: signal.evidenceSnippet?.slice(0, 1800),
    sourceDescription: textValue(properties.description)?.slice(0, 1200),
    sourceContentExcerpt: importantContentExcerpt(sourceContent),
    exaCriterionEvaluations: compactEvaluations(raw),
    whyExaMatters: signal.whyExaMatters,
  };
}

type SignalReviewPromptMode = "provided-evidence-only" | "exa-answer";

export function buildSignalReviewPrompt(signals: SignalRecord[], mode: SignalReviewPromptMode): string {
  const groundingInstruction =
    mode === "exa-answer"
      ? "Use Exa search-backed citations plus the provided row fields/source excerpts. Prioritize the exact source URL and source domain when present. If Exa cannot corroborate the row's specific claim, downgrade or reject it."
      : "Use only the provided row fields and source evidence. Do not browse, do not use tools, and do not infer facts that are not supported by the provided source title/url/content excerpt/summary/evaluations.";

  return [
    "You are a strict QA reviewer for Exa FSI Signal Studio rows.",
    "",
    `Review each row for factual fit, signal evidence quality, and outbound usefulness. ${groundingInstruction}`,
    "",
    "Important: do not merely validate that the account is in the FSI ICP. The primary task is to decide whether the source evidence proves the claimed signal for the named account.",
    "",
    "For each row, decide:",
    "- approved: row is clearly FSI or FSI-infrastructure, source supports the signal, account/domain look plausible, and confidence is reasonable.",
    "- needs_review: useful but has a correctable issue, weak account/domain extraction, wrong lane, missing workflow, weak confidence, or ambiguous source support.",
    "- rejected: not FSI, not AI-agent related, publisher/vendor was mistaken for the account, source does not support the claimed signal, the row is only generic AI commentary, or it is not useful for AE outbound.",
    "",
    "Check these fields carefully: accountName, companyDomain, lane, signalType, confidence, sourceQuality, fsiSubsector, workflow.",
    "For signal evidence, verify that the source proves at least one concrete adoption motion: launch, hiring, appointment, active usage, partnership with named FSI customer, procurement, governance/model-risk action, or specific AI-agent workflow.",
    "Downgrade or reject rows where the exact account is only mentioned in passing, where the page publisher is mistaken for the account, or where the AI claim is broader than the evidence.",
    "Flag sourceDate issues if the provided date appears to be a future expiry/application date rather than a real publication date.",
    "Use accuracyScore for data correctness and outboundUsefulnessScore for AE usefulness. Scores must be whole numbers from 0 to 100, not 0-1 decimals.",
    "For corrected, set each field to null unless the current value should be changed. Do not repeat unchanged values under corrected.",
    "",
    "Also recommend a prospect-facing Exa Webset for each approved or needs_review row. This is not the internal account signal itself; it is the Webset/monitor the prospect would plausibly want after seeing Exa. Base it on the company, subsector, workflow, and signal. The Webset should monitor external public-web evidence useful to that prospect's AI-agent workflow.",
    "Set prospectWebsetSuggestion to null only when the row is rejected or there is no credible prospect-facing Webset angle.",
    "For prospectWebsetSuggestion.monitorQuery, write a natural-language semantic search instruction to seed the prospect Webset. Do not use site: filters, boolean operators, quoted keyword lists, parentheses, or raw keyword bundles. For monitorCriteria, provide 3 concise criteria that Exa Websets should enforce.",
    "Include concise issues and corrections only when useful.",
    "",
    "Return JSON only matching the provided schema.",
    "",
    JSON.stringify({ rows: signals.map(signalForReviewPrompt) }, null, 2),
  ].join("\n");
}

export function normalizeCorrected(review: SignalReviewBatchItem): SignalReview["corrected"] {
  return Object.fromEntries(
    Object.entries(review.corrected).filter(([, value]) => value !== null && value !== ""),
  ) as SignalReview["corrected"];
}

export function normalizeProspectWebsetSuggestion(
  review: SignalReviewBatchItem,
): SignalReview["prospectWebsetSuggestion"] {
  return review.prospectWebsetSuggestion ?? undefined;
}

export function parseSignalReview(review: SignalReview): SignalReview {
  return signalReviewSchema.parse(review);
}
