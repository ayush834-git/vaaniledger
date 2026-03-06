import { NextRequest, NextResponse } from "next/server";

import PDFDocument from "pdfkit";

import { resolveUserId } from "@/lib/auth/resolveUserId";
import { prisma } from "@/lib/db/prisma";
import { generateChatReply } from "@/lib/ai/gemini";
import type { ChatContextPayload } from "@/lib/ai/prompts";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDateTime } from "@/lib/utils/date";

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId();

    const { searchParams } = request.nextUrl;
    const now = new Date();
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    // Date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // Not inclusive

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const categoryBreakdownMap: Record<string, { category: string; totalExpense: number; totalIncome: number; txCount: number }> = {};
    const totals = { income: 0, expenses: 0, netProfit: 0 };

    transactions.forEach((tx) => {
      const amount = Number(tx.amount);
      if (tx.type === "income") totals.income += amount;
      else totals.expenses += amount;

      if (!categoryBreakdownMap[tx.category]) {
        categoryBreakdownMap[tx.category] = { category: tx.category, totalExpense: 0, totalIncome: 0, txCount: 0 };
      }
      const cat = categoryBreakdownMap[tx.category];
      cat.txCount++;
      if (tx.type === "income") cat.totalIncome += amount;
      else cat.totalExpense += amount;
    });

    totals.netProfit = totals.income - totals.expenses;

    const topCategories = Object.values(categoryBreakdownMap)
      .map((c) => ({ category: c.category, amount: c.totalExpense }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const context: ChatContextPayload = {
      totals,
      topCategories,
      recentInsights: [],
      transactionCount: transactions.length,
      categoryBreakdown: Object.values(categoryBreakdownMap),
      dateRange: {
        from: startDate.toISOString().split("T")[0],
        to: new Date(endDate.getTime() - 1).toISOString().split("T")[0],
      },
    };

    const promptMessage = `Please generate a 3-paragraph narrative summary of the month's finances for a monthly report.
Paragraph 1: Summarize net profit and overall financial health.
Paragraph 2: Highlight top income and expense categories.
Paragraph 3: Give a brief, practical piece of advice based on the data.
Keep it professional but concise.`;

    let aiNarrative = "";
    try {
      if (transactions.length > 0) {
        aiNarrative = await generateChatReply(promptMessage, "en", context);
      } else {
        aiNarrative = "No transactions recorded for this month. Your financial snapshot is currently empty.";
      }
    } catch {
      aiNarrative = "AI summary could not be generated at this time.";
    }

    // Generate PDF
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // --- Page 1: Summary & Narrative ---
        doc.fontSize(24).font("Helvetica-Bold").text("VaaniLedger", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(16).font("Helvetica").text(`Monthly P&L Report: ${startDate.toLocaleString("default", { month: "long", year: "numeric" })}`, { align: "center" });
        doc.moveDown(2);

        // Summary Boxes Setup (Simple text format)
        doc.fontSize(14).font("Helvetica-Bold").text("Executive Summary");
        doc.moveDown(0.5);

        doc.fontSize(12).font("Helvetica")
           .text(`Total Income:   +${formatCurrency(totals.income)}`, { continued: true })
           .text(`    Total Expenses:   -${formatCurrency(totals.expenses)}`, { continued: true })
           .text(`    Net Profit:   ${totals.netProfit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totals.netProfit))}`);
        doc.moveDown(2);

        doc.fontSize(14).font("Helvetica-Bold").text("AI Financial Narrative");
        doc.moveDown(0.5);
        
        doc.fontSize(12).font("Helvetica").text(aiNarrative, {
          align: "justify",
          lineGap: 4
        });

        // --- Page 2: Tables ---
        doc.addPage();
        
        doc.fontSize(16).font("Helvetica-Bold").text("Category Breakdown");
        doc.moveDown(1);
        
        const catBreakdown = Object.values(categoryBreakdownMap).sort((a,b) => b.totalExpense - a.totalExpense);
        if (catBreakdown.length === 0) {
          doc.fontSize(12).font("Helvetica").text("No categories found.");
        } else {
           doc.fontSize(12).font("Helvetica-Bold");
           doc.text("Category", 50, doc.y, { continued: true, width: 150 });
           doc.text("Income", 200, doc.y, { continued: true, width: 100 });
           doc.text("Expense", 300, doc.y, { continued: true, width: 100 });
           doc.text("Count", 400, doc.y, { width: 50 });
           doc.moveDown(0.5);
           
           doc.font("Helvetica");
           catBreakdown.forEach(c => {
             doc.text(c.category, 50, doc.y, { continued: true, width: 150 });
             doc.text(formatCurrency(c.totalIncome), 200, doc.y, { continued: true, width: 100 });
             doc.text(formatCurrency(c.totalExpense), 300, doc.y, { continued: true, width: 100 });
             doc.text(c.txCount.toString(), 400, doc.y, { width: 50 });
             doc.moveDown(0.2);
           });
        }
        
        doc.moveDown(2);

        doc.fontSize(16).font("Helvetica-Bold").text("Transactions", 50, doc.y);
        doc.moveDown(1);

        if (transactions.length === 0) {
          doc.fontSize(12).font("Helvetica").text("No transactions found.");
        } else {
           doc.fontSize(12).font("Helvetica-Bold");
           doc.text("Date", 50, doc.y, { continued: true, width: 100 });
           doc.text("Category", 150, doc.y, { continued: true, width: 100 });
           doc.text("Type", 250, doc.y, { continued: true, width: 80 });
           doc.text("Amount", 330, doc.y, { continued: true, width: 80 });
           doc.text("Description", 410, doc.y, { width: 130 });
           doc.moveDown(0.5);
           
           doc.font("Helvetica");
           transactions.forEach(t => {
             // Handle pagination if near end of page
             if (doc.y > 700) {
               doc.addPage();
               doc.fontSize(12).font("Helvetica-Bold");
               doc.text("Date", 50, doc.y, { continued: true, width: 100 });
               doc.text("Category", 150, doc.y, { continued: true, width: 100 });
               doc.text("Type", 250, doc.y, { continued: true, width: 80 });
               doc.text("Amount", 330, doc.y, { continued: true, width: 80 });
               doc.text("Description", 410, doc.y, { width: 130 });
               doc.moveDown(0.5);
               doc.font("Helvetica");
             }
             
             // Check if t.createdAt is a Date object, fallback to string if necessary, but formatDateTime should handle date objects
             const dateStr = formatDateTime(t.createdAt).split(",")[0] || "-";
             doc.text(dateStr, 50, doc.y, { continued: true, width: 100 });
             doc.text(t.category, 150, doc.y, { continued: true, width: 100 });
             doc.text(t.type, 250, doc.y, { continued: true, width: 80 });
             doc.text(formatCurrency(Number(t.amount)), 330, doc.y, { continued: true, width: 80 });
             doc.text(t.description || t.rawInput || "-", 410, doc.y, { width: 130 });
             doc.moveDown(0.2);
           });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    const mm = String(month).padStart(2, "0");
    const filename = `vaaniledger-${year}-${mm}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ ok: false, error: "Failed to generate report" }, { status: 500 });
  }
}
