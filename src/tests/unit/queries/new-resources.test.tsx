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
	usePinHadith,
	useUnpinHadith,
} from "@/lib/queries/daily-hadiths"
import {
	useCampaignsList,
	useCreateCampaign,
	useSendCampaign,
	useCancelCampaign,
} from "@/lib/queries/campaigns"
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
			return HttpResponse.json(wrap({ id: "h1", content: "...", source: null, lang: "ar", is_pinned: false }))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useTodayHadith(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(path.endsWith("/today")).toBe(true)
	})

	it("useDailyHadithsList paginates", async () => {
		server.use(http.get(`${API}/daily-hadiths`, () => HttpResponse.json(wrap(paginated([])))))
		const client = buildQueryClient()
		const { result } = renderHook(() => useDailyHadithsList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	it("pin + unpin POST/DELETE the right endpoints with the right body", async () => {
		let pinBody: unknown = null
		let unpinPath = ""
		server.use(
			http.post(`${API}/daily-hadiths/pins`, async ({ request }) => {
				pinBody = await request.json()
				return HttpResponse.json(wrap({ pin_date: "2026-05-01", hadith_id: "h1", created_at: "2024" }))
			}),
			http.delete(`${API}/daily-hadiths/pins/:date`, ({ params }) => {
				unpinPath = String(params.date)
				return HttpResponse.json(wrap({}))
			}),
		)
		const client = buildQueryClient()
		const { result: pin } = renderHook(() => usePinHadith(), { wrapper: wrapped(client) })
		await act(async () => { await pin.current.mutateAsync({ pin_date: "2026-05-01", hadith_id: "h1" }) })
		expect(pinBody).toEqual({ pin_date: "2026-05-01", hadith_id: "h1" })

		const { result: unpin } = renderHook(() => useUnpinHadith(), { wrapper: wrapped(client) })
		await act(async () => { await unpin.current.mutateAsync("2026-05-01") })
		expect(unpinPath).toBe("2026-05-01")
	})
})

describe("campaigns hooks", () => {
	it("useCampaignsList passes status filter", async () => {
		let status: string | null = null
		server.use(http.get(`${API}/newsletter/campaigns`, ({ request }) => {
			status = new URL(request.url).searchParams.get("status")
			return HttpResponse.json(wrap(paginated([])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useCampaignsList({ status: "draft" }), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(status).toBe("draft")
	})

	it("create + send + cancel hit the right endpoints", async () => {
		let createHit = false
		let sendHit = false
		let cancelHit = false
		server.use(
			http.get(`${API}/newsletter/campaigns`, () => HttpResponse.json(wrap(paginated([])))),
			http.post(`${API}/newsletter/campaigns`, () => {
				createHit = true
				return HttpResponse.json(wrap({ id: "c1", subject: "x", body_html: "x", status: "draft" }))
			}),
			http.post(`${API}/newsletter/campaigns/c1/send`, () => {
				sendHit = true
				return HttpResponse.json(wrap({ id: "c1", recipient_count: 10 }))
			}),
			http.post(`${API}/newsletter/campaigns/c1/cancel`, () => {
				cancelHit = true
				return HttpResponse.json(wrap({ id: "c1", status: "cancelled" }))
			}),
		)
		const client = buildQueryClient()
		const { result: c } = renderHook(() => useCreateCampaign(), { wrapper: wrapped(client) })
		await act(async () => { await c.current.mutateAsync({ subject: "x", body_html: "x" }) })
		expect(createHit).toBe(true)
		const { result: s } = renderHook(() => useSendCampaign(), { wrapper: wrapped(client) })
		await act(async () => { await s.current.mutateAsync("c1") })
		expect(sendHit).toBe(true)
		const { result: cancel } = renderHook(() => useCancelCampaign(), { wrapper: wrapped(client) })
		await act(async () => { await cancel.current.mutateAsync("c1") })
		expect(cancelHit).toBe(true)
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
