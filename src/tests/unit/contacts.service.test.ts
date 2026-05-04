import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { contactsService } from "@/services/contacts.service"

const API = "http://localhost:3000/api/v1"
function wrap<T>(data: T) { return { success: true, timestamp: new Date().toISOString(), message: "OK", data } }

const mockContact = { id: "c1", name: "Ali", email: "ali@example.com", country: "IQ", message: "Hello", status: "NEW" as const, submitted_at: "2024-01-01T00:00:00Z", responded_at: null, responded_by: null, notes: null }

const server = setupServer(
	http.get(`${API}/forms/contacts`, () => HttpResponse.json(wrap({ contacts: [mockContact], total: 1 }))),
	http.patch(`${API}/forms/contacts/c1`, async ({ request }) => {
		const body = await request.json() as { status: string }
		return HttpResponse.json(wrap({ ...mockContact, status: body.status }))
	}),
	http.delete(`${API}/forms/contacts/c1`, () => HttpResponse.json(wrap({ message: "Deleted" }))),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("contactsService", () => {
	it("lists contacts from forms/contacts", async () => {
		const { data } = await contactsService.list()
		expect(data.contacts).toHaveLength(1)
		expect(data.contacts[0].status).toBe("NEW")
	})
	it("filters contacts by status", async () => {
		const { data } = await contactsService.list({ status: "NEW" })
		expect(data.contacts[0].status).toBe("NEW")
	})
	it("updates contact status", async () => {
		const { data } = await contactsService.update("c1", { status: "RESPONDED", notes: "Replied" })
		expect(data.status).toBe("RESPONDED")
	})
	it("deletes a contact", async () => {
		const { data } = await contactsService.remove("c1")
		expect(data.message).toBe("Deleted")
	})
})