import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <Card className="text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-textSecondary">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
};