import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import {
	api,
	getErrorMessage,
	getErrorCode,
	getErrorStatus,
	getRetryAfterSeconds,
	setPasswordChangeRequiredHandler,
} from "@/lib/api"
import { getAccountAdminErrorMessage } from "@/lib/rbac-errors"
import { wrap } from "../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); localStorage.clear(); setPasswordChangeRequiredHandler(null) })
afterAll(() => server.close())

/** Fire a GET that fails with the given envelope and hand back the axios error. */
async function failWith(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
	server.use(http.get(`${API}/boom`, () => HttpResponse.json(body, { status, headers })))
	try {
		await api.get("/boom")
	} catch (e) {
		return e
	}
	throw new Error("request unexpectedly succeeded")
}

describe("envelope handling", () => {
	it("keeps the envelope's message and meta next to the unwrapped data", async () => {
		server.use(http.post(`${API}/daily-hadiths/h1/restore`, () =>
			HttpResponse.json({
				...wrap(null),
				message: "Hadith restored",
				meta: { unscheduled: false, previous_hijri_month: null, previous_hijri_day: null },
			}),
		))
		const res = await api.post("/daily-hadiths/h1/restore")
		expect(res.data).toBeNull()
		expect(res.message).toBe("Hadith restored")
		expect(res.meta).toEqual({ unscheduled: false, previous_hijri_month: null, previous_hijri_day: null })
	})
})

describe("error codes from the Workers API", () => {
	it("exposes status and code helpers", async () => {
		const e = await failWith(409, { success: false, code: "SLUG_LOCKED_WHILE_PUBLISHED", error: "x" })
		expect(getErrorStatus(e)).toBe(409)
		expect(getErrorCode(e)).toBe("SLUG_LOCKED_WHILE_PUBLISHED")
		expect(getErrorStatus(new Error("x"))).toBeUndefined()
		expect(getErrorCode("nope")).toBeUndefined()
	})

	it.each([
		["SLUG_LOCKED_WHILE_PUBLISHED", 409, "لا يمكن تغيير الرابط المختصر"],
		["PASSWORD_MUST_DIFFER", 400, "تختلف عن الحالية"],
		["PASSWORD_CHANGE_REQUIRED", 403, "يجب تغيير كلمة المرور"],
		["DUPLICATE_TRANSLATION_LANG", 400, "تكرّرت لغة"],
		["GALLERY_IMAGE_EXISTS", 409, "موجودة بالفعل في المعرض"],
		["GALLERY_IMAGE_IN_TRASH", 409, "سلة مهملات المعرض"],
		["AUDIO_SPEAKER_DELETED", 409, "المتحدث محذوف"],
		["MEDIA_IN_USE", 409, "ما زال مستخدماً"],
		["CONTEST_CLOSED", 403, "المسابقة مغلقة"],
	])("%s is shown in Arabic", async (code, status, fragment) => {
		const e = await failWith(status, { success: false, code, error: "English text from the server" })
		expect(getErrorMessage(e, "fallback")).toContain(fragment)
	})

	it("CHECK_CONSTRAINT_VIOLATION shows the server text, which names the constraint", async () => {
		const e = await failWith(400, { success: false, code: "CHECK_CONSTRAINT_VIOLATION", error: "part_number beyond parts (chk_books_parts)" })
		expect(getErrorMessage(e, "fb")).toBe("part_number beyond parts (chk_books_parts)")
	})

	it("login lockout: says how long when Retry-After is readable, and still reads fine when it is not", async () => {
		const body = { success: false, code: "AUTH_LOGIN_LOCKED", error: "Too many failed login attempts for this username — try again later" }

		const withHeader = await failWith(429, body, { "Retry-After": "120" })
		expect(getRetryAfterSeconds(withHeader)).toBe(120)
		expect(getErrorMessage(withHeader, "fb")).toContain("2 دقيقة")

		const short = await failWith(429, body, { "Retry-After": "60" })
		expect(getErrorMessage(short, "fb")).toContain("60 ثانية")

		// Browsers hide Retry-After from cross-origin pages unless the server
		// exposes it, so the no-number wording must be a complete sentence.
		const withoutHeader = await failWith(429, body)
		expect(getRetryAfterSeconds(withoutHeader)).toBeUndefined()
		expect(getErrorMessage(withoutHeader, "fb")).toContain("بضع دقائق")
	})

	it("generic rate limiting keeps its own wording", async () => {
		const e = await failWith(429, { success: false, code: "RATE_LIMITED", error: "ThrottlerException: Too Many Requests" })
		expect(getErrorMessage(e, "fb")).toContain("طلبات كثيرة")
	})
})

describe("forced password change", () => {
	it("calls the registered handler on 403 PASSWORD_CHANGE_REQUIRED, without refreshing or retrying", async () => {
		let calls = 0
		setPasswordChangeRequiredHandler(() => { calls++ })
		let refreshed = false
		localStorage.setItem("accessToken", "t")
		localStorage.setItem("refreshToken", "r")
		server.use(
			http.get(`${API}/posts/admin`, () =>
				HttpResponse.json({ success: false, code: "PASSWORD_CHANGE_REQUIRED", error: "Password change required" }, { status: 403 }),
			),
			http.post(`${API}/auth/refresh`, () => {
				refreshed = true
				return HttpResponse.json(wrap({ accessToken: "n", refresh_token: "n" }))
			}),
		)
		await expect(api.get("/posts/admin")).rejects.toThrow()
		expect(calls).toBe(1)
		// A 403 is not an expired session: tokens stay, nothing is refreshed.
		expect(refreshed).toBe(false)
		expect(localStorage.getItem("accessToken")).toBe("t")
	})

	it("ignores an ordinary 403", async () => {
		let calls = 0
		setPasswordChangeRequiredHandler(() => { calls++ })
		await failWith(403, { success: false, code: "FORBIDDEN", error: "Forbidden" })
		expect(calls).toBe(0)
	})
})

describe("account administration errors", () => {
	it("explains the privilege envelope on a 403", async () => {
		const e = await failWith(403, { success: false, code: "FORBIDDEN", error: "Forbidden" })
		expect(getAccountAdminErrorMessage(e, "fb")).toContain("صلاحيات لا تملكها")
	})

	it("explains the last-administrator guard on a 409", async () => {
		const e = await failWith(409, {
			success: false,
			code: "CONFLICT",
			error: "This change would leave no active user holding every permission. Grant another account the full set first.",
		})
		expect(getAccountAdminErrorMessage(e, "fb")).toContain("كل الصلاحيات")
	})

	it("leaves other 409s to the normal path", async () => {
		const e = await failWith(409, { success: false, code: "CONFLICT", error: "Username already taken" })
		expect(getAccountAdminErrorMessage(e, "fb")).toBe("Username already taken")
	})
})
