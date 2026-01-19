import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function answerCallback(callbackId, text) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text,
      show_alert: false,
    }),
  });
}

async function editMessage(chat_id, message_id, text, buttons = null) {
  const payload = {
    chat_id,
    message_id,
    text,
    parse_mode: "HTML",
  };

  if (buttons) {
    payload.reply_markup = { inline_keyboard: buttons };
  }

  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function POST(req) {
  try {
    const update = await req.json();
    const callback = update.callback_query;
    if (!callback) return new Response("ignored", { status: 200 });

    const { id, data, from, message } = callback;
    const [action, billId, metaValue] = (data || "").split("|");

    console.log("📲 TELEGRAM_CALLBACK", {
      action,
      billId,
      metaValue,
      from: from?.username,
      chat_id: message?.chat?.id,
    });

    // persist raw click
    await kv.set(`telegram:click:${Date.now()}`, {
      action,
      bill_id: billId,
      metaValue,
      chat_id: message?.chat?.id,
      message_id: message?.message_id,
    });

    // --- ACTION HANDLERS ---

    if (action === "VIEW") {
      await answerCallback(id, "Showing details");
      return new Response("ok", { status: 200 });
    }

    if (action === "MARK_PAID") {
      await kv.set(`cc:${billId}:status`, "PAID_PENDING_META");
      await answerCallback(id, "Payment marked. Add details.");

      await editMessage(
        message.chat.id,
        message.message_id,
        message.text,
        [
          [
            { text: "📅 Payment Date", callback_data: `ADD_META|${billId}|DATE` },
            { text: "💳 Payment Method", callback_data: `ADD_META|${billId}|METHOD` },
          ],
          [{ text: "❌ Cancel", callback_data: `CANCEL|${billId}` }],
        ]
      );
      return new Response("ok", { status: 200 });
    }

    if (action === "ADD_META") {
      await answerCallback(id, "Choose payment details");

      await editMessage(
        message.chat.id,
        message.message_id,
        "Select payment details:",
        [
          [
            { text: "📅 Paid Today", callback_data: `META_DATE|${billId}|TODAY` },
            { text: "📅 Choose Date", callback_data: `META_DATE|${billId}|CUSTOM` },
          ],
          [
            { text: "💳 GPay", callback_data: `META_METHOD|${billId}|GPAY` },
            { text: "💳 Paytm", callback_data: `META_METHOD|${billId}|PAYTM` },
            { text: "💳 Netbanking", callback_data: `META_METHOD|${billId}|NETBANKING` },
          ],
          [{ text: "🔙 Back", callback_data: `MARK_PAID|${billId}` }],
        ]
      );
      return new Response("ok", { status: 200 });
    }

    if (action === "SNOOZE_30") {
      await kv.set(`cc:${billId}:snooze_until`, Date.now() + 30 * 60 * 1000);
      await answerCallback(id, "Snoozed for 30 minutes");
      return new Response("ok", { status: 200 });
    }

    if (action === "REMIND_TOMORROW") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      await kv.set(`cc:${billId}:snooze_until`, tomorrow.getTime());
      await answerCallback(id, "Will remind tomorrow");
      return new Response("ok", { status: 200 });
    }

    if (action === "DISMISS") {
      await kv.set(`cc:${billId}:dismissed`, true);
      await answerCallback(id, "Dismissed");
      return new Response("ok", { status: 200 });
    }

    await answerCallback(id, "Action noted");
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Telegram callback error", err);
    return new Response("error", { status: 200 });
  }
}
