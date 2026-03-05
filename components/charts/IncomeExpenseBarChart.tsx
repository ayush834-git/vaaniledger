"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/Card";

const data = [
  { day: "Mon", income: 0, expense: 0 },
  { day: "Tue", income: 0, expense: 0 },
  { day: "Wed", income: 0, expense: 0 },
  { day: "Thu", income: 0, expense: 0 },
  { day: "Fri", income: 0, expense: 0 },
  { day: "Sat", income: 0, expense: 0 },
  { day: "Sun", income: 0, expense: 0 },
];

export const IncomeExpenseBarChart = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold">Income vs Expense</h3>
      <div className="h-56">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis stroke="#94A3B8" dataKey="day" />
              <YAxis stroke="#94A3B8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#131929",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#F8FAFC",
                }}
              />
              <Bar dataKey="income" fill="#22C55E" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#EF4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </Card>
  );
};
