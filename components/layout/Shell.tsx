import type { ReactNode } from "react";

export const Shell = ({ children }: { children: ReactNode }) => {
  return <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">{children}</div>;
};