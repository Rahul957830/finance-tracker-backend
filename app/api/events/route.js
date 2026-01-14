import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get last 10 event keys
    const keys = await kv.keys("event:*");

    // Fetch values
    const events = await Promise.all(
      keys.slice(-10).map(async (key) => ({
        key,
        value: await kv.get(key),
      }))
    );

    return new Response(
      JSON.stringify({ ok: true, count: events.length, events }, null, 2),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500 }
    );
  }
}
