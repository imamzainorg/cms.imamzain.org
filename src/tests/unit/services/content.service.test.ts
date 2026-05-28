import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { booksService } from "@/services/books.service"
import { papersService } from "@/services/papers.service"
import { galleryService } from "@/services/gallery.service"
import { wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("booksService", () => {
	it("list calls GET /books with pagination params", async () => {
		let captured: URL | null = null
		server.use(http.get(`${API}/books`, ({ request }) => {
			captured = new URL(request.url)
			return HttpResponse.json(wrap(paginated([])))
		}))
		await booksService.list({ page: 2, limit: 50, search: "x", category_id: "c1" })
		expect(captured!.searchParams.get("page")).toBe("2")
		expect(captured!.searchParams.get("limit")).toBe("50")
		expect(captured!.searchParams.get("search")).toBe("x")
		expect(captured!.searchParams.get("category_id")).toBe("c1")
	})

	it("get returns the unwrapped book", async () => {
		server.use(http.get(`${API}/books/b1`, () => HttpResponse.json(wrap({ id: "b1" }))))
		const { data } = await booksService.get("b1")
		expect((data as { id: string }).id).toBe("b1")
	})

	it("create POSTs to /books", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/books`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({ id: "b1" }), { status: 201 })
		}))
		await booksService.create({
			category_id: "c1",
			translations: [{ lang: "ar", title: "كتاب", is_default: true }],
		})
		expect(body).toMatchObject({ category_id: "c1" })
	})

	it("update PATCHes /books/:id", async () => {
		server.use(http.patch(`${API}/books/b1`, () => HttpResponse.json(wrap({ id: "b1" }))))
		const { data } = await booksService.update("b1", { isbn: "978-0" })
		expect((data as { id: string }).id).toBe("b1")
	})

	it("remove DELETEs /books/:id", async () => {
		let called = false
		server.use(http.delete(`${API}/books/b1`, () => {
			called = true
			return HttpResponse.json(wrap({}))
		}))
		await booksService.remove("b1")
		expect(called).toBe(true)
	})
})

describe("papersService", () => {
	it("list hits /academic-papers", async () => {
		let called = false
		server.use(http.get(`${API}/academic-papers`, () => {
			called = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		await papersService.list()
		expect(called).toBe(true)
	})

	it("create POSTs to /academic-papers with the cleaned body", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/academic-papers`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({}), { status: 201 })
		}))
		await papersService.create({
			category_id: "c1",
			translations: [{ lang: "ar", title: "x", authors: [], keywords: [], is_default: true }],
		})
		expect(body).toMatchObject({ category_id: "c1" })
	})
})

describe("galleryService", () => {
	it("list hits /gallery", async () => {
		let called = false
		server.use(http.get(`${API}/gallery`, () => {
			called = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		await galleryService.list()
		expect(called).toBe(true)
	})

	it("create POSTs with media_id and optional fields", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/gallery`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({}))
		}))
		await galleryService.create({
			media_id: "m1",
			translations: [{ lang: "ar", title: "صورة" }],
		})
		expect(body).toMatchObject({ media_id: "m1" })
	})

	it("remove uses media_id as the path id (gallery is keyed by media_id, not gallery_id)", async () => {
		let captured = ""
		server.use(http.delete(`${API}/gallery/:id`, ({ params }) => {
			captured = String(params.id)
			return HttpResponse.json(wrap({}))
		}))
		await galleryService.remove("m1")
		expect(captured).toBe("m1")
	})
})
