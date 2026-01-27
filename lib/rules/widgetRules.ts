// lib/rules/widgetRules.ts

/* =========================
   CARD RULES
========================= */

export function applyCardRules(card) {
  const now = new Date();

  let urgency = "low";
  let needs_action = false;
  let visibility = "hidden";
  let status_label = null;

  if (card.status === "OVERDUE") {
    urgency = "high";
    needs_action = true;
    visibility = "always";

    const days = Math.abs(card.days_left ?? 0);
    status_label = `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  }

  if (card.status === "DUE") {
    urgency = "medium";
    needs_action = true;
    visibility = "always";

    const days = card.days_left ?? null;
    status_label =
      days !== null
        ? `Due in ${days} day${days === 1 ? "" : "s"}`
        : "Due";
  }

  if (card.status === "PAID") {
    urgency = "low";
    needs_action = false;

    if (card.paid_at) {
      const paidAt = new Date(card.paid_at);
      const diffDays =
        (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60 * 24);

      visibility = diffDays <= 30 ? "visible" : "expired";
    }

    status_label = "Paid";
  }

  return {
    ...card,
    rules: {
      urgency,
      needs_action,
      visibility,
      status_label,
    },
  };
}

/* =========================
   PAYMENT RULES
========================= */

export function applyPaymentRules(payment) {
  const now = new Date();

  let urgency = "low";
  let visibility = "hidden";

  if (payment.paid_at) {
    const paidAt = new Date(payment.paid_at);
    const diffDays =
      (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60 * 24);

    visibility = diffDays <= 30 ? "visible" : "expired";
  }

  return {
    ...payment,
    rules: {
      urgency,
      visibility,
    },
  };
}
