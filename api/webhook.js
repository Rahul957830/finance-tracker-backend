import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  // ---------- GET (debug) ----------
  if (req.method === "GET") {
    const testKey = "event:TEST_CC_ICICI_7003_202601";
    const data = await kv.get(testKey);

    return res.status(200).json({
      ok: true,
      source: "webhook",
      key: testKey,
      value: data || null,
    });
  }

  // ---------- POST (ingestion) ----------
  if (req.method === "POST") {
    try {
      const body = req.body;

      if (!body || !Array.isArray(body.events)) {
        return res.status(400).json({
          error: "Invalid payload. Expected { events: [] }",
        });
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

      return res.status(200).json({
        ok: true,
        written: written.length,
        keys: written,
      });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  // ---------- METHOD NOT ALLOWED ----------
  return res.status(405).json({ error: "Method not allowed" });
}
