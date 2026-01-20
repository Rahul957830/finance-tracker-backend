export function buildDailySummary({
  datePretty,          // "15 Jan 2025"
  cards = [],          // from KV
  payments = [],       // non-card (KV + extractor labels)
  totalOutflow = 0,    // number
}) {
  let msg = `📊 Daily Finance Summary – ${datePretty}\n\n`;

  /* =====================
     💳 CARDS
  ===================== */
  msg += `CARDS\n`;
  msg += `────────────────────────\n`;

  for (const card of cards) {
    const {
      label,        // "ICICI CC 7003 Dec'25"
      status,       // DUE | OVERDUE | PAID
      amount,
      dueDate,
      paidDate,
    } = card;

    if (status === "OVERDUE") {
      msg += `🚨 ${label}\n`;
      msg += `Amount: ${fmt(amount)}\n`;
      msg += `Status: Overdue\n`;
      msg += `Due date: ${fmtDate(dueDate)}\n\n`;
    }

    if (status === "DUE") {
      msg += `⚠️ ${label}\n`;
      msg += `Amount: ${fmt(amount)}\n`;
      msg += `Status: Due\n`;
      msg += `Due date: ${fmtDate(dueDate)}\n\n`;
    }

    if (status === "PAID") {
      msg += `✅ ${label}\n`;
      msg += `Amount: ${fmt(amount)}\n`;
      msg += `Status: Paid\n`;
      msg += `Paid on: ${fmtDate(paidDate)}\n\n`;
    }
  }

  /* =====================
     💸 PAYMENTS (NON-CARD)
  ===================== */
  if (payments.length) {
    msg += `PAYMENTS (Non-card)\n`;
    msg += `────────────────────────\n`;

    for (const p of payments) {
      const left = `✅ ${p.displayName} (${p.provider})`;
      msg += left.padEnd(38, " ");
      msg += `${fmt(p.amount)}\n`;
    }

    msg += `\n`;
    msg += `Total Outflow`.padEnd(38, " ");
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
