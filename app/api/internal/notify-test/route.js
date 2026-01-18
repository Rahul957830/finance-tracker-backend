import { sendPushover } from "@/lib/notify/pushover";

export async function GET() {
  await sendPushover({
    title: "Finance Tracker",
    message: "Backend notification test ✅",
    sound: "pushover",
  });

  return Response.json({ ok: true });
}
