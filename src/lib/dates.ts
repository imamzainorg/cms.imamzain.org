import { format } from "date-fns"

/**
 * `date-fns` `format()` throws "Invalid time value" on null/undefined/bad
 * strings — which crashes the whole React tree because there's nothing
 * to catch it. These helpers swallow the failure and return the fallback
 * so a single misshapen row never takes the page down.
 */
export function safeFormat(
	value: string | number | Date | null | undefined,
	pattern: string,
	fallback = "—",
): string {
	if (value === null || value === undefined || value === "") return fallback
	const d = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(d.getTime())) return fallback
	try {
		return format(d, pattern)
	} catch {
		return fallback
	}
}

/**
 * Format a number with Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) and a LATIN
 * comma as the thousands separator. `toLocaleString("ar-EG")` would use
 * the Arabic-Indic `٬` separator, but in our brand it reads as a stray
 * letter (the design system explicitly switched to the Latin comma).
 *
 * Spaces between segments are preserved (e.g. for dd / MM / yyyy dates):
 * pass an already-formatted string through `toArabicDigits()` instead.
 */
export function formatArNumber(value: number | null | undefined): string {
	if (value === null || value === undefined || !Number.isFinite(value)) return "—"
	const withCommas = Math.trunc(value).toLocaleString("en-US")
	return toArabicDigits(withCommas)
}

const LATIN_TO_ARABIC: Record<string, string> = {
	"0": "٠",
	"1": "١",
	"2": "٢",
	"3": "٣",
	"4": "٤",
	"5": "٥",
	"6": "٦",
	"7": "٧",
	"8": "٨",
	"9": "٩",
}

/** Replace ASCII digits in a string with Arabic-Indic digits, leaving
 *  punctuation/spaces alone — useful for dd/MM/yyyy dates and IDs. */
export function toArabicDigits(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return ""
	return String(value).replace(/[0-9]/g, (d) => LATIN_TO_ARABIC[d] ?? d)
}
