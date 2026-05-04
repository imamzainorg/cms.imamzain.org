import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { newsletterService } from "@/services/newsletter.service"

const API = "http://localhost:3000/api/v1"

const mockSub = { id: "s1", email: "test@example.com", is_active: true, subscribed_at: "2024-01-01T00:00:00Z", unsubscribed_at: null }

const server = setupServer(
	http.get(`${API}/newsletter/subscribers`, () => HttpResponse.json({ subscribers: [mockSub], total: 1 })),
	http.post(`${API}/newsletter/subscribe`, () => HttpResponse.json({ message: "Subscribed" }, { status: 201 })),
	http.post(`${API}/newsletter/unsubscribe`, () => HttpResponse.json({ message: "Unsubscribed" }, { status: 201 })),
	http.delete(`${API}/newsletter/subscribers/s1`, () => HttpResponse.json({ message: "Deleted" })),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("newsletterService", () => {
	it("lists subscribers", async () => {
		const { data } = await newsletterService.list()
		expect(data.subscribers).toHaveLength(1)
		expect(data.subscribers[0].email).toBe("test@example.com")
	})

	it("subscribes an email", async () => {
		const { data } = await newsletterService.subscribe("test@example.com")
		expect(data.message).toBe("Subscribed")
	})

	it("unsubscribes an email", async () => {
		const { data } = await newsletterService.unsubscribe("test@example.com")
		expect(data.message).toBe("Unsubscribed")
	})

	it("deletes a subscriber record", async () => {
		const { data } = await newsletterService.remove("s1")
		expect(data.message).toBe("Deleted")
	})
})