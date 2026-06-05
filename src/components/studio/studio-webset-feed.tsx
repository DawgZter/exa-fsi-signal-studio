"use client";

import * as React from "react";
import { AlertTriangle, ExternalLink, Loader2, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { domainLabel, formatDate, freshness } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProspectWebsetResult, StudioWebsetItemsResponse } from "@/lib/types";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 30;

type FetchState = "loading" | "ready" | "error";

const STATUS_LABEL: Record<StudioWebsetItemsResponse["status"], string> = {
  live: "Live Webset",
  loading: "Building Webset",
  degraded: "Live Webset unavailable",
  preview: "Preview only",
};

const CONFIDENCE_VARIANT: Record<string, "high" | "medium" | "low"> = {
  high: "high",
  medium: "medium",
  low: "low",
};

export function StudioWebsetFeed({
  slug,
  accountName,
}: {
  slug: string;
  accountName: string;
}) {
  const [fetchState, setFetchState] = React.useState<FetchState>("loading");
  const [data, setData] = React.useState<StudioWebsetItemsResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;

    async function load(isPoll: boolean) {
      if (!isPoll) {
        setFetchState("loading");
        setErrorMessage("");
      }
      try {
        const response = await fetch(`/api/studios/${encodeURIComponent(slug)}/webset-items?maxItems=30`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? `Request failed (${response.status})`);
        }
        const payload = (await response.json()) as StudioWebsetItemsResponse;
        if (cancelled) return;
        setData(payload);
        setFetchState("ready");
        // Keep polling while the live Webset is still building or temporarily unavailable.
        if ((payload.status === "loading" || payload.status === "degraded") && polls < MAX_POLLS) {
          polls += 1;
          timer = setTimeout(() => load(true), POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Could not load results.");
        setFetchState("error");
      }
    }

    load(false);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [slug, reloadKey]);

  const eyebrow = data ? STATUS_LABEL[data.status] : "Live Webset";
  const heading =
    data?.status === "live"
      ? `What this Webset is surfacing for ${accountName}`
      : data?.status === "loading"
        ? `Building ${accountName}'s Exa Webset`
        : data?.status === "degraded"
          ? `Live Webset results are temporarily unavailable for ${accountName}`
          : `What this Webset would surface for ${accountName}`;

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-subtle">
              {eyebrow}
              {data && <StatusDot status={data.status} />}
            </p>
            <h2 className="font-editorial mt-2 text-[24px] leading-tight text-ink">{heading}</h2>
          </div>
          {data?.prospectWebset?.dashboardUrl && (
            <a
              href={data.prospectWebset.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-exa-ink underline-offset-2 hover:underline"
            >
              Open Webset in Exa
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <div className="mt-6">
          {fetchState === "loading" && <FeedSkeleton />}

          {fetchState === "error" && (
            <div className="rounded-md border border-line bg-surface px-6 py-12 text-center">
              <AlertTriangle className="mx-auto h-5 w-5 text-medium" />
              <p className="mt-2 text-[13px] font-medium text-ink">Couldn&rsquo;t load Webset results</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-muted">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-exa-ink underline-offset-2 hover:underline"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {fetchState === "ready" && data && <FeedBody data={data} />}
        </div>
      </div>
    </section>
  );
}

function FeedBody({ data }: { data: StudioWebsetItemsResponse }) {
  if (data.status === "loading") {
    return (
      <div className="rounded-md border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-exa" />
        <p className="mt-3 text-[13px] font-medium text-ink">Exa is building this Webset</p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-ink-muted">
          Exa is running the first crawl for this Webset. Results will appear here automatically as
          they come in.
        </p>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
        <p className="text-[13px] font-medium text-ink">
          {data.status === "degraded" ? "Live results temporarily unavailable" : "No results yet"}
        </p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-ink-muted">
          {data.status === "degraded"
            ? "The embedded feed is retrying the live Webset and will switch back when results are available."
            : "This Webset hasn&rsquo;t surfaced matching public-web evidence yet. It re-runs on a schedule, so the feed will fill in over time."}
        </p>
      </div>
    );
  }

  return (
    <>
      {(data.status === "preview" || data.status === "degraded") && (
        <p className="mb-4 rounded-sm border border-line bg-canvas px-3 py-2 text-[12.5px] leading-relaxed text-ink-muted">
          {data.status === "degraded"
            ? "Live Webset temporarily unavailable · showing source-pack preview evidence while the embedded feed retries."
            : "Preview only · no live Webset has been provisioned. This page is showing internal source-pack evidence because live Webset provisioning was not authorized or preview mode was selected."}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data.results.map((result) => (
          <ResultCard key={result.id} result={result} />
        ))}
      </div>
      <p className="mt-4 font-mono text-[11px] text-ink-subtle">
        {data.resultCount} {data.resultCount === 1 ? "result" : "results"} · updated{" "}
        {formatDate(data.lastFetchedAt)}
      </p>
    </>
  );
}

function ResultCard({ result }: { result: ProspectWebsetResult }) {
  const fresh = freshness(result.sourceDate);
  const confidenceVariant = result.confidence ? CONFIDENCE_VARIANT[result.confidence] : undefined;
  const title = result.title ?? domainLabel(result.sourceDomain) ?? "Public source";

  return (
    <article className="flex flex-col rounded-md border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {result.workflow && <Badge variant="outline">{result.workflow}</Badge>}
        </div>
        {confidenceVariant && <Badge variant={confidenceVariant}>{result.confidence}</Badge>}
      </div>

      <div className="mt-3">
        {result.url ? (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-start gap-1.5 text-sm font-medium leading-snug text-ink underline-offset-2 transition-colors hover:text-exa-ink hover:underline"
          >
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subtle transition-colors group-hover:text-exa-ink" />
            <span>{title}</span>
          </a>
        ) : (
          <span className="text-sm font-medium leading-snug text-ink">{title}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-ink-subtle">
        {result.sourceDomain && <span>{domainLabel(result.sourceDomain)}</span>}
        {result.sourceDate && (
          <>
            {result.sourceDomain && <span className="text-line-strong">·</span>}
            <span>{formatDate(result.sourceDate)}</span>
          </>
        )}
        {fresh && (
          <>
            <span className="text-line-strong">·</span>
            <span>{fresh}</span>
          </>
        )}
      </div>

      <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink-muted">{result.evidenceSummary}</p>
    </article>
  );
}

function StatusDot({ status }: { status: StudioWebsetItemsResponse["status"] }) {
  const tone = cn(
    "inline-flex h-1.5 w-1.5 rounded-full",
    status === "live" ? "bg-high" : status === "loading" || status === "degraded" ? "bg-medium" : "bg-ink-subtle",
  );
  return <span className={tone} aria-hidden />;
}

function FeedSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2.5 h-3 w-1/2" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}
