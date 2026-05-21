# Design brief — Imam Zain Alabideen CMS (admin panel)

> Hand this whole document to the design model in a fresh conversation. Don't summarize it — let it read everything before you ask for work.

---

## 1. What this project is

A **content management admin panel** for مؤسسة الإمام زين العابدين للبحوث والدراسات (the Imam Zain Alabideen Foundation for Research and Studies) — a religious / scholarly institution publishing posts, books, academic papers, image galleries, daily hadiths, and managing reader-facing forms (contacts, proxy-visit requests, newsletter, contests).

This repo is the **admin CMS only**, not the public reader site. Operators (content editors, researchers, admins) live in this dashboard daily.

Tech stack — **do not migrate any of this**:

- Next.js 16 (App Router), React 19, React Compiler
- Tailwind CSS **v4** (uses `@theme` and CSS-variable tokens, not v3 config)
- TanStack Query, Zustand, react-hook-form + zod
- Lucide icons, Sonner toasts, TipTap rich-text editor
- Fonts already wired: **Noto Naskh Arabic** (body, via `--font-arabic`) + **Inter** (Latin fallback, via `--font-latin`)

## 2. Audience and use case

- **Primary users:** Arabic-speaking content editors and admins. Power users who open this every day, often for hours.
- **Language:** Arabic by default. RTL is non-negotiable: `<html lang="ar" dir="rtl">`, sidebar on the **right**, content area uses `lg:pr-64`, all microcopy in Arabic.
- **Numerals:** Eastern Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) for human-facing counts via `toLocaleString("ar-EG")`; Latin tabular numerals (`tabular-nums`) for stat cards / table sorts to keep widths aligned.
- **Dates:** `dd/MM/yyyy` via `date-fns`.

## 3. Existing brand foundation (preserve these)

These are locked in `src/app/globals.css` via Tailwind v4 `@theme`. Build on them, do not redefine them:

| Token | Value | Role |
|---|---|---|
| `--primary` | `hsl(169 100% 20%)` (`#006654`) | Deep emerald — primary brand |
| `--secondary` | `hsl(35 40% 56%)` (`#bb9661`) | Warm gold — accent |
| `--background` | `hsl(210 25% 98%)` | App background |
| `--surface` / `--surface-muted` | white / very light cool gray | Cards and recessed surfaces |
| `--accent` | `hsl(169 35% 94%)` | Soft emerald wash |
| `--radius` | `0.625rem` | Base radius |

Custom shadows already exist and are good — keep using these:

- `--shadow-soft`, `--shadow-raise`, `--shadow-pop` — brand-tinted instead of OS gray drop.

Custom utilities already in `globals.css`:

- `.surface-soft` — gradient-fill panel for toolbars and filter bars
- `.divider-brand` — emerald→gold gradient hairline
- `.shimmer` — replaces `animate-pulse` for skeletons
- `.animate-fade-in`, `.animate-scale-in`, `.animate-slide-up` — entry motion

The body has subtle radial-gradient orbs (primary at top-left, secondary at top-right) on a `surface-muted` ground. Keep this.

## 4. Design direction we want

**Two-word identity: "scholarly density" + "spiritual warmth."**

The CMS should feel like a tool that **belongs to a religious-research institution**, not a generic SaaS dashboard tinted green. It should also feel **made for a power user** — information-dense, fast to scan, no wasted space — without feeling cramped.

### What "spiritual warmth" should mean concretely

- **A second display typeface for Arabic headlines.** Body stays Noto Naskh. Headlines (page titles, hero, section labels) get a more expressive Arabic display face — propose options from: **Reem Kufi**, **Markazi Text**, **Aref Ruqaa**, **Amiri Quran**, or **Cairo Display**. Pair with weight contrast (Naskh 400 body, display 600/700 headings).
- **Islamic geometric ornament as background texture**, not decoration on top of content. Very low opacity (3–6%), used in heroes, empty states, login screen, and section dividers. Eight-pointed star tessellation or arabesque interlace patterns — not literal mosque imagery.
- **Calligraphic dividers** between major page sections — keep `.divider-brand` but introduce a richer "ornament-divider" variant with a centered medallion/glyph.
- **Gold (`--secondary`) used sparingly and meaningfully** — for featured/starred items, premium status, decorative accents in hero medallions. Never as a button fill except for premium-action CTAs.
- **Empty states with character** — replace generic Lucide icons with single-stroke Arabic-art-inspired illustrations (a closed book, an open scroll, a lantern, a manuscript stack). Keep them monoline and brand-tinted.

### What "scholarly density" should mean concretely

