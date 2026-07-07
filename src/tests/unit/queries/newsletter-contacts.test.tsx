import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import {
	useSubscribersList,
	useSubscriberCount,
	useToggleSubscriber,
	useDeleteSubscriber,
} from "@/lib/queries/newsletter"
import {
	useContactsList,
	useContactCount,
	useUpdateContact,
	useDeleteContact,
} from "@/lib/queries/contacts"
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

describe("newsletter hooks", () => {
	it("useSubscriberCount returns the pagination total only", async () => {
		server.use(http.get(`${API}/newsletter/subscribers`, () =>
			HttpResponse.json(wrap(paginated([], { total: 42 }))),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => useSubscriberCount({ is_active: true }), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toBe(42)
	})

	it("count queries with different filters use distinct cache entries", async () => {
		const hits: string[] = []
		server.use(http.get(`${API}/newsletter/subscribers`, ({ request }) => {
			const url = new URL(request.url)
			hits.push(url.searchParams.get("is_active") ?? "(none)")
			return HttpResponse.json(wrap(paginated([], { total: 1 })))
		}))
		const client = buildQueryClient()
		const h1 = renderHook(() => useSubscriberCount({ is_active: true }), { wrapper: wrapped(client) })
		const h2 = renderHook(() => useSubscriberCount({ is_active: false }), { wrapper: wrapped(client) })
		const h3 = renderHook(() => useSubscriberCount({}), { wrapper: wrapped(client) })
		await waitFor(() => {
			expect(h1.result.current.isSuccess && h2.result.current.isSuccess && h3.result.current.isSuccess).toBe(true)
		})
		// Three different filter combinations → three distinct queries (Query dedupes
		// each, but React 19 dev double-invoke can fire each more than once).
		expect(new Set(hits)).toEqual(new Set(["(none)", "false", "true"]))
	})

	it("toggle and delete both invalidate the newsletter.all branch", async () => {
		let listHits = 0
		server.use(
			http.get(`${API}/newsletter/subscribers`, () => {
				listHits++
				return HttpResponse.json(wrap(paginated([])))
			}),
			http.post(`${API}/newsletter/subscribers/s1/unsubscribe`, () => HttpResponse.json(wrap({}))),
			http.post(`${API}/newsletter/subscribers/s1/resubscribe`, () => HttpResponse.json(wrap({}))),
			http.delete(`${API}/newsletter/subscribers/s1`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useSubscribersList({ page: 1, limit: 50 }), {
			wrapper: wrapped(client),
		})
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		let prev = listHits

		const { result: toggle } = renderHook(() => useToggleSubscriber(), { wrapper: wrapped(client) })
		await act(async () => { await toggle.current.mutateAsync({ id: "s1", is_active: true }) })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
		prev = listHits

		const { result: del } = renderHook(() => useDeleteSubscriber(), { wrapper: wrapped(client) })
		await act(async () => { await del.current.mutateAsync("s1") })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
	})
})

describe("contacts hooks", () => {
	it("useContactCount sends ?status= to the server and returns pagination.total", async () => {
		// `ContactQueryDto` whitelists `?status=` now — the count is a `limit=1`
		// probe that reads the server-filtered `pagination.total` directly.
		let captured: URL | null = null
		server.use(http.get(`${API}/forms/contacts`, ({ request }) => {
			captured = new URL(request.url)
			return HttpResponse.json(wrap(paginated([], { total: 2 })))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useContactCount({ status: "NEW" }), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(captured!.searchParams.get("status")).toBe("NEW")
		expect(captured!.searchParams.get("limit")).toBe("1")
		expect(result.current.data).toBe(2)
	})

	it("update sends the correct status body and invalidates the list", async () => {
		let updateBody: unknown = null
		let listHits = 0
		server.use(
			http.get(`${API}/forms/contacts`, () => { listHits++; return HttpResponse.json(wrap(paginated([])))}),
			http.patch(`${API}/forms/contacts/c1`, async ({ request }) => {
				updateBody = await request.json()
				return HttpResponse.json(wrap({}))
			}),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useContactsList({ page: 1, limit: 20 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))

		const before = listHits
		const { result: u } = renderHook(() => useUpdateContact(), { wrapper: wrapped(client) })
		await act(async () => {
			await u.current.mutateAsync({ id: "c1", body: { status: "RESPONDED" } })
		})
		expect(updateBody).toEqual({ status: "RESPONDED" })
		await waitFor(() => expect(listHits).toBeGreaterThan(before))
	})

	it("delete invalidates the list", async () => {
		let listHits = 0
		server.use(
			http.get(`${API}/forms/contacts`, () => { listHits++; return HttpResponse.json(wrap(paginated([])))}),
			http.delete(`${API}/forms/contacts/c1`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useContactsList({ page: 1, limit: 20 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		const before = listHits

		const { result: d } = renderHook(() => useDeleteContact(), { wrapper: wrapped(client) })
		await act(async () => { await d.current.mutateAsync("c1") })
		await waitFor(() => expect(listHits).toBeGreaterThan(before))
	})
})
