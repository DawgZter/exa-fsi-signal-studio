"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import {
  domainLabel,
  formatDate,
  freshness,
  laneDescription,
  laneLabel,
  sourceQualityDot,
  sourceQualityLabel,
} from "@/lib/format";
import type { ClientSignal } from "@/lib/types";

export function SignalItem({ signal }: { signal: ClientSignal }) {
  const fresh = freshness(signal.sourceDate ?? signal.discoveredAt);

  return (
    <article className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Tooltip content={laneDescription(signal.lane)}>
            <span className="inline-flex">
              <Badge variant="neutral">{laneLabel(signal.lane)}</Badge>
            </span>
          </Tooltip>
          {signal.workflow && <Badge variant="outline">{signal.workflow}</Badge>}
        </div>
        <Badge variant={signal.confidence}>{signal.confidence}</Badge>
      </div>

      <div className="mt-3">
        {signal.sourceUrl ? (
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-start gap-1.5 text-sm font-medium leading-snug text-ink underline-offset-2 transition-colors hover:text-exa-ink hover:underline"
          >
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-subtle transition-colors group-hover:text-exa-ink" />
            <span>{signal.sourceTitle ?? domainLabel(signal.sourceDomain) ?? "Source"}</span>
          </a>
        ) : (
          <span className="text-sm font-medium text-ink">{signal.sourceTitle ?? "Source"}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-ink-subtle">
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${sourceQualityDot(signal.sourceQuality)}`} />
          {sourceQualityLabel(signal.sourceQuality)}
        </span>
        {signal.sourceDomain && (
          <>
            <span className="text-line-strong">·</span>
            <span>{domainLabel(signal.sourceDomain)}</span>
          </>
        )}
        <span className="text-line-strong">·</span>
        <span>{formatDate(signal.sourceDate ?? signal.discoveredAt)}</span>
        {fresh && (
          <>
            <span className="text-line-strong">·</span>
            <span>{fresh}</span>
          </>
        )}
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{signal.evidenceSummary}</p>

      {signal.whyExaMatters && (
        <div className="mt-3 rounded-sm border border-exa-line bg-exa-wash p-3">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-exa-ink">
            Why Exa matters
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">{signal.whyExaMatters}</p>
        </div>
      )}

      {signal.confidenceReason && (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-subtle">
          <span className="font-medium text-ink-muted">Confidence:</span> {signal.confidenceReason}
        </p>
      )}
    </article>
  );
}
