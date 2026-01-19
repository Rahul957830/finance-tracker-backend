import { sendPushover } from "../../../../lib/notify/pushover";

export const dynamic = "force-dynamic";

export async function GET() {
  await sendPushover({
    title: "Finance Tracker 🚨",
    message: "Emergency sound test",
    priority: 2,
    sound: "siren",
  });

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200 }
  );
}
