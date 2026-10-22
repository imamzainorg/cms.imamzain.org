/**
 * Builds the static export (out/) that Cloudflare Workers serves.
 *
 *   node scripts/build.mjs [next build flags]      (bun run build)
 *
 * It exists because plain `next build` has three traps for this project:
 *
 * 1. NEXT_PUBLIC_API_URL is inlined into the bundle at build time, and Next
 *    gives `.env.local` priority over `.env.production`. A developer's local
 *    `.env.local` (pointing at a local API) would silently ship to production.
 *    So the build pins the production URL unless one is passed in explicitly,
 *    and then refuses to finish if the bundle still names a local address.
 *
 * 2. Turbopack (Next 16's default bundler) panics when the project path holds
 *    non-ASCII characters ("byte index N is not a char boundary"), as this
 *    repository's folder does on the maintainers' machines. In that case the
 *    build uses webpack instead. CI builds on an ASCII path keep Turbopack.
 *
 * 3. On Windows the export writes route-segment prefetch files into folders
 *    the client does not ask for; flatten-export-segments.mjs fixes that.
 *
 * Set ALLOW_LOCAL_API=1 to deliberately build a bundle that talks to a local API.
 */
import { spawnSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

const PRODUCTION_API = "https://api.imamzain.org/api/v1"
const OUT = "out"

const extra = process.argv.slice(2)
const env = { ...process.env, NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || PRODUCTION_API }

const explicitBundler = extra.some((a) => a === "--webpack" || a === "--turbopack")
const nonAsciiPath = /[^\x00-\x7F]/.test(process.cwd())
const args = ["build", ...extra]
if (nonAsciiPath && !explicitBundler) {
	console.log("Project path contains non-ASCII characters: Turbopack panics on those, building with webpack.")
	args.push("--webpack")
}

function run(file, fileArgs) {
	const result = spawnSync(file, fileArgs, { stdio: "inherit", env })
	if (result.status !== 0) process.exit(result.status ?? 1)
}

const next = createRequire(import.meta.url).resolve("next/dist/bin/next")
run(process.execPath, [next, ...args])
run(process.execPath, [join("scripts", "flatten-export-segments.mjs")])

// Guard: nothing in the shippable bundle may point at a local API.
if (!process.env.ALLOW_LOCAL_API) {
	const local = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/api\/v1/
	const offenders = []
	;(function walk(dir) {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name)
			if (entry.isDirectory()) walk(path)
			else if (entry.name.endsWith(".js") && local.test(readFileSync(path, "utf8"))) offenders.push(path)
		}
	})(join(OUT, "_next", "static"))

	if (offenders.length) {
		console.error(
			`\nERROR: the bundle points at a local API (${offenders.length} file(s), e.g. ${offenders[0]}).\n` +
				`NEXT_PUBLIC_API_URL was "${env.NEXT_PUBLIC_API_URL}". Unset it (or set ${PRODUCTION_API}), ` +
				`or set ALLOW_LOCAL_API=1 if a local bundle is really what you want.`,
		)
		process.exit(1)
	}
}

console.log(`\nBuilt ${OUT}/ with NEXT_PUBLIC_API_URL=${env.NEXT_PUBLIC_API_URL}`)
