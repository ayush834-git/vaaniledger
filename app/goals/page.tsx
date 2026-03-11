"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTransactions } from "@/lib/hooks/useTransactions";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { BudgetGoalRecord } from "@/lib/types/domain";

export default function GoalsPage() {
  const { transactions } = useTransactions();
  const [goals, setGoals] = useState<BudgetGoalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [categoryInput, setCategoryInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetch("/api/goals")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setGoals(data.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryInput || !amountInput) return;

    setIsAdding(true);
    try {
      const amount = parseFloat(amountInput);
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryInput, amount }),
      });
      const data = await res.json();
      if (data.ok) {
        // Optimistically update
        setGoals((prev) => {
          const exists = prev.findIndex((g) => g.id === data.data.id || g.category === data.data.category);
          if (exists >= 0) {
            const copy = [...prev];
            copy[exists] = data.data;
            return copy;
          }
          return [...prev, data.data];
        });
        setCategoryInput("");
        setAmountInput("");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  };

  // Calculate this month's spending per category
  const spendingByCategory = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions
      .filter((t) => t.type === "expense")
      .filter((t) => {
        const d = new Date(t.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-textPrimary">Budget Goals</h2>
        <p className="mt-1 text-sm text-textSecondary">Set and track monthly spending limits by category</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-textPrimary mb-4">Add or Update Goal</h2>
        <form onSubmit={handleSaveGoal} className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-sm text-textSecondary">Category</label>
            <input
              type="text"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              placeholder="e.g. food, rent, transport"
              className="w-full rounded-lg border border-accent/12 px-3 py-2 text-sm outline-none focus:border-accent/40"
              required
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm text-textSecondary">Monthly Amount</label>
            <input
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full rounded-lg border border-accent/12 px-3 py-2 text-sm outline-none focus:border-accent/40"
              min="0"
              step="0.01"
              required
            />
          </div>
          <Button type="submit" disabled={isAdding} className="w-full sm:w-auto justify-center">
            <Plus className="h-4 w-4 mr-2" /> Save
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-textSecondary">Loading goals...</p>
        ) : goals.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-accent/20">
            <p className="text-sm text-textSecondary">No budget goals set yet.</p>
          </div>
        ) : (
          goals.map((goal) => {
            const spent = spendingByCategory[goal.category] || 0;
            const progress = Math.min((spent / goal.amount) * 100, 100);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex items-center justify-between rounded-xl border border-accent/[0.08] bg-white p-4"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-textPrimary">{goal.category}</span>
                    <span className="text-sm text-textSecondary">
                      <span className={spent > goal.amount ? "text-expense font-medium" : ""}>{formatCurrency(spent)}</span> / {formatCurrency(goal.amount)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-accent/10">
                    <div
                      className={`h-full rounded-full transition-all ${progress > 90 ? "bg-expense" : progress > 70 ? "bg-amber-500" : "bg-income"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setCategoryInput(goal.category);
                      setAmountInput(goal.amount.toString());
                    }}
                    className="p-2 text-textSecondary hover:text-accent focus:outline-none"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-2 text-textSecondary hover:text-expense focus:outline-none"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
