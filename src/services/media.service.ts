import { api } from "@/lib/api"
import type { MediaRecord, PaginatedResponse } from "@/types"

/**
 * Shape of the response from POST /media/upload-url (Round 8).
 *
 * - `mediaId`: pinned at confirm-time; safe to use in optimistic UI and
 *   draft post `attachment_ids` before the upload completes.
 * - `maxBytes`: per-MIME upload cap (currently 25 MB for images). Validate
 *   client-side; otherwise R2 will accept the PUT and `/media/confirm`
 *   bounces it with 413.
 */
export type UploadUrlResponse = {
	uploadUrl: string
	key: string
	publicUrl?: string
	mediaId?: string
	maxBytes?: number
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
		// Step 1: ask the API for a pre-signed URL + the per-MIME cap.
		const { data: urlData } = await api.post<UploadUrlResponse>(
			"/media/upload-url",
			{ filename: file.name, mime_type: file.type },
		)

		// Step 2: fail-fast on size *before* the (potentially slow) PUT. The
		// server enforces this again at /media/confirm with a 413, so even if
		// the client check is bypassed we don't store oversized files.
		if (typeof urlData.maxBytes === "number" && file.size > urlData.maxBytes) {
			throw new MediaSizeExceededError(urlData.maxBytes, file.type)
		}

		// Step 3: upload the bytes directly to R2.
		await fetch(urlData.uploadUrl, {
			method: "PUT",
			body: file,
			headers: { "Content-Type": file.type },
		})

		// Step 4: probe dimensions in parallel-friendly fashion.
		const dimensions = await getImageDimensions(file)

		// Step 5: confirm — variants generation is synchronous so the response
		// already contains variants[]. Surfaces 413 if R2's authoritative size
		// exceeds the cap (the server deletes the orphan object for us).
		const { data: record } = await api.post<MediaRecord>("/media/confirm", {
			key: urlData.key,
			filename: file.name,
			mime_type: file.type,
			file_size: file.size,
			...dimensions,
		})

		return record
	},
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
