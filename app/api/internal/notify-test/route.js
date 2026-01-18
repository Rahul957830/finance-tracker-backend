import { sendPushover } from "@/lib/notify/pushover";

export const dynamic = "force-dynamic";

export async function GET() {
  await sendPushover({
    title: "Finance Tracker",
    message: "Backend → Pushover notification test ✅",
    sound: "pushover",
  });

  return new Response(
    JSON.stringify({ ok: true, sent: true }),
    { status: 200 }
  );
}
