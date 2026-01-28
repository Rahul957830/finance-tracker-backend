export const dynamic = "force-dynamic";

/* =========================
   VIEW JSON
   (RESHAPE + RULES)
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

  const now = new Date();

  /* =========================
     BASE VIEW SHAPE
  ========================= */
  const view = {
    meta: unified.meta,

    summary: {
      cards: {
        overdue: 0,
        due: 0,
        paid: 0,
      },
      payments: 0,
    },

    cards: {
      overdue: [],
      due: [],
      paid: [],
    },

    payments: {},
  };

  /* =========================
     CARD RULES (INLINE)
  ========================= */
  function applyCardRules(item) {
    let urgency = "low";
    let needs_action = false;
    let visibility = "hidden";
    let status_label = null;

    const days = item.days_left;

    if (item.current_status === "OVERDUE") {
      urgency = "high";
      needs_action = true;
      visibility = "always";

      const d = Math.abs(days ?? 0);
      status_label =
        d === 0
          ? "Overdue today"
          : `Overdue by ${d} day${d === 1 ? "" : "s"}`;
    }

    if (item.current_status === "DUE") {
      urgency = "medium";
      needs_action = true;
      visibility = "always";

      if (days === 0) status_label = "Due today";
      else if (days === 1) status_label = "Due tomorrow";
      else if (days > 1) status_label = `Due in ${days} days`;
      else status_label = "Due";
    }

    if (item.current_status === "PAID") {
      urgency = "low";
      needs_action = false;
      status_label = "Paid";

      if (item.paid_at) {
        const diffDays =
          (now - new Date(item.paid_at)) / (1000 * 60 * 60 * 24);
        visibility = diffDays <= 30 ? "visible" : "expired";
      }
    }

    return {
      urgency,
      needs_action,
      visibility,
      status_label,
    };
  }

  /* =========================
     CARDS → VIEW
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

      extracted_at: ts.extracted_at || null,

      sort_key:
        state.current_status === "PAID"
          ? ts.paid_at
          : state.due_date,
    };

    item.rules = applyCardRules(item);

    if (item.current_status === "OVERDUE") {
      view.cards.overdue.push(item);
    } else if (item.current_status === "DUE") {
      view.cards.due.push(item);
    } else if (item.current_status === "PAID") {
      view.cards.paid.push(item);
    }
  }

  /* ---- sort cards (new → old) ---- */
  const sortDesc = (a, b) =>
    new Date(b.sort_key || 0) - new Date(a.sort_key || 0);

  view.cards.overdue.sort(sortDesc);
  view.cards.due.sort(sortDesc);
  view.cards.paid.sort(sortDesc);

  /* =========================
     PAYMENT RULES (INLINE)
  ========================= */
  function applyPaymentRules(item) {
    let urgency = "low";
    let visibility = "hidden";

    if (item.paid_at) {
      const diffDays =
        (now - new Date(item.paid_at)) / (1000 * 60 * 60 * 24);
      visibility = diffDays <= 30 ? "visible" : "expired";
    }

    return {
      urgency,
      visibility,
    };
  }

  /* =========================
     PAYMENTS → VIEW
  ========================= */
  for (const payment of unified.entities.payments) {
    const paidAt =
      payment.dates?.paid_at ||
      payment.timestamps?.paid_at ||
      payment.source?.extracted_at ||
      null;

    if (!paidAt) continue;

    const day = String(paidAt).slice(0, 10);

    if (!view.payments[day]) {
      view.payments[day] = {
        date: day,
        items: [],
      };
    }

    const item = {
      event_id: payment.event_id,
      event_type: payment.event_type,
      source_id: payment.source_id,

      provider: payment.provider,
      identifier: payment.account?.identifier || null,
      display_name: payment.account?.display_name ?? null,
      ca_number: payment.account?.ca_number || null,

      value: payment.amount?.value ?? null,
      paid_at: payment.dates?.paid_at ?? null,
      payment_status: payment.status?.payment_status ?? "PAID",

      email_from: payment.source?.email_from ?? null,
      message: payment.notification?.message ?? null,

      extracted_at:
        payment.timestamps?.extracted_at ??
        payment.source?.extracted_at ??
        null,
    };

    item.rules = applyPaymentRules(item);
    view.payments[day].items.push(item);
  }

  /* ---- sort payment days + items (new → old) ---- */
  const sortedPayments = {};
  Object.keys(view.payments)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach(day => {
      const visibleItems = view.payments[day].items
        .filter(p => p.rules.visibility === "visible")
        .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));

      if (visibleItems.length) {
        sortedPayments[day] = {
          date: day,
          items: visibleItems,
        };
      }
    });

  view.payments = sortedPayments;

  /* =========================
     SUMMARY COUNTS
  ========================= */
  view.summary.cards.overdue = view.cards.overdue.length;
  view.summary.cards.due = view.cards.due.length;
  view.summary.cards.paid = view.cards.paid.length;

  view.summary.payments = Object.values(view.payments).reduce(
    (sum, d) => sum + d.items.length,
    0
  );

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
