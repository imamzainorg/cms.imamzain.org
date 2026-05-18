import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { usersService } from "@/services/users.service"
import { rolesService } from "@/services/roles.service"
import { auditLogsService } from "@/services/audit-logs.service"
import { languagesService } from "@/services/languages.service"
import { wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("usersService", () => {
	it("create POSTs to /users with username and password", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/users`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({ id: "u1" }))
		}))
		await usersService.create({ username: "alice", password: "secret123" })
		expect(body).toEqual({ username: "alice", password: "secret123" })
	})

	it("assignRole POSTs role_id (snake_case) to /users/:id/roles", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/users/u1/roles`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({}))
		}))
		await usersService.assignRole("u1", "r1")
		expect(body).toEqual({ role_id: "r1" })
	})

	it("removeRole DELETEs /users/:userId/roles/:roleId", async () => {
		let url = ""
		server.use(http.delete(`${API}/users/:userId/roles/:roleId`, ({ params }) => {
			url = `${params.userId}/${params.roleId}`
			return HttpResponse.json(wrap({}))
		}))
		await usersService.removeRole("u1", "r1")
		expect(url).toBe("u1/r1")
	})
})

describe("rolesService", () => {
	it("listPermissions hits /roles/permissions (NOT /permissions)", async () => {
		let called = false
		server.use(http.get(`${API}/roles/permissions`, () => {
			called = true
			return HttpResponse.json(wrap(paginated([])))
		}))
		await rolesService.listPermissions()
		expect(called).toBe(true)
	})

	it("assignPermission POSTs permissionId (camelCase, per live API)", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/roles/r1/permissions`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({}))
		}))
		await rolesService.assignPermission("r1", "p1")
		// Note: snake_case role_id but camelCase permissionId — match the live API drift.
		expect(body).toEqual({ permissionId: "p1" })
	})

	it("removePermission DELETEs /roles/:roleId/permissions/:permissionId", async () => {
		let captured = ""
		server.use(http.delete(`${API}/roles/:roleId/permissions/:permId`, ({ params }) => {
			captured = `${params.roleId}/${params.permId}`
			return HttpResponse.json(wrap({}))
		}))
		await rolesService.removePermission("r1", "p1")
		expect(captured).toBe("r1/p1")
	})

	it("create POSTs role with name + translations", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/roles`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({}))
		}))
		await rolesService.create({
			name: "editor",
			translations: [{ lang: "ar", title: "محرّر" }],
		})
		expect(body).toMatchObject({ name: "editor" })
	})
})

describe("auditLogsService", () => {
	it("forwards filter params on /audit-logs", async () => {
		let captured: URL | null = null
		server.use(http.get(`${API}/audit-logs`, ({ request }) => {
			captured = new URL(request.url)
			return HttpResponse.json(wrap(paginated([])))
		}))
		await auditLogsService.list({
			action: "DELETE",
			resource_type: "post",
			from: "2024-01-01",
			to: "2024-12-31",
			user_id: "u1",
		})
		expect(captured!.searchParams.get("action")).toBe("DELETE")
		expect(captured!.searchParams.get("from")).toBe("2024-01-01")
		expect(captured!.searchParams.get("user_id")).toBe("u1")
	})
})

describe("languagesService", () => {
	it("listAll hits /languages/all (not /languages)", async () => {
		let path = ""
		server.use(http.get(`${API}/languages/all`, ({ request }) => {
			path = new URL(request.url).pathname
			return HttpResponse.json(wrap([]))
		}))
		await languagesService.listAll()
		expect(path.endsWith("/languages/all")).toBe(true)
	})

	it("create POSTs the full language body", async () => {
		let body: unknown = null
		server.use(http.post(`${API}/languages`, async ({ request }) => {
			body = await request.json()
			return HttpResponse.json(wrap({}))
		}))
		await languagesService.create({ code: "fr", name: "French", native_name: "Français" })
		expect(body).toEqual({ code: "fr", name: "French", native_name: "Français" })
	})

	it("update PATCHes /languages/:code with the toggle body", async () => {
		let body: unknown = null
		let code = ""
		server.use(http.patch(`${API}/languages/:c`, async ({ request, params }) => {
			body = await request.json()
			code = String(params.c)
			return HttpResponse.json(wrap({}))
		}))
		await languagesService.update("fr", { is_active: false })
		expect(code).toBe("fr")
		expect(body).toEqual({ is_active: false })
	})
})
