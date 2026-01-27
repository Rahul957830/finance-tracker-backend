import { kv } from "@vercel/kv";
import {
  applyCardRules,
  applyPaymentRules,
} from "../../../../lib/rules/widgetRules";

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
  const p = card.account?.provider || "Card";
  const l4 = card.account?.last4 || "";
  const m = formatStatementMonth(card.current_state?.statement_month);
  return `${p} CC ${l4} ${m || ""}`.trim();
}

/* =====================
   VIEW JSON
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
      date: unified.meta.generated_at,
      timezone: unified.meta.timezone,
    },

    cards: {
      overdue: [],
      due: [],
      paid: [],
    },

    payments: {},
  };

  /* =====================
     CARDS → VIEW + RULES
  ===================== */
  for (const card of unified.entities.cards) {
    const rawCard = {
      card_id: card.card_id,
      status: card.current_state.status,

      display: buildCardLabel(card),

      provider: card.account.provider,
      last4: card.account.last4,
      statement_month: formatStatementMonth(
        card.current_state.statement_month
      ),

      amount_due: card.current_state.amount_due,
      due_date: card.current_state.due_date,
      days_left: card.current_state.days_left,

      paid_at: card.timestamps.paid_at,
      payment_method: card.payment?.payment_method || null,

      email_from: card.source?.email_from || null,
      email_received_at: card.timestamps.email_received_at,
    };

    const item = applyCardRules(rawCard);

    if (item.status === "OVERDUE") view.cards.overdue.push(item);
    else if (item.status === "DUE") view.cards.due.push(item);
    else if (item.status === "PAID") view.cards.paid.push(item);
  }

  /* ---- sort cards (new → old) ---- */
  const sortDesc = (a, b, field) =>
    new Date(b[field] || 0) - new Date(a[field] || 0);

  view.cards.overdue.sort((a, b) => sortDesc(a, b, "due_date"));
  view.cards.due.sort((a, b) => sortDesc(a, b, "due_date"));
  view.cards.paid.sort((a, b) => sortDesc(a, b, "paid_at"));

  /* =====================
     PAYMENTS → VIEW + RULES
  ===================== */
  for (const p of unified.entities.payments) {
    const day = p.timestamps.paid_at;
    if (!day) continue;

    if (!view.payments[day]) view.payments[day] = [];

    const rawPayment = {
      display:
        p.account?.identifier ||
        p.account?.display_name ||
        p.provider,

      amount: p.amount.value,
      paid_at: p.timestamps.paid_at,

      method: p.provider,
      customer_number: p.account?.ca_number || null,
    };

    view.payments[day].push(applyPaymentRules(rawPayment));
  }

  /* ---- sort payment days + items ---- */
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
