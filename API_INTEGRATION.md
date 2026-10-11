# SecureVault — API & Integration Document (Handoff to Person 2 & Person 3)

This document is the contract between the frontend (Person 1) and the backend services
(Person 2) and cloud/infrastructure services (Person 3). It describes the environment
variables the frontend reads, the authentication flow, every HTTP endpoint the frontend
calls, the request/response fields it consumes, and exactly which parts are **already
agreed** versus **still to be confirmed** by the backend team.

> **Rule:** the frontend never invents URLs or data. All requests are relative to
> `VITE_API_BASE_URL`; when a value is missing the UI shows a "Backend not connected" or
> "Backend integration pending" state instead of fabricating data. There is no mock data
> and no simulated authentication anywhere in this repository.

---

## 1. Environment variables

The frontend reads these Vite variables (see `.env.example`). Only public identifiers
belong here — **never** AWS secret keys, root credentials, or Cognito client secrets.

| Variable | Required | Used for | Example |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | For any data call | Base URL of the API Gateway stage; every request is `BASE + path` | `https://abc123.execute-api.ap-south-1.amazonaws.com/prod` |
| `VITE_AWS_REGION` | For sign-in | Cognito IDP host: `https://cognito-idp.<region>.amazonaws.com/` | `ap-south-1` |
| `VITE_COGNITO_USER_POOL_ID` | For sign-in | Cognito user pool used by the app client | `ap-south-1_XXXXXXXXX` |
| `VITE_COGNITO_CLIENT_ID` | For sign-in | Public app client id (no secret) | `1a2b3c4d5e6f7g8h9i0j` |
| `VITE_COGNITO_DOMAIN` | No | Reserved for a future Cognito Hosted UI flow; **not used by the current code** | `securevault.auth.<region>.amazoncognito.com` |

Configuration flags derived in `src/config.js`:

- `isBackendConfigured = VITE_API_BASE_URL is non-empty`
- `isAuthConfigured = region + userPoolId + clientId are all non-empty`

When `isAuthConfigured` is false the app renders the login page in its
"Authentication not configured" state (no crash). When `isBackendConfigured` is false every
API call throws `NotConfiguredError`, which the UI renders as "Backend not connected".

---

## 2. Authentication (Amazon Cognito User Pools)

The frontend talks to the **Cognito IDP REST API directly** with `fetch` — there is no AWS
SDK and no client secret.

### 2.1 Cognito app client configuration (required)

| Setting | Value |
| --- | --- |
| App client type | Public (no client secret) |
| Auth flow `ALLOW_USER_PASSWORD_AUTH` | **Enabled** (email/password sign-in) |
| Auth flow `ALLOW_REFRESH_TOKEN_AUTH` | **Enabled** (silent token refresh) |
| Token-based auth | Enabled (default) |
| User pool attributes | `email` should be present on the ID token (used for the user profile) |

### 2.2 Sign-in flow (implemented)

1. `POST https://cognito-idp.<region>.amazonaws.com/` with header
   `X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth` and body:

   ```json
   {
     "AuthFlow": "USER_PASSWORD_AUTH",
     "ClientId": "<VITE_COGNITO_CLIENT_ID>",
     "AuthParameters": { "USERNAME": "<email>", "PASSWORD": "<password>" }
   }
   ```

2. On success the response contains `AuthenticationResult`
   (`IdToken`, `AccessToken`, `RefreshToken`, `ExpiresIn`). The ID token is decoded to build
   the user profile from claims: `sub` (id), `email`, and `name`/`given_name`/
   `preferred_username` (display name).

3. The session is persisted to `sessionStorage` under the key
   `securevault.auth.session` and refreshed automatically ~60 s before expiry using:

   ```json
   {
     "AuthFlow": "REFRESH_TOKEN_AUTH",
     "ClientId": "<VITE_COGNITO_CLIENT_ID>",
     "AuthParameters": { "REFRESH_TOKEN": "<refreshToken>" }
   }
   ```

4. Every backend request carries `Authorization: Bearer <IdToken>`.

### 2.3 Authorization header decision — **needs confirmation**

The frontend sends the **ID token** as the bearer token. If the API Gateway Cognito
authorizer / Lambda should instead use the **access token**, the backend team must confirm and
the frontend will be adjusted. Either way, configure an API Gateway **Cognito User Pools
authorizer** on the protected routes.

