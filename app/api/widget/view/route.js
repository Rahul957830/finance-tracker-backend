export const dynamic = "force-dynamic";

/* =====================
   HELPERS
===================== */

function formatStatementMonth(yyyymm) {
  if (!yyyymm) return null;
  const year = yyyymm.slice(0, 4);
  const month = yyyymm.slice(4, 6);
  const date = new Date(`${year}-${month}-01`);
  return (
    date.toLocaleString("en-IN", { month: "short" }) +
    "'" +
    year.slice(2)
  );
}

function buildCardLabel(card) {
  const p = card.state?.provider || "Card";
  const l4 = card.state?.last4 || "";
  const m = formatStatementMonth(card.state?.statement_month);
  return `${p} CC ${l4} ${m || ""}`.trim();
}

/* =====================
   VIEW ROUTE
===================== */

export async function GET(request) {
  const baseUrl = new URL(request.url).origin;

  /* =====================
     LOAD UNIFIED JSON
  ===================== */
  const unifiedRes = await fetch(`${baseUrl}/api/widget/unified`, {
    cache: "no-store",
  });

  const unified = await unifiedRes.json();

  /* =====================
     BASE VIEW SHAPE
  ===================== */
  const view = {
    meta: {
      generated_at: unified.meta.generated_at,
      timezone: unified.meta.timezone,
    },

    cards: {
      overdue: [],
      due: [],
      paid: [],
    },

    payments: {}, // grouped by paid_at date
  };

  /* =====================
     CARDS → VIEW
     (KV truth, no interpretation)
  ===================== */
  for (const card of unified.entities.cards || []) {
    const item = {
      card_id: card.id,
      status: card.state.current_status,

      display: buildCardLabel(card),

      provider: card.state.provider,
      last4: card.state.last4,
      statement_month: formatStatementMonth(
        card.state.statement_month
      ),

      amount_due: card.state.amount_due,
      due_date: card.state.due_date,
      days_left: card.state.days_left,

      paid: card.state.paid,
      paid_at: card.timestamps.paid_at,
      payment_method: card.state.payment_method || null,

      email_from: card.email?.email_from || null,
      email_at: card.timestamps.email_at,
      extracted_at: card.timestamps.extracted_at,
      updated_at: card.timestamps.updated_at,
    };

    if (item.status === "OVERDUE") view.cards.overdue.push(item);
    else if (item.status === "DUE" || item.status === "OPEN")
      view.cards.due.push(item);
    else if (item.status === "PAID") view.cards.paid.push(item);
  }

  /* ---- sort cards ---- */
  const sortDesc = (a, b, field) =>
    new Date(b[field] || 0) - new Date(a[field] || 0);

  view.cards.overdue.sort((a, b) => sortDesc(a, b, "due_date"));
  view.cards.due.sort((a, b) => sortDesc(a, b, "due_date"));
  view.cards.paid.sort((a, b) => sortDesc(a, b, "paid_at"));

  /* =====================
     PAYMENTS → VIEW
     (non-card canonical events)
  ===================== */
  for (const p of unified.entities.payments || []) {
    const day = p.paid_at;
    if (!day) continue;

    if (!view.payments[day]) view.payments[day] = [];

    view.payments[day].push({
      payment_id: p.id,

      display:
        p.account?.display_name ||
        p.account?.identifier ||
        p.provider,

      provider: p.provider,
      amount: p.amount,
      currency: p.currency || "INR",

      paid_at: p.paid_at,

      account_type: p.account?.type || null,
      identifier: p.account?.identifier || null,
      customer_number: p.account?.ca_number || null,
    });
  }

  /* ---- sort payments (new → old) ---- */
  const sortedPayments = {};
  Object.keys(view.payments)
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach(day => {
      sortedPayments[day] = view.payments[day].sort(
        (a, b) => new Date(b.paid_at) - new Date(a.paid_at)
      );
    });

  view.payments = sortedPayments;

  /* =====================
     RESPONSE
  ===================== */
  return new Response(JSON.stringify(view, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
