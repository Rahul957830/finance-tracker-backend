import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  /* =========================
     META
  ========================= */
  const today = new Date();
  const date = today.toISOString().slice(0, 10);

  /* =========================
     CREDIT CARDS (from cc:*)
  ========================= */
  const overdue = [];
  const due = [];
  const paid = [];

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    const card = {
      bill_id: cc.bill_id,
      label: `${cc.provider} CC ${cc.last4 || ""} ${fmtMonth(cc.statement_month)}`.trim(),
      provider: cc.provider,
      last4: cc.last4 || null,

      status: cc.current_status, // OVERDUE | DUE | PAID
      amount: cc.amount_due ?? null,

      due_date: cc.due_date ?? null,
      paid_date: cc.paid_at ?? null,
      email_date: cc.email_date ?? null,

      updated_at: cc.updated_at,
    };

    if (cc.current_status === "OVERDUE") overdue.push(card);
    else if (cc.current_status === "DUE") due.push(card);
    else if (cc.current_status === "PAID") paid.push(card);
  }

  /* =========================
     NON-CARD PAYMENTS (event:*)
  ========================= */
  const payments = [];

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event) continue;

    if (event.category === "CREDIT_CARD") continue;

    payments.push({
      event_id: event.event_id,
      identifier:
        event.account?.identifier ||
        event.notification?.display_name ||
        event.display_name ||
        event.provider,

      provider: event.provider,
      amount: event.amount?.value ?? null,

      paid_date: event.dates?.paid_at ?? null,
      email_date: event.dates?.email_at ?? null,

      raw_category: event.category,
    });
  }

  /* =========================
     FINAL UNIFIED JSON
  ========================= */
  return Response.json({
    meta: {
      date,
      generated_at: new Date().toISOString(),
    },

    cards: {
      overdue,
      due,
      paid,
    },

    payments,
  });
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
