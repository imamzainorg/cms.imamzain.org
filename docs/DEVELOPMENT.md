# cms.imamzain.org — development notes

Admin CMS for [imamzain.org](https://imamzain.org) — Islamic content management, digital library, gallery, audio library, forms, and contest administration.

Built with **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS 4**, **TanStack Query**, and **Zustand**.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1 (App Router) — static export, served by Cloudflare Workers |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + CSS variables |
| Server state | TanStack Query 5 (`src/lib/queries/`) |
| Client state | Zustand 5 (auth store) |
| Forms | React Hook Form 7 + Zod 4 |
| Rich text | TipTap 3 |
| HTTP | Axios 1 |
| Hosting | Cloudflare Workers Static Assets (`wrangler.jsonc`) |
| Dates | date-fns 4 |
| Icons | Lucide React |
| Notifications | Sonner |
| Testing | Vitest 4 + MSW 2 + Testing Library |

---

## Prerequisites

- **Node.js** ≥ 22 or **Bun** ≥ 1.3
- The backend API. It is a Hono app on **Cloudflare Workers** (the `api.imamzain.org` repo, `worker/`); locally run it with `npm run dev` there (`wrangler dev`, port **8787**) against a migrated and seeded Postgres. The API only answers browsers whose origin is in its `ALLOWED_ORIGINS`, so for local work add `ALLOWED_ORIGINS=http://localhost:3002` to the API's `worker/.dev.vars`.

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
| `NEXT_PUBLIC_API_URL` | `http://localhost:8787/api/v1` | `https://api.imamzain.org/api/v1` | Backend API base URL (inlined into the bundle **at build time**) |
| `NEXT_PUBLIC_WEBMAIL_URL` | — | — | Optional: webmail used by the contact-reply compose link |

Copy `.env.local.example` to `.env.local` (gitignored) for local work. If your `.env.local` still points at the old NestJS port (`3000`), change it to `8787`.

> **Build-time trap, already guarded.** Next gives `.env.local` priority over `.env.production`, so a plain `next build` on a developer machine would ship `localhost` to production. `bun run build` (`scripts/build.mjs`) pins the production URL unless `NEXT_PUBLIC_API_URL` is set explicitly, and **fails the build** if the bundle still names a local address (`ALLOW_LOCAL_API=1` overrides that on purpose).

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
│   │       ├── posts/              Posts CRUD (+ trash); edit screen is posts/edit?id=…
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
│   ├── categories/                 Shared managers
│   ├── forms/ trash/ audit/        Shared page building blocks
│   ├── providers/                  React Query provider
│   └── ui/                         Button, Input, Card, Badge, dialogs, …
│
├── services/                       All API calls, one file per resource
│                                   (posts, books, papers, gallery, audios,
│                                   speakers, static-pages, stores, media,
│                                   daily-hadiths, contacts, proxy-visits,
│                                   newsletter, contest, users,
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

The CMS consumes the imamzain.org REST API at `/api/v1/...`. There is no interactive `/docs` page any more: the source of truth is the API repo's `docs/` (`integration.md`, `permissions.md`, `CMS-INTEGRATION-NOTES.md` — read its "What changed with the Cloudflare Workers move" section first) and, per endpoint, `worker/src/features/<group>/routes.ts` + `schemas.ts`. Verify field names there, not from memory: some older DTO docs named response fields that never existed on the wire. Key design decisions:

- **Auth** uses `username` + `password` (not email). JWT access + refresh tokens stored in `localStorage`.
- **Response envelopes**: success responses arrive as `{ success, data }` — the axios interceptor unwraps `data` transparently. Error envelopes carry a stable machine `code` that the client maps to Arabic messages (`getErrorMessage` in `src/lib/api.ts`); unrecognized codes fall back to the server's human-readable string.
- **Slim list translations**: list endpoints drop heavy translation fields (`body` / `description` / `abstract`) — detail endpoints return full data, so the CMS fetches the detail record before opening an edit form.
- **Admin post listing** uses `GET /posts/admin` to include unpublished drafts.
- **Media upload** is a presigned two-step flow: `POST /media/upload-url` → PUT to R2 → `POST /media/confirm`. WebP variants are generated in the background by the Cloudflare Images binding; the client polls `GET /media/:id` until **`variants_status` leaves `processing`** — never by comparing `variants.length` (a 1200 px original legitimately has two). "Regenerate" is offered only for `partial`. `GET /media/:id/references` powers the "where is this file used?" panel, and a `409 MEDIA_IN_USE` delete opens it.
- **Audio upload** is a presigned PUT with **no confirm step** — duration and waveform peaks are extracted client-side (`src/lib/audio-meta.ts`) and sent with the create/update payload.
- **Books, papers and audio PDFs** are uploaded straight to R2 through `POST /books|academic-papers|audios/upload-url` (PDF only, 150 MB cap, no confirm step) and the returned `publicUrl` is saved on `pdf_url`; a pasted external URL also works. They never go through `/media`.
- **Gallery images** are separate records linked to media via `media_id`.
- **Contacts & proxy visits** live under `GET /forms/contacts` and `GET /forms/proxy-visits`, with server-side status filtering and soft-delete trash.
- **Newsletter** is double opt-in: `is_active: false` is either *pending* (never confirmed) or *unsubscribed* — the UI tells them apart (`confirmed_at` / `unsubscribed_at`). Admins toggle with `POST /newsletter/subscribers/:id/(un|re)subscribe`; resubscribing skips the e-mail (the admin vouches for consent). **Campaigns were removed from the API** (404) and from the CMS.
- All write operations use `PATCH` (not `PUT`), matching the API spec.
- All field names are **snake_case** throughout (matching API responses directly; the presigned upload-url responses are the one camelCase exception).
- Requests default to `Accept-Language: ar` so translated fields resolve against Arabic.
- **Daily hadiths follow the Hijri date**: each hadith has `hijri_month` (1–12) + `hijri_day` (1–30), both or neither, shown on that day every year by the date Najaf announces on sistani.org. The CMS never computes the Hijri date — it reads `GET /daily-hadiths/hijri-date` / `meta.hijri` and can correct it by hand (`PUT`, `daily-hadiths:update`). The list browses by month through the public `GET /daily-hadiths?hijri_month=`; editing fetches `/admin/:id` first. A restore whose day was taken answers `data: null` + `meta.unscheduled` (the interceptor keeps `message`/`meta` on the response for this).
- **Books**: a multi-part series is ONE parent row plus a row per volume (`parent_id`, `part_number`, `parts`); volumes are hidden from every list and reached through the parent's detail (`parts[]`) or its **«إضافة جزء»** link. The series total (`parts` column) is write-only — no response carries it. `is_publication` marks the institution's own «الإصدارات», independent of the topic category.
- **Passwords** must be ≥ 10 characters (create, admin reset, change); login still accepts old shorter ones. An admin reset flags the account `must_change_password`, and the shell sends such users to the change-password screen (also on `403 PASSWORD_CHANGE_REQUIRED`).
- **Slugs are locked while published** (`409 SLUG_LOCKED_WHILE_PUBLISHED`) on posts, static pages and books — the slug field is read-only until "published" is unticked in the same save.
- **Scheduling**: `published_at` must carry an explicit UTC offset; the editor converts from the browser's local time (`src/lib/datetime.ts`). A post published now is stamped with the current time, and a past date on a draft is dropped.
- **Strict bodies and queries**: the Worker rejects unknown keys (`400`), so a stale field is a hard failure — send only documented fields. Search terms must be ≥ 2 characters after trimming (`useListPage` enforces it); boolean filters accept exactly `true` / `false`.
- **Rate limits are per minute** (Cloudflare Rate Limiting binding): 200/min/IP overall, 10/min on login, 60/min on uploads. A 429 is never retried automatically. The API sends `Retry-After`, but browsers hide it from cross-origin pages unless the server lists it in `Access-Control-Expose-Headers`, so the login-lockout message works with or without a number.
- **Contest**: the API answers `403 CONTEST_CLOSED` on `/start` and `/submit` unless the `contest_open` setting is `"true"`. Settings → «المسابقة» toggles it; the contest page shows its state. Attempt rows are `name` / `final_score` / `submitted_at` (the old docs named them differently).

---

## Authentication

Protected routes require a valid JWT stored in `localStorage` (`accessToken` / `refreshToken`). Token handling lives in `src/lib/api.ts`:

- On a 401, the client runs a **single-flight refresh** (`POST /auth/refresh`): concurrent 401s queue behind one refresh and replay with the new access token once it resolves.
- Refresh tokens **rotate** on every use. In multi-tab scenarios, losing the rotation race returns `AUTH_REFRESH_ALREADY_ROTATED` — the client re-reads the newer token another tab stored and retries once before giving up.
- A 401 on the refresh itself (invalid / reused / account disabled) wipes both tokens and redirects to `/login`. Transient network/5xx errors during refresh keep the tokens intact so a later request can recover.

---

## Deployment (Cloudflare Workers)

The CMS is a **static export** served by Workers Static Assets — the same setup as the public site (`imamzain.org`). It is a client-rendered app (JWT in `localStorage`, every API call made by the browser), so there is no server code, no middleware and no Worker script: `wrangler.jsonc` just points at `out/`.

```bash
bun run preview   # build + serve out/ locally with wrangler dev
bun run deploy    # build + wrangler deploy
```

- `public/_headers` makes the admin non-indexable and non-frameable and sets long-lived caching for hashed assets; `public/_redirects` sends `/` to `/dashboard`.
- Edit screens read the record from `?id=` (`/dashboard/posts/edit?id=…`, helpers in `src/lib/routes.ts`): a static export can only pre-render dynamic segments it knows at build time, never live UUIDs. Links to the old `/dashboard/<resource>/<id>` pages now 404.
- **CORS is the one coupling with the API.** Browsers can only call the API from an origin in its `ALLOWED_ORIGINS` (`worker/wrangler.jsonc` in the API repo; currently `https://imamzain.org`, `https://cms.imamzain.com`, `https://app.imamzain.org`). Whatever hostname the CMS is attached to **must be added there and the API Worker redeployed**, otherwise every request is blocked. The `*.workers.dev` URL can load the page but cannot log in for the same reason.
- **Service Bindings do not apply** here: they are for Worker-to-Worker calls, and the browser calls the API directly. If a server-side caller is ever added to this project, it must use a binding (`services: [{ binding: "API", service: "imamzain-api" }]`) and forward the visitor IP in `CF-Connecting-IP`, never `fetch()` the public URL from a Worker in the same zone.
- On a Linux/CI checkout (ASCII path) the build uses Turbopack; on a path containing non-ASCII characters (this repository's folder on Windows) it automatically uses webpack, because Turbopack 16 panics on such paths.

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
| `bun run build` | Static export to `out/` (pins the production API URL, guards against `localhost`, works around Turbopack's non-ASCII-path panic by using webpack) |
| `bun run preview` | Build, then serve `out/` locally with `wrangler dev` (as Workers will) |
| `bun run deploy` | Build, then `wrangler deploy` |
| `bun run check:limits` | Check `out/` against the Cloudflare Workers Free plan limits |
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
| `/dashboard/books` (+ `book-categories`, trash) | المكتبة | Books library (series cards, «إصدارات المؤسسة» filter) | `books:read/create/update/delete` |
| `/dashboard/papers` (+ `paper-categories`, trash) | الأبحاث | Academic papers | `academic-papers:read/create/update/delete` |
| `/dashboard/gallery` (+ `gallery-categories`, trash) | معرض الصور | Image gallery with upload | `gallery:read/create/update/delete` |
| `/dashboard/audios` (+ `speakers`, trash) | الصوتيات | Audio library + speakers | `audios:read/create/update/delete` |
| `/dashboard/static-pages` (+ trash) | الصفحات الثابتة | Static pages | `static-pages:read/create/update/delete` |
| `/dashboard/stores` (+ trash) | منافذ البيع | Sale points | `stores:create/update/delete` |
| `/dashboard/media` | مكتبة الوسائط | Raw media file library | `media:read/create/update/delete` |
| `/dashboard/daily-hadiths` (+ trash) | الأحاديث اليومية | Daily hadiths by Hijri day, today's Hijri date | `daily-hadiths:read/create/update/delete` |
| `/dashboard/contacts` (+ trash) | رسائل التواصل | Contact form inbox (status filter) | `forms:read` |
| `/dashboard/proxy-visits` (+ trash) | طلبات الزيارة | Proxy visit workflow (status filter) | `forms:read` |
| `/dashboard/newsletter` (+ trash) | النشرة البريدية | Subscribers (active / pending / unsubscribed) + CSV export | `newsletter:read` |
| `/dashboard/contest` | المسابقات | Contest attempt scores + open/closed state | `contest:read` |
| `/dashboard/users` (+ trash) | المستخدمون | Admin user & role management | `users:read` |
| `/dashboard/roles` | الأدوار والصلاحيات | Role & permission matrix | `roles:read` |
| `/dashboard/languages` | اللغات | Supported language codes | `languages:read` |
| `/dashboard/settings` | إعدادات الموقع | Site settings (key/value, typed values) | `settings:read` |
| `/dashboard/audit-logs` | سجلات التدقيق | Filterable audit trail | `audit-logs:read` |
| `/dashboard/profile` | حسابي | Own account + password change | always (authenticated) |
