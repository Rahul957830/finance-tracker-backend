export const dynamic = "force-dynamic";

export async function GET(request) {
  const baseUrl = new URL(request.url).origin;

  /* =========================
     LOAD UNIFIED JSON
  ========================= */
  const res = await fetch(`${baseUrl}/api/widget/unified`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to load unified data" }),
      { status: 500 }
    );
  }

  const unified = await res.json();

  /* =========================
     BASE VIEW SHAPE
  ========================= */
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

    payments: {},
  };

  /* =========================
     CARDS → VIEW
     (KV state is authoritative)
  ========================= */
  const cardById = {};
  for (const card of unified.entities.cards) {
    cardById[card.id] = card;
  }

  const statusIndex = unified.indexes.cards.by_status;

  function projectCard(card) {
    return {
      id: card.id,

      display: `${card.state.provider} CC ${card.state.last4} ${card.state.statement_month || ""}`.trim(),

      provider: card.state.provider,
      last4: card.state.last4,
      statement_month: card.state.statement_month,

      amount_due: card.state.amount_due,
      due_date: card.state.due_date,
      days_left: card.state.days_left,

      current_status: card.state.current_status,
      paid: card.state.paid,
      payment_method: card.state.payment_method,

      timestamps: card.timestamps,
      email: card.email,
      linkage: card.linkage,
      event: card.event,
    };
  }

  for (const id of statusIndex.overdue || []) {
    const card = cardById[id];
    if (card) view.cards.overdue.push(projectCard(card));
  }

  for (const id of statusIndex.due || []) {
    const card = cardById[id];
    if (card) view.cards.due.push(projectCard(card));
  }

  for (const id of statusIndex.paid || []) {
    const card = cardById[id];
    if (card) view.cards.paid.push(projectCard(card));
  }

  /* =========================
     PAYMENTS → VIEW
     (non-credit-card canonical events)
  ========================= */
  for (const payment of unified.entities.payments) {
    const paidAt =
      payment.dates?.paid_at ||
      payment.created_at ||
      payment.timestamp ||
      null;

    if (!paidAt) continue;

    const dayKey = String(paidAt).slice(0, 10); // YYYY-MM-DD

    if (!view.payments[dayKey]) {
      view.payments[dayKey] = [];
    }

    view.payments[dayKey].push({
      id: payment.event_id,

      display:
        payment.account?.display_name ||
        payment.account?.identifier ||
        payment.provider,

      provider: payment.provider,

      amount: payment.amount?.value ?? null,
      currency: payment.amount?.currency ?? "INR",

      paid_at: paidAt,

      account: payment.account || null,

      event: payment, // full canonical preserved
    });
  }

  /* =========================
     SORT PAYMENTS (new → old)
  ========================= */
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
