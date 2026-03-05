import type { ReactNode } from "react";

interface PageSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export const PageSection = ({ title, subtitle, children }: PageSectionProps) => {
  return (
    <section>
      <div className="mb-6">
        <h2 className="font-display text-3xl font-semibold text-textPrimary">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-textSecondary">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
};