import { notifyTelegram } from "../../../lib/notify/telegram";
import { buildTelegramMessage } from "../../../lib/notify/messageBuilder";
import { evaluateNotificationRules } from "../../../lib/notify/rules";
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

    if (!body || !Array.isArray(body.events)) {
      return Response.json({ ok: false, error: "events missing" }, { status: 400 });
    }

    for (const event of body.events) {
      if (!event.event_id) continue;

      // store raw event (debugging only)
      await kv.set(`event:${Date.now()}:${event.event_id}`, event);
      
if (event.category === "CREDIT_CARD") {
  const decision = evaluateNotificationRules({
    bill_id: event.event_id,
    provider: event.provider,
    statement_month: event.dates?.statement_month,
    status: event.status?.payment_status,
    days_left: event.status?.days_left,
    is_new_statement: false,
    was_status_changed: false,
  });

  if (decision?.notify) {
    const text = buildTelegramMessage({ event, decision });
    if (text) {
      await notifyTelegram({ text });
    }
  }
} else {
  // ✅ NON-CARD: always notify once
  const text = buildTelegramMessage({ event });
  if (text) {
    await notifyTelegram({ text });
  }
}
   
      const billId = event.event_id;
      const ccKey = `cc:${billId}`;
      const existing = (await kv.get(ccKey)) || {};

// If bill already paid internally, ignore extractor downgrade
if (existing.current_status === "PAID") {
  console.log("⏭ Ignoring extractor event — bill already PAID", billId);
  continue;
}

      const previousStatus = existing.current_status;
      const newStatus = event.status?.payment_status;

      const was_status_changed =
        previousStatus && newStatus && previousStatus !== newStatus;

      const is_new_statement =
        existing.statement_month &&
        event.dates?.statement_month &&
        existing.statement_month !== event.dates.statement_month;

      // 🔔 RULE ENGINE
      const decision = evaluateNotificationRules({
        bill_id: billId,
        provider: event.provider,
        statement_month: event.dates?.statement_month,
        status: newStatus,
        days_left: event.status?.days_left,
        is_new_statement,
        was_status_changed,
      });

      console.log("🔔 RULE_DECISION", {
        billId,
        status: newStatus,
        days_left: event.status?.days_left,
        decision,
      });

      if (decision?.notify) {
        const text = buildTelegramMessage({
          event,
          cardState: existing,
          decision,
        });

        if (text) {
          await notifyTelegram({ text });
        }
      }

      // ---- update CC state (unchanged logic) ----
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
        current_status: newStatus ?? existing.current_status,
        updated_at: new Date().toISOString(),
      };

      await kv.set(ccKey, updated);

      await kv.srem("index:cc:open", billId);
      await kv.srem("index:cc:overdue", billId);

      if (updated.current_status === "OVERDUE") {
        await kv.sadd("index:cc:overdue", billId);
      } else {
        await kv.sadd("index:cc:open", billId);
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Webhook error", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
