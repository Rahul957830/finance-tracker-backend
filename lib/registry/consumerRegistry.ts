// lib/registry/consumerRegistry.ts

/**
 * CONSUMER REGISTRY
 * -----------------
 * Purpose:
 * - Map technical identifiers → human-readable consumer names / nicknames
 * - Used ONLY for enrichment (never extraction, never UI guessing)
 *
 * Rules:
 * - Keys must be deterministic identifiers (last4, CA number, account number)
 * - Values are human-readable names shown in widget / KV / JSON
 * - If a key is missing → return null (do NOT guess)
 */

export const CONSUMER_REGISTRY = {
  CREDIT_CARD: {
    // last4 → card nickname
    "7003": "Amazon Pay",
    "7000": "Coral RuPay",
    "5006": "MakeMyTrip Platinum",
    "XX35": "SimplySAVE",
    "XX22": "Flipkart Visa",
  },

  PAYMENT_ACCOUNT: {
    // customer / CA numbers → service name
    "CA987654": "Airtel Broadband",
    "CA112233": "Tata Power Electricity",
    "CA556677": "Jio Fiber",
  },

  BANK_ACCOUNT: {
    // account identifiers → account nickname
    "1234567890": "ICICI Savings Account",
    "9988776655": "HDFC Salary Account",
  },

  UPI: {
    // UPI IDs → nickname
    "sonu@upi": "Personal UPI",
    "sonu.pay@okicici": "ICICI UPI",
  },
};
