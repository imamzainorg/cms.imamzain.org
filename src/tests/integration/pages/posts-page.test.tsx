import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor, fireEvent, act } from "@testing-library/react"
import { navigationMock, resetNavigationMocks, mockPush } from "../../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import PostsPage from "@/app/(dashboard)/dashboard/posts/page"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const mockPost = {
	id: "p1",
	category_id: "c1",
	cover_image_id: null,
	is_published: false,
	published_at: null,
	views: 5,
	created_at: "2024-01-15",
	updated_at: "2024-01-15",
	post_translations: [
		{ lang: "ar", title: "مقالة الاختبار", summary: null, body: "x", slug: "test", is_default: true },
	],
	translation: { lang: "ar", title: "مقالة الاختبار", summary: null, body: "x", slug: "test", is_default: true },
}

const mockCategory = {
	id: "c1",
	created_at: "2024-01-01",
	post_category_translations: [
		{ category_id: "c1", lang: "ar", title: "أخبار", slug: "news", description: null },
	],
	translation: { category_id: "c1", lang: "ar", title: "أخبار", slug: "news", description: null },
}

const server = setupServer(
	http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([mockPost])))),
	http.get(`${API}/post-categories`, () => HttpResponse.json(wrap(paginated([mockCategory])))),
)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); resetNavigationMocks() })
afterAll(() => server.close())

describe("PostsPage", () => {
	it("renders the page header and post list", async () => {
		server.use(
			http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([mockPost])))),
			http.get(`${API}/post-categories`, () => HttpResponse.json(wrap(paginated([mockCategory])))),
		)
		renderWithQueryClient(<PostsPage />)
		await waitFor(() => expect(screen.getByText("مقالة الاختبار")).toBeInTheDocument())
		// Header
		expect(screen.getByText("المقالات")).toBeInTheDocument()
		// Category appears in the filter dropdown
		expect(screen.getByText("أخبار")).toBeInTheDocument()
	})

	it("shows the empty state when no posts match", async () => {
		server.use(
			http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([])))),
			http.get(`${API}/post-categories`, () => HttpResponse.json(wrap(paginated([])))),
		)
		renderWithQueryClient(<PostsPage />)
		await waitFor(() => expect(screen.getByText(/لا توجد مقالات بعد/)).toBeInTheDocument())
	})

	it("routes to the create page when 'مقالة جديدة' is clicked", async () => {
		server.use(
			http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([mockPost])))),
			http.get(`${API}/post-categories`, () => HttpResponse.json(wrap(paginated([])))),
		)
		renderWithQueryClient(<PostsPage />)
		await waitFor(() => expect(screen.getByText("مقالة الاختبار")).toBeInTheDocument())
		const newButton = screen.getAllByText("مقالة جديدة")[0]
		await act(async () => { fireEvent.click(newButton) })
		expect(mockPush).toHaveBeenCalledWith("/dashboard/posts/new")
	})

	it("renders the status filter tabs (all / published / draft)", async () => {
		server.use(
			http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([mockPost])))),
			http.get(`${API}/post-categories`, () => HttpResponse.json(wrap(paginated([])))),
		)
		renderWithQueryClient(<PostsPage />)
		await waitFor(() => expect(screen.getByText("مقالة الاختبار")).toBeInTheDocument())
		// The three status tabs are present (some labels also appear as card status badges)
		expect(screen.getByText("الكل")).toBeInTheDocument()
		expect(screen.getAllByText("منشور").length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText("مسودة").length).toBeGreaterThanOrEqual(1)
	})
})
