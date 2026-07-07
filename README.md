# cms.imamzain.org

Admin CMS for [imamzain.org](https://imamzain.org) — Islamic content management, digital library, gallery, audio library, forms, and contest administration.

Built with **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS 4**, **TanStack Query**, and **Zustand**.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + CSS variables |
| Server state | TanStack Query 5 (`src/lib/queries/`) |
| Client state | Zustand 5 (auth store) |
| Forms | React Hook Form 7 + Zod 4 |
| Rich text | TipTap 3 |
| HTTP | Axios 1 |
| Dates | date-fns 4 |
| Icons | Lucide React |
| Notifications | Sonner |
| Testing | Vitest 4 + MSW 2 + Testing Library |

---

## Prerequisites

- **Node.js** ≥ 18 or **Bun** ≥ 1.3
- The backend API running locally (default: `http://localhost:3000/api/v1`)

---

## Getting started

```bash
# Install dependencies
bun install

# Start the dev server (runs on port 3002, leaving 3000 for the API)
bun dev

# Open in browser
open http://localhost:3002
```

---

## Environment variables

| Variable | Dev default (`.env.local.example`) | Production (`.env.production`) | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | `https://api.imamzain.org/api/v1` | Backend API base URL |

Create a `.env.local` file at the project root (already gitignored) to override values locally.

---

## Project structure

```
src/
├── app/
│   ├── (auth)/login/               Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx              Dashboard shell (auth gate)
│   │   └── dashboard/
│   │       ├── page.tsx            Overview / stat cards
│   │       ├── posts/              Posts CRUD (+ trash)
│   │       ├── post-categories/    Category managers ×4, each with trash
│   │       ├── book-categories/    (posts / books / papers / gallery)
│   │       ├── paper-categories/
│   │       ├── gallery-categories/
│   │       ├── books/              Books library (+ trash)
│   │       ├── papers/             Academic papers (+ trash)
│   │       ├── gallery/            Image gallery (+ trash)
│   │       ├── audios/             Audio library (+ trash)
│   │       ├── speakers/           Audio speakers/lecturers (+ trash)
│   │       ├── static-pages/       Static pages CRUD (+ trash)
│   │       ├── stores/             Sale points (منافذ البيع) (+ trash)
│   │       ├── media/              Raw media library
│   │       ├── daily-hadiths/      Daily hadiths (+ trash)
│   │       ├── contacts/           Contact form inbox (+ trash)
│   │       ├── proxy-visits/       Proxy visit requests (+ trash)
│   │       ├── newsletter/         Subscribers (+ trash)
│   │       ├── campaigns/          Newsletter campaigns
│   │       ├── contest/            Contest attempt review
│   │       ├── users/              Admin user management (+ trash)
│   │       ├── roles/              Role & permission matrix
│   │       ├── languages/          Supported languages
│   │       ├── settings/           Site settings (key/value with typed values)
│   │       ├── audit-logs/         Audit log viewer
│   │       └── profile/            Own account + password change
│   ├── error.tsx / global-error.tsx / loading.tsx / not-found.tsx
│   └── page.tsx                    Redirects / → /dashboard
│
├── components/
│   ├── layout/                     Sidebar (permission-gated nav), Header, ClientOnly
│   ├── posts/ books/ papers/       Resource forms
│   ├── audios/ static-pages/       Resource forms (audio upload, page editor)
│   ├── categories/ campaigns/      Shared managers
│   ├── forms/ trash/ audit/        Shared page building blocks
│   ├── providers/                  React Query provider
│   └── ui/                         Button, Input, Card, Badge, dialogs, …
│
├── services/                       All API calls, one file per resource
│                                   (posts, books, papers, gallery, audios,
│                                   speakers, static-pages, stores, media,
│                                   daily-hadiths, contacts, proxy-visits,
│                                   newsletter, campaigns, contest, users,
│                                   roles, languages, settings, audit-logs, …)
│
├── lib/
│   ├── api.ts                      Axios instance: JWT + refresh rotation,
│   │                               envelope unwrapping, Arabic error mapping
│   ├── queries/                    TanStack Query hooks (keys.ts, factory.ts,
│   │                               one file per resource)
│   ├── audio-meta.ts               Client-side audio duration/peaks extraction
│   └── sanitize.ts / i18n.ts / …   Shared helpers
│
├── store/auth.ts                   Zustand auth store (login/logout/checkAuth)
└── types/                          TypeScript types, one file per resource
                                    (snake_case, API-aligned)
```

---

## API alignment

The CMS consumes the imamzain.org REST API at `/api/v1/...`. Full reference: [https://api.imamzain.org/docs](https://api.imamzain.org/docs) and the API repo's `docs/` (`integration.md`, `permissions.md`, `CMS-INTEGRATION-NOTES.md`). Key design decisions:

- **Auth** uses `username` + `password` (not email). JWT access + refresh tokens stored in `localStorage`.
- **Response envelopes**: success responses arrive as `{ success, data }` — the axios interceptor unwraps `data` transparently. Error envelopes carry a stable machine `code` that the client maps to Arabic messages (`getErrorMessage` in `src/lib/api.ts`); unrecognized codes fall back to the server's human-readable string.
- **Slim list translations**: list endpoints drop heavy translation fields (`body` / `description` / `abstract`) — detail endpoints return full data, so the CMS fetches the detail record before opening an edit form.
- **Admin post listing** uses `GET /posts/admin` to include unpublished drafts.
- **Media upload** is a presigned two-step flow: `POST /media/upload-url` → PUT to R2 → `POST /media/confirm`. WebP variants are generated in the background; the client polls `GET /media/:id` until they appear.
- **Audio upload** is a presigned PUT with **no confirm step** — duration and waveform peaks are extracted client-side (`src/lib/audio-meta.ts`) and sent with the create/update payload.
- **Books & papers PDFs** are external URLs — PDFs are not uploaded through `/media`.
- **Gallery images** are separate records linked to media via `media_id`.
- **Contacts & proxy visits** live under `GET /forms/contacts` and `GET /forms/proxy-visits`, with server-side status filtering and soft-delete trash.
- **Newsletter toggle** uses `POST /newsletter/subscribe` or `POST /newsletter/unsubscribe` by email.
- All write operations use `PATCH` (not `PUT`), matching the API spec.
- All field names are **snake_case** throughout (matching API responses directly; the presigned upload-url responses are the one camelCase exception).
- Requests default to `Accept-Language: ar` so translated fields resolve against Arabic.

---

## Authentication

Protected routes require a valid JWT stored in `localStorage` (`accessToken` / `refreshToken`). Token handling lives in `src/lib/api.ts`:

- On a 401, the client runs a **single-flight refresh** (`POST /auth/refresh`): concurrent 401s queue behind one refresh and replay with the new access token once it resolves.
- Refresh tokens **rotate** on every use. In multi-tab scenarios, losing the rotation race returns `AUTH_REFRESH_ALREADY_ROTATED` — the client re-reads the newer token another tab stored and retries once before giving up.
- A 401 on the refresh itself (invalid / reused / account disabled) wipes both tokens and redirects to `/login`. Transient network/5xx errors during refresh keep the tokens intact so a later request can recover.

---

## Running tests

```bash
# Single run (CI)
bun run test

# Watch mode (development)
bun run test:watch

# Coverage report
bun run test:coverage
```

Tests use **Vitest** with **MSW** for request mocking — no real network calls are made. Test files live in `src/tests/`:

```
src/tests/
├── setup.ts                    jest-dom + MSW global setup
├── utils.tsx                   Render helpers (React Query wrapper)
├── mocks/                      MSW handlers, node server, next-navigation stub
├── unit/                       api client, auth store, services, query hooks,
│                               shared components (Pagination, ConfirmDialog, …)
└── integration/                Page-level flows (posts, contacts, newsletter,
                                roles, dashboard, media upload, MediaPicker)
```

---

## Available scripts

| Script | Description |
|---|---|
| `bun dev` | Start dev server on port 3002 |
| `bun run build` | Production build |
| `bun run start` | Serve production build |
| `bun run test` | Run all tests once |
| `bun run test:watch` | Vitest watch mode |
| `bun run test:coverage` | Tests with coverage |
| `bun run lint` | ESLint check |

---

## CMS pages quick reference

Sidebar items are **permission-gated** (`src/components/layout/Sidebar.tsx`): an item is hidden unless the user's `permissions[]` contains at least one of the item's declared permission strings. The nav fails open while permissions are still loading, and the API enforces permissions server-side regardless.

| Path | Sidebar label | Purpose | Shown when user holds any of |
|---|---|---|---|
| `/dashboard` | لوحة التحكم | Stats overview | always (authenticated) |
| `/dashboard/posts` (+ `post-categories`, trash) | المقالات | Posts list + publish toggle | `posts:read/create/update/delete` |
| `/dashboard/books` (+ `book-categories`, trash) | المكتبة | Books library | `books:create/update/delete` |
| `/dashboard/papers` (+ `paper-categories`, trash) | الأبحاث | Academic papers | `academic-papers:create/update/delete` |
| `/dashboard/gallery` (+ `gallery-categories`, trash) | معرض الصور | Image gallery with upload | `gallery:create/update/delete` |
| `/dashboard/audios` (+ `speakers`, trash) | الصوتيات | Audio library + speakers | `audios:read/create/update/delete` |
| `/dashboard/static-pages` (+ trash) | الصفحات الثابتة | Static pages | `static-pages:read/create/update/delete` |
| `/dashboard/stores` (+ trash) | منافذ البيع | Sale points | `stores:create/update/delete` |
| `/dashboard/media` | مكتبة الوسائط | Raw media file library | `media:read/create/update/delete` |
| `/dashboard/daily-hadiths` (+ trash) | الأحاديث اليومية | Daily hadiths | `daily-hadiths:read/create/update/delete` |
| `/dashboard/contacts` (+ trash) | رسائل التواصل | Contact form inbox (status filter) | `forms:read` |
| `/dashboard/proxy-visits` (+ trash) | طلبات الزيارة | Proxy visit workflow (status filter) | `forms:read` |
| `/dashboard/newsletter` (+ `campaigns`, trash) | النشرة البريدية | Subscribers + CSV export + campaigns | `newsletter:read` |
| `/dashboard/contest` | المسابقات | Contest attempt scores | `contest:read` |
| `/dashboard/users` (+ trash) | المستخدمون | Admin user & role management | `users:read` |
| `/dashboard/roles` | الأدوار والصلاحيات | Role & permission matrix | `roles:read` |
| `/dashboard/languages` | اللغات | Supported language codes | `languages:read` |
| `/dashboard/settings` | إعدادات الموقع | Site settings (key/value, typed values) | `settings:read` |
| `/dashboard/audit-logs` | سجلات التدقيق | Filterable audit trail | `audit-logs:read` |
| `/dashboard/profile` | حسابي | Own account + password change | always (authenticated) |
