import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

/* =========================
   IST FORMATTERS (DISPLAY)
========================= */
function fmtIST(dateInput, mode = "datetime") {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const opts =
    mode === "date"
      ? {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      : {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        };

  return d.toLocaleString("en-IN", opts);
}

function daysBetween(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

/* =========================
   URGENCY MAPPER
========================= */
function cardUrgency(status, daysLeft) {
  if (status === "OVERDUE") return { urgency: "critical", rank: 1 };
  if (status === "DUE" && daysLeft <= 2)
    return { urgency: "high", rank: 2 };
  if (status === "DUE") return { urgency: "normal", rank: 3 };
  return { urgency: "low", rank: 4 };
}

/* =========================
   DATE HELPERS
========================= */
function withinLastDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}

/* =========================
   VIEW ENDPOINT
========================= */
export async function GET() {
  const now = new Date();

  /* =========================
     META
  ========================= */
  const meta = {
    generated_at: fmtIST(now),
    timezone: "Asia/Kolkata",
    view_version: "v1",
    source_schema_version: "v1",
    window: {
      cards: { paid_days: 30 },
      payments: { days: 30 },
    },
  };

  /* =========================
     CARDS
  ========================= */
  const cardsByStatus = {
    overdue: [],
    due: [],
    paid: [],
  };

  const ccKeys = await kv.keys("cc:*");

  for (const key of ccKeys) {
    const cc = await kv.get(key);
    if (!cc) continue;

    // paid cards → only last 30 days
    if (
      cc.current_status === "PAID" &&
      !withinLastDays(cc.paid_at, 30)
    ) {
      continue;
    }

    let event = null;
    if (cc.last_statement_event_id) {
      const eKeys = await kv.keys(
        `event:*:${cc.last_statement_event_id}`
      );
      if (eKeys.length) {
        event = await kv.get(eKeys.sort().pop());
      }
    }

    const daysLeft =
      cc.days_left ?? daysBetween(cc.due_date);

    const { urgency, rank } = cardUrgency(
      cc.current_status,
      daysLeft
    );

    const cardView = {
      id: key.replace("cc:", ""),

      display: {
        title: `${cc.provider} Credit Card`,
        subtitle: `${cc.last4 || ""} · ${cc.statement_month || ""}`,
        display_name: `${cc.provider} CC ${cc.last4 || ""} ${cc.statement_month || ""}`.trim(),
      },

      status: {
        type: cc.current_status,
        urgency,
        priority_rank: rank,
        days_left: daysLeft,
      },

      amount: {
        due: Number(cc.amount_due || 0),
        currency: "INR",
        confidence: event?.amount?.confidence || null,
      },

      dates: {
        statement_month: cc.statement_month,
        due_date: fmtIST(cc.due_date, "date"),
        paid_at: fmtIST(cc.paid_at, "date"),
      },

      payment: {
        paid: cc.paid || false,
        method: cc.payment_method || null,
      },

      email: {
        from: cc.email_from || null,
        received_at: fmtIST(cc.email_at),
        email_id: cc.email_id || null,
      },

      classification: {
        class: event?.classification?.class || "CREDIT_CARD",
        confidence_level:
          event?.classification?.confidence_level || null,
        reasons: event?.classification?.reasons || [],
      },

      notification: {
        severity: event?.notification?.severity || null,
        emoji: event?.notification?.emoji || null,
        message: event?.notification?.message || null,
      },

      source_refs: {
        card_id: key.replace("cc:", ""),
        event_id: cc.last_statement_event_id || null,
        extractor: cc.source_id,
        visibility_month: cc.visibility_month || null,
      },

      timestamps: {
        extracted_at: fmtIST(cc.extracted_at),
        updated_at: fmtIST(cc.updated_at),
      },
    };

    if (cc.current_status === "OVERDUE")
      cardsByStatus.overdue.push(cardView);
    else if (cc.current_status === "DUE")
      cardsByStatus.due.push(cardView);
    else cardsByStatus.paid.push(cardView);
  }

  // sort New → Old
  const sortNewOld = (a, b) =>
    new Date(b.timestamps.updated_at) -
    new Date(a.timestamps.updated_at);

  cardsByStatus.overdue.sort(sortNewOld);
  cardsByStatus.due.sort(sortNewOld);
  cardsByStatus.paid.sort(sortNewOld);

  /* =========================
     PAYMENTS (LAST 30 DAYS)
  ========================= */
  const paymentsByDay = {};
  let totalOutflow = 0;

  const eventKeys = await kv.keys("event:*");

  for (const key of eventKeys) {
    const e = await kv.get(key);
    if (!e || e.category === "CREDIT_CARD") continue;

    const paidAt =
      e.dates?.paid_at || e.created_at || e.timestamp;

    if (!withinLastDays(paidAt, 30)) continue;

    const day = fmtIST(paidAt, "date");

    const paymentView = {
      id: e.event_id,

      display: {
        title:
          e.account?.identifier ||
          e.account?.display_name ||
          e.provider,
        subtitle: e.account?.type || "Payment",
        display_name:
          e.account?.display_name ||
          e.account?.identifier ||
          e.provider,
      },

      amount: {
        value: Number(e.amount?.value || 0),
        currency: "INR",
        confidence: e.amount?.confidence || null,
      },

      status: {
        payment_status: e.status?.payment_status || "PAID",
        urgency: "normal",
        priority_rank: 5,
      },

      dates: {
        paid_at: day,
        email_received_at: fmtIST(e.dates?.email_at),
      },

      account: {
        type: e.account?.type || null,
        identifier: e.account?.identifier || null,
        display_name: e.account?.display_name || null,
        ca_number: e.account?.ca_number || null,
      },

      provider: e.provider,

      classification: {
        class: e.classification?.class || "PAYMENT",
        confidence_level:
          e.classification?.confidence_level || null,
        reasons: e.classification?.reasons || [],
      },

      notification: {
        severity: e.notification?.severity || null,
        emoji: e.notification?.emoji || null,
        message: e.notification?.message || null,
      },

      email: {
        from: e.source?.email_from || null,
        email_id: e.source?.email_id || null,
      },

      source_refs: {
        event_id: e.event_id,
        extractor: e.source_id || e.provider,
      },

      timestamps: {
        extracted_at: fmtIST(e.source?.extracted_at),
      },
    };

    paymentsByDay[day] ||= [];
    paymentsByDay[day].push(paymentView);
    totalOutflow += paymentView.amount.value;
  }

  // sort payments per day (New → Old)
  Object.values(paymentsByDay).forEach(arr =>
    arr.sort(
      (a, b) =>
        new Date(b.timestamps.extracted_at) -
        new Date(a.timestamps.extracted_at)
    )
  );

  /* =========================
     FINAL VIEW JSON
  ========================= */
  return new Response(
    JSON.stringify(
      {
        meta,
        sections: {
          cards: cardsByStatus,
          payments: { by_day: paymentsByDay },
        },
        stats: {
          cards: {
            overdue: cardsByStatus.overdue.length,
            due: cardsByStatus.due.length,
            paid: cardsByStatus.paid.length,
          },
          payments: {
            total_outflow: totalOutflow,
          },
        },
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}
