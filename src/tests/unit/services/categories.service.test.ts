import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { postCategoriesService } from "@/services/post-categories.service"
import { bookCategoriesService } from "@/services/book-categories.service"
import { paperCategoriesService } from "@/services/paper-categories.service"
import { galleryCategoriesService } from "@/services/gallery-categories.service"
import { wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const cases = [
	{ name: "postCategoriesService", svc: postCategoriesService, path: "post-categories" },
	{ name: "bookCategoriesService", svc: bookCategoriesService, path: "book-categories" },
	{ name: "paperCategoriesService", svc: paperCategoriesService, path: "academic-paper-categories" },
	{ name: "galleryCategoriesService", svc: galleryCategoriesService, path: "gallery-categories" },
] as const

describe.each(cases)("$name", ({ svc, path }) => {
	it(`list hits GET /${path}`, async () => {
		let called = false
		server.use(http.get(`${API}/${path}`, () => {
			called = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		await svc.list()
		expect(called).toBe(true)
	})

	it(`get hits GET /${path}/:id`, async () => {
		let captured = ""
		server.use(http.get(`${API}/${path}/:id`, ({ params }) => {
			captured = String(params.id)
			return HttpResponse.json(wrap({ id: captured }))
		}))
		await svc.get("c1")
		expect(captured).toBe("c1")
	})

	it(`create POSTs translations array`, async () => {
		let body: unknown = null
		server.use(http.post(`${API}/${path}`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({}))
		}))
		await svc.create({ translations: [{ lang: "ar", title: "تصنيف" }] })
		expect(body).toEqual({ translations: [{ lang: "ar", title: "تصنيف" }] })
	})

	it(`update PATCHes /${path}/:id`, async () => {
		let captured = ""
		server.use(http.patch(`${API}/${path}/:id`, ({ params }) => {
			captured = String(params.id)
			return HttpResponse.json(wrap({}))
		}))
		await svc.update("c1", { translations: [] })
		expect(captured).toBe("c1")
	})

	it(`remove DELETEs /${path}/:id`, async () => {
		let captured = ""
		server.use(http.delete(`${API}/${path}/:id`, ({ params }) => {
			captured = String(params.id)
			return HttpResponse.json(wrap({}))
		}))
		await svc.remove("c1")
		expect(captured).toBe("c1")
	})
})
