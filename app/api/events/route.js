import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [open, overdue, paid] = await Promise.all([
    kv.smembers("index:cc:open"),
    kv.smembers("index:cc:overdue"),
    kv.smembers("index:cc:paid"),
  ]);

  return Response.json({
    open: open ?? [],
    overdue: overdue ?? [],
    paid: paid ?? [],
  });
}
