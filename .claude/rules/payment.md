---
paths:
  - "payment-service/**"
  - "apps/web/**/billing/**"
  - "apps/web/**/plans/**"
---
# Payment service (WeBill 365 KHQR)

- Only WebBlock subscriptions. Never add payments for a business's own customers.
- Free trial: one per client for life (`client_trials` PK = user), 14 days, first deploy only, 3 generations, 30 products. Values are config/DB, not constants.
- Plans Plus / Pro / Ultra, `billing_interval = MONTH`, limits in `plans.limits` jsonb (websites, redeploys, products, monitoring, logs).
- Price is read from `plan_prices` with the latest `effective_from <= now()`. A subscription keeps its `price_usd` until renewal.
- Checkout: create bill (PENDING, `expires_at`) → show KHQR from `khqr_data` → poll / receive WeBill status → on PAID: save transaction, activate subscription, email invoice, emit `SubscriptionActivated`. QR timeout → bill `EXPIRED` (not FAILED); user creates a new bill.
- Every WeBill result is stored in `payment_events` with a unique `event_key`; handle each once.
- Money: `BigDecimal` + `currency_code`. Show Phnom Penh time.
- Admin price/limit change: confirmation step + row in `plan_changes` (old/new value, admin Keycloak ID).
- No refunds. No auto-charge: the user pays each month; send the due reminder (mobile + email).
