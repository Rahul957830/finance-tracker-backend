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
    // data format: ACTION|bill_id
    const [action, billId] = (data || "").split("|");

    console.log("📲 TELEGRAM_CALLBACK", {
      action,
      billId,
      from: from?.username,
      chat_id: message?.chat?.id,
    });

    // Store raw click (for debugging only)
    await kv.set(
      `telegram:click:${Date.now()}`,
      {
        action,
        bill_id: billId,
        user: from?.username,
        chat_id: message?.chat?.id,
        message_id: message?.message_id,
      }
    );

    // Telegram REQUIRES ACK
    return new Response(
      JSON.stringify({
        method: "answerCallbackQuery",
        callback_query_id: callbackId,
        text: "✔️ Received",
        show_alert: false,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("telegram callback error", err);
    return new Response("error", { status: 200 });
  }
}
