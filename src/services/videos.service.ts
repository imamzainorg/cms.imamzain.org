import { api } from "@/lib/api"
import type { PaginatedResponse } from "@/types"
import type { AdminVideo, VideoKind, VideoStatus, VideoUpdateBody } from "@/types/videos"

export const videosService = {
	// Needs `videos:read`. Status/kind filters and `search` (title/description) are applied server-side.
	list: (params?: {
		page?: number
		limit?: number
		status?: VideoStatus
		kind?: VideoKind
		search?: string
	}) => api.get<PaginatedResponse<AdminVideo>>("/videos/admin", { params }),

	// Needs `videos:update`. 409 SLUG_LOCKED_WHILE_PUBLISHED when renaming a published video.
	update: (videoId: string, body: VideoUpdateBody) =>
		api.patch<AdminVideo>(`/videos/admin/${encodeURIComponent(videoId)}`, body),
}
