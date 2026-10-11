# SecureVault — Secure Cloud File Sharing Platform for Organizations

A three-person college project building a secure cloud file sharing platform on AWS.
**This repository contains the frontend (Person 1's scope) only.**

The frontend is wired to real services: **Amazon Cognito** for authentication and the
**backend HTTP API** (API Gateway + Lambda) for all data. There is **no mock data, no
simulated login, and no in-browser file storage**. When a service or endpoint is not
configured, the UI shows a clear "not connected" / "Backend integration pending" state
instead of inventing data.

## Problem statement

Organizations need a simple, safe way to store files and share them with teammates without
exposing data publicly. SecureVault provides authenticated file storage, controlled sharing
with per-recipient permissions and expiry, and an auditable activity trail — with the storage
layer kept private by default.

## What is genuinely connected

| Area | Implementation | Real? |
| ---- | -------------- | ----- |
| Authentication | Amazon Cognito User Pools (`InitiateAuth` / `REFRESH_TOKEN_AUTH`) | ✅ Real |
| Session persistence | Tokens held in memory + `sessionStorage`, refreshed before expiry | ✅ Real |
| File listing | `GET {VITE_API_BASE_URL}/files` | ✅ Real (requires backend) |
| File upload | `POST /files/upload-url` → direct `PUT` to the returned pre-signed S3 URL | ✅ Real (requires backend + S3 CORS) |
| File download | `GET /files/{id}/download` → pre-signed URL, then browser download | ✅ Real (requires backend) |
| File delete | `DELETE /files/{id}` | ✅ Real (requires backend) |
| Sharing | `POST /shares` (recipient, permission, expiry) | ✅ Real (requires backend) |
| Shared with me | `GET /shares/received` | ✅ Real (requires backend) |
| Revoke share | `DELETE /shares/{id}` | ✅ Real (requires backend) |
| Activity | `GET /activity` (backend/audit records only) | ✅ Real (requires backend) |
| Notifications | `GET /notifications` | ✅ Real (requires backend) |
| Admin stats / members / integrations / checklist | `/stats`, `/admin/members`, `/admin/integrations`, `/admin/security-checklist` | ✅ Real (requires backend) |

Operations only report success **after** the backend confirms them. Downloads use only
back-end-issued pre-signed URLs; private S3 buckets are never made public.

## Frontend features

- **Login** — real Cognito email/password sign-in with validation, password visibility
  toggle, loading/error states, and an explicit "authentication not configured" screen.
- **Overview** — summary cards and recent activity from the backend.
- **My Files** — sortable/searchable file table, drag-and-drop + picker upload through the
  pre-signed URL workflow, real download, delete confirmation and per-file share.
- **Shared with Me** — shared records (owner, permission, date, expiry) with revoke.
- **Share dialog** — recipient email, viewer/editor permission, optional expiry.
- **Activity** — chronological backend activity feed.
- **Admin** — team members, stats, AWS integration status and security checklist, each
  section independently showing real data or a pending/not-connected notice.
- **Settings** — profile, authentication status and sign-out.
- Responsive desktop/tablet/mobile layout with collapsible sidebar, global search,
  notification panel and user menu.

## Technology stack

- React 19 + Vite 8
- JavaScript / JSX (no TypeScript)
- Icons from the installed `lucide-react` package (`src/components/Icons.jsx`)
- No UI framework or state library — plain React hooks and Context
- No AWS SDK: Cognito and API calls use the browser `fetch`/`XMLHttpRequest`

## Installation and local run

```bash
npm install
cp .env.example .env.local   # then fill in real values (see below)
npm run dev                  # start the dev server (Vite)
npm run build                # production build
npm run preview              # preview the production build
npm run lint                 # oxlint
```

## Environment variables

All configuration is read from Vite env vars. Never commit real values and never place AWS
secret keys or root credentials in the frontend.

```
VITE_API_BASE_URL=            # API Gateway invoke URL, e.g. https://abc123.execute-api.<region>.amazonaws.com/prod
VITE_AWS_REGION=              # e.g. us-east-1
VITE_COGNITO_USER_POOL_ID=    # e.g. us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=       # Cognito app client id (public, no secret)
VITE_COGNITO_DOMAIN=          # optional; reserved for Cognito Hosted UI (not used yet)
```

Only public Cognito identifiers and the API endpoint belong in client-side configuration.

## Cognito requirements

- The app client must allow the `ALLOW_USER_PASSWORD_AUTH` flow (used for sign-in) and
  `ALLOW_REFRESH_TOKEN_AUTH` (used for silent token refresh). Token-based auth is enabled by
  default.
- The ID token is sent to the API as `Authorization: Bearer <idToken>`. Configure the
  API Gateway authorizer (Cognito User Pools) to accept it.
- If the user pool requires MFA or a forced password change, the frontend currently surfaces
  a clear message instead of completing that challenge.

## Backend API contract (Person 2 / Person 3)

Every endpoint is authenticated; return JSON with standard status codes.

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/files` | Files authorized for the current user |
| POST | `/files/upload-url` | Body `{ fileName, contentType, sizeBytes }` → `{ uploadUrl, fileId?, headers? }` (pre-signed S3 PUT) |
| GET | `/files/{id}/download` | → `{ url, expiresAt? }` (pre-signed S3 GET) |
| DELETE | `/files/{id}` | Delete if authorized |
| GET | `/shares/received` | Shares shared with the current user |
| POST | `/shares` | Body `{ fileId, recipient, permission, expiresAt? }` |
| DELETE | `/shares/{id}` | Revoke share if authorized |
| GET | `/activity` | Backend/audit activity records |
| GET | `/notifications` | Notifications for the current user |
| GET | `/stats` | `{ totalFiles, sharedFiles, storageUsedBytes?, storageQuotaBytes?, activeUsers? }` |
| GET | `/admin/members` | Team members |
| GET | `/admin/integrations` | Service → status map |
| GET | `/admin/security-checklist` | Checklist items `{ label, done }` |

Uploads must return a **pre-signed S3 PUT URL** (private bucket). The S3 bucket needs a CORS
rule allowing `PUT` from the frontend origin. The frontend performs a direct `PUT` to that URL
and then reloads the file list; it does not upload to the API itself.

## Error handling

- `400`/`422` validation, `401` sign-in required, `403` access denied
- `501` → "Backend integration pending"
- Unreachable API → network error with retry
- No `VITE_API_BASE_URL` → "Backend not connected" state everywhere

## Security considerations

- UI visibility is **not** authorization. Access control is enforced server-side
  (API Gateway authorizers + Lambda + S3 policies), never by hiding buttons.
- S3 buckets stay private; only pre-signed URLs are used.
- Never use the AWS root account in browser code.
- Only Cognito-issued tokens are stored; no secrets live in the repository.

## Project structure

```
src/
  App.jsx                 App shell and page routing
  main.jsx                Entry point (providers)
  navigation.js           Sidebar/nav configuration
  config.js               Env var reading + configuration flags
  errors.js               Typed errors + user-facing descriptions
  context/AuthContext.jsx Cognito auth provider (session restore/refresh)
  services/authService.js Cognito User Pools integration
  services/api.js         Backend API client (files, shares, activity, admin, notifications)
  services/apiClient.js   Fetch/XHR transport, bearer tokens, pre-signed upload PUT
  hooks/useAsync.js       Async data hook (loading/error/reload)
  components/             Icons, Layout, Sidebar, TopBar, Toast, ShareDialog, FileTypeIcon, StateViews
  pages/                  Login, Overview, MyFiles, SharedWithMe, Activity, Admin, Settings
  utils/format.js         Formatting helpers
  index.css               Design system / styles
```

## Current blocked items

- **AWS configuration (Person 2/3):** Cognito user pool + app client, API Gateway routes,
  Lambda handlers, DynamoDB tables, and the private S3 bucket with CORS.
- **Backend endpoints:** anything listed above that is not yet deployed will render the
  "Backend integration pending" / "Backend not connected" state.
- **S3 frontend hosting and CloudFront:** handled in a later stage.
