import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { booksService } from "@/services/books.service"
import { papersService } from "@/services/papers.service"

const API = "http://localhost:3000/api/v1"
const R2 = "http://localhost:3000/r2-upload"
function wrap<T>(data: T) { return { success: true, timestamp: new Date().toISOString(), message: "OK", data } }
function paginated<T>(items: T[]) {
	return { items, pagination: { page: 1, limit: 20, total: items.length, pages: 1 } }
}

const mockBook = {
	id: "b1",
	category_id: "cat1",
	cover_image_id: null,
	slug: "sahifa",
	isbn: "978-0-06-112008-4",
	pages: 300,
	publish_year: "2020",
	pdf_url: "https://example.com/sahifa.pdf",
	document_languages: ["ar"],
	part_number: null,
	parts: null,
	views: 0,
	is_published: true,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	book_translations: [
		{ lang: "en", title: "Sahifa", author: "Imam Zain", publisher: "Dar", description: null, series: null, meta_title: null, meta_description: null, og_image_id: null, is_default: true },
	],
	translation: { lang: "en", title: "Sahifa", author: "Imam Zain", publisher: "Dar", description: null, series: null, meta_title: null, meta_description: null, og_image_id: null, is_default: true },
}

const mockPaper = {
	id: "pp1",
	category_id: "cat2",
	published_year: "2023",
	pdf_url: "https://example.com/paper.pdf",
	document_languages: ["ar"],
	views: 0,
	is_published: true,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	academic_paper_translations: [
		{ lang: "en", title: "Research Paper", abstract: "Abstract", authors: ["Author One"], keywords: ["Islam"], publication_venue: "Journal", page_count: 20, is_default: true },
	],
	translation: { lang: "en", title: "Research Paper", abstract: "Abstract", authors: ["Author One"], keywords: ["Islam"], publication_venue: "Journal", page_count: 20, is_default: true },
}

// GET /academic-papers is a LIST payload — the API drops `abstract` from list
// translations (slim lists, round 15.2). Detail keeps the full shape.
function stripAbstract<T extends { abstract?: unknown }>(t: T): Omit<T, "abstract"> {
	const slim = { ...t }
	delete slim.abstract
	return slim
}
const mockPaperListItem = {
	...mockPaper,
	academic_paper_translations: mockPaper.academic_paper_translations.map(stripAbstract),
	translation: stripAbstract(mockPaper.translation),
}

const server = setupServer(
	http.get(`${API}/books/admin`, () => HttpResponse.json(wrap(paginated([mockBook])))),
	http.get(`${API}/books/admin/b1`, () => HttpResponse.json(wrap(mockBook))),
	http.post(`${API}/books`, () => HttpResponse.json(wrap(mockBook), { status: 201 })),
	http.patch(`${API}/books/b1`, () => HttpResponse.json(wrap({ ...mockBook, isbn: "000" }))),
	http.patch(`${API}/books/b1/publish`, () => HttpResponse.json(wrap({ ...mockBook, is_published: false }))),
	http.delete(`${API}/books/b1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),

	http.get(`${API}/academic-papers/admin`, () => HttpResponse.json(wrap(paginated([mockPaperListItem])))),
	http.get(`${API}/academic-papers/admin/pp1`, () => HttpResponse.json(wrap(mockPaper))),
	http.post(`${API}/academic-papers`, () => HttpResponse.json(wrap(mockPaper), { status: 201 })),
	http.patch(`${API}/academic-papers/pp1`, () => HttpResponse.json(wrap({ ...mockPaper, published_year: "2024" }))),
	http.patch(`${API}/academic-papers/pp1/publish`, () => HttpResponse.json(wrap({ ...mockPaper, is_published: false }))),
	http.delete(`${API}/academic-papers/pp1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("booksService", () => {
	it("lists and reads details through the ADMIN routes (public /books hides drafts)", async () => {
		const { data } = await booksService.list()
		expect(data.items[0].isbn).toBe("978-0-06-112008-4")
		expect(data.items[0].pdf_url).toBe("https://example.com/sahifa.pdf")
		expect(data.items[0].slug).toBe("sahifa")
		expect(data.items[0].document_languages).toEqual(["ar"])
		expect(data.items[0].book_translations[0].title).toBe("Sahifa")
		const { data: detail } = await booksService.get("b1")
		expect(detail.id).toBe("b1")
	})
	it("creates a book with a top-level snake_case payload", async () => {
		let body: unknown
		server.use(http.post(`${API}/books`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap(mockBook), { status: 201 })
		}))
		const { data } = await booksService.create({
			category_id: "cat1",
			slug: "sahifa",
			document_languages: ["ar"],
			is_published: true,
			translations: [{ lang: "en", title: "Sahifa", is_default: true }],
		})
		expect(data.id).toBe("b1")
		expect(body).toMatchObject({ slug: "sahifa", document_languages: ["ar"], is_published: true })
	})
	it("updates a book with PATCH", async () => {
		const { data } = await booksService.update("b1", { isbn: "000" })
		expect(data.isbn).toBe("000")
	})
	it("toggles publish via PATCH /:id/publish with { is_published }", async () => {
		let body: unknown
		server.use(http.patch(`${API}/books/b1/publish`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({ ...mockBook, is_published: false }))
		}))
		const { data } = await booksService.togglePublish("b1", false)
		expect(body).toEqual({ is_published: false })
		expect(data.is_published).toBe(false)
	})
	it("uploads a PDF via pre-signed PUT with NO confirm step (filename-only request, unlike audios)", async () => {
		let uploadUrlBody: unknown
		let putContentType: string | null = null
		server.use(
			http.post(`${API}/books/upload-url`, async ({ request }) => {
				uploadUrlBody = await request.json()
				return HttpResponse.json(wrap({
					uploadUrl: `${R2}/book-key`,
					key: "books/pdf/sahifa.pdf",
					publicUrl: "https://cdn.example.org/books/pdf/sahifa.pdf",
					maxBytes: 157286400,
				}))
			}),
			http.put(`${R2}/book-key`, ({ request }) => {
				putContentType = request.headers.get("content-type")
				return new HttpResponse(null, { status: 200 })
			}),
		)
		const file = new File([new Uint8Array(64)], "sahifa.pdf", { type: "application/pdf" })
		const { publicUrl } = await booksService.uploadPdf(file)
		expect(uploadUrlBody).toEqual({ filename: "sahifa.pdf" })
		expect(putContentType).toBe("application/pdf")
		expect(publicUrl).toBe("https://cdn.example.org/books/pdf/sahifa.pdf")
	})
})

