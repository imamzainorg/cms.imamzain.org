import { create } from "zustand"
import { api, setAccessToken, setRefreshToken, getAccessToken, getRefreshToken } from "@/lib/api"
import type { AdminUser } from "@/types"
import { authService } from "@/services/auth.service"

type AuthStore = {
	user: AdminUser | null
	isLoading: boolean
	login: (username: string, password: string) => Promise<void>
	logout: () => Promise<void>
	checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
	user: null,
	isLoading: true,

	login: async (username: string, password: string) => {
		// api.ts interceptor unwraps the envelope, so `data` is the payload.
		const { data } = await api.post("/auth/login", { username, password })

		// API spec returns `{ accessToken, refresh_token, user }`. Some older shapes
		// used `access_token` / `token` / `jwt` — accept any of them for forwards-compat.
		const accessToken =
			data.accessToken ??
			data.access_token ??
			data.token ??
			data.jwt
		const refreshToken =
			data.refresh_token ??
			data.refreshToken ??
			null

		if (!accessToken) {
			throw new Error(
				`No access token in response. Got keys: ${Object.keys(data ?? {}).join(", ")}`,
			)
		}

		setAccessToken(String(accessToken))
		if (refreshToken) setRefreshToken(String(refreshToken))
		set({ user: data.user ?? null, isLoading: false })
	},

	logout: async () => {
		const refresh = getRefreshToken()
		try {
			await authService.logout(refresh ?? undefined)
		} catch {
			// Best-effort — even if the server rejects, we still want the client wiped.
		}
		setAccessToken(null)
		setRefreshToken(null)
		set({ user: null })
		if (typeof window !== "undefined") window.location.href = "/login"
	},

	checkAuth: async () => {
		const token = getAccessToken()
		if (!token || token === "undefined" || token === "null") {
			setAccessToken(null)
			set({ user: null, isLoading: false })
			return
		}
		try {
			// /auth/me returns the user object directly (after envelope unwrap).
			// The api interceptor handles 401 + refresh automatically.
			const { data } = await api.get("/auth/me")
			set({ user: data, isLoading: false })
		} catch {
			setAccessToken(null)
			setRefreshToken(null)
			set({ user: null, isLoading: false })
		}
	},
}))
