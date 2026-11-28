/**
 * Editorial layer over the YouTube mirror (API `/videos/admin`). Title,
 * description, thumbnail and episode order come from YouTube and are
 * read-only here by owner decision; only the fields in `VideoUpdateBody`
 * can be changed from the CMS.
 */

export type VideoStatus = "published" | "pending" | "hidden"
export type VideoKind = "video" | "short"

export type VideoSpeakerRef = {
	id: string
	/** Resolved against the request language; null when the speaker has no usable translation. */
	name: string | null
}

export type VideoSeriesRef = {
	slug: string
	title: string
}

export type AdminVideo = {
	/** YouTube video id; the key every admin write uses. */
	video_id: string
	slug: string
	kind: VideoKind
	title: string
	description: string | null
	thumbnail_url: string | null
	published_at: string | null
	/** ISO 8601 duration as YouTube reports it (`PT1H2M3S`). */
	duration: string | null
	view_count: number | null
	is_featured: boolean
	speaker: VideoSpeakerRef | null
	series: VideoSeriesRef[]
	status: VideoStatus
	featured_order: number
	speaker_id: string | null
	updated_at: string
}

export type VideoUpdateBody = {
	status?: VideoStatus
	is_featured?: boolean
	featured_order?: number
	/** `null` clears the speaker; omit to leave it. */
	speaker_id?: string | null
	slug?: string
}
