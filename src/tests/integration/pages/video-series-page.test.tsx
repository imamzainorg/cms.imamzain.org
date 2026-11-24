import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMock, resetNavigationMocks } from "../../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import VideoSeriesPage from "@/app/(dashboard)/dashboard/video-series/page"
import { useAuthStore } from "@/store/auth"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const series = (over: Record<string, unknown> = {}) => ({
	slug: "faid-al-tufuf",
	playlist_id: "PL1",
	title: "فيض الطفوف",
	description: "",
	thumbnail_url: null,
	section: "programmes",
	speaker: null,
	speaker_id: null,
	video_count: 8,
	item_count: 8,
	latest_published_at: "2026-07-14T14:00:02.000Z",
	is_hidden: false,
	display_order: 3,
	updated_at: "2026-07-14T14:00:02.000Z",
	...over,
})

let autoPublish = true
const server = setupServer(
	http.get(`${API}/videos/admin/settings`, () => HttpResponse.json(wrap({ auto_publish: autoPublish }))),
	http.get(`${API}/speakers`, () => HttpResponse.json(wrap(paginated([])))),
)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
	server.resetHandlers()
	resetNavigationMocks()
	autoPublish = true
	useAuthStore.setState({ user: null, isLoading: false })
})
afterAll(() => server.close())

function signInWith(...permissions: string[]) {
	useAuthStore.setState({
		user: { id: "u", username: "a", created_at: "x", roles: [], permissions, must_change_password: false },
		isLoading: false,
	})
}

describe("VideoSeriesPage", () => {
	it("keeps the slug of a public series locked, and renames it only together with hiding it", async () => {
		signInWith("videos:read", "videos:update")
		server.use(http.get(`${API}/videos/admin/series`, () => HttpResponse.json(wrap([series()]))))
		let body: unknown
		server.use(
			http.patch(`${API}/videos/admin/series/PL1`, async ({ request }) => {
				body = await request.json()
				return HttpResponse.json(wrap(series({ is_hidden: true, slug: "faid-new" })))
			}),
		)
		renderWithQueryClient(<VideoSeriesPage />)
		await userEvent.click(await screen.findByTitle("تعديل"))

		const slug = await screen.findByLabelText(/الرابط المختصر/)
		expect(slug).toBeDisabled()

		await userEvent.click(screen.getByRole("checkbox", { name: /إخفاء السلسلة/ }))
		expect(slug).toBeEnabled()
		await userEvent.clear(slug)
		await userEvent.type(slug, "faid-new")
		await userEvent.click(screen.getByRole("button", { name: "حفظ" }))

		// Only the changed fields go out, and the rename travels with the hide.
		await waitFor(() => expect(body).toEqual({ slug: "faid-new", is_hidden: true }))
	})

	it("rejects a slug the API would refuse before sending anything", async () => {
		signInWith("videos:read", "videos:update")
		server.use(http.get(`${API}/videos/admin/series`, () => HttpResponse.json(wrap([series({ is_hidden: true })]))))
		let sent = false
		server.use(http.patch(`${API}/videos/admin/series/PL1`, () => { sent = true; return HttpResponse.json(wrap(series())) }))
		renderWithQueryClient(<VideoSeriesPage />)
		await userEvent.click(await screen.findByTitle("تعديل"))

		const slug = await screen.findByLabelText(/الرابط المختصر/)
		await userEvent.clear(slug)
		await userEvent.type(slug, "رابط عربي")
		expect(screen.getByText(/أحرف لاتينية وأرقام فقط/)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "حفظ" })).toBeDisabled()
		expect(sent).toBe(false)
	})

	it("turns auto-publish off with a PUT, and lets a read-only user see but not change it", async () => {
		signInWith("videos:read", "videos:update")
		server.use(http.get(`${API}/videos/admin/series`, () => HttpResponse.json(wrap([]))))
		let put: unknown
		server.use(
			http.put(`${API}/videos/admin/settings`, async ({ request }) => {
				put = await request.json()
				return HttpResponse.json(wrap({ auto_publish: false }))
			}),
		)
		const { unmount } = renderWithQueryClient(<VideoSeriesPage />)
		const toggle = await screen.findByRole("switch", { name: /النشر التلقائي/ })
		await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"))
		await userEvent.click(toggle)
		await waitFor(() => expect(put).toEqual({ auto_publish: false }))
		await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"))
		unmount()

		signInWith("videos:read")
		renderWithQueryClient(<VideoSeriesPage />)
		expect(await screen.findByRole("switch", { name: /النشر التلقائي/ })).toBeDisabled()
	})
})
