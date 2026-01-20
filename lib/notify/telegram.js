const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Send a normal Telegram message (used by webhook)
 */
export async function notifyTelegram({ text, buttons, priority }) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn("Telegram not configured");
    return;
  }

  const payload = {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
  };

  if (buttons) {
    payload.reply_markup = buttons;
  }

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Low-level Telegram API caller
 * Used by callback handler (edit buttons, ack clicks, etc.)
 */
export async function telegramCall(payload) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn("Telegram bot token missing");
    return;
  }

  const res = await fetch(`${TELEGRAM_API}/${payload.method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!json.ok) {
    console.error("Telegram API error", json);
  }

  return json;
}
