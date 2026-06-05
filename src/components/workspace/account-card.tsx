"use client";

import { ArrowUpRight, ExternalLink } from "lucide-react";
import { ProspectLogo } from "@/components/brand/prospect-logo";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import {
  confidenceLabel,
  describeSignalType,
  domainLabel,
  formatDate,
  freshness,
  signalTypeLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountRecord, ClientSignal } from "@/lib/types";

export function AccountCard({
  account,
  latestSignal,
  onOpen,
}: {
  account: AccountRecord;
  latestSignal?: ClientSignal;
  onOpen: () => void;
}) {
  const signalTypes = account.allSignalTypesSeen.filter(Boolean);
  const visibleSignalTypes = signalTypes.slice(0, 4);
  const extraSignalTypes = signalTypes.length - visibleSignalTypes.length;
  const fresh = freshness(account.latestSignalDate);
  const meta = [account.fsiSubsector, account.accountSegment, account.territory].filter(
    Boolean,
  ) as string[];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group flex cursor-pointer flex-col rounded-md border border-line bg-surface p-4 outline-none transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-exa/35"
    >
      <div className="flex items-start gap-3">
        <ProspectLogo name={account.accountName} src={prospectFavicon(account.companyDomain)} size={38} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-medium leading-tight tracking-tight text-ink">
            {account.accountName}
          </h3>
          <p className="truncate font-mono text-[11px] text-ink-subtle">
            {domainLabel(account.companyDomain)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <Badge variant={account.highestConfidence} title={confidenceLabel(account.highestConfidence)}>
            {account.highestConfidence}
          </Badge>
          <span className="font-mono text-[10.5px] text-ink-subtle">
            {fresh ?? formatDate(account.latestSignalDate)}
          </span>
        </div>
      </div>

      {meta.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-muted">
          {meta.map((value, index) => (
            <span key={value} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-ink-subtle">·</span>}
              {value}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1">
        {visibleSignalTypes.map((signalType) => (
          <Tooltip
            key={signalType}
            content={
              <span className="block">
                <span className="block font-medium text-ink">{signalTypeLabel(signalType)}</span>
                <span className="mt-0.5 block text-ink-muted">{describeSignalType(signalType)}</span>
              </span>
            }
          >
            <span className="inline-flex">
              <Badge variant="neutral">{signalTypeLabel(signalType)}</Badge>
            </span>
          </Tooltip>
        ))}
        {extraSignalTypes > 0 && (
          <Tooltip
            content={
              <span className="block">
                {signalTypes.slice(4).map((signalType) => (
                  <span key={signalType} className="block text-ink">
                    {signalTypeLabel(signalType)}
                  </span>
                ))}
              </span>
            }
          >
            <span className="inline-flex">
              <Badge variant="outline">+{extraSignalTypes}</Badge>
            </span>
          </Tooltip>
        )}
      </div>

      {latestSignal?.evidenceSummary && (
        <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-ink-muted">
          {latestSignal.evidenceSummary}
        </p>
      )}

      {latestSignal?.sourceUrl && (
        <a
          href={latestSignal.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-3 inline-flex max-w-full items-center gap-1.5 text-[12px] text-ink-muted underline-offset-2 transition-colors hover:text-exa-ink hover:underline"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {latestSignal.sourceTitle ?? domainLabel(latestSignal.sourceDomain)}
          </span>
        </a>
      )}

      <div className="min-h-3.5 flex-1" aria-hidden />

      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="font-mono text-[11px] text-ink-subtle">
          {account.signalCount} signal{account.signalCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-ink-muted transition-colors group-hover:text-exa-ink">
          View account
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </div>
  );
}

function prospectFavicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
