"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { MicButtonPlaceholder } from "@/components/mic/MicButtonPlaceholder";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageSection } from "@/components/ui/PageSection";
import type { TransactionRecord } from "@/lib/types/domain";
import { getStoredTransactions, subscribeToTransactionCreated } from "@/lib/utils/clientTransactions";
import { formatDateTime } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function HomePage() {
  const { t } = useTranslation();
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    setRecentTransactions(getStoredTransactions().slice(0, 5));
    const unsubscribe = subscribeToTransactionCreated((transaction) => {
      setRecentTransactions((previous) => [transaction, ...previous.filter((item) => item.id !== transaction.id)].slice(0, 5));
    });

    return unsubscribe;
  }, []);

  const onTransactionCreated = (transaction: TransactionRecord) => {
    setRecentTransactions((previous) => [transaction, ...previous.filter((item) => item.id !== transaction.id)].slice(0, 5));
  };

  return (
    <div className="space-y-8">
      <PageSection title={t("app.title")} subtitle={t("app.subtitle")}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">{t("add.transaction")}</h2>
            <div className="space-y-5">
              <MicButtonPlaceholder onTransactionCreated={onTransactionCreated} />
              <label className="block text-sm text-textSecondary" htmlFor="transaction-input">
                {t("home.textInputLabel")}
              </label>
              <Input id="transaction-input" placeholder={t("home.placeholder")} />
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">{t("app.recentTransactions")}</h2>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-textSecondary">No recent transactions yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentTransactions.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-textSecondary"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-textPrimary">{item.category}</span>
                      <span className={item.type === "income" ? "text-income" : "text-expense"}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <p className="mt-1">{item.description ?? item.rawInput ?? "-"}</p>
                    <p className="mt-1 text-xs">{formatDateTime(item.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </PageSection>
    </div>
  );
}
