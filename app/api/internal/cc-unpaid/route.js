const billId = body.bill_id;

const ccKey = `cc:${billId}`;
const existing = await kv.get(ccKey);
if (!existing) return;

const restoredStatus = existing.days_left < 0 ? "OVERDUE" : "DUE";

await kv.set(ccKey, {
  ...existing,
  paid: false,
  paid_at: null,
  payment_method: null,
  current_status: restoredStatus,
  updated_at: new Date().toISOString()
});

// indexes
await kv.srem(`index:cc:paid:${existing.visibility_month}`, billId);

if (restoredStatus === "OVERDUE") {
  await kv.sadd("index:cc:overdue", billId);
} else {
  await kv.sadd("index:cc:open", billId);
}
