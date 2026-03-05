"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ExpensePieChart } from "@/components/charts/ExpensePieChart";
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart";
import { ProfitLineChart } from "@/components/charts/ProfitLineChart";
import { Card } from "@/components/ui/Card";
import { PageSection } from "@/components/ui/PageSection";
import type { TransactionRecord } from "@/lib/types/domain";
import { getStoredTransactions, subscribeToTransactionCreated } from "@/lib/utils/clientTransactions";
import { formatDateTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    setTransactions(getStoredTransactions());
    const unsubscribe = subscribeToTransactionCreated((transaction) => {
      setTransactions((previous) => [transaction, ...previous.filter((item) => item.id !== transaction.id)]);
    });

    return unsubscribe;
  }, []);

  const todaySummary = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const todayItems = transactions.filter((item) => new Date(item.createdAt).getTime() >= start.getTime());
    const income = todayItems
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const expenses = todayItems
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expenses,
      netProfit: income - expenses,
    };
  }, [transactions]);

  const summaryCards = [
    { id: "income", label: "Today Income", amount: todaySummary.income, color: "text-income" },
    { id: "expense", label: "Today Expense", amount: todaySummary.expenses, color: "text-expense" },
    { id: "profit", label: "Net Profit", amount: todaySummary.netProfit, color: "text-accent" },
  ];

  const latestTransaction = transactions[0] ?? null;

  return (
    <PageSection title={t("dashboard.title")} subtitle={t("dashboard.summary")}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.id}>
              <p className="text-sm text-textSecondary">{card.label}</p>
              <p className={`mt-2 font-mono text-2xl font-semibold ${card.color}`}>
                {formatCurrency(card.amount)}
              </p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ExpensePieChart />
          <IncomeExpenseBarChart />
          <ProfitLineChart />
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <h3 className="text-lg font-semibold">{t("dashboard.insights")}</h3>
            <p className="mt-3 text-sm text-textSecondary">
              AI insights panel placeholder. Data-backed insights will be added in Phase 2.
            </p>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-textSecondary">
              {latestTransaction ? (
                <>
                  <p className="font-medium text-textPrimary">Latest transaction synced</p>
                  <p className="mt-1">{latestTransaction.description ?? latestTransaction.rawInput}</p>
                  <p className="mt-1 text-xs">{formatDateTime(latestTransaction.createdAt)}</p>
                </>
              ) : (
                <p>No transactions recorded yet.</p>
              )}
            </div>
          </Card>
          <Card className="relative overflow-hidden">
            <h3 className="text-lg font-semibold">{t("dashboard.chat")}</h3>
            <div className="mt-4 flex h-36 items-end justify-end">
              <div className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-soft">
                Chatbot Bubble
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageSection>
  );
}
