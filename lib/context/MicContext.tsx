"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface MicContextType {
  isMainMicActive: boolean;
  setIsMainMicActive: (active: boolean) => void;
  isWakeWordListening: boolean;
  setIsWakeWordListening: (active: boolean) => void;
}

const MicContext = createContext<MicContextType | undefined>(undefined);

export const MicProvider = ({ children }: { children: ReactNode }) => {
  const [isMainMicActive, setIsMainMicActive] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  return (
    <MicContext.Provider value={{ isMainMicActive, setIsMainMicActive, isWakeWordListening, setIsWakeWordListening }}>
      {children}
    </MicContext.Provider>
  );
};

export const useMicContext = () => {
  const context = useContext(MicContext);
  if (context === undefined) {
    throw new Error("useMicContext must be used within a MicProvider");
  }
  return context;
};
