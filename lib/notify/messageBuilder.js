export function buildTelegramMessage({ event, cardState, decision }) {
  const cardName = `${event.provider} CC ${event.account?.identifier}`;
  const month = event.dates?.statement_month;
  const amount = event.amount?.value;
  const dueDate = event.dates?.due_date;
  const daysLeft = event.status?.days_left;

  switch (decision.reason) {
    case "CARD_OVERDUE":
      return `🚨 ${cardName} ${month} overdue by ${Math.abs(daysLeft)} days
Due date: ${dueDate}
Amount: ₹${amount}`;

    case "CARD_DUE_SOON":
      return `⚠️ ${cardName} ${month} due in ${daysLeft} days
Due date: ${dueDate}
Amount: ₹${amount}`;

    case "NEW_STATEMENT_OR_OPEN":
      return `💳 New statement for ${cardName} ${month}
Amount due: ₹${amount}
Due date: ${dueDate}`;

    case "CARD_PAID":
      return `✅ ${cardName} ${month} paid
Amount: ₹${amount}
Paid on: ${event.dates?.paid_at}`;

    default:
      return null;
  }
}
