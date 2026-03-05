import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-amber-400/20",
        className,
      )}
      {...props}
    />
  );
};