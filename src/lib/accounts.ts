import { createHash } from "node:crypto";
import {
  accountRecordSchema,
  confidenceSchema,
  signalLaneSchema,
  type AccountRecord,
  type Confidence,
  type SignalLane,
  type SignalRecord,
} from "./domain";
import { normalizeDomain } from "./logo";

export type SignalFilters = {
  q?: string;
  lane?: SignalLane[];
  confidence?: Confidence[];
  sourceType?: string[];
  sourceQuality?: string[];
  workflow?: string[];
  accountSegment?: string[];
  territory?: string[];
  accountDomain?: string;
  limit?: number;
};

const confidenceRank: Record<Confidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function stableId(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function maxConfidence(values: Confidence[]): Confidence {
  return values.reduce((best, value) => (confidenceRank[value] > confidenceRank[best] ? value : best), "low");
}

function latestDate(signals: SignalRecord[]): string | undefined {
  return signals
    .map((signal) => signal.sourceDate ?? signal.discoveredAt)
    .filter(Boolean)
    .sort()
    .at(-1);
}

export function buildAccounts(signals: SignalRecord[]): AccountRecord[] {
  const grouped = new Map<string, SignalRecord[]>();

  for (const signal of signals) {
    const domain = normalizeDomain(signal.companyDomain) || signal.companyDomain;
    const existing = grouped.get(domain) ?? [];
    existing.push(signal);
    grouped.set(domain, existing);
  }

  return Array.from(grouped.entries())
    .map(([domain, accountSignals]) => {
      const sorted = [...accountSignals].sort((a, b) => (b.sourceDate ?? b.discoveredAt).localeCompare(a.sourceDate ?? a.discoveredAt));
      const latest = sorted[0];
      return accountRecordSchema.parse({
        id: `acct_${stableId(domain)}`,
        accountName: latest.accountName,
        companyDomain: domain,
        accountSegment: latest.accountSegment,
        territory: latest.territory,
        fsiSubsector: latest.fsiSubsector,
        latestSignalDate: latest.sourceDate ?? latest.discoveredAt,
        latestSignalId: latest.id,
        allSignalTypesSeen: Array.from(new Set(accountSignals.map((signal) => signal.signalType))).sort(),
        signalLanesSeen: Array.from(new Set(accountSignals.map((signal) => signal.lane))).sort(),
        signalCount: accountSignals.length,
        highestConfidence: maxConfidence(accountSignals.map((signal) => signal.confidence)),
        lastSeenAt: latestDate(accountSignals) ?? latest.discoveredAt,
      });
    })
    .sort((a, b) => (b.latestSignalDate ?? "").localeCompare(a.latestSignalDate ?? ""));
}

export function parseSignalFilters(searchParams: URLSearchParams): SignalFilters {
  const list = (key: string) =>
    searchParams
      .getAll(key)
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);

  const lanes = list("lane").flatMap((value) => {
    const parsed = signalLaneSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
  const confidences = list("confidence").flatMap((value) => {
    const parsed = confidenceSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
  const limit = Number(searchParams.get("limit") ?? "");

  return {
    q: searchParams.get("q") ?? undefined,
    lane: lanes.length ? lanes : undefined,
    confidence: confidences.length ? confidences : undefined,
    sourceType: list("sourceType"),
    sourceQuality: list("sourceQuality"),
    workflow: list("workflow"),
    accountSegment: [...list("accountSegment"), ...list("segment")],
    territory: list("territory"),
    accountDomain: searchParams.get("accountDomain") ?? undefined,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 250) : undefined,
  };
}

export function filterSignals(signals: SignalRecord[], filters: SignalFilters): SignalRecord[] {
  const q = filters.q?.toLowerCase();
  const accountDomain = filters.accountDomain ? normalizeDomain(filters.accountDomain) : undefined;

  const filtered = signals.filter((signal) => {
    if (accountDomain && normalizeDomain(signal.companyDomain) !== accountDomain) {
      return false;
    }
    if (filters.lane?.length && !filters.lane.includes(signal.lane)) {
      return false;
    }
    if (filters.confidence?.length && !filters.confidence.includes(signal.confidence)) {
      return false;
    }
    if (filters.sourceType?.length && !filters.sourceType.includes(signal.sourceType)) {
      return false;
    }
    if (filters.sourceQuality?.length && !filters.sourceQuality.includes(signal.sourceQuality)) {
      return false;
    }
    if (filters.workflow?.length && (!signal.workflow || !filters.workflow.includes(signal.workflow))) {
      return false;
    }
    if (filters.accountSegment?.length && (!signal.accountSegment || !filters.accountSegment.includes(signal.accountSegment))) {
      return false;
    }
    if (filters.territory?.length && (!signal.territory || !filters.territory.includes(signal.territory))) {
      return false;
    }
    if (q) {
      const haystack = [
        signal.accountName,
        signal.companyDomain,
        signal.signalType,
        signal.sourceTitle,
        signal.evidenceSummary,
        signal.workflow,
        signal.whyExaMatters,
        ...signal.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const sorted = filtered.sort((a, b) => (b.sourceDate ?? b.discoveredAt).localeCompare(a.sourceDate ?? a.discoveredAt));
  return filters.limit ? sorted.slice(0, filters.limit) : sorted;
}

export function signalFacets(signals: SignalRecord[]): Record<string, Record<string, number>> {
  const facets: Record<string, Record<string, number>> = {
    lane: {},
    confidence: {},
    sourceType: {},
    sourceQuality: {},
    workflow: {},
    fsiSubsector: {},
    accountSegment: {},
    territory: {},
  };

  for (const signal of signals) {
    const entries = {
      lane: signal.lane,
      confidence: signal.confidence,
      sourceType: signal.sourceType,
      sourceQuality: signal.sourceQuality,
      workflow: signal.workflow ?? "unknown",
      fsiSubsector: signal.fsiSubsector ?? "unknown",
      accountSegment: signal.accountSegment ?? "unknown",
      territory: signal.territory ?? "unknown",
    };
    for (const [facet, value] of Object.entries(entries)) {
      facets[facet][value] = (facets[facet][value] ?? 0) + 1;
    }
  }

  return facets;
}
