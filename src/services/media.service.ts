import axios from "axios"
import { api } from "@/lib/api"
import type { MediaRecord, PaginatedResponse } from "@/types"

/**
 * Shape of the response from POST /media/upload-url.
 *
 * - `mediaId`: pinned at confirm-time; safe to use in optimistic UI and
 *   draft post `attachment_ids` before the upload completes.
 * - `publicUrl`: the CDN URL the file will be served from once confirmed
 *   (`<publicBaseUrl>/<key>`) — usable for optimistic previews.
 * - `maxBytes`: per-MIME upload cap (currently 25 MB for images). Validate
 *   client-side; otherwise R2 will accept the PUT and `/media/confirm`
 *   bounces it with 413.
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

	regenerateVariants: (id: string) =>
		api.post<MediaRecord>(`/media/${id}/regenerate-variants`),

	get: (id: string) => api.get<MediaRecord>(`/media/${id}`),

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

		const { data: urlData } = await mediaService.requestUploadUrl(file.name, file.type)

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

		// As of round 15.4, confirm returns immediately with `variants: []` —
		// sharp generation is queued on the next event-loop tick. Poll the
		// detail endpoint until variants land (typically 1–3 s) so the UI
		// doesn't briefly flash "no variants" + a regenerate prompt.
		let confirmed: MediaRecord
		try {
			const resp = await mediaService.confirmUpload({
				key: urlData.key,
				filename: file.name,
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

/**
 * Poll `GET /media/:id` every 500 ms (up to ~6 s) until variants populate.
 * Returns the latest record either way — the caller decides whether to
 * surface the "regenerate" button when the array stays empty past timeout.
 */
async function pollForVariants(initial: MediaRecord): Promise<MediaRecord> {
	if (initial.variants && initial.variants.length > 0) return initial
	const maxAttempts = 12
	let current = initial
	for (let i = 0; i < maxAttempts; i++) {
		await new Promise((r) => setTimeout(r, 500))
		try {
			const { data } = await mediaService.get(initial.id)
			current = data
			if (data.variants && data.variants.length > 0) return data
		} catch {
			// Network blip — keep polling; the user can retry by clicking
			// the regenerate button if variants never land.
		}
	}
	return current
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
	return new Promise((resolve) => {
		if (typeof window === "undefined") { resolve({ width: 0, height: 0 }); return }
		const timeoutId = setTimeout(() => resolve({ width: 0, height: 0 }), 500)
		const img = new Image()
		const url = URL.createObjectURL(file)
		img.onload = () => {
			clearTimeout(timeoutId)
			resolve({ width: img.naturalWidth, height: img.naturalHeight })
			URL.revokeObjectURL(url)
		}
		img.onerror = () => {
			clearTimeout(timeoutId)
			resolve({ width: 0, height: 0 })
			URL.revokeObjectURL(url)
		}
		img.src = url
	})
}
