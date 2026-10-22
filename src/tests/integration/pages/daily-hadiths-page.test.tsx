import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMock, resetNavigationMocks } from "../../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import DailyHadithsPage from "@/app/(dashboard)/dashboard/daily-hadiths/page"
import { useAuthStore } from "@/store/auth"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const HIJRI = { year: 1448, month: 5, day: 9, month_name: "جمادى الأولى", provisional: true, source: "sistani" }

const calendarItems = [
	{ id: "h1", hijri_month: 5, hijri_day: 9, content: "حديث اليوم التاسع", source: "نهج البلاغة", lang: "ar" },
	{ id: "h2", hijri_month: 5, hijri_day: 10, content: "حديث اليوم العاشر", source: null, lang: "ar" },
	{ id: "h3", hijri_month: null, hijri_day: null, content: "حديث بلا يوم", source: null, lang: "ar" },
]

const adminRecord = {
	id: "h1",
	hijri_month: 5,
	hijri_day: 9,
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
	daily_hadith_translations: [
		{ lang: "ar", content: "حديث اليوم التاسع", source: "نهج البلاغة" },
		{ lang: "en", content: "The ninth day", source: null },
	],
	translation: { lang: "ar", content: "حديث اليوم التاسع", source: "نهج البلاغة" },
}

const server = setupServer(
	http.get(`${API}/languages`, () => HttpResponse.json(wrap([
		{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true },
		{ code: "en", name: "English", native_name: "English", is_active: true },
	]))),
	http.get(`${API}/languages/all`, () => HttpResponse.json(wrap([]))),
	http.get(`${API}/daily-hadiths/today`, () =>
		HttpResponse.json({
			...wrap({ id: "h1", content: "حديث اليوم التاسع", source: "نهج البلاغة", lang: "ar" }),
			meta: { date: "2026-10-21", hijri: HIJRI, source: "scheduled" },
		}),
	),
)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); resetNavigationMocks(); useAuthStore.setState({ user: null, isLoading: false }) })
afterAll(() => server.close())

function useCalendar(handler?: (url: URL) => void) {
	server.use(http.get(`${API}/daily-hadiths`, ({ request }) => {
		const url = new URL(request.url)
		handler?.(url)
		const month = url.searchParams.get("hijri_month")
		const items = month ? calendarItems.filter((h) => String(h.hijri_month) === month) : calendarItems
		return HttpResponse.json(wrap(paginated(items)))
	}))
}

describe("DailyHadithsPage (Hijri calendar)", () => {
	it("shows today's Hijri date from the API, flags a provisional one, and lists hadiths by Hijri day", async () => {
		useCalendar()
		renderWithQueryClient(<DailyHadithsPage />)

		// Today's card: the date comes from meta.hijri, never computed in the browser.
		await waitFor(() => expect(screen.getByText(/9 جمادى الأولى 1448/)).toBeInTheDocument())
		expect(screen.getByText(/مؤقت/)).toBeInTheDocument()

		// Cards carry their Hijri day; a hadith without one says so.
		await waitFor(() => expect(screen.getByText("10 جمادى الأولى")).toBeInTheDocument())
		expect(screen.getAllByText("9 جمادى الأولى").length).toBeGreaterThan(0)
		expect(screen.getByText(/بلا يوم — لا يظهر على الموقع/)).toBeInTheDocument()
	})

	it("hides the manual-date control from someone without daily-hadiths:update", async () => {
		useCalendar()
		renderWithQueryClient(<DailyHadithsPage />)
		await waitFor(() => expect(screen.getByText(/9 جمادى الأولى 1448/)).toBeInTheDocument())
		expect(screen.queryByText(/ضبط التاريخ الهجري يدوياً/)).not.toBeInTheDocument()
	})

	it("offers the manual-date control to someone who holds it", async () => {
		useAuthStore.setState({
			user: { id: "u", username: "a", created_at: "x", roles: [], permissions: ["daily-hadiths:update"], must_change_password: false },
			isLoading: false,
		})
		useCalendar()
		renderWithQueryClient(<DailyHadithsPage />)
		await waitFor(() => expect(screen.getByText(/ضبط التاريخ الهجري يدوياً/)).toBeInTheDocument())
	})

	it("filters by Hijri month on the server", async () => {
		const seen: Array<string | null> = []
		useCalendar((url) => seen.push(url.searchParams.get("hijri_month")))
		renderWithQueryClient(<DailyHadithsPage />)
		await waitFor(() => expect(screen.getByText("10 جمادى الأولى")).toBeInTheDocument())

		await userEvent.selectOptions(screen.getByLabelText("الشهر الهجري"), "5")
		await waitFor(() => expect(seen).toContain("5"))
		await waitFor(() => expect(screen.queryByText(/بلا يوم — لا يظهر على الموقع/)).not.toBeInTheDocument())
	})

	it("opens the editor on the FULL admin record, not the one-language list row", async () => {
		useCalendar()
		let adminHit = false
		server.use(http.get(`${API}/daily-hadiths/admin/h1`, () => { adminHit = true; return HttpResponse.json(wrap(adminRecord)) }))
		renderWithQueryClient(<DailyHadithsPage />)
		await waitFor(() => expect(screen.getByText("10 جمادى الأولى")).toBeInTheDocument())

		await userEvent.click(screen.getAllByTitle("تعديل")[0])
		await waitFor(() => expect(adminHit).toBe(true))
		// Both stored languages are editable, with the Hijri day preselected.
		await waitFor(() => expect(screen.getByRole("button", { name: /الإنجليزية/ })).toBeInTheDocument())
		expect((screen.getByLabelText("الشهر الهجري", { selector: "select[aria-label]" }) as HTMLSelectElement).value).toBe("5")
		expect((screen.getByLabelText("اليوم من الشهر") as HTMLSelectElement).value).toBe("9")
	})
})
