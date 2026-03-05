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
          ? "bg-accent text-white font-semibold hover:bg-[#CC4400] shadow-glow"
          : "border border-accent/12 bg-transparent text-textSecondary hover:border-accent/30 hover:text-accent hover:bg-accent/5",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};