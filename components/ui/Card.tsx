"use client";

import { motion, type HTMLMotionProps, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils/cn";

type CardProps = HTMLMotionProps<"div"> & {
  className?: string;
};

export const Card = ({ className, children, ...props }: CardProps) => {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      whileHover={prefersReduced ? {} : { y: -2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "group rounded-2xl border border-accent/8 bg-white p-6 shadow-resting transition-all duration-150 hover:border-accent/16 hover:shadow-hover",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};