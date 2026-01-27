export default async function WidgetPage() {
  const res = await fetch(
    "/api/widget/view",
    { cache: "no-store" }
  );


  const data = await res.json();

  return (
    <div style={{
      fontFamily: "system-ui",
      fontSize: "13px",
      padding: "12px",
      color: "#e5e7eb",
      background: "transparent"
    }}>
      <h3>📌 Finance Rules Tester</h3>

      <section>
        <h4>🚨 Overdue</h4>
        {data.cards.overdue.length === 0 && <div>None</div>}
        {data.cards.overdue.map(c => (
          <div key={c.card_id}>
            {c.display} — {c.rules.status_label} — 🔥 {c.rules.urgency}
          </div>
        ))}
      </section>

      <section>
        <h4>⏳ Due</h4>
        {data.cards.due.length === 0 && <div>None</div>}
        {data.cards.due.map(c => (
          <div key={c.card_id}>
            {c.display} — {c.rules.status_label}
          </div>
        ))}
      </section>

      <section>
        <h4>✅ Paid (last 30 days)</h4>
        {data.cards.paid.map(c => (
          <div key={c.card_id}>
            {c.display} — Paid on {c.paid_at}
          </div>
        ))}
      </section>

      <section>
        <h4>💸 Payments</h4>
        {Object.entries(data.payments).map(([day, items]) => (
          <div key={day}>
            <strong>{day}</strong>
            {items.map((p, i) => (
              <div key={i}>
                {p.display} — ₹{p.amount}
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
