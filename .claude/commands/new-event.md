---
description: Start adding a RabbitMQ event (runs the add-rabbit-event skill)
argument-hint: "[sender.event_name.v1  consumed by  service,service]"
---
Run the `add-rabbit-event` skill for: **$ARGUMENTS**.
First restate in two lines: what happened, who sends, who listens, and why an event (not a gRPC question) is right. Check `contracts/CATALOG.md` in case it exists.
Contract and catalog row first; then the sender with outbox; then each consumer with inbox. One service per step, test output after each. Ask me if the service has no outbox yet (then offer `adopt-outbox-inbox`).
