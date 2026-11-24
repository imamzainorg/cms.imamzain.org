import { api } from "@/lib/api"
import type { UpdateVideoSeries, VideoSeries, VideoSettings } from "@/types/video-series"

export const videoSeriesService = {
	// Every playlist, hidden ones included, in the editor's order. Not paginated.
	list: () => api.get<VideoSeries[]>("/videos/admin/series"),

	// Answers with the updated series (shaped like a list row).
	update: (playlistId: string, body: UpdateVideoSeries) =>
		api.patch<VideoSeries | null>(
			`/videos/admin/series/${encodeURIComponent(playlistId)}`,
			body,
		),

	getSettings: () => api.get<VideoSettings>("/videos/admin/settings"),

	updateSettings: (body: VideoSettings) =>
		api.put<VideoSettings>("/videos/admin/settings", body),
}
