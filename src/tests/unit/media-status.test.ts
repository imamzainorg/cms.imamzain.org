import { describe, it, expect } from "vitest"
import { describeVariants, describeReference } from "@/lib/media-status"
import type { MediaRecord } from "@/types"

const row = (patch: Partial<MediaRecord>): MediaRecord => ({
	id: "m1",
	filename: "a.jpg",
	url: "https://cdn.test/a.jpg",
	mime_type: "image/jpeg",
	file_size: 1,
	alt_text: null,
	width: 1200,
	height: 800,
	created_at: "2026-01-01T00:00:00Z",
	variants: [],
	...patch,
})

describe("describeVariants", () => {
	it("only a partial set offers Regenerate", () => {
		const statuses = ["ready", "processing", "partial", "unavailable", "not_applicable"] as const
		const offered = statuses.filter((s) => describeVariants(row({ variants_status: s }))?.canRegenerate)
		expect(offered).toEqual(["partial"])
	})

	it("judges by variants_status, never by variants.length", () => {
		// A 1200 px original with two variants is complete...
		const ready = describeVariants(row({ variants_status: "ready", variants: [{ width: 320 }, { width: 768 }] as MediaRecord["variants"] }))
		expect(ready?.status).toBe("ready")
		expect(ready?.label).toBe("2 نسخ")
		// ...and an animated GIF with none is not broken.
		const gif = describeVariants(row({ mime_type: "image/gif", variants_status: "not_applicable", variants_status_reason: "ANIMATED" }))
		expect(gif?.canRegenerate).toBe(false)
		expect(gif?.detail).toContain("GIF")
	})

	it("explains why an image gets no variants", () => {
		expect(describeVariants(row({ variants_status: "unavailable", variants_status_reason: "TOO_SMALL" }))?.detail).toContain("صغيرة")
		expect(describeVariants(row({ variants_status: "unavailable", variants_status_reason: "UNREADABLE" }))?.detail).toContain("تعذّرت قراءة")
		expect(describeVariants(row({ variants_status: "unavailable" }))?.detail).toBeTruthy()
	})

	it("says nothing when there is no status (a bare PATCH row) or the file is not an image", () => {
		expect(describeVariants(row({}))).toBeNull()
		expect(describeVariants(row({ mime_type: "application/pdf", variants_status: "not_applicable" }))).toBeNull()
	})
})

describe("describeReference", () => {
	it("names the holder in words, never an id", () => {
		const text = describeReference({ type: "book", id: "11111111-2222-3333-4444-555555555555", field: "og_image", lang: "ar", trashed: false })
		expect(text).toBe("كتاب — صورة المشاركة (SEO) · ar")
		expect(text).not.toMatch(/[0-9a-f]{8}-/)
	})

	it("handles a gallery item that IS the file", () => {
		expect(describeReference({ type: "gallery_image", id: "x", field: "gallery_item", trashed: false })).toContain("هي نفسها عنصر في المعرض")
	})
})
