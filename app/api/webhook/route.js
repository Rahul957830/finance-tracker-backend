import { kv } from "@vercel/kv";

export async function GET() {
  const testKey = "event:TEST_CC_ICICI_7003_202601";
  const data = await kv.get(testKey);

  return new Response(
    JSON.stringify({
      ok: true,
      route: "app/api/webhook",
      key: testKey,
      value: data || null,
    }),
    { status: 200 }
  );
}

export async function POST(req) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.events)) {
      return new Response(
        JSON.stringify({
          error: "Invalid payload. Expected { events: [] }",
        }),
        { status: 400 }
      );
    }

    const written = [];

    for (const event of body.events) {
      if (!event.event_id) continue;

      const key = `event:${event.event_id}`;

      await kv.set(key, event);
      await kv.lpush("index:events:recent", key);
      await kv.lpush(`index:events:${event.category}`, key);

      written.push(key);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        written: written.length,
        keys: written,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Webhook error:", err);

    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500 }
    );
  }
}
