import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { mediaService, MediaSizeExceededError } from "@/services/media.service"

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

// Confirm responds immediately with `variants: []` (sharp runs out-of-band);
// the detail endpoint below is what eventually carries the populated array.
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
}

const server = setupServer(
	http.post(`${API}/media/upload-url`, () => HttpResponse.json(wrap(uploadUrlPayload), { status: 201 })),
	http.put(R2_URL, () => new HttpResponse(null, { status: 200 })),
	http.post(`${API}/media/confirm`, () => HttpResponse.json(wrap(mockMedia), { status: 201 })),
	// pollForVariants hits GET /media/:id until variants land — resolve on the
	// first poll so uploadFile settles in ~500 ms instead of the full window.
	http.get(`${API}/media/m1`, () => HttpResponse.json(wrap({ ...mockMedia, variants: mockVariants }))),
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
	it("full two-step uploadFile flow polls /media/:id until variants land", async () => {
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
	}, 8000)
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
