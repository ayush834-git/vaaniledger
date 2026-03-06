"use client";

import { useEffect, useState, useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/Card";

interface ExpensePieChartProps {
  data: Array<{
    name: string;
    value: number;
    type: "income" | "expense";
  }>;
}

const EXPENSE_COLORS = ["#E8003D", "#FF5500", "#FF8C42", "#FFBA49", "#FFD166"];
const INCOME_COLORS = ["#00A86B", "#2D9B51", "#52B788", "#74C69D", "#95D5B2"];

export const ExpensePieChart = ({ data }: ExpensePieChartProps) => {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = useMemo(() => {
    let incomeIdx = 0;
    let expenseIdx = 0;
    return data.map((item) => {
      const color =
        item.type === "income"
          ? INCOME_COLORS[incomeIdx++ % INCOME_COLORS.length]
          : EXPENSE_COLORS[expenseIdx++ % EXPENSE_COLORS.length];
      return { ...item, fill: color };
    });
  }, [data]);

  const incomeItems = chartData.filter((d) => d.type === "income");
  const expenseItems = chartData.filter((d) => d.type === "expense");

  return (
    <Card className="flex flex-col">
      <h3 className="mb-4 text-lg font-semibold text-textPrimary">Category Breakdown</h3>
      {chartData.length === 0 ? (
        <div className="flex flex-1 items-center justify-center h-56">
          <p className="text-sm text-textSecondary">Add transactions to see breakdown</p>
        </div>
      ) : (
        <>
          <div className="h-64">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `₹${Number(value).toLocaleString("en-IN")}`}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: "8px",
                      color: "#1A0A00",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          <div className="mt-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-accent/10">
                <div className="h-2 w-2 rounded-full bg-income shrink-0" />
                <span className="text-sm font-semibold text-textPrimary">Income</span>
              </div>
              {incomeItems.map((item) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-textSecondary truncate">{item.name}</span>
                  </div>
                  <span className="font-medium text-textPrimary">₹{item.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
              {incomeItems.length === 0 && <span className="text-xs text-textSecondary">-</span>}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-accent/10">
                <div className="h-2 w-2 rounded-full bg-expense shrink-0" />
                <span className="text-sm font-semibold text-textPrimary">Expense</span>
              </div>
              {expenseItems.map((item) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-textSecondary truncate">{item.name}</span>
                  </div>
                  <span className="font-medium text-textPrimary">₹{item.value.toLocaleString("en-IN")}</span>
                </div>
              ))}
              {expenseItems.length === 0 && <span className="text-xs text-textSecondary">-</span>}
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