- **Table-first over card-grid for content lists** where the list is operational (editors scanning 50 posts). Posts page currently uses a 3-column card grid — propose a denser table view as the default with an optional card-grid toggle. Tables should have: zebra-striping in `--surface-muted`, sticky header, row hover, inline status pill, inline action buttons, multi-select column.
- **Tighter vertical rhythm** in forms — reduce default field height from `py-2` to `py-1.5`, label-to-input spacing from `space-y-2` to `space-y-1`, but keep a clear `space-y-6` between field groups.
- **Sticky sub-headers** for filter bars (already partially done — make it the standard pattern across all list pages).
- **Keyboard-first affordances** — visible focus rings (already wired), `kbd` chip styling for shortcuts, command-palette pattern (`Cmd+K`) opening from header to jump between sections and create new content.
- **Numeric clarity** — every count, page total, view count uses `tabular-nums`; long Arabic-Indic numerals use letter-spacing tightening.

### What we are NOT going for

- ❌ SaaS-startup minimalism (Linear/Vercel/Notion). That's too cold for a religious institution and too sparse for daily operators.
- ❌ Literal mosque/dome imagery, photo backgrounds of holy sites, or anything that risks looking devotional-kitsch.
- ❌ Skeuomorphic Arabic-manuscript pastiche (parchment textures, fake gold leaf, ornate borders on everything). Restraint is part of the dignity.
- ❌ Dark mode (not in scope yet — focus on light theme).

## 5. Surface inventory (what exists)

### Global chrome

- `src/app/layout.tsx` — root HTML (RTL, fonts, providers)
- `src/components/layout/Sidebar.tsx` — right-side fixed nav, 4 grouped sections, expandable sub-items
- `src/components/layout/Header.tsx` — top bar
- `src/components/layout/PageHeader.tsx` — page title + description + actions

### Sidebar groups (Arabic labels)

1. **نظرة عامة** (Overview) — Dashboard home
2. **المحتوى** (Content) — Posts, Books, Papers, Gallery, Media library, Daily hadiths — each with sub-items (all / categories / trash)
3. **النماذج والتفاعل** (Forms & engagement) — Contacts, Proxy-visits, Newsletter (+ campaigns), Contests
4. **الإدارة** (Administration) — Users, Roles & permissions, Languages, Site settings, Audit logs, Profile

### Pages that need redesign attention (in priority order)

| # | Page | Path | Pattern today | Notes |
|---|---|---|---|---|
| 1 | Dashboard home | `/dashboard` | Animated gradient hero + 4 content stat cards + 3 action cards + recent-posts list | The hero is the strongest existing piece. Stat cards are colorful but generic |
| 2 | Posts list | `/dashboard/posts` | 3-col card grid with hover-lift cards, filter toolbar, bulk-action sticky bar | Most operationally-used page. Card grid feels under-dense |
| 3 | Books / Papers / Gallery lists | parallel | Same card pattern as posts | Should share a denser table primitive |
| 4 | Post / Book / Paper forms | `/dashboard/{type}/new` and `/[id]` | Multi-section form with translation tabs, rich text, media picker | TipTap editor chrome is generic — needs brand polish |
| 5 | Login | `/login` | Centered card | Best opportunity for a strong first impression — pattern, ornament, calligraphic logo treatment |
| 6 | Inbox pages (Contacts, Proxy-visits, Newsletter, Campaigns, Contest) | various | Tables + drawers | Genuinely tabular — set the density bar here |
| 7 | Users / Roles / Settings | various | Admin tables + forms | |
| 8 | Audit logs | `/dashboard/audit-logs` | Timeline list | Already uses Naskh-correct rendering — preserve, beautify the timeline |
| 9 | Trash pages | `*/trash` | List with restore action | Should look subdued (less saturated) to signal "removed" |

### Shared UI primitives (in `src/components/ui/`)

`Button.tsx`, `Input.tsx`, `Card.tsx`, `Badge.tsx`, `Modal.tsx`, `Skeleton.tsx`, `Pagination.tsx`, `EmptyState.tsx`, `ConfirmDialog.tsx`, `MediaPicker.tsx`, `MediaInput.tsx`, `RichTextEditor.tsx` — these define the system. Redesign work should land here first, then propagate.

## 6. The specific weakness to fix

> "It looks polished but generic — like any Tailwind dashboard tinted green."

Concretely:

1. **No typographic identity.** Headlines and body use the same family at different sizes. There's no display face that signals "Islamic scholarship."
2. **Ornament is missing.** The brand is two colors and a logo. Nothing in the chrome says this institution publishes religious / academic content.
3. **The hero is good, the rest is conventional.** Stat cards are pastel-Tailwind-tinted boxes. Empty states are Lucide icon + text. Sidebar sections are h3 + items — no visual rhythm between groups.
4. **Card-grid for everything.** Posts, books, papers, gallery all use the same card pattern. A power user wants table density, not a Pinterest board.
5. **Status colors don't tell a story.** Published is green, draft is gray, scheduled is blue — fine, but disconnected from the brand. Could be tonal variants of the brand palette + the warm gold.

