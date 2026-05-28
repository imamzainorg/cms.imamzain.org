import { create } from "zustand"
import { setAccessToken, setRefreshToken, getAccessToken, getRefreshToken } from "@/lib/api"
import type { MeUser } from "@/types"
import { authService } from "@/services/auth.service"

type AuthStore = {
	user: MeUser | null
	isLoading: boolean
	login: (username: string, password: string) => Promise<void>
	logout: () => Promise<void>
	checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
	user: null,
	isLoading: true,

	login: async (username: string, password: string) => {
		// authService.login returns LoginResponse via the typed wrapper; the
		// api interceptor unwraps the envelope so `data` IS the payload.
		const { data } = await authService.login(username, password)
		setAccessToken(data.accessToken)
		setRefreshToken(data.refresh_token)
		// LoginResponse.user omits `created_at` (and any future MeUser fields).
		// Fetch /auth/me right after so the store always holds the full record
		// that downstream pages (profile, audit-logs) expect.
		const me = await authService.me()
		set({ user: me.data, isLoading: false })
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
			// authService.me returns the user object directly (after envelope unwrap).
			// The api interceptor handles 401 + refresh automatically.
			const { data } = await authService.me()
			set({ user: data, isLoading: false })
		} catch {
			setAccessToken(null)
			setRefreshToken(null)
			set({ user: null, isLoading: false })
		}
	},
}))
