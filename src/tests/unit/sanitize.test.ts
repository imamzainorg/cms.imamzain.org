import { describe, it, expect } from "vitest"
import {
	isSafeUrl,
	isSafeImageUrl,
	sanitizeEditorHtml,
	byteLength,
	MAX_BODY_BYTES,
} from "@/lib/sanitize"

describe("isSafeUrl", () => {
	it("accepts http and https", () => {
		expect(isSafeUrl("http://example.com")).toBe(true)
		expect(isSafeUrl("https://example.com/path?q=1")).toBe(true)
	})
	it("accepts mailto and tel", () => {
		expect(isSafeUrl("mailto:foo@bar.com")).toBe(true)
		expect(isSafeUrl("tel:+9647700000000")).toBe(true)
	})
	it("accepts relative paths and fragments", () => {
		expect(isSafeUrl("/dashboard")).toBe(true)
		expect(isSafeUrl("#section")).toBe(true)
	})
	it("rejects javascript: urls", () => {
		expect(isSafeUrl("javascript:alert(1)")).toBe(false)
	})
	it("rejects data: urls in plain links", () => {
		expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false)
	})
	it("rejects vbscript:", () => {
		expect(isSafeUrl("vbscript:foo")).toBe(false)
	})
	it("rejects empty input", () => {
		expect(isSafeUrl("")).toBe(false)
	})
	it("allows arbitrary text that doesn't parse as URL (treated as relative)", () => {
		// The util defensively allows non-URL strings unless they match a dangerous protocol.
		expect(isSafeUrl("just-a-word")).toBe(true)
	})
})

describe("isSafeImageUrl", () => {
	it("accepts http/https images", () => {
		expect(isSafeImageUrl("https://cdn.example.com/img.jpg")).toBe(true)
	})
	it("accepts relative paths", () => {
		expect(isSafeImageUrl("/uploads/x.png")).toBe(true)
	})
	it("accepts data: images with known MIME types", () => {
		expect(isSafeImageUrl("data:image/png;base64,AAAA")).toBe(true)
		expect(isSafeImageUrl("data:image/webp;base64,QQQQ")).toBe(true)
		expect(isSafeImageUrl("data:image/svg+xml;base64,PHN2Zz==")).toBe(true)
	})
	it("rejects data: with non-image MIME", () => {
		expect(isSafeImageUrl("data:text/html;base64,PHM=")).toBe(false)
	})
	it("rejects javascript: image src", () => {
		expect(isSafeImageUrl("javascript:alert(1)")).toBe(false)
	})
	it("rejects empty input", () => {
		expect(isSafeImageUrl("")).toBe(false)
	})
})

describe("sanitizeEditorHtml", () => {
	it("returns empty input unchanged", () => {
		expect(sanitizeEditorHtml("")).toBe("")
	})
	it("strips javascript: in href and src (double quotes)", () => {
		const out = sanitizeEditorHtml('<a href="javascript:alert(1)">x</a>')
		expect(out).not.toContain("javascript:")
		expect(out).toContain('href="#"')
	})
	it("strips javascript: in href and src (single quotes)", () => {
		const out = sanitizeEditorHtml("<a href='javascript:alert(1)'>x</a>")
		expect(out).not.toContain("javascript:")
	})
	it("strips vbscript: protocol", () => {
		const out = sanitizeEditorHtml('<a href="vbscript:foo">x</a>')
		expect(out).not.toContain("vbscript:")
	})
	it("removes inline event handlers (onclick, onerror, etc.)", () => {
		const out = sanitizeEditorHtml('<img src="/x.png" onerror="alert(1)" onclick="evil()">')
		expect(out).not.toMatch(/on(click|error)/i)
		expect(out).toContain('src="/x.png"')
	})
	it("leaves safe markup intact", () => {
		const safe = '<p>Hello <a href="https://example.com">world</a></p>'
		expect(sanitizeEditorHtml(safe)).toBe(safe)
	})
})

describe("byteLength", () => {
	it("matches UTF-8 byte length for ASCII", () => {
		expect(byteLength("hello")).toBe(5)
	})
	it("counts multi-byte Arabic characters correctly", () => {
		// "م" is 2 bytes in UTF-8
		expect(byteLength("م")).toBe(2)
	})
	it("counts emoji (4 bytes)", () => {
		expect(byteLength("📚")).toBe(4)
	})
	it("MAX_BODY_BYTES is 200 KB", () => {
		expect(MAX_BODY_BYTES).toBe(200 * 1024)
	})
})
