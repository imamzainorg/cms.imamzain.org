export type MediaVariant = {
	width: number
	url: string
	file_size: number
	format: "webp"
}

/**
 * Slim variant shape embedded on content payloads (posts, books, gallery …) —
 * the API's MEDIA_VARIANT_SELECT: { id, width, url, format }. Unlike the full
 * rows the /media endpoints return, there is no `file_size`.
 */
export type EmbeddedMediaVariant = Pick<MediaVariant, "width" | "url" | "format"> & {
	id?: string
}

export type MediaRecord = {
	id: string
	filename: string
	url: string
	mime_type: string
	file_size: number
	alt_text: string | null
	width: number | null
	height: number | null
	created_at: string
	/**
	 * Pre-baked WebP variants at 320 / 768 / 1280 / 1920 px widths. Always present
	 * but may be empty: confirm returns `[]` and the sharp pipeline populates
	 * out-of-band (round 15.4). If still empty after the upload poll-window,
	 * call POST /media/:id/regenerate-variants.
	 */
	variants: MediaVariant[]
}

export type EmbeddedMedia = {
	id: string
	filename?: string
	alt_text?: string | null
	url: string
	mime_type?: string
	file_size?: number
	width?: number | null
	height?: number | null
	created_at?: string
	/**
	 * On content payloads (posts, books, …) the API keeps the Prisma relation
	 * name `media_variants` — only the /media endpoints remap to `variants`.
	 */
	media_variants?: EmbeddedMediaVariant[]
}
