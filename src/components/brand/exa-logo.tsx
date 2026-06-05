import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official Exa lockup (blue glyph + wordmark) served from /public. Used wherever
 * we present the real brand mark — app top-left and the prospect studio page.
 */
export function ExaLogoImage({ className }: { className?: string }) {
  return (
    <Image
      src="/exa-logo.png"
      alt="Exa"
      width={1668}
      height={600}
      priority
      className={cn("h-6 w-auto select-none", className)}
    />
  );
}

/** Official Exa logomark (glyph only) for square/lockup placements. */
export function ExaGlyphImage({ className }: { className?: string }) {
  return (
    <Image
      src="/exa-logomark.png"
      alt="Exa"
      width={468}
      height={600}
      className={cn("h-7 w-auto select-none", className)}
    />
  );
}

type Tone = "ink" | "exa" | "inherit" | "white";

const toneClass: Record<Tone, string> = {
  ink: "text-ink",
  exa: "text-exa",
  white: "text-white",
  inherit: "",
};

/**
 * Exa wordmark. The public brand sets the name lowercase with very tight
 * tracking; we reproduce that typographically rather than ship a raster asset.
 */
export function ExaLogo({
  className,
  tone = "ink",
}: {
  className?: string;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "select-none font-sans text-[19px] font-semibold lowercase leading-none tracking-[-0.07em]",
        toneClass[tone],
        className,
      )}
      aria-label="Exa"
    >
      exa
    </span>
  );
}

/** Small square glyph used in tight corners / favicons-style placements. */
export function ExaGlyph({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm bg-exa font-sans text-[12px] font-semibold lowercase leading-none tracking-[-0.06em] text-white",
        className,
      )}
      style={{ width: 22, height: 22 }}
      aria-label="Exa"
    >
      e
    </span>
  );
}
