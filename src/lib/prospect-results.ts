import type { SignalStudio } from "./domain";
import { normalizeWebsetItems } from "./normalize";
import { ExaWebsetsClient, enrichmentFieldMapFromWebset } from "./websets";

export type ProspectWebsetResult = {
  id: string;
  title?: string;
  url?: string;
  sourceDomain?: string;
  sourceDate?: string;
  sourceQuality?: string;
  evidenceSummary: string;
  confidence?: string;
  workflow?: string;
  accountName?: string;
  companyDomain?: string;
};

export type ProspectWebsetResultsResponse = {
  status: "preview" | "loading" | "live" | "degraded";
  studioSlug: string;
  accountName: string;
  companyDomain: string;
  monitorQuery: string;
  monitorCriteria: string[];
  prospectWebset?: SignalStudio["prospectWebset"];
  resultCount: number;
  results: ProspectWebsetResult[];
  lastFetchedAt: string;
  error?: string;
};

function previewResults(studio: SignalStudio): ProspectWebsetResult[] {
  return studio.sourcePack.map((source) => ({
    id: source.signalId,
    title: source.title,
    url: source.url,
    sourceDomain: source.sourceDomain,
    sourceDate: source.sourceDate,
    sourceQuality: "internal-context",
    evidenceSummary: source.evidenceSummary,
    confidence: source.confidence,
    workflow: studio.selectedWorkflow,
    accountName: studio.accountName,
    companyDomain: studio.companyDomain,
  }));
}

function previewResponse(
  studio: SignalStudio,
  lastFetchedAt: string,
  prospectWebset?: SignalStudio["prospectWebset"],
): ProspectWebsetResultsResponse {
  const results = previewResults(studio);
  return {
    status: "preview",
    studioSlug: studio.slug,
    accountName: studio.accountName,
    companyDomain: studio.companyDomain,
    monitorQuery: studio.monitorQuery,
    monitorCriteria: studio.monitorCriteria,
    prospectWebset,
    resultCount: results.length,
    results,
    lastFetchedAt,
  };
}

function degradedResponse(
  studio: SignalStudio,
  lastFetchedAt: string,
  error: unknown,
): ProspectWebsetResultsResponse {
  const results = previewResults(studio);
  return {
    status: "degraded",
    studioSlug: studio.slug,
    accountName: studio.accountName,
    companyDomain: studio.companyDomain,
    monitorQuery: studio.monitorQuery,
    monitorCriteria: studio.monitorCriteria,
    prospectWebset: studio.prospectWebset,
    resultCount: results.length,
    results,
    lastFetchedAt,
    error: error instanceof Error ? error.message : "Live Webset results are temporarily unavailable.",
  };
}

function liveStatus(webset: Record<string, unknown>, resultCount: number): ProspectWebsetResultsResponse["status"] {
  if (resultCount > 0) {
    return "live";
  }
  const status = typeof webset.status === "string" ? webset.status.toLowerCase() : "";
  return ["completed", "complete", "idle", "ready"].includes(status) ? "live" : "loading";
}

export async function getProspectWebsetResults(
  studio: SignalStudio,
  options: { maxItems?: number } = {},
): Promise<ProspectWebsetResultsResponse> {
  const maxItems = Math.max(1, Math.min(options.maxItems ?? 30, 50));
  const lastFetchedAt = new Date().toISOString();
  if (!studio.prospectWebset) {
    return previewResponse(studio, lastFetchedAt);
  }

  try {
    const client = new ExaWebsetsClient();
    const webset = await client.getWebset(studio.prospectWebset.websetId);
    const enrichmentFieldById = enrichmentFieldMapFromWebset(webset);
    const rawItems = await client.listAllWebsetItems(studio.prospectWebset.websetId, { maxItems });
    const results = normalizeWebsetItems(rawItems, {
      websetId: studio.prospectWebset.websetId,
      enrichmentFieldById,
    }).map((signal) => ({
      id: signal.id,
      title: signal.sourceTitle,
      url: signal.sourceUrl,
      sourceDomain: signal.sourceDomain,
      sourceDate: signal.sourceDate,
      sourceQuality: signal.sourceQuality,
      evidenceSummary: signal.evidenceSummary,
      confidence: signal.confidence,
      workflow: signal.workflow ?? studio.selectedWorkflow,
      accountName: signal.accountName,
      companyDomain: signal.companyDomain,
    }));

    return {
      status: liveStatus(webset, results.length),
      studioSlug: studio.slug,
      accountName: studio.accountName,
      companyDomain: studio.companyDomain,
      monitorQuery: studio.monitorQuery,
      monitorCriteria: studio.monitorCriteria,
      prospectWebset: studio.prospectWebset,
      resultCount: results.length,
      results,
      lastFetchedAt,
    };
  } catch (error) {
    console.warn("Live prospect Webset results unavailable; serving degraded source-pack evidence.", error);
    return degradedResponse(studio, lastFetchedAt, error);
  }
}
