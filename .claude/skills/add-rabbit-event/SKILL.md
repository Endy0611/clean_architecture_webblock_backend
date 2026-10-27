---
name: add-rabbit-event
description: Publish a new RabbitMQ event from one WebBlock service and consume it in others, with the contract schema, transactional outbox on the sender, inbox/idempotency on each consumer, dead-letter queue, and tests. Use when something happened that other services must react to.
argument-hint: "[<sender>.<event_name>.v1  consumed by  <service,service>]"
---
# Add an event: $ARGUMENTS

Read first: `.claude/rules/rabbitmq-events.md`, `contracts.md`, `cross-service-change.md`, `contracts/CATALOG.md`.

## 0. Check it is an event
An event says "this happened". If the sender needs an answer, use `add-grpc-method`. If a consumer would have to reply, it is not an event.
Is the event already in the catalog (e.g. `project.source_published.v1`)? Then you are adding a CONSUMER, skip to step 3.

## 1. Contract first (sender's folder)
1. `contracts/events/<sender>/<event>.v1.schema.json` (copy a neighbour). `allOf` the envelope; `message_type` const = `<sender>.<event>.v1`.
2. Fields: IDs and small values only, `snake_case`. No personal data, no tokens. Retryable fact? add a stable `event_key`.
   Counters (`status_version`) only go up. Status values exactly as in `docs/specs/status-flows.md`.
3. Validate: `python -m json.tool <file>`. Add the row to `contracts/CATALOG.md` (sender, receivers, why).
4. Exchange `<sender>.events` (topic), routing key `<event>.v1`, one queue per consumer `<consumer>.<event>.v1` + `.dlq`.

## 2. Sender (transactional outbox)
1. A NEW migration in the sender's database (never edit an applied one): `outbox(id, message_id, message_type, payload jsonb, occurred_at,
   sent_at null, attempts)` if the service does not have it yet.
2. In the handler (`application/<feature>/handler`), in the SAME transaction as the business change: build the event record
   (`domain/<feature>/event`) and insert the outbox row. Never call RabbitMQ from inside the transaction.
3. `infrastructure/messaging/OutboxPublisher`: reads unsent rows, publishes with publisher confirms, waits for the OK, sets `sent_at`.
   Headers: `traceparent`, `x-request-id`. `infrastructure/messaging` also declares the exchange.
4. Test: rollback of the business change rolls back the outbox row; a crash after commit still publishes later (row stays unsent).

## 3. Consumer (each receiving service)
1. Declare the queue + binding + `.dlq` in the consumer's `infrastructure/messaging`. Quorum queue. Max 5 retries then DLQ.
2. `presentation/messaging/XListener` parses the message with a tolerant DTO (`ignoreUnknown`), then calls ONE handler. The DTO lives in
   `application/<feature>/request` (the handler needs it; application must not import presentation).
3. Handler, one transaction: check the `inbox` for the dedupe key (`message_id` or the event's stable key) -> if seen, return;
   else do the work and insert the inbox row. **Ack after commit.**
4. Drop events older than the stored counter (`status_version`). Check your own DB before acting; never trust the message alone.
5. Never call back synchronously in a way that makes a loop. Never put notification logic in the consumer unless this IS Notification.
6. Tests: same message twice -> once; older version -> skipped; poison message -> DLQ; unknown extra field -> ignored.

## 4. Local run note
Local RabbitMQ is not in this repo's compose yet. Say in your answer what the user must start. Do not claim an end-to-end run you did not do.

## 5. Report
Schema + CATALOG row · sender change + migration name · each consumer change · tests run and results · anything left for a later PR.
