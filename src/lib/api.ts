import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

declare module "axios" {
	interface AxiosResponse {
		/** The envelope's `message`; the interceptor unwraps `data` but keeps this. */
		message?: string
		/** The envelope's `meta` (daily-hadith `today` / `restore` carry one). */
		meta?: Record<string, unknown>
	}
}

// NEXT_PUBLIC_API_URL is inlined at build time. Without it, a production build
// must still talk to the real API (never silently to localhost), while dev
// and tests fall back to a local server.
const API_URL =
	process.env.NEXT_PUBLIC_API_URL ||
	(process.env.NODE_ENV === "production"
		? "https://api.imamzain.org/api/v1"
		: "http://localhost:3000/api/v1")

export const api = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
})

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

/**
 * Handler invoked when the session is over and the user must re-authenticate
 * (refresh token rejected or wiped). Registered by the app shell so the api
 * module doesn't touch `window.location` directly — keeps tests free of
 * jsdom navigation errors and lets the redirect mechanism evolve without
 * changing this file.
 */
let authFailureHandler: (() => void) | null = null
export function setAuthFailureHandler(h: (() => void) | null) {
	authFailureHandler = h
}

/**
 * Invoked on `403 PASSWORD_CHANGE_REQUIRED`: the account was flagged by an
 * admin reset and the API (with ENFORCE_PASSWORD_CHANGE_AFTER_RESET=true)
 * refuses everything except /auth/me, /auth/me/password, logout and refresh.
 * The app shell sends the user to the change-password screen.
 */
let passwordChangeRequiredHandler: (() => void) | null = null
export function setPasswordChangeRequiredHandler(h: (() => void) | null) {
	passwordChangeRequiredHandler = h
}

