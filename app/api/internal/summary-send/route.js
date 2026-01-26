import { kv } from "@vercel/kv";
import { notifyTelegram } from "../../../../lib/notify/telegram";
import { buildDailySummary } from "../../../../lib/notify/summaryBuilder";
import { shouldSendNotification } from "../../../../lib/notify/dedupe";

export const DEPLOY_ID = "DEPLOY_2026_01_23_2230";


export const dynamic = "force-dynamic";

export async function GET() {
  console.log("🔥 SUMMARY-SEND HIT", {
    deploy: DEPLOY_ID,
    time: new Date().toISOString(),
  });

 // ✅ DEDUPLICATION GUARD (ADD HERE)
  const dedupe = await shouldSendNotification({
    source: "cron",
    id: "daily-summary",
    reason: "daily",
  });

  if (!dedupe.send) {
    console.log("⛔ DAILY SUMMARY SKIPPED (DEDUPED)", dedupe);
    return new Response(
      JSON.stringify({ ok: true, skipped: true }),
      { status: 200 }
    );
  }

  
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
  const overdue = [];
  const due = [];
  const paid = [];

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    const label = `${cc.provider || "Card"} CC ${
      cc.last4 || ""
    } ${fmtMonth(cc.statement_month)}`.trim();

    const card = {
      label,
      status: cc.current_status, // DUE | OVERDUE | PAID
      amount: Number(cc.amount_due || 0),
      dueDate: cc.due_date,
      paidDate: cc.paid_at,
      sortKey:
        cc.statement_month ||
        cc.paid_at ||
        cc.due_date ||
        "",
    };

    if (cc.current_status === "OVERDUE") overdue.push(card);
    else if (cc.current_status === "DUE") due.push(card);
    else if (cc.current_status === "PAID") paid.push(card);
  }

  // 🔽 New → Old
  const sortDesc = (a, b) => (a.sortKey < b.sortKey ? 1 : -1);

  overdue.sort(sortDesc);
  due.sort(sortDesc);
  paid.sort(sortDesc);

  const cards = [
    ...overdue,
    ...due,
    ...paid,
  ];

  /* =========================
     PAYMENTS (Non-card)
  ========================= */
  const payments = [];
  let totalOutflow = 0;

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event) continue;

    if (event.category === "CREDIT_CARD") continue;

    const amount = Number(event.amount?.value);
    if (!amount) continue;

    payments.push({
  identifier:
    event.account?.identifier ||        // ✅ TPDDL / Delhi Jal Boarddddddddddddddddddd
    event.account?.display_name ||
    event.notification?.display_name ||
    event.display_name ||
    event.provider,

  amount,

  paidDate:
    event.dates?.paid_at ||             // ✅ actual payment date
    event.created_at ||
    event.timestamp,

  ts: event.created_at || event.timestamp || 0,
});

    totalOutflow += amount;
  }

  // Old → New (keeps daily flow readable)
  payments.sort((a, b) => a.ts - b.ts);

// Newest → Oldest
payments.sort((a, b) => {
  const da = new Date(a.paidDate || a.ts).getTime();
  const db = new Date(b.paidDate || b.ts).getTime();
  return db - da;
});

  /* =========================
     BUILD SUMMARY
  ========================= */


  const text = buildDailySummary({
    datePretty,
    cards,
    payments,
    totalOutflow,
  });
  

if (!dedupe.send) {
  return new Response(
    JSON.stringify({
      ok: false,
      skipped: true,
      dedupeKey: dedupe.dedupeKey,
      date: datePretty,
    }),
    { status: 200 }
  );
}


  /* =========================
     SEND TO TELEGRAM
  ========================= */
  await notifyTelegram({ text });
console.log("📊 DAILY_SUMMARY_SENT", {
  date: datePretty,
  cards: cards.length,
  payments: payments.length,
  totalOutflow,
});
  
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
