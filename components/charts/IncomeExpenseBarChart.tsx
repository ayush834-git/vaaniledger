"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/Card";

interface IncomeExpenseBarChartProps {
  data: Array<{
    day: string;
    income: number;
    expense: number;
  }>;
}

export const IncomeExpenseBarChart = ({ data }: IncomeExpenseBarChartProps) => {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-textPrimary">{t("dashboard.incomeVsExpense")}</h3>
      <div className="h-56">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis stroke="rgba(0,0,0,0.4)" dataKey="day" />
              <YAxis stroke="rgba(0,0,0,0.4)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(255,85,0,0.12)",
                  borderRadius: "8px",
                  color: "#1A0A00",
                }}
              />
              <Bar dataKey="income" fill="#00A86B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#E8003D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </Card>
  );
};
