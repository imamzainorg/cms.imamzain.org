/**
 * Backend (`contact_submissions` table) stores the timestamp as `submitted_at`;
 * the DTO documents it as `created_at`. Reality is `submitted_at` — we expose
 * both as optional and the UI guards reads with `safeFormat`.
 */
export type Contact = {
	id: string
	name: string
	email: string
	subject?: string | null
	message: string
	status: "NEW" | "RESPONDED" | "SPAM"
	responded_at?: string | null
	response?: string | null
	submitted_at?: string
	created_at?: string
}
