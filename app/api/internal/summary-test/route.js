import { buildDailySummary } from "../../../../lib/notify/summaryBuilder";

export async function GET() {
  const text = buildDailySummary({
    dateLabel: "15 Jan 2025",

    cards: [
      {
        display_name: "ICICI CC 7003 Dec'25",
        amount: "₹1,000",
        status: "DUE",
        date: "15-Jan-25",
      },
      {
        display_name: "ICICI CC 7000 Dec'25",
        amount: "₹1,000",
        status: "OVERDUE",
        date: "15-Jan-25",
      },
      {
        display_name: "ICICI CC 5006 Dec'25",
        amount: "₹1,000",
        status: "PAID",
        date: "15-Jan-25",
      },
    ],

    payments: [
      {
        name: "YouTube Premium",
        provider: "GooglePlay",
        amount: "₹1,000",
      },
      {
        name: "TPDDL Electricity",
        provider: "Paytm",
        amount: "₹1,000",
      },
    ],

    totalOutflow: "₹2,000",
  });

  return new Response(text, {
    headers: { "Content-Type": "text/plain" },
  });
}
