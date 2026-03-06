import type { TransactionRecord } from "@/lib/types/domain";

export function exportTransactionsToCsv(transactions: TransactionRecord[], filename: string): void {
  const headers = [
    "Date",
    "Type",
    "Category",
    "Description",
    "Amount (INR)",
    "Raw Input"
  ];

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const escapeCsvField = (field: string | null | undefined): string => {
    if (!field) return "";
    // If the field contains a comma, quote, or newline, wrap it in quotes and escape internal quotes
    const stringField = String(field);
    if (stringField.includes(",") || stringField.includes("\"") || stringField.includes("\n")) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const rows = transactions.map((tx) => [
    formatDate(tx.createdAt),
    tx.type,
    escapeCsvField(tx.category),
    escapeCsvField(tx.description),
    tx.amount.toString(),
    escapeCsvField(tx.rawInput)
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
