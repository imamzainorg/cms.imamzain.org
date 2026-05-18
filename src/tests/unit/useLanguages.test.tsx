import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { useActiveLanguages, languageLabel } from "@/lib/useLanguages"
import { buildQueryClient, wrap } from "../utils"

const API = "http://localhost:3000/api/v1"

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function wrapper() {
	const client = buildQueryClient()
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)
}

describe("languageLabel", () => {
	it("returns Arabic label for known codes", () => {
		expect(languageLabel("ar")).toBe("العربية")
		expect(languageLabel("en")).toBe("الإنجليزية")
		expect(languageLabel("fr")).toBe("الفرنسية")
	})
	it("falls back to provided native name when code is unknown", () => {
		expect(languageLabel("zz", "Zazaki")).toBe("Zazaki")
	})
	it("falls back to uppercase code when nothing else is known", () => {
		expect(languageLabel("zz")).toBe("ZZ")
	})
})

describe("useActiveLanguages", () => {
	it("returns active languages from /languages endpoint", async () => {
		server.use(http.get(`${API}/languages`, () => HttpResponse.json(wrap([
			{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true },
			{ code: "en", name: "English", native_name: "English", is_active: true },
			{ code: "fr", name: "French", native_name: "Français", is_active: false },
		]))))

		const { result } = renderHook(() => useActiveLanguages(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.loading).toBe(false))
		expect(result.current.languages.map((l) => l.code)).toEqual(["ar", "en"])
	})

	it("falls back to ar+en on API failure", async () => {
		server.use(http.get(`${API}/languages`, () => HttpResponse.json({}, { status: 500 })))
		const { result } = renderHook(() => useActiveLanguages(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.languages.length).toBeGreaterThan(0))
		expect(result.current.languages.map((l) => l.code)).toEqual(["ar", "en"])
	})

	it("accepts the `{items: [...]}` envelope shape too", async () => {
		server.use(http.get(`${API}/languages`, () => HttpResponse.json(wrap({
			items: [{ code: "ar", name: "Arabic", native_name: "العربية", is_active: true }],
			pagination: { page: 1, limit: 100, total: 1, pages: 1 },
		}))))
		const { result } = renderHook(() => useActiveLanguages(), { wrapper: wrapper() })
		await waitFor(() => expect(result.current.loading).toBe(false))
		expect(result.current.languages.map((l) => l.code)).toEqual(["ar"])
	})
})
