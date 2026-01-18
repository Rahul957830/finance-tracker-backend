import { sendPushover } from "@/lib/notify/pushover";

export const dynamic = "force-dynamic";

export async function GET() {
  await sendPushover({
    title: "Finance Tracker",
    message: "Notify test from backend ✅",
    sound: "pushover",
  });

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200 }
  );
}
