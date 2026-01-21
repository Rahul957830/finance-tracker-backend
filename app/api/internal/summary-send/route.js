import { kv } from "@vercel/kv";
import { notifyTelegram } from "../../../../lib/notify/telegram";
import { buildDailySummary } from "../../../../lib/notify/summaryBuilder";

export async function GET() {
  /* =========================
     DATE
  ========================= */
  const today = new Date();
  const datePretty = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const yyyyMMdd = today.toISOString().slice(0, 10);

  /* =========================
     CARDS (from KV)
  ========================= */
  const cards = [];

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    const label = `${cc.provider} CC ${cc.last4 || ""} ${fmtMonth(
      cc.statement_month
    )}`;

    cards.push({
      label,
      status: cc.current_status,
      amount: cc.amount_due,
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

    // only today
    if (!key.includes(yyyyMMdd)) continue;

    // skip cards
    if (event.category === "CREDIT_CARD") continue;

    const amount = Number(event.amount?.value || 0);
    if (!amount) continue;

    payments.push({
      displayName:
        event.notification?.display_name ||
        event.display_name ||
        event.provider ||
        "Payment",
      provider: event.provider || "—",
      amount,
    });

    totalOutflow += amount;
  }

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

  return new Response(
    JSON.stringify({
      ok: true,
      cards: cards.length,
      payments: payments.length,
      totalOutflow,
    }),
    { status: 200 }
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