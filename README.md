# cms.imamzain.org

Admin CMS for [imamzain.org](https://imamzain.org) — Islamic content management, digital library, gallery, forms, and contest administration.

Built with **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS 4**, and **Zustand**.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + CSS variables |
| State | Zustand 5 |
| Forms | React Hook Form 7 + Zod 4 |
| HTTP | Axios 1 |
| Dates | date-fns 4 |
| Icons | Lucide React |
| Notifications | Sonner |
| Testing | Vitest 4 + MSW 2 + Testing Library |

---

## Prerequisites

- **Node.js** ≥ 18 or **Bun** ≥ 1.3
- The backend API running locally (default: `http://localhost:3000`)

---

## Getting started

```bash
# Install dependencies
bun install

# Start the dev server (runs on port 3001, leaving 3000 for the API)
bun dev

# Open in browser
open http://localhost:3001
```

---

## Environment variables

| Variable | Dev default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Backend API base URL |

Create a `.env.local` file at the project root (already gitignored) to override values locally.

---

## Project structure

```
src/
├── app/
│   ├── (auth)/login/           Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx          Dashboard shell (auth gate)
│   │   └── dashboard/
│   │       ├── page.tsx        Overview / stat cards
│   │       ├── posts/          Posts CRUD
│   │       ├── books/          Books CRUD
│   │       ├── papers/         Academic papers CRUD
│   │       ├── gallery/        Image gallery (upload → gallery)
│   │       ├── media/          Raw media library
│   │       ├── contacts/       Contact form submissions
│   │       ├── proxy-visits/   Proxy visit requests
│   │       ├── newsletter/     Newsletter subscribers
│   │       ├── contest/        Contest attempt review
│   │       ├── users/          Admin user management
│   │       ├── roles/          Role & permission matrix
│   │       ├── languages/      Supported languages
│   │       ├── audit-logs/     Audit log viewer
│   │       └── settings/       Password change
│   ├── error.tsx / global-error.tsx / loading.tsx / not-found.tsx
│   └── page.tsx                Redirects / → /dashboard
│
├── components/
│   ├── layout/                 Sidebar, Header, ClientOnly
│   ├── posts/PostForm.tsx
│   ├── books/BookForm.tsx
│   ├── papers/PaperForm.tsx
│   └── ui/                     Button, Input, Card, Badge
│
├── services/                   All API calls, one file per resource
│   ├── posts.service.ts
│   ├── books.service.ts
│   ├── papers.service.ts
│   ├── media.service.ts        Two-step R2 upload helper
│   ├── gallery.service.ts
│   ├── contacts.service.ts
│   ├── proxy-visits.service.ts
│   ├── newsletter.service.ts
│   ├── users.service.ts
│   ├── roles.service.ts
│   ├── languages.service.ts
│   ├── audit-logs.service.ts
│   └── contest.service.ts
│
├── store/auth.ts               Zustand auth store (login/logout/checkAuth)
├── types/index.ts              All TypeScript types (snake_case, API-aligned)
└── lib/api.ts                  Axios instance with JWT interceptor
```

---

## API alignment

The CMS consumes the imamzain.org REST API at `/api/v1/...`. Key design decisions:

- **Auth** uses `username` + `password` (not email). JWT stored in `localStorage`.
- **Admin post listing** uses `GET /posts/admin` to include unpublished drafts.
- **Media upload** is a two-step flow: `POST /media/upload-url` → PUT to R2 → `POST /media/confirm`.
- **Gallery images** are separate records linked to media via `media_id`.
- **Contacts & proxy visits** live under `GET /forms/contacts` and `GET /forms/proxy-visits`.
- **Newsletter toggle** uses `POST /newsletter/subscribe` or `POST /newsletter/unsubscribe` by email.
- All write operations use `PATCH` (not `PUT`), matching the API spec.
- All field names are **snake_case** throughout (matching API responses directly).

---

## Authentication

Protected routes require a valid JWT stored in `localStorage` under the key `accessToken`. On a 401 response the token is cleared and the user is redirected to `/login`. There is no refresh-token flow — re-login is required on expiry.

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
├── mocks/
│   ├── handlers.ts             Default MSW request handlers
│   └── server.ts               MSW node server
├── unit/
│   ├── auth.store.test.ts
│   ├── posts.service.test.ts
│   ├── newsletter.service.test.ts
│   └── contacts.service.test.ts
└── integration/
    ├── books-papers.test.ts
    └── media-upload.test.ts
```

---

## Available scripts

| Script | Description |
|---|---|
| `bun dev` | Start dev server on port 3001 |
| `bun run build` | Production build |
| `bun run start` | Serve production build |
| `bun run test` | Run all tests once |
| `bun run test:watch` | Vitest watch mode |
| `bun run test:coverage` | Tests with coverage |
| `bun run lint` | ESLint check |

---

## CMS pages quick reference

| Path | Purpose | Permission required |
|---|---|---|
| `/dashboard` | Stats overview | authenticated |
| `/dashboard/posts` | Posts list + publish toggle | `posts:read` |
| `/dashboard/books` | Books library | `books:read` |
| `/dashboard/papers` | Academic papers | `academic-papers:read` |
| `/dashboard/gallery` | Image gallery with upload | `gallery:*` |
| `/dashboard/media` | Raw media file library | `media:read` |
| `/dashboard/contacts` | Contact form inbox | `forms:read` |
| `/dashboard/proxy-visits` | Proxy visit workflow | `forms:read` |
| `/dashboard/newsletter` | Subscriber list + CSV export | `newsletter:read` |
| `/dashboard/contest` | Contest attempt scores | `contest:read` |
| `/dashboard/users` | Admin user & role management | `users:read` |
| `/dashboard/roles` | Role & permission matrix | `roles:read` |
| `/dashboard/languages` | Supported language codes | `languages:read` |
| `/dashboard/audit-logs` | Filterable audit trail | `audit-logs:read` |
| `/dashboard/settings` | Change own password | authenticated |