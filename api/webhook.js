import { kv } from "@vercel/kv";

export default async function handler(req, res) {

  /* =========================================================
     GET  → Debug / verification only (remove later)
     ========================================================= */
  if (req.method === "GET") {
    try {
      const testKey = "event:TEST_CC_ICICI_7003_202601";
      const data = await kv.get(testKey);

      return res.status(200).json(
        data || { error: "Not found in KV", key: testKey }
      );
    } catch (err) {
      console.error("GET error:", err);
      return res.status(500).json({ error: "KV read failed" });
    }
  }

  /* =========================================================
     POST → Main webhook (canonical events ingestion)
     ========================================================= */
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    // Expecting: { events: [ canonicalEvent, ... ] }
    if (!body || !Array.isArray(body.events)) {
      return res.status(400).json({
        error: "Invalid payload. Expected { events: [] }"
      });
    }

    const written = [];

    for (const event of body.events) {
      if (!event || !event.event_id) continue;

      const key = `event:${event.event_id}`;

      // Idempotent write
      await kv.set(key, event);

      // Indexes for widgets / queries
      await kv.lpush("index:events:recent", key);
      if (event.category) {
        await kv.lpush(`index:events:${event.category}`, key);
      }

      written.push(key);
    }

    return res.status(200).json({
      ok: true,
      written: written.length,
      keys: written
    });

  } catch (err) {
    console.error("Webhook POST error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
