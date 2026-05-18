import { api } from "@/lib/api"
import type { Post, PaginatedResponse } from "@/types"

type TranslationInput = {
	lang: string
	title: string
	summary?: string
	body: string
	slug: string
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

	getBySlug: (slug: string) => api.get<Post>(`/posts/by-slug/${slug}`),

	create: (body: {
		category_id: string
		cover_image_id?: string | null
		is_published?: boolean
		is_featured?: boolean
		published_at?: string
		translations: TranslationInput[]
		attachment_ids?: string[]
	}) => api.post<Post>("/posts", body),

	update: (id: string, body: Partial<{
		category_id: string
		cover_image_id: string | null
		is_published: boolean
		is_featured: boolean
		published_at: string
		translations: TranslationInput[]
		attachment_ids: string[]
	}>) => api.patch<Post>(`/posts/${id}`, body),

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
