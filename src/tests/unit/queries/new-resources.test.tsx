import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { useDashboardStats } from "@/lib/queries/dashboard"
import {
	useSettingsList,
	useUpsertSetting,
	useDeleteSetting,
} from "@/lib/queries/settings"
import {
	useDailyHadithsList,
	useTodayHadith,
} from "@/lib/queries/daily-hadiths"
import { useResourceAuditHistory } from "@/lib/queries/audit-logs"
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

describe("useDashboardStats", () => {
	it("fetches the aggregated dashboard stats", async () => {
		let hit = false
		server.use(http.get(`${API}/dashboard/stats`, () => {
			hit = true
			return HttpResponse.json(wrap({
				recent_window_days: 7,
				posts: { total: 10, published: 6, drafts: 4, recent: 1 },
				audios: { total: 2, published: 1, drafts: 1 },
				library: { books: 1, academic_papers: 1, gallery_images: 1, media_assets: 1 },
				users: { total: 1 },
				newsletter: { active_subscribers: 1, inactive_subscribers: 0, recent_subscribers: 0 },
				forms: { contact_new: 0, contact_recent: 0, proxy_visit_pending: 0, proxy_visit_recent: 0, unsent_notifications: 0 },
				contest: { attempts_recent: 0 },
			}))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useDashboardStats(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(hit).toBe(true)
		expect(result.current.data?.posts.published).toBe(6)
	})
})

describe("settings hooks", () => {
	it("useSettingsList hits /settings (admin endpoint, not /public)", async () => {
		let path: string | null = null
		server.use(http.get(`${API}/settings`, ({ request }) => {
			path = new URL(request.url).pathname
			return HttpResponse.json(wrap([{ key: "site_name", value: "Test", type: "string", is_public: true, updated_at: "2024" }]))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useSettingsList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(path).toBe("/api/v1/settings")
	})

	it("upsert PUTs the body and invalidates list", async () => {
		let body: unknown = null
		let listHits = 0
		server.use(
			http.get(`${API}/settings`, () => { listHits++; return HttpResponse.json(wrap([])) }),
			http.put(`${API}/settings/site_name`, async ({ request }) => {
				body = await request.json()
				return HttpResponse.json(wrap({ key: "site_name", value: "x", type: "string", is_public: true, updated_at: "2024" }))
			}),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useSettingsList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		const before = listHits

		const { result: m } = renderHook(() => useUpsertSetting(), { wrapper: wrapped(client) })
		await act(async () => { await m.current.mutateAsync({ key: "site_name", body: { value: "x", type: "string", is_public: true } }) })
		expect(body).toMatchObject({ value: "x" })
		await waitFor(() => expect(listHits).toBeGreaterThan(before))
	})

	it("delete invalidates list", async () => {
		let listHits = 0
		server.use(
			http.get(`${API}/settings`, () => { listHits++; return HttpResponse.json(wrap([])) }),
			http.delete(`${API}/settings/foo`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useSettingsList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		const before = listHits
		const { result: d } = renderHook(() => useDeleteSetting(), { wrapper: wrapped(client) })
		await act(async () => { await d.current.mutateAsync("foo") })
		await waitFor(() => expect(listHits).toBeGreaterThan(before))
	})
})

describe("daily-hadiths hooks", () => {
	it("useTodayHadith hits /daily-hadiths/today (public endpoint)", async () => {
		let path = ""
		server.use(http.get(`${API}/daily-hadiths/today`, ({ request }) => {
			path = new URL(request.url).pathname
			return HttpResponse.json(wrap({ id: "h1", content: "...", source: null, lang: "ar" }))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useTodayHadith(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(path.endsWith("/today")).toBe(true)
	})

	it("useDailyHadithsList hits the admin route, not the public lookup endpoint", async () => {
		let path = ""
		server.use(http.get(`${API}/daily-hadiths/admin`, ({ request }) => {
			path = new URL(request.url).pathname
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useDailyHadithsList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(path.endsWith("/daily-hadiths/admin")).toBe(true)
	})
})

describe("useResourceAuditHistory", () => {
	it("filters by resource_type and resource_id", async () => {
		let captured: URL | null = null
		server.use(http.get(`${API}/audit-logs`, ({ request }) => {
			captured = new URL(request.url)
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useResourceAuditHistory("post", "p1"), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(captured!.searchParams.get("resource_type")).toBe("post")
		expect(captured!.searchParams.get("resource_id")).toBe("p1")
	})

	it("does not fire when resource_id is undefined", async () => {
		const client = buildQueryClient()
		const { result } = renderHook(() => useResourceAuditHistory("post", undefined), { wrapper: wrapped(client) })
		await new Promise((r) => setTimeout(r, 30))
		expect(result.current.fetchStatus).toBe("idle")
	})
})
