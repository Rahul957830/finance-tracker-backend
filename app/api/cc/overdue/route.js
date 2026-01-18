import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const billIds = await kv.smembers("index:cc:overdue");

  const items = [];
  for (const billId of billIds ?? []) {
    const data = await kv.get(`cc:${billId}`);
    if (data) items.push(data);
  }

  return new Response(JSON.stringify(items), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
