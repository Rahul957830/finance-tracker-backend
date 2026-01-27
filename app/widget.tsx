export const dynamic = "force-dynamic";

export default async function WidgetPage() {
  const res = await fetch(
    "https://finance-events-api.vercel.app/api/widget/view",
    { cache: "no-store" }
  );

  const data = await res.json();

  return (
    <div style={{
      fontFamily: "system-ui",
      padding: "12px",
      background: "transparent",
      color: "#e5e7eb",
      fontSize: "14px"
    }}>
      <h3>📌 Finance Widget (Rule Tester)</h3>

      {/* OVERDUE */}
      {data.cards.overdue.length > 0 && (
        <>
          <h4>🚨 Overdue</h4>
          {data.cards.overdue.map((c: any) => (
            <div key={c.card_id}>
              {c.display} — ₹{c.amount_due}
              <br />
              <small>{c.rules.status_label} · {c.rules.urgency}</small>
            </div>
          ))}
        </>
      )}

      {/* DUE */}
      {data.cards.due.length > 0 && (
        <>
          <h4>⏳ Due</h4>
          {data.cards.due.map((c: any) => (
            <div key={c.card_id}>
              {c.display} — ₹{c.amount_due}
              <br />
              <small>{c.rules.status_label}</small>
            </div>
          ))}
        </>
      )}

      {/* PAYMENTS */}
      <h4>💳 Payments</h4>
      {Object.entries(data.payments).map(([day, items]: any) => (
        <div key={day}>
          <strong>{day}</strong>
          {items.map((p: any, i: number) => (
            <div key={i}>
              {p.display} — ₹{p.amount}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
