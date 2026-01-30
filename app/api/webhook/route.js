import { shouldSendNotification } from "../../../lib/notify/dedupe";
import { notifyTelegram } from "../../../lib/notify/telegram";
import { buildTelegramMessage } from "../../../lib/notify/messageBuilder";
import { evaluateNotificationRules } from "../../../lib/notify/rules";
import { kv } from "@vercel/kv";
import { CONSUMER_REGISTRY } from "../../../lib/registry/consumerRegistry";

function resolveConsumerName(event) {
  if (!event) return null;

  // 1️⃣ Credit cards → last4
  if (event.category === "CREDIT_CARD") {
    const last4 = event.account?.identifier;
    if (last4 && CONSUMER_REGISTRY.CREDIT_CARD[last4]) {
      return CONSUMER_REGISTRY.CREDIT_CARD[last4];
    }
  }

  // 2️⃣ Non-card payments → CA number
  const ca = event.account?.ca_number;
  if (ca && CONSUMER_REGISTRY.PAYMENT_ACCOUNT[ca]) {
    return CONSUMER_REGISTRY.PAYMENT_ACCOUNT[ca];
  }

  return null;
}

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
         NON-CARD EVENTS
         (payments, subscriptions)
      ========================= */
      if (event.category !== "CREDIT_CARD") {
        const text = buildTelegramMessage({ event });
      const { send } = await shouldSendNotification({
  source: "webhook",
  id: event.event_id,
  reason: "NON_CARD",
});

if (send && text) {
  await notifyTelegram({ text });
}  
        continue;
      }

      /* =========================
         CREDIT CARD EVENTS
      ========================= */

      const extractorStatus = event.status?.payment_status;

      // ✅ KV is authoritative once PAID
      const effectiveStatus =
        existing.current_status === "PAID"
          ? "PAID"
          : extractorStatus;

      const previousStatus = existing.current_status;

      const was_status_changed =
        previousStatus &&
        effectiveStatus &&
        previousStatus !== effectiveStatus;

      const is_new_statement =
        existing.statement_month &&
        event.dates?.statement_month &&
        existing.statement_month !== event.dates.statement_month;

      /* -------------------------
         🔔 Rule engine (KV-aware)
      ------------------------- */
      const decision = evaluateNotificationRules({
        bill_id: billId,
        provider: event.provider,
        statement_month: event.dates?.statement_month,
        status: effectiveStatus,           // ✅ FIX
        days_left: event.status?.days_left,
        is_new_statement,
        was_status_changed,
      });

      console.log("🔔 RULE_DECISION", {
        billId,
        kv_status: existing.current_status,
        extractor_status: extractorStatus,
        effective_status: effectiveStatus,
        decision,
      });

      /* -------------------------
         📩 Notify Telegram
      ------------------------- */
      if (decision?.notify) {
  const { send } = await shouldSendNotification({
    source: "webhook",
    id: billId,
    reason: decision.reason,
  });

  if (send) {
    const text = buildTelegramMessage({ event, cardState: existing, decision });
    if (text) {
      await notifyTelegram({ text });
    }
  }
}

      /* =========================
         Update CC state (SAFE)
      ========================= */
      const updated = {
        ...existing,
        bill_id: billId,
        provider: event.provider,
        consumer_name:
  resolveConsumerName(event) ??
  existing.consumer_name ??
  null,
        last4: event.account?.identifier ?? existing.last4,
        source_id: event.source_id,
         statement_month: event.dates?.statement_month,

      // 📧 Email received date (immutable per statement)
      email_at:
     existing.email_at ??
     event.dates?.email_at ??
     null,
         
        amount_due: event.amount?.value,
        due_date: event.dates?.due_date,
        days_left: event.status?.days_left,
      email_at: event.dates?.email_at || existing.email_at || null,
      extracted_at: event.source?.extracted_at || existing.extracted_at || null,
      email_id: event.source?.email_id || existing.email_id || null,
      email_from: event.source?.email_from || existing.email_from || null,
         
        last_statement_event_id: event.event_id,

        // ❌ Never downgrade PAID
        current_status:
          existing.current_status === "PAID"
            ? "PAID"
            : extractorStatus ?? existing.current_status,

        
updated_at: new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
})
  .format(new Date())
  .replace(",", ""),
         
      };

      await kv.set(ccKey, updated);

      /* -------------------------
         Index maintenance
      ------------------------- */
      await kv.srem("index:cc:open", billId);
      await kv.srem("index:cc:overdue", billId);

      if (updated.current_status === "OVERDUE") {
        await kv.sadd("index:cc:overdue", billId);
      } else if (updated.current_status === "OPEN") {
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
