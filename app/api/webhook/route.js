import { notifyTelegram } from "../../../lib/notify/telegram";
import { buildTelegramMessage } from "../../../lib/notify/messageBuilder";
import { evaluateNotificationRules } from "../../../lib/notify/rules";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

/* =========================
   Health check
========================= */
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

/* =========================
   Receive canonical events
========================= */
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.events)) {
      return Response.json(
        { ok: false, error: "events missing" },
        { status: 400 }
      );
    }

    for (const event of body.events) {
      if (!event.event_id) continue;

      /* -------------------------
         Store raw event (debug)
      ------------------------- */
      await kv.set(`event:${Date.now()}:${event.event_id}`, event);

      const billId = event.event_id;
      const ccKey = `cc:${billId}`;

      const existing = (await kv.get(ccKey)) || {};

      /* =========================
         🔒 HARD GUARD — PAID
         Ignore extractor downgrades
      ========================= */
      if (
        event.category === "CREDIT_CARD" &&
        existing.current_status === "PAID"
      ) {
        console.log(
          "⏭ Ignoring extractor event — bill already PAID",
          billId
        );
        continue;
      }

      /* =========================
         NON-CARD EVENTS
         (payments, subscriptions)
      ========================= */
      if (event.category !== "CREDIT_CARD") {
        const text = buildTelegramMessage({ event });
        if (text) {
          await notifyTelegram({ text });
        }
        continue;
      }

      /* =========================
         CREDIT CARD EVENTS
      ========================= */

      const previousStatus = existing.current_status;
      const newStatus = event.status?.payment_status;

      const was_status_changed =
        previousStatus && newStatus && previousStatus !== newStatus;

      const is_new_statement =
        existing.statement_month &&
        event.dates?.statement_month &&
        existing.statement_month !== event.dates.statement_month;

      /* -------------------------
         🔔 Rule engine (once)
      ------------------------- */
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

      /* -------------------------
         📩 Notify Telegram
      ------------------------- */
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

      /* =========================
         Update CC state (unchanged)
      ========================= */
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

      /* -------------------------
         Index maintenance
      ------------------------- */
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
    return Response.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
