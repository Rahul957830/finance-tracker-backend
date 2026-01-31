/**
 * Notification Rule Engine
 * ------------------------
 * Pure decision logic.
 * NO side effects.
 * NO network calls.
 * NO storage.
 *
 * Input  -> current state / event
 * Output -> should notify + why
 */

/* ================================
   CREDIT CARD RULES
================================ */

/**
 * Decide notification for a credit card bill
 */
export function evaluateNotificationRules({
  bill_id,
  provider,
  statement_month,
  status,          // OPEN | DUE | OVERDUE | PAID
  days_left,       // number
  is_new_statement,
  was_status_changed,
}) {

  // 🔴 OVERDUE — always notify
  if (status === "OVERDUE") {
    return {
      notify: true,
      priority: "HIGH",
      repeat: "DAILY_UNTIL_PAID",
      reason: "CARD_OVERDUE",
    };
  }

  // 🟡 DUE / OPEN — always notify
  if (status === "DUE" || status === "OPEN") {
    return {
      notify: true,
      priority: days_left !== null && days_left <= 2 ? "HIGH" : "NORMAL",
      repeat: "DAILY_UNTIL_PAID",
      reason: days_left !== null && days_left <= 2
        ? "CARD_DUE_SOON"
        : "CARD_DUE",
    };
  }

  // 🟢 PAID — notify only once on transition
  if (status === "PAID" && was_status_changed) {
    return {
      notify: true,
      priority: "INFO",
      repeat: "DAILY_UNTIL_MONTH_END",
      reason: "CARD_PAID",
    };
  }

  // ❌ Otherwise, no notification intent
  return {
    notify: false,
  };
}

/* ================================
   DAILY SUMMARY RULES
================================ */

/**
 * Decide whether daily summary should be sent
 */
export function shouldSendDailySummary({ hour }) {
  // Cron will decide time; rule just confirms intent
  return {
    notify: true,
    priority: "NORMAL",
    reason: "DAILY_SUMMARY",
  };
}
