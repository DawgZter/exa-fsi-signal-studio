"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/**
 * Place once near the top of a client subtree. Radix portals preserve React
 * context, so a single provider on the Workspace root also covers tooltips
 * rendered inside Sheet / Dialog / Popover portals.
 */
export const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Compact composite tooltip. `children` must be a single DOM-capable element
 * (it becomes the trigger via asChild). Renders nothing extra when `content`
 * is empty, so it is safe to wrap optional descriptions.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  delayDuration = 150,
  contentClassName,
}: {
  content?: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  delayDuration?: number;
  contentClassName?: string;
}) {
  if (content === undefined || content === null || content === "") {
    return children;
  }

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={12}
          className={cn(
            "z-[60] max-w-xs rounded-md border border-line bg-surface px-3 py-2 text-[12.5px] leading-relaxed text-ink-muted shadow-[var(--shadow-pop)] outline-none",
            "data-[state=delayed-open]:[animation:exa-fade-in_120ms_ease-out]",
            contentClassName,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-surface" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
