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
