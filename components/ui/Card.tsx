"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils/cn";

type CardProps = HTMLMotionProps<"div"> & {
  className?: string;
};

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(255,85,0,0.10)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "rounded-2xl border border-accent/[0.12] bg-white p-5 shadow-soft",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};