/* =========================
   RULES LEGEND (HUMAN READABLE)

   Time basis:
   - All rules are evaluated at view-generation time
   - Timezone used: Asia/Kolkata

   CARD RULES
   ----------
   OVERDUE:
   - Condition: current_status = OVERDUE (days_left < 0)
   - Urgency: HIGH
   - Needs action: YES
   - Visibility: ALWAYS
   - Labels:
     • "Overdue today" (days_left = 0)
     • "Overdue by N days" (days_left < 0)
   - Limit: No time limit. Shown until resolved.

   DUE:
   - Condition: current_status = DUE (days_left ≥ 0)
   - Urgency: MEDIUM
   - Needs action: YES
   - Visibility: ALWAYS
   - Labels:
     • "Due today" (0)
     • "Due tomorrow" (1)
     • "Due in N days" (>1)
   - Limit: No time limit. Always shown.

   PAID (Cards):
   - Condition: current_status = PAID
   - Urgency: LOW
   - Needs action: NO
   - Visibility:
     • Visible for 30 days after paid_at
     • Marked expired after 30 days
   - Label: "Paid"

   PAYMENT RULES (Non-card)
   ------------------------
   PAID:
   - Condition: payment has paid_at timestamp
   - Urgency: LOW
   - Visibility:
     • Visible for 30 days after paid_at
     • Marked expired after 30 days
   - Note: Expired payments remain in data and are never removed.

   IMPORTANT NOTES
   ---------------
   - Expired items are NOT removed from view JSON
   - Visibility is a UI hint only (dim / hide / collapse)
   - View applies rules but NEVER mutates source data
========================= */



export const dynamic = "force-dynamic";

/* =========================
   VIEW JSON
   (RESHAPE + RULES)
========================= */

