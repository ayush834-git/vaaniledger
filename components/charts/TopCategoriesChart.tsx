"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/Card";

interface TopCategoriesChartProps {
  data: Array<{
    name: string;
    value: number;
    type: "income" | "expense";
  }>;
}

const INCOME_COLOR = "#00A86B";
const EXPENSE_COLOR = "#E8003D";

export const TopCategoriesChart = ({ data }: TopCategoriesChartProps) => {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-textPrimary">{t("dashboard.topCategories")}</h3>
      <div className="h-56">
        {isMounted && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis type="number" stroke="rgba(0,0,0,0.3)" tickFormatter={(v: number) => `₹${v}`} />
              <YAxis type="category" dataKey="name" width={80} stroke="rgba(0,0,0,0.3)" tick={{ fontSize: 12, fill: "#6B4423" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(255,85,0,0.12)",
                  borderRadius: "8px",
                  color: "#1A0A00",
                }}
                formatter={(value: number | undefined) => [`₹${(value ?? 0).toLocaleString("en-IN")}`, ""]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.type === "income" ? INCOME_COLOR : EXPENSE_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-textSecondary">{t("dashboard.noTransactions")}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
