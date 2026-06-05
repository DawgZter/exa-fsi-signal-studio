import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExaLogoImage } from "@/components/brand/exa-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <ExaLogoImage className="h-7 w-auto" />
      <p className="mt-6 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
        404 · Not found
      </p>
      <h1 className="font-editorial mt-2 text-[26px] leading-tight text-ink">
        This Signal Studio doesn&rsquo;t exist
      </h1>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-ink-muted">
        The link may have expired or the studio was never generated. Head back to the workspace to
        create a fresh one.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-sm bg-exa px-4 text-sm font-medium text-white transition-colors hover:bg-exa-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workspace
      </Link>
    </div>
  );
}
