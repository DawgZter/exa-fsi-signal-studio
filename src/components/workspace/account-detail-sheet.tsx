"use client";

import * as React from "react";
import { ExternalLink, Globe, Sparkles } from "lucide-react";
import { ProspectLogo } from "@/components/brand/prospect-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalItem } from "@/components/workspace/signal-item";
import { confidenceLabel, domainLabel } from "@/lib/format";
import type { AccountDetailResponse, AccountRecord, ClientSignal } from "@/lib/types";

export function AccountDetailSheet({
  account,
  open,
  onOpenChange,
  onCreateStudio,
}: {
  account: AccountRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateStudio: (account: AccountRecord, signals: ClientSignal[]) => void;
}) {
  const [detail, setDetail] = React.useState<AccountDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const domain = account?.companyDomain;

  React.useEffect(() => {
    if (!open || !domain) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetch(`/api/accounts/${encodeURIComponent(domain)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load account (${response.status})`);
        return (await response.json()) as AccountDetailResponse;
      })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load account.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, domain]);

  const acct = detail?.account ?? account;
  const signals = detail?.signals ?? [];
  const meta = acct
    ? ([acct.accountSegment, acct.territory].filter(Boolean) as string[])
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {acct && (
          <>
            <div className="border-b border-line p-5 pr-12">
              <div className="flex items-start gap-3">
                <ProspectLogo
                  name={acct.accountName}
                  src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(acct.companyDomain)}&sz=128`}
                  size={44}
                />
                <div className="min-w-0">
                  <SheetTitle className="text-lg font-medium leading-tight tracking-tight">
                    {acct.accountName}
                  </SheetTitle>
                  <SheetDescription asChild>
                    <a
                      href={`https://${acct.companyDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 font-mono text-[12px] text-ink-subtle underline-offset-2 hover:text-exa-ink hover:underline"
                    >
                      <Globe className="h-3 w-3" />
                      {domainLabel(acct.companyDomain)}
                    </a>
                  </SheetDescription>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {acct.fsiSubsector && <Badge variant="neutral">{acct.fsiSubsector}</Badge>}
                {meta.map((value) => (
                  <Badge key={value} variant="neutral">
                    {value}
                  </Badge>
                ))}
                <Badge variant={acct.highestConfidence} title={confidenceLabel(acct.highestConfidence)}>
                  {acct.highestConfidence} confidence
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-3">
              <p className="text-[12px] text-ink-muted">
                <span className="font-mono text-ink">{acct.signalCount}</span> source-backed signal
                {acct.signalCount === 1 ? "" : "s"}
              </p>
              <Button
                variant="primary"
                size="sm"
                disabled={loading || signals.length === 0}
                onClick={() => onCreateStudio(acct, signals)}
              >
                <Sparkles className="h-4 w-4" />
                Create Signal Studio
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
                Signal timeline
              </p>

              {loading && (
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="rounded-md border border-line bg-surface p-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="mt-3 h-4 w-3/4" />
                      <Skeleton className="mt-2 h-3 w-1/2" />
                      <Skeleton className="mt-3 h-12 w-full" />
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <p className="rounded-sm border border-medium/30 bg-medium-wash px-3 py-2 text-[12.5px] text-medium">
                  {error}
                </p>
              )}

              {!loading && !error && (
                <div className="space-y-3">
                  {signals.map((signal) => (
                    <SignalItem key={signal.id} signal={signal} />
                  ))}
                </div>
              )}

              <p className="mt-5 flex items-center gap-1.5 text-[11.5px] text-ink-subtle">
                <ExternalLink className="h-3 w-3" />
                Every signal links to its original public source for audit.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
