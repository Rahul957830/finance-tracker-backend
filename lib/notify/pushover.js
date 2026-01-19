export async function sendPushover({
  title,
  message,
  priority = 0,
  sound,
}) {
  if (!process.env.PUSHOVER_APP_TOKEN || !process.env.PUSHOVER_USER_KEY) {
    console.warn("Pushover not configured");
    return;
  }

  const body = new URLSearchParams({
    token: process.env.PUSHOVER_APP_TOKEN,
    user: process.env.PUSHOVER_USER_KEY,
    title,
    message,
    priority: String(priority),
  });

  if (sound) body.append("sound", sound);

  await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    body,
  });
}
