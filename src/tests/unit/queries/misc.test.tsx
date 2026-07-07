import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import {
	useProxyVisitsList,
	useProxyVisitCount,
	useUpdateProxyVisit,
} from "@/lib/queries/proxy-visits"
import { useAuditLogsList } from "@/lib/queries/audit-logs"
import {
	useAllLanguagesList,
	useCreateLanguage,
	useUpdateLanguage,
	useDeleteLanguage,
} from "@/lib/queries/languages"
import { useContestAttemptsList, useContestAttemptsCount } from "@/lib/queries/contest"
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

describe("proxy-visits hooks", () => {
	it("useProxyVisitsList passes page/limit/status through to the server", async () => {
		let captured: URL | null = null
		server.use(http.get(`${API}/forms/proxy-visits`, ({ request }) => {
			captured = new URL(request.url)
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(
			() => useProxyVisitsList({ page: 2, limit: 10, status: "APPROVED" }),
			{ wrapper: wrapped(client) },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(captured!.searchParams.get("page")).toBe("2")
		expect(captured!.searchParams.get("limit")).toBe("10")
		expect(captured!.searchParams.get("status")).toBe("APPROVED")
	})

	it("count sends ?status= to the server and returns pagination.total", async () => {
		// `ProxyVisitQueryDto` whitelists `?status=` now — the count is a
		// `limit=1` probe that reads the server-filtered `pagination.total`.
		let captured: URL | null = null
		server.use(http.get(`${API}/forms/proxy-visits`, ({ request }) => {
			captured = new URL(request.url)
			return HttpResponse.json(wrap(paginated([], { total: 2 })))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useProxyVisitCount({ status: "PENDING" }), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(captured!.searchParams.get("status")).toBe("PENDING")
		expect(captured!.searchParams.get("limit")).toBe("1")
		expect(result.current.data).toBe(2)
	})

	it("update sends body and invalidates list", async () => {
		let listHits = 0
		let body: unknown = null
		server.use(
			http.get(`${API}/forms/proxy-visits`, () => { listHits++; return HttpResponse.json(wrap(paginated([])))}),
			http.patch(`${API}/forms/proxy-visits/v1`, async ({ request }) => {
				body = await request.json()
				return HttpResponse.json(wrap({}))
			}),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useProxyVisitsList({}), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		const before = listHits

		const { result: u } = renderHook(() => useUpdateProxyVisit(), { wrapper: wrapped(client) })
		await act(async () => {
			await u.current.mutateAsync({ id: "v1", body: { status: "APPROVED" } })
		})
		expect(body).toEqual({ status: "APPROVED" })
		await waitFor(() => expect(listHits).toBeGreaterThan(before))
	})
})

describe("audit-logs hook", () => {
	it("passes filter params through", async () => {
		let captured: URL | null = null
		server.use(http.get(`${API}/audit-logs`, ({ request }) => {
			captured = new URL(request.url)
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(
			() => useAuditLogsList({ page: 1, limit: 30, action: "CREATE", resource_type: "post", from: "2024-01-01" }),
			{ wrapper: wrapped(client) },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(captured!.searchParams.get("action")).toBe("CREATE")
		expect(captured!.searchParams.get("resource_type")).toBe("post")
		expect(captured!.searchParams.get("from")).toBe("2024-01-01")
	})
})

describe("languages hooks", () => {
	it("useAllLanguagesList hits /languages/all", async () => {
		let hit = false
		server.use(http.get(`${API}/languages/all`, () => {
			hit = true
			return HttpResponse.json(wrap([{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true }]))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useAllLanguagesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(hit).toBe(true)
	})

	it("create/update/delete invalidate languages.all", async () => {
		let allHits = 0
		server.use(
			http.get(`${API}/languages/all`, () => { allHits++; return HttpResponse.json(wrap([])) }),
			http.post(`${API}/languages`, () => HttpResponse.json(wrap({ code: "fr" }))),
			http.patch(`${API}/languages/fr`, () => HttpResponse.json(wrap({}))),
			http.delete(`${API}/languages/fr`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useAllLanguagesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		let prev = allHits

		const { result: c } = renderHook(() => useCreateLanguage(), { wrapper: wrapped(client) })
		await act(async () => { await c.current.mutateAsync({ code: "fr", name: "French", native_name: "Français" }) })
		await waitFor(() => expect(allHits).toBeGreaterThan(prev))
		prev = allHits

		const { result: u } = renderHook(() => useUpdateLanguage(), { wrapper: wrapped(client) })
		await act(async () => { await u.current.mutateAsync({ code: "fr", body: { is_active: false } }) })
		await waitFor(() => expect(allHits).toBeGreaterThan(prev))
		prev = allHits

		const { result: d } = renderHook(() => useDeleteLanguage(), { wrapper: wrapped(client) })
		await act(async () => { await d.current.mutateAsync("fr") })
		await waitFor(() => expect(allHits).toBeGreaterThan(prev))
	})
})

describe("contest hooks", () => {
	it("useContestAttemptsList passes submitted filter", async () => {
		let submitted: string | null = null
		server.use(http.get(`${API}/forms/qutuf-sajjadiya-contest/attempts`, ({ request }) => {
			submitted = new URL(request.url).searchParams.get("submitted")
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(
			() => useContestAttemptsList({ page: 1, limit: 30, submitted: "true" }),
			{ wrapper: wrapped(client) },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(submitted).toBe("true")
	})

	it("count returns total only", async () => {
		server.use(http.get(`${API}/forms/qutuf-sajjadiya-contest/attempts`, () =>
			HttpResponse.json(wrap(paginated([], { total: 99 }))),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => useContestAttemptsCount({ submitted: "true" }), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toBe(99)
	})
})