### 2.4 Challenges not completed by the frontend

`NEW_PASSWORD_REQUIRED`, `SMS_MFA`, and `SOFTWARE_TOKEN_MFA` are surfaced as clear error
messages; the frontend does not yet complete these challenges. If the user pool enforces MFA
or forced password change, that flow must be confirmed before it is supported.

---

## 3. HTTP conventions

- **Base URL:** every path below is appended to `VITE_API_BASE_URL` (no leading slash
  duplication; the client normalizes slashes).
- **Auth:** all endpoints are authenticated unless noted. Send the bearer token described above.
- **Content type:** request bodies are JSON (`Content-Type: application/json`) except the
  direct S3 upload, which sends the raw file bytes.
- **Status codes:** `400`/`422` validation, `401` unauthorized, `403` forbidden,
  `501` not-yet-implemented, other `4xx`/`5xx` generic API error.
- **Errors:** the client reads `message` (or `error`) from a JSON error body when present.
- **Empty data:** return empty arrays / `null`, never mock rows.

---

## 4. Files

Uploads use a **pre-signed S3 PUT URL** so the private bucket stays private. The frontend
first asks the backend to create metadata + sign a URL, then uploads the bytes straight to S3.

| Method | Path | Request | Response consumed by frontend |
| --- | --- | --- | --- |
| `GET` | `/files` | optional query params (see below) | `File[]` **or** `{ "files": File[] }` (also accepts `items`/`data`) |
| `POST` | `/files/upload-url` | `{ "fileName": string, "contentType": string, "sizeBytes": number }` | `{ "uploadUrl": string, "fileId"?: string, "headers"?: object }` (also accepts `url`/`id`) |
| `PUT` | `<uploadUrl>` (S3, **not** the API) | raw file bytes, `Content-Type` = file type | S3 `2xx` |
| `GET` | `/files/{id}/download` | — | `{ "url": string, "expiresAt"?: string }` (also accepts `downloadUrl`) |
| `DELETE` | `/files/{id}` | — | `204` or any `2xx` |

**`File` fields the frontend reads** (aliases accepted in the order shown):

| Field | Accepted aliases | Notes |
| --- | --- | --- |
| id | `id`, `fileId` | required for download/delete/share |
| name | `name`, `fileName`, `filename` | shown in the table |
| type | `type`, `mimeType` | used for the file-type icon |
| size | `sizeBytes`, `size` | `sizeBytes` formatted as bytes |
| owner | `owner`, `ownerEmail` | shown in the Owner column |
| modified | `modifiedAt`, `modified`, `updatedAt` | shown in Modified column |

**S3 CORS (required on the private bucket):** allow `PUT` (and `HEAD` if used) from the
frontend origin(s), with `Content-Type` allowed. The frontend performs the direct `PUT` and
then re-fetches `GET /files`; it never uploads through the API.

**Query params for `GET /files`:** the client accepts `search`, `sort`, `order`, `type`, etc.,
but the current UI does searching/sorting **client-side** and calls `GET /files` with no
params. Server-side `search`/`sort`/pagination are a future enhancement — confirm if the
backend wants to support them now.

---

## 5. Sharing

| Method | Path | Request | Response consumed by frontend |
| --- | --- | --- | --- |
| `GET` | `/shares/received` | — | `Share[]` **or** `{ "shares": Share[] }` (also accepts `items`/`data`) |
| `POST` | `/shares` | `{ "fileId": string, "recipient": string, "permission": "viewer"\|"editor", "expiresAt": string\|null }` | created `Share` or `201` |
| `DELETE` | `/shares/{id}` | — | `204` or any `2xx` |

**`Share` fields the frontend reads:**

| Field | Accepted aliases |
| --- | --- |
| id | `id`, `shareId` |
| file name | `fileName`, `name` |
| owner | `owner`, `ownerEmail` |
| permission | `permission` (values `viewer` / `editor`) |
| shared date | `sharedAt`, `dateShared` |
| expiry | `expiresAt`, `expires` |

---

## 6. Activity

| Method | Path | Request | Response consumed by frontend |
| --- | --- | --- | --- |
| `GET` | `/activity` | optional query params | `Activity[]` **or** `{ "activities": Activity[] }` (also accepts `items`/`data`) |

