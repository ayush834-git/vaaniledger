import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-accent/12 bg-white px-4 py-2.5 text-sm text-textPrimary outline-none transition-all duration-300 placeholder:text-textSecondary/50 focus:border-accent/40 focus:ring-2 focus:ring-accent/15",
        className,
      )}
      {...props}
    />
  );
};