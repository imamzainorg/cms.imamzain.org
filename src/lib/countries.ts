const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl
	? new Intl.DisplayNames(["ar"], { type: "region" })
	: null

/** Arabic name of an ISO 3166-1 alpha-2 code; falls back to the code itself. */
export function countryLabel(code: string | null | undefined): string {
	if (!code) return "—"
	try {
		return regionNames?.of(code.toUpperCase()) ?? code
	} catch {
		return code
	}
}

let cached: { code: string; name: string }[] | null = null

/** Every country the browser knows, sorted by Arabic name. */
export function countryOptions(): { code: string; name: string }[] {
	if (cached) return cached
	const out: { code: string; name: string }[] = []
	const A = 65
	for (let i = 0; i < 26; i++) {
		for (let j = 0; j < 26; j++) {
			const code = String.fromCharCode(A + i, A + j)
			const name = countryLabel(code)
			if (name !== code) out.push({ code, name })
		}
	}
	cached = out.sort((a, b) => a.name.localeCompare(b.name, "ar"))
	return cached
}
