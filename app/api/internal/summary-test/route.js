import { buildDailySummary } from "../../../../lib/notify/summaryBuilder";

export async function GET() {
  const text = buildDailySummary({
    datePretty: "15 Jan 2025",

    cards: [
      {
        label: "ICICI CC 7003 Dec'25",
        status: "DUE",
        amount: 1000,
        dueDate: "2025-01-15",
      },
      {
        label: "ICICI CC 7000 Dec'25",
        status: "OVERDUE",
        amount: 1000,
        dueDate: "2025-01-15",
      },
      {
        label: "ICICI CC 5006 Dec'25",
        status: "PAID",
        amount: 1000,
        paidDate: "2025-01-15",
      },
    ],

    payments: [
      {
        displayName: "YouTube Premium",
        provider: "GooglePlay",
        amount: 1000,
      },
      {
        displayName: "TPDDL Electricity",
        provider: "Paytm",
        amount: 1000,
      },
    ],

    totalOutflow: 2000,
  });
  
  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
