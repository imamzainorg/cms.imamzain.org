import { describe, it, expect } from "vitest"
import { pickTranslation, categoryName, slugify } from "@/lib/i18n"
import type { CategoryTranslation } from "@/types/categories"

type T = { lang: string; title: string; is_default?: boolean }

describe("pickTranslation", () => {
	it("returns the entry matching the UI language", () => {
		const all: T[] = [
			{ lang: "en", title: "Hello" },
			{ lang: "ar", title: "مرحباً" },
		]
		expect(pickTranslation(all)?.title).toBe("مرحباً")
	})

	it("falls back to the resolved singular translation when ar is missing", () => {
		const all: T[] = [{ lang: "en", title: "Hello" }]
		const resolved: T = { lang: "en", title: "Hello" }
		expect(pickTranslation(all, resolved)?.title).toBe("Hello")
	})

	it("falls back to is_default when ar is missing and no resolved", () => {
		const all: T[] = [
			{ lang: "en", title: "Hello" },
			{ lang: "fr", title: "Bonjour", is_default: true },
		]
		expect(pickTranslation(all)?.title).toBe("Bonjour")
	})

	it("falls back to first item when nothing else matches", () => {
		const all: T[] = [
			{ lang: "fr", title: "Bonjour" },
			{ lang: "de", title: "Hallo" },
		]
		expect(pickTranslation(all)?.title).toBe("Bonjour")
	})

	it("returns the resolved singular when the array is empty", () => {
		const resolved: T = { lang: "en", title: "Resolved only" }
		expect(pickTranslation([], resolved)?.title).toBe("Resolved only")
	})

	it("returns undefined when nothing is available", () => {
		expect(pickTranslation(undefined)).toBeUndefined()
		expect(pickTranslation([])).toBeUndefined()
	})

	it("accepts a custom UI lang", () => {
		const all: T[] = [
			{ lang: "en", title: "Hello" },
			{ lang: "fr", title: "Bonjour" },
		]
		expect(pickTranslation(all, undefined, "fr")?.title).toBe("Bonjour")
	})
})

describe("categoryName", () => {
	it("returns the title of the picked translation", () => {
		const ts: CategoryTranslation[] = [
			{ lang: "ar", title: "مقالات", slug: "articles" },
			{ lang: "en", title: "Articles", slug: "articles" },
		]
		expect(categoryName(ts)).toBe("مقالات")
	})

	it("returns the Arabic 'no name' placeholder when nothing usable is found", () => {
		expect(categoryName(undefined)).toBe("بدون اسم")
		expect(categoryName([])).toBe("بدون اسم")
		expect(categoryName([{ lang: "ar", title: "", slug: "" }])).toBe("بدون اسم")
	})
})

describe("slugify", () => {
	it("lowercases, trims, replaces spaces with dashes", () => {
		expect(slugify("Hello World")).toBe("hello-world")
		expect(slugify("  spaced  out  ")).toBe("spaced-out")
	})

	it("strips Arabic and other non-ascii characters", () => {
		expect(slugify("مرحباً hello")).toBe("hello")
	})

	it("collapses repeated dashes and strips leading/trailing dashes", () => {
		expect(slugify("--a--b--")).toBe("a-b")
	})

	it("returns a unique fallback when the input slugifies to empty", () => {
		const out = slugify("مرحباً")
		expect(out).toMatch(/^c-[a-z0-9]+$/)
	})

	it("truncates at 80 chars", () => {
		const long = "a".repeat(200)
		expect(slugify(long)).toHaveLength(80)
	})

	it("removes punctuation and symbols", () => {
		expect(slugify("Hello, World! @home")).toBe("hello-world-home")
	})
})
