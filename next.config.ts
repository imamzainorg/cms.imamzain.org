import type { NextConfig } from "next"
import { PHASE_DEVELOPMENT_SERVER } from "next/constants"

// Production builds are a static export (out/) served by Cloudflare Workers
// Static Assets; see wrangler.jsonc. The CMS is a client-rendered app (JWT in
// localStorage, every API call made from the browser), so there is no server
// code to run: no middleware, no route handlers, no server actions. Edit
// screens take the record id from `?id=` (see src/lib/routes.ts) because a
// static export can only pre-render dynamic segments known at build time.
export default function config(phase: string): NextConfig {
	const isDev = phase === PHASE_DEVELOPMENT_SERVER

	return {
		reactCompiler: false,
		// A stray lockfile higher up (e.g. in the home folder) makes Next infer the
		// wrong workspace root, and Turbopack then cannot resolve tailwindcss.
		turbopack: { root: process.cwd() },
		output: isDev ? undefined : "export",
		// No image optimizer in a static export. The few <Image> uses are the
		// brand marks in /public, which are already sized.
		images: { unoptimized: true },
	}
}
