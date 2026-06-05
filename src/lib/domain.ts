import { z } from "zod";

export const signalLaneSchema = z.enum([
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
]);

export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const sourceQualitySchema = z.enum(["official", "trusted", "medium", "low", "unknown"]);

export const signalRecordSchema = z.object({
  id: z.string(),
  websetId: z.string().optional(),
  websetItemId: z.string().optional(),
  searchId: z.string().optional(),
  monitorId: z.string().optional(),
  accountName: z.string(),
  companyDomain: z.string(),
  accountSegment: z.string().optional(),
  territory: z.string().optional(),
  fsiSubsector: z.string().optional(),
  lane: signalLaneSchema,
  signalType: z.string(),
  sourceType: z.string(),
  sourceQuality: sourceQualitySchema,
  sourceUrl: z.string().url().optional(),
  sourceTitle: z.string().optional(),
  sourceDomain: z.string().optional(),
  sourceDate: z.string().optional(),
  discoveredAt: z.string(),
  evidenceSummary: z.string(),
  evidenceSnippet: z.string().optional(),
  confidence: confidenceSchema,
  confidenceReason: z.string().optional(),
  workflow: z.string().optional(),
  agentAdoptionStage: z.string().optional(),
  whyExaMatters: z.string().optional(),
  suggestedDemoOptions: z.array(z.string()).default([]),
  buyerPersonas: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  raw: z.record(z.string(), z.unknown()).optional(),
});

export const accountRecordSchema = z.object({
  id: z.string(),
  accountName: z.string(),
  companyDomain: z.string(),
  accountSegment: z.string().optional(),
  territory: z.string().optional(),
  fsiSubsector: z.string().optional(),
  latestSignalDate: z.string().optional(),
  latestSignalId: z.string().optional(),
  allSignalTypesSeen: z.array(z.string()).default([]),
  signalLanesSeen: z.array(signalLaneSchema).default([]),
  signalCount: z.number().int().nonnegative(),
  highestConfidence: confidenceSchema,
  lastSeenAt: z.string(),
});

export const studioOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  workflow: z.string(),
  audience: z.string(),
  monitorQuery: z.string(),
  monitorCriteria: z.array(z.string()),
  valueProposition: z.string(),
});

export const sourcePackItemSchema = z.object({
  signalId: z.string(),
  title: z.string().optional(),
  url: z.string().url().optional(),
  sourceDomain: z.string().optional(),
  sourceDate: z.string().optional(),
  confidence: confidenceSchema,
  evidenceSummary: z.string(),
});

export const prospectWebsetSchema = z.object({
  websetId: z.string(),
  searchId: z.string().optional(),
  monitorId: z.string().optional(),
  dashboardUrl: z.string().url().optional(),
  createdAt: z.string(),
});

export const signalStudioSchema = z.object({
  id: z.string(),
  slug: z.string(),
  accountName: z.string(),
  companyDomain: z.string(),
  prospectLogoUrl: z.string().url().optional(),
  selectedSignalIds: z.array(z.string()),
  studioName: z.string(),
  selectedWorkflow: z.string(),
  generatedBrief: z.string(),
  monitorQuery: z.string(),
  monitorCriteria: z.array(z.string()),
  prospectWebset: prospectWebsetSchema.optional(),
  options: z.array(studioOptionSchema),
  sourcePack: z.array(sourcePackItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().default("agent"),
  repNote: z.string().optional(),
});

export const syncStateSchema = z.object({
  websetId: z.string().optional(),
  lastSyncedAt: z.string().optional(),
  lastError: z.string().optional(),
  signalsSynced: z.number().int().nonnegative().default(0),
  accountsSynced: z.number().int().nonnegative().default(0),
  source: z.enum(["websets", "seed", "none"]).default("none"),
});

export const signalReviewIssueSchema = z.object({
  field: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  message: z.string(),
});

export const prospectWebsetSuggestionSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  workflow: z.string(),
  title: z.string(),
  audience: z.string(),
  monitorQuery: z.string(),
  monitorCriteria: z.array(z.string()).min(1).max(5),
  valueProposition: z.string(),
  rationale: z.string(),
});

export const accountWebsetSuggestionSchema = z.object({
  id: z.string(),
  accountName: z.string(),
  companyDomain: z.string(),
  signalHash: z.string(),
  sourceSignalIds: z.array(z.string()).default([]),
  source: z.enum(["exa-answer-account", "exa-answer-row-review", "heuristic"]),
  status: z.enum(["approved", "needs_review", "rejected"]),
  accuracyScore: z.number().int().min(0).max(100),
  fitScore: z.number().int().min(0).max(100),
  reviewerModel: z.string(),
  generatedAt: z.string(),
  rationale: z.string(),
  suggestions: z.array(prospectWebsetSuggestionSchema).default([]),
  issues: z.array(signalReviewIssueSchema).default([]),
});

const reviewScoreSchema = z.preprocess((value) => {
  if (typeof value !== "number") {
    return value;
  }
  const normalized = value > 0 && value <= 1 ? value * 100 : value;
  return Math.round(normalized);
}, z.number().int().min(0).max(100));

export const signalReviewSchema = z.object({
  signalId: z.string(),
  rowHash: z.string(),
  status: z.enum(["approved", "needs_review", "rejected"]),
  accuracyScore: reviewScoreSchema,
  outboundUsefulnessScore: reviewScoreSchema,
  reviewerModel: z.string(),
  reviewedAt: z.string(),
  rationale: z.string(),
  corrected: z.object({
    accountName: z.string().optional(),
    companyDomain: z.string().optional(),
    lane: signalLaneSchema.optional(),
    signalType: z.string().optional(),
    confidence: confidenceSchema.optional(),
    sourceQuality: sourceQualitySchema.optional(),
    fsiSubsector: z.string().optional(),
    workflow: z.string().optional(),
  }).default({}),
  prospectWebsetSuggestion: prospectWebsetSuggestionSchema.optional(),
  issues: z.array(signalReviewIssueSchema).default([]),
});

export type SignalLane = z.infer<typeof signalLaneSchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export type SourceQuality = z.infer<typeof sourceQualitySchema>;
export type SignalRecord = z.infer<typeof signalRecordSchema>;
export type AccountRecord = z.infer<typeof accountRecordSchema>;
export type StudioOption = z.infer<typeof studioOptionSchema>;
export type SignalStudio = z.infer<typeof signalStudioSchema>;
export type SyncState = z.infer<typeof syncStateSchema>;
export type SignalReview = z.infer<typeof signalReviewSchema>;
export type SignalReviewIssue = z.infer<typeof signalReviewIssueSchema>;
export type ProspectWebsetSuggestion = z.infer<typeof prospectWebsetSuggestionSchema>;
export type AccountWebsetSuggestion = z.infer<typeof accountWebsetSuggestionSchema>;
