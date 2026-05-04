import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { mediaService } from "@/services/media.service"

const API = "http://localhost:3000/api/v1"
const R2_URL = "https://r2.example.com/upload"
function wrap<T>(data: T) { return { success: true, timestamp: new Date().toISOString(), message: "OK", data } }

const mockMedia = { id: "m1", key: "media/abc.jpg", url: "https://cdn.example.com/abc.jpg", filename: "abc.jpg", alt_text: null, mime_type: "image/jpeg", file_size: 102400, width: 1920, height: 1080, created_at: "2024-01-01T00:00:00Z" }

const server = setupServer(
	http.post(`${API}/media/upload-url`, () => HttpResponse.json(wrap({ uploadUrl: R2_URL, key: "media/abc.jpg" }), { status: 201 })),
	http.put(R2_URL, () => new HttpResponse(null, { status: 200 })),
	http.post(`${API}/media/confirm`, () => HttpResponse.json(wrap(mockMedia), { status: 201 })),
	http.get(`${API}/media`, () => HttpResponse.json(wrap({ media: [mockMedia], total: 1 }))),
	http.delete(`${API}/media/m1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("mediaService", () => {
	it("requests a pre-signed upload URL", async () => {
		const { data } = await mediaService.requestUploadUrl("abc.jpg", "image/jpeg")
		expect(data.uploadUrl).toBe(R2_URL)
		expect(data.key).toBe("media/abc.jpg")
	})
	it("confirms an upload", async () => {
		const { data } = await mediaService.confirmUpload({ key: "media/abc.jpg", filename: "abc.jpg", mime_type: "image/jpeg", file_size: 102400 })
		expect(data.id).toBe("m1")
		expect(data.url).toContain("cdn.example.com")
	})
	it("lists media records", async () => {
		const { data } = await mediaService.list()
		expect(data.media).toHaveLength(1)
		expect(data.media[0].filename).toBe("abc.jpg")
	})
	it("full two-step uploadFile flow (image dims fall back to 0 in jsdom)", async () => {
		const file = new File(["image-content"], "abc.jpg", { type: "image/jpeg" })
		Object.defineProperty(file, "size", { value: 102400 })
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test")
		vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined)
		const media = await mediaService.uploadFile(file)
		expect(media.id).toBe("m1")
		expect(media.filename).toBe("abc.jpg")
	}, 8000)
})