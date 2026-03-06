"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useMicContext } from "@/lib/context/MicContext";
import { useWakeWord } from "@/lib/hooks/useWakeWord";

export const Shell = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { isMainMicActive, setIsWakeWordListening } = useMicContext();

  const { isListening } = useWakeWord(isMainMicActive, () => {
    router.push("/?mic=1");
  });

  useEffect(() => {
    setIsWakeWordListening(isListening);
  }, [isListening, setIsWakeWordListening]);

  return <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">{children}</div>;
};