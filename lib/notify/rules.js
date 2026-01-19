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
export function  evaluateNotificationRules({
  bill_id,
  provider,
  statement_month,
  status,          // OPEN | OVERDUE | PAID
  days_left,       // number
  is_new_statement,
  was_status_changed,
}) {
  // 🔴 HIGH PRIORITY — repeat daily until paid
  if (status === "OVERDUE") {
    return {
      notify: true,
      priority: "HIGH",
      repeat: "DAILY_UNTIL_PAID",
      reason: "CARD_OVERDUE",
    };
  }

  if (status === "OPEN" && days_left <= 2) {
    return {
      notify: true,
      priority: "HIGH",
      repeat: "DAILY_UNTIL_PAID",
      reason: "CARD_DUE_SOON",
    };
  }

  // 🟡 NORMAL — repeat daily until paid
  if (is_new_statement || was_status_changed) {
    return {
      notify: true,
      priority: "NORMAL",
      repeat: "DAILY_UNTIL_PAID",
      reason: "NEW_STATEMENT_OR_OPEN",
    };
  }

  // 🟢 INFORMATIONAL — one-time
  if (status === "PAID" && was_status_changed) {
    return {
      notify: true,
      priority: "INFO",
      repeat: "ONCE",
      reason: "CARD_PAID",
    };
  }

  return {
    notify: false,
  };
}

/* ================================
   NON-CARD PAYMENT RULES
================================ */

/**
 * Decide notification for non-card payments
 * (TradingView, Netflix, Paytm, etc.)
 */
export function evaluateNonCardPayment({
  provider,
  amount,
  paid_at,
  event_id,
}) {
  return {
    notify: true,
    priority: "NORMAL",
    repeat: "ONCE",
    reason: "NON_CARD_PAYMENT",
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
