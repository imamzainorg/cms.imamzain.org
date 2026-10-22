import { api } from "@/lib/api"
import type { Audio, PaginatedResponse } from "@/types"
import {
	requestAndUploadPdf,
	AudioSizeExceededError,
	AudioMimeNotAllowedError,
	AudioUploadFailedError,
} from "./pdf-upload"

type AudioTranslationInput = {
	lang: string
	title: string
	is_default: boolean
}

/**
 * Response of POST /audios/upload-url. NOTE: camelCase — this endpoint is the
 * one exception to the snake_case wire convention (mirrors /media/upload-url).
 */
export type AudioUploadUrlResponse = {
	uploadUrl: string
	key: string
	publicUrl: string
	maxBytes: number
}

export type AudioUploadKind = "audio" | "pdf"

/** MIMEs the API accepts for the audio kind. Mirrors the server regex. */
export const ALLOWED_AUDIO_MIME_TYPES = [
	"audio/mpeg",
	"audio/mp4",
	"audio/x-m4a",
] as const

// Size/MIME/upload-failure error classes now live in pdf-upload.ts (shared
// with books' and academic papers' PDF uploads) — re-exported here so
// existing imports from this module keep working.
export { AudioSizeExceededError, AudioMimeNotAllowedError, AudioUploadFailedError }

/**
 * Resolve the content_type to declare to the API for the AUDIO kind (mp3/m4a).
 * Some browsers report .mp3 as audio/mpeg, others leave file.type empty —
 * fall back to the extension. Returns null when the file is not an accepted
 * audio type. The PDF kind is handled by the shared pdf-upload helper.
 */
function resolveAudioContentType(file: File): string | null {
	if ((ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(file.type)) {
		return file.type
	}
	// Extension fallback (empty or nonstandard file.type, e.g. audio/mp3).
	const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
	if (ext === "mp3") return "audio/mpeg"
	if (ext === "m4a") return "audio/x-m4a"
	return null
}

export const audiosService = {
	list: (params?: {
		page?: number
		limit?: number
		speaker_id?: string
		search?: string
		is_published?: boolean
	}) => api.get<PaginatedResponse<Audio>>("/audios/admin", { params }),

	// Admin detail — the public GET /audios/:id 404s on drafts.
	get: (id: string) => api.get<Audio>(`/audios/admin/${id}`),

	create: (body: {
		speaker_id?: string
		audio_url: string
		pdf_url?: string
		slug?: string
		duration_seconds?: number
		size_mb?: number
		peaks?: number[]
		is_published?: boolean
		translations: AudioTranslationInput[]
	}) => api.post<Audio>("/audios", body),

	update: (id: string, body: Partial<{
		speaker_id: string | null
		audio_url: string
		// null clears (PATCH: undefined = leave unchanged)
		pdf_url: string | null
		slug: string | null
		duration_seconds: number
		size_mb: number
		peaks: number[]
		is_published: boolean
		translations: AudioTranslationInput[]
	}>) => api.patch<Audio>(`/audios/${id}`, body),

	togglePublish: (id: string, is_published: boolean) =>
		api.patch<Audio>(`/audios/${id}/publish`, { is_published }),

	remove: (id: string) => api.delete(`/audios/${id}`),

	trash: (params?: { page?: number; limit?: number }) =>
		api.get<PaginatedResponse<Audio>>("/audios/trash", { params }),

	restore: (id: string) => api.post<Audio>(`/audios/${id}/restore`),

	requestUploadUrl: (filename: string, content_type: string) =>
		api.post<AudioUploadUrlResponse>("/audios/upload-url", { filename, content_type }),

	/**
	 * Full upload flow: validate MIME → request pre-signed URL → validate size
	 * against `maxBytes` → PUT straight to R2 with the SAME Content-Type header
	 * (R2 403s on mismatch). No confirm step — the caller saves `publicUrl`
	 * into audio_url / pdf_url. The "pdf" kind delegates to the shared
	 * pdf-upload helper (also used by books/papers); "audio" (mp3/m4a) keeps
	 * its own logic here since the shared helper is PDF-only.
	 */
	uploadAudioFile: async (
		file: File,
		kind: AudioUploadKind,
	): Promise<{ publicUrl: string }> => {
		if (kind === "pdf") {
			return requestAndUploadPdf(file, (filename) =>
				audiosService.requestUploadUrl(filename, "application/pdf"),
			)
		}

		const contentType = resolveAudioContentType(file)
		if (!contentType) {
			throw new AudioMimeNotAllowedError(file.type, kind)
		}

		const { data: urlData } = await audiosService.requestUploadUrl(file.name, contentType)

		if (file.size > urlData.maxBytes) {
			throw new AudioSizeExceededError(urlData.maxBytes, kind)
		}

		const resp = await fetch(urlData.uploadUrl, {
			method: "PUT",
			body: file,
			headers: { "Content-Type": contentType },
		})
		if (!resp.ok) {
			throw new AudioUploadFailedError()
		}

		return { publicUrl: urlData.publicUrl }
	},
}