api.interceptors.request.use((config) => {
	// Force the browser HTTP cache to revalidate on every CMS read. Several
	// list/detail endpoints the admin consumes (stores, gallery, books, papers,
	// the four category types) are the SAME public routes the site uses, and the
	// API sends them `Cache-Control: public, max-age=…` (up to 5 min). Without
	// this, a refetch right after an edit is served from the still-fresh browser
	// cache and the editor sees stale data. The API emits ETags, so unchanged
	// resources come back as cheap 304s. CORS reflects request headers
	// (no fixed allowlist server-side), so this doesn't break the preflight.
	config.headers["Cache-Control"] = "no-cache"
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

// ============================================================================
// Refresh-token rotation
// ============================================================================
// One refresh attempt at a time. Concurrent 401s queue waiters and replay with
// the new access token once the refresh resolves. The waiter Promise resolves
// directly with the token (or null on failure) — no shared mutable state to
// race against.

let refreshInflight: Promise<string | null> | null = null
const refreshWaiters: Array<(token: string | null) => void> = []

/** POST /auth/refresh with a specific token; stores + returns the new access token. */
async function postRefresh(refreshToken: string): Promise<string | null> {
	// Bare axios — bypasses our interceptors so we don't recurse on 401.
	const resp = await axios.post<{
		success?: boolean
		data?: { accessToken: string; refresh_token: string }
	}>(
		`${API_URL}/auth/refresh`,
		{ refresh_token: refreshToken },
		{ headers: { "Content-Type": "application/json" } },
	)
	const data = resp.data?.data
	if (!data?.accessToken || !data?.refresh_token) return null
	setAccessToken(data.accessToken)
	setRefreshToken(data.refresh_token)
	return data.accessToken
}

function refreshErrorCode(e: unknown): string | undefined {
	if (axios.isAxiosError(e)) {
		return (e.response?.data as { code?: string } | undefined)?.code
	}
	return undefined
}

async function attemptRefresh(): Promise<string | null> {
	const refreshToken = getRefreshToken()
	if (!refreshToken) {
		// No refresh token → access token is dead; clear it so the next request
		// short-circuits to login instead of looping 401s.
		setAccessToken(null)
		return null
	}
	try {
		return await postRefresh(refreshToken)
	} catch (e) {
		if (axios.isAxiosError(e) && e.response?.status === 401) {
			// AUTH_REFRESH_ALREADY_ROTATED = we lost a rotation race: another tab
			// refreshed first and stored the NEWER refresh token in localStorage.
			// The session itself is fine — only OUR copy of the token is stale.
			// Re-read storage and retry ONCE with the newer token before giving
			// up, so multi-tab usage doesn't randomly log the user out.
			if (refreshErrorCode(e) === "AUTH_REFRESH_ALREADY_ROTATED") {
				const newest = getRefreshToken()
				if (newest && newest !== refreshToken) {
					try {
						return await postRefresh(newest)
					} catch (retryErr) {
						// Retry also 401'd → session really is over, wipe both.
						// Transient network/5xx on the retry keeps tokens intact.
						if (axios.isAxiosError(retryErr) && retryErr.response?.status === 401) {
							setAccessToken(null)
							setRefreshToken(null)
						}
						return null
					}
				}
				// Same/absent stored token: nothing newer to try — session over.
			}
			// All other 401 codes (AUTH_TOKEN_REUSED, AUTH_REFRESH_INVALID,
			// AUTH_ACCOUNT_DISABLED, none) → session is over, wipe both.
			setAccessToken(null)
			setRefreshToken(null)
		}
		// Network / 5xx during refresh = transient → keep tokens so the next
		// attempt can recover; we just fail THIS request.
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
			// Keep the envelope's siblings of `data` reachable (restore/today
			// answer with `data: null` and put their result in `message`/`meta`).
			if (typeof d.message === "string") response.message = d.message
			if (d.meta && typeof d.meta === "object") response.meta = d.meta
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

		if (
			error.response?.status === 403 &&
			(error.response.data as ApiErrorBody | undefined)?.code === "PASSWORD_CHANGE_REQUIRED"
		) {
			passwordChangeRequiredHandler?.()
			return Promise.reject(error)
		}

		// Only intercept 401s on non-auth endpoints that haven't been retried yet.
		// Auth-endpoint failures bubble up to the caller (login form, refresh path)
		// and already-retried requests would otherwise loop.
		if (error.response?.status !== 401 || !config || config._retried || isAuthEndpoint) {
			return Promise.reject(error)
		}

		config._retried = true

		if (!refreshInflight) {
			refreshInflight = attemptRefresh().finally(() => {
				const waiters = refreshWaiters.splice(0)
				const token = getAccessToken()
				refreshInflight = null
				waiters.forEach((cb) => cb(token))
			})
		}

		const newToken = await new Promise<string | null>((resolve) => {
			refreshWaiters.push(resolve)
		})

		if (!newToken) {
			// Refresh failed. If the access token is also gone, attemptRefresh
			// decided the session is over (401 on refresh) — fire the handler.
			// If the token is still present, it was a transient network/5xx and
			// we leave the session intact so the user can retry.
			if (!getAccessToken()) authFailureHandler?.()
			return Promise.reject(error)
		}

		config.headers.Authorization = `Bearer ${newToken}`
		return api.request(config)
	},
)

/** Error-envelope body shape: { success: false, code, error, errors?, ... }. */
type ApiErrorBody = {
	code?: string
	error?: string | string[]
	message?: string | string[]
	errors?: Array<{ message: string } | string>
}

/** Pull the human-readable server string out of an error envelope, if any. */
function serverErrorString(data: ApiErrorBody | undefined): string | null {
	if (!data) return null
	if (Array.isArray(data.error)) return data.error.join("، ")
	if (typeof data.error === "string") return data.error
	if (Array.isArray(data.message)) return data.message.join("، ")
	if (typeof data.message === "string") return data.message
	if (Array.isArray(data.errors) && data.errors.length) {
		return data.errors.map((e) => typeof e === "string" ? e : e.message).join("، ")
	}
	return null
}

/** The server's own human-readable error string, if the response carried one. */
export function getServerErrorText(error: unknown): string | null {
	if (!axios.isAxiosError(error)) return null
	return serverErrorString(error.response?.data as ApiErrorBody | undefined)
}

/** HTTP status of an axios error, if the server answered at all. */
export function getErrorStatus(error: unknown): number | undefined {
	return axios.isAxiosError(error) ? error.response?.status : undefined
}

/** The envelope's stable machine `code` (VALIDATION_FAILED, MEDIA_IN_USE, …). */
export function getErrorCode(error: unknown): string | undefined {
	if (!axios.isAxiosError(error)) return undefined
	return (error.response?.data as ApiErrorBody | undefined)?.code
}

/**
 * Seconds from a 429's `Retry-After` header. The API sends it, but browsers
 * only expose headers the server lists in `Access-Control-Expose-Headers` and
 * the Worker does not — so cross-origin this is usually `undefined` and callers
 * must have a wording that works without a number.
 */
export function getRetryAfterSeconds(error: unknown): number | undefined {
	if (!axios.isAxiosError(error)) return undefined
	const raw = error.response?.headers?.["retry-after"]
	const n = Number(raw)
	return Number.isFinite(n) && n > 0 ? Math.ceil(n) : undefined
}

function waitPhrase(seconds: number | undefined): string {
	if (!seconds) return "بضع دقائق"
	if (seconds < 90) return `${seconds} ثانية`
	return `${Math.ceil(seconds / 60)} دقيقة`
}

/**
 * Extract a human-readable error message from an axios error.
 * Falls back to the provided default if no specific message is available.
 *
 * Resolution order:
 *  (a) domain Error subclasses thrown by services — their message is already
 *      user-facing Arabic;
 *  (b) the envelope's stable machine `code` → localized Arabic string;
 *  (c) the server's human `error`/`message`/`errors[]` string(s);
 *  (d) network / bare-status fallbacks, then the caller's `fallback`.
 * Unrecognized codes fall through to (c) — their HTTP-status default.
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
		const err = error as AxiosError<ApiErrorBody>
		const data = err.response?.data

		switch (data?.code) {
			case "RATE_LIMITED":
				return "طلبات كثيرة خلال وقت قصير — انتظر قليلاً ثم أعد المحاولة."
			case "UNAUTHORIZED":
				// A 401 from /auth/login is "wrong credentials", not an expired
				// session. (The API answers the same for a wrong password and an
				// unknown username, so it cannot be told which.)
				if (String(err.config?.url ?? "").includes("/auth/login")) {
					return "اسم المستخدم أو كلمة المرور غير صحيحة."
				}
				return "انتهت الجلسة — سجّل الدخول مجددًا."
			case "FORBIDDEN":
				return "ليس لديك صلاحية لتنفيذ هذا الإجراء."
			case "NOT_FOUND":
				return "العنصر غير موجود."
			case "INVALID_IDENTIFIER":
				return "معرّف غير صالح."
			case "PAYLOAD_TOO_LARGE":
				// The server string names the exact cap + MIME type — prefer it.
				return serverErrorString(data) ?? "الملف أو المحتوى يتجاوز الحجم المسموح."
			case "INTERNAL_ERROR":
				return "حدث خطأ في الخادم — حاول مجددًا لاحقًا."
			case "AUTH_ACCOUNT_DISABLED":
				return "تم تعطيل هذا الحساب."
			case "AUTH_LOGIN_LOCKED":
				// 5 failed attempts → locked for 1 min, doubling to a 15 min cap.
				return `تم إيقاف تسجيل الدخول لهذا الحساب مؤقتاً بسبب محاولات فاشلة متكررة. أعد المحاولة بعد ${waitPhrase(getRetryAfterSeconds(err))}.`
			case "PASSWORD_MUST_DIFFER":
				return "كلمة المرور الجديدة يجب أن تختلف عن الحالية."
			case "PASSWORD_CHANGE_REQUIRED":
				return "يجب تغيير كلمة المرور أولاً قبل متابعة استخدام النظام."
			case "SLUG_LOCKED_WHILE_PUBLISHED":
				return "لا يمكن تغيير الرابط المختصر لعنصر منشور — ألغِ نشره أولاً (أو غيّر الرابط مع إلغاء النشر في الحفظ نفسه)."
			case "SLUG_ALREADY_USED":
				return serverErrorString(data) ?? "الرابط المختصر مستخدم لتصنيف آخر."
			case "DUPLICATE_TRANSLATION_LANG":
				return "تكرّرت لغة واحدة أكثر من مرة في الترجمات — اترك ترجمة واحدة لكل لغة."
			case "GALLERY_IMAGE_EXISTS":
				return "هذه الصورة موجودة بالفعل في المعرض."
			case "GALLERY_IMAGE_IN_TRASH":
				return "هذه الصورة موجودة في سلة مهملات المعرض — استعدها من هناك بدل إضافتها من جديد."
			case "AUDIO_SPEAKER_DELETED":
				return "لا يمكن استعادة التسجيل لأن المتحدث محذوف — استعد المتحدث من سلة المتحدثين أولاً ثم أعد المحاولة."
			case "MEDIA_IN_USE":
				return "لا يمكن حذف الملف لأنه ما زال مستخدماً في محتوى آخر."
			case "FK_CONSTRAINT_VIOLATION":
				return "عنصر مرتبط لم يعد موجوداً — حدّث الصفحة وأعد المحاولة."
			case "CONTEST_CLOSED":
				return "المسابقة مغلقة حالياً."
			case "VALIDATION_FAILED":
				// errors[] carries the per-field messages; the top-level `error`
				// is just a generic "Validation failed".
				if (data && Array.isArray(data.errors) && data.errors.length) {
					return data.errors.map((e) => typeof e === "string" ? e : e.message).join("، ")
				}
				break
			// CONFLICT + anything unrecognized → server-string preference below.
		}

		const serverString = serverErrorString(data)
		if (serverString) return serverString
		if (err.code === "ERR_NETWORK") return "تعذّر الاتصال بالخادم. تحقّق من الشبكة."
		if (err.response?.status === 403) return "ليس لديك صلاحية لتنفيذ هذا الإجراء."
		if (err.response?.status === 404) return "العنصر غير موجود."
	}
	return fallback
}
