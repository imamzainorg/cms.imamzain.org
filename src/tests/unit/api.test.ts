import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import axios from "axios"
import { api, getErrorMessage } from "@/lib/api"
import { wrap } from "../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => { server.resetHandlers(); localStorage.clear() })
afterAll(() => server.close())

describe("api interceptor", () => {
	it("unwraps the response envelope so response.data is the inner payload", async () => {
		server.use(http.get(`${API}/x`, () => HttpResponse.json(wrap({ hello: "world" }))))
		const { data } = await api.get<{ hello: string }>("/x")
		expect(data).toEqual({ hello: "world" })
	})

	it("passes the response through untouched if it isn't enveloped", async () => {
		server.use(http.get(`${API}/raw`, () => HttpResponse.json({ raw: true })))
		const { data } = await api.get("/raw")
		// non-enveloped responses are not modified; the interceptor only triggers
		// when both `success` and `data` keys are present.
		expect(data).toEqual({ raw: true })
	})

	it("attaches Bearer auth header from localStorage if present", async () => {
		localStorage.setItem("accessToken", "abc")
		let captured: string | null = null
		server.use(http.get(`${API}/ping`, ({ request }) => {
			captured = request.headers.get("Authorization")
			return HttpResponse.json(wrap({}))
		}))
		await api.get("/ping")
		expect(captured).toBe("Bearer abc")
	})

	it("does not attach auth header when no token is stored", async () => {
		let captured: string | null = "preset"
		server.use(http.get(`${API}/ping`, ({ request }) => {
			captured = request.headers.get("Authorization")
			return HttpResponse.json(wrap({}))
		}))
		await api.get("/ping")
		expect(captured).toBeNull()
	})

	it("clears the access token on 401 when no refresh token is available", async () => {
		localStorage.setItem("accessToken", "expired")
		// No refresh token set → attemptRefresh short-circuits to null and
		// wipes the access token. The session-end handler is registered by
		// QueryProvider in real app boot; in this isolated test it stays
		// unregistered, so no navigation is attempted.
		server.use(http.get(`${API}/secret`, () =>
			HttpResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }),
		))
		await expect(api.get("/secret")).rejects.toThrow()
		expect(localStorage.getItem("accessToken")).toBeNull()
	})
})

describe("getErrorMessage", () => {
	it("returns the fallback for unknown / non-axios errors", () => {
		expect(getErrorMessage(new Error("boom"), "fallback")).toBe("fallback")
		expect(getErrorMessage("string", "fallback")).toBe("fallback")
		expect(getErrorMessage(null, "fallback")).toBe("fallback")
	})

	it("extracts a string `error` field from the API response", async () => {
		server.use(http.get(`${API}/err`, () =>
			HttpResponse.json({ error: "Custom error" }, { status: 400 }),
		))
		try { await api.get("/err") } catch (e) {
			expect(getErrorMessage(e, "fallback")).toBe("Custom error")
		}
	})

	it("joins an array `error` field with Arabic comma", async () => {
		server.use(http.get(`${API}/errs`, () =>
			HttpResponse.json({ error: ["Email taken", "Bad password"] }, { status: 400 }),
		))
		try { await api.get("/errs") } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("Email taken، Bad password")
		}
	})

	it("falls back to NestJS-style `message` array when `error` is absent", async () => {
		server.use(http.get(`${API}/msg`, () =>
			HttpResponse.json({ message: ["A", "B"] }, { status: 400 }),
		))
		try { await api.get("/msg") } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("A، B")
		}
	})

	it("handles validation `errors` array shape", async () => {
		server.use(http.get(`${API}/v`, () =>
			HttpResponse.json({ errors: [{ message: "x is required" }, { message: "y too short" }] }, { status: 400 }),
		))
		try { await api.get("/v") } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("x is required، y too short")
		}
	})

	it("returns network message when error has no response (ERR_NETWORK)", () => {
		const err = new axios.AxiosError("Network Error", "ERR_NETWORK")
		expect(getErrorMessage(err, "fb")).toBe("تعذّر الاتصال بالخادم. تحقّق من الشبكة.")
	})

	it("returns Arabic 403 message", async () => {
		server.use(http.get(`${API}/forbid`, () =>
			HttpResponse.json({}, { status: 403 }),
		))
		try { await api.get("/forbid") } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("ليس لديك صلاحية لتنفيذ هذا الإجراء.")
		}
	})

	it("returns Arabic 404 message", async () => {
		server.use(http.get(`${API}/none`, () =>
			HttpResponse.json({}, { status: 404 }),
		))
		try { await api.get("/none") } catch (e) {
			expect(getErrorMessage(e, "fb")).toBe("العنصر غير موجود.")
		}
	})
})
