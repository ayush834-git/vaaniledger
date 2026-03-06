"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/Card";

interface ProfitLineChartProps {
  data: Array<{
    day: string;
    value: number;
  }>;
}

export const ProfitLineChart = ({ data }: ProfitLineChartProps) => {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-textPrimary">{t("dashboard.profitTrend")}</h3>
      <div className="h-56">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis stroke="rgba(0,0,0,0.4)" dataKey="day" interval={0} />
              <YAxis stroke="rgba(0,0,0,0.4)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(255,85,0,0.12)",
                  borderRadius: "8px",
                  color: "#1A0A00",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#FF5500" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </Card>
  );
};
