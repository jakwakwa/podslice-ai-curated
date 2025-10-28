# Bundle Image Upload API

## Overview

This API endpoint allows admin users to upload images for bundles. Images are stored directly in the PostgreSQL database in the `bundle.image_data` field as binary data.

## Endpoint

```
POST /api/admin/upload-bundle-image
```

## Authentication

- Requires admin authentication via Clerk
- Uses `requireAdminMiddleware` to enforce admin-only access

## Request

### Content-Type
`multipart/form-data`

### Form Fields

|| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The image file to upload |
| `bundleId` | String | No | Optional bundle ID to associate with the image |

### File Requirements

- **Accepted formats**: JPEG, JPG, PNG, WebP, GIF
- **Maximum size**: 5 MB
- **Content-Type**: Must start with `image/`

## Response

### Success Response (200)

**For existing bundles:**
```json
{
  "success": true,
  "url": "/api/bundles/{bundleId}/image",
  "bundleId": "bundle-id-here",
  "message": "Image uploaded successfully"
}
```

**For new bundles (preview only):**
```json
{
  "success": true,
  "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "imageData": "base64-encoded-image-data",
  "imageType": "image/jpeg",
  "message": "Image prepared for upload"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "message": "No image file provided"
}
```
or
```json
{
  "message": "File must be an image"
}
```
or
```json
{
  "message": "Image file must be less than 5MB"
}
```

#### 401 Unauthorized
```
Unauthorized
```

#### 403 Forbidden
```json
{
  "message": "Admin access required"
}
```

#### 404 Not Found
```json
{
  "message": "Bundle not found"
}
```

#### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

## Usage Example

### JavaScript/TypeScript

```typescript
async function uploadBundleImage(file: File, bundleId?: string): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  if (bundleId) {
    formData.append("bundleId", bundleId);
  }

  const response = await fetch("/api/admin/upload-bundle-image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to upload image");
  }

  const result = await response.json();
  return result.url;
}
```

### cURL

```bash
curl -X POST \
  https://your-domain.com/api/admin/upload-bundle-image \
  -H "Cookie: __session=your-clerk-session-token" \
  -F "file=@/path/to/image.jpg" \
  -F "bundleId=bundle_123"
```

## Image Retrieval

After uploading, images are retrieved via the public endpoint:

```
GET /api/bundles/{bundleId}/image
```

This endpoint returns the binary image data with appropriate `Content-Type` headers.

## Security Considerations

1. **Admin-only access**: Only authenticated admin users can upload images
2. **File validation**: Validates file type and size before upload
3. **Binary storage**: Images stored securely in PostgreSQL database
4. **Content-Type validation**: Ensures uploaded file is an image
5. **Size limit**: 5 MB maximum to prevent database bloat

## Integration with Bundles

This endpoint is integrated with the bundle management system:

1. **Create Bundle**: Preview image, then create bundle with image data
2. **Update Bundle**: Upload new image, then update bundle with binary data

The images are stored in `bundle.image_data` and `bundle.image_type` fields.

## Storage Location

All bundle images are stored in the PostgreSQL database in the `bundle` table:

- **Column**: `image_data` (Bytea type)
- **Type Column**: `image_type` (String, MIME type)

## Timeout Configuration

- **Runtime**: Node.js
- **Max Duration**: 60 seconds

## Related Files

- `/app/(protected)/admin/_components/BundlesPanel.client.tsx` - Frontend component using this API
- `/app/(protected)/admin/_components/bundles.actions.ts` - Server actions for bundle CRUD
- `/app/api/bundles/[bundleId]/image/route.ts` - Image retrieval endpoint
- `/prisma/schema.prisma` - Bundle model definition