## 7. Constraints — do not violate these

- Keep Arabic-first / RTL. No layouts that depend on `ltr` flow.
- Stay on Tailwind v4. No v3 `tailwind.config.js`, no PostCSS plugins beyond `@tailwindcss/postcss`.
- Do not rename routes, components, or service files — those are wired to API queries and tests.
- Do not change the API envelope handling in `src/lib/api.ts` or the query keys in `src/lib/queries/keys.ts`.
- Do not introduce a component library (no shadcn/ui, Radix, Mantine). The primitives in `src/components/ui/` stay handwritten — improve them in place.
- Preserve all Arabic microcopy verbatim unless rewording is part of the brief. If you propose a copy change, flag it inline so we can review.
- All work must pass existing Vitest tests (`npm test`). If a test is genuinely outdated by a redesign, update it — don't delete it.

## 8. What we want you to produce

Work in **this order** so we can review and course-correct early:

### Step 1 — Design system overhaul (one PR worth of changes)

- Update `src/app/globals.css`:
  - Introduce a display Arabic font (propose Reem Kufi or Markazi Text; wire via `next/font/google` in `layout.tsx` as `--font-display`).
  - Add token roles we don't have yet: `--ornament` color, `--surface-elevated`, `--ring-strong`, `--success`, `--warning`, `--info` (tonal variants of brand, not raw greens/ambers/blues).
  - Add an SVG geometric-pattern utility (`.ornament-tile`) with very low opacity (3–6%) usable as a `bg-` on heroes, empty states, login.
  - Add an `.ornament-divider` (centered medallion variant of `.divider-brand`).
- Update the UI primitives (`Button`, `Input`, `Card`, `Badge`, `Modal`, `EmptyState`) to use the new tokens and the display face on headings.
- Provide a single "design tokens" markdown table summarizing what changed and why.

### Step 2 — Redesign the dashboard home (`/dashboard`)

- Keep the hero, refine it (less gradient-orb, more geometric ornament; calligraphic greeting).
- Replace the 4 pastel-tinted stat cards with a denser, more brand-coherent stat row.
- Replace the 3 colorful action cards with an "inbox" panel that lists items needing attention as rows, not boxes.
- Beautify the recent-posts list (better typography hierarchy, ornament-divider between header and items).

### Step 3 — Redesign the Posts list (`/dashboard/posts`)

- Convert default view to a **dense table**. Add a card-grid toggle in the toolbar.
- Polish the filter toolbar — keep `.surface-soft`, add brand-coherent sticky behavior.
- Improve the bulk-action sticky bar.
- Apply the same table primitive to Books, Papers, Gallery in follow-up.

### Step 4 — Login page

- Make it the visual flagship. Half-pane geometric ornament, calligraphic logo, restrained form. This is where first impressions land.

### Step 5 — Document the system

- Write a short `DESIGN_SYSTEM.md` covering: type scale, color tokens, spacing, ornament usage, component-by-component rules. Keep it under 300 lines. This becomes the contract for future work.

For each step:

- Open the actual files and **edit them** — don't propose snippets in isolation.
- Run `npm run dev` (port 3002) and walk through the changed surfaces in a browser before reporting done.
- If anything you change has tests in `__tests__/`, run `npm test` and fix or update them.
- After each step, summarize **what changed, why, and what's worth reviewing first** in 5–8 bullets. Then stop and wait for feedback before starting the next step.

## 9. Quality bar — when is this "done"

A first-time visitor to the admin should, within 5 seconds, sense:

1. This is an **Arabic-first, religious-scholarly** tool — not a generic SaaS.
2. It's **for daily operators** — dense, fast, keyboard-friendly.
3. It's **made with care** — type, spacing, ornament, and motion all feel intentional and consistent.

If two of those three aren't true after Step 5, we keep iterating.

---

## Open questions for you to ask before starting

(Don't assume — ask these back to me at the start of the conversation.)

1. Display font preference — Reem Kufi, Markazi Text, Aref Ruqaa, or do you want to see all three side-by-side first?
2. Ornament style — eight-pointed star tessellation, arabesque interlace, or moucharaby lattice?
3. Density default — should the Posts table be default, or card-grid default with a table toggle?
4. Scope of Step 1 — should I refactor every primitive in `src/components/ui/`, or only the ones used on the priority pages?
