import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor } from "@testing-library/react"
import { navigationMock, resetNavigationMocks } from "../../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import NewsletterPage from "@/app/(dashboard)/dashboard/newsletter/page"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const sub = {
	id: "s1",
	email: "user@example.com",
	is_active: true,
	unsubscribed_at: null,
	subscribed_at: "2024-01-01",
}

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); resetNavigationMocks() })
afterAll(() => server.close())

describe("NewsletterPage", () => {
	it("shows count cards using the limit:1 stat queries", async () => {
		server.use(http.get(`${API}/newsletter/subscribers`, ({ request }) => {
			const url = new URL(request.url)
			const isActive = url.searchParams.get("is_active")
			const limit = Number(url.searchParams.get("limit") ?? 50)
			if (limit === 1) {
				// distinct totals per filter
				if (isActive === "true") return HttpResponse.json(wrap(paginated([], { total: 10 })))
				if (isActive === "false") return HttpResponse.json(wrap(paginated([], { total: 3 })))
				return HttpResponse.json(wrap(paginated([], { total: 13 })))
			}
			return HttpResponse.json(wrap(paginated([sub])))
		}))
		renderWithQueryClient(<NewsletterPage />)
		await waitFor(() => expect(screen.getByText("user@example.com")).toBeInTheDocument())
		// Three count cards
		await waitFor(() => {
			expect(screen.getByText("13")).toBeInTheDocument()
			expect(screen.getByText("10")).toBeInTheDocument()
			expect(screen.getByText("3")).toBeInTheDocument()
		})
	})

	it("renders the empty state when no subscribers", async () => {
		server.use(http.get(`${API}/newsletter/subscribers`, () =>
			HttpResponse.json(wrap(paginated([])))
		))
		renderWithQueryClient(<NewsletterPage />)
		await waitFor(() => expect(screen.getByText(/لا يوجد مشتركون/)).toBeInTheDocument())
	})
})
