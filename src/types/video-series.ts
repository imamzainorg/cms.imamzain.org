// Video series (YouTube playlists) + video settings wire shapes. Source of truth:
// api.imamzain.org worker/src/features/videos/{routes,schemas,service}.ts
// (GET/PATCH /videos/admin/series, GET/PUT /videos/admin/settings).

/** The site's four video sections (owner decision 4). `null` = not assigned yet. */
export type VideoSeriesSection = "programmes" | "commentaries" | "majalis" | "events"

export type VideoSeries = {
	/** Public URL segment. Locked while the series is public. */
	slug: string
	/** YouTube playlist id: the key every admin call uses. */
	playlist_id: string
	/** Title, description and thumbnail come from YouTube. Read-only here. */
	title: string
	description: string | null
	thumbnail_url: string | null
	section: VideoSeriesSection | null
	speaker: { id: string; name: string | null } | null
	/** Videos the API holds for this playlist (every status, shorts and live included). */
	video_count: number
	latest_published_at: string | null
	is_hidden: boolean
	display_order: number
	speaker_id: string | null
	/** The playlist's own item count on YouTube. */
	item_count: number | null
	updated_at: string
}

/** PATCH body: send only what changed. `null` clears `section` / `speaker_id`. */
export type UpdateVideoSeries = {
	slug?: string
	section?: VideoSeriesSection | null
	is_hidden?: boolean
	display_order?: number
	speaker_id?: string | null
}

export type VideoSettings = {
	/** On: new YouTube uploads go live by themselves. Off: they wait as pending. */
	auto_publish: boolean
}
