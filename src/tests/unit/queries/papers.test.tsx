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
	useTogglePublishPaper,
} from "@/lib/queries/papers"
import { queryKeys } from "@/lib/queries/keys"
import type { AcademicPaper } from "@/types/papers"
import { buildQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const mockPaper: AcademicPaper = {
	id: "ap1",
	category_id: "c1",
	published_year: "2024",
	pdf_url: null,
	document_languages: ["ar"],
	views: 0,
	is_published: true,
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
	it("fetches papers through the ADMIN route and unwraps the pagination payload", async () => {
		server.use(http.get(`${API}/academic-papers/admin`, () =>
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
		let called = false
		server.use(http.get(`${API}/academic-papers/admin/:id`, () => { called = true; return HttpResponse.json(wrap(mockPaper)) }))
		const client = buildQueryClient()
		renderHook(() => usePaper(undefined), { wrapper: wrapped(client) })
		await new Promise((r) => setTimeout(r, 30))
		expect(called).toBe(false)
	})

	it("fetches a single paper by id through the ADMIN route", async () => {
		server.use(http.get(`${API}/academic-papers/admin/ap1`, () => HttpResponse.json(wrap(mockPaper))))
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
			http.get(`${API}/academic-papers/admin`, () => { listHits++; return HttpResponse.json(wrap(paginated([]))) }),
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

	it("useTogglePublishPaper flips is_published in the cached list optimistically, before the server responds", async () => {
		let publishBody: unknown
		// Backend delays its response so we can observe the optimistic state mid-flight.
		let resolveServer: (() => void) | undefined
		server.use(
			http.get(`${API}/academic-papers/admin`, () => HttpResponse.json(wrap(paginated([mockPaper])))),
			http.patch(`${API}/academic-papers/ap1/publish`, async ({ request }) => {
				publishBody = await request.json()
				await new Promise<void>((r) => { resolveServer = r })
				return HttpResponse.json(wrap({ ...mockPaper, is_published: false }))
			}),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => usePapersList({ page: 1, limit: 20 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		expect(list.current.data?.items[0].is_published).toBe(true)

		const { result: toggle } = renderHook(() => useTogglePublishPaper(), { wrapper: wrapped(client) })
		act(() => { toggle.current.mutate({ id: "ap1", is_published: false }) })

		const listKey = queryKeys.papers.list({ page: 1, limit: 20 })
		await waitFor(() => {
			const cached = client.getQueryData<{ items: AcademicPaper[] }>(listKey)
			expect(cached?.items[0].is_published).toBe(false)
		})

		resolveServer?.()
		await waitFor(() => expect(toggle.current.isSuccess).toBe(true))
		expect(publishBody).toEqual({ is_published: false })
	})
})
