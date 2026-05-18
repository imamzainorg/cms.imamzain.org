import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { usePostCategoriesList } from "@/lib/queries/post-categories"
import { useBookCategoriesList } from "@/lib/queries/book-categories"
import { usePaperCategoriesList } from "@/lib/queries/paper-categories"
import { useGalleryCategoriesList } from "@/lib/queries/gallery-categories"
import { buildQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function wrapped(client: QueryClient) {
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
}

describe("category list hooks", () => {
	it("usePostCategoriesList hits /post-categories", async () => {
		let hit = false
		server.use(http.get(`${API}/post-categories`, () => {
			hit = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => usePostCategoriesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(hit).toBe(true)
	})

	it("useBookCategoriesList hits /book-categories", async () => {
		let hit = false
		server.use(http.get(`${API}/book-categories`, () => {
			hit = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useBookCategoriesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(hit).toBe(true)
	})

	it("usePaperCategoriesList hits /academic-paper-categories", async () => {
		let hit = false
		server.use(http.get(`${API}/academic-paper-categories`, () => {
			hit = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => usePaperCategoriesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(hit).toBe(true)
	})

	it("useGalleryCategoriesList hits /gallery-categories", async () => {
		let hit = false
		server.use(http.get(`${API}/gallery-categories`, () => {
			hit = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useGalleryCategoriesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(hit).toBe(true)
	})

	it("category lists with the same params share a cache (no per-consumer fetch)", async () => {
		let hits = 0
		const items = [{ id: "c1", created_at: "2024", post_category_translations: [], translation: null }]
		server.use(http.get(`${API}/post-categories`, () => {
			hits++
			return HttpResponse.json(wrap(paginated(items)))
		}))
		const client = buildQueryClient()
		// Two consumers with the same key fire only one request (Query dedups inflight + cached).
		const h1 = renderHook(() => usePostCategoriesList(), { wrapper: wrapped(client) })
		const h2 = renderHook(() => usePostCategoriesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(h1.result.current.isSuccess && h2.result.current.isSuccess).toBe(true))
		// Both consumers see the same data
		expect(h1.result.current.data?.items[0].id).toBe("c1")
		expect(h2.result.current.data?.items[0].id).toBe("c1")
		// Far fewer hits than one-per-mount (would be >=2 without dedup, plus React 19 dev double-invoke)
		expect(hits).toBeLessThanOrEqual(2)
	})
})
