export const dynamic = "force-dynamic";

/* =========================
   Helpers (VIEW ONLY)
========================= */

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
  const p = card.account?.provider || card.provider || "Card";
  const l4 = card.account?.last4 || card.last4 || "";
  const m = formatStatementMonth(card.statement_month);
  return `${p} CC ${l4} ${m || ""}`.trim();
}

/* =========================
   VIEW ENDPOINT
========================= */

export async function GET(request) {
  const baseUrl = new URL(request.url).origin;

  /* =========================
     Load Unified JSON
  ========================= */
  const unifiedRes = await fetch(
    `${baseUrl}/api/widget/unified`,
    { cache: "no-store" }
  );

  if (!unifiedRes.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to load unified JSON" }),
      { status: 500 }
    );
  }

  const unified = await unifiedRes.json();

  /* =========================
     Base View Shape
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
  ========================= */
  for (const card of unified.entities.cards || []) {
    const item = {
      card_id: card.bill_id || card.card_id,

      status: card.current_status,

      display: buildCardLabel(card),

      provider: card.provider,
      last4: card.last4,
      statement_month: formatStatementMonth(card.statement_month),

      amount_due: card.amount_due,
      due_date: card.due_date,
      days_left: card.days_left,

      paid: card.paid || false,
      paid_at: card.paid_at || null,
      payment_method: card.payment_method || null,

      email_from: card.email_from || null,
      email_received_at: card.email_at || null,

      extracted_at: card.extracted_at || null,
      updated_at: card.updated_at || null,
    };

    if (item.status === "OVERDUE") {
      view.cards.overdue.push(item);
    } else if (item.status === "DUE") {
      view.cards.due.push(item);
    } else if (item.status === "PAID") {
      view.cards.paid.push(item);
    }
  }

  /* ---- Sort cards (new → old) ---- */
  const sortDesc = (a, b, field) =>
    new Date(b[field] || 0) - new Date(a[field] || 0);

  view.cards.overdue.sort((a, b) => sortDesc(a, b, "due_date"));
  view.cards.due.sort((a, b) => sortDesc(a, b, "due_date"));
  view.cards.paid.sort((a, b) => sortDesc(a, b, "paid_at"));

  /* =========================
     PAYMENTS → VIEW
  ========================= */
  for (const p of unified.entities.payments || []) {
    const paidDay = p.timestamps?.paid_at;
    if (!paidDay) continue;

    if (!view.payments[paidDay]) {
      view.payments[paidDay] = [];
    }

    view.payments[paidDay].push({
      payment_id: p.payment_id,

      display:
        p.account?.identifier ||
        p.account?.display_name ||
        p.provider,

      provider: p.provider,
      amount: p.amount?.value || 0,
      currency: p.amount?.currency || "INR",

      paid_at: paidDay,
      method: p.provider,

      customer_number: p.account?.ca_number || null,

      email_from: p.source?.email_from || null,
      extracted_at: p.timestamps?.extracted_at || null,
    });
  }

  /* ---- Sort payment days + items ---- */
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
