import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { mediaService, MediaSizeExceededError, pollForVariants } from "@/services/media.service"
import type { MediaRecord } from "@/types"

const API = "http://localhost:3000/api/v1"
const R2_URL = "https://r2.example.com/upload"
const MAX_BYTES = 26214400 // 25 MB image cap advertised by /media/upload-url
function wrap<T>(data: T) { return { success: true, timestamp: new Date().toISOString(), message: "OK", data } }
function paginated<T>(items: T[]) {
	return { items, pagination: { page: 1, limit: 20, total: items.length, pages: 1 } }
}

const uploadUrlPayload = {
	uploadUrl: R2_URL,
	key: "media/originals/m1/abc.jpg",
	publicUrl: "https://cdn.example.com/media/originals/m1/abc.jpg",
	mediaId: "m1",
	maxBytes: MAX_BYTES,
}

const mockVariants = [
	{ width: 320, url: "https://cdn.example.com/media/variants/m1/320.webp", file_size: 9000, format: "webp" as const },
	{ width: 768, url: "https://cdn.example.com/media/variants/m1/768.webp", file_size: 30000, format: "webp" as const },
]

// Confirm responds immediately with `variants: []` and
// `variants_status: "processing"` (the Worker generates the sizes in the
// background); the detail endpoint below is what eventually carries them.
const mockMedia = {
	id: "m1",
	url: "https://cdn.example.com/abc.jpg",
	filename: "abc.jpg",
	alt_text: null,
	mime_type: "image/jpeg",
	file_size: 102400,
	width: 1920,
	height: 1080,
	created_at: "2024-01-01T00:00:00Z",
	variants: [] as typeof mockVariants,
	planned_widths: [320, 768, 1280],
	variants_status: "processing" as const,
}

