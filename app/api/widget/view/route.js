{
  "meta": {
    "generated_at": "28 Jan 2026, 03:45 pm",
    "timezone": "Asia/Kolkata"
  },

  "cards": {
    "overdue": [
      {
        "card_id": "ICICI_CC_7003_202512",
        "status": "OVERDUE",

        "display": "ICICI CC 7003 Dec'25",

        "account": {
          "provider": "ICICI",
          "last4": "7003",
          "statement_month": "Dec'25"
        },

        "amount": {
          "due": 6214.72,
          "currency": "INR"
        },

        "dates": {
          "due_date": "15 Jan 2026",
          "paid_at": null,
          "email_received_at": "29 Dec 2025, 09:02 am",
          "extracted_at": "28 Jan 2026, 12:13 pm",
          "updated_at": "28 Jan 2026, 11:00 am"
        },

        "days_left": -13,

        "payment": {
          "paid": false,
          "method": "Paytm"
        },

        "source": {
          "email_from": "credit_cards@icicibank.com",
          "email_id": "19b682a1059bbac3"
        },

        "linkage": {
          "last_statement_event_id": "ICICI_CC_7003_202512"
        }
      }
    ],

    "due": [
      {
        "card_id": "AXIS_CC_XX22_202601",
        "status": "DUE",

        "display": "AXIS CC XX22 Jan'26",

        "account": {
          "provider": "AXIS",
          "last4": "XX22",
          "statement_month": "Jan'26"
        },

        "amount": {
          "due": 11050,
          "currency": "INR"
        },

        "dates": {
          "due_date": "10 Feb 2026",
          "paid_at": null,
          "email_received_at": "12 Jan 2026, 06:53 pm",
          "extracted_at": "28 Jan 2026, 10:59 am",
          "updated_at": "28 Jan 2026, 11:00 am"
        },

        "days_left": 13,

        "payment": {
          "paid": false,
          "method": null
        },

        "source": {
          "email_from": "cc.statements@axisbank.com",
          "email_id": "19a783cc50e2c873"
        },

        "linkage": {
          "last_statement_event_id": "AXIS_CC_XX22_202601"
        }
      }
    ],

    "paid": [
      {
        "card_id": "ICICI_CC_7000_202511",
        "status": "PAID",

        "display": "ICICI CC 7000 Nov'25",

        "account": {
          "provider": "ICICI",
          "last4": "7000",
          "statement_month": "Nov'25"
        },

        "amount": {
          "due": 0,
          "currency": "INR"
        },

        "dates": {
          "due_date": "20 Nov 2025",
          "paid_at": "26 Jan 2026",
          "email_received_at": "04 Nov 2025, 12:44 pm",
          "extracted_at": "26 Jan 2026, 05:44 pm",
          "updated_at": "26 Jan 2026, 05:45 pm"
        },

        "days_left": null,

        "payment": {
          "paid": true,
          "method": "UPI"
        },

        "source": {
          "email_from": "credit_cards@icicibank.com",
          "email_id": "19b682a1059bbac4"
        },

        "linkage": {
          "last_statement_event_id": "ICICI_CC_7000_202511"
        }
      }
    ]
  },

  "payments": {
    "by_day": {
      "28 Jan 2026": [
        {
          "payment_id": "event:1769570615792:TRADINGVIEW_pay",

          "display": "TradingView Premium",

          "provider": "TRADINGVIEW",

          "amount": {
            "value": 20364.91,
            "currency": "INR"
          },

          "dates": {
            "paid_at": "28 Jan 2026",
            "email_received_at": null,
            "extracted_at": "28 Jan 2026, 02:23 pm"
          },

          "account": {
            "type": "DIGITAL_SERVICE",
            "identifier": "TradingView",
            "customer_number": null
          },

          "source": {
            "email_from": null,
            "email_id": null
          }
        }
      ],

      "07 Jan 2026": [
        {
          "payment_id": "event:1769447093440:PAYTM",

          "display": "Delhi Jal Board",

          "provider": "PAYTM",

          "amount": {
            "value": 594,
            "currency": "INR"
          },

          "dates": {
            "paid_at": "07 Jan 2026",
            "email_received_at": null,
            "extracted_at": "07 Jan 2026, 09:02 am"
          },

          "account": {
            "type": "UTILITY",
            "identifier": "Delhi Jal Board",
            "customer_number": null
          },

          "source": {
            "email_from": null,
            "email_id": null
          }
        }
      ]
    }
  }
}
