import { kv } from "@vercel/kv";

export async function POST(request) {
  try {
    const body = await request.json();
    const billId = body.bill_id;

    if (!billId) {
      return Response.json(
        { ok: false, error: "bill_id missing" },
        { status: 400 }
      );
    }

    const ccKey = `cc:${billId}`;
    const existing = await kv.get(ccKey);

    if (!existing) {
      return Response.json({ ok: true, skipped: true });
    }

    const restoredStatus =
      existing.days_left < 0 ? "OVERDUE" : "DUE";

    await kv.set(ccKey, {
      ...existing,
      paid: false,
      paid_at: null,
      payment_method: null,
      current_status: restoredStatus,
      updated_at: new Date().toISOString(),
    });

    // indexes
    if (existing.visibility_month) {
      await kv.srem(
        `index:cc:paid:${existing.visibility_month}`,
        billId
      );
    }

    await kv.srem("index:cc:open", billId);
    await kv.srem("index:cc:overdue", billId);

    if (restoredStatus === "OVERDUE") {
      await kv.sadd("index:cc:overdue", billId);
    } else {
      await kv.sadd("index:cc:open", billId);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("cc-unpaid error", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
