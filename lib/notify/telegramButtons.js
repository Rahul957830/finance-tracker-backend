export function initialButtons(billId) {
  return {
    inline_keyboard: [
      [{ text: "✅ Mark as paid", callback_data: `MARK_PAID|${billId}` }],
      [{ text: "✖️ Dismiss", callback_data: `DISMISS|${billId}` }],
    ],
  };
}

export function paymentMetaButtons(billId) {
  return {
    inline_keyboard: [
      [
        { text: "📅 Set payment date", callback_data: `SET_PAYMENT_DATE|${billId}` },
      ],
      [
        { text: "GPay", callback_data: `SET_PAYMENT_METHOD|GPAY|${billId}` },
        { text: "Paytm", callback_data: `SET_PAYMENT_METHOD|PAYTM|${billId}` },
      ],
      [
        { text: "CRED", callback_data: `SET_PAYMENT_METHOD|CRED|${billId}` },
        { text: "NetBanking", callback_data: `SET_PAYMENT_METHOD|NETBANKING|${billId}` },
      ],
      [
        { text: "✅ Confirm payment", callback_data: `CONFIRM_PAYMENT|${billId}` },
      ],
      [{ text: "✖️ Dismiss", callback_data: `DISMISS|${billId}` }],
    ],
  };
}
