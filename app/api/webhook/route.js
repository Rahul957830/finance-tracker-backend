import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

// Health check
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

// Receive canonical events
export async function POST(req) {
  try {
    const body = await req.json();

    // 1️⃣ Validate payload
    if (!body || !Array.isArray(body.events)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "`events` array missing or invalid",
        }),
        { status: 400 }
      );
    }

    if (body.events.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "`events` array is empty",
        }),
        { status: 400 }
      );
    }

    // 2️⃣ TEMP storage (do NOT design schema yet)
    const storedKeys = [];

    for (const event of body.events) {
      if (!event.event_id) continue;

      const key = `event:${Date.now()}:${event.event_id}`;
      await kv.set(key, event);
      storedKeys.push(key);
    }

    // 3️⃣ Response
    return new Response(
      JSON.stringify({
        ok: true,
        received: body.events.length,
        stored: storedKeys.length,
        keys: storedKeys,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err.message,
      }),
      { status: 500 }
    );
  }
}
