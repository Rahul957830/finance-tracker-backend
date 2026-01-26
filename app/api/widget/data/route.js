import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();

  /* =========================
     CREDIT CARDS (cc:*)
  ========================= */

  const cards = [];
  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    cards.push({
      type: "CREDIT_CARD",

      // identity
      bill_id: cc.bill_id,
      provider: cc.provider,
      last4: cc.last4,
      source_id: cc.source_id,

      // statement
      statement_month: cc.statement_month,
      visibility_month: cc.visibility_month,

      // amounts & dates
      amount_due: cc.amount_due,
      due_date: cc.due_date,
      paid_at: cc.paid_at,
      email_at: cc.email_at,

      // state
      current_status: cc.current_status,
      days_left: cc.days_left,
      paid: cc.paid,
      payment_method: cc.payment_method,

      // traceability
      last_statement_event_id: cc.last_statement_event_id,
      updated_at: cc.updated_at,

      // raw snapshot (future safety)
      raw: cc
    });
  }

  /* =========================
     NON-CARD PAYMENTS (event:*)
  ========================= */

  const payments = [];
  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event) continue;

    // Skip credit card events (already represented above)
    if (event.category === "CREDIT_CARD") continue;

    payments.push({
      type: "PAYMENT",

      // identity
      event_id: event.event_id,
      event_type: event.event_type,
      category: event.category,
      provider: event.provider,
      source_id: event.source_id,

      // account
      account: {
        type: event.account?.type,
        identifier: event.account?.identifier,
        display_name: event.account?.display_name,
        ca_number: event.account?.ca_number
      },

      // amount
      amount: {
        value: event.amount?.value,
        currency: event.amount?.currency,
        confidence: event.amount?.confidence
      },

      // dates
      dates: {
        paid_at: event.dates?.paid_at,
        due_date: event.dates?.due_date,
        statement_month: event.dates?.statement_month
      },

      // status
      status: event.status,

      // notification (VERY IMPORTANT for widget)
      notification: {
        severity: event.notification?.severity,
        emoji: event.notification?.emoji,
        message: event.notification?.message
      },

      // email/source metadata
      source: {
        extracted_at: event.source?.extracted_at,
        email_id: event.source?.email_id,
        email_from: event.source?.email_from
      },

      // classification / ML
      classification: event.classification,

      // raw snapshot
      raw: event
    });
  }

  /* =========================
     RESPONSE
  ========================= */

  return Response.json({
    meta: {
      generated_at: now.toISOString(),
      timezone: "Asia/Kolkata"
    },
    cards,
    payments
  });
}
