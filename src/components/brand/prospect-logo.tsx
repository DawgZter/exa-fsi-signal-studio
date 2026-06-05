"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { initialsFor } from "@/lib/format";

export function ProspectLogo({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = React.useState(false);
  const showImage = Boolean(src) && !errored;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-surface text-ink-muted",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} logo`}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-contain p-1"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="text-[11px] font-semibold tracking-tight">{initialsFor(name)}</span>
      )}
    </span>
  );
}
