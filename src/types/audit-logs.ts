export type AuditLog = {
	id: string
	user_id: string | null
	action: string
	resource_type: string
	resource_id: string | null
	ip_address: string | null
	user_agent: string | null
	changes: Record<string, unknown> | null
	created_at: string
	users?: { id: string; username: string } | null
}
