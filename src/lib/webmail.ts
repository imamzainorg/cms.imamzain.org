/**
 * Webmail compose link builder.
 *
 * Default target is Hostinger's Roundcube install (`mail.hostinger.com`).
 * Roundcube's compose action accepts `_task=mail&_action=compose` plus
 * `_to` / `_subject` / `_body` query params; if the editor isn't signed
 * in yet, Roundcube routes them through the login page and resumes the
 * compose after auth.
 *
 * We deliberately do NOT support auto-login from env credentials —
 * webmail providers don't accept passwords via URL, and shipping them
 * either through `NEXT_PUBLIC_*` (visible in bundled JS) or through a
 * server-side proxy (one shared inbox session for every CMS user)
 * is unsafe.
 */
export function getWebmailBaseUrl(): string {
	return (
		process.env.NEXT_PUBLIC_WEBMAIL_URL?.trim() ||
		"https://mail.hostinger.com"
	).replace(/\/+$/, "")
}

export function buildWebmailComposeUrl(opts: {
	to: string
	subject?: string
	body?: string
}): string {
	const base = getWebmailBaseUrl()
	const params = new URLSearchParams({
		_task: "mail",
		_action: "compose",
		_to: opts.to,
	})
	if (opts.subject) params.set("_subject", opts.subject)
	if (opts.body) params.set("_body", opts.body)
	return `${base}/?${params.toString()}`
}
