"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CircleCheck,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Lock,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, laneShortLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AccountRecord,
  AccountSuggestionsResponse,
  AccountWebsetSuggestion,
  ClientSignal,
  CreateStudioResponse,
  CreateStudioUnauthorizedResponse,
  StudioOption,
} from "@/lib/types";

type LoadState = "loading" | "ready" | "error";
type SubmitState = "idle" | "submitting" | "success" | "error";
type Mode = "live" | "preview";

const SOURCE_LABEL: Record<AccountWebsetSuggestion["source"], string> = {
  "exa-answer-account": "Exa Answer · account",
  "exa-answer-row-review": "Exa Answer · row review",
  heuristic: "Heuristic baseline",
};

const STATUS_META: Record<
  AccountWebsetSuggestion["status"],
  { label: string; variant: "high" | "medium" | "low" }
> = {
  approved: { label: "Approved for outbound", variant: "high" },
  needs_review: { label: "Needs review", variant: "medium" },
  rejected: { label: "Not recommended", variant: "low" },
};

export function CreateStudioDialog({
  open,
  onOpenChange,
  account,
  signals,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountRecord | null;
  signals: ClientSignal[];
}) {
  const [loadState, setLoadState] = React.useState<LoadState>("loading");
  const [data, setData] = React.useState<AccountSuggestionsResponse | null>(null);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);

  const [mode, setMode] = React.useState<Mode>("live");
  const [repNote, setRepNote] = React.useState("");
  const [createdBy, setCreatedBy] = React.useState("");
  const [liveCreationPasscode, setLiveCreationPasscode] = React.useState("");
  const [keyError, setKeyError] = React.useState("");

  const [submitState, setSubmitState] = React.useState<SubmitState>("idle");
  const [result, setResult] = React.useState<CreateStudioResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [reloadKey, setReloadKey] = React.useState(0);
  const [copied, setCopied] = React.useState(false);

  // Reset the editable form fields whenever the dialog opens for a new account.
  React.useEffect(() => {
    if (!open) return;
    setMode("live");
    setRepNote("");
    setCreatedBy("");
    setLiveCreationPasscode("");
    setKeyError("");
    setSubmitState("idle");
    setResult(null);
    setErrorMessage("");
    setCopied(false);
  }, [open, account?.companyDomain]);

  // Fetch account-level Exa Answer suggestions for the prospect-facing Webset.
  React.useEffect(() => {
    if (!open || !account) return;
    const domain = account.companyDomain;
    const controller = new AbortController();
    setLoadState("loading");
    setData(null);
    setSelectedOptionId(null);

    fetch(`/api/accounts/${encodeURIComponent(domain)}/suggestions`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? `Request failed (${response.status})`);
        }
        return (await response.json()) as AccountSuggestionsResponse;
      })
      .then((payload) => {
        setData(payload);
        setSelectedOptionId(payload.options[0]?.id ?? null);
        setLoadState("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErrorMessage(error instanceof Error ? error.message : "Could not load suggestions.");
        setLoadState("error");
      });

    return () => controller.abort();
  }, [open, account?.companyDomain, reloadKey]);

  const contextSignals = React.useMemo(() => signals.slice(0, 4), [signals]);

  const canSubmit = Boolean(selectedOptionId);

  const shareUrl = React.useMemo(() => {
    if (!result) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/studio/${result.studio.slug}`;
    }
    return result.url;
  }, [result]);

  function selectMode(next: Mode) {
    setMode(next);
    setKeyError("");
    setErrorMessage("");
  }

  async function handleSubmit() {
    if (!account || !selectedOptionId) return;
    const live = mode === "live";
    setSubmitState("submitting");
    setErrorMessage("");
    setKeyError("");
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (live) {
        headers["x-studio-secret"] = liveCreationPasscode.trim();
      }
      const response = await fetch("/api/studios", {
        method: "POST",
        headers,
        body: JSON.stringify({
          accountDomain: account.companyDomain,
          optionId: selectedOptionId,
          repNote: repNote.trim() || undefined,
          createdBy: createdBy.trim() || undefined,
          createProspectWebset: live,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as Partial<CreateStudioUnauthorizedResponse>;
        // Backend strict contract: live request without a valid live creation passcode.
        if (response.status === 401 && payload.liveProvisioning?.mode === "unauthorized") {
          setKeyError(payload.error ?? "Live creation passcode is required or invalid for live Webset creation.");
          setSubmitState("error");
          return;
        }
        throw new Error(payload.error ?? `Request failed (${response.status})`);
      }
      const payload = (await response.json()) as CreateStudioResponse;
      setResult(payload);
      setSubmitState("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      setSubmitState("error");
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        {submitState === "success" && result ? (
          <SuccessView
            result={result}
            shareUrl={shareUrl}
            copied={copied}
            onCopy={copyUrl}
            onClose={() => onOpenChange(false)}
          />
        ) : submitState === "submitting" ? (
          <ProvisioningView account={account} mode={mode} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create Signal Studio</DialogTitle>
              <DialogDescription>
                Pick the prospect-facing Exa Webset to demo for {account?.accountName ?? "this account"}.
                Exa Answer reads the private account signals and proposes the Webset the prospect would
                actually want to run.
              </DialogDescription>
            </DialogHeader>

            {loadState === "loading" && <LoadingSkeleton />}

            {loadState === "error" && (
              <div className="rounded-sm border border-line bg-canvas px-4 py-6 text-center">
                <AlertTriangle className="mx-auto h-5 w-5 text-medium" />
                <p className="mt-2 text-[13px] font-medium text-ink">Couldn&rsquo;t load suggestions</p>
                <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-muted">
                  {errorMessage}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setReloadKey((key) => key + 1)}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            )}

            {loadState === "ready" && data && (
              <>
                <AssessmentBanner suggestion={data.suggestion} stale={data.stale} />

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] font-medium text-ink-muted">
                      Prospect Webset concept
                    </p>
                    <span className="font-mono text-[11px] text-ink-subtle">
                      {data.options.length} {data.options.length === 1 ? "concept" : "concepts"}
                    </span>
                  </div>
                  {data.options.length === 0 ? (
                    <p className="rounded-sm border border-line bg-canvas px-3 py-4 text-[12.5px] text-ink-muted">
                      No Webset concept is available for this account yet.
                    </p>
                  ) : (
                    <div className="space-y-2" role="radiogroup" aria-label="Prospect Webset concept">
                      {data.options.map((option) => (
                        <OptionCard
                          key={option.id}
                          option={option}
                          selected={option.id === selectedOptionId}
                          onSelect={() => setSelectedOptionId(option.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <PrivateContext signals={contextSignals} total={signals.length} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-ink-muted">Prepared by (optional)</span>
                    <Input
                      value={createdBy}
                      onChange={(event) => setCreatedBy(event.target.value)}
                      placeholder="Your name"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-ink-muted">
                      Note for the prospect (optional)
                    </span>
                    <Input
                      value={repNote}
                      onChange={(event) => setRepNote(event.target.value)}
                      placeholder="Short note shown above the Webset"
                    />
                  </label>
                </div>

                {/* Provisioning mode — controls whether a live Exa Webset is created. */}
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-ink-muted">Provisioning mode</p>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Provisioning mode">
                    <ModeOption
                      active={mode === "live"}
                      onSelect={() => selectMode("live")}
                      icon={<Sparkles className="h-3.5 w-3.5" />}
                      title="Live Exa Webset"
                      description="Creates a real Exa Webset. Hosted apps require a private passcode."
                    />
                    <ModeOption
                      active={mode === "preview"}
                      onSelect={() => selectMode("preview")}
                      icon={<Eye className="h-3.5 w-3.5" />}
                      title="Preview only"
                      description="No live Webset. Shows source-pack preview evidence."
                    />
                  </div>

                  {mode === "live" ? (
                    <label className="flex flex-col gap-1.5">
                      <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
                        <KeyRound className="h-3 w-3 text-ink-subtle" />
                        Live creation passcode
                        <span className="font-normal text-ink-subtle">· hosted</span>
                      </span>
                      <Input
                        value={liveCreationPasscode}
                        onChange={(event) => {
                          setLiveCreationPasscode(event.target.value);
                          if (keyError) setKeyError("");
                        }}
                        placeholder="Leave blank for local dev"
                        type="password"
                        aria-invalid={Boolean(keyError)}
                        className={cn(
                          keyError && "border-medium focus-visible:border-medium focus-visible:ring-medium/25",
                        )}
                      />
                      {keyError ? (
                        <span className="text-[11.5px] leading-relaxed text-medium">{keyError}</span>
                      ) : (
                        <span className="text-[11.5px] leading-relaxed text-ink-subtle">
                          Local dev can leave this blank when no passcode is configured. Hosted apps
                          must use a private STUDIO_ADMIN_SECRET. Do not paste your Exa API key here.
                        </span>
                      )}
                    </label>
                  ) : (
                    <p className="rounded-sm border border-dashed border-line-strong bg-canvas px-3 py-2 text-[11.5px] leading-relaxed text-ink-subtle">
                      No live Webset will be created. The studio page will show internal source-pack
                      preview evidence, clearly labeled as preview.
                    </p>
                  )}
                </div>

                {errorMessage && (
                  <p className="rounded-sm border border-medium/30 bg-medium-wash px-3 py-2 text-[12.5px] text-medium">
                    {errorMessage}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
                    {mode === "live" ? <Sparkles className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {mode === "live" ? "Create live Webset" : "Create preview page"}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeOption({
  active,
  onSelect,
  icon,
  title,
  description,
}: {
  active: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "rounded-sm border p-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-exa/35",
        active ? "border-exa bg-exa-wash" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
        <span className={cn(active ? "text-exa" : "text-ink-subtle")}>{icon}</span>
        {title}
      </span>
      <span className="mt-1 block text-[11px] leading-snug text-ink-subtle">{description}</span>
    </button>
  );
}

function AssessmentBanner({
  suggestion,
  stale,
}: {
  suggestion: AccountWebsetSuggestion;
  stale: boolean;
}) {
  const status = STATUS_META[suggestion.status];
  return (
    <div className="rounded-sm border border-line bg-canvas p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="exa">{SOURCE_LABEL[suggestion.source]}</Badge>
        <Badge variant={status.variant}>{status.label}</Badge>
        {stale && <Badge variant="neutral">Stale cache</Badge>}
        <span className="ml-auto font-mono text-[11px] text-ink-subtle">
          Fit {suggestion.fitScore} · Accuracy {suggestion.accuracyScore}
        </span>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{suggestion.rationale}</p>
    </div>
  );
}

function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: StudioOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "w-full rounded-sm border bg-surface p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-exa/35",
        selected ? "border-exa ring-1 ring-exa/30" : "border-line hover:border-line-strong",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-medium leading-snug tracking-tight text-ink">
            {option.title}
          </h3>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-subtle">For {option.audience}</p>
        </div>
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-exa bg-exa text-white" : "border-line-strong bg-surface",
          )}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{option.valueProposition}</p>

      {selected && (
        <div className="mt-3 space-y-2.5 border-t border-line pt-3">
          <p className="text-[11.5px] leading-relaxed text-ink-subtle">
            <span className="font-medium text-ink-muted">Workflow ·</span> {option.workflow}
          </p>
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
              Webset brief
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{option.monitorQuery}</p>
          </div>
          {option.monitorCriteria.length > 0 && (
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
                Match criteria
              </p>
              <ul className="mt-1.5 space-y-1">
                {option.monitorCriteria.slice(0, 3).map((criterion, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-muted"
                  >
                    <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-xs bg-exa-wash text-exa-ink">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function PrivateContext({ signals, total }: { signals: ClientSignal[]; total: number }) {
  if (signals.length === 0) return null;
  return (
    <div className="rounded-sm border border-dashed border-line-strong bg-canvas p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
          <Lock className="h-3 w-3 text-ink-subtle" />
          Private account context
        </p>
        <span className="font-mono text-[11px] text-ink-subtle">{total} signals</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-muted"
          >
            <Badge variant="neutral" className="shrink-0">
              {laneShortLabel(signal.lane)}
            </Badge>
            <span className="shrink-0 whitespace-nowrap font-mono text-[10.5px] text-ink-subtle">
              {formatDate(signal.sourceDate ?? signal.discoveredAt)}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {signal.sourceTitle ?? signal.evidenceSummary}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-subtle">
        These signals stay internal. Exa uses them to shape the Webset above — they are never shown to
        the prospect.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-sm border border-line bg-canvas p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ml-auto h-4 w-32" />
        </div>
        <Skeleton className="mt-2.5 h-3 w-full" />
        <Skeleton className="mt-1.5 h-3 w-4/5" />
      </div>
      {[0, 1].map((index) => (
        <div key={index} className="rounded-sm border border-line bg-surface p-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-2.5 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

function ProvisioningView({ account, mode }: { account: AccountRecord | null; mode: Mode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-exa" />
      <p className="mt-4 text-sm font-medium text-ink">
        Building {account?.accountName ?? "the"} Signal Studio
      </p>
      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-muted">
        {mode === "live"
          ? "Provisioning the prospect-facing Exa Webset and populating its first results."
          : "Generating the preview studio page and source-backed preview evidence."}
      </p>
    </div>
  );
}

function SuccessView({
  result,
  shareUrl,
  copied,
  onCopy,
  onClose,
}: {
  result: CreateStudioResponse;
  shareUrl: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  const { studio } = result;
  const mode = result.liveProvisioning?.mode ?? (studio.prospectWebset ? "live" : "preview");
  const isLive = mode === "live";

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <CircleCheck className="h-5 w-5 text-high" />
          <DialogTitle>{isLive ? "Live Exa Webset created" : "Preview studio created"}</DialogTitle>
        </div>
        <DialogDescription>
          A branded, prospect-facing Exa Webset for {studio.accountName}. Share the link in outbound —
          no login required.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-sm border border-line bg-canvas p-3">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
          Selected workflow
        </p>
        <p className="mt-1 text-sm font-medium text-ink">{studio.selectedWorkflow}</p>
      </div>

      {isLive ? (
        <div className="rounded-sm border border-exa-line bg-exa-wash p-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-exa-ink">
            <Sparkles className="h-3 w-3" />
            Live Exa Webset
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">
            The live Webset is being created and populated now. Results stream into the studio
            page as Exa finishes the first crawl.
          </p>
          {studio.prospectWebset?.dashboardUrl && (
            <a
              href={studio.prospectWebset.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-exa-ink underline-offset-2 hover:underline"
            >
              Open Webset in Exa
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-sm border border-line bg-canvas p-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
            <Eye className="h-3 w-3" />
            Preview only
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
            No live Webset was provisioned. The page shows the Webset brief, criteria, and internal
            source-pack preview evidence — clearly labeled as preview.
          </p>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-ink-muted">Shareable link</span>
        <div className="flex items-center gap-2">
          <Input readOnly value={shareUrl} className="font-mono text-[12px]" />
          <Button variant="secondary" size="icon" onClick={onCopy} title="Copy link">
            {copied ? <Check className="h-4 w-4 text-high" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </label>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" asChild>
          <a href={`/studio/${studio.slug}`} target="_blank" rel="noopener noreferrer">
            Open studio
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </>
  );
}
