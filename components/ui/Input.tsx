"use client";

import { useState, type InputHTMLAttributes } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = ({ className, label, id, ...props }: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const prefersReduced = useReducedMotion();
  const hasValue = props.value !== undefined && props.value !== "" || props.defaultValue !== undefined && props.defaultValue !== "";
  const isActive = isFocused || hasValue;

  return (
    <div className="relative w-full">
      {label && (
        <motion.label
          htmlFor={id}
          initial={false}
          animate={prefersReduced ? {} : {
            y: isActive ? -11 : 14,
            scale: isActive ? 0.85 : 1,
            opacity: isActive ? 1 : 0.6
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="pointer-events-none absolute left-3 top-0 origin-left text-sm text-textSecondary bg-white px-1 z-10"
        >
          {label}
        </motion.label>
      )}
      <input
        id={id}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        className={cn(
          "w-full rounded-xl border border-accent/12 bg-transparent px-4 py-3 h-12 text-sm text-textPrimary outline-none transition-all duration-300 focus:border-accent/40 focus:ring-2 focus:ring-accent/10",
          !label && "placeholder:text-textSecondary/50",
          className,
        )}
        {...props}
      />
    </div>
  );
};