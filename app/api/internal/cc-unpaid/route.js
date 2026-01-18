import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json(); // ✅ request, not req
    const billId = body.bill_id;

    if (!billId) {
      return NextResponse.json({ ok: false, error: "bill_id missing" }, { status: 400 });
    }

    const ccKey = `cc:${billId}`;
    const existing = await kv.get(ccKey);

    if (!existing) {
      return NextResponse.json({ ok: true, skipped: true });
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

    await kv.srem(`index:cc:paid:${existing.visibility_month}`, billId);

    if (restoredStatus === "OVERDUE") {
      await kv.sadd("index:cc:overdue", billId);
    } else {
      await kv.sadd("index:cc:open", billId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("cc-unpaid error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
