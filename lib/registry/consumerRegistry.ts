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
    // Credit Cards (key = last4)
    "7003": "Amazon Pay",
    "7000": "Coral RuPay",
    "5006": "MakeMyTrip",
    "XX35": "SimplySAVE",
    "XX22": "Flipkart Visa",
  },

  PAYMENT_ACCOUNT: {
     // Non-card payments (key = CA / consumer number)
    "0799414345": "Home- Water",
    "060006388098": "Home- Electricity",
  },

};
