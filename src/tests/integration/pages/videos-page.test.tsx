import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMock, resetNavigationMocks } from "../../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import VideosPage from "@/app/(dashboard)/dashboard/videos/page"
import { useAuthStore } from "@/store/auth"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const base = {
	slug: "",
	kind: "video",
	description: null,
	thumbnail_url: null,
	published_at: "2026-10-01T00:00:00Z",
	duration: "PT1H2M3S",
	view_count: 10,
	is_featured: false,
	speaker: null,
	series: [],
	featured_order: 0,
	speaker_id: null,
	updated_at: "2026-10-01T00:00:00Z",
}
const live = { ...base, video_id: "vidLive", slug: "vidLive", title: "فيديو منشور", status: "published", speaker: { id: "sp1", name: "الشيخ أحمد" }, speaker_id: "sp1" }
const waiting = { ...base, video_id: "vidWait", slug: "vidWait", title: "فيديو بانتظار المراجعة", status: "pending" }

const server = setupServer(
	http.get(`${API}/speakers`, () => HttpResponse.json(wrap(paginated([
		{ id: "sp1", speaker_translations: [{ lang: "ar", name: "الشيخ أحمد", is_default: true }], translation: null, audio_count: 0, created_at: "x", updated_at: "x" },
	])))),
	http.get(`${API}/videos/admin`, () => HttpResponse.json(wrap(paginated([live, waiting])))),
)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); resetNavigationMocks(); useAuthStore.setState({ user: null, isLoading: false }) })
afterAll(() => server.close())

function signInWith(...permissions: string[]) {
	useAuthStore.setState({
		user: { id: "u", username: "a", created_at: "x", roles: [], permissions, must_change_password: false },
		isLoading: false,
	})
}

describe("VideosPage", () => {
	it("publishes a waiting video in one click, sending only the status", async () => {
		signInWith("videos:read", "videos:update")
		let patched: { id: string; body: unknown } | null = null
		server.use(http.patch(`${API}/videos/admin/:id`, async ({ params, request }) => {
			patched = { id: String(params.id), body: await request.json() }
			return HttpResponse.json(wrap({ ...waiting, status: "published" }))
		}))
		renderWithQueryClient(<VideosPage />)
		await waitFor(() => expect(screen.getByText("فيديو بانتظار المراجعة")).toBeInTheDocument())

		// Only the waiting row offers "publish"; the live one offers hide.
		expect(screen.getAllByLabelText("نشر")).toHaveLength(1)
		await userEvent.click(screen.getByLabelText("نشر"))
		await waitFor(() => expect(patched).toEqual({ id: "vidWait", body: { status: "published" } }))
	})

	it("shows no write actions to a read-only user", async () => {
		signInWith("videos:read")
		renderWithQueryClient(<VideosPage />)
		await waitFor(() => expect(screen.getByText("فيديو منشور")).toBeInTheDocument())
		expect(screen.queryByLabelText("نشر")).not.toBeInTheDocument()
		expect(screen.queryByLabelText("إخفاء")).not.toBeInTheDocument()
		expect(screen.queryByLabelText("تعديل")).not.toBeInTheDocument()
	})

	it("locks the slug of a published video and clears the speaker with null", async () => {
		signInWith("videos:read", "videos:update")
		let body: unknown = null
		server.use(http.patch(`${API}/videos/admin/:id`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({ ...live, speaker: null, speaker_id: null }))
		}))
		renderWithQueryClient(<VideosPage />)
		await waitFor(() => expect(screen.getByText("فيديو منشور")).toBeInTheDocument())

		// The published row is the first one: its edit button opens the editor.
		await userEvent.click(screen.getAllByLabelText("تعديل")[0])
		expect(await screen.findByLabelText("الرابط المختصر")).toBeDisabled()

		await userEvent.click(screen.getByRole("combobox", { name: "المحاضر" }))
		await userEvent.click(screen.getByRole("option", { name: "بدون محاضر" }))
		await userEvent.click(screen.getByRole("button", { name: "حفظ" }))
		await waitFor(() => expect(body).toEqual({ speaker_id: null }))
	})

	it("filters by status and kind on the server", async () => {
		signInWith("videos:read")
		const seen: Array<{ status: string | null; kind: string | null }> = []
		server.use(http.get(`${API}/videos/admin`, ({ request }) => {
			const q = new URL(request.url).searchParams
			seen.push({ status: q.get("status"), kind: q.get("kind") })
			return HttpResponse.json(wrap(paginated([live])))
		}))
		renderWithQueryClient(<VideosPage />)
		await waitFor(() => expect(screen.getByText("فيديو منشور")).toBeInTheDocument())

		await userEvent.click(screen.getByRole("button", { name: "بانتظار المراجعة" }))
		await userEvent.click(screen.getByRole("button", { name: "مقطع قصير" }))
		await waitFor(() => expect(seen).toContainEqual({ status: "pending", kind: "short" }))
	})
})
