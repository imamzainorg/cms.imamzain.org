import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import {
	useBooksList,
	useBook,
	useCreateBook,
	useUpdateBook,
	useDeleteBook,
} from "@/lib/queries/books"
import { queryKeys } from "@/lib/queries/keys"
import type { Book } from "@/types/books"
import { buildQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const mockBook: Book = {
	id: "b1",
	category_id: "c1",
	cover_image_id: "m1",
	isbn: null,
	pages: null,
	publish_year: null,
	part_number: null,
	parts: null,
	views: 0,
	created_at: "2024-01-01",
	updated_at: "2024-01-01",
	book_translations: [
		{ lang: "ar", title: "كتاب", author: null, publisher: null, description: null, series: null, is_default: true },
	],
	translation: { lang: "ar", title: "كتاب", author: null, publisher: null, description: null, series: null, is_default: true },
	book_categories: { id: "c1", created_at: "2024-01-01", book_category_translations: [] },
	media: { id: "m1", url: "https://cdn.test/m1.jpg" },
}

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function wrapped(client: QueryClient) {
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
}

describe("useBooksList", () => {
	it("fetches books and unwraps the pagination payload", async () => {
		server.use(http.get(`${API}/books`, () => HttpResponse.json(wrap(paginated([mockBook])))))
		const client = buildQueryClient()
		const { result } = renderHook(() => useBooksList({ page: 1, limit: 24 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.items[0].id).toBe("b1")
	})
})

describe("useBook", () => {
	it("skips fetch when id is undefined", async () => {
		let called = false
		server.use(http.get(`${API}/books/:id`, () => { called = true; return HttpResponse.json(wrap(mockBook)) }))
		const client = buildQueryClient()
		renderHook(() => useBook(undefined), { wrapper: wrapped(client) })
		await new Promise((r) => setTimeout(r, 30))
		expect(called).toBe(false)
	})

	it("fetches a single book by id", async () => {
		server.use(http.get(`${API}/books/b1`, () => HttpResponse.json(wrap(mockBook))))
		const client = buildQueryClient()
		const { result } = renderHook(() => useBook("b1"), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.id).toBe("b1")
	})
})

describe("book mutations invalidate the list cache", () => {
	it("useDeleteBook invalidates books.lists", async () => {
		let listHits = 0
		server.use(
			http.get(`${API}/books`, () => { listHits++; return HttpResponse.json(wrap(paginated([mockBook]))) }),
			http.delete(`${API}/books/b1`, () => HttpResponse.json(wrap({ message: "ok" }))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useBooksList({ page: 1, limit: 24 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		const before = listHits

		const { result: del } = renderHook(() => useDeleteBook(), { wrapper: wrapped(client) })
		await act(async () => { await del.current.mutateAsync("b1") })
		await waitFor(() => expect(listHits).toBeGreaterThan(before))
	})

	it("useCreateBook invalidates books.lists", async () => {
		let listHits = 0
		server.use(
			http.get(`${API}/books`, () => { listHits++; return HttpResponse.json(wrap(paginated([]))) }),
			http.post(`${API}/books`, () => HttpResponse.json(wrap(mockBook))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useBooksList({ page: 1, limit: 24 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		const before = listHits

		const { result: create } = renderHook(() => useCreateBook(), { wrapper: wrapped(client) })
		await act(async () => {
			await create.current.mutateAsync({
				category_id: "c1",
				translations: [{ lang: "ar", title: "x", is_default: true }],
			})
		})
		await waitFor(() => expect(listHits).toBeGreaterThan(before))
	})

	it("useUpdateBook invalidates list AND the specific detail", async () => {
		server.use(
			http.get(`${API}/books`, () => HttpResponse.json(wrap(paginated([mockBook])))),
			http.get(`${API}/books/b1`, () => HttpResponse.json(wrap(mockBook))),
			http.patch(`${API}/books/b1`, () => HttpResponse.json(wrap(mockBook))),
		)
		const client = buildQueryClient()
		// prime both list and detail
		const { result: list } = renderHook(() => useBooksList({ page: 1, limit: 24 }), { wrapper: wrapped(client) })
		const { result: detail } = renderHook(() => useBook("b1"), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess && detail.current.isSuccess).toBe(true))

		const { result: update } = renderHook(() => useUpdateBook(), { wrapper: wrapped(client) })
		await act(async () => {
			await update.current.mutateAsync({ id: "b1", body: { isbn: "978" } })
		})

		// both caches were invalidated → both refetch
		const listKey = queryKeys.books.list({ page: 1, limit: 24 })
		const detailKey = queryKeys.books.detail("b1")
		expect(client.getQueryState(listKey)?.fetchStatus).not.toBe("fetching")
		expect(client.getQueryState(detailKey)?.fetchStatus).not.toBe("fetching")
	})
})
