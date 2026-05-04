import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { useAuthStore } from "@/store/auth"

const API = "http://localhost:3000/api/v1"

const mockUser = { id: "u1", username: "admin", is_active: true, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z", roles: [] }

const server = setupServer(
	http.post(`${API}/auth/login`, async ({ request }) => {
		const body = await request.json() as { username: string; password: string }
		if (body.username === "admin" && body.password === "secret") {
			return HttpResponse.json({ access_token: "tok123", user: mockUser })
		}
		return HttpResponse.json({ message: "Invalid credentials" }, { status: 401 })
	}),
	http.get(`${API}/auth/me`, ({ request }) => {
		const auth = request.headers.get("Authorization")
		if (auth === "Bearer tok123") return HttpResponse.json(mockUser)
		return HttpResponse.json({ message: "Unauthorized" }, { status: 401 })
	}),
)

beforeAll(() => server.listen())
afterEach(() => { server.resetHandlers(); localStorage.clear(); useAuthStore.setState({ user: null, isLoading: true }) })
afterAll(() => server.close())

describe("useAuthStore", () => {
	it("logs in with username and stores access_token", async () => {
		await useAuthStore.getState().login("admin", "secret")
		expect(localStorage.getItem("accessToken")).toBe("tok123")
		expect(useAuthStore.getState().user?.username).toBe("admin")
	})

	it("throws on invalid credentials", async () => {
		await expect(useAuthStore.getState().login("admin", "wrong")).rejects.toThrow()
		expect(useAuthStore.getState().user).toBeNull()
	})

	it("checkAuth populates user when token valid", async () => {
		localStorage.setItem("accessToken", "tok123")
		await useAuthStore.getState().checkAuth()
		expect(useAuthStore.getState().user?.username).toBe("admin")
		expect(useAuthStore.getState().isLoading).toBe(false)
	})

	it("checkAuth clears user when token invalid", async () => {
		localStorage.setItem("accessToken", "bad-token")
		await useAuthStore.getState().checkAuth()
		expect(useAuthStore.getState().user).toBeNull()
		expect(localStorage.getItem("accessToken")).toBeNull()
	})
})