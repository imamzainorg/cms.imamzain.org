import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import {
	useHadithCalendar,
	useTodayHadith,
	useHijriDate,
	useSetHijriDate,
	useCreateHadith,
	useUpdateHadith,
	useRestoreHadith,
} from "@/lib/queries/daily-hadiths"
import { formatHijriDay, hijriMonthName, HIJRI_MONTHS } from "@/lib/hijri"
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

const HIJRI = { year: 1448, month: 5, day: 9, month_name: "جمادى الأولى", provisional: false, source: "sistani" }

describe("Hijri helpers", () => {
	it("names the twelve months as the API does", () => {
		expect(HIJRI_MONTHS).toHaveLength(12)
		expect(hijriMonthName(5)).toBe("جمادى الأولى")
		expect(hijriMonthName(9)).toBe("شهر رمضان")
		expect(hijriMonthName(0)).toBe("")
		expect(hijriMonthName(13)).toBe("")
		expect(hijriMonthName(null)).toBe("")
	})

	it("formats a day, and returns null for a hadith without one", () => {
		expect(formatHijriDay(5, 9)).toBe("9 جمادى الأولى")
		expect(formatHijriDay(null, null)).toBeNull()
		expect(formatHijriDay(5, null)).toBeNull()
	})
})

describe("daily-hadiths hooks (Hijri calendar)", () => {
	it("useHadithCalendar browses the PUBLIC endpoint with the Hijri month filter", async () => {
		let url: URL | null = null
		server.use(http.get(`${API}/daily-hadiths`, ({ request }) => {
			url = new URL(request.url)
			return HttpResponse.json(wrap(paginated([
				{ id: "h1", hijri_month: 5, hijri_day: 1, content: "x", source: null, lang: "ar" },
			])))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useHadithCalendar({ hijri_month: 5, page: 1, limit: 30 }), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(url!.pathname).toBe("/api/v1/daily-hadiths")
		expect(url!.searchParams.get("hijri_month")).toBe("5")
		// No filter the API would reject (display_date/date/from/to are gone).
		expect(url!.searchParams.has("date")).toBe(false)
		expect(url!.searchParams.has("from")).toBe(false)
		expect(result.current.data?.items[0].hijri_day).toBe(1)
	})

	it("useHadithCalendar stays idle when disabled", async () => {
		const client = buildQueryClient()
		const { result } = renderHook(() => useHadithCalendar({ hijri_day: 3 }, { enabled: false }), { wrapper: wrapped(client) })
		expect(result.current.fetchStatus).toBe("idle")
	})

	it("useTodayHadith returns the hadith together with today's Hijri date from meta", async () => {
		server.use(http.get(`${API}/daily-hadiths/today`, () =>
			HttpResponse.json({
				...wrap({ id: "h1", content: "نص", source: "المصدر", lang: "ar" }),
				meta: { date: "2026-10-21", hijri: HIJRI, source: "scheduled" },
			}),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => useTodayHadith(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.hadith?.content).toBe("نص")
		expect(result.current.data?.meta?.hijri.month_name).toBe("جمادى الأولى")
		expect(result.current.data?.meta?.source).toBe("scheduled")
	})

	it("useTodayHadith copes with a day that has no hadith (data: null)", async () => {
		server.use(http.get(`${API}/daily-hadiths/today`, () =>
			HttpResponse.json({
				...wrap(null),
				meta: { date: "2026-10-21", hijri: HIJRI, source: "empty" },
			}),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => useTodayHadith(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.hadith).toBeNull()
		expect(result.current.data?.meta?.hijri.day).toBe(9)
	})

	it("useHijriDate reads the public Hijri date", async () => {
		server.use(http.get(`${API}/daily-hadiths/hijri-date`, () =>
			HttpResponse.json(wrap({ date: "2026-10-21", ...HIJRI })),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => useHijriDate(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.month).toBe(5)
	})

	it("useSetHijriDate PUTs {year, month, day}", async () => {
		let body: unknown = null
		server.use(http.put(`${API}/daily-hadiths/hijri-date`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({ date: "2026-10-21", ...HIJRI, source: "manual" }))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useSetHijriDate(), { wrapper: wrapped(client) })
		await act(async () => { await result.current.mutateAsync({ year: 1448, month: 5, day: 9 }) })
		expect(body).toEqual({ year: 1448, month: 5, day: 9 })
	})

	it("create sends hijri_month + hijri_day, never the removed display_date", async () => {
		let body: Record<string, unknown> = {}
		server.use(http.post(`${API}/daily-hadiths`, async ({ request }) => {
			body = (await request.json()) as Record<string, unknown>
			return HttpResponse.json(wrap({ id: "h1" }))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useCreateHadith(), { wrapper: wrapped(client) })
		await act(async () => {
			await result.current.mutateAsync({
				hijri_month: 5,
				hijri_day: 9,
				translations: [{ lang: "ar", content: "نص" }],
			})
		})
		expect(body.hijri_month).toBe(5)
		expect(body.hijri_day).toBe(9)
		expect("display_date" in body).toBe(false)
		expect("is_default" in ((body.translations as object[])[0])).toBe(false)
	})

	it("update can take a hadith off the calendar with null/null", async () => {
		let body: Record<string, unknown> = {}
		server.use(http.patch(`${API}/daily-hadiths/h1`, async ({ request }) => {
			body = (await request.json()) as Record<string, unknown>
			return HttpResponse.json(wrap(null))
		}))
		const client = buildQueryClient()
		const { result } = renderHook(() => useUpdateHadith(), { wrapper: wrapped(client) })
		await act(async () => {
			await result.current.mutateAsync({ id: "h1", body: { hijri_month: null, hijri_day: null } })
		})
		expect(body).toEqual({ hijri_month: null, hijri_day: null })
	})

	it("restore surfaces the unscheduled outcome from message + meta (data is null)", async () => {
		server.use(http.post(`${API}/daily-hadiths/h1/restore`, () =>
			HttpResponse.json({
				...wrap(null),
				message: "Hadith restored without its schedule: 9 جمادى الأولى is now taken by another hadith",
				meta: { unscheduled: true, previous_hijri_month: 5, previous_hijri_day: 9 },
			}),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => useRestoreHadith(), { wrapper: wrapped(client) })
		let out: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined
		await act(async () => { out = await result.current.mutateAsync("h1") })
		expect(out?.meta?.unscheduled).toBe(true)
		expect(out?.meta?.previous_hijri_month).toBe(5)
		expect(out?.meta?.previous_hijri_day).toBe(9)
	})
})
