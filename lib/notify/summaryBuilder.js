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
  msg += `━━ 💳 C A R D S 💳 ━━━━━━━━━━━━\n\n`;

  const overdue = cards.filter(c => c.status === "OVERDUE");
  const due = cards.filter(c => c.status === "DUE");
  const paid = cards.filter(c => c.status === "PAID");

  // 🔴 OVERDUE
  if (overdue.length) {
    msg += `🔴 OVERDUE\n\n`;
    for (const c of overdue) {
      msg += `🚨 ${c.label}  ${fmtInline(c.amount)}\n`;
      msg += `      Due date : ${fmtDate(c.dueDate)}\n\n`;
    }
  }

  // 🟡 DUE
  if (due.length) {
    msg += `🟡 DUE\n\n`;
    for (const c of due) {
      msg += `⚠️ ${c.label}  ${fmtInline(c.amount)}\n`;
      msg += `      Due date : ${fmtDate(c.dueDate)}\n\n`;
    }
  }

  // 🟢 PAID
  if (paid.length) {
    msg += `🟢 PAID\n\n`;
    for (const c of paid) {
      msg += `✅ ${c.label}  ${fmtInline(c.amount)}\n`;
      msg += `      Paid on : ${fmtDate(c.paidDate)}\n\n`;
    }
  }

  /* =====================
     💸 PAYMENTS (NON-CARD)
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
      const dateline = `      ${paidDate}`; // aligned under text

      // If line is long, push date to next line
      if (line.length > 38) {
        msg += `${line}\n${dateline}\n\n`;
      } else {
        msg += `${line} ${paidDate}\n\n`;
      }
    }

    msg += `💰 Total Outflow ${fmt(totalOutflow)}\n`;
  }

  // ✅ RETURN MUST BE HERE
  return msg.trim();
}

/* =====================
   Helpers
===================== */

function fmtInline(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

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
