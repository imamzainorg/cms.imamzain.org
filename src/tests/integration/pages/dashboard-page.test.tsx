import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import { navigationMock, resetNavigationMocks } from "../../mocks/next-navigation"
import { useAuthStore } from "@/store/auth"

vi.mock("next/navigation", () => navigationMock)

import DashboardPage from "@/app/(dashboard)/dashboard/page"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); resetNavigationMocks() })
afterAll(() => server.close())

function seedAuth() {
	useAuthStore.setState({
		user: {
			id: "u1",
			username: "admin",
			created_at: "2024-01-01",
			roles: ["admin"],
			permissions: [],
		},
		isLoading: false,
	})
}

const statsPayload = {
	recent_window_days: 7,
	posts: { total: 42, published: 30, drafts: 12, recent: 5 },
	library: { books: 13, academic_papers: 7, gallery_images: 88, media_assets: 200 },
	users: { total: 9 },
	newsletter: { active_subscribers: 100, inactive_subscribers: 10, recent_subscribers: 4 },
	forms: { contact_new: 5, contact_recent: 11, proxy_visit_pending: 2, proxy_visit_recent: 3 },
	contest: { attempts_recent: 50 },
}

describe("DashboardPage", () => {
	it("renders greeting, content stats, and action cards", async () => {
		seedAuth()
		server.use(
			http.get(`${API}/dashboard/stats`, () => HttpResponse.json(wrap(statsPayload))),
			http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([], { total: 42 })))),
		)
		renderWithQueryClient(<DashboardPage />)
		// Greeting shows username
		await waitFor(() => expect(screen.getByText(/admin/)).toBeInTheDocument())
		// Stats from /dashboard/stats
		await waitFor(() => {
			expect(screen.getByText("42")).toBeInTheDocument()
			expect(screen.getByText("13")).toBeInTheDocument()
			expect(screen.getByText("7")).toBeInTheDocument()
			expect(screen.getByText("88")).toBeInTheDocument()
		})
		// Action counts
		expect(screen.getByText("5")).toBeInTheDocument()
		expect(screen.getByText("2")).toBeInTheDocument()
		expect(screen.getByText("100")).toBeInTheDocument()
	})

	it("renders 'no posts yet' empty state when there are no recent posts", async () => {
		seedAuth()
		server.use(
			http.get(`${API}/dashboard/stats`, () => HttpResponse.json(wrap({
				...statsPayload,
				posts: { total: 0, published: 0, drafts: 0, recent: 0 },
			}))),
			http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([])))),
		)
		renderWithQueryClient(<DashboardPage />)
		await waitFor(() => expect(screen.getByText(/لا توجد مقالات بعد/)).toBeInTheDocument())
	})
})
