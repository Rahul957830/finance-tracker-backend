export const dynamic = "force-dynamic";

/* =========================
   VIEW JSON
   (RESHAPE ONLY)
========================= */

export async function GET(request) {
  const baseUrl = new URL(request.url).origin;

  /* =========================
     LOAD UNIFIED JSON
  ========================= */
  const res = await fetch(`${baseUrl}/api/widget/unified`, {
    cache: "no-store",
  });
  const unified = await res.json();

  /* =========================
     BASE VIEW SHAPE
  ========================= */
  const view = {
    meta: unified.meta,

    cards: {
      overdue: [],
      due: [],
      paid: [],
    },

    payments: {},
  };

  /* =========================
     CARDS → VIEW
     (ONLY FIELDS FROM SHEET)
  ========================= */
  for (const card of unified.entities.cards) {
    const state = card.state || {};
    const ts = card.timestamps || {};
    const email = card.email || {};
    const event = card.event || {};

    const item = {
      event_id: event.event_id || null,
      source_id: event.source_id || null,
      current_status: state.current_status || null,

      provider: state.provider || null,
      last4: state.last4 || null,
      identifier: state.last4 || null,

      statement_month: state.statement_month || null,
      amount_due: state.amount_due ?? null,
      due_date: state.due_date || null,
      days_left: state.days_left ?? null,

      email_at: ts.email_at || null,
      email_from: email.email_from || null,

      paid_at: ts.paid_at || null,
      payment_method: state.payment_method || null,

      extracted_at: card.timestamps.extracted_at ?? null,
       
    };

    if (state.current_status === "OVERDUE") {
      view.cards.overdue.push(item);
    } else if (state.current_status === "DUE") {
      view.cards.due.push(item);
    } else if (state.current_status === "PAID") {
      view.cards.paid.push(item);
    }
  }

  /* ---- sort cards (new → old) ---- */
  const sortByDateDesc = (a, b, field) =>
    new Date(b[field] || 0) - new Date(a[field] || 0);

  view.cards.overdue.sort((a, b) => sortByDateDesc(a, b, "due_date"));
  view.cards.due.sort((a, b) => sortByDateDesc(a, b, "due_date"));
  view.cards.paid.sort((a, b) => sortByDateDesc(a, b, "paid_at"));

  /* =========================
     PAYMENTS → VIEW
     (ONLY FIELDS FROM SHEET)
  ========================= */
  for (const payment of unified.entities.payments) {
    const paidAt =
      payment.dates?.paid_at ||
      payment.created_at ||
      payment.timestamp ||
      null;

    if (!paidAt) continue;

    const day = String(paidAt).slice(0, 10);

    if (!view.payments[day]) view.payments[day] = [];

    view.payments[day].push({
      /* identity */
  event_id: payment.event_id,
  event_type: payment.event_type,
  source_id: payment.source_id,

  /* core fields */
  provider: payment.provider,
  identifier: payment.account?.identifier || null,
  display_name: payment.account?.display_name ?? null,
  ca_number: payment.account?.ca_number || null,

  value: payment.amount?.value ?? null,
  paid_at: payment.timestamps?.paid_at ?? null,
  payment_status: payment.status?.payment_status ?? null,

  email_from: payment.source?.email_from ?? null,
  message: payment.notification?.message ?? null,
       
  /* timestamps */
 extracted_at:
  payment.timestamps?.extracted_at ??
  payment.source?.extracted_at ??
  null,
    });
  }

  /* ---- sort payment days + items (new → old) ---- */
  const sortedPayments = {};
  Object.keys(view.payments)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach(day => {
      sortedPayments[day] = view.payments[day].sort(
        (a, b) => new Date(b.paid_at) - new Date(a.paid_at)
      );
    });

  view.payments = sortedPayments;

  /* =========================
     RESPONSE
  ========================= */
  return new Response(JSON.stringify(view, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
