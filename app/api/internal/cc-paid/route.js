import { kv } from "@vercel/kv";

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

  // Update indexes
  await kv.srem("index:cc:open", billId);
  await kv.srem("index:cc:overdue", billId);
  await kv.sadd(`index:cc:paid:${visibilityMonth}`, billId);

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
