import { createHash } from "node:crypto";
import type { ProspectWebsetSuggestion, SignalRecord, StudioOption } from "./domain";

export type SemanticMonitorContext = {
  accountName: string;
  companyDomain: string;
  workflow: string;
  signalTypes?: string[];
  evidenceSummaries?: string[];
};

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function readableList(values: string[], fallback: string): string {
  const unique = Array.from(new Set(values.map((value) => compact(value.replace(/[_-]+/g, " "))).filter(Boolean)));
  if (!unique.length) {
    return fallback;
  }
  if (unique.length === 1) {
    return unique[0];
  }
  if (unique.length === 2) {
    return unique.join(" and ");
  }
  return unique.slice(0, 3).join(", ") + (unique.length > 3 ? ", and adjacent signals" : "");
}

export function looksLikeKeywordFilter(query: string | undefined): boolean {
  if (!query) {
    return false;
  }
  const normalized = compact(query);
  if (/\b(site|inurl|intitle|filetype):/i.test(normalized)) {
    return true;
  }
  if (/\b(OR|AND|NOT)\b/.test(normalized)) {
    return true;
  }
  if (/[()]/.test(normalized)) {
    return true;
  }
  const quotedPhrases = normalized.match(/"[^"]+"/g) ?? [];
  if (quotedPhrases.length >= 2) {
    return true;
  }
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return wordCount < 8;
}

export function semanticMonitorQuery(context: SemanticMonitorContext, candidate?: string): string {
  const trimmed = candidate ? compact(candidate) : "";
  if (trimmed && !looksLikeKeywordFilter(trimmed)) {
    return trimmed.slice(0, 500);
  }

  const signalFocus = readableList(context.signalTypes ?? [], "AI-agent adoption, governance, partnerships, and workflow change");
  const evidenceFocus = "product launches, governance updates, partnerships, customer-facing deployments, peer activity, and regulator-adjacent evidence";
  return compact(
    `Find current public web evidence that ${context.accountName} can use to monitor ${context.workflow}. Prioritize cited sources related to ${signalFocus}, including ${evidenceFocus}, and favor evidence useful for regulated financial-services AI agents.`,
  ).slice(0, 500);
}

export function sanitizeProspectWebsetSuggestion(
  suggestion: ProspectWebsetSuggestion,
  context: SemanticMonitorContext,
): ProspectWebsetSuggestion {
  return {
    ...suggestion,
    monitorQuery: semanticMonitorQuery(
      {
        ...context,
        workflow: suggestion.workflow || context.workflow,
      },
      suggestion.monitorQuery,
    ),
    monitorCriteria: suggestion.monitorCriteria.length
      ? suggestion.monitorCriteria.slice(0, 5)
      : ["Sources must relate to the selected financial-services AI-agent workflow."],
  };
}

export function optionIdForSuggestion(suggestion: ProspectWebsetSuggestion, index = 0): string {
  const hash = createHash("sha1")
    .update([suggestion.title, suggestion.workflow, suggestion.audience, String(index)].join("|"))
    .digest("hex")
    .slice(0, 8);
  return `answer-suggested-webset-${hash}`;
}

export function optionFromSuggestion(
  suggestion: ProspectWebsetSuggestion,
  context: SemanticMonitorContext,
  index = 0,
): StudioOption {
  const sanitized = sanitizeProspectWebsetSuggestion(suggestion, context);
  return {
    id: optionIdForSuggestion(sanitized, index),
    title: sanitized.title,
    workflow: sanitized.workflow,
    audience: sanitized.audience,
    monitorQuery: sanitized.monitorQuery,
    monitorCriteria: sanitized.monitorCriteria,
    valueProposition: sanitized.valueProposition,
  };
}

export function semanticContextFromSignals(
  accountName: string,
  companyDomain: string,
  workflow: string,
  signals: SignalRecord[],
): SemanticMonitorContext {
  return {
    accountName,
    companyDomain,
    workflow,
    signalTypes: signals.map((signal) => signal.signalType),
    evidenceSummaries: signals.map((signal) => signal.evidenceSummary).slice(0, 3),
  };
}
