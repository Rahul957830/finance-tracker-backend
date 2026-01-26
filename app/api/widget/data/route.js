import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

/* =========================
   IST DISPLAY HELPERS
========================= */
function toIST(dateInput, mode = "datetime") {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const options =
    mode === "date"
      ? { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }
      : {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        };

  return d.toLocaleString("en-IN", options);
}

export async function GET() {
  /* =========================
     META
  ========================= */
  const meta = {
    generated_at: toIST(new Date()),
    timezone: "Asia/Kolkata",
    sources: ["kv", "extractors"],
    schema_version: "v2-data-complete",
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

    /* ---- Fetch raw canonical event if available ---- */
let event = null;

if (cc.last_statement_event_id) {
  const eventKeys = await kv.keys(
    `event:*:${cc.last_statement_event_id}`
  );

  if (eventKeys.length > 0) {
    const latestEventKey = eventKeys.sort().pop();
    event = await kv.get(latestEventKey);
  }
}

    const card = {
      card_id: cardId,

      /* 🔹 Identity */
      identity: {
        event_id: event?.event_id || cc.last_statement_event_id || null,
        event_type: event?.event_type || null,
        category: event?.category || "CREDIT_CARD",
      },

      /* 🔹 Account */
      account: {
        type: "CREDIT_CARD",
        provider: cc.provider,
        last4: cc.last4,
        source_id: cc.source_id,
        display_name: event?.account?.display_name || null,
      },

      /* 🔹 Current State */
      current_state: {
        statement_month: cc.statement_month,
        status: cc.current_status,
        amount_due: Number(cc.amount_due || 0),
        currency: "INR",
        confidence: event?.amount?.confidence || null,
        due_date: toIST(cc.due_date, "date"),
        days_left: cc.days_left ?? null,
      },

      /* 🔹 Timestamps */
      timestamps: {
        email_received_at: toIST(event?.dates?.email_at || cc.email_at),
        statement_detected_at: toIST(event?.source?.extracted_at),
        paid_at: toIST(cc.paid_at, "date"),
        updated_at: toIST(cc.updated_at),
      },

      /* 🔹 Payment */
      payment: {
        paid: cc.paid || false,
        payment_method: cc.payment_method || null,
      },

      /* 🔹 Notification (from extractor) */
      notification: {
        severity: event?.notification?.severity || null,
        emoji: event?.notification?.emoji || null,
        message: event?.notification?.message || null,
      },

      /* 🔹 Classification */
      classification: {
        class: event?.classification?.class || "CREDIT_CARD",
        confidence_level: event?.classification?.confidence_level || null,
        reasons: event?.classification?.reasons || [],
      },

      /* 🔹 Linkage */
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
     PAYMENTS (UNCHANGED – ALREADY GOOD)
  ========================= */
  const payments = [];
  const paymentIndexByDay = {};
  const paymentIndexByProvider = {};

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event || event.category === "CREDIT_CARD") continue;

    const paidAt = event.dates?.paid_at || event.created_at || event.timestamp;
    const paidAtIST = toIST(paidAt, "date");
    if (!paidAtIST) continue;

    payments.push({
      payment_id: key,
      provider: event.provider,
      amount: event.amount,
      timestamps: {
        paid_at: paidAtIST,
        extracted_at: toIST(event.source?.extracted_at),
      },
      notification: event.notification || null,
    });

    paymentIndexByDay[paidAtIST] ||= [];
    paymentIndexByDay[paidAtIST].push(key);

    paymentIndexByProvider[event.provider] ||= [];
    paymentIndexByProvider[event.provider].push(key);
  }

  /* =========================
     FINAL UNIFIED JSON
  ========================= */
  return new Response(
    JSON.stringify(
      {
        meta,
        entities: { cards, payments },
        indexes: {
          cards: { by_status: cardIndex },
          payments: { by_day: paymentIndexByDay, by_provider: paymentIndexByProvider },
        },
      },
      null,
      2
    ),
    {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    }
  );
}
