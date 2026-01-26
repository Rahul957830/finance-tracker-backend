export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(
    `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Finance Dashboard</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #111;
      color: #eee;
      padding: 12px;
    }
    h2 { margin-top: 16px; }
    .item { margin-bottom: 8px; }
    .indent { padding-left: 22px; color: #aaa; }
  </style>
</head>
<body>
  <div id="app">Loading…</div>

  <script>
    fetch("/api/internal/dashboard-data")
      .then(r => r.json())
      .then(data => {
        const app = document.getElementById("app");
        app.innerHTML = "";

        const addSection = (title, items, render) => {
          if (!items.length) return;
          app.innerHTML += "<h2>" + title + "</h2>";
          items.forEach(render);
        };

        addSection("🔴 OVERDUE", data.cards.overdue, c => {
          app.innerHTML += \`
            <div class="item">🚨 \${c.label} ₹\${c.amount}</div>
            <div class="indent">Due: \${c.dueDate}</div>
          \`;
        });

        addSection("🟡 DUE", data.cards.due, c => {
          app.innerHTML += \`
            <div class="item">⚠️ \${c.label} ₹\${c.amount}</div>
            <div class="indent">Due: \${c.dueDate}</div>
          \`;
        });

        addSection("🟢 PAID", data.cards.paid, c => {
          app.innerHTML += \`
            <div class="item">✅ \${c.label} ₹\${c.amount}</div>
            <div class="indent">Paid: \${c.paidDate}</div>
          \`;
        });

        addSection("💸 PAYMENTS", data.payments, p => {
          app.innerHTML += \`
            <div class="item">✅ \${p.name} ₹\${p.amount}</div>
            <div class="indent">\${p.date}</div>
          \`;
        });

        app.innerHTML += "<h3>💰 Total Outflow ₹" + data.totalOutflow + "</h3>";
      });
  </script>
</body>
</html>
`,
    { headers: { "Content-Type": "text/html" } }
  );
}
