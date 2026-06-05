import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Globe,
  Link2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { ExaGlyphImage, ExaLogoImage } from "@/components/brand/exa-logo";
import { ProspectLogo } from "@/components/brand/prospect-logo";
import { PoweredByExa } from "@/components/studio/powered-by-exa";
import { StudioWebsetFeed } from "@/components/studio/studio-webset-feed";
import { Badge } from "@/components/ui/badge";
import { domainLabel, formatDate } from "@/lib/format";
import { getStudio } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_URL = "https://exa.ai/contact/sales";
const SITE_URL = "https://exa.ai/";

function faviconFor(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function websetCopy(value: string): string {
  return value.replace(/\bmonitor\b/gi, "Webset");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const studio = await getStudio(decodeURIComponent(slug));
  if (!studio) return { title: "Signal Studio · Exa" };
  return {
    title: `${studio.accountName} · Exa Signal Studio`,
    description: studio.generatedBrief,
  };
}

export default async function StudioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const studio = await getStudio(decodeURIComponent(slug));
  if (!studio) notFound();

  const logoSrc = studio.prospectLogoUrl ?? faviconFor(studio.companyDomain);
  const generatedBrief = websetCopy(studio.generatedBrief);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-2.5">
            <ExaLogoImage />
            <span className="h-4 w-px bg-line-strong" />
            <span className="text-[13px] font-medium tracking-tight text-ink">Signal Studio</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
            Exa Signal Studio · Prepared for {studio.accountName}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <ProspectLogo name={studio.accountName} src={logoSrc} size={52} />
            <span className="text-line-strong">×</span>
            <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-sm border border-line bg-surface">
              <ExaGlyphImage className="h-6 w-auto" />
            </span>
          </div>

          <h1 className="font-editorial mt-7 max-w-3xl text-[30px] leading-[1.1] text-ink md:text-[42px]">
            Grounding {studio.accountName}&rsquo;s AI agents in live, cited web intelligence.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            {generatedBrief}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">Workflow · {studio.selectedWorkflow}</Badge>
            <Badge variant={studio.prospectWebset ? "exa" : "neutral"}>
              {studio.prospectWebset ? "Live Exa Webset" : "Preview only · no live Webset"}
            </Badge>
            <Badge variant="neutral">Public web only</Badge>
            <Badge variant="neutral">Source-review ready</Badge>
          </div>

          <p className="mt-5 font-mono text-[11px] text-ink-subtle">
            Prepared {formatDate(studio.createdAt)} ·{" "}
            <a
              href={`https://${studio.companyDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-exa-ink hover:underline"
            >
              {domainLabel(studio.companyDomain)}
            </a>
          </p>
        </div>
      </section>

      {/* Rep note */}
      {studio.repNote && (
        <section className="border-b border-line bg-exa-wash/50">
          <div className="mx-auto max-w-5xl px-5 py-4">
            <p className="text-[13px] leading-relaxed text-ink">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-exa-ink">
                Note from your Exa AE&nbsp;&nbsp;
              </span>
              {studio.repNote}
            </p>
          </div>
        </section>
      )}

      {/* The prospect Webset */}
      <Section eyebrow="Your Exa Webset" title={`What this Webset is built to surface for ${studio.accountName}`}>
        <div className="rounded-md border border-line bg-surface p-5">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
            Webset brief
          </p>
          <div className="mt-2 flex items-start gap-2 rounded-sm border border-line bg-canvas p-3">
            <Search className="mt-0.5 h-4 w-4 shrink-0 text-exa" />
            <p className="text-[13px] leading-relaxed text-ink">
              {studio.monitorQuery}
            </p>
          </div>

          {studio.prospectWebset && (
            <div className="mt-4 rounded-sm border border-line bg-canvas p-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
                Live Webset
              </p>
              <a
                href={studio.prospectWebset.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-exa-ink underline-offset-2 hover:underline"
              >
                Open Webset in Exa
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="mt-1 font-mono text-[11px] text-ink-subtle">
                Webset {studio.prospectWebset.websetId}
                {studio.prospectWebset.monitorId ? ` · scheduled monitor ${studio.prospectWebset.monitorId}` : ""}
              </p>
            </div>
          )}

          <p className="mt-5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-subtle">
            Webset criteria
          </p>
          <ul className="mt-2 space-y-2">
            {studio.monitorCriteria.map((criterion, index) => (
              <li key={index} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-xs bg-exa-wash text-exa-ink">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {criterion}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Embedded prospect Webset feed (live results / preview evidence, polled client-side) */}
      <StudioWebsetFeed slug={studio.slug} accountName={studio.accountName} />

      {/* Webset concepts */}
      <Section
        eyebrow="Ways to run this"
        title={`Three Websets we'd stand up for ${studio.accountName}`}
        description="Each Webset is tailored to a different owner inside the account."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {studio.options.map((option) => (
            <div key={option.id} className="flex flex-col rounded-md border border-line bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-exa-ink">
                {option.audience}
              </p>
              <h3 className="mt-2 text-[15px] font-medium leading-tight tracking-tight text-ink">
                {websetCopy(option.title)}
              </h3>
              <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-ink-muted">
                {websetCopy(option.valueProposition)}
              </p>
              <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-subtle">
                <span className="font-medium text-ink-muted">Tracks:</span>{" "}
                {option.monitorCriteria[0]}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Trust / compliance */}
      <Section
        eyebrow="Review-first by design"
        title="Built for human review before risk and compliance conversations"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Trust
            icon={<Globe className="h-4 w-4 text-exa" />}
            title="Public web only"
            body="Built entirely from public sources. No private, customer, or internal data is required to evaluate."
          />
          <Trust
            icon={<Link2 className="h-4 w-4 text-exa" />}
            title="Cited & traceable"
            body="Every signal carries its original URL, so each claim can be opened and verified at the source."
          />
          <Trust
            icon={<ShieldCheck className="h-4 w-4 text-exa" />}
            title="Audit-ready"
            body="Confidence and provenance travel with each result, ready for human-in-the-loop review."
          />
          <Trust
            icon={<RefreshCw className="h-4 w-4 text-exa" />}
            title="Fresh by Webset"
            body="Exa keeps Websets fresh with scheduled searches, so the brief stays current instead of going stale."
          />
        </div>
      </Section>

      {/* Closing CTA */}
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-5 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-editorial text-[24px] leading-tight text-ink">
              Want this grounded in {studio.accountName}&rsquo;s real workflow?
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-muted">
              Exa powers retrieval for AI agents with fresh, cited web content. Let&rsquo;s wire this
              Webset into your stack.
            </p>
          </div>
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm bg-exa px-4 text-sm font-medium text-white outline-none transition-colors hover:bg-exa-ink focus-visible:ring-2 focus-visible:ring-exa/35"
          >
            Book an Exa demo
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <p className="flex items-center gap-2 text-[12px] text-ink-subtle">
              <ExaLogoImage className="h-4 w-auto" />
              <span className="text-line-strong">·</span>
              Generated from public-web signals by Exa Websets
            </p>
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-medium text-exa-ink underline-offset-2 hover:underline"
            >
              exa.ai
            </a>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-subtle">
            Demonstration brief generated for outbound. Source content belongs to its respective
            publishers; {studio.accountName} is referenced from public information and is not affiliated
            with or an endorser of this demo.
          </p>
        </div>
      </footer>

      <PoweredByExa />
    </div>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-subtle">
          {eyebrow}
        </p>
        <h2 className="font-editorial mt-2 text-[24px] leading-tight text-ink">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-muted">{description}</p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function Trust({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-exa-wash">{icon}</div>
      <h3 className="mt-3 text-[13px] font-medium text-ink">{title}</h3>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
