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
  status,      // OPEN | DUE | OVERDUE | PAID
  days_left,
  was_status_changed,
}) {
  // 🔴 OVERDUE — always
  if (status === "OVERDUE") {
    return {
      notify: true,
      priority: "HIGH",
      repeat: "DAILY_UNTIL_PAID",
      reason: "CARD_OVERDUE",
    };
  }

  // 🟡 DUE SOON
  if (status === "DUE" && days_left !== null && days_left <= 2) {
    return {
      notify: true,
      priority: "HIGH",
      repeat: "DAILY_UNTIL_PAID",
      reason: "CARD_DUE_SOON",
    };
  }

  // 🟡 OPEN / DUE (normal reminder)
  if (status === "OPEN" || status === "DUE") {
    return {
      notify: true,
      priority: "NORMAL",
      repeat: "DAILY_UNTIL_PAID",
      reason: "CARD_OPEN",
    };
  }

  // 🟢 PAID — once only
  if (status === "PAID" && was_status_changed) {
    return {
      notify: true,
      priority: "INFO",
      repeat: "NONE",
      reason: "CARD_PAID",
    };
  }

  return { notify: false };
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
