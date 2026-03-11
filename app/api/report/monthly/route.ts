export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

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
        const PDFDocument = eval('require("pdfkit")');
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);

        // --- Page 1: Summary & Narrative ---
        doc.fontSize(24).font("Helvetica-Bold").text("VaaniLedger", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(16).font("Helvetica").text(`Monthly P&L Report: ${startDate.toLocaleString("default", { month: "long", year: "numeric" })}`, { align: "center" });
        doc.moveDown(2);

        // Summary
        doc.fontSize(14).font("Helvetica-Bold").text("Executive Summary");
        doc.moveDown(0.5);

        doc.fontSize(12).font("Helvetica");
        doc.text(`Total Income:    +${formatCurrency(totals.income)}`);
        doc.text(`Total Expenses:  -${formatCurrency(totals.expenses)}`);
        doc.text(`Net Profit:      ${totals.netProfit >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totals.netProfit))}`);
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

        // Category table columns: Category(50-190), Income(200-290), Expense(300-390), Count(400-450)
        const catCols = [
          { x: 50, w: 140, label: "Category" },
          { x: 200, w: 90, label: "Income" },
          { x: 300, w: 90, label: "Expense" },
          { x: 400, w: 50, label: "Count" },
        ];

        if (catBreakdown.length === 0) {
          doc.fontSize(12).font("Helvetica").text("No categories found.");
        } else {
          // Header
          let rowY = doc.y;
          doc.fontSize(12).font("Helvetica-Bold");
          for (const col of catCols) {
            doc.text(col.label, col.x, rowY, { width: col.w });
          }
          doc.y = rowY + 18;
          doc.moveDown(0.3);

          // Rows
          doc.font("Helvetica");
          for (const c of catBreakdown) {
            rowY = doc.y;
            doc.text(c.category, catCols[0].x, rowY, { width: catCols[0].w });
            doc.text(formatCurrency(c.totalIncome), catCols[1].x, rowY, { width: catCols[1].w });
            doc.text(formatCurrency(c.totalExpense), catCols[2].x, rowY, { width: catCols[2].w });
            doc.text(c.txCount.toString(), catCols[3].x, rowY, { width: catCols[3].w });
            doc.y = rowY + 16;
          }
        }
        
        doc.moveDown(2);

        doc.fontSize(16).font("Helvetica-Bold").text("Transactions", 50);
        doc.moveDown(1);

        // Transaction table columns
        const txCols = [
          { x: 50, w: 90, label: "Date" },
          { x: 145, w: 90, label: "Category" },
          { x: 240, w: 60, label: "Type" },
          { x: 305, w: 70, label: "Amount" },
          { x: 380, w: 160, label: "Description" },
        ];

        if (transactions.length === 0) {
          doc.fontSize(12).font("Helvetica").text("No transactions found.");
        } else {
          // Header helper
          const drawTxHeader = () => {
            const hy = doc.y;
            doc.fontSize(12).font("Helvetica-Bold");
            for (const col of txCols) {
              doc.text(col.label, col.x, hy, { width: col.w });
            }
            doc.y = hy + 18;
            doc.moveDown(0.3);
            doc.font("Helvetica");
          };

          drawTxHeader();

          for (const tx of transactions) {
            // Handle pagination
            if (doc.y > 700) {
              doc.addPage();
              drawTxHeader();
            }
            
            const rowY = doc.y;
            const dateStr = formatDateTime(tx.createdAt).split(",")[0] || "-";
            doc.text(dateStr, txCols[0].x, rowY, { width: txCols[0].w });
            doc.text(tx.category, txCols[1].x, rowY, { width: txCols[1].w });
            doc.text(tx.type, txCols[2].x, rowY, { width: txCols[2].w });
            doc.text(formatCurrency(Number(tx.amount)), txCols[3].x, rowY, { width: txCols[3].w });
            doc.text((tx.description || tx.rawInput || "-").substring(0, 30), txCols[4].x, rowY, { width: txCols[4].w });
            doc.y = rowY + 16;
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    const mm = String(month).padStart(2, "0");
    const filename = `vaaniledger-${year}-${mm}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ ok: false, error: "Failed to generate report" }, { status: 500 });
  }
}
