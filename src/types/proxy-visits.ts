/**
 * Backend (`proxy_visit_requests` table) stores the submission timestamp as
 * `submitted_at`; the DTO documents it as `created_at`. Reality is `submitted_at` —
 * we expose both as optional so either flavour renders, and the UI guards with
 * `safeFormat`.
 */
export type ProxyVisit = {
	id: string
	name: string
	phone: string | null
	country: string | null
	status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
	submitted_at?: string
	created_at?: string
}
