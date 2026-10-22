/**
 * `<input type="datetime-local">` speaks WALL-CLOCK time with no zone
 * ("2026-06-01T09:00"), while the API stores and requires an instant with an
 * explicit offset ("2026-06-01T06:00:00.000Z"): an offset-less value is a 400,
 * and a mismatch silently moves a scheduled post by the zone offset.
 *
 * These two helpers are the only conversion points. They go through the
 * browser's own zone in both directions, so a value round-trips unchanged.
 */

const pad = (n: number) => String(n).padStart(2, "0")

/** Stored instant → the wall-clock string a datetime-local input shows. "" when unset/invalid. */
export function isoToLocalInput(iso: string | null | undefined): string {
	if (!iso) return ""
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return ""
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local value → an ISO instant with an explicit `Z`. null when empty/invalid. */
export function localInputToIso(value: string | null | undefined): string | null {
	if (!value) return null
	const d = new Date(value)
	if (Number.isNaN(d.getTime())) return null
	return d.toISOString()
}
