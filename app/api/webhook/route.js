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

    // 1️⃣ Validate payload
    if (!body || !Array.isArray(body.events)) {
      return new Response(
        JSON.stringify({ ok: false, error: "`events` array missing or invalid" }),
        { status: 400 }
      );
    }

    if (body.events.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "`events` array is empty" }),
        { status: 400 }
      );
    }

    const decisions = [];

    for (const event of body.events) {
      if (!event.event_id) continue;

      // Store raw event
      await kv.set(`event:${Date.now()}:${event.event_id}`, event);

      // Only credit cards
      if (event.category !== "CREDIT_CARD") continue;

      const billId = event.event_id;
      const ccKey = `cc:${billId}`;
      const existing = (await kv.get(ccKey)) || {};

      // --- Derive state ---
      const previousStatus = existing.current_status;
      const newStatus = event.status?.payment_status;

      const was_status_changed =
        previousStatus && newStatus && previousStatus !== newStatus;

      const is_new_statement =
        existing.statement_month &&
        event.dates?.statement_month &&
        existing.statement_month !== event.dates.statement_month;

      // --- Rules ---
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
        bill_id: billId,
        status: newStatus,
        days_left: event.status?.days_left,
        decision,
      });

      decisions.push({ bill_id: billId, decision });

      // --- SEND TELEGRAM (INITIAL STATE ONLY) ---
      if (decision?.notify) {
        const text = buildTelegramMessage({
          event,
          cardState: {
            bill_id: billId,
            provider: event.provider,
            statement_month: event.dates?.statement_month,
            amount_due: event.amount?.value,
            due_date: event.dates?.due_date,
            days_left: event.status?.days_left,
            status: newStatus,
          },
          decision,
        });

        if (text) {
          const buttons = [
            [{ text: "👁 View Details", callback_data: `VIEW|${billId}` }],
            [{ text: "✅ Mark Paid", callback_data: `MARK_PAID|${billId}` }],
            [{ text: "❌ Dismiss", callback_data: `DISMISS|${billId}` }],
          ];

          await notifyTelegram({ text, buttons });
        }
      }

      // --- Update CC state (unchanged) ---
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
        current_status: newStatus ?? existing.current_status,
        updated_at: new Date().toISOString(),
      };

      await kv.set(ccKey, updated);

      await kv.srem("index:cc:open", billId);
      await kv.srem("index:cc:overdue", billId);

      if (updated.current_status === "OVERDUE") {
        await kv.sadd("index:cc:overdue", billId);
      } else if (updated.current_status === "OPEN") {
        await kv.sadd("index:cc:open", billId);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, evaluated: decisions.length, decisions }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Webhook error", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500 }
    );
  }
}
