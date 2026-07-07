import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { booksService } from "@/services/books.service"
import { papersService } from "@/services/papers.service"

const API = "http://localhost:3000/api/v1"
function wrap<T>(data: T) { return { success: true, timestamp: new Date().toISOString(), message: "OK", data } }
function paginated<T>(items: T[]) {
	return { items, pagination: { page: 1, limit: 20, total: items.length, pages: 1 } }
}

const mockBook = {
	id: "b1",
	category_id: "cat1",
	cover_image_id: null,
	isbn: "978-0-06-112008-4",
	pages: 300,
	publish_year: "2020",
	pdf_url: "https://example.com/sahifa.pdf",
	part_number: null,
	parts: null,
	views: 0,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	book_translations: [
		{ lang: "en", title: "Sahifa", author: "Imam Zain", publisher: "Dar", description: null, series: null, slug: "sahifa", meta_title: null, meta_description: null, og_image_id: null, is_default: true },
	],
	translation: { lang: "en", title: "Sahifa", author: "Imam Zain", publisher: "Dar", description: null, series: null, slug: "sahifa", meta_title: null, meta_description: null, og_image_id: null, is_default: true },
}

const mockPaper = {
	id: "pp1",
	category_id: "cat2",
	published_year: "2023",
	pdf_url: "https://example.com/paper.pdf",
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
	http.get(`${API}/books`, () => HttpResponse.json(wrap(paginated([mockBook])))),
	http.get(`${API}/books/b1`, () => HttpResponse.json(wrap(mockBook))),
	http.post(`${API}/books`, () => HttpResponse.json(wrap(mockBook), { status: 201 })),
	http.patch(`${API}/books/b1`, () => HttpResponse.json(wrap({ ...mockBook, isbn: "000" }))),
	http.delete(`${API}/books/b1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),

	http.get(`${API}/academic-papers`, () => HttpResponse.json(wrap(paginated([mockPaperListItem])))),
	http.get(`${API}/academic-papers/pp1`, () => HttpResponse.json(wrap(mockPaper))),
	http.post(`${API}/academic-papers`, () => HttpResponse.json(wrap(mockPaper), { status: 201 })),
	http.patch(`${API}/academic-papers/pp1`, () => HttpResponse.json(wrap({ ...mockPaper, published_year: "2024" }))),
	http.delete(`${API}/academic-papers/pp1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("booksService", () => {
	it("lists books", async () => {
		const { data } = await booksService.list()
		expect(data.items[0].isbn).toBe("978-0-06-112008-4")
		expect(data.items[0].pdf_url).toBe("https://example.com/sahifa.pdf")
		expect(data.items[0].book_translations[0].title).toBe("Sahifa")
		expect(data.items[0].book_translations[0].slug).toBe("sahifa")
	})
	it("creates a book with snake_case payload", async () => {
		const { data } = await booksService.create({
			category_id: "cat1",
			translations: [{ lang: "en", title: "Sahifa", is_default: true }],
		})
		expect(data.id).toBe("b1")
	})
	it("updates a book with PATCH", async () => {
		const { data } = await booksService.update("b1", { isbn: "000" })
		expect(data.isbn).toBe("000")
	})
})

describe("papersService", () => {
	it("uses academic-papers endpoint", async () => {
		const { data } = await papersService.list()
		expect(data.items[0].pdf_url).toBe("https://example.com/paper.pdf")
		expect(data.items[0].academic_paper_translations[0].title).toBe("Research Paper")
	})
	it("creates a paper with snake_case fields", async () => {
		const { data } = await papersService.create({
			category_id: "cat2",
			translations: [{ lang: "en", title: "Paper", authors: ["Author One"], keywords: [], is_default: true }],
		})
		expect(data.id).toBe("pp1")
	})
	it("updates a paper with PATCH", async () => {
		const { data } = await papersService.update("pp1", { published_year: "2024" })
		expect(data.published_year).toBe("2024")
	})
})
