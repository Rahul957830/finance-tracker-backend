import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

/* =========================
   IST TIME HELPERS
========================= */
const IST_OFFSET_MINUTES = 330;

/**
 * Convert any date input to IST ISO string
 * Safe for: null | undefined | string | Date
 */
function toIST(dateInput) {
  if (!dateInput) return null;

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const istTime = new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return istTime.toISOString().replace("Z", "+05:30");
}

export async function GET() {
  /* =========================
     TIME (SAFE)
  ========================= */
  const generatedAt = new Date();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  /* =========================
     META
  ========================= */
  const meta = {
    generated_at: toIST(generatedAt),
    timezone: "Asia/Kolkata",
    window: {
      from: toIST(startOfDay),
      to: toIST(endOfDay),
    },
    sources: ["kv", "extractors"],
    schema_version: "v2-data-complete",
  };

  /* =========================
     CARDS (KV: cc:*)
  ========================= */
  const cards = [];
  const cardIndex = {
    overdue: [],
    due: [],
    paid: [],
  };

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    const cardId = key.replace("cc:", "");

    const card = {
      card_id: cardId,

      account: {
        type: "CREDIT_CARD",
        provider: cc.provider,
        last4: cc.last4,
        source_id: cc.source_id,
      },

      current_state: {
        statement_month: cc.statement_month,
        status: cc.current_status,
        amount_due: Number(cc.amount_due || 0),
        currency: "INR",
        due_date: toIST(cc.due_date),
        days_left: cc.days_left ?? null,
      },

      timestamps: {
        email_received_at: toIST(cc.email_at),
        statement_detected_at: toIST(cc.statement_extracted_at),
        paid_at: toIST(cc.paid_at),
        updated_at: toIST(cc.updated_at),
      },

      payment: {
        paid: cc.paid || false,
        payment_method: cc.payment_method || null,
      },

      linkage: {
        last_statement_event_id: cc.last_statement_event_id || null,
        visibility_month: cc.visibility_month || null,
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
  const paymentIndexByDay = {};
  const paymentIndexByProvider = {};

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event) continue;

    // Skip CC bill events (already represented by cards)
    if (event.category === "CREDIT_CARD") continue;

    const rawPaidAt =
      event.dates?.paid_at ||
      event.created_at ||
      event.timestamp ||
      null;

    const paidAtIST = toIST(rawPaidAt);
    if (!paidAtIST) continue;

    const dayKey = paidAtIST.slice(0, 10); // YYYY-MM-DD in IST

    const payment = {
      payment_id: key,

      account: {
        type: event.account?.type || null,
        identifier: event.account?.identifier || null,
        display_name: event.account?.display_name || null,
        ca_number: event.account?.ca_number || null,
      },

      classification: {
        category: event.category,
        class: event.classification?.class || null,
        confidence_level: event.classification?.confidence_level || null,
        reasons: event.classification?.reasons || [],
      },

      provider: event.provider,

      amount: {
        value: Number(event.amount?.value || 0),
        currency: event.amount?.currency || "INR",
        confidence: event.amount?.confidence || null,
      },

      timestamps: {
        paid_at: paidAtIST,
        email_received_at: toIST(event.dates?.email_at),
        extracted_at: toIST(event.source?.extracted_at),
      },

      source: {
        extractor: event.source_id || event.provider,
        email_id: event.source?.email_id || null,
        email_from: event.source?.email_from || null,
        raw_event_id: event.event_id || null,
      },

      notification: {
        severity: event.notification?.severity || null,
        emoji: event.notification?.emoji || null,
        message: event.notification?.message || null,
      },
    };

    payments.push(payment);

    /* ---- Indexes ---- */
    if (!paymentIndexByDay[dayKey]) {
      paymentIndexByDay[dayKey] = [];
    }
    paymentIndexByDay[dayKey].push(payment.payment_id);

    if (!paymentIndexByProvider[event.provider]) {
      paymentIndexByProvider[event.provider] = [];
    }
    paymentIndexByProvider[event.provider].push(payment.payment_id);
  }

  /* =========================
     FINAL UNIFIED JSON (v2)
  ========================= */
  const unified = {
    meta,

    entities: {
      cards,
      payments,
    },

    indexes: {
      cards: {
        by_status: cardIndex,
      },
      payments: {
        by_day: paymentIndexByDay,
        by_provider: paymentIndexByProvider,
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
