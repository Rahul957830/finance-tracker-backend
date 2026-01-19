import { notifyTelegram } from "@/lib/notify/telegram";
import { evaluateNotificationRules } from "@/lib/notify/rules";

import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

// Health check
export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Webhook alive",
      time: new Date().toISOString(),
    }),
    { status: 200 }
  );
}

// Receive canonical events
export async function POST(req) {
  try {
    const body = await req.json();

    // 1️⃣ Validate payload
    if (!body || !Array.isArray(body.events)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "`events` array missing or invalid",
        }),
        { status: 400 }
      );
    }

    if (body.events.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "`events` array is empty",
        }),
        { status: 400 }
      );
    }

    // 2️⃣ TEMP storage (do NOT design schema yet)
    const storedKeys = [];

    for (const event of body.events) {
      if (!event.event_id) continue;

      const key = `event:${Date.now()}:${event.event_id}`;
      await kv.set(key, event);
      storedKeys.push(key);

      let cardState = null;

      if (event.category === "CREDIT_CARD") {
        cardState = await upsertCreditCardState(event);
      }

      const notification = evaluateNotificationRules(event, cardState);

      if (notification) {
        await notifyTelegram({
          text: notification.text,
          buttons: notification.buttons,
        });
      }
    }

    // 3️⃣ Response
    return new Response(
      JSON.stringify({
        ok: true,
        received: body.events.length,
        stored: storedKeys.length,
        keys: storedKeys,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err.message,
      }),
      { status: 500 }
    );
  }
}

async function upsertCreditCardState(event) {
  const billId = event.event_id;
  const ccKey = `cc:${billId}`;

  const existing = (await kv.get(ccKey)) || {};

  const updated = {
    ...existing,

    bill_id: billId,
    provider: event.provider,
    source_id: event.source_id,
    statement_month: event.dates?.statement_month,

    amount_due: event.amount?.value,
    due_date: event.dates?.due_date,
    days_left: event.status?.days_left,

    last_statement_event_id: event.event_id,
    statement_extracted_at: new Date().toISOString(),

    current_status:
      event.status?.payment_status ?? existing.current_status,
    updated_at: new Date().toISOString(),
  };

  await kv.set(ccKey, updated);

  // --- Index updates (single source of truth) ---

  // Always remove first (idempotent)
  await kv.srem("index:cc:open", billId);
  await kv.srem("index:cc:overdue", billId);

  // Re-add based on current status
  if (updated.current_status === "OVERDUE") {
    await kv.sadd("index:cc:overdue", billId);
  } else {
    // DUE == OPEN
    await kv.sadd("index:cc:open", billId);
  }

  // ✅ IMPORTANT: return state for rules
  return updated;
}
