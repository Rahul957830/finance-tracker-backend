import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const paidIndexes = await kv.keys("index:cc:paid:*");

  const billIds = new Set();

  for (const indexKey of paidIndexes ?? []) {
    const ids = await kv.smembers(indexKey);
    for (const id of ids ?? []) billIds.add(id);
  }

  const items = [];
  for (const billId of billIds) {
    const data = await kv.get(`cc:${billId}`);
    if (data) items.push(data);
  }

  return new Response(JSON.stringify(items), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
