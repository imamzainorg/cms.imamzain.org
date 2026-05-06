import { api } from "@/lib/api"
import type { Post, PostCategory, PaginatedResponse } from "@/types"

export const postsService = {
	list: (params?: { page?: number; limit?: number; category_id?: string; search?: string }) =>
		api.get<PaginatedResponse<Post>>("/posts/admin", { params }),

	get: (id: string) => api.get<Post>(`/posts/${id}`),

	getBySlug: (slug: string) => api.get<Post>(`/posts/by-slug/${slug}`),

	create: (body: {
		category_id: string
		cover_image_id?: string
		is_published?: boolean
		published_at?: string
		translations: {
			lang: string
			title: string
			summary?: string
			body: string
			slug: string
			is_default: boolean
		}[]
		attachment_ids?: string[]
	}) => api.post<Post>("/posts", body),

	update: (id: string, body: Partial<{
		category_id: string
		cover_image_id: string
		is_published: boolean
		published_at: string
		translations: {
			lang: string
			title: string
			summary?: string
			body: string
			slug: string
			is_default: boolean
		}[]
		attachment_ids: string[]
	}>) => api.patch<Post>(`/posts/${id}`, body),

	togglePublish: (id: string, is_published: boolean) =>
		api.patch<Post>(`/posts/${id}/publish`, { is_published }),

	remove: (id: string) => api.delete(`/posts/${id}`),

	listCategories: () => api.get<PaginatedResponse<PostCategory>>("/post-categories"),
}
