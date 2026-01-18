import { sendPushover } from "@/lib/notify/pushover";

export async function POST() {
  await sendPushover({
    title: "Finance Tracker",
    message: "Backend notification test ✅",
    sound: "pushover",
  });

  return Response.json({ ok: true });
}
