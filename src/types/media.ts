export type MediaVariant = {
	width: number
	url: string
	file_size: number
	format: "webp"
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
	 * Pre-baked WebP variants at 320 / 768 / 1280 / 1920 px widths.
	 * Empty when generation failed mid-upload — call POST /media/:id/regenerate-variants.
	 */
	variants?: MediaVariant[]
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
	variants?: MediaVariant[]
}
