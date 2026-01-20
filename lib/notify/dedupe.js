async function shouldSendNotification({
  source,
  id,
  reason,
}) {
  const today = new Date().toISOString().slice(0, 10);

  const dedupeKey = `notify:${source}:${id}:${reason}:${today}`;

  const alreadySent = await kv.get(dedupeKey);

  if (alreadySent) {
    console.log("🔁 NOTIFY_SKIPPED (DEDUPED)", {
      source,
      id,
      reason,
      dedupeKey,
    });
    return { send: false, dedupeKey };
  }

  // mark as sent
  await kv.set(dedupeKey, {
    sent_at: new Date().toISOString(),
  });

  console.log("📤 NOTIFY_ALLOWED", {
    source,
    id,
    reason,
    dedupeKey,
  });

  return { send: true, dedupeKey };
}
