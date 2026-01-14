export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Webhook alive",
    }),
    { status: 200 }
  );
}

export async function POST() {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "POST received (KV not connected yet)",
    }),
    { status: 200 }
  );
}
