import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"

export const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
})

// Tokens are kept in localStorage. XSS-exfiltratable — a future hardening
// pass should move both to httpOnly cookies via a Next route-handler proxy.
const ACCESS_TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"

export function getAccessToken() {
	return typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null
}
export function setAccessToken(token: string | null) {
	if (typeof window === "undefined") return
	if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token)
	else localStorage.removeItem(ACCESS_TOKEN_KEY)
}
export function getRefreshToken() {
	return typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_KEY) : null
}
export function setRefreshToken(token: string | null) {
	if (typeof window === "undefined") return
	if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token)
	else localStorage.removeItem(REFRESH_TOKEN_KEY)
}

api.interceptors.request.use((config) => {
	if (typeof window !== "undefined") {
		const token = localStorage.getItem(ACCESS_TOKEN_KEY)
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		// Resolve `translation` against Arabic — avoids relying on the server's
		// is_default fallback. Callers may override per-request.
		if (!config.headers["Accept-Language"]) {
			config.headers["Accept-Language"] = "ar"
		}
	}
	return config
})

// --- Refresh-token rotation ---
// One refresh attempt at a time. If a 401 arrives while a refresh is already
// in flight, queue the original request and replay it once the new access
// token lands.

let refreshInflight: Promise<string | null> | null = null
const refreshQueue: Array<() => void> = []

async function attemptRefresh(): Promise<string | null> {
	const refreshToken = getRefreshToken()
	if (!refreshToken) {
		// No refresh token to use → access token is dead; clear it so the next
		// request short-circuits to login instead of looping 401s.
		setAccessToken(null)
		return null
	}
	try {
		// Bare axios — bypasses our interceptors so we don't recurse.
		const resp = await axios.post<{
			success?: boolean
			data?: { accessToken: string; refresh_token: string }
			accessToken?: string
			refresh_token?: string
		}>(
			`${API_URL}/auth/refresh`,
			{ refresh_token: refreshToken },
			{ headers: { "Content-Type": "application/json" } },
		)
		const enveloped = resp.data?.data
		const data = enveloped ?? (resp.data as { accessToken: string; refresh_token: string })
		if (!data?.accessToken || !data?.refresh_token) return null
		setAccessToken(data.accessToken)
		setRefreshToken(data.refresh_token)
		return data.accessToken
	} catch {
		// Reuse-detection or unknown-token cases come back as 401 → wipe both
		// tokens so the next request bounces to login.
		setAccessToken(null)
		setRefreshToken(null)
		return null
	}
}

api.interceptors.response.use(
	(response) => {
		const d = response.data
		if (
			d !== null &&
			typeof d === "object" &&
			"success" in d &&
			"data" in d
		) {
			response.data = d.data
		}
		return response
	},
	async (error: AxiosError) => {
		const config = error.config as
			| (InternalAxiosRequestConfig & { _retried?: boolean })
			| undefined
		const url = config?.url ?? ""
		const isAuthEndpoint = url.includes("/auth/refresh") || url.includes("/auth/login")

		if (error.response?.status !== 401 || !config || config._retried || isAuthEndpoint) {
			if (error.response?.status === 401 && isAuthEndpoint && typeof window !== "undefined") {
				setAccessToken(null)
				setRefreshToken(null)
				try { window.location.href = "/login" } catch { /* jsdom */ }
			}
			return Promise.reject(error)
		}

		config._retried = true

		if (!refreshInflight) {
			refreshInflight = attemptRefresh().finally(() => {
				const drain = refreshQueue.splice(0)
				refreshInflight = null
				drain.forEach((cb) => cb())
			})
		}

		const newToken = await new Promise<string | null>((resolve) => {
			refreshQueue.push(() => resolve(getAccessToken()))
			void refreshInflight
		})

		if (!newToken) {
			if (typeof window !== "undefined") {
				try { window.location.href = "/login" } catch { /* jsdom */ }
			}
			return Promise.reject(error)
		}

		config.headers.Authorization = `Bearer ${newToken}`
		return api.request(config)
	},
)

/**
 * Extract a human-readable error message from an axios error.
 * Falls back to the provided default if no specific message is available.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
	// Domain errors thrown by services (e.g. MediaSizeExceededError) carry
	// their own user-facing message — surface that directly.
	if (error instanceof Error && error.name !== "AxiosError" && error.message) {
		// Skip generic Error messages like "Network Error" which aren't useful;
		// only return when it's clearly a domain error (subclasses of Error).
		if (error.constructor !== Error) return error.message
	}
	if (axios.isAxiosError(error)) {
		const err = error as AxiosError<{
			error?: string | string[]
			message?: string | string[]
			errors?: Array<{ message: string } | string>
		}>
		const data = err.response?.data
		if (data) {
			if (Array.isArray(data.error)) return data.error.join("، ")
			if (typeof data.error === "string") return data.error
			if (Array.isArray(data.message)) return data.message.join("، ")
			if (typeof data.message === "string") return data.message
			if (Array.isArray(data.errors) && data.errors.length) {
				return data.errors.map((e) => typeof e === "string" ? e : e.message).join("، ")
			}
		}
		if (err.code === "ERR_NETWORK") return "تعذّر الاتصال بالخادم. تحقّق من الشبكة."
		if (err.response?.status === 403) return "ليس لديك صلاحية لتنفيذ هذا الإجراء."
		if (err.response?.status === 404) return "العنصر غير موجود."
	}
	return fallback
}
