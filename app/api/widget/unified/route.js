import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  /* =========================
     META
  ========================= */
  const meta = {
    generated_at: new Date().toISOString(),
    timezone: "Asia/Kolkata",
    source_of_truth: "kv",
    schema_version: "unified-v2",
  };

  /* =========================
     CARDS (cc:*)
  ========================= */
  const cards = [];
  const cardIndexes = {
    overdue: [],
    due: [],
    paid: [],
  };

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    const cardId = key.replace("cc:", "");

    /* ---- fetch linked canonical event (if exists) ---- */
    let event = null;
    if (cc.last_statement_event_id) {
      const eventKeys = await kv.keys(
        `event:*:${cc.last_statement_event_id}`
      );
      if (eventKeys.length) {
        event = await kv.get(eventKeys.sort().pop());
      }
    }

    const card = {
      id: cardId,

      /* authoritative state from KV */
      state: {
        provider: cc.provider,
        last4: cc.last4,
        statement_month: cc.statement_month,
        amount_due: cc.amount_due,
        due_date: cc.due_date,
        days_left: cc.days_left,
        current_status: cc.current_status,
        paid: cc.paid || false,
        payment_method: cc.payment_method || null,
      },

      /* timestamps (as stored, no conversion) */
      timestamps: {
        email_at: cc.email_at || null,
        extracted_at: cc.extracted_at || null,
        paid_at: cc.paid_at || null,
        updated_at: cc.updated_at || null,
      },

      /* email provenance */
      email: {
        email_id: cc.email_id || null,
        email_from: cc.email_from || null,
      },

      /* linked canonical evidence (optional) */
      event: event || null,

      /* linkage */
      linkage: {
        last_statement_event_id: cc.last_statement_event_id || null,
        visibility_month: cc.visibility_month || null,
      },
    };

    cards.push(card);

    /* ---- index by status (KV authoritative) ---- */
    if (cc.current_status === "OVERDUE") {
      cardIndexes.overdue.push(cardId);
    } else if (cc.current_status === "DUE") {
      cardIndexes.due.push(cardId);
    } else if (cc.current_status === "PAID") {
      cardIndexes.paid.push(cardId);
    }
  }

  /* =========================
     PAYMENTS (event:* excluding CC)
  ========================= */
  const payments = [];
  const paymentIndexByDate = {};

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event) continue;

    if (event.category === "CREDIT_CARD") continue;

    payments.push(event);

    const paidAt =
      event.dates?.paid_at ||
      event.created_at ||
      event.timestamp ||
      null;

    if (paidAt) {
      const dayKey = String(paidAt).slice(0, 10);
      if (!paymentIndexByDate[dayKey]) {
        paymentIndexByDate[dayKey] = [];
      }
     paymentIndexByDate[dayKey].push({
  id: event.event_id,
  paid_at: paidAt,
});
    }
  }

  /* =========================
     FINAL RESPONSE
  ========================= */
  const unified = {
    meta,

    entities: {
      cards,
      payments,
    },

    indexes: {
      cards: {
        by_status: cardIndexes,
      },
      payments: {
        by_date: paymentIndexByDate,
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
