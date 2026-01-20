import { kv } from "@vercel/kv";
import { telegramCall } from "@/lib/notify/telegram";
import { initialButtons, paymentMetaButtons } from "@/lib/notify/telegramButtons";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const update = await req.json();
    const cb = update.callback_query;
    if (!cb) return new Response("ok");

    const { id: callbackId, data, message, from } = cb;
    const chatId = message?.chat?.id;
    const messageId = message?.message_id;

    const parts = (data || "").split("|");
    const action = parts[0];
    const billId = parts[parts.length - 1];

    console.log("📲 TELEGRAM_CALLBACK", { action, billId, user: from?.username });

    const draftKey = `telegram:payment_draft:${billId}`;

    // ACK immediately (Telegram requirement)
    await telegramCall({
      method: "answerCallbackQuery",
      callback_query_id: callbackId,
      text: "✔️",
      show_alert: false,
    });

    // ---- ACTIONS ----

    if (action === "MARK_PAID") {
      await telegramCall({
        method: "editMessageReplyMarkup",
        chat_id: chatId,
        message_id: messageId,
        reply_markup: paymentMetaButtons(billId),
      });
      return new Response("ok");
    }

    if (action === "SET_PAYMENT_DATE") {
      await kv.set(draftKey, {
        ...(await kv.get(draftKey)),
        paid_on: new Date().toISOString().slice(0, 10),
      });
      return new Response("ok");
    }

    if (action === "SET_PAYMENT_METHOD") {
      const method = parts[1];
      await kv.set(draftKey, {
        ...(await kv.get(draftKey)),
        payment_method: method,
      });
      return new Response("ok");
    }

    if (action === "CONFIRM_PAYMENT") {
      const draft = (await kv.get(draftKey)) || {};

      // FINALIZE PAID (KV only for now; Notion sync comes next step)
      const ccKey = `cc:${billId}`;
      const existing = (await kv.get(ccKey)) || {};
      await kv.set(ccKey, {
        ...existing,
        paid: true,
        paid_at: draft.paid_on || new Date().toISOString(),
        payment_method: draft.payment_method || null,
        current_status: "PAID",
        updated_at: new Date().toISOString(),
      });

      await kv.del(draftKey);

      // Remove buttons
      await telegramCall({
        method: "editMessageReplyMarkup",
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      });

      return new Response("ok");
    }

    if (action === "DISMISS") {
      await kv.del(draftKey);
      await telegramCall({
        method: "editMessageReplyMarkup",
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      });
      return new Response("ok");
    }

    return new Response("ok");
  } catch (err) {
    console.error("telegram callback error", err);
    return new Response("error");
  }
}
