---
name: khqr-checkout
description: Implement or debug the WebBlock subscription checkout with WeBill 365 KHQR — bill creation, QR display, status polling, expiry, activation, invoice email. Use for payment-service billing or the web payment page.
---
# KHQR subscription checkout

Flow (workflow "Payment Service – Subscription Plan"):
1. User picks a plan → confirm dialog → **Review order** (plan, price, billing period).
2. payment-service creates `payment_bills` row: `PENDING`, `amount` from current `plan_prices`, `expires_at`, `idempotency`/`event_key`; calls WeBill create-bill → stores `bill_no`, `account_no`, `khqr_data`.
3. Web shows the QR from `khqr_data` + countdown to `expires_at`, in one card with the summary.
4. Status: poll WeBill (update `last_status_check_at`) and/or accept callbacks. Every result → `payment_payment_events` (unique `event_key`), processed once.
5. **Is payment successful?**
   - Yes → `payment_transactions` row, bill `PAID` + `paid_at`, subscription `ACTIVE` (start/end, deploys left), save billing history, email invoice, emit `SubscriptionActivated` (admin web notification). If started from a deploy → continue to AI generation.
   - No / expired → bill `EXPIRED` (QR timeout) or `FAILED`; show error; user can "Generate new QR" (new bill) or cancel back.
6. Plan change mid-period: remaining days carry over ("Days Remaining + Extra Days").

Rules: `BigDecimal` money + currency code; never log `khqr_data` or sender account numbers; payment term unit is an open question — read it from config.
Tests: WireMock WeBill for PAID, EXPIRED, duplicate callback, out-of-order status.
