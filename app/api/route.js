import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // 1️⃣ get all event keys
  const keys = await kv.keys("event:*");

  if (!keys || keys.length === 0) {
    return Response.json({ events: [] });
  }

  // 2️⃣ fetch all events
  const events = await kv.mget(keys);

  // 3️⃣ filter NON credit-card events
  const nonCardEvents = events.filter(
    (e) => e && e.category !== "CREDIT_CARD"
  );

  // 4️⃣ sort newest first
  nonCardEvents.sort((a, b) => {
    return (
      new Date(b.dates?.paid_at || 0) -
      new Date(a.dates?.paid_at || 0)
    );
  });

  return Response.json({
    count: nonCardEvents.length,
    events: nonCardEvents,
  });
}
