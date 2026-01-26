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
      ? {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
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
     CARDS (UNCHANGED)
  ========================= */
  const cards = [];
  const cardIndex = { overdue: [], due: [], paid: [] };

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    const cardId = key.replace("cc:", "");

    let event = null;
    if (cc.last_statement_event_id) {
      const eventKeys = await kv.keys(`event:*:${cc.last_statement_event_id}`);
      if (eventKeys.length) {
        event = await kv.get(eventKeys.sort().pop());
      }
    }

    const card = {
      card_id: cardId,

      identity: {
        event_id: event?.event_id || cc.last_statement_event_id || null,
        event_type: event?.event_type || null,
        category: "CREDIT_CARD",
      },

      account: {
        type: "CREDIT_CARD",
        provider: cc.provider,
        last4: cc.last4,
        source_id: cc.source_id,
        display_name: event?.account?.display_name || null,
      },

      current_state: {
        statement_month: cc.statement_month,
        status: cc.current_status,
        amount_due: Number(cc.amount_due || 0),
        currency: "INR",
        confidence: event?.amount?.confidence || null,
        due_date: toIST(cc.due_date, "date"),
        days_left: cc.days_left ?? null,
      },

      timestamps: {
        email_received_at: toIST(event?.dates?.email_at || cc.email_at),
        statement_detected_at: toIST(event?.source?.extracted_at),
        paid_at: toIST(cc.paid_at, "date"),
        updated_at: toIST(cc.updated_at),
      },

      payment: {
        paid: cc.paid || false,
        payment_method: cc.payment_method || null,
      },

      notification: {
        severity: event?.notification?.severity || null,
        emoji: event?.notification?.emoji || null,
        message: event?.notification?.message || null,
      },

      classification: {
        class: event?.classification?.class || "CREDIT_CARD",
        confidence_level: event?.classification?.confidence_level || null,
        reasons: event?.classification?.reasons || [],
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
     PAYMENTS (FULLY ENRICHED)
  ========================= */
  const payments = [];
  const paymentIndexByDay = {};
  const paymentIndexByProvider = {};

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event || event.category === "CREDIT_CARD") continue;

    const rawPaidAt =
      event.dates?.paid_at ||
      event.created_at ||
      event.timestamp ||
      null;

    const paidAtIST = toIST(rawPaidAt, "date");
    if (!paidAtIST) continue;

    const payment = {
      payment_id: key,

      identity: {
        event_id: event.event_id || null,
        event_type: event.event_type || null,
        category: event.category,
      },

      account: {
        type: event.account?.type || null,
        identifier: event.account?.identifier || null,
        display_name: event.account?.display_name || null,
        ca_number: event.account?.ca_number || null,
      },

      provider: event.provider,

      amount: {
        value: Number(event.amount?.value || 0),
        currency: event.amount?.currency || "INR",
        confidence: event.amount?.confidence || null,
      },

      status: {
        payment_status: event.status?.payment_status || null,
      },

      timestamps: {
        paid_at: paidAtIST,
        email_received_at: toIST(event.dates?.email_at),
        extracted_at: toIST(event.source?.extracted_at),
      },

      notification: {
        severity: event.notification?.severity || null,
        emoji: event.notification?.emoji || null,
        message: event.notification?.message || null,
      },

      classification: {
        class: event.classification?.class || "PAYMENT",
        confidence_level: event.classification?.confidence_level || null,
        reasons: event.classification?.reasons || [],
      },

      source: {
        extractor: event.source_id || event.provider,
        email_id: event.source?.email_id || null,
        email_from: event.source?.email_from || null,
      },
    };

    payments.push(payment);

    /* ---- Indexes ---- */
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
          payments: {
            by_day: paymentIndexByDay,
            by_provider: paymentIndexByProvider,
          },
        },
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}
