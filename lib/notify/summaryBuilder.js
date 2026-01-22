export function buildDailySummary({
  datePretty,
  cards = [],
  payments = [],
  totalOutflow = 0,
}) {
  let msg = `📊 Daily Finance Summary - ${datePretty}\n\n`;

  /* =====================
     💳 CARDS
  ===================== */
  msg += `CARDS\n\n`;

  const overdue = cards.filter(c => c.status === "OVERDUE");
  const due = cards.filter(c => c.status === "DUE");
  const paid = cards.filter(c => c.status === "PAID");

  // 🔴 OVERDUE
  if (overdue.length) {
    msg += `🔴 OVERDUE\n\n`;

    for (const c of overdue) {
      msg += `🚨 ${c.label}\n`;
      msg += `Amount: ${fmt(c.amount)}\n`;
      msg += `Status: Overdue\n`;
      msg += `Due date: ${fmtDate(c.dueDate)}\n\n`;
    }
  }

  // 🟡 DUE
  if (due.length) {
    msg += `🟡 DUE\n\n`;
    
    for (const c of due) {
      msg += `⚠️ ${c.label}\n`;
      msg += `Amount: ${fmt(c.amount)}\n`;
      msg += `Status: Due\n`;
      msg += `Due date: ${fmtDate(c.dueDate)}\n\n`;
    }
  }

  // 🟢 PAID (collapsed if empty)
  if (paid.length) {
    msg += `🟢 PAID\n\n`;
   
    for (const c of paid) {
      msg += `✅ ${c.label}\n`;
      msg += `Amount: ${fmt(c.amount)}\n`;
      msg += `Status: Paid\n`;
      msg += `Paid on: ${fmtDate(c.paidDate)}\n\n`;
    }
  }

  /* =====================
     💸 PAYMENTS (NON-CARD)
  ===================== */
  if (payments.length) {
    msg += `PAYMENTS (Non-card)\n\n`;

    for (const p of payments) {
      const left = `✅ ${p.displayName} (${p.provider})`;
      msg += left.padEnd(38, " ");
      msg += `${fmt(p.amount)}\n`;
    }

    msg += `\n`;
    msg += `Total Outflow`.padEnd(15, " ");
    msg += `${fmt(totalOutflow)}\n`;
  }

  return msg.trim();
}

/* =====================
   Helpers
===================== */

function fmt(n) {
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
