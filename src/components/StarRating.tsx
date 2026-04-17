import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  label?: string;
}

const sizes = {
  sm: "h-4 w-4",
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

export const StarRating = ({ value, onChange, size = "md", readOnly, label }: Props) => {
  const [animIdx, setAnimIdx] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            type="button"
            key={n}
            disabled={readOnly}
            aria-label={`Rate ${n} stars`}
            onClick={() => {
              if (readOnly) return;
              setAnimIdx(n);
              onChange?.(n);
              setTimeout(() => setAnimIdx(null), 320);
            }}
            className={cn(
              "transition-transform",
              !readOnly && "hover:scale-110 active:scale-95 cursor-pointer",
              animIdx === n && "animate-star",
            )}
          >
            <Star
              className={cn(
                sizes[size],
                filled ? "fill-[hsl(var(--marinara))] text-[hsl(var(--marinara))]" : "fill-transparent text-muted-foreground",
              )}
              strokeWidth={2}
            />
          </button>
        );
      })}
    </div>
  );
};
