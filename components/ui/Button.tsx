"use client";

import { motion, type HTMLMotionProps, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "ghost";
  className?: string;
};

export const Button = ({ className, variant = "primary", children, ...props }: ButtonProps) => {
  const prefersReduced = useReducedMotion();
  return (
    <motion.button
      whileTap={prefersReduced ? {} : { scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "relative overflow-hidden inline-flex h-11 min-w-[100px] items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-accent text-white shadow-resting before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500"
          : "border border-accent/20 bg-transparent text-textSecondary hover:bg-accent/5 hover:text-accent",
        className,
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children as React.ReactNode}</span>
    </motion.button>
  );
};