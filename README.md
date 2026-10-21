# cms.imamzain.org

The content-management dashboard for [imamzain.org](https://imamzain.org) — the
admin interface the **Imam Zayn al-Abidin (as) Foundation** uses to publish and
curate everything on its public website.

## What it manages

- **Content** — posts, pages, and the foundation's news and activities, with
  rich-text editing and per-language translations.
- **Digital library** — books and academic papers, their metadata, and files.
- **Media** — the image gallery and the audio recitations library.
- **Forms** — incoming contact messages and proxy-visitation (نيابة الزيارة)
  requests.
- **Knowledge contest** administration.
- **Users, roles, and settings** — role-based access control and editable site
  settings, including super-admin-only configuration.

## Scope & architecture

- A **Next.js** (App Router) single-admin app written in **TypeScript**, styled
  with **Tailwind CSS**.
- Server state via **TanStack Query**, client/auth state via **Zustand**, forms
  with **React Hook Form** + **Zod**, rich text with **TipTap**.
- Authenticates against and drives the
  [ImamZain API](https://github.com/imamzainorg/api.imamzain.org) over REST (JWT).
