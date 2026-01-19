export async function notifyTelegram({ text, buttons }) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn("Telegram not configured");
    return;
  }

  const payload = {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
  };

  if (buttons?.length) {
    payload.reply_markup = {
      inline_keyboard: buttons,
    };
  }

  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}
