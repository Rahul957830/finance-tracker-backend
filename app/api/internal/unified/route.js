import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();

  /* =========================
     META
  ========================= */
  const meta = {
    generated_at: now.toISOString(),
    timezone: "Asia/Kolkata",
    window: {
      from: new Date(now.setHours(0, 0, 0, 0)).toISOString(),
      to: new Date(now.setHours(23, 59, 59, 999)).toISOString(),
    },
    sources: ["kv", "extractors", "notion"],
    schema_version: "v2",
  };

  /* =========================
     CARDS (KV: cc:*)
  ========================= */
  const cards = [];
  const cardIndex = { overdue: [], due: [], paid: [] };

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    const cardId = key.replace("cc:", "");

    const card = {
      card_id: cardId,
      provider: cc.provider,
      last4: cc.last4,
      account_type: "CREDIT_CARD",

      current_state: {
        statement_month: cc.statement_month,
        status: cc.current_status,
        amount_due: Number(cc.amount_due || 0),
        currency: "INR",
        due_date: cc.due_date,
      },

      timestamps: {
        email_received_at: cc.email_date || null,
        statement_detected_at: cc.statement_extracted_at,
        paid_at: cc.paid_at || null,
        updated_at: cc.updated_at,
      },

      source: {
        extractor: cc.source_id,
        email_id: cc.email_id || null,
      },
    };

    cards.push(card);

    if (cc.current_status === "OVERDUE") cardIndex.overdue.push(cardId);
    else if (cc.current_status === "DUE") cardIndex.due.push(cardId);
    else if (cc.current_status === "PAID") cardIndex.paid.push(cardId);
  }

  /* =========================
     PAYMENTS (KV: event:*)
  ========================= */
  const payments = [];
  const paymentIndex = {};

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event) continue;
    if (event.category === "CREDIT_CARD") continue;

    const paidAt =
      event.dates?.paid_at ||
      event.created_at ||
      event.timestamp;

    const dayKey = paidAt?.slice(0, 10);
    if (!dayKey) continue;

    const payment = {
      payment_id: key,
      identifier:
        event.account?.identifier ||
        event.account?.display_name ||
        event.notification?.display_name ||
        event.display_name ||
        event.provider,

      provider: event.provider,
      category: event.category,

      amount: {
        value: Number(event.amount?.value || 0),
        currency: "INR",
      },

      timestamps: {
        paid_at: paidAt,
        detected_at: event.created_at,
        email_received_at: event.email_date || null,
      },

      source: {
        extractor: event.source,
        raw_event_id: key,
      },
    };

    payments.push(payment);

    if (!paymentIndex[dayKey]) paymentIndex[dayKey] = [];
    paymentIndex[dayKey].push(payment.payment_id);
  }

  /* =========================
     FINAL UNIFIED JSON
  ========================= */
  const unified = {
    meta,
    entities: {
      cards,
      payments,
    },
    indexes: {
      cards: cardIndex,
      payments: {
        by_day: paymentIndex,
      },
    },
  };

  return new Response(JSON.stringify(unified, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
