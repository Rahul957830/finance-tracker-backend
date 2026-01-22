import { kv } from "@vercel/kv";
import { notifyTelegram } from "../../../../lib/notify/telegram";
import { buildDailySummary } from "../../../../lib/notify/summaryBuilder";

export const dynamic = "force-dynamic";

export async function GET() {
  /* =========================
     DATE (display only)
  ========================= */
  const today = new Date();
  const datePretty = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  /* =========================
     CARDS (from KV)
  ========================= */
  const cards = [];

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    const label = `${cc.provider || "Card"} CC ${
      cc.last4 || ""
    } ${fmtMonth(cc.statement_month)}`.trim();

    cards.push({
      label,
      status: cc.current_status, // DUE | OVERDUE | PAID
      amount: Number(cc.amount_due || 0),
      dueDate: cc.due_date,
      paidDate: cc.paid_at,
    });
  }

  /* =========================
     PAYMENTS (Non-card)
  ========================= */
  const payments = [];
  let totalOutflow = 0;

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event) continue;

    // Skip credit cards
    if (event.category === "CREDIT_CARD") continue;

    const amount = Number(event.amount?.value);
    if (!amount) continue;

    payments.push({
      displayName:
        event.notification?.display_name ||
        event.display_name ||
        event.provider ||
        "Payment",
      provider: event.provider || "—",
      amount,
      ts: event.created_at || event.timestamp || 0,
    });

    totalOutflow += amount;
  }

  // Oldest → newest
  payments.sort((a, b) => a.ts - b.ts);

  /* =========================
     BUILD SUMMARY
  ========================= */
  const text = buildDailySummary({
    datePretty,
    cards,
    payments,
    totalOutflow,
  });

  /* =========================
     SEND TO TELEGRAM
  ========================= */
  await notifyTelegram({ text });

  /* =========================
     RESPONSE
  ========================= */
  return new Response(
    JSON.stringify({
      ok: true,
      cards: cards.length,
      payments: payments.length,
      totalOutflow,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

/* =========================
   Helpers
========================= */

function fmtMonth(m) {
  if (!m) return "";
  const y = m.slice(0, 4);
  const mo = m.slice(4);
  const d = new Date(`${y}-${mo}-01`);
  return d.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}
