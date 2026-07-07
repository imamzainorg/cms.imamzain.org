/**
 * Centralised query-key factory.
 *
 * Every resource declares its keys here so cache invalidation across files
 * stays type-safe. The convention is `[resource, kind, ...args]` — invalidating
 * `[resource]` invalidates everything for that resource, `[resource, 'list']`
 * invalidates every list page, etc.
 */

export const queryKeys = {
	posts: {
		all: ["posts"] as const,
		lists: () => [...queryKeys.posts.all, "list"] as const,
		list: (params: Record<string, unknown>) => [...queryKeys.posts.lists(), params] as const,
		detail: (id: string) => [...queryKeys.posts.all, "detail", id] as const,
	},
	postCategories: {
		all: ["post-categories"] as const,
		lists: () => [...queryKeys.postCategories.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.postCategories.lists(), params] as const,
	},
	books: {
		all: ["books"] as const,
		lists: () => [...queryKeys.books.all, "list"] as const,
		list: (params: Record<string, unknown>) => [...queryKeys.books.lists(), params] as const,
		detail: (id: string) => [...queryKeys.books.all, "detail", id] as const,
	},
	bookCategories: {
		all: ["book-categories"] as const,
		lists: () => [...queryKeys.bookCategories.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.bookCategories.lists(), params] as const,
	},
	papers: {
		all: ["papers"] as const,
		lists: () => [...queryKeys.papers.all, "list"] as const,
		list: (params: Record<string, unknown>) => [...queryKeys.papers.lists(), params] as const,
		detail: (id: string) => [...queryKeys.papers.all, "detail", id] as const,
	},
	paperCategories: {
		all: ["paper-categories"] as const,
		lists: () => [...queryKeys.paperCategories.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.paperCategories.lists(), params] as const,
	},
	users: {
		all: ["users"] as const,
		lists: () => [...queryKeys.users.all, "list"] as const,
		list: (params: Record<string, unknown>) => [...queryKeys.users.lists(), params] as const,
		detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
	},
	roles: {
		all: ["roles"] as const,
		lists: () => [...queryKeys.roles.all, "list"] as const,
		list: () => [...queryKeys.roles.lists()] as const,
		detail: (id: string) => [...queryKeys.roles.all, "detail", id] as const,
		permissions: () => [...queryKeys.roles.all, "permissions"] as const,
	},
	newsletter: {
		all: ["newsletter"] as const,
		lists: () => [...queryKeys.newsletter.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.newsletter.lists(), params] as const,
	},
	contacts: {
		all: ["contacts"] as const,
		lists: () => [...queryKeys.contacts.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.contacts.lists(), params] as const,
	},
	media: {
		all: ["media"] as const,
		lists: () => [...queryKeys.media.all, "list"] as const,
		list: (params: Record<string, unknown>) => [...queryKeys.media.lists(), params] as const,
		detail: (id: string) => [...queryKeys.media.all, "detail", id] as const,
	},
	gallery: {
		all: ["gallery"] as const,
		lists: () => [...queryKeys.gallery.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.gallery.lists(), params] as const,
		detail: (id: string) => [...queryKeys.gallery.all, "detail", id] as const,
	},
	galleryCategories: {
		all: ["gallery-categories"] as const,
		lists: () => [...queryKeys.galleryCategories.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.galleryCategories.lists(), params] as const,
	},
	proxyVisits: {
		all: ["proxy-visits"] as const,
		lists: () => [...queryKeys.proxyVisits.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.proxyVisits.lists(), params] as const,
	},
	auditLogs: {
		all: ["audit-logs"] as const,
		lists: () => [...queryKeys.auditLogs.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.auditLogs.lists(), params] as const,
	},
	languages: {
		all: ["languages"] as const,
		lists: () => [...queryKeys.languages.all, "list"] as const,
		allLanguages: () => [...queryKeys.languages.all, "all"] as const,
		active: () => [...queryKeys.languages.all, "active"] as const,
	},
	contest: {
		all: ["contest"] as const,
		attempts: () => [...queryKeys.contest.all, "attempts"] as const,
		attemptsList: (params: Record<string, unknown>) =>
			[...queryKeys.contest.attempts(), params] as const,
	},
	dashboard: {
		all: ["dashboard"] as const,
		stats: () => [...queryKeys.dashboard.all, "stats"] as const,
	},
	settings: {
		all: ["settings"] as const,
		list: () => [...queryKeys.settings.all, "list"] as const,
		key: (k: string) => [...queryKeys.settings.all, "key", k] as const,
	},
	dailyHadiths: {
		all: ["daily-hadiths"] as const,
		lists: () => [...queryKeys.dailyHadiths.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.dailyHadiths.lists(), params] as const,
		detail: (id: string) => [...queryKeys.dailyHadiths.all, "detail", id] as const,
		today: () => [...queryKeys.dailyHadiths.all, "today"] as const,
		pins: () => [...queryKeys.dailyHadiths.all, "pins"] as const,
	},
	campaigns: {
		all: ["campaigns"] as const,
		lists: () => [...queryKeys.campaigns.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.campaigns.lists(), params] as const,
		detail: (id: string) => [...queryKeys.campaigns.all, "detail", id] as const,
	},
	staticPages: {
		all: ["static-pages"] as const,
		lists: () => [...queryKeys.staticPages.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.staticPages.lists(), params] as const,
		detail: (id: string) => [...queryKeys.staticPages.all, "detail", id] as const,
	},
	stores: {
		all: ["stores"] as const,
		lists: () => [...queryKeys.stores.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.stores.lists(), params] as const,
		detail: (id: string) => [...queryKeys.stores.all, "detail", id] as const,
	},
	audios: {
		all: ["audios"] as const,
		lists: () => [...queryKeys.audios.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.audios.lists(), params] as const,
		detail: (id: string) => [...queryKeys.audios.all, "detail", id] as const,
	},
	speakers: {
		all: ["speakers"] as const,
		lists: () => [...queryKeys.speakers.all, "list"] as const,
		list: (params: Record<string, unknown>) =>
			[...queryKeys.speakers.lists(), params] as const,
		detail: (id: string) => [...queryKeys.speakers.all, "detail", id] as const,
	},
	trash: {
		all: ["trash"] as const,
		resource: (resource: string, params: Record<string, unknown>) =>
			[...queryKeys.trash.all, resource, params] as const,
	},
} as const
