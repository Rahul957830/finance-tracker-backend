import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

/**
 * Telegram sends POST requests here when a button is clicked
 */
export async function POST(req) {
  try {
    const update = await req.json();

    // Telegram callback payload
    const callback = update.callback_query;
    if (!callback) {
      return new Response("ignored", { status: 200 });
    }

    const {
      id: callbackId,
      data,
      from,
      message,
    } = callback;

    // Decode payload
    // Supported formats:
    // ACTION|billId
    // META_METHOD:METHOD|billId
    const [rawAction, billId] = (data || "").split("|");

    let action = rawAction;
    let metaValue = null;

    if (rawAction?.includes(":")) {
      const parts = rawAction.split(":");
      action = parts[0];
      metaValue = parts[1];
    }

    console.log("📲 TELEGRAM_CALLBACK", {
      action,
      metaValue,
      billId,
      from: from?.username,
      chat_id: message?.chat?.id,
    });

    // Store raw click (debug only)
    await kv.set(`telegram:click:${Date.now()}`, {
      action,
      metaValue,
      bill_id: billId,
      user: from?.username,
      chat_id: message?.chat?.id,
      message_id: message?.message_id,
    });

    /* ============================
       BUTTON ACTION HANDLERS
    ============================ */

    // MARK PAID → open metadata selector
    if (action === "MARK_PAID") {
      await kv.set(`cc:${billId}:override_status`, "PAID_PENDING_META");
    }

    // SET DATE
    if (action === "DATE_TODAY" || action === "DATE_YESTERDAY") {
      const date = new Date();
      if (action === "DATE_YESTERDAY") {
        date.setDate(date.getDate() - 1);
      }

      const meta = (await kv.get(`cc:${billId}:payment_meta`)) || {};
      meta.paid_at = date.toISOString().slice(0, 10);
      await kv.set(`cc:${billId}:payment_meta`, meta);
    }

    // SET PAYMENT METHOD
    if (action === "META_METHOD") {
      const meta = (await kv.get(`cc:${billId}:payment_meta`)) || {};
      meta.method = metaValue;
      await kv.set(`cc:${billId}:payment_meta`, meta);
    }

    // SNOOZE (30 minutes)
    if (action === "SNOOZE_30") {
      const until = Date.now() + 30 * 60 * 1000;
      await kv.set(`cc:${billId}:snooze_until`, until);
    }

    // DISMISS
    if (action === "DISMISS") {
      await kv.set(`cc:${billId}:dismissed`, true);
    }

    // VIEW (no state change, log only)
    if (action === "VIEW") {
      // intentionally no-op (future expansion)
    }

    /* ============================
       TELEGRAM ACK (MANDATORY)
    ============================ */

    return new Response(
      JSON.stringify({
        method: "answerCallbackQuery",
        callback_query_id: callbackId,
        text: "✔️ Action received",
        show_alert: false,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("telegram callback error", err);
    return new Response("error", { status: 200 });
  }
}
