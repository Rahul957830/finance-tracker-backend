export function buildTelegramMessage({ event, cardState, decision }) {

  /* =========================
     ✅ NON-CARD EVENTS
     ========================= */
  if (event.category !== "CREDIT_CARD") {
    // 1️⃣ Prefer extractor-written message
    if (event.notification?.message) {
      return `${event.notification.emoji || "💸"} ${event.notification.message}`;
    }

    // 2️⃣ Fallback
    const provider = event.provider || "Payment";
    const amount = formatAmount(event.amount?.value);
    const paidDate = formatDatePretty(event.dates?.paid_at);

    return `💸 ${provider} payment of ${amount}${paidDate ? ` on ${paidDate}` : ""}`;
  }

  /* =========================
     💳 CREDIT CARD EVENTS
     ========================= */

  const provider = event.provider || "Card";
  const last4 = event.account?.identifier || "";
  const monthPretty = formatStatementMonth(event.dates?.statement_month);

  const cardLabel = `${provider} CC ${last4} ${monthPretty}`.trim();

 const amount = formatAmount(
  cardState?.amount_due ?? event.amount?.value
);

const dueDate = formatDatePretty(
  cardState?.due_date ?? event.dates?.due_date
);

const daysLeft =
  cardState?.days_left ?? event.status?.days_left;

  switch (decision.reason) {

    /* 🔴 OVERDUE */
   case "CARD_OVERDUE":
  return (
    `🚨 ${cardLabel} overdue${
      typeof daysLeft === "number"
        ? ` by ${Math.abs(daysLeft)} days`
        : ""
    }\n\n` +
        `Amount: ${amount}\n` +
        `Due date: ${dueDate}`
      );

    /* 🟠 DUE SOON */
    case "CARD_DUE_SOON":
      return (
        `⚠️ ${cardLabel} due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}\n\n` +
        `Amount: ${amount}\n` +
        `Due date: ${dueDate}`
      );

      case "CARD_DUE":
  return (
    `📅 ${cardLabel} is due\n\n` +
    `Amount: ${amount}\n` +
    `Due date: ${dueDate}`
  );

    /* 🟡 NEW STATEMENT / OPEN */
    case "NEW_STATEMENT_OR_OPEN":
      return (
        `🗂️ New statement generated for ${cardLabel}\n\n` +
        `Amount: ${amount}\n` +
        `Due date: ${dueDate}`
      );

default:
  return `ℹ️ ${cardLabel}\n\nAmount: ${amount}\nDue date: ${dueDate}`;
  }
}

/* =========================
   Helpers
========================= */

function formatAmount(value) {
  if (value === null || value === undefined) return "₹XXXX";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDatePretty(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatementMonth(month) {
  if (!month) return "";
  // 202512 → Dec'25
  const year = month.slice(0, 4);
  const m = month.slice(4, 6);
  const date = new Date(`${year}-${m}-01`);
  return `${date.toLocaleString("en-US", { month: "short" })}'${year.slice(2)}`;
}
