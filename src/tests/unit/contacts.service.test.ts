import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { contactsService } from "@/services/contacts.service"

const API = "http://localhost:3000/api/v1"
function wrap<T>(data: T) { return { success: true, timestamp: new Date().toISOString(), message: "OK", data } }
function paginated<T>(items: T[]) {
	return { items, pagination: { page: 1, limit: 20, total: items.length, pages: 1 } }
}

const mockContact = {
	id: "c1",
	name: "Ali",
	email: "ali@example.com",
	message: "Hello",
	status: "NEW" as const,
	created_at: "2024-01-01T00:00:00Z",
}

const server = setupServer(
	http.get(`${API}/forms/contacts`, () => HttpResponse.json(wrap(paginated([mockContact])))),
	http.patch(`${API}/forms/contacts/c1`, async ({ request }) => {
		const body = (await request.json()) as { status: string }
		return HttpResponse.json(wrap({ ...mockContact, status: body.status }))
	}),
	http.delete(`${API}/forms/contacts/c1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("contactsService", () => {
	it("lists contacts with pagination metadata", async () => {
		const { data } = await contactsService.list()
		expect(data.items).toHaveLength(1)
		expect(data.items[0].status).toBe("NEW")
	})
	it("filters contacts by status", async () => {
		const { data } = await contactsService.list({ status: "NEW" })
		expect(data.items[0].status).toBe("NEW")
	})
	it("updates contact status", async () => {
		const { data } = await contactsService.update("c1", { status: "RESPONDED" })
		expect(data.status).toBe("RESPONDED")
	})
	it("deletes a contact", async () => {
		await contactsService.remove("c1")
	})
})
