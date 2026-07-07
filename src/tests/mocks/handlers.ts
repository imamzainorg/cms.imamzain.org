import { http, HttpResponse } from "msw"
import { wrap, paginated } from "../utils"

const API = "http://localhost:3000/api/v1"

const mockUser = {
	id: "u1",
	username: "admin",
	is_active: true,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	roles: [],
	permissions: [],
}

/**
 * Default handlers — return correctly-shaped empty paginated responses so any
 * unmocked GET hit during a test doesn't crash on `data.items.map(...)`.
 * Individual tests override these via `server.use(...)` for specific scenarios.
 */
export const handlers = [
	// Auth — the real endpoint returns refresh_token alongside accessToken
	// (the auth store persists it for the rotation flow in src/lib/api.ts).
	http.post(`${API}/auth/login`, () =>
		HttpResponse.json(wrap({ accessToken: "test-token", refresh_token: "test-refresh", user: mockUser })),
	),
	http.get(`${API}/auth/me`, () => HttpResponse.json(wrap(mockUser))),
	http.patch(`${API}/auth/me/password`, () => HttpResponse.json(wrap({ message: "Password changed" }))),

	// Paginated resources — `PaginatedResponse<T>` shape
	http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/books`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/academic-papers`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/gallery`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/media`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/forms/contacts`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/forms/proxy-visits`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/forms/qutuf-sajjadiya-contest/attempts`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/newsletter/subscribers`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/post-categories`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/book-categories`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/academic-paper-categories`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/gallery-categories`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/users`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/roles`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/roles/permissions`, () => HttpResponse.json(wrap(paginated([])))),
	http.get(`${API}/audit-logs`, () => HttpResponse.json(wrap(paginated([])))),

	// Languages — returns an array, not PaginatedResponse
	http.get(`${API}/languages`, () =>
		HttpResponse.json(wrap([
			{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true },
			{ code: "en", name: "English", native_name: "English", is_active: true },
		])),
	),
	http.get(`${API}/languages/all`, () =>
		HttpResponse.json(wrap([
			{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true },
			{ code: "en", name: "English", native_name: "English", is_active: true },
		])),
	),
]
