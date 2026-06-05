import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink shadow-none outline-none transition-colors",
        "placeholder:text-ink-subtle",
        "focus-visible:border-exa focus-visible:ring-2 focus-visible:ring-exa/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[72px] w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors",
      "placeholder:text-ink-subtle",
      "focus-visible:border-exa focus-visible:ring-2 focus-visible:ring-exa/25",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Input, Textarea };
