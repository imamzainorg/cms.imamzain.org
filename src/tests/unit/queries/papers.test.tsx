import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import {
	usePapersList,
	usePaper,
	useCreatePaper,
	useUpdatePaper,
	useDeletePaper,
} from "@/lib/queries/papers"
import type { AcademicPaper } from "@/types/papers"
import { buildQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const mockPaper: AcademicPaper = {
	id: "ap1",
	category_id: "c1",
	published_year: "2024",
	pdf_url: null,
	created_at: "2024-01-01",
	updated_at: "2024-01-01",
	academic_paper_translations: [{
		lang: "ar", title: "بحث", abstract: null, authors: ["م. أحمد"], keywords: ["fiqh"],
		publication_venue: null, page_count: null, is_default: true,
	}],
	translation: {
		lang: "ar", title: "بحث", abstract: null, authors: ["م. أحمد"], keywords: ["fiqh"],
		publication_venue: null, page_count: null, is_default: true,
	},
	academic_paper_categories: { id: "c1", created_at: "2024-01-01", academic_paper_category_translations: [] },
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

describe("usePapersList", () => {
	it("returns paginated papers", async () => {
		server.use(http.get(`${API}/academic-papers`, () =>
			HttpResponse.json(wrap(paginated([mockPaper]))),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => usePapersList({ page: 1, limit: 20 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.items[0].id).toBe("ap1")
	})
})

describe("usePaper", () => {
	it("guards against undefined id", async () => {
		const client = buildQueryClient()
		const { result } = renderHook(() => usePaper(undefined), { wrapper: wrapped(client) })
		await new Promise((r) => setTimeout(r, 30))
		expect(result.current.fetchStatus).toBe("idle")
	})

	it("fetches by id", async () => {
		server.use(http.get(`${API}/academic-papers/ap1`, () => HttpResponse.json(wrap(mockPaper))))
		const client = buildQueryClient()
		const { result } = renderHook(() => usePaper("ap1"), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.id).toBe("ap1")
	})
})

describe("paper mutations", () => {
	it("create/update/delete all invalidate the list", async () => {
		let listHits = 0
		server.use(
			http.get(`${API}/academic-papers`, () => { listHits++; return HttpResponse.json(wrap(paginated([]))) }),
			http.post(`${API}/academic-papers`, () => HttpResponse.json(wrap(mockPaper))),
			http.patch(`${API}/academic-papers/ap1`, () => HttpResponse.json(wrap(mockPaper))),
			http.delete(`${API}/academic-papers/ap1`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => usePapersList({ page: 1, limit: 20 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		let prev = listHits

		const { result: c } = renderHook(() => useCreatePaper(), { wrapper: wrapped(client) })
		await act(async () => {
			await c.current.mutateAsync({
				category_id: "c1",
				translations: [{ lang: "ar", title: "x", authors: [], keywords: [], is_default: true }],
			})
		})
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
		prev = listHits

		const { result: u } = renderHook(() => useUpdatePaper(), { wrapper: wrapped(client) })
		await act(async () => { await u.current.mutateAsync({ id: "ap1", body: { pdf_url: "x" } }) })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
		prev = listHits

		const { result: d } = renderHook(() => useDeletePaper(), { wrapper: wrapped(client) })
		await act(async () => { await d.current.mutateAsync("ap1") })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
	})
})
