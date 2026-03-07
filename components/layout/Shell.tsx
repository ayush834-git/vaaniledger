"use client";

import { useEffect, type ReactNode } from "react";

import { useMicContext } from "@/lib/context/MicContext";

export const Shell = ({ children }: { children: ReactNode }) => {
  const { setIsWakeWordListening } = useMicContext();

  useEffect(() => {
    setIsWakeWordListening(false);
  }, [setIsWakeWordListening]);

  return <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">{children}</div>;
};