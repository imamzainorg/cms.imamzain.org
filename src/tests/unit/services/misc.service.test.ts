import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { mediaService, MediaSizeExceededError } from "@/services/media.service"
import { getErrorMessage } from "@/lib/api"
import { proxyVisitsService } from "@/services/proxy-visits.service"
import { newsletterService } from "@/services/newsletter.service"
import { contestService } from "@/services/contest.service"
import { wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("mediaService", () => {
	it("list paginates", async () => {
		let called = false
		server.use(http.get(`${API}/media`, () => {
			called = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		await mediaService.list({ page: 1, limit: 50 })
		expect(called).toBe(true)
	})

	it("requestUploadUrl POSTs filename + mime_type", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/media/upload-url`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({
				uploadUrl: "https://s3/x",
				key: "k1",
				publicUrl: "https://cdn.test/k1",
				mediaId: "m-k1",
				maxBytes: 26214400,
			}))
		}))
		const { data } = await mediaService.requestUploadUrl("a.png", "image/png")
		expect(body).toEqual({ filename: "a.png", mime_type: "image/png" })
		expect(data.key).toBe("k1")
		expect(data.mediaId).toBe("m-k1")
		expect(data.maxBytes).toBe(26214400)
	})

	it("confirmUpload POSTs the full metadata payload", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/media/confirm`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({ id: "m1" }))
		}))
		await mediaService.confirmUpload({
			key: "k1",
			filename: "a.png",
			mime_type: "image/png",
			file_size: 100,
			width: 10,
			height: 10,
		})
		expect(body).toMatchObject({ key: "k1", width: 10, height: 10 })
	})

	it("update sends only the patched fields", async () => {
		let body: unknown = null
		server.use(http.patch(`${API}/media/m1`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({}))
		}))
		await mediaService.update("m1", { alt_text: "new" })
		expect(body).toEqual({ alt_text: "new" })
	})

	it("uploadFile throws MediaSizeExceededError when file > maxBytes (no PUT, no confirm)", async () => {
		const maxBytes = 1024 // 1 KB
		let putCalled = false
		let confirmCalled = false
		server.use(
			http.post(`${API}/media/upload-url`, () => HttpResponse.json(wrap({
				uploadUrl: "https://r2.test/u",
				key: "media/originals/abc/file.png",
				publicUrl: "https://cdn.test/abc.png",
				mediaId: "abc",
				maxBytes,
			}))),
			// Catch any accidental PUT/confirm despite the size check
			http.put("https://r2.test/u", () => { putCalled = true; return HttpResponse.text("") }),
			http.post(`${API}/media/confirm`, () => { confirmCalled = true; return HttpResponse.json(wrap({})) }),
		)
		// 2 KB file, well over the 1 KB cap
		const tooBig = new File([new Uint8Array(2048)], "huge.png", { type: "image/png" })
		await expect(mediaService.uploadFile(tooBig)).rejects.toThrow(MediaSizeExceededError)
		expect(putCalled).toBe(false)
		expect(confirmCalled).toBe(false)
	})

	it("MediaSizeExceededError surfaces via getErrorMessage", () => {
		const err = new MediaSizeExceededError(25 * 1024 * 1024, "image/jpeg")
		expect(getErrorMessage(err, "fallback")).toContain("25")
		expect(getErrorMessage(err, "fallback")).toContain("image/jpeg")
	})
})

describe("proxyVisitsService", () => {
	it("list hits /forms/proxy-visits", async () => {
		let called = false
		server.use(http.get(`${API}/forms/proxy-visits`, () => {
			called = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		await proxyVisitsService.list({ status: "PENDING" })
		expect(called).toBe(true)
	})

	it("update PATCHes /forms/proxy-visits/:id with status", async () => {
		let body: unknown = null
		server.use(http.patch(`${API}/forms/proxy-visits/v1`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({}))
		}))
		await proxyVisitsService.update("v1", { status: "APPROVED" })
		expect(body).toEqual({ status: "APPROVED" })
	})

	it("remove DELETEs /forms/proxy-visits/:id", async () => {
		let called = false
		server.use(http.delete(`${API}/forms/proxy-visits/v1`, () => {
			called = true
			return HttpResponse.json(wrap({}))
		}))
		await proxyVisitsService.remove("v1")
		expect(called).toBe(true)
	})
})

describe("newsletterService", () => {
	it("list hits /newsletter/subscribers", async () => {
		let called = false
		server.use(http.get(`${API}/newsletter/subscribers`, () => {
			called = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		await newsletterService.list({ is_active: true })
		expect(called).toBe(true)
	})

	it("unsubscribeById POSTs to /newsletter/subscribers/:id/unsubscribe", async () => {
		let captured = ""
		server.use(http.post(`${API}/newsletter/subscribers/:id/unsubscribe`, ({ params }) => {
			captured = String(params.id)
			return HttpResponse.json(wrap({}))
		}))
		await newsletterService.unsubscribeById("s1")
		expect(captured).toBe("s1")
	})

	it("resubscribeById POSTs to /newsletter/subscribers/:id/resubscribe", async () => {
		let captured = ""
		server.use(http.post(`${API}/newsletter/subscribers/:id/resubscribe`, ({ params }) => {
			captured = String(params.id)
			return HttpResponse.json(wrap({}))
		}))
		await newsletterService.resubscribeById("s1")
		expect(captured).toBe("s1")
	})
})

describe("contestService", () => {
	it("listAttempts hits the qutuf-sajjadiya contest endpoint with submitted filter", async () => {
		let url: URL | null = null
		server.use(http.get(`${API}/forms/qutuf-sajjadiya-contest/attempts`, ({ request }) => {
			url = new URL(request.url)
			return HttpResponse.json(wrap(paginated([])))
		}))
		await contestService.listAttempts({ submitted: "true", page: 2, limit: 30 })
		expect(url!.searchParams.get("submitted")).toBe("true")
		expect(url!.searchParams.get("page")).toBe("2")
	})
})
