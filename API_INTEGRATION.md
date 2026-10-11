export const API_INTEGRATION_DOC = `# SecureVault — API Integration Document (for Person 2 & Person 3)

This document describes the API contract required by the frontend. All endpoints are authenticated
unless stated otherwise. Return JSON and use standard HTTP status codes. Do **not** invent URLs —
they must be provided via \`VITE_API_BASE_URL\`.

## 1. Authentication

- The frontend signs in directly against **Amazon Cognito User Pools** using the IDP API
  (\`InitiateAuth\` with \`USER_PASSWORD_AUTH\`, refresh with \`REFRESH_TOKEN_AUTH\`). No client secret
  is used.
- The app client must allow \`ALLOW_USER_PASSWORD_AUTH\` and \`ALLOW_REFRESH_TOKEN_AUTH\`.
- The **ID token** is sent to the API as \`Authorization: Bearer <idToken>\`. Configure the API
  Gateway authorizer to accept it.
- Only public Cognito identifiers may be exposed client-side (\`VITE_AWS_REGION\`,
  \`VITE_COGNITO_USER_POOL_ID\`, \`VITE_COGNITO_CLIENT_ID\`). No secret keys.

## 2. Files

The upload uses a **pre-signed S3 URL** so the private bucket is never exposed.

| Method | Path | Notes | Expected Response |
|---|---|---|---|
| GET | \`/files\` | List files authorized to the current user. Support optional query params (search/sort/filter) | \`File[]\` or \`{ files: File[] }\` |
| POST | \`/files/upload-url\` | Body \`{ fileName, contentType, sizeBytes }\`. Backend creates metadata and signs an S3 PUT | \`{ uploadUrl, fileId?, headers? }\` |
| PUT | \`<uploadUrl>\` | The frontend uploads the raw file bytes directly to S3. Bucket must allow CORS \`PUT\` from the app origin | S3 \`200\` |
| GET | \`/files/{id}/download\` | Returns an authorized pre-signed download URL | \`{ url: string, expiresAt?: string }\` |
| DELETE | \`/files/{id}\` | Delete a file if authorized | 204 or success body |

**File schema:** \`{ id, fileId?, name, fileName, type, mimeType, sizeBytes?, size?, owner, ownerEmail, modifiedAt?, modified?, updatedAt? }\`

## 3. Sharing

| Method | Path | Notes | Expected Response |
|---|---|---|---|
| GET | \`/shares/received\` | Shares shared with the current user | \`Share[]\` or \`{ shares: Share[] }\` |
| POST | \`/shares\` | Create share: \`{ fileId, recipient, permission, expiresAt? }\` | \`Share\` or 201 |
| DELETE | \`/shares/{id}\` | Revoke share if authorized | 204 or success body |

**Share schema:** \`{ id, shareId, fileId, fileName, name, owner, ownerEmail, recipient, permission, sharedAt?, dateShared, expiresAt?, expires }\`

## 4. Activity & notifications

| Method | Path | Notes | Expected Response |
|---|---|---|---|
| GET | \`/activity\` | Activity records (backend/audit). Frontend will not infer browser actions. | \`Activity[]\` or \`{ activities: Activity[] }\` |
| GET | \`/notifications\` | Notifications for the current user | \`Notification[]\` or \`{ notifications: Notification[] }\` |

## 5. Admin

| Method | Path | Notes | Expected Response |
|---|---|---|---|
| GET | \`/admin/members\` | Team members | \`Member[]\` or \`{ members: Member[] }\` |
| GET | \`/admin/integrations\` | Integration status map (Cognito, S3, DynamoDB, API Gateway, Lambda, SNS, CloudWatch, CloudTrail) | Object of service->status |
| GET | \`/admin/security-checklist\` | Security checklist items | \`ChecklistItem[]\` or \`{ checklist: ChecklistItem[] }\` |

## 6. Stats

| Method | Path | Notes | Expected Response |
|---|---|---|---|
| GET | \`/stats\` | Workspace stats: totalFiles, sharedFiles, storageUsedBytes, storageQuotaBytes, activeUsers | Object |

## Error handling

- 400/422: validation errors (show message)
- 401: unauthorized (prompt sign-in)
- 403: forbidden (access denied)
- 501: "Backend integration pending" (endpoint not deployed yet)
- Others: generic error with retry
- Network failure: "Unable to reach the backend API..."
- Not configured: "Backend not connected. Data will appear when the service is configured."

## Notes
- Do not return mock data in production. Return empty arrays when nothing exists.
- Never expose AWS secret keys. Only \`VITE_*\` public config.
- The frontend only reports success after the API returns a 2xx response.
`
