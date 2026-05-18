import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import {
	useUsersList,
	useCreateUser,
	useUpdateUser,
	useDeleteUser,
	useAssignUserRole,
	useRemoveUserRole,
} from "@/lib/queries/users"
import {
	useRolesList,
	usePermissionsList,
	useCreateRole,
	useDeleteRole,
	useTogglePermission,
} from "@/lib/queries/roles"
import { queryKeys } from "@/lib/queries/keys"
import type { Role, Permission } from "@/types/roles"
import type { PaginatedResponse } from "@/types/pagination"
import { buildQueryClient, wrap, paginated } from "../../utils"

const API = "http://localhost:3000/api/v1"

const mockRole: Role = {
	id: "r1",
	name: "editor",
	role_translations: [{ lang: "ar", title: "محرّر", description: null }],
	permissions: [],
}

const mockPerm: Permission = { id: "perm1", name: "posts:create" }

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function wrapped(client: QueryClient) {
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
}

describe("users hooks", () => {
	it("useUsersList fetches /users", async () => {
		server.use(http.get(`${API}/users`, () => HttpResponse.json(wrap(paginated([])))))
		const client = buildQueryClient()
		const { result } = renderHook(() => useUsersList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	it("user create/update/delete invalidate the list", async () => {
		let hits = 0
		server.use(
			http.get(`${API}/users`, () => { hits++; return HttpResponse.json(wrap(paginated([])))}),
			http.post(`${API}/users`, () => HttpResponse.json(wrap({ id: "u1" }))),
			http.patch(`${API}/users/u1`, () => HttpResponse.json(wrap({ id: "u1" }))),
			http.delete(`${API}/users/u1`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useUsersList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		let prev = hits

		const { result: c } = renderHook(() => useCreateUser(), { wrapper: wrapped(client) })
		await act(async () => { await c.current.mutateAsync({ username: "x", password: "secret123" }) })
		await waitFor(() => expect(hits).toBeGreaterThan(prev))
		prev = hits

		const { result: u } = renderHook(() => useUpdateUser(), { wrapper: wrapped(client) })
		await act(async () => { await u.current.mutateAsync({ id: "u1", body: { is_active: false } }) })
		await waitFor(() => expect(hits).toBeGreaterThan(prev))
		prev = hits

		const { result: d } = renderHook(() => useDeleteUser(), { wrapper: wrapped(client) })
		await act(async () => { await d.current.mutateAsync("u1") })
		await waitFor(() => expect(hits).toBeGreaterThan(prev))
	})

	it("role assignment hits the right URL and invalidates the users list", async () => {
		let assignBody: unknown = null
		let listHits = 0
		server.use(
			http.get(`${API}/users`, () => {
				listHits++
				return HttpResponse.json(wrap(paginated([])))
			}),
			http.post(`${API}/users/u1/roles`, async ({ request }) => {
				assignBody = await request.json()
				return HttpResponse.json(wrap({}))
			}),
			http.delete(`${API}/users/u1/roles/r1`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useUsersList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		let prev = listHits

		const { result: assign } = renderHook(() => useAssignUserRole(), { wrapper: wrapped(client) })
		await act(async () => { await assign.current.mutateAsync({ userId: "u1", roleId: "r1" }) })
		expect(assignBody).toEqual({ role_id: "r1" })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
		prev = listHits

		const { result: rm } = renderHook(() => useRemoveUserRole(), { wrapper: wrapped(client) })
		await act(async () => { await rm.current.mutateAsync({ userId: "u1", roleId: "r1" }) })
		await waitFor(() => expect(listHits).toBeGreaterThan(prev))
	})
})

describe("roles hooks", () => {
	it("useRolesList fetches /roles", async () => {
		server.use(http.get(`${API}/roles`, () => HttpResponse.json(wrap(paginated([mockRole])))))
		const client = buildQueryClient()
		const { result } = renderHook(() => useRolesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.items[0].id).toBe("r1")
	})

	it("usePermissionsList fetches /roles/permissions", async () => {
		server.use(http.get(`${API}/roles/permissions`, () =>
			HttpResponse.json(wrap(paginated([mockPerm]))),
		))
		const client = buildQueryClient()
		const { result } = renderHook(() => usePermissionsList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.items[0].name).toBe("posts:create")
	})

	it("useCreateRole and useDeleteRole both invalidate roles.lists", async () => {
		let hits = 0
		server.use(
			http.get(`${API}/roles`, () => { hits++; return HttpResponse.json(wrap(paginated([mockRole])))}),
			http.post(`${API}/roles`, () => HttpResponse.json(wrap(mockRole))),
			http.delete(`${API}/roles/r1`, () => HttpResponse.json(wrap({}))),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useRolesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		let prev = hits

		const { result: c } = renderHook(() => useCreateRole(), { wrapper: wrapped(client) })
		await act(async () => {
			await c.current.mutateAsync({ name: "x", translations: [{ lang: "ar", title: "x" }] })
		})
		await waitFor(() => expect(hits).toBeGreaterThan(prev))
		prev = hits

		const { result: d } = renderHook(() => useDeleteRole(), { wrapper: wrapped(client) })
		await act(async () => { await d.current.mutateAsync("r1") })
		await waitFor(() => expect(hits).toBeGreaterThan(prev))
	})

	it("useTogglePermission optimistically toggles the permission in the cached role", async () => {
		let resolveServer: (() => void) | undefined
		server.use(
			http.get(`${API}/roles`, () => HttpResponse.json(wrap(paginated([mockRole])))),
			http.post(`${API}/roles/r1/permissions`, async () => {
				await new Promise<void>((r) => { resolveServer = r })
				return HttpResponse.json(wrap({}))
			}),
		)
		const client = buildQueryClient()
		const { result: list } = renderHook(() => useRolesList(), { wrapper: wrapped(client) })
		await waitFor(() => expect(list.current.isSuccess).toBe(true))
		expect(list.current.data?.items[0].permissions).toHaveLength(0)

		const { result: toggle } = renderHook(() => useTogglePermission(), { wrapper: wrapped(client) })
		act(() => {
			toggle.current.mutate({ roleId: "r1", permission: mockPerm, has: false })
		})
		// optimistic: permission appears in cache before server responds
		await waitFor(() => {
			const cached = client.getQueryData<PaginatedResponse<Role>>(queryKeys.roles.list())
			expect(cached?.items[0].permissions).toContainEqual(mockPerm)
		})
		resolveServer?.()
		await waitFor(() => expect(toggle.current.isSuccess).toBe(true))
	})
})
