import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { postsService } from "@/services/posts.service"

const API = "http://localhost:3000/api/v1"
function wrap<T>(data: T) { return { success: true, timestamp: new Date().toISOString(), message: "OK", data } }
function paginated<T>(items: T[]) {
	return { items, pagination: { page: 1, limit: 20, total: items.length, pages: 1 } }
}

// LIST payloads are slim: no `body` on translations, reading_time_minutes 0.
const mockPostListItem = {
	id: "p1",
	category_id: "cat1",
	cover_image_id: null,
	is_published: false,
	is_featured: false,
	published_at: null,
	views: 0,
	created_at: "2024-01-01T00:00:00Z",
	updated_at: "2024-01-01T00:00:00Z",
	post_translations: [
		{ lang: "en", title: "Test Post", summary: null, slug: "test-post", is_default: true, reading_time_minutes: 0 },
	],
	translation: { lang: "en", title: "Test Post", summary: null, slug: "test-post", is_default: true, reading_time_minutes: 0 },
}

// DETAIL payloads carry the full translation incl. `body` + derived read time.
const mockPostDetail = {
	...mockPostListItem,
	post_translations: [
		{ lang: "en", title: "Test Post", summary: null, body: "Content", slug: "test-post", is_default: true, reading_time_minutes: 1 },
	],
	translation: { lang: "en", title: "Test Post", summary: null, body: "Content", slug: "test-post", is_default: true, reading_time_minutes: 1 },
}

const server = setupServer(
	http.get(`${API}/posts/admin`, () => HttpResponse.json(wrap(paginated([mockPostListItem])))),
	http.get(`${API}/posts/admin/p1`, () => HttpResponse.json(wrap(mockPostDetail))),
	http.post(`${API}/posts`, () => HttpResponse.json(wrap(mockPostDetail), { status: 201 })),
	http.patch(`${API}/posts/p1`, () => HttpResponse.json(wrap({ ...mockPostDetail, is_published: true }))),
	http.patch(`${API}/posts/p1/publish`, () => HttpResponse.json(wrap({ ...mockPostDetail, is_published: true }))),
	http.delete(`${API}/posts/p1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("postsService", () => {
	it("lists posts from admin endpoint with pagination metadata", async () => {
		const { data } = await postsService.list({ page: 1 })
		expect(data.items).toHaveLength(1)
		expect(data.pagination.total).toBe(1)
		expect(data.items[0].id).toBe("p1")
	})
	it("gets a single post by id (admin)", async () => {
		const { data } = await postsService.get("p1")
		expect(data.id).toBe("p1")
		expect(data.post_translations[0].title).toBe("Test Post")
	})
	it("creates a post", async () => {
		const { data } = await postsService.create({
			category_id: "cat1",
			translations: [{ lang: "en", title: "Test Post", body: "Content", slug: "test-post", is_default: true }],
		})
		expect(data.id).toBe("p1")
	})
	it("updates a post with PATCH", async () => {
		const { data } = await postsService.update("p1", { is_published: true })
		expect(data.is_published).toBe(true)
	})
	it("toggles publish status", async () => {
		const { data } = await postsService.togglePublish("p1", true)
		expect(data.is_published).toBe(true)
	})
	it("deletes a post", async () => {
		await postsService.remove("p1")
	})
})
