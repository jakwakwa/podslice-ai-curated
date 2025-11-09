# Paddle Notifications

This document describes the Paddle billing notification system integrated into the notification bell.

## Overview

The notification bell now displays real-time notifications related to subscription and payment events from Paddle. These notifications are automatically created when Paddle webhooks are received.

## Supported Notification Types

### Subscription Events

| Type | Icon | Color | When Triggered |
|------|------|-------|----------------|
| `subscription_activated` | ✅ CheckCircle | Green | When a new subscription is activated |
| `subscription_renewed` | ✅ CheckCircle | Green | When a past_due subscription becomes active again |
| `subscription_cancelled` | ❌ XCircle | Red | When a subscription is cancelled |
| `subscription_ending` | ⚠️ AlertTriangle | Amber | When subscription is set to cancel at period end |
| `subscription_upgraded` | 📈 TrendingUp | Blue | When user upgrades to a higher plan |
| `subscription_downgraded` | 📉 TrendingDown | Gray | When user downgrades to a lower plan |

### Payment Events

| Type | Icon | Color | When Triggered |
|------|------|-------|----------------|
| `payment_successful` | 💳 CreditCard | Green | When a recurring payment is successful (not initial) |
| `payment_failed` | 💳 CreditCard | Red | When a payment transaction fails |

### Content Events (Existing)

| Type | Icon | Color | When Triggered |
|------|------|-------|----------------|
| `episode_ready` | 🎙️ Podcast | Green | When a new episode is generated |
| `weekly_reminder` | 📅 Calendar | Amber | Weekly podcast digest reminder |

## Implementation Details

### Webhook Processing

Paddle notifications are created in `utils/paddle/process-webhook.ts`:

- **SubscriptionCreated/Updated**: Detects status changes, plan changes, and cancellations
- **TransactionCompleted**: Creates notifications for successful recurring payments
- **TransactionPaymentFailed**: Notifies users of payment failures

### Notification Creation Logic

The system intelligently creates notifications only for meaningful events:

- New subscriptions trigger `subscription_activated`
- Status changes from `past_due` to `active` trigger `subscription_renewed`
- Transitions to `canceled` status trigger `subscription_cancelled`
- Plan changes trigger `subscription_upgraded` or `subscription_downgraded`
- Scheduled cancellations trigger `subscription_ending`
- Recurring payment success (not first payment) triggers `payment_successful`

### UI Components

The notification bell (`components/ui/notification-bell.tsx`) handles display:

- Custom icons for each notification type using Lucide React icons
- Color-coded by severity/type
- Real-time polling (30-second intervals)
- Mark as read/unread functionality
- Delete individual or clear all notifications

## Testing

### Using the Test Endpoint

You can test different notification types using the test endpoint:

```bash
# Test a subscription activation notification
curl -X POST "http://localhost:3000/api/notifications/test?type=subscription_activated" \
  -H "Cookie: your-session-cookie"

# Test a payment failed notification
curl -X POST "http://localhost:3000/api/notifications/test?type=payment_failed" \
  -H "Cookie: your-session-cookie"

# Test other types
curl -X POST "http://localhost:3000/api/notifications/test?type=subscription_upgraded"
curl -X POST "http://localhost:3000/api/notifications/test?type=payment_successful"
curl -X POST "http://localhost:3000/api/notifications/test?type=subscription_cancelled"
```

### Available Test Types

- `episode_ready`
- `weekly_reminder`
- `subscription_activated`
- `subscription_renewed`
- `subscription_cancelled`
- `subscription_ending`
- `payment_failed`
- `payment_successful`
- `subscription_upgraded`
- `subscription_downgraded`

### Manual Database Testing

You can also create test notifications directly in your database:

```sql
INSERT INTO notification (notification_id, user_id, type, message, is_read, created_at)
VALUES (
  gen_random_uuid(),
  'your-user-id',
  'subscription_activated',
  'Your Power Listener subscription is now active!',
  false,
  NOW()
);
```

## User Experience

### Notification Display

1. **Unread Badge**: Shows count of unread notifications with pulse animation
2. **Dropdown Panel**: 
   - Displays up to 10 most recent notifications
   - Shows relative time (e.g., "2 minutes ago")
   - Visual indicators for unread items (blue dot)
   - Action buttons for mark as read and delete
3. **Bulk Actions**:
   - "Mark all" - marks all notifications as read
   - "Clear all" - deletes all notifications

### Notification Behavior

- Notifications persist until manually cleared
- New notifications appear within 30 seconds (polling interval)
- Opening the dropdown forces an immediate fetch
- Notifications are user-specific (linked to `user_id`)

## Database Schema

Notifications are stored in the `notification` table:

```prisma
model Notification {
  notification_id String   @id @default(uuid())
  user_id         String
  type            String
  message         String
  is_read         Boolean  @default(false)
  created_at      DateTime @default(now())
  user            User     @relation(fields: [user_id], references: [user_id], onDelete: Cascade)

  @@map("notification")
}
```

## Future Enhancements

Potential improvements:

1. **Trial Expiry Warnings**: Notify users 3 days before trial ends
2. **Usage Limits**: Notify when approaching plan limits
3. **Email Integration**: Send email for critical notifications (payment failures)
4. **Notification Preferences**: Allow users to customize which notifications they receive
5. **Deep Links**: Add links to relevant pages (e.g., payment settings for failed payments)
6. **Notification History**: Archive old notifications instead of deleting

## Troubleshooting

### Notifications Not Appearing

1. Check Paddle webhook configuration
2. Verify `PADDLE_NOTIFICATION_WEBHOOK_SECRET` is set correctly
3. Check webhook logs at `/api/paddle-webhook`
4. Ensure user has correct `paddle_customer_id` mapped

### Duplicate Notifications

- The webhook processor checks for status changes before creating notifications
- Only meaningful state transitions create notifications
- Recurring payments only notify after the first payment

### Polling Issues

- Check browser console for authentication errors
- Verify notification store is not paused (`pausedUntilSubmission`)
- Check network tab for API call failures

