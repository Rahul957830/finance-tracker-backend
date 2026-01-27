<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Finance Widget – Rule Tester</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont;
      background: transparent;
      color: #e5e7eb;
    }

    .section {
      margin-bottom: 14px;
    }

    .title {
      font-weight: 600;
      font-size: 13px;
      opacity: 0.85;
      margin-bottom: 6px;
    }

    .item {
      padding: 6px 8px;
      border-radius: 6px;
      margin-bottom: 4px;
      background: rgba(255,255,255,0.06);
      font-size: 12px;
    }

    .high { border-left: 4px solid #ef4444; }
    .medium { border-left: 4px solid #f59e0b; }
    .low { border-left: 4px solid #10b981; }

    .muted {
      opacity: 0.65;
      font-size: 11px;
    }
  </style>
</head>
<body>

<div id="root">Loading…</div>

<script>
async function loadWidget() {
  const res = await fetch("https://finance-events-api.vercel.app/api/widget/view");
  const data = await res.json();

  const root = document.getElementById("root");
  root.innerHTML = "";

  /* ================
     CARDS
  ================= */

  function renderCardSection(title, items) {
    if (!items.length) return;

    const section = document.createElement("div");
    section.className = "section";

    const h = document.createElement("div");
    h.className = "title";
    h.textContent = title;
    section.appendChild(h);

    items.forEach(c => {
      if (c.rules.visibility === "expired") return;

      const div = document.createElement("div");
      div.className = `item ${c.rules.urgency}`;

      div.innerHTML = `
        <div><strong>${c.display}</strong></div>
        <div class="muted">
          ${c.rules.status_label} · ₹${c.amount_due}
        </div>
      `;

      section.appendChild(div);
    });

    root.appendChild(section);
  }

  renderCardSection("Overdue", data.cards.overdue);
  renderCardSection("Due", data.cards.due);
  renderCardSection("Paid (recent)", data.cards.paid);

  /* ================
     PAYMENTS
  ================= */

  const paymentSection = document.createElement("div");
  paymentSection.className = "section";

  const ph = document.createElement("div");
  ph.className = "title";
  ph.textContent = "Payments";
  paymentSection.appendChild(ph);

  Object.entries(data.payments).forEach(([day, payments]) => {
    payments.forEach(p => {
      if (p.rules.visibility === "expired") return;

      const div = document.createElement("div");
      div.className = "item low";

      div.innerHTML = `
        <div><strong>${p.display}</strong></div>
        <div class="muted">₹${p.amount} · ${day}</div>
      `;

      paymentSection.appendChild(div);
    });
  });

  root.appendChild(paymentSection);
}

loadWidget();
</script>

</body>
</html>
