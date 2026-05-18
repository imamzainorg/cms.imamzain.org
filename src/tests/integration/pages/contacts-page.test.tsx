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
	it("renders the inbox with NEW count badge derived client-side", async () => {
		// `?status=` is stripped on the way out (backend's ValidationPipe rejects
		// non-whitelisted params); the page derives badge counts from the items.
		const items = [
			{ ...contact },
			{ ...contact, id: "c2", name: "علي ثاني" },
			{ ...contact, id: "c3", name: "علي ثالث" },
			{ ...contact, id: "c4", name: "مردود", status: "RESPONDED" as const },
		]
		server.use(http.get(`${API}/forms/contacts`, ({ request }) => {
			const status = new URL(request.url).searchParams.get("status")
			// Anything that passes `status=` would be a regression — the API would 400.
			expect(status).toBeNull()
			return HttpResponse.json(wrap(paginated(items)))
		}))
		renderWithQueryClient(<ContactsPage />)
		await waitFor(() => expect(screen.getByText("علي محمد")).toBeInTheDocument())
		// NEW counter badge shows 3 (3 of 4 items are NEW)
		await waitFor(() => expect(screen.getByText("3")).toBeInTheDocument())
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
