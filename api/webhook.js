import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  // Only allow POST
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
      if (!event.event_id) continue;

      const key = `event:${event.event_id}`;

      // Idempotent write
      await kv.set(key, event);

      // Indexes for later widget queries
      await kv.lpush("index:events:recent", key);
      await kv.lpush(`index:events:${event.category}`, key);

      written.push(key);
    }

    return res.status(200).json({
      ok: true,
      written: written.length
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
}



if (req.method === "GET") {
  const test = await kv.get("event:TEST_CC_ICICI_7003_202601");
  return res.status(200).json(test || { error: "Not found" });
}
