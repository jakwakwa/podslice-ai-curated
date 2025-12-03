## Paddle Webhook Processing

This service ingests signed webhooks from Paddle (`app/api/paddle-webhook/route.ts`) and hands the payload to `ProcessWebhook`. Critical flows for `subscription.updated` and `payment.failed` were hardened to avoid missing lifecycle changes.

### Event Flow

1. **Signature verification**  
   Incoming requests must include the `paddle-signature` header. Invalid or missing signatures are rejected with `400/500` responses before the body is parsed.

2. **Parsing and validation**  
   The processor validates every event with Zod. Subscription and transaction payloads are normalized (IDs, status values, billing periods) before any persistence occurs. Invalid shapes are logged via `logWebhookSnapshot` and short‑circuited to keep retries cheap.

3. **Idempotent persistence**  
   - Subscriptions are resolved deterministically by `paddle_subscription_id`, falling back to a user scoping scan when necessary.  
   - Updates rely on `prisma.subscription.upsert`, ensuring repeated events only mutate the existing row.  
   - Payment failures always update the subscription’s status to `past_due` and emit a user notification even when the record is already delinquent (to capture individual attempts and retry windows).

4. **Retry + resilience**  
   All Prisma reads/writes funnel through `executeWithRetry`. Transient network/connection errors (P1001/P1002/etc. or socket resets) are retried with exponential backoff before the webhook is allowed to fail and be re‑delivered by Paddle.

5. **Notifications**  
   `createSubscriptionNotifications` centralizes outbound in‑app notifications. The helper:
   - Detects plan upgrades/downgrades, cancellations, renewals.
   - Builds rich payment failure messages that include currency, reason codes, and the next retry timestamp when available.
   - Ensures only one notification is emitted per trigger branch to avoid spam.

6. **Cleanup**  
   When Paddle cancels a subscription the processor:
   - Purges `user_episode` records and associated GCS blobs.
   - Leaves clear logs when external deletions fail so the subscription state still converges.

### Testing

Run the focused suite whenever webhook logic changes:

```bash
bun test tests/paddle/process-webhook.test.ts
```

The tests cover:

- Subscription ID validation & deterministic resolution.
- Regression coverage for the new payment failure paths (status updates, notification payloads, repeat failures).
- Logging toggles.

### Operational Notes

- Adjust `PADDLE_WEBHOOK_MAX_RETRIES` to relax/tighten retry behavior (defaults to 3 attempts).  
- `logWebhookSnapshot` intentionally stays quiet in production; tail the server logs in non‑prod to inspect parsed payloads and retry metadata.  
- When investigating payment issues, grab the latest rows from `notification` for the affected `user_id`; the message contains the raw failure reason emitted by Paddle along with the formatted amount and retry ETA.