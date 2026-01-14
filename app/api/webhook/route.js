import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = "event:TEST_CC_ICICI_7003_202601";
  const value = await kv.get(key);

  return new Response(
    JSON.stringify({
      ok: true,
      source: "app-router",
      key,
      value: value ?? null,
    }),
    { status: 200 }
  );
}

export async function POST(req) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.events)) {
      return new Response(
        JSON.stringify({ error: "Expected { events: [] }" }),
        { status: 400 }
      );
    }

    const written = [];

    for (const event of body.events) {
      if (!event.event_id) continue;

      const key = `event:${event.event_id}`;
      await kv.set(key, event);
      written.push(key);
    }

    return new Response(
      JSON.stringify({ ok: true, written }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(e) }),
      { status: 500 }
    );
  }
}
