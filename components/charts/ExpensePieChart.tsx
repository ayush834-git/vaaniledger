"use client";

import { useEffect, useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";

import { Card } from "@/components/ui/Card";

const data = [
  { name: "Sales", value: 0, color: "#22C55E" },
  { name: "Inventory", value: 0, color: "#EF4444" },
  { name: "Rent", value: 0, color: "#F59E0B" },
];

export const ExpensePieChart = () => {
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
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
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
