"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils/cn";

type CardProps = HTMLMotionProps<"div"> & {
  className?: string;
};

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-[#0D1728]/80 p-5 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};