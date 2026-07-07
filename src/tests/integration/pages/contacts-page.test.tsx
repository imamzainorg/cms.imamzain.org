import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor, fireEvent, act } from "@testing-library/react"
import { navigationMock, resetNavigationMocks } from "../../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import ContactsPage from "@/app/(dashboard)/dashboard/contacts/page"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const contact = {
	id: "c1",
	name: "علي محمد",
	email: "ali@example.com",
	subject: null,
	message: "السلام عليكم، أردت السؤال عن المكتبة.",
	status: "NEW" as const,
	created_at: "2024-01-15T10:00:00Z",
}

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); resetNavigationMocks() })
afterAll(() => server.close())

describe("ContactsPage", () => {
	it("renders the inbox with count badges from server-side ?status= totals", async () => {
		// `ContactQueryDto` whitelists `?status=` now — the page fires one
		// `limit=1` count query per status and reads `pagination.total`;
		// the visible list itself is fetched WITHOUT client-side filtering.
		const items = [
			{ ...contact },
			{ ...contact, id: "c2", name: "علي ثاني" },
			{ ...contact, id: "c3", name: "علي ثالث" },
			{ ...contact, id: "c4", name: "مردود", status: "RESPONDED" as const },
		]
		const countRequests: Array<{ status: string | null; limit: string | null }> = []
		server.use(http.get(`${API}/forms/contacts`, ({ request }) => {
			const url = new URL(request.url)
			const status = url.searchParams.get("status")
			const limit = url.searchParams.get("limit")
			if (limit === "1") {
				// Count probe — the server filters, the client only reads `total`.
				countRequests.push({ status, limit })
				const totals: Record<string, number> = { NEW: 3, RESPONDED: 1, SPAM: 0 }
				return HttpResponse.json(wrap(paginated([], { total: totals[status ?? ""] ?? 0 })))
			}
			// Main list request — server-side pagination, all statuses (no filter tab).
			expect(status).toBeNull()
			return HttpResponse.json(wrap(paginated(items)))
		}))
		renderWithQueryClient(<ContactsPage />)
		await waitFor(() => expect(screen.getByText("علي محمد")).toBeInTheDocument())
		// NEW badge = server total for status=NEW; inbox badge = NEW + RESPONDED.
		await waitFor(() => expect(screen.getByText("3")).toBeInTheDocument())
		expect(screen.getByText("4")).toBeInTheDocument()
		// Each count probe passed its status through to the server.
		await waitFor(() => {
			expect(new Set(countRequests.map((r) => r.status))).toEqual(new Set(["NEW", "RESPONDED", "SPAM"]))
		})
	})

	it("clicking a folder tab sends ?status= to the server for the list", async () => {
		const listStatuses: Array<string | null> = []
		server.use(http.get(`${API}/forms/contacts`, ({ request }) => {
			const url = new URL(request.url)
			if (url.searchParams.get("limit") === "1") {
				return HttpResponse.json(wrap(paginated([], { total: 0 })))
			}
			listStatuses.push(url.searchParams.get("status"))
			return HttpResponse.json(wrap(paginated([contact])))
		}))
		renderWithQueryClient(<ContactsPage />)
		await waitFor(() => expect(screen.getByText("علي محمد")).toBeInTheDocument())
		expect(listStatuses[listStatuses.length - 1]).toBeNull()

		// The "جديدة" folder tab drives the server-side filter.
		await act(async () => { fireEvent.click(screen.getByText("جديدة")) })
		await waitFor(() => expect(listStatuses[listStatuses.length - 1]).toBe("NEW"))
	})

	it("shows an 'empty inbox' message when filter has no contacts", async () => {
		server.use(http.get(`${API}/forms/contacts`, () => HttpResponse.json(wrap(paginated([])))))
		renderWithQueryClient(<ContactsPage />)
		await waitFor(() => expect(screen.getByText(/لا توجد رسائل/)).toBeInTheDocument())
	})

	it("selecting a contact shows its message in the reading pane", async () => {
		server.use(http.get(`${API}/forms/contacts`, () => HttpResponse.json(wrap(paginated([contact])))))
		renderWithQueryClient(<ContactsPage />)
		await waitFor(() => expect(screen.getByText("علي محمد")).toBeInTheDocument())
		await act(async () => { fireEvent.click(screen.getByText("علي محمد")) })
		await waitFor(() => expect(screen.getByText(/رسالة من علي محمد/)).toBeInTheDocument())
	})
})
