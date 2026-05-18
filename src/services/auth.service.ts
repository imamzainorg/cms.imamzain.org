import { api } from "@/lib/api"
import type { LoginResponse, MeUser, RefreshResponse } from "@/types/auth"

export const authService = {
	me: () => api.get<MeUser>("/auth/me"),

	login: (username: string, password: string) =>
		api.post<LoginResponse>("/auth/login", { username, password }),

	refresh: (refresh_token: string) =>
		api.post<RefreshResponse>("/auth/refresh", { refresh_token }),

	/**
	 * Revoke a specific refresh token (logout from this session).
	 * Omit the token to revoke ALL active sessions for the current user.
	 */
	logout: (refresh_token?: string) =>
		api.post("/auth/logout", refresh_token ? { refresh_token } : {}),

	changePassword: (currentPassword: string, newPassword: string) =>
		api.patch("/auth/me/password", { currentPassword, newPassword }),

	adminResetPassword: (userId: string, new_password: string) =>
		api.post(`/users/${userId}/reset-password`, { new_password }),
}
