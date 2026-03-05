import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-white/10 bg-bg/60 px-3 py-2 text-sm text-textPrimary outline-none transition placeholder:text-textSecondary focus:border-accent",
        className,
      )}
      {...props}
    />
  );
};