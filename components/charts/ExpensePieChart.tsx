"use client";

import { useEffect, useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";

import { Card } from "@/components/ui/Card";

interface ExpensePieChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const COLOR_SCALE = ["#EF4444", "#F59E0B", "#22C55E", "#06B6D4", "#8B5CF6", "#F97316"];

export const ExpensePieChart = ({ data }: ExpensePieChartProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold">Expense Categories</h3>
      <div className="h-56">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLOR_SCALE[index % COLOR_SCALE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#131929",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#F8FAFC",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </Card>
  );
};
