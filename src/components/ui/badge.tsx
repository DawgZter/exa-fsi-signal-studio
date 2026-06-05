import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[11px] font-medium leading-none tracking-tight",
  {
    variants: {
      variant: {
        neutral: "border-line bg-fill text-ink-muted",
        outline: "border-line bg-transparent text-ink-muted",
        solid: "border-ink bg-ink text-white",
        exa: "border-exa-line bg-exa-wash text-exa-ink",
        high: "border-transparent bg-high-wash text-high",
        medium: "border-transparent bg-medium-wash text-medium",
        low: "border-transparent bg-low-wash text-low",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
