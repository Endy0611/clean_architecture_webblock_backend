---
name: add-notification-event
description: Add or change a WebBlock notification event (who gets it, which channels — web, mobile push, email — and the link target). Use when a service must notify owners or admins.
argument-hint: "[EventName]"
---
# Notification event: $ARGUMENTS

1. Check the channel matrix in `docs/specs/business-rules.md` (Notifications). If `$ARGUMENTS` is not there, ask the team which recipients/channels it needs.
2. Producer service emits a domain event `{ eventId, eventType, occurredAt, projectId?, userId?, payload }` with a unique `eventId` (idempotent).
3. notification-service:
   - maps eventType → recipients (owner / admins) → channels from config (not hard-coded `if`s);
   - web: store per-recipient notification with read/unread, unread count for the bell, "mark one / mark all as read";
   - mobile: push only if the owner has the app installed (device token exists); otherwise web/email only;
   - email: only for events marked email in the matrix; critical admin emails are sent even when not signed in.
   - each notification has a deep link (generation details, deploy logs, monitoring, subscription, user account).
4. Process each `eventId` once.
5. Tests: routing table test for the event, dedupe test, "app not installed" branch.
