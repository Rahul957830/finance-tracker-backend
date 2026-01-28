export const dynamic = "force-dynamic";

/* =========================
   VIEW JSON
   (RESHAPE + RULES + DATE NORMALIZATION)
========================= */

export async function GET(request) {
  const baseUrl = new URL(request.url).origin;

  const res = await fetch(`${baseUrl}/api/widget/unified`, {
    cache: "no-store",
  });
  const unified = await res.json();

  const now = new Date();

  /* =========================
     DATE HELPERS
  ========================= */
  const toDate = v => (v ? new Date(v) : null);

  const fmtDate = d =>
    d
      ? d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  const fmtDateTime = d =>
    d
      ? d.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const isoDate = d => (d ? d.toISOString() : null);

  /* =========================
     BASE VIEW SHAPE
  ========================= */
  const view = {
    meta: unified.meta,

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
        d === 0 ? "Overdue today" : `Overdue by ${d} day${d === 1 ? "" : "s"}`;
    }

    if (item.current_status === "DUE") {
      urgency = "medium";
      needs_action = true;
      visibility = "always";
      if (days === 0) status_label = "Due today";
      else if (days === 1) status_label = "Due tomorrow";
      else status_label = `Due in ${days} days`;
    }

    if (item.current_status === "PAID") {
      urgency = "low";
      status_label = "Paid";
      if (item.paid_at_raw) {
        const diffDays = (now - item.paid_at_raw) / 86400000;
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

    const dueRaw = toDate(s.due_date);
    const emailRaw = toDate(t.email_at);
    const paidRaw = toDate(t.paid_at);
    const extractedRaw = toDate(t.extracted_at);

    const sortRaw =
      s.current_status === "PAID" ? paidRaw : dueRaw;

    const item = {
      event_id: ev.event_id ?? null,
      source_id: ev.source_id ?? null,
      current_status: s.current_status ?? null,

      provider: s.provider ?? null,
      last4: s.last4 ?? null,
      identifier: s.last4 ?? null,

      statement_month: s.statement_month ?? null,
      amount_due: s.amount_due ?? null,
      days_left: s.days_left ?? null,

      due_date: fmtDate(dueRaw),
      due_date_raw: isoDate(dueRaw),

      email_at: fmtDateTime(emailRaw),
      email_at_raw: isoDate(emailRaw),
      email_from: e.email_from ?? null,

      paid_at: fmtDateTime(paidRaw),
      paid_at_raw: isoDate(paidRaw),

      payment_method: s.payment_method ?? null,

      extracted_at: fmtDateTime(extractedRaw),
      extracted_at_raw: isoDate(extractedRaw),

      sort_key: isoDate(sortRaw),
      sort_key_raw: sortRaw,
    };

    item.rules = applyCardRules(item);

    if (item.current_status === "OVERDUE") view.cards.overdue.push(item);
    else if (item.current_status === "DUE") view.cards.due.push(item);
    else if (item.current_status === "PAID") view.cards.paid.push(item);
  }

  const sortDesc = (a, b) =>
    new Date(b.sort_key || 0) - new Date(a.sort_key || 0);

  view.cards.overdue.sort(sortDesc);
  view.cards.due.sort(sortDesc);
  view.cards.paid.sort(sortDesc);

  /* =========================
     PAYMENT RULES
  ========================= */
  function applyPaymentRules(item) {
    let visibility = "hidden";
    if (item.paid_at_raw) {
      const diff = (now - item.paid_at_raw) / 86400000;
      visibility = diff <= 30 ? "visible" : "expired";
    }
    return { urgency: "low", visibility };
  }

  /* =========================
     PAYMENTS → VIEW
  ========================= */
  for (const p of unified.entities.payments) {
    const paidRaw = toDate(p.dates?.paid_at);
    if (!paidRaw) continue;

    const dayKey = paidRaw.toISOString().slice(0, 10);

    if (!view.payments[dayKey]) {
      view.payments[dayKey] = {
        date: dayKey,
        label: fmtDate(paidRaw),
        items: [],
      };
    }

    const item = {
      event_id: p.event_id,
      event_type: p.event_type,
      source_id: p.source_id,

      provider: p.provider,
      identifier: p.account?.identifier ?? null,
      display_name: p.account?.display_name ?? null,
      ca_number: p.account?.ca_number ?? null,

      value: p.amount?.value ?? null,

      paid_at: fmtDateTime(paidRaw),
      paid_at_raw: isoDate(paidRaw),

      payment_status: p.status?.payment_status ?? "PAID",

      email_from: p.source?.email_from ?? null,
      message: p.notification?.message ?? null,

      extracted_at: fmtDateTime(toDate(p.source?.extracted_at)),
      extracted_at_raw: isoDate(toDate(p.source?.extracted_at)),
    };

    item.rules = applyPaymentRules(item);
    view.payments[dayKey].items.push(item);
  }

  const sortedPayments = {};
  Object.keys(view.payments)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach(k => {
      const visible = view.payments[k].items.filter(
        i => i.rules.visibility === "visible"
      );
      if (visible.length) {
        sortedPayments[k] = {
          ...view.payments[k],
          items: visible.sort(
            (a, b) => new Date(b.paid_at_raw) - new Date(a.paid_at_raw)
          ),
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

  return new Response(JSON.stringify(view, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
