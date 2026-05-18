import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { screen, waitFor, fireEvent, act } from "@testing-library/react"
import { navigationMock, resetNavigationMocks } from "../../mocks/next-navigation"

vi.mock("next/navigation", () => navigationMock)

import RolesPage from "@/app/(dashboard)/dashboard/roles/page"
import { renderWithQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const role = {
	id: "r1",
	name: "editor",
	role_translations: [{ lang: "ar", title: "محرّر", description: null }],
	permissions: [{ id: "p1", name: "posts:create" }],
}

const perm2 = { id: "p2", name: "posts:delete" }

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); resetNavigationMocks() })
afterAll(() => server.close())

describe("RolesPage", () => {
	it("lists roles and auto-selects the first one, showing its permission matrix", async () => {
		server.use(
			http.get(`${API}/roles`, () => HttpResponse.json(wrap(paginated([role])))),
			http.get(`${API}/roles/permissions`, () =>
				HttpResponse.json(wrap(paginated([role.permissions[0], perm2]))),
			),
		)
		renderWithQueryClient(<RolesPage />)
		// "محرّر" appears in BOTH the left rail and the selected-detail header
		await waitFor(() => expect(screen.getAllByText("محرّر").length).toBeGreaterThanOrEqual(2))
		// Permission count "1 / 2 صلاحية" reflects auto-selection of the only role
		await waitFor(() => expect(screen.getByText(/\/ 2 صلاحية/)).toBeInTheDocument())
	})

	it("shows an empty state and the create button when no roles exist", async () => {
		server.use(
			http.get(`${API}/roles`, () => HttpResponse.json(wrap(paginated([])))),
			http.get(`${API}/roles/permissions`, () => HttpResponse.json(wrap(paginated([])))),
		)
		renderWithQueryClient(<RolesPage />)
		await waitFor(() => expect(screen.getByText(/لا توجد أدوار بعد/)).toBeInTheDocument())
	})

	it("opens the create-role dialog when 'دور جديد' is clicked", async () => {
		server.use(
			http.get(`${API}/roles`, () => HttpResponse.json(wrap(paginated([role])))),
			http.get(`${API}/roles/permissions`, () => HttpResponse.json(wrap(paginated([])))),
		)
		renderWithQueryClient(<RolesPage />)
		await waitFor(() => expect(screen.getAllByText("محرّر").length).toBeGreaterThanOrEqual(1))

		const newButtons = screen.getAllByText("دور جديد")
		await act(async () => { fireEvent.click(newButtons[0]) })

		await waitFor(() =>
			expect(screen.getByPlaceholderText("editor")).toBeInTheDocument(),
		)
	})
})