export async function GET(request) {
  const baseUrl = new URL(request.url).origin;

  /* =========================
     HELPERS (IST formatting)
  ========================= */
  const fmtDateTime = (v) => {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d)) return null;
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  const fmtDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d)) return null;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  };

  const toISTDayKey = (v) => {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d)) return null;
    return d.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    }); // YYYY-MM-DD
  };

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
    meta: {
      ...unified.meta,
      generated_at: fmtDateTime(unified.meta.generated_at),
    },

    summary: {
      cards: { overdue: 0, due: 0, paid: 0 },
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
     CARD RULES
  ========================= */
  function applyCardRules(item, paidAtRaw) {
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

      if (paidAtRaw) {
        const diffDays =
          (now - new Date(paidAtRaw)) / (1000 * 60 * 60 * 24);
        visibility = diffDays <= 30 ? "visible" : "expired";
      }
    }

    return { urgency, needs_action, visibility, status_label };
  }

  /* =========================
     CARDS → VIEW
  ========================= */
  for (const card of unified.entities.cards) {
    const s = card.state || {};
    const t = card.timestamps || {};
    const e = card.email || {};
    const ev = card.event || {};

    const sortKeyRaw =
      s.current_status === "PAID" ? t.paid_at : s.due_date;

    const item = {
      event_id: ev.event_id || null,
      source_id: ev.source_id || null,
      current_status: s.current_status || null,

      provider: s.provider || null,
      consumer_name: p.consumer_name ?? null,
      last4: s.last4 || null,
      identifier: s.last4 || null,

      statement_month: s.statement_month || null,
      amount_due: s.amount_due ?? null,
      due_date: fmtDate(s.due_date),
      days_left: s.days_left ?? null,

      email_at: fmtDateTime(t.email_at),
      email_from: e.email_from || null,

      paid_at: fmtDateTime(t.paid_at),
      payment_method: s.payment_method || null,

      extracted_at: fmtDateTime(t.extracted_at),
    };

    item.rules = applyCardRules(item, t.paid_at);

    item.__sort = sortKeyRaw; // internal only

    if (item.current_status === "OVERDUE") view.cards.overdue.push(item);
    else if (item.current_status === "DUE") view.cards.due.push(item);
    else if (item.current_status === "PAID") view.cards.paid.push(item);
  }

  const sortDesc = (a, b) =>
    new Date(b.__sort || 0) - new Date(a.__sort || 0);

  view.cards.overdue.sort(sortDesc);
  view.cards.due.sort(sortDesc);
  view.cards.paid.sort(sortDesc);

  view.cards.overdue.forEach(i => delete i.__sort);
  view.cards.due.forEach(i => delete i.__sort);
  view.cards.paid.forEach(i => delete i.__sort);

  /* =========================
     PAYMENT RULES
  ========================= */
  function applyPaymentRules(paidAtRaw) {
    let urgency = "low";
    let visibility = "hidden";

    if (paidAtRaw) {
      const diffDays =
        (now - new Date(paidAtRaw)) / (1000 * 60 * 60 * 24);
      visibility = diffDays <= 30 ? "visible" : "expired";
    }

    return { urgency, visibility };
  }

  /* =========================
     PAYMENTS → VIEW
  ========================= */
  for (const p of unified.entities.payments) {
    const paidRaw =
      p.dates?.paid_at ||
      p.timestamps?.paid_at ||
      p.source?.extracted_at ||
      null;

    if (!paidRaw) continue;

    const dayKey = toISTDayKey(paidRaw);
    if (!dayKey) continue;

    if (!view.payments[dayKey]) {
      view.payments[dayKey] = {
        date: dayKey,
        label: fmtDate(dayKey),
        items: [],
      };
    }

    const item = {
      event_id: p.event_id,
      event_type: p.event_type,
      source_id: p.source_id,
      provider: p.provider,
      consumer_name: p.consumer_name ?? null,
      identifier: p.account?.identifier || null,
      display_name: p.account?.display_name ?? null,
      ca_number: p.account?.ca_number || null,

      value: p.amount?.value ?? null,
      paid_at: fmtDateTime(paidRaw),
      payment_status: p.status?.payment_status ?? "PAID",

      email_from: p.source?.email_from ?? null,
      message: p.notification?.message ?? null,

      extracted_at: fmtDateTime(
        p.timestamps?.extracted_at ?? p.source?.extracted_at
      ),
    };

    item.rules = applyPaymentRules(paidRaw);
    item.__sort = paidRaw; // internal only

    view.payments[dayKey].items.push(item);
  }

  /* =========================
     SORT + FILTER PAYMENTS
  ========================= */
  const sortedPayments = {};
  Object.keys(view.payments)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach((day) => {
      const items = view.payments[day].items
  .sort((a, b) => new Date(b.__sort) - new Date(a.__sort))
  .map(i => {
    delete i.__sort; // internal only
    return i;
  });

if (items.length) {
  sortedPayments[day] = {
    date: day,
    label: view.payments[day].label,
    items, // ✅ includes visible + expired
  };
}
    });

  view.payments = sortedPayments;

  /* =========================
     SUMMARY
  ========================= */
  view.summary.cards.overdue = view.cards.overdue.length;
  view.summary.cards.due = view.cards.due.length;
  view.summary.cards.paid = view.cards.paid.length;
  view.summary.payments = Object.values(view.payments).reduce(
    (s, d) => s + d.items.length,
    0
  );
   
/* =========================
   VISIBILITY SUMMARY
========================= */

// ---- Card visibility (PAID only) ----
const paidCards = view.cards.paid;

view.summary.cards_visibility = {
  visible: paidCards.filter(c => c.rules.visibility === "visible").length,
  expired: paidCards.filter(c => c.rules.visibility === "expired").length,
};

// ---- Payment visibility ----
const allPayments = Object.values(view.payments)
  .flatMap(d => d.items);

view.summary.payments_visibility = {
  visible: allPayments.filter(p => p.rules.visibility === "visible").length,
  expired: allPayments.filter(p => p.rules.visibility === "expired").length,
};
   
/* =========================
   FINAL SUMMARY SHAPE (ORDER)
========================= */

view.summary = {
  cards: view.summary.cards,
  cards_visibility: view.summary.cards_visibility,
  payments: view.summary.payments,
  payments_visibility: view.summary.payments_visibility,
};

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
