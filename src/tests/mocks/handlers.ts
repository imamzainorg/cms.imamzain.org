import { http, HttpResponse } from "msw"

const API = "http://localhost:3000/api/v1"

export const handlers = [
	http.post(`${API}/auth/login`, () =>
		HttpResponse.json({ access_token: "test-token", user: { id: "u1", username: "admin", is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), roles: [] } })
	),

	http.get(`${API}/auth/me`, () =>
		HttpResponse.json({ id: "u1", username: "admin", is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), roles: [] })
	),

	http.get(`${API}/posts/admin`, () =>
		HttpResponse.json({ posts: [], total: 0 })
	),

	http.get(`${API}/books`, () =>
		HttpResponse.json({ books: [], total: 0 })
	),

	http.get(`${API}/academic-papers`, () =>
		HttpResponse.json({ papers: [], total: 0 })
	),

	http.get(`${API}/gallery`, () =>
		HttpResponse.json({ images: [], total: 0 })
	),

	http.get(`${API}/forms/contacts`, () =>
		HttpResponse.json({ contacts: [], total: 0 })
	),

	http.get(`${API}/forms/proxy-visits`, () =>
		HttpResponse.json({ visits: [], total: 0 })
	),

	http.get(`${API}/newsletter/subscribers`, () =>
		HttpResponse.json({ subscribers: [], total: 0 })
	),

	http.get(`${API}/post-categories`, () =>
		HttpResponse.json({ categories: [{ id: "cat1", translations: [{ lang: "en", title: "News", slug: "news", description: null }] }] })
	),

	http.get(`${API}/book-categories`, () =>
		HttpResponse.json({ categories: [] })
	),

	http.get(`${API}/academic-paper-categories`, () =>
		HttpResponse.json({ categories: [] })
	),

	http.get(`${API}/users`, () =>
		HttpResponse.json({ users: [], total: 0 })
	),

	http.get(`${API}/roles`, () =>
		HttpResponse.json({ roles: [] })
	),

	http.get(`${API}/roles/permissions`, () =>
		HttpResponse.json({ permissions: [] })
	),

	http.get(`${API}/languages/all`, () =>
		HttpResponse.json([{ code: "ar", name: "Arabic", is_active: true, is_rtl: true }, { code: "en", name: "English", is_active: true, is_rtl: false }])
	),

	http.get(`${API}/audit-logs`, () =>
		HttpResponse.json({ logs: [], total: 0 })
	),

	http.patch(`${API}/auth/me/password`, () =>
		HttpResponse.json({ message: "Password changed" })
	),
]