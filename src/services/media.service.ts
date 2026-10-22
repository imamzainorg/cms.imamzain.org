import axios from "axios"
import { api } from "@/lib/api"
import type { MediaRecord, MediaReferences, PaginatedResponse } from "@/types"

/**
 * Shape of the response from POST /media/upload-url.
 *
 * - `mediaId`: pinned at confirm-time; safe to use in optimistic UI and
 *   draft post `attachment_ids` before the upload completes.
 * - `publicUrl`: the CDN URL the file will be served from once confirmed
 *   (`<publicBaseUrl>/<key>`) — usable for optimistic previews.
 * - `maxBytes`: per-MIME upload cap (currently 25 MB for images). Validate
 *   client-side; otherwise R2 will accept the PUT and `/media/confirm`
 *   bounces it with 413. The presigned URL itself lives 15 minutes and signs
 *   the Content-Type, so the PUT must send exactly the declared `mime_type`.
 */
export type UploadUrlResponse = {
	uploadUrl: string
	key: string
	publicUrl: string
	mediaId: string
	maxBytes: number
}

/** Surfaced as a typed error from `uploadFile` so the UI can react gracefully. */
export class MediaSizeExceededError extends Error {
	readonly maxBytes: number
	readonly mimeType: string
	constructor(maxBytes: number, mimeType: string) {
		const mb = Math.round(maxBytes / (1024 * 1024))
		super(`الملف يتجاوز الحد المسموح (${mb} ميغابايت) لنوع ${mimeType}.`)
		this.name = "MediaSizeExceededError"
		this.maxBytes = maxBytes
		this.mimeType = mimeType
	}
}

/** MIMEs the API will accept on /media/upload-url. Mirrors the server-side allowlist. */
export const ALLOWED_MEDIA_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
] as const

export class MediaMimeNotAllowedError extends Error {
	readonly mimeType: string
	constructor(mimeType: string) {
		super(`نوع الملف غير مدعوم (${mimeType || "غير معروف"}). الأنواع المسموحة: JPEG, PNG, GIF, WebP.`)
		this.name = "MediaMimeNotAllowedError"
		this.mimeType = mimeType
	}
}

/**
 * HTTP 410 from POST /media/confirm — the pre-signed upload session expired
 * (more than ~15 minutes elapsed between /media/upload-url and /media/confirm).
 * The pending record is gone server-side; the only fix is to restart the
 * upload from file selection.
 */
export class MediaUploadExpiredError extends Error {
	constructor() {
		super("انتهت صلاحية جلسة الرفع — أعد اختيار الملف وحاول مجددًا.")
		this.name = "MediaUploadExpiredError"
	}
}

/**
 * The R2 PUT itself failed (expired signature, mismatched Content-Type…).
 * A dedicated subclass (not a bare Error) so getErrorMessage surfaces the
 * Arabic message instead of the caller's generic fallback.
 */
export class MediaUploadFailedError extends Error {
	constructor() {
		super("فشل رفع الملف إلى مخزن الملفات. حاول مجدداً.")
		this.name = "MediaUploadFailedError"
	}
}