const server = setupServer(
	http.post(`${API}/media/upload-url`, () => HttpResponse.json(wrap(uploadUrlPayload), { status: 201 })),
	http.put(R2_URL, () => new HttpResponse(null, { status: 200 })),
	http.post(`${API}/media/confirm`, () => HttpResponse.json(wrap(mockMedia), { status: 201 })),
	// pollForVariants hits GET /media/:id until variants_status settles —
	// resolve on the first poll so uploadFile finishes after one short wait.
	http.get(`${API}/media/m1`, () => HttpResponse.json(wrap({ ...mockMedia, variants: mockVariants, variants_status: "ready" }))),
	http.get(`${API}/media`, () => HttpResponse.json(wrap(paginated([mockMedia])))),
	http.delete(`${API}/media/m1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("mediaService", () => {
	it("requests a pre-signed upload URL (full contract: publicUrl, mediaId, maxBytes)", async () => {
		const { data } = await mediaService.requestUploadUrl("abc.jpg", "image/jpeg")
		expect(data.uploadUrl).toBe(R2_URL)
		expect(data.key).toBe("media/originals/m1/abc.jpg")
		expect(data.publicUrl).toBe(uploadUrlPayload.publicUrl)
		expect(data.mediaId).toBe("m1")
		expect(data.maxBytes).toBe(MAX_BYTES)
	})
	it("confirms an upload", async () => {
		const { data } = await mediaService.confirmUpload({ key: "media/originals/m1/abc.jpg", filename: "abc.jpg", mime_type: "image/jpeg", file_size: 102400 })
		expect(data.id).toBe("m1")
		expect(data.url).toContain("cdn.example.com")
	})
	it("lists media records with pagination", async () => {
		const { data } = await mediaService.list()
		expect(data.items).toHaveLength(1)
		expect(data.items[0].filename).toBe("abc.jpg")
	})
	it("full two-step uploadFile flow polls /media/:id until variants_status settles", async () => {
		const file = new File(["image-content"], "abc.jpg", { type: "image/jpeg" })
		Object.defineProperty(file, "size", { value: 102400 })
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test")
		vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined)
		const media = await mediaService.uploadFile(file)
		expect(media.id).toBe("m1")
		expect(media.filename).toBe("abc.jpg")
		// The record returned is the polled one carrying the generated variants.
		expect(media.variants).toHaveLength(2)
		expect(media.variants[0].format).toBe("webp")
		expect(media.variants_status).toBe("ready")
	}, 8000)
	it("sends no width/height when the browser cannot measure the image (the API rejects values below 1)", async () => {
		let confirmBody: Record<string, unknown> = {}
		server.use(
			http.post(`${API}/media/confirm`, async ({ request }) => {
				confirmBody = (await request.json()) as Record<string, unknown>
				return HttpResponse.json(wrap({ ...mockMedia, variants_status: "ready" }), { status: 201 })
			}),
		)
		const file = new File(["image-content"], "abc.jpg", { type: "image/jpeg" })
		Object.defineProperty(file, "size", { value: 102400 })
		// jsdom never fires <img> load/error, so the 500 ms measuring timeout wins.
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test")
		vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined)
		await mediaService.uploadFile(file)
		expect("width" in confirmBody).toBe(false)
		expect("height" in confirmBody).toBe(false)
		expect(confirmBody.filename).toBe("abc.jpg")
	}, 8000)
	it("fetches what still references a media file", async () => {
		server.use(http.get(`${API}/media/m1/references`, () =>
			HttpResponse.json(wrap({
				media_id: "m1", total: 2, shown: 2, truncated: false,
				items: [
					{ type: "post", id: "p1", field: "cover_image", trashed: false },
					{ type: "book", id: "b1", field: "og_image", lang: "ar", trashed: true },
				],
			})),
		))
		const { data } = await mediaService.references("m1")
		expect(data.total).toBe(2)
		expect(data.items[1]).toMatchObject({ type: "book", field: "og_image", lang: "ar", trashed: true })
	})
	it("rejects an oversize file client-side, before any PUT or confirm", async () => {
		let putCalled = false
		let confirmCalled = false
		server.use(
			http.put(R2_URL, () => { putCalled = true; return new HttpResponse(null, { status: 200 }) }),
			http.post(`${API}/media/confirm`, () => { confirmCalled = true; return HttpResponse.json(wrap(mockMedia), { status: 201 }) }),
		)
		const file = new File(["x"], "huge.jpg", { type: "image/jpeg" })
		Object.defineProperty(file, "size", { value: MAX_BYTES + 1 })
		await expect(mediaService.uploadFile(file)).rejects.toThrow(MediaSizeExceededError)
		expect(putCalled).toBe(false)
		expect(confirmCalled).toBe(false)
	})
})

describe("pollForVariants", () => {
	const record = (patch: Partial<MediaRecord>): MediaRecord => ({ ...mockMedia, ...patch } as MediaRecord)

	it("returns at once when the status is not 'processing' (nothing to wait for)", async () => {
		let polled = false
		server.use(http.get(`${API}/media/m1`, () => { polled = true; return HttpResponse.json(wrap(mockMedia)) }))
		const ready = record({ variants_status: "ready", variants: mockVariants })
		expect(await pollForVariants(ready, [1])).toBe(ready)
		const none = record({ variants_status: "not_applicable", variants_status_reason: "ANIMATED" })
		expect(await pollForVariants(none, [1])).toBe(none)
		expect(polled).toBe(false)
	})

	it("stops as soon as the status settles, even with fewer variants than the four standard widths", async () => {
		let calls = 0
		server.use(http.get(`${API}/media/m1`, () => {
			calls++
			// A 1200 px original legitimately has two variants — still "ready".
			return HttpResponse.json(wrap(calls < 3
				? { ...mockMedia, variants: [mockVariants[0]], variants_status: "processing" }
				: { ...mockMedia, variants: mockVariants, planned_widths: [320, 768], variants_status: "ready" }))
		}))
		const done = await pollForVariants(record({ variants_status: "processing" }), [1, 1, 1, 1, 1])
		expect(done.variants_status).toBe("ready")
		expect(done.variants).toHaveLength(2)
		// (msw under jsdom reports each XHR twice, so only bound the count.)
		expect(calls).toBeGreaterThanOrEqual(3)
		expect(calls).toBeLessThanOrEqual(6)
	})

	it("gives up after the delays and returns the latest record (e.g. an animated GIF still 'processing')", async () => {
		let calls = 0
		server.use(http.get(`${API}/media/m1`, () => { calls++; return HttpResponse.json(wrap({ ...mockMedia, variants_status: "processing" })) }))
		const out = await pollForVariants(record({ variants_status: "processing" }), [1, 1])
		expect(out.variants_status).toBe("processing")
		// One request per delay (msw under jsdom reports each XHR twice).
		expect(calls).toBeGreaterThanOrEqual(2)
		expect(calls).toBeLessThanOrEqual(4)
	})

	it("survives a failed poll and keeps going", async () => {
		let calls = 0
		server.use(http.get(`${API}/media/m1`, () => {
			calls++
			if (calls === 1) return HttpResponse.json({ success: false, code: "RATE_LIMITED", error: "slow down" }, { status: 429 })
			return HttpResponse.json(wrap({ ...mockMedia, variants: mockVariants, variants_status: "ready" }))
		}))
		const out = await pollForVariants(record({ variants_status: "processing" }), [1, 1, 1])
		expect(out.variants_status).toBe("ready")
	})
})
