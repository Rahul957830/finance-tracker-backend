import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const todayStr = istNow.toISOString().slice(0, 10);

  /* =========================
     CARDS
  ========================= */
  const overdue = [];
  const due = [];
  const paid = [];

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    const card = {
      label: `${cc.provider || "Card"} ${cc.last4 || ""} ${cc.statement_month || ""}`.trim(),
      amount: Number(cc.amount_due || 0),
      dueDate: cc.due_date,
      paidDate: cc.paid_at,
      status: cc.current_status,
      sortKey:
        cc.statement_month ||
        cc.paid_at ||
        cc.due_date ||
        "",
    };

    if (card.status === "OVERDUE") overdue.push(card);
    else if (card.status === "DUE") due.push(card);
    else if (card.status === "PAID") paid.push(card);
  }

  const sortDesc = (a, b) => (a.sortKey < b.sortKey ? 1 : -1);
  overdue.sort(sortDesc);
  due.sort(sortDesc);
  paid.sort(sortDesc);

  /* =========================
     PAYMENTS (last 30 days)
  ========================= */
  const payments = [];
  let totalOutflow = 0;

  const cutoff = new Date(istNow);
  cutoff.setDate(cutoff.getDate() - 30);

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const event = await kv.get(key);
    if (!event) continue;
    if (event.category === "CREDIT_CARD") continue;

    const amount = Number(event.amount?.value);
    if (!amount) continue;

    const paidAt =
      event.dates?.paid_at ||
      event.created_at ||
      event.timestamp;

    if (!paidAt) continue;

    const paidDate = new Date(paidAt);
    if (paidDate < cutoff) continue;

    payments.push({
      name:
        event.account?.identifier ||
        event.account?.display_name ||
        event.notification?.display_name ||
        event.display_name ||
        event.provider ||
        "Payment",
      amount,
      date: paidDate.toISOString().slice(0, 10),
      ts: paidDate.getTime(),
    });

    totalOutflow += amount;
  }

  payments.sort((a, b) => b.ts - a.ts);

  return Response.json({
    date: todayStr,
    timezone: "Asia/Kolkata",
    cards: { overdue, due, paid },
    payments,
    totalOutflow,
  });
}
