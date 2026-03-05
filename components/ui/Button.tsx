"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "ghost";
  className?: string;
};

export const Button = ({ className, variant = "primary", children, ...props }: ButtonProps) => {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-amber-400 text-black font-semibold hover:bg-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
          : "border border-white/10 bg-transparent text-slate-400 hover:border-amber-400/30 hover:text-amber-400 hover:bg-white/[0.03]",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};