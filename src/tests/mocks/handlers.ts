import { http, HttpResponse } from "msw"

const API = "http://localhost:3000/api/v1"

// Wrap a payload the same way the real API does
function wrap<T>(data: T) {
	return { success: true, timestamp: new Date().toISOString(), message: "OK", data }
}

const mockUser = {
	id: "u1",
	username: "admin",
	is_active: true,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	roles: [],
}

export const handlers = [
	http.post(`${API}/auth/login`, () =>
		HttpResponse.json(wrap({ accessToken: "test-token", user: mockUser }))
	),

	http.get(`${API}/auth/me`, () => HttpResponse.json(wrap(mockUser))),

	http.patch(`${API}/auth/me/password`, () => HttpResponse.json(wrap({ message: "Password changed" }))),

	http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap({ posts: [], total: 0 }))),

	http.get(`${API}/books`, () => HttpResponse.json(wrap({ books: [], total: 0 }))),

	http.get(`${API}/academic-papers`, () => HttpResponse.json(wrap({ papers: [], total: 0 }))),

	http.get(`${API}/gallery`, () => HttpResponse.json(wrap({ images: [], total: 0 }))),

	http.get(`${API}/forms/contacts`, () => HttpResponse.json(wrap({ contacts: [], total: 0 }))),

	http.get(`${API}/forms/proxy-visits`, () => HttpResponse.json(wrap({ visits: [], total: 0 }))),

	http.get(`${API}/newsletter/subscribers`, () => HttpResponse.json(wrap({ subscribers: [], total: 0 }))),

	http.get(`${API}/post-categories`, () =>
		HttpResponse.json(wrap({ categories: [{ id: "cat1", translations: [{ lang: "en", title: "News", slug: "news", description: null }] }] }))
	),

	http.get(`${API}/book-categories`, () => HttpResponse.json(wrap({ categories: [] }))),

	http.get(`${API}/academic-paper-categories`, () => HttpResponse.json(wrap({ categories: [] }))),

	http.get(`${API}/users`, () => HttpResponse.json(wrap({ users: [], total: 0 }))),

	http.get(`${API}/roles`, () => HttpResponse.json(wrap({ roles: [] }))),

	http.get(`${API}/roles/permissions`, () => HttpResponse.json(wrap({ permissions: [] }))),

	http.get(`${API}/languages/all`, () =>
		HttpResponse.json(wrap([
			{ code: "ar", name: "Arabic", is_active: true, is_rtl: true },
			{ code: "en", name: "English", is_active: true, is_rtl: false },
		]))
	),

	http.get(`${API}/audit-logs`, () => HttpResponse.json(wrap({ logs: [], total: 0 }))),
]