**`Activity` fields the frontend reads:**

| Field | Accepted aliases | Notes |
| --- | --- | --- |
| id | `id` | list key |
| action/file | `filename`, `fileName`, `action` | main label |
| type | `type` | badge + dot colour |
| actor | `actor`, `user`, `email` | who performed it |
| timestamp | `timestamp`, `createdAt` | formatted date/time |

Activity must be **backend/audit-sourced**. The frontend does not record browser actions.

---

## 7. Notifications

| Method | Path | Request | Response consumed by frontend |
| --- | --- | --- | --- |
| `GET` | `/notifications` | — | `Notification[]` **or** `{ "notifications": Notification[] }` (also accepts `items`/`data`) |

**`Notification` fields the frontend reads:** `id`; title from `title` (fallback `type`);
body from `message` (fallback `body`). Fetched lazily when the bell menu is opened.

---

## 8. Stats

| Method | Path | Response consumed by frontend |
| --- | --- | --- |
| `GET` | `/stats` | JSON object |

Fields read: `totalFiles`, `sharedFiles`, `storageUsedBytes`, `storageQuotaBytes`,
`activeUsers`. Shown on the Overview and Admin dashboards.

---

## 9. Admin

| Method | Path | Response consumed by frontend |
| --- | --- | --- |
| `GET` | `/admin/members` | `Member[]` **or** `{ "members": Member[] }` (also accepts `items`/`data`) |
| `GET` | `/admin/integrations` | object map `{ "<service>": "<status>" }` |
| `GET` | `/admin/security-checklist` | `ChecklistItem[]` **or** `{ "checklist": ChecklistItem[] }` (also accepts `items`/`data`) |

- `Member` fields: `id`/`email`, `name`, `email`, `role`.
- `ChecklistItem` fields: `label` (string), `done` (boolean).
- Integrations is rendered as an arbitrary `service → status` map (e.g. `"Cognito": "connected"`).

Each admin section is fetched independently, so a section that returns `501`/is missing shows
its own "Backend integration pending" notice while the others still render.

---

## 10. Error handling contract

| Condition | Frontend behaviour |
| --- | --- |
| `400` / `422` | Validation error — message shown |
| `401` | Unauthorized — prompt to sign in |
| `403` | Forbidden — access denied |
| `501` | "Backend integration pending" (endpoint not deployed yet) |
| Network failure | "Unable to reach the backend API…" with retry |
| No `VITE_API_BASE_URL` | "Backend not connected" state everywhere |

---

## 11. Contract status — agreed vs. awaiting confirmation

### 11.1 Agreed / required as-is (the frontend calls these paths verbatim)

These method + path combinations are hard-coded in `src/services/api.js` and
`src/services/authService.js`. They must exist exactly as written for the UI to function:

- `POST /files/upload-url`, direct `PUT <uploadUrl>`, `GET /files`,
  `GET /files/{id}/download`, `DELETE /files/{id}`
- `GET /shares/received`, `POST /shares`, `DELETE /shares/{id}`
- `GET /activity`, `GET /notifications`, `GET /stats`
- `GET /admin/members`, `GET /admin/integrations`, `GET /admin/security-checklist`
- Cognito `InitiateAuth` (`USER_PASSWORD_AUTH`) + `REFRESH_TOKEN_AUTH`, bearer ID token

**No URLs are invented here.** If the backend prefers different paths, the frontend must be
updated — do not deploy divergent routes silently.

### 11.2 Needs confirmation from the backend team

These are deliberately **not** fixed by Person 1 and must be agreed before implementation:

1. **Bearer token type** — ID token (current client behaviour) vs access token.
2. **Response envelope** — bare array vs `{ data: [...] }`; the client tolerates
   `files`/`shares`/`activities`/`members`/`notifications`/`checklist`/`items`/`data`, but one
   convention should be chosen.
3. **Exact field names** — the frontend accepts aliases (see each table), but the canonical
   names per resource should be agreed (e.g. `name` vs `fileName`; `sizeBytes` vs `size`).
4. **Timestamps** — ISO 8601 strings and UTC are assumed; confirm format/timezone.
5. **`permission` enum** — currently `viewer` / `editor`; confirm the full set.
6. **`expiresAt` format** — ISO date/date-time; confirm whether expiry is enforced by Lambda.
7. **`/admin/integrations` value shape** — plain string vs `{ status, detail }`.
8. **`/activity` `type` enum** — used for badge styling; confirm allowed values.
9. **Error body schema** — client reads `message`/`error`; confirm a stable error shape and any
   error `code`.
