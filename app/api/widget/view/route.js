export const dynamic = "force-dynamic";

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
  const p = card.state.provider;
  const l4 = card.state.last4;
  const m = formatStatementMonth(card.state.statement_month);
  return `${p} CC ${l4} ${m}`;
}

export async function GET(request) {
  const baseUrl = new URL(request.url).origin;

  const res = await fetch(`${baseUrl}/api/widget/unified`, {
    cache: "no-store",
  });
  const unified = await res.json();

  const view = {
    meta: unified.meta,
    cards: {
      overdue: [],
      due: [],
      paid: [],
    },
    payments: {},
  };

  /* =====================
     CARDS
  ===================== */
  for (const card of unified.entities.cards) {
    const item = {
      card_id: card.id,
      status: card.state.current_status,

      display: buildCardLabel(card),

      provider: card.state.provider,
      last4: card.state.last4,
      statement_month: formatStatementMonth(card.state.statement_month),

      amount_due: card.state.amount_due,
      due_date: card.state.due_date,
      days_left: card.state.days_left,

      paid_at: card.timestamps.paid_at,
      payment_method: card.state.payment_method,

      email_from: card.email?.email_from || null,
      email_received_at: card.timestamps.email_at,
    };

    if (item.status === "OVERDUE") view.cards.overdue.push(item);
    else if (item.status === "DUE") view.cards.due.push(item);
    else if (item.status === "PAID") view.cards.paid.push(item);
  }

  /* ---- sorting ---- */
  const byDateDesc = (a, b, field) =>
    new Date(b[field] || 0) - new Date(a[field] || 0);

  view.cards.overdue.sort((a, b) => byDateDesc(a, b, "due_date"));
  view.cards.due.sort((a, b) => byDateDesc(a, b, "due_date"));
  view.cards.paid.sort((a, b) => byDateDesc(a, b, "paid_at"));

  return new Response(JSON.stringify(view, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
