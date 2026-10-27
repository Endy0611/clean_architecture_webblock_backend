---
name: adopt-outbox-inbox
description: Add the transactional outbox (sender) and inbox (consumer) tables and the publisher/consumer wiring to one WebBlock service so RabbitMQ events are never lost and never handled twice. Use once per service, starting with payment-service, before adding more events.
argument-hint: "[service]"
---
# Adopt outbox + inbox in: $ARGUMENTS

Read first: `.claude/rules/rabbitmq-events.md` (section "Never lose an event, never act twice"), `database.md`, `contracts/CATALOG.md`.
One service per run. Today no service has these tables; `payment-service` publishes directly after commit and consumes without a dedupe table.

## 1. Look at what exists (evidence)
```bash
grep -rn "RabbitTemplate\|@RabbitListener\|TopicExchange" services/$ARGUMENTS/src/main --include=*.java
ls services/$ARGUMENTS/src/main/resources/db/migration
```
List each place that publishes or consumes. Decide the stable dedupe key for each consumed event (`message_id` or the event's own `event_key`).

## 2. Migration (a NEW file, never edit an applied one)
`V<yyyyMMddHHmm>__create_outbox_inbox.sql`, in this service's own database:
```sql
CREATE TABLE <prefix>_outbox (
  id            uuid PRIMARY KEY,
  message_id    uuid        NOT NULL UNIQUE,
  message_type  text        NOT NULL,
  routing_key   text        NOT NULL,
  payload       jsonb       NOT NULL,
  occurred_at   timestamptz NOT NULL,
  sent_at       timestamptz,
  attempts      integer     NOT NULL DEFAULT 0
);
CREATE INDEX <prefix>_outbox_unsent ON <prefix>_outbox (occurred_at) WHERE sent_at IS NULL;
CREATE TABLE <prefix>_inbox (
  dedupe_key    text        PRIMARY KEY,
  message_type  text        NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now()
);
```
Table prefix follows the service (`payment_`, `project_`, `account_`, `provisioning_`) per `data-dictionary.md`. If the dictionary does not list these tables,
say so and note it as an open question (add to `docs/specs/open-questions.md`), do not silently invent more.

## 3. Code (Java layout)
- `domain/<feature>/event/` event records · `infrastructure/persistence/.../OutboxRepository`, `InboxRepository`
- `infrastructure/messaging/OutboxPublisher` (scheduled; batch of unsent rows; publisher confirms; mark sent; increment attempts; backoff)
- Handlers that used to call the publisher now **insert an outbox row in the same transaction**.
- Listeners call a handler that **inserts the inbox row first (unique key)** and returns quietly if it already exists; ack after commit.
- Exchange/queue names follow `rabbitmq-events.md`; keep the old names working until consumers/senders move together (say how in your answer).

## 4. Tests (must fail before, pass after)
- sender: business change + outbox row commit/rollback together
- publisher: unsent row is published once; broker down -> row stays unsent, `attempts` grows; no duplicate `sent_at` update race
- consumer: same message twice -> work once; works after restart
Run `./gradlew test` for the service and show the output.

## 5. Report
Migration name · which publishers/listeners were changed · compatibility with the old exchange/queue names · remaining work (cleanup job for old rows, other services).
