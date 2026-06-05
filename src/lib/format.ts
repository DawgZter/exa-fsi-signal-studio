import { signalLanes } from "@/lib/lanes";
import type { Confidence, SignalLane, SourceQuality } from "@/lib/domain";

const laneLabelMap = new Map(signalLanes.map((lane) => [lane.id, lane.label]));

export function laneLabel(lane: string): string {
  return laneLabelMap.get(lane as SignalLane) ?? "Other Signal";
}

/** Short labels used on compact badges. */
const laneShortMap: Record<string, string> = {
  customer_ai_assistants: "Customer AI",
  official_ai_agent_launches: "Agent Launch",
  ai_leadership_team: "AI Leadership",
  job_posts_hiring: "Hiring",
  vendor_partner_announcements: "Vendor / Partner",
  webinars_whitepapers: "Webinar / Paper",
  conference_speaker: "Conference",
  governance_model_risk: "Governance",
  procurement_rfp: "Procurement",
  partner_marketplace: "Marketplace",
  unknown: "Other",
};

export function laneShortLabel(lane: string): string {
  return laneShortMap[lane] ?? laneLabel(lane);
}

/** One-line, AE-readable explanation of what each signal lane captures. */
const laneDescriptionMap: Record<SignalLane, string> = {
  official_ai_agent_launches:
    "The company has officially announced an internal AI agent, agentic platform, copilot, or autonomous workflow.",
  customer_ai_assistants:
    "A customer- or employee-facing AI assistant, chatbot, or copilot for a specific workflow — claims, mortgage, wealth, fraud, or support.",
  ai_leadership_team:
    "The company is appointing AI leadership or standing up an agentic-AI, GenAI-platform, or AI-governance team.",
  job_posts_hiring:
    "Job posts for agentic AI, RAG, LangChain/LangGraph, vector search, or AI-platform and governance roles.",
  vendor_partner_announcements:
    "A vendor or partner announced AI agents or agentic automation for this named financial-services customer.",
  webinars_whitepapers:
    "Webinars, whitepapers, or reports where the company engages with agentic AI and AI-driven workflow automation.",
  conference_speaker:
    "Conference agendas or speaker abstracts where the company discusses AI agents or agentic workflows.",
  governance_model_risk:
    "Public discussion of agentic-AI governance, model risk, auditability, or human-in-the-loop controls.",
  procurement_rfp:
    "RFPs, tenders, or contract awards for generative AI, AI agents, semantic search, or RAG.",
  partner_marketplace:
    "The company appears as a named customer in a cloud, AI, or data partner marketplace or integration listing.",
  unknown: "A source-backed AI-agent adoption signal not yet classified into a specific lane.",
};

export function laneDescription(lane: string): string {
  return laneDescriptionMap[lane as SignalLane] ?? laneDescriptionMap.unknown;
}

/**
 * Client-safe best-effort mapping of a free-form signal-type string to a lane,
 * mirroring the server normalizer's keyword logic (without its node deps) so we
 * can describe per-account signal-type chips.
 */
export function laneForSignalType(value: string | undefined): SignalLane {
  const lower = (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (/(customer|assistant|chatbot|copilot|help_center|virtual)/.test(lower)) return "customer_ai_assistants";
  if (/(leadership|chief|head_of|appoint|names_.*head|team_formation)/.test(lower)) return "ai_leadership_team";
  if (/(job|hiring|hire|recruit|career|engineer|specialist|developer|role)/.test(lower)) return "job_posts_hiring";
  if (/(vendor|partner_announcement|customer_story|case_study)/.test(lower)) return "vendor_partner_announcements";
  if (/(webinar|whitepaper|report)/.test(lower)) return "webinars_whitepapers";
  if (/(conference|speaker|panel|summit|keynote)/.test(lower)) return "conference_speaker";
  if (/(governance|model_risk|audit|compliance|responsible)/.test(lower)) return "governance_model_risk";
  if (/(procurement|rfp|tender|contract|award)/.test(lower)) return "procurement_rfp";
  if (/(marketplace|integration|listing)/.test(lower)) return "partner_marketplace";
  if (/(official|launch|agentos|platform|publication|announc)/.test(lower)) return "official_ai_agent_launches";
  return "unknown";
}

export function describeSignalType(signalType: string): string {
  return laneDescription(laneForSignalType(signalType));
}

export function signalTypeLabel(signalType: string): string {
  return signalType
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "ai") return "AI";
      if (lower === "aml") return "AML";
      if (lower === "kyc") return "KYC";
      if (lower === "rag") return "RAG";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export type BadgeTone = "high" | "medium" | "low";

export function confidenceTone(confidence: Confidence): BadgeTone {
  return confidence;
}

export function confidenceLabel(confidence: Confidence): string {
  return `${confidence[0].toUpperCase()}${confidence.slice(1)} confidence`;
}

const sourceQualityLabelMap: Record<SourceQuality, string> = {
  official: "Official source",
  trusted: "Trusted press",
  medium: "Vendor / social",
  low: "Low-signal source",
  unknown: "Unverified source",
};

export function sourceQualityLabel(quality: SourceQuality): string {
  return sourceQualityLabelMap[quality] ?? "Source";
}

const sourceQualityDotMap: Record<SourceQuality, string> = {
  official: "bg-high",
  trusted: "bg-exa",
  medium: "bg-medium",
  low: "bg-low",
  unknown: "bg-ink-subtle",
};

export function sourceQualityDot(quality: SourceQuality): string {
  return sourceQualityDotMap[quality] ?? "bg-ink-subtle";
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Compact "x ago" for the live-sync indicator. Returns null for future or
 * older-than-a-week timestamps so the caller can fall back to an absolute date.
 * Computed client-side (it depends on `Date.now()`), so render with
 * suppressHydrationWarning.
 */
export function relativeTime(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return null;
}

/**
 * Compact relative freshness. Future-dated sources (the live Webset occasionally
 * carries forward-dated event/job pages) fall back to the absolute date so the UI
 * never reads "in 3 months".
 */
export function freshness(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return null;
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function domainLabel(domain?: string): string {
  if (!domain) return "";
  return domain.replace(/^www\./, "");
}

export function initialsFor(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
