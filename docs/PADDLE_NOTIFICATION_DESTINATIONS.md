# Paddle Notification Destinations

This document describes the implementation of Paddle notification destination management in the application.

## Overview

Notification destinations allow administrators to configure webhook endpoints or email addresses to receive Paddle events. This is essential for keeping the application in sync with Paddle subscription and transaction events.

## Features

- **List Event Types**: View all available Paddle event types with descriptions
- **Create Destinations**: Set up webhook endpoints or email addresses to receive notifications
- **Update Destinations**: Modify existing notification settings
- **Delete Destinations**: Remove notification destinations
- **Secure Secret Handling**: Endpoint secret keys are displayed only once after creation

## Implementation

### Backend (Admin API)

#### Wrapper Functions (`lib/paddle-server/paddle.ts`)

- `listEventTypes()` - Fetch all available Paddle event types
- `listNotificationSettings()` - Get all configured notification destinations
- `createNotificationSetting(body)` - Create a new notification destination
- `updateNotificationSetting(id, body)` - Update an existing destination
- `deleteNotificationSetting(id)` - Delete a notification destination

#### API Routes (Admin-only)

All routes require admin authentication via `requireAdminMiddleware()`.

**GET `/api/admin/paddle/event-types`**
- Returns list of all available Paddle event types
- Used to populate the event selection in the UI

**GET `/api/admin/paddle/notification-settings`**
- Returns list of all configured notification destinations
- Includes subscribed events and configuration details

**POST `/api/admin/paddle/notification-settings`**
- Creates a new notification destination
- Returns the created destination with `endpoint_secret_key` (displayed once)
- Validates:
  - Description (required)
  - Type: `url` or `email`
  - Destination: valid URL or email address
  - API version (default: 1)
  - Traffic source: `all`, `platform`, or `simulation`
  - Subscribed events (minimum 1 required)

**PATCH `/api/admin/paddle/notification-settings/[id]`**
- Updates an existing notification destination
- Allows updating: description, destination, traffic_source, subscribed_events, active status

**DELETE `/api/admin/paddle/notification-settings/[id]`**
- Permanently deletes a notification destination
- Returns 204 No Content on success

### Frontend (Admin UI)

#### Page: `/admin/paddle-notifications`

The admin page uses the standard pattern:
- Thin page wrapper with Suspense boundary
- Server component for data fetching and admin verification
- Client component for interactive UI

#### Components

**`PaddleNotificationsPanel.server.tsx`**
- Verifies admin access via Prisma user query
- Fetches event types and existing notification settings
- Passes data to client component

**`PaddleNotificationsPanel.client.tsx`**
- Create dialog with form for new destinations
- Edit dialog for updating existing destinations
- Secret key dialog (shown once after creation)
- List view of all configured destinations
- Event selection with grouped checkboxes
- Delete confirmation

#### UI Features

- **Grouped Events**: Events are organized by group (Transaction, Subscription, etc.)
- **Form Validation**: Client-side validation before submission
- **Secret Display**: One-time display of endpoint secret key with copy button
- **Active Status**: Visual badges for active/inactive destinations
- **Traffic Source**: Configuration for all events, platform only, or simulations only

## Security

- All API routes are protected with `requireAdminMiddleware()`
- Endpoint secret keys are never logged
- Secrets are only returned once after creation
- No secrets are stored in the application database
- API key validation via `ensurePaddleApiKey()`

## Environment Variables

Required:
- `PADDLE_API_KEY` - Paddle API key for authentication

Optional:
- `PADDLE_API_VERSION` - API version header (if specified)
- `NEXT_PUBLIC_PADDLE_ENV` - Environment (sandbox or production)

For webhook verification:
- `PADDLE_NOTIFICATION_WEBHOOK_SECRET` - Set this to the endpoint secret key returned when creating a destination

## Testing

Unit tests are located in `tests/paddle-notification-settings.test.ts`:
- Zod schema validation tests (create and update)
- Edge cases and error conditions
- Wrapper function structure verification

Run tests:
```bash
bun test tests/paddle-notification-settings.test.ts
```

## Usage

1. Navigate to `/admin/paddle-notifications` (admin access required)
2. Click "Create Notification Destination"
3. Fill in the form:
   - Description (e.g., "Production Webhook")
   - Type (URL or Email)
   - Destination (webhook URL or email address)
   - Traffic source (all, platform, or simulation)
   - Select events to subscribe to
4. Save the endpoint secret key when displayed
5. Set `PADDLE_NOTIFICATION_WEBHOOK_SECRET` in your environment

## Integration with Existing Webhook Handler

The existing webhook handler at `app/api/paddle-webhook/route.ts` uses the endpoint secret key to verify incoming webhooks:

```typescript
const privateKey = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET || ""
const eventData = await paddle.webhooks.unmarshal(rawRequestBody, privateKey, signature)
```

Make sure to update this environment variable with the secret key from your notification destination.

## Paddle Documentation

For more information about Paddle notification destinations:
https://developer.paddle.com/webhooks/overview

