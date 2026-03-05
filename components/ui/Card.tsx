import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-surface/85 p-5 shadow-soft backdrop-blur",
        className,
      )}
      {...props}
    />
  );
};