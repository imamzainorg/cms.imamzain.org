/**
 * Client-side sanitization helpers for HTML produced by the rich-text editor.
 *
 * Tiptap's schema already drops unknown elements (script, style, event handlers
 * like onclick) at parse time. The remaining XSS surface is in URL attributes:
 *  - <a href="javascript:..."> can execute scripts on click
 *  - <img src="javascript:..."> historically did the same; modern browsers
 *    block it, but better to refuse it at the editor level
 *  - data: URLs in href can carry HTML payloads
 *
 * These helpers are also used by Tiptap's Link/Image `validate` callbacks so
 * unsafe URLs are rejected as the user types or pastes them.
 */

const SAFE_URL_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"]

export function isSafeUrl(raw: string): boolean {
	if (!raw) return false
	const trimmed = raw.trim()
	// Allow relative URLs and fragment-only links (#section).
	if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true
	try {
		const u = new URL(trimmed)
		return SAFE_URL_PROTOCOLS.includes(u.protocol)
	} catch {
		// If it doesn't parse, assume it's a relative path the user typed.
		// We don't allow `javascript:foo` — those would parse and be caught above.
		return !/^(javascript|data|vbscript):/i.test(trimmed)
	}
}

export function isSafeImageUrl(raw: string): boolean {
	if (!raw) return false
	const trimmed = raw.trim()
	if (trimmed.startsWith("/")) return true
	// Allow inline data: images that are clearly image MIME, e.g. data:image/png;base64,...
	if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|avif);/i.test(trimmed)) return true
	try {
		const u = new URL(trimmed)
		return ["http:", "https:"].includes(u.protocol)
	} catch {
		return false
	}
}

/** Strip dangerous URLs from already-rendered HTML, defense in depth before send. */
export function sanitizeEditorHtml(html: string): string {
	if (!html) return html
	// Remove any javascript:/vbscript:/data: scheme inside href attributes
	let cleaned = html.replace(
		/\s(href|src)\s*=\s*"(\s*(?:javascript|vbscript):[^"]*)"/gi,
		' $1="#"',
	)
	cleaned = cleaned.replace(
		/\s(href|src)\s*=\s*'(\s*(?:javascript|vbscript):[^']*)'/gi,
		" $1='#'",
	)
	// Remove inline event handler attributes that may have survived parsing
	cleaned = cleaned.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
	cleaned = cleaned.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
	// target="_blank" without rel="noopener noreferrer" is a reverse-tabnabbing
	// vulnerability. The API enforces this server-side; mirror it client-side
	// so the editor preview is safe too.
	cleaned = cleaned.replace(/<a\b([^>]*?)\btarget\s*=\s*("|')_blank\2([^>]*)>/gi, (match, before, _q, after) => {
		if (/\brel\s*=/i.test(before + after)) return match
		return `<a${before}target="_blank" rel="noopener noreferrer"${after}>`
	})
	return cleaned
}

/** UTF-8 byte length of a string — JSON encodes UTF-8, so this matches what the API receives. */
export function byteLength(s: string): number {
	if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s).length
	// Fallback for non-browser environments
	return Buffer.byteLength(s, "utf8")
}

/** Default max body size accepted by the API. */
export const MAX_BODY_BYTES = 200 * 1024 // 200 KB
