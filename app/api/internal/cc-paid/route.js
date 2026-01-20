import { notifyTelegram } from "../../../../lib/notify/telegram";
import { kv } from "@vercel/kv";

/* ---------- helpers ---------- */

function formatDatePretty(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount) {
  if (typeof amount !== "number") return "₹XXXX";
  return `₹${amount.toLocaleString("en-IN")}`;
}

/* ---------- route ---------- */

export async function POST(req) {
  const body = await req.json();

  const billId = body.bill_id;
  const ccKey = `cc:${billId}`;

  const existing = (await kv.get(ccKey)) || {};

  const paidAt = body.paid_at;
  const visibilityMonth = paidAt.slice(0, 7).replace("-", "");

  const updated = {
    ...existing,
    paid: true,
    paid_at: paidAt,
    payment_method: body.payment_method,
    payment_note: body.note,
    current_status: "PAID",
    visibility_month: visibilityMonth,
    updated_at: new Date().toISOString(),
  };

  await kv.set(ccKey, updated);

  // 🔔 SEND PAID NOTIFICATION (AUTHORITATIVE)
  const provider = existing.provider || "Card";
  const statementMonth = existing.statement_month || "";
  const cardSuffix = existing.last4 ? ` ${existing.last4}` : "";
  const paidDatePretty = formatDatePretty(paidAt);
  const amountPretty = formatAmount(existing.amount_due);

  let message = `✅ ${provider} CC${cardSuffix} ${statementMonth} Paid Successfully!\n\n`;
  message += `Amount: ${amountPretty}`;

  if (paidDatePretty) {
    message += `\nPaid on: ${paidDatePretty}`;
  }

  if (body.payment_method) {
    message += `\nPayment Method: ${body.payment_method}`;
  }

  await notifyTelegram({ text: message });

  // Update indexes
  await kv.srem("index:cc:open", billId);
  await kv.srem("index:cc:overdue", billId);
  await kv.sadd(`index:cc:paid:${visibilityMonth}`, billId);

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
