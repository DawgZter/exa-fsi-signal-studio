"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export function FilterPopover({
  label,
  options,
  selected,
  onChange,
  optionTooltip,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Optional per-option description shown as a tooltip on hover. */
  optionTooltip?: (option: FilterOption) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const activeCount = selected.length;

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-exa/35",
          activeCount > 0
            ? "border-exa-line bg-exa-wash text-exa-ink"
            : "border-line bg-surface text-ink hover:bg-fill",
        )}
      >
        {label}
        {activeCount > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-xs bg-exa px-1 text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="max-h-72 overflow-y-auto p-1">
          {options.length === 0 && (
            <p className="px-2 py-3 text-[13px] text-ink-subtle">No values available.</p>
          )}
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <Tooltip
                key={option.value}
                content={optionTooltip?.(option)}
                side="right"
                align="start"
                contentClassName="max-w-[15rem]"
              >
                <button
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-[13px] text-ink outline-none transition-colors hover:bg-fill focus-visible:bg-fill"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border transition-colors",
                      isSelected
                        ? "border-exa bg-exa text-white"
                        : "border-line-strong bg-surface",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 truncate">{option.label}</span>
                  {typeof option.count === "number" && (
                    <span className="font-mono text-[11px] tabular-nums text-ink-subtle">
                      {option.count}
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
        {activeCount > 0 && (
          <div className="border-t border-line p-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full rounded-sm px-2 py-1.5 text-left text-[13px] text-ink-muted outline-none transition-colors hover:bg-fill hover:text-ink"
            >
              Clear {label.toLowerCase()}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
