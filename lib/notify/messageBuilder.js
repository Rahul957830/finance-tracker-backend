export function buildTelegramMessage({ event, cardState, decision }) {

  // ✅ NON-CARD EVENTS (payments, subscriptions, bills, etc.)
  if (event.category !== "CREDIT_CARD") {
    const provider = event.provider || "Payment";
    const amount = formatAmount(event.amount?.value);
    const paidDate = formatDate(event.dates?.paid_at);

    return `💸 ${provider} paid ${amount}${paidDate ? ` on ${paidDate}` : ""}`;
  }

  // ⬇️ EXISTING CREDIT CARD LOGIC CONTINUES BELOW

export function buildTelegramMessage({ event, cardState, decision }) {
  const cardName = `${event.provider} CC ${event.account?.identifier}`;
  const month = event.dates?.statement_month;
  const amount = event.amount?.value;
  const dueDate = formatDate(event.dates?.due_date);
  const paidDate = formatDate(event.dates?.paid_at);
  const daysLeft = event.status?.days_left;

  switch (decision.reason) {
    case "CARD_OVERDUE":
      return `🚨 ${cardName} ${month} overdue by ${Math.abs(daysLeft)} days
Due date: ${dueDate}
Amount: ${formatAmount(amount)}`;

    case "CARD_DUE_SOON":
      return `⚠️ ${cardName} ${month} due in ${daysLeft} days
Due date: ${dueDate}
Amount: ${formatAmount(amount)}`;

    case "NEW_STATEMENT_OR_OPEN":
      return `💳 New statement for ${cardName} ${month}
Amount due: ${formatAmount(amount)}
Due date: ${dueDate}`;

    case "CARD_PAID":
      return `✅ ${cardName} ${month} paid
Amount: ${formatAmount(amount)}
Paid on: ${paidDate}`;

    default:
      return null;
  }
}

/* ---------- helpers ---------- */

function formatDate(dateStr) {
  if (!dateStr) return "—";
  // YYYY-MM-DD only (no time)
  return new Date(dateStr).toISOString().slice(0, 10);
}

function formatAmount(value) {
  if (value === null || value === undefined) return "₹XXXX";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}
