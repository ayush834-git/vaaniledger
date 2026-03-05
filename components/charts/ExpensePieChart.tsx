"use client";

import { useEffect, useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/Card";

interface ExpensePieChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const COLOR_SCALE = ["#FF5500", "#00A86B", "#E8003D", "#D4006A", "#FFB300", "#06B6D4"];

export const ExpensePieChart = ({ data }: ExpensePieChartProps) => {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-textPrimary">{t("dashboard.expenseCategories")}</h3>
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
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(255,85,0,0.12)",
                  borderRadius: "8px",
                  color: "#1A0A00",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </Card>
  );
};
