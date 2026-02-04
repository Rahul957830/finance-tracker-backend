export function buildDailySummary({
  datePretty,
  cards = [],
  payments = [],
  totalOutflow = 0,
}) {
  let msg = `📊 Daily Finance Summary - ${datePretty}\n\n`;

  /* =====================
     💳 CARDS (GROUPED)
  ===================== */
  msg += `━━ 💳 C A R D S 💳 ━━━━━━━━━━━━\n\n`;

  // Group cards by card label (e.g. "ICICI CC 7003")
  const cardsByLabel = {};
  for (const c of cards) {
    if (!cardsByLabel[c.label]) cardsByLabel[c.label] = [];
    cardsByLabel[c.label].push(c);
  }

  // Render each card separately
  for (const label of Object.keys(cardsByLabel).sort()) {
    const list = cardsByLabel[label];

    const overdue = list
      .filter(c => c.status === "OVERDUE")
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

    const due = list
      .filter(c => c.status === "DUE" || c.status === "OPEN")
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

    const paid = list
      .filter(c => c.status === "PAID")
      .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));

    // Card header (always shown)
    msg += `💳 ${label}\n`;
    msg += `────────────────────\n`;

    // 🔴 OVERDUE
    if (overdue.length) {
      msg += `🔴 Overdue\n`;
      for (const c of overdue) {
        msg += `  🚨 ${fmtInline(c.amount)}\n`;
        msg += `     Due : ${fmtDate(c.dueDate)}\n`;
      }
      msg += `\n`;
    }

    // 🟡 DUE
    if (due.length) {
      msg += `🟡 Due\n`;
      for (const c of due) {
        msg += `  ⚠️ ${fmtInline(c.amount)}\n`;
        msg += `     Due : ${fmtDate(c.dueDate)}\n`;
      }
      msg += `\n`;
    }

    // 🟢 PAID
    if (paid.length) {
      msg += `🟢 Paid\n`;
      for (const c of paid) {
        msg += `  ✅ ${fmtInline(c.amount)}\n`;
        msg += `     Paid : ${fmtDate(c.paidDate)}\n`;
      }
      msg += `\n`;
    }
  }

  /* =====================
     💸 PAYMENTS (UNCHANGED)
  ===================== */
  if (payments.length) {
    msg += `━━ 💸 P A Y M E N T S 💸 ━━━━━━━━━━━\n\n`;

    for (const p of payments) {
      const name =
        p.identifier ||
        p.displayName ||
        "Payment";

      const paidDate = fmtDate(p.paidDate || p.ts);

      const line = `✅ ${name} ${fmt(p.amount)}`;
      const dateline = `      Paid on : ${paidDate}`;

      msg += `${line}\n${dateline}\n\n`;
    }
  }

  return msg.trim();
}

/* =====================
   Helpers
===================== */

function fmtInline(n) {
  if (n === null || n === undefined) return "₹—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function fmt(n) {
  if (n === null || n === undefined) return "₹—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
