import { api } from "@/lib/api"
import type { Post, PaginatedResponse } from "@/types"

type TranslationInput = {
	lang: string
	title: string
	summary?: string
	body: string
	is_default: boolean
	meta_title?: string
	meta_description?: string
	og_image_id?: string | null
}

export const postsService = {
	list: (params?: {
		page?: number
		limit?: number
		category_id?: string
		search?: string
		status?: "draft" | "scheduled" | "published" | "all"
		featured?: boolean
		sort?: "newest" | "views"
	}) => api.get<PaginatedResponse<Post>>("/posts/admin", { params }),

	get: (id: string) => api.get<Post>(`/posts/admin/${id}`),

	create: (body: {
		category_id: string
		cover_image_id?: string | null
		slug: string
		is_published?: boolean
		is_featured?: boolean
		// ISO instant WITH an offset (Z or ±hh:mm) — an offset-less value is a 400.
		published_at?: string | null
		translations: TranslationInput[]
		attachment_ids?: string[]
	}) => api.post<Post>("/posts", body),

	update: (id: string, body: Partial<{
		category_id: string
		cover_image_id: string | null
		slug: string
		is_published: boolean
		is_featured: boolean
		// null clears a schedule; undefined leaves it alone.
		published_at: string | null
		translations: TranslationInput[]
		attachment_ids: string[]
	}>) => api.patch<Post>(`/posts/${id}`, body),

	// Idempotent: asking for the state the post is already in is a 200 no-op.
	// Unpublishing clears `published_at`; to cancel a schedule on a draft use
	// update({ published_at: null }) instead.
	togglePublish: (id: string, is_published: boolean) =>
		api.patch<Post>(`/posts/${id}/publish`, { is_published }),

	remove: (id: string) => api.delete(`/posts/${id}`),

	// Soft-delete trash + restore
	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<Post>>("/posts/trash", { params }),

	restore: (id: string) => api.post<Post>(`/posts/${id}/restore`),

	// Bulk operations (max 200 ids per call)
	bulkPublish: (ids: string[], is_published: boolean) =>
		api.post<{ affected: number; skipped: string[] }>("/posts/bulk/publish", { ids, is_published }),

	bulkDelete: (ids: string[]) =>
		api.post<{ affected: number; skipped: string[] }>("/posts/bulk/delete", { ids }),
}
