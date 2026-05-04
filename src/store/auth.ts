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
		// api.ts interceptor unwraps the envelope, so data IS the payload
		const { data } = await api.post("/auth/login", { username, password })

		const token =
			data.access_token ??
			data.accessToken ??
			data.token ??
			data.jwt

		if (!token) {
			throw new Error(
				`No token in response. Got keys: ${Object.keys(data ?? {}).join(", ")}`
			)
		}

		localStorage.setItem("accessToken", String(token))
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
			// /auth/me returns the user object directly (after envelope unwrap)
			const { data } = await api.get("/auth/me")
			set({ user: data, isLoading: false })
		} catch {
			localStorage.removeItem("accessToken")
			set({ user: null, isLoading: false })
		}
	},
}))