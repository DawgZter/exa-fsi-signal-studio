"use client";

import * as React from "react";
import { ChevronDown, Info, Loader2, Search, SearchX } from "lucide-react";
import { ExaLogoImage } from "@/components/brand/exa-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountCard } from "@/components/workspace/account-card";
import { AccountDetailSheet } from "@/components/workspace/account-detail-sheet";
import { CreateStudioDialog } from "@/components/workspace/create-studio-dialog";
import { FilterPopover, type FilterOption } from "@/components/workspace/filter-popover";
import {
  confidenceLabel,
  formatDate,
  laneDescription,
  laneLabel,
  relativeTime,
  sourceQualityLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AccountRecord,
  AccountsResponse,
  ClientSignal,
  Confidence,
  SourceQuality,
} from "@/lib/types";

type Sort = "recent" | "signals" | "confidence";

const confidenceOrder: Confidence[] = ["high", "medium", "low"];
const qualityOrder: SourceQuality[] = ["official", "trusted", "medium", "low", "unknown"];
const confidenceRank: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

/**
 * Build facet options for a free-text account field straight from the signals.
 * Returns [] when the field is unpopulated so the filter can hide itself
 * (territory / account segment are not always present in the live Webset).
 */
function countOptions(
  signals: ClientSignal[],
  field: "accountSegment" | "territory" | "workflow" | "sourceType",
): FilterOption[] {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    const value = signal[field];
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

export function Workspace({
  initial,
  signals,
}: {
  initial: AccountsResponse;
  signals: ClientSignal[];
}) {
  const [data, setData] = React.useState<AccountsResponse>(initial);
  const [loading, setLoading] = React.useState(false);

  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [lanes, setLanes] = React.useState<string[]>([]);
  const [confidences, setConfidences] = React.useState<string[]>([]);
  const [qualities, setQualities] = React.useState<string[]>([]);
  const [workflows, setWorkflows] = React.useState<string[]>([]);
  const [subsectors, setSubsectors] = React.useState<string[]>([]);
  const [segments, setSegments] = React.useState<string[]>([]);
  const [territories, setTerritories] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState<Sort>("recent");

  const [detailAccount, setDetailAccount] = React.useState<AccountRecord | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [createTarget, setCreateTarget] = React.useState<{
    account: AccountRecord;
    signals: ClientSignal[];
  } | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const signalsById = React.useMemo(() => {
    const map = new Map<string, ClientSignal>();
    for (const signal of signals) map.set(signal.id, signal);
    return map;
  }, [signals]);

  // Debounce the free-text query before it hits the server.
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(timer);
  }, [q]);

  // Server-side filters (lane / confidence / source quality / query) re-group accounts.
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (lanes.length) params.set("lane", lanes.join(","));
    if (confidences.length) params.set("confidence", confidences.join(","));
    if (qualities.length) params.set("sourceQuality", qualities.join(","));
    if (workflows.length) params.set("workflow", workflows.join(","));

    setLoading(true);
    fetch(`/api/accounts?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((next: AccountsResponse) => setData(next))
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setLoading(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedQ, lanes, confidences, qualities, workflows]);

  const laneOptions: FilterOption[] = React.useMemo(
    () =>
      Object.entries(data.facets.lane ?? {})
        .filter(([value]) => value !== "unknown")
        .map(([value, count]) => ({ value, label: laneLabel(value), count }))
        .sort((a, b) => (b.count ?? 0) - (a.count ?? 0)),
    [data.facets.lane],
  );

  const confidenceOptions: FilterOption[] = React.useMemo(
    () =>
      confidenceOrder
        .filter((value) => data.facets.confidence?.[value])
        .map((value) => ({
          value,
          label: confidenceLabel(value),
          count: data.facets.confidence?.[value],
        })),
    [data.facets.confidence],
  );

  const qualityOptions: FilterOption[] = React.useMemo(
    () =>
      qualityOrder
        .filter((value) => data.facets.sourceQuality?.[value])
        .map((value) => ({
          value,
          label: sourceQualityLabel(value),
          count: data.facets.sourceQuality?.[value],
        })),
    [data.facets.sourceQuality],
  );

  const subsectorOptions: FilterOption[] = React.useMemo(
    () =>
      Object.entries(data.facets.fsiSubsector ?? {})
        .filter(([value]) => value !== "unknown")
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => (b.count ?? 0) - (a.count ?? 0)),
    [data.facets.fsiSubsector],
  );

  // Territory and account segment are not always enriched in the Webset, so we
  // derive their facets client-side and only surface the filters when populated.
  const segmentOptions = React.useMemo(() => countOptions(signals, "accountSegment"), [signals]);
  const territoryOptions = React.useMemo(() => countOptions(signals, "territory"), [signals]);
  const workflowOptions = React.useMemo(() => countOptions(signals, "workflow"), [signals]);

  const visibleAccounts = React.useMemo(() => {
    let accounts = data.accounts;
    if (workflows.length) {
      const domains = new Set(
        signals.filter((signal) => signal.workflow && workflows.includes(signal.workflow)).map((signal) => signal.companyDomain),
      );
      accounts = accounts.filter((account) => domains.has(account.companyDomain));
    }
    if (subsectors.length) {
      accounts = accounts.filter(
        (account) => account.fsiSubsector && subsectors.includes(account.fsiSubsector),
      );
    }
    if (segments.length) {
      accounts = accounts.filter(
        (account) => account.accountSegment && segments.includes(account.accountSegment),
      );
    }
    if (territories.length) {
      accounts = accounts.filter(
        (account) => account.territory && territories.includes(account.territory),
      );
    }
    const sorted = [...accounts];
    if (sort === "signals") {
      sorted.sort(
        (a, b) =>
          b.signalCount - a.signalCount ||
          (b.latestSignalDate ?? "").localeCompare(a.latestSignalDate ?? ""),
      );
    } else if (sort === "confidence") {
      sorted.sort(
        (a, b) =>
          confidenceRank[b.highestConfidence] - confidenceRank[a.highestConfidence] ||
          (b.latestSignalDate ?? "").localeCompare(a.latestSignalDate ?? ""),
      );
    }
    return sorted;
  }, [data.accounts, signals, workflows, subsectors, segments, territories, sort]);

  const activeFilters =
    lanes.length +
    confidences.length +
    qualities.length +
    workflows.length +
    subsectors.length +
    segments.length +
    territories.length +
    (q ? 1 : 0);

  const clearAll = () => {
    setQ("");
    setLanes([]);
    setConfidences([]);
    setQualities([]);
    setWorkflows([]);
    setSubsectors([]);
    setSegments([]);
    setTerritories([]);
  };

  const laneCount = Object.keys(data.facets.lane ?? {}).filter((v) => v !== "unknown").length;

  const openAccount = (account: AccountRecord) => {
    setDetailAccount(account);
    setDetailOpen(true);
  };

  const startCreateStudio = (account: AccountRecord, accountSignals: ClientSignal[]) => {
    setCreateTarget({ account, signals: accountSignals });
    setDetailOpen(false);
    setCreateOpen(true);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-2.5">
            <ExaLogoImage className="h-5 w-auto" />
            <Badge variant="outline" className="hidden sm:inline-flex">
              Internal
            </Badge>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
            <span className="flex h-1.5 w-1.5 rounded-full bg-high" />
            <span>Webset live</span>
            <span className="hidden text-line-strong sm:inline">·</span>
            <LastUpdated iso={data.sync?.lastSyncedAt} className="hidden sm:inline" />
          </div>
        </div>
      </header>

      {/* Editorial intro */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1240px] px-5 py-9">
          <h1 className="font-editorial max-w-3xl text-[30px] leading-[1.1] text-ink md:text-[38px]">
            FSI Signal Studio
          </h1>
          <p className="mt-3.5 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
            FSI Signal Studio uses Exa Websets to surface live AI-agent signals across financial
            services: launches, hiring, buying, build activity, and governance. From any signal, an
            AE or FDE can generate a prospect-specific demo Webset grounded in fresh, cited web
            intelligence.
          </p>
          <dl className="mt-7 flex flex-wrap gap-x-9 gap-y-3">
            <Stat label="Accounts" value={initial.count} />
            <Stat label="Signals" value={initial.signalCount} />
            <Stat
              label="Signal lanes"
              value={laneCount}
              info={
                <div className="-mr-2 max-h-[60vh] space-y-3 overflow-y-auto pr-2">
                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    Each lane is a distinct kind of public-web evidence that a financial-services
                    company is adopting AI agents.
                  </p>
                  <div className="space-y-3 border-t border-line pt-3">
                    {laneOptions.map((option) => (
                      <div key={option.value}>
                        <p className="text-[13px] font-medium text-ink">
                          {option.label}
                          {typeof option.count === "number" && (
                            <span className="ml-1.5 font-mono text-[11px] text-ink-subtle">
                              {option.count}
                            </span>
                          )}
                        </p>
                        <p className="text-[12.5px] leading-snug text-ink-muted">
                          {laneDescription(option.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              }
            />
          </dl>
        </div>
      </section>

      {/* Toolbar */}
      <div className="sticky top-14 z-20 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] flex-nowrap items-center gap-2 overflow-x-auto px-5 py-3">
          <div className="relative min-w-[180px] flex-1 sm:w-72 sm:flex-initial">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="search accounts and signals"
              className="h-8 pl-8 text-[13px]"
            />
          </div>
          <FilterPopover
            label="Signal lane"
            options={laneOptions}
            selected={lanes}
            onChange={setLanes}
            optionTooltip={(option) => laneDescription(option.value)}
          />
          <FilterPopover
            label="Confidence"
            options={confidenceOptions}
            selected={confidences}
            onChange={setConfidences}
          />
          <FilterPopover
            label="Source quality"
            options={qualityOptions}
            selected={qualities}
            onChange={setQualities}
          />
          {workflowOptions.length > 0 && (
            <FilterPopover
              label="Workflow"
              options={workflowOptions}
              selected={workflows}
              onChange={setWorkflows}
            />
          )}
          <FilterPopover
            label="Subsector"
            options={subsectorOptions}
            selected={subsectors}
            onChange={setSubsectors}
          />
          {segmentOptions.length > 0 && (
            <FilterPopover
              label="Segment"
              options={segmentOptions}
              selected={segments}
              onChange={setSegments}
            />
          )}
          {territoryOptions.length > 0 && (
            <FilterPopover
              label="Territory"
              options={territoryOptions}
              selected={territories}
              onChange={setTerritories}
            />
          )}

          <div className="ml-auto flex shrink-0 items-center gap-3 pl-1">
            <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-subtle" />}
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[12px] font-medium text-exa-ink underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="h-8 appearance-none rounded-sm border border-line bg-surface pl-2.5 pr-7 text-[13px] text-ink outline-none transition-colors hover:bg-fill focus-visible:ring-2 focus-visible:ring-exa/35"
                aria-label="Sort accounts"
              >
                <option value="recent">Newest</option>
                <option value="signals">Most signals</option>
                <option value="confidence">Confidence</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <main className="mx-auto max-w-[1240px] px-5 py-6">
        {visibleAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
            <SearchX className="h-6 w-6 text-ink-subtle" />
            <p className="mt-3 text-sm font-medium text-ink">No accounts match these filters</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-muted">
              Try widening the signal lanes, confidence, or subsector — the Webset keeps the full
              breadth of signals available.
            </p>
            {activeFilters > 0 && (
              <Button variant="secondary" size="sm" className="mt-4" onClick={clearAll}>
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2",
              loading && "opacity-60",
            )}
          >
            {visibleAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                latestSignal={
                  account.latestSignalId ? signalsById.get(account.latestSignalId) : undefined
                }
                onOpen={() => openAccount(account)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-2 px-5 py-6 text-[12px] text-ink-subtle sm:flex-row sm:items-center">
          <p className="flex items-center gap-2">
            <ExaLogoImage className="h-4 w-auto" />
            <span className="text-line-strong">·</span>
            Source-backed FSI signals from Exa Websets
          </p>
          <p className="font-mono">
            Last sync {formatDate(data.sync.lastSyncedAt)} · public web only
          </p>
        </div>
      </footer>

      <AccountDetailSheet
        account={detailAccount}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onCreateStudio={startCreateStudio}
      />
      <CreateStudioDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        account={createTarget?.account ?? null}
        signals={createTarget?.signals ?? []}
      />
      </div>
    </TooltipProvider>
  );
}

/**
 * Live "last updated" indicator. Renders an absolute date on the server / first
 * paint (deterministic) then upgrades to a relative "x ago" after mount, ticking
 * each minute. suppressHydrationWarning covers the server→client text swap.
 */
function LastUpdated({ iso, className }: { iso?: string; className?: string }) {
  const [label, setLabel] = React.useState(() => `Updated ${formatDate(iso)}`);

  React.useEffect(() => {
    if (!iso) {
      setLabel("Not yet synced");
      return;
    }
    const tick = () => setLabel(`Updated ${relativeTime(iso) ?? formatDate(iso)}`);
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <span
      className={cn("text-ink", className)}
      suppressHydrationWarning
      title={iso ? new Date(iso).toLocaleString() : undefined}
    >
      {label}
    </span>
  );
}

function Stat({
  label,
  value,
  info,
}: {
  label: string;
  value: string | number;
  info?: React.ReactNode;
}) {
  const body = (
    <div className="flex flex-col gap-0.5 text-left">
      <dd className="font-mono text-[22px] leading-none tabular-nums text-ink">{value}</dd>
      <dt className="flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-subtle">
        {label}
        {info && <Info className="h-3 w-3 text-ink-subtle" />}
      </dt>
    </div>
  );

  if (!info) return body;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="cursor-pointer rounded-sm outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-exa/35"
        >
          {body}
        </button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        {info}
      </DialogContent>
    </Dialog>
  );
}
