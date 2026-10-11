import { Star } from "lucide-react";

export function Stars({ count, size = "size-4" }: { count: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className={`${size} ${i < count ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`}
        />
      ))}
    </span>
  );
}