export const mediaService = {
	list: (params?: { page?: number; limit?: number; search?: string; mime_type?: string }) =>
		api.get<PaginatedResponse<MediaRecord>>("/media", { params }),

	// 10/min/IP and shares the upload pipeline's concurrency gate — never fire
	// it across a whole library. Answers 200 even when nothing can be made;
	// `variants_status` + `variants_status_reason` say why.
	regenerateVariants: (id: string) =>
		api.post<MediaRecord>(`/media/${id}/regenerate-variants`),

	get: (id: string) => api.get<MediaRecord>(`/media/${id}`),

	// Which records still hold this file (trashed ones included). At most 20
	// `items`; `total` is the real count.
	references: (id: string) => api.get<MediaReferences>(`/media/${id}/references`),

	requestUploadUrl: (filename: string, mime_type: string) =>
		api.post<UploadUrlResponse>("/media/upload-url", { filename, mime_type }),

	confirmUpload: (body: {
		key: string
		filename: string
		mime_type: string
		file_size: number
		alt_text?: string
		width?: number
		height?: number
	}) => api.post<MediaRecord>("/media/confirm", body),

	update: (id: string, body: Partial<{ filename: string; alt_text: string }>) =>
		api.patch<MediaRecord>(`/media/${id}`, body),

	remove: (id: string) => api.delete(`/media/${id}`),

	uploadFile: async (file: File): Promise<MediaRecord> => {
		// Validate MIME against the server allowlist before the round-trip.
		// Saves the user the failed /upload-url call + the API a 400.
		if (!(ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) {
			throw new MediaMimeNotAllowedError(file.type)
		}

		const filename = clampFilename(file.name)
		const { data: urlData } = await mediaService.requestUploadUrl(filename, file.type)

		// Fail-fast on size before the (potentially slow) PUT. The server
		// enforces this again at /media/confirm with a 413, so even if the
		// client check is bypassed we don't store oversized files.
		if (file.size > urlData.maxBytes) {
			throw new MediaSizeExceededError(urlData.maxBytes, file.type)
		}

		const putResp = await fetch(urlData.uploadUrl, {
			method: "PUT",
			body: file,
			headers: { "Content-Type": file.type },
		})
		if (!putResp.ok) {
			// R2 rejected the PUT (expired signature, mismatched Content-Type…).
			// Fail here with a clear message instead of letting /media/confirm
			// die on a missing object.
			throw new MediaUploadFailedError()
		}

		const dimensions = await getImageDimensions(file)

		// Confirm returns immediately with `variants: []` and
		// `variants_status: "processing"`; the Worker generates the WebP sizes in
		// the background. Poll the detail endpoint until the status settles so the
		// UI doesn't briefly flash "no variants" + a regenerate prompt.
		let confirmed: MediaRecord
		try {
			const resp = await mediaService.confirmUpload({
				key: urlData.key,
				filename,
				mime_type: file.type,
				file_size: file.size,
				...dimensions,
			})
			confirmed = resp.data
		} catch (e) {
			// 410 = pre-signed session expired (>15 min between upload-url and
			// confirm); the pending record is gone — surface a typed domain error
			// so the UI can prompt a fresh file selection. Everything else
			// (incl. 413 PAYLOAD_TOO_LARGE, whose server string names the exact
			// cap + MIME) rethrows untouched for getErrorMessage to render.
			if (axios.isAxiosError(e) && e.response?.status === 410) {
				throw new MediaUploadExpiredError()
			}
			throw e
		}
		return await pollForVariants(confirmed)
	},
}

/** Waits between polls (ms) — roughly 11 s in total, with growing gaps to stay gentle on the rate limit. */
export const VARIANT_POLL_DELAYS_MS = [800, 1000, 1500, 2000, 2500, 3000]

/**
 * Poll `GET /media/:id` until `variants_status` leaves "processing".
 *
 * The status is the only reliable signal: comparing `variants.length` to a
 * fixed count (or stopping at the first non-empty array) is wrong — the
 * pipeline never up-scales, so a 1200 px photo has two variants, and the first
 * non-empty array can be a half-built set. An animated GIF reads "processing"
 * for the API's whole 2-minute window, so the poll is capped (~11 s) and the
 * latest record is returned either way; the media library refreshes by itself
 * while anything is still processing.
 */
export async function pollForVariants(
	initial: MediaRecord,
	delaysMs: number[] = VARIANT_POLL_DELAYS_MS,
): Promise<MediaRecord> {
	// No status (older API, or a bare row) → nothing to wait for.
	if (initial.variants_status !== "processing") return initial
	let current = initial
	for (const delay of delaysMs) {
		await new Promise((r) => setTimeout(r, delay))
		try {
			const { data } = await mediaService.get(initial.id)
			current = data
			if (data.variants_status !== "processing") return data
		} catch {
			// Network blip or a 429 — keep going; the library view re-polls and
			// the editor can still trigger "regenerate" if it ends up partial.
		}
	}
	return current
}

const MAX_FILENAME_LENGTH = 255

/** The API caps `filename` at 255 characters; keep the extension when trimming. */
function clampFilename(name: string): string {
	if (name.length <= MAX_FILENAME_LENGTH) return name
	const dot = name.lastIndexOf(".")
	const ext = dot > 0 && name.length - dot <= 10 ? name.slice(dot) : ""
	return name.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext
}

/**
 * Client-side dimensions are only a fallback: confirm reads the real,
 * EXIF-oriented size from the file's header. When the browser can't tell (or
 * is slow), send NOTHING — the API rejects `width`/`height` below 1, so a
 * `{0, 0}` placeholder would turn a harmless miss into a 400.
 */
function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
	return new Promise((resolve) => {
		if (typeof window === "undefined") { resolve({}); return }
		const timeoutId = setTimeout(() => resolve({}), 500)
		const img = new Image()
		const url = URL.createObjectURL(file)
		const settle = (dims: { width?: number; height?: number }) => {
			clearTimeout(timeoutId)
			URL.revokeObjectURL(url)
			resolve(dims)
		}
		img.onload = () =>
			settle(img.naturalWidth >= 1 && img.naturalHeight >= 1
				? { width: img.naturalWidth, height: img.naturalHeight }
				: {})
		img.onerror = () => settle({})
		img.src = url
	})
}
