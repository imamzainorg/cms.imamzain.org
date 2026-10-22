import { describe, it, expect } from "vitest"
import { isoToLocalInput, localInputToIso } from "@/lib/datetime"

describe("datetime-local conversion", () => {
	it("round-trips an instant without drifting by the zone offset", () => {
		// The bug this guards: showing `toISOString().slice(0, 16)` (UTC) in a
		// local-time input, so every save moved the schedule by the UTC offset.
		const stored = "2026-06-01T06:00:00.000Z"
		const shown = isoToLocalInput(stored)
		expect(localInputToIso(shown)).toBe(stored)
	})

	it("shows wall-clock time in the browser's zone", () => {
		const d = new Date(2026, 5, 1, 9, 30) // local 09:30
		expect(isoToLocalInput(d.toISOString())).toBe("2026-06-01T09:30")
	})

	it("always produces an explicit-offset ISO instant (the API rejects offset-less)", () => {
		expect(localInputToIso("2026-06-01T09:30")).toMatch(/Z$/)
	})

	it("is empty-safe", () => {
		expect(isoToLocalInput(null)).toBe("")
		expect(isoToLocalInput(undefined)).toBe("")
		expect(isoToLocalInput("not a date")).toBe("")
		expect(localInputToIso("")).toBeNull()
		expect(localInputToIso(undefined)).toBeNull()
		expect(localInputToIso("garbage")).toBeNull()
	})
})
