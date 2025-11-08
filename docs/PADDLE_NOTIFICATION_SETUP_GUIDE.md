# Paddle Notification Setup Guide

Quick guide for setting up Paddle notification destinations in your application.

## Prerequisites

- Admin access to the application
- Valid Paddle API key configured (`PADDLE_API_KEY`)
- Webhook endpoint ready to receive notifications (or email address)

## Step-by-Step Setup

### 1. Access the Admin Panel

Navigate to: `/admin/paddle-notifications`

You must be logged in as an admin user (user record with `is_admin = true` in the database).

### 2. Create a Notification Destination

Click **"Create Notification Destination"** button.

Fill in the form:

**Description**: Give it a meaningful name (e.g., "Production Webhook" or "Dev Environment")

**Type**: Choose one:
- **URL** - For webhook endpoints
- **Email** - For email notifications

**Destination**:
- If URL: Enter your webhook endpoint (e.g., `https://your-app.com/api/paddle-webhook`)
- If Email: Enter the email address (e.g., `admin@your-domain.com`)

**API Version**: Leave as `1` (default)

**Traffic Source**: Choose one:
- **All** - Receive both real platform events and simulation events
- **Platform** - Only real platform events (recommended for production)
- **Simulation** - Only simulation events (useful for testing)

**Subscribed Events**: Select the events you want to receive. Common choices:
- `subscription.created`
- `subscription.updated`
- `subscription.activated`
- `subscription.canceled`
- `subscription.past_due`
- `transaction.billed`
- `transaction.completed`
- `transaction.payment_failed`

### 3. Save the Endpoint Secret Key

After clicking **"Create Destination"**, a dialog will appear with your **Endpoint Secret Key**.

⚠️ **IMPORTANT**: This key is shown only once. Copy it immediately!

Click the copy button and save it securely.

### 4. Configure Your Application

Add the endpoint secret key to your environment variables:

```bash
PADDLE_NOTIFICATION_WEBHOOK_SECRET=your_secret_key_here
```

For Vercel deployments:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add `PADDLE_NOTIFICATION_WEBHOOK_SECRET` with the secret value
4. Redeploy your application

### 5. Verify Setup

Your webhook endpoint at `/api/paddle-webhook` will now:
1. Receive notifications from Paddle
2. Verify the signature using the secret key
3. Process the events automatically

## Managing Existing Destinations

### Edit a Destination

Click the **Edit** button (pencil icon) next to any destination to:
- Update the description
- Change the destination URL/email
- Modify traffic source
- Add or remove subscribed events

Note: You cannot change the type (URL/email) of an existing destination. Delete and recreate if needed.

### Delete a Destination

Click the **Delete** button (trash icon) next to any destination.

⚠️ This action is permanent and cannot be undone. Paddle will stop sending notifications to this destination immediately.

## Best Practices

### Production Setup

1. **Use separate destinations for production and development**
   - Production: Use `traffic_source: platform` only
   - Development: Use `traffic_source: simulation` for testing

2. **Subscribe to essential events only**
   - Too many events can overwhelm your system
   - Start with subscription and transaction events

3. **Keep webhook endpoints secure**
   - Always verify signatures using the endpoint secret
   - Use HTTPS for all webhook endpoints
   - Never expose your secret key in logs or client-side code

### Testing

1. Create a test destination with `traffic_source: simulation`
2. Use Paddle's simulation tools to test event handling
3. Verify your webhook handler processes events correctly
4. Once tested, create a production destination

## Troubleshooting

### "Failed to load Paddle notification settings"

- Check that `PADDLE_API_KEY` is set correctly
- Verify the API key has the correct permissions
- Check the Paddle environment (`NEXT_PUBLIC_PADDLE_ENV`)

### Webhooks not being received

1. Verify the destination is marked as **Active** in the UI
2. Check that the destination URL is publicly accessible
3. Verify SSL certificate is valid (Paddle requires HTTPS)
4. Check Paddle dashboard webhook logs for delivery attempts

### Signature verification failing

- Ensure `PADDLE_NOTIFICATION_WEBHOOK_SECRET` matches the secret from the destination
- Verify you're using the raw request body for verification
- Check that the webhook handler hasn't modified the request body

## Multiple Destinations

You can create up to **10 active destinations** at once. Use this to:
- Send notifications to multiple systems
- Set up redundant webhook endpoints
- Separate notifications by event type
- Configure different destinations for different environments

## Security Notes

- Endpoint secrets are never stored in the application database
- Secrets are only displayed once after creation
- All API endpoints require admin authentication
- Webhook verification uses the secret to ensure events come from Paddle

## Support

For Paddle-specific questions, refer to:
- [Paddle Webhooks Documentation](https://developer.paddle.com/webhooks/overview)
- [Notification Settings API](https://developer.paddle.com/api-reference/notifications/create-notification-setting)

For application-specific issues, check:
- Application logs at `/api/paddle-webhook`
- Admin panel for destination status
- Paddle dashboard webhook logs