10. **`/files/upload-url` `headers`** — optional map of extra S3 upload headers; confirm if the
    backend will send any (e.g. SSE/KMS or tagging).
11. **Search / sort / pagination** — not sent today; decide whether the backend implements these
    for `GET /files` and `GET /activity`.
12. **Notifications** — whether the response includes unread counts / read state.

### 11.3 Endpoints not defined here

Do **not** assume additional endpoints. Anything not listed above (e.g. user invitation,
folder hierarchy, per-file version history) is out of scope until added to this document.

---

## 12. How Person 2 & Person 3 configure and test against this frontend

### 12.1 Get the frontend running

```bash
npm install
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
# fill VITE_API_BASE_URL and the Cognito values with your deployed resources
npm run dev                    # http://localhost:5173
```

### 12.2 Provide configuration without committing secrets

- Put real values only in **`.env.local`** (git-ignored). `.env.example` stays empty.
- The frontend only needs **public** identifiers: the API base URL, region, user pool id and
  app client id. No AWS keys.

### 12.3 Smoke-test each layer

| Step | What to do | Expected result |
| --- | --- | --- |
| Auth config | Set region/pool/client, reload | Login form appears (not "Authentication not configured") |
| Sign-in | Use a confirmed Cognito user | Lands on Overview; `Authorization: Bearer <IdToken>` on API calls |
| Token refresh | Wait until near expiry | Silent `REFRESH_TOKEN_AUTH`; no forced sign-out |
| API base | Set `VITE_API_BASE_URL`, reload | Overview/Files/etc. call the API instead of "Backend not connected" |
| `GET /files` | Load My Files | Table renders your files, or an empty state if none |
| Upload | Upload a file | `POST /files/upload-url`, direct S3 `PUT` (check CORS), then list reloads |
| Download | Click download | `GET /files/{id}/download` returns a pre-signed URL; browser downloads |
| Delete | Confirm delete | `DELETE /files/{id}` succeeds, row disappears, success toast |
| Share | Share to a recipient | `POST /shares` succeeds; row appears for the recipient via `/shares/received` |
| Revoke | Revoke a share | `DELETE /shares/{id}` succeeds, card disappears |
| Activity | Open Activity | Backend records listed; empty state if none |
| Notifications | Open the bell | Lazy `GET /notifications`; list or empty state |
| Admin | Open Admin | Stats/members/integrations/checklist render per-section; `501` shows a pending notice |

### 12.4 Notes for Person 2 (backend/API)

- Deploy the API Gateway stage, then send Person 1 the invoke URL for `VITE_API_BASE_URL`.
- Configure a Cognito User Pools authorizer and validate the bearer token server-side.
- **Enforce authorization in Lambda** — the frontend hides nothing that grants access; S3 and
  DynamoDB policies are the real gate.
- Implement the upload flow with **pre-signed S3 PUT** URLs; keep the bucket private.
- Reserve `501` for not-yet-built routes so the UI shows its pending notice.

### 12.5 Notes for Person 3 (cloud/infrastructure)

- Cognito user pool + public app client with `ALLOW_USER_PASSWORD_AUTH` and
  `ALLOW_REFRESH_TOKEN_AUTH`; share region/pool/client ids with Person 1.
- Private S3 bucket for files with a **CORS rule allowing `PUT`** from the frontend origin.
- API Gateway (Cognito authorizer) → Lambda → DynamoDB (file/share/activity metadata).
- SNS for notification fan-out, CloudWatch for logs/metrics, CloudTrail for audit.
- Frontend hosting on S3 + CloudFront is a later stage (see `docs/ARCHITECTURE.md`).

See **`docs/ARCHITECTURE.md`** for the target AWS architecture diagram with implemented vs.
planned components.

---

## 13. Security rules (non-negotiable)

- UI visibility is **not** authorization; all access control is server-side.
- S3 buckets stay private; only pre-signed URLs are used.
- Never place AWS root credentials or secret keys in frontend code.
- No mock data, no simulated auth, no fake success messages — the UI only reports success after
  a real `2xx` response.
