import { create } from "zustand"
import { api } from "@/lib/api"
import type { AdminUser } from "@/types"

type AuthStore = {
	user: AdminUser | null
	isLoading: boolean
	login: (username: string, password: string) => Promise<void>
	logout: () => void
	checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
	user: null,
	isLoading: true,

	login: async (username: string, password: string) => {
		const { data } = await api.post("/auth/login", { username, password })
		// NestJS returns accessToken (camelCase); guard against both forms
		const token = data.access_token ?? data.accessToken ?? data.token
		if (!token) throw new Error("Login response did not contain a token")
		localStorage.setItem("accessToken", token)
		// Set isLoading: false so DashboardLayoutInner doesn't need a second round-trip
		set({ user: data.user ?? null, isLoading: false })
	},

	logout: () => {
		localStorage.removeItem("accessToken")
		set({ user: null })
		window.location.href = "/login"
	},

	checkAuth: async () => {
		const token = localStorage.getItem("accessToken")
		if (!token || token === "undefined" || token === "null") {
			localStorage.removeItem("accessToken")
			set({ user: null, isLoading: false })
			return
		}
		try {
			const { data } = await api.get("/auth/me")
			set({ user: data, isLoading: false })
		} catch {
			localStorage.removeItem("accessToken")
			set({ user: null, isLoading: false })
		}
	},
}))