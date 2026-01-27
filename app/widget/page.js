export const dynamic = "force-dynamic";

export default async function WidgetPage() {
  const res = await fetch("/api/widget/view", {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div style={{ color: "red", padding: "12px" }}>
        Failed to load widget data
      </div>
    );
  }

  const data = await res.json();

  const sectionStyle = {
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #333",
  };

  const cardStyle = {
    marginBottom: "10px",
  };

  return (
    <div
      style={{
        fontFamily: "system-ui",
        fontSize: "13px",
        padding: "12px",
        color: "#e5e7eb",
        background: "transparent",
      }}
    >
      <h3 style={{ marginBottom: "12px" }}>📌 Finance Rules Tester</h3>

      {/* OVERDUE */}
      <div style={sectionStyle}>
        <h4>🔴 Overdue</h4>
        {data.cards.overdue.length === 0 && <div>None</div>}
        {data.cards.overdue.map(card => (
          <div key={card.card_id} style={cardStyle}>
            <strong>{card.display}</strong>
            <div>{card.rules.status_label}</div>
            <div>
              ₹{card.amount_due} • Due {card.due_date}
            </div>
          </div>
        ))}
      </div>

      {/* DUE */}
      <div style={sectionStyle}>
        <h4>🟡 Due</h4>
        {data.cards.due.length === 0 && <div>None</div>}
        {data.cards.due.map(card => (
          <div key={card.card_id} style={cardStyle}>
            <strong>{card.display}</strong>
            <div>{card.rules.status_label}</div>
            <div>
              ₹{card.amount_due} • Due {card.due_date}
            </div>
          </div>
        ))}
      </div>

      {/* PAID */}
      <div style={sectionStyle}>
        <h4>✅ Paid (last 30 days)</h4>
        {data.cards.paid.length === 0 && <div>None</div>}
        {data.cards.paid.map(card => (
          <div key={card.card_id} style={cardStyle}>
            <strong>{card.display}</strong>
            <div>Paid on {card.paid_at}</div>
          </div>
        ))}
      </div>

      {/* PAYMENTS */}
      <div style={sectionStyle}>
        <h4>💸 Payments</h4>
        {Object.keys(data.payments).length === 0 && <div>None</div>}
        {Object.entries(data.payments).map(([day, items]) => (
          <div key={day} style={{ marginBottom: "10px" }}>
            <div style={{ opacity: 0.7 }}>{day}</div>
            {items.map((p, i) => (
              <div key={i} style={{ marginLeft: "8px" }}>
                {p.display} • ₹{p.amount} via {p.method}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
