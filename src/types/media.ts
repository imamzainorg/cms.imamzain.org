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

/**
 * Where a media row is in getting its WebP variants. DERIVED by the API at
 * read time (not stored) from the original's width and the variant rows that
 * exist — always compare this, never `variants.length` (a 1200 px original
 * legitimately has two variants, an animated GIF has none).
 *
 * - ready          every planned width has a variant → render a srcset
 * - processing     some missing and the upload is under 2 minutes old → keep polling
 * - partial        still missing after 2 minutes → generation failed; offer "Regenerate"
 * - unavailable    none can ever be produced (see variants_status_reason) → use the original
 * - not_applicable animated GIF or non-raster → use the original
 */
export type VariantsStatus = "ready" | "processing" | "partial" | "unavailable" | "not_applicable"

export type VariantsStatusReason =
	| "TOO_SMALL"
	| "ORIGINAL_MISSING"
	| "UNREADABLE"
	| "ANIMATED"
	| "NON_RASTER"
	| "GENERATION_INCOMPLETE"

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
	 * Pre-baked WebP variants (320 / 768 / 1280 / 1920 px, never up-scaled).
	 * Always present but may be empty or short: confirm returns `[]` and the
	 * Cloudflare Images pass fills them in within seconds. Judge completeness
	 * with `variants_status`, not the array length.
	 */
	variants: MediaVariant[]
	/** Widths this original should get; `[]` when none apply. Absent on `PATCH /media/:id` (bare row). */
	planned_widths?: number[]
	/** Absent on `PATCH /media/:id`, which returns the bare row. */
	variants_status?: VariantsStatus
	variants_status_reason?: VariantsStatusReason
}

/** `GET /media/:id/references` — what still points at a media file. */
export type MediaReferenceType = "post" | "book" | "static_page" | "gallery_image"

export type MediaReference = {
	type: MediaReferenceType
	id: string
	/** cover_image, og_image, attachment, gallery_item */
	field: string
	lang?: string
	/** The holder is in the trash — it keeps the reference until its image is changed. */
	trashed: boolean
}

export type MediaReferences = {
	media_id: string
	total: number
	shown: number
	truncated: boolean
	items: MediaReference[]
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