describe("papersService", () => {
	it("lists and reads details through the ADMIN routes (public /academic-papers hides drafts)", async () => {
		const { data } = await papersService.list()
		expect(data.items[0].pdf_url).toBe("https://example.com/paper.pdf")
		expect(data.items[0].document_languages).toEqual(["ar"])
		expect(data.items[0].academic_paper_translations[0].title).toBe("Research Paper")
		const { data: detail } = await papersService.get("pp1")
		expect(detail.id).toBe("pp1")
	})
	it("creates a paper with snake_case fields — no slug/meta_title/meta_description/og_image_id (removed from the API)", async () => {
		let body: unknown
		server.use(http.post(`${API}/academic-papers`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap(mockPaper), { status: 201 })
		}))
		const { data } = await papersService.create({
			category_id: "cat2",
			document_languages: ["ar"],
			is_published: true,
			translations: [{ lang: "en", title: "Paper", authors: ["Author One"], keywords: [], is_default: true }],
		})
		expect(data.id).toBe("pp1")
		expect(body).toMatchObject({ document_languages: ["ar"], is_published: true })
		const sentTranslation = (body as { translations: Record<string, unknown>[] }).translations[0]
		for (const removed of ["slug", "meta_title", "meta_description", "og_image_id"]) {
			expect(sentTranslation).not.toHaveProperty(removed)
		}
	})
	it("updates a paper with PATCH", async () => {
		const { data } = await papersService.update("pp1", { published_year: "2024" })
		expect(data.published_year).toBe("2024")
	})
	it("toggles publish via PATCH /:id/publish with { is_published }", async () => {
		let body: unknown
		server.use(http.patch(`${API}/academic-papers/pp1/publish`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({ ...mockPaper, is_published: false }))
		}))
		const { data } = await papersService.togglePublish("pp1", false)
		expect(body).toEqual({ is_published: false })
		expect(data.is_published).toBe(false)
	})
	it("uploads a PDF via pre-signed PUT with NO confirm step, reusing the shared pdf-upload helper", async () => {
		let uploadUrlBody: unknown
		let putContentType: string | null = null
		server.use(
			http.post(`${API}/academic-papers/upload-url`, async ({ request }) => {
				uploadUrlBody = await request.json()
				return HttpResponse.json(wrap({
					uploadUrl: `${R2}/paper-key`,
					key: "papers/pdf/paper.pdf",
					publicUrl: "https://cdn.example.org/papers/pdf/paper.pdf",
					maxBytes: 157286400,
				}))
			}),
			http.put(`${R2}/paper-key`, ({ request }) => {
				putContentType = request.headers.get("content-type")
				return new HttpResponse(null, { status: 200 })
			}),
		)
		const file = new File([new Uint8Array(64)], "paper.pdf", { type: "application/pdf" })
		const { publicUrl } = await papersService.uploadPdf(file)
		expect(uploadUrlBody).toEqual({ filename: "paper.pdf" })
		expect(putContentType).toBe("application/pdf")
		expect(publicUrl).toBe("https://cdn.example.org/papers/pdf/paper.pdf")
	})
})
