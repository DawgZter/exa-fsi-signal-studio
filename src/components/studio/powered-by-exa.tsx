"use client";

import * as React from "react";
import { ArrowRight, X } from "lucide-react";
import { ExaGlyphImage } from "@/components/brand/exa-logo";
import { cn } from "@/lib/utils";

const DEMO_URL = "https://exa.ai/contact/sales";

export function PoweredByExa() {
  const [visible, setVisible] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1100);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 w-[19.5rem] max-w-[calc(100vw-2rem)] rounded-md border border-line bg-surface p-4 shadow-[var(--shadow-pop)] transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
      role="complementary"
      aria-label="Powered by Exa"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded-xs p-1 text-ink-subtle outline-none transition-colors hover:bg-fill hover:text-ink focus-visible:ring-2 focus-visible:ring-exa/35"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2">
        <ExaGlyphImage className="h-5 w-auto" />
        <span className="text-[12px] font-medium tracking-tight text-ink">Powered by Exa</span>
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">
        This Webset was built from public-web signals with Exa Websets. Ground your own AI agents in
        fresh, cited web intelligence.
      </p>

      <a
        href={DEMO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-sm bg-exa px-3 text-[13px] font-medium text-white outline-none transition-colors hover:bg-exa-ink focus-visible:ring-2 focus-visible:ring-exa/35"
      >
        Book an Exa demo
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
