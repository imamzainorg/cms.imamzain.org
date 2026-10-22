/**
 * Edit screens take the record id from `?id=` instead of a `[id]` path
 * segment. The CMS ships as a static export on Cloudflare Workers (no server
 * to resolve arbitrary ids), and a static export can only pre-render dynamic
 * segments it knows at build time — never the UUIDs of live content.
 *
 * Always build these links with the helpers so the scheme lives in one place.
 */
const q = (id: string) => `?id=${encodeURIComponent(id)}`

export const editHref = {
	post: (id: string) => `/dashboard/posts/edit${q(id)}`,
	book: (id: string) => `/dashboard/books/edit${q(id)}`,
	paper: (id: string) => `/dashboard/papers/edit${q(id)}`,
	audio: (id: string) => `/dashboard/audios/edit${q(id)}`,
	staticPage: (id: string) => `/dashboard/static-pages/edit${q(id)}`,
} as const
