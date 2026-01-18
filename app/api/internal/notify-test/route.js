import { sendPushover } from "../../../../lib/notify/pushover";

export const dynamic = "force-dynamic";

export async function GET() {
  await sendPushover({
    title: "Finance Tracker",
    message: "Notify test with sound 🔔",
    priority: 1,
    sound: "cashregister",
  });

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200 }
  );
}
