export const dynamic = "force-dynamic";

export default async function WidgetPage() {
  // ✅ RELATIVE fetch (works in Next.js pages)
  const res = await fetch("/api/widget/view", {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <div style={{ color: "red", padding: 16 }}>
        Failed to load widget data
      </div>
    );
  }

  const data = await res.json();

  return (
    <div
      style={{
        fontFamily: "system-ui",
        fontSize: "13px",
        padding: "12px",
        color: "#e5e7eb",
        background: "transparent",
        maxHeight: "100vh",
        overflowY: "auto",
      }}
    >
      <h3>📌 Finance Rules Tester</h3>

      {/* OVERDUE */}
      {data.cards.overdue.length > 0 && (
        <>
          <h4 style={{ color: "#ef4444" }}>Overdue</h4>
          {data.cards.overdue.map(card => (
            <Card key={card.card_id} item={card} />
          ))}
        </>
      )}

      {/* DUE */}
      {data.cards.due.length > 0 && (
        <>
          <h4 style={{ color: "#f59e0b" }}>Due</h4>
          {data.cards.due.map(card => (
            <Card key={card.card_id} item={card} />
          ))}
        </>
      )}

      {/* PAID */}
      {data.cards.paid.length > 0 && (
        <>
          <h4 style={{ color: "#22c55e" }}>Paid</h4>
          {data.cards.paid.map(card => (
            <Card key={card.card_id} item={card} />
          ))}
        </>
      )}
    </div>
  );
}

function Card({ item }) {
  return (
    <div
      style={{
        marginBottom: 10,
        padding: 10,
        borderRadius: 6,
        background: "#111827",
      }}
    >
      <div style={{ fontWeight: 600 }}>{item.display}</div>
      <div>{item.rules.status_label}</div>
      <div>Urgency: {item.rules.urgency}</div>
      <div>Amount: ₹{item.amount_due}</div>
    </div>
  );
}
