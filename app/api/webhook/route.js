import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

// GET = health check + quick KV sanity read
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

// POST = receive events and store in KV
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body || !body.event) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing `event` field in payload",
        }),
        { status: 400 }
      );
    }

    // Create a unique key
    const key = `event:${Date.now()}`;

    // Store full payload
    await kv.set(key, body);

    return new Response(
      JSON.stringify({
        ok: true,
        storedKey: key,
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
