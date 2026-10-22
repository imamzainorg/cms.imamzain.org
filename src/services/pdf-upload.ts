import type { AxiosResponse } from "axios"

/**
 * Shared shape for the presigned-PDF-upload endpoints (books, academic
 * papers, and audios' companion-PDF slot).
 */
export type PdfUploadUrlResponse = {
	uploadUrl: string
	key: string
	publicUrl: string
	maxBytes: number
}

type ErrorKind = "audio" | "pdf"

/** Thrown before the PUT when the file exceeds the server's advisory cap. */
export class AudioSizeExceededError extends Error {
	readonly maxBytes: number
	constructor(maxBytes: number, kind: ErrorKind) {
		const mb = Math.round(maxBytes / (1024 * 1024))
		super(
			kind === "pdf"
				? `ملف PDF يتجاوز الحد المسموح (${mb} ميغابايت).`
				: `الملف الصوتي يتجاوز الحد المسموح (${mb} ميغابايت).`,
		)
		this.name = "AudioSizeExceededError"
		this.maxBytes = maxBytes
	}
}

export class AudioMimeNotAllowedError extends Error {
	readonly mimeType: string
	constructor(mimeType: string, kind: ErrorKind) {
		super(
			kind === "pdf"
				? `نوع الملف غير مدعوم (${mimeType || "غير معروف"}). المسموح: PDF فقط.`
				: `نوع الملف غير مدعوم (${mimeType || "غير معروف"}). المسموح: MP3 أو M4A.`,
		)
		this.name = "AudioMimeNotAllowedError"
		this.mimeType = mimeType
	}
}

/**
 * Thrown when the R2 PUT itself fails. A dedicated subclass (not a bare
 * Error) so getErrorMessage surfaces the Arabic message instead of the
 * caller's generic fallback.
 */
export class AudioUploadFailedError extends Error {
	constructor() {
		super("فشل رفع الملف إلى مخزن الملفات. حاول مجدداً.")
		this.name = "AudioUploadFailedError"
	}
}

/**
 * Same extension-fallback trick as audios' resolveContentType: some browsers
 * report .pdf as an empty/nonstandard file.type.
 */
function resolvePdfContentType(file: File): string | null {
	if (file.type === "application/pdf") return "application/pdf"
	const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
	if (!file.type && ext === "pdf") return "application/pdf"
	return null
}

/**
 * Validate the file is a PDF → request a pre-signed URL via the caller's
 * upload-url endpoint → validate size against the returned `maxBytes` → PUT
 * straight to R2 with Content-Type: application/pdf (R2 403s on mismatch).
 * No confirm step — the caller saves `publicUrl` onto its own pdf_url field.
 * `maxBytes` is advisory only server-side, so the size check here is the only
 * enforcement before the PUT.
 */
export async function requestAndUploadPdf(
	file: File,
	requestUploadUrlFn: (filename: string) => Promise<AxiosResponse<PdfUploadUrlResponse>>,
): Promise<{ publicUrl: string }> {
	if (!resolvePdfContentType(file)) {
		throw new AudioMimeNotAllowedError(file.type, "pdf")
	}

	const { data: urlData } = await requestUploadUrlFn(file.name)

	if (file.size > urlData.maxBytes) {
		throw new AudioSizeExceededError(urlData.maxBytes, "pdf")
	}

	const resp = await fetch(urlData.uploadUrl, {
		method: "PUT",
		body: file,
		headers: { "Content-Type": "application/pdf" },
	})
	if (!resp.ok) {
		throw new AudioUploadFailedError()
	}

	return { publicUrl: urlData.publicUrl }
}
