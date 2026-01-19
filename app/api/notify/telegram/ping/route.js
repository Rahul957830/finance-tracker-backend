export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return Response.json(
      { ok: false, error: "Missing env vars" },
      { status: 500 }
    );
  }

  const now = new Date().toLocaleTimeString();

  const text = `🔔 Telegram sound test\nTime: ${now}`;

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    }
  );

  const data = await res.json();

  return Response.json({
    ok: true,
    telegram: data,
  });
}
