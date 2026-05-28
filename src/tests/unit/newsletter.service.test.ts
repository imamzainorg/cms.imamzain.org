import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { newsletterService } from "@/services/newsletter.service"

const API = "http://localhost:3000/api/v1"
function wrap<T>(data: T) { return { success: true, timestamp: new Date().toISOString(), message: "OK", data } }
function paginated<T>(items: T[]) {
	return { items, pagination: { page: 1, limit: 20, total: items.length, pages: 1 } }
}

const mockSub = {
	id: "s1",
	email: "test@example.com",
	is_active: true,
	unsubscribed_at: null,
	created_at: "2024-01-01T00:00:00Z",
}

const server = setupServer(
	http.get(`${API}/newsletter/subscribers`, () => HttpResponse.json(wrap(paginated([mockSub])))),
	http.post(`${API}/newsletter/subscribers/s1/unsubscribe`, () => HttpResponse.json(wrap({ ...mockSub, is_active: false }))),
	http.post(`${API}/newsletter/subscribers/s1/resubscribe`, () => HttpResponse.json(wrap({ ...mockSub, is_active: true }))),
	http.delete(`${API}/newsletter/subscribers/s1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("newsletterService", () => {
	it("lists subscribers with pagination metadata", async () => {
		const { data } = await newsletterService.list()
		expect(data.items).toHaveLength(1)
		expect(data.items[0].email).toBe("test@example.com")
	})
	it("admin unsubscribe by id flips is_active to false", async () => {
		const { data } = await newsletterService.unsubscribeById("s1")
		expect(data.is_active).toBe(false)
	})
	it("admin resubscribe by id flips is_active to true", async () => {
		const { data } = await newsletterService.resubscribeById("s1")
		expect(data.is_active).toBe(true)
	})
	it("deletes a subscriber record", async () => {
		await newsletterService.remove("s1")
	})
})